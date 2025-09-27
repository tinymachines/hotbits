import { NextRequest, NextResponse } from 'next/server';

interface GenerateRequest {
  count: number;
  min: number;
  max: number;
  base: number;
  format: string;
  columns: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    
    // Validate input
    if (body.count > 10000) {
      return NextResponse.json({ error: 'Maximum 10,000 numbers allowed' }, { status: 400 });
    }
    
    if (body.min > body.max) {
      return NextResponse.json({ error: 'Minimum cannot be greater than maximum' }, { status: 400 });
    }
    
    // Call the TRNG FastAPI service
    const trngResponse = await fetch('http://trng2:8000/api/integers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        num: body.count,
        min_val: body.min,
        max_val: body.max,
        base: body.base,
        columns: body.columns,
        format: 'plain'
      })
    });
    
    if (!trngResponse.ok) {
      const errorData = await trngResponse.json().catch(() => ({ error: 'TRNG service error' }));
      return NextResponse.json({ 
        error: errorData.detail || errorData.error || 'TRNG service unavailable' 
      }, { status: trngResponse.status });
    }
    
    const trngData = await trngResponse.json();
    
    return NextResponse.json({ 
      numbers: formatNumbers(trngData.numbers, body),
      count: trngData.numbers.length,
      source: 'TRNG'
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// generateRandomNumbers function removed - now using TRNG service

function formatNumbers(numbers: number[], { base, columns, format }: { base: number; columns: number; format: string }): string {
  const formatted = numbers.map(num => {
    switch (base) {
      case 2: return num.toString(2);
      case 8: return num.toString(8);
      case 16: return num.toString(16).toUpperCase();
      default: return num.toString();
    }
  });
  
  if (format === 'html') {
    // Group into columns
    const rows: string[] = [];
    for (let i = 0; i < formatted.length; i += columns) {
      rows.push(formatted.slice(i, i + columns).join('\t'));
    }
    return rows.join('\n');
  }
  
  // Plain format with columns
  const rows: string[] = [];
  for (let i = 0; i < formatted.length; i += columns) {
    rows.push(formatted.slice(i, i + columns).join('  '));
  }
  return rows.join('\n');
}