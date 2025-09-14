import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const LIVE_PATH = path.join(process.cwd(), '../live');
const DATA_PATH = path.join(process.cwd(), '../data');

export async function GET() {
  try {
    // Get basic TRNG status from FastAPI
    const statusResponse = await fetch('http://127.0.0.1:8000/api/status');
    if (!statusResponse.ok) {
      throw new Error('Failed to fetch TRNG status');
    }
    const trngStatus = await statusResponse.json();

    // Calculate bytes available (file size - used bytes)
    const bytesAvailable = Math.floor(trngStatus.available_bits / 8);

    // Get generation rates
    const rates = await calculateGenerationRates();

    return NextResponse.json({
      isRunning: bytesAvailable > 1000, // Running if we have >1000 bytes left
      bytesAvailable,
      bytesGenerated: Math.floor(trngStatus.used_bits / 8),
      lastUpdate: new Date().toISOString(),
      quality: rates.quality,
      rawRate: rates.rawRate,
      randomRate: rates.randomRate,
      usagePercentage: trngStatus.usage_percentage
    });
  } catch (error) {
    console.error('Error fetching TRNG stats:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch TRNG statistics',
      isRunning: false,
      bytesAvailable: 0,
      bytesGenerated: 0,
      lastUpdate: new Date().toISOString(),
      quality: { passed: 0, failed: 0, total: 0 },
      rawRate: 0,
      randomRate: 0,
      usagePercentage: 0
    }, { status: 500 });
  }
}

async function calculateGenerationRates() {
  const rates = {
    rawRate: 0,
    randomRate: 0,
    quality: { passed: 0, failed: 0, total: 0 }
  };

  try {
    // Raw rate: events/second from latest data file
    if (fs.existsSync(DATA_PATH)) {
      const dataFiles = fs.readdirSync(DATA_PATH)
        .filter(file => file.startsWith('events-') && file.endsWith('.txt'))
        .sort();
      
      if (dataFiles.length > 0) {
        const latestFile = dataFiles[dataFiles.length - 1];
        const filePath = path.join(DATA_PATH, latestFile);
        fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.trim().split('\n').length;
        
        // Extract timestamp from filename (events-<timestamp>.txt)
        const timestampMatch = latestFile.match(/events-(\d+)\.txt/);
        if (timestampMatch) {
          const fileTimestamp = parseInt(timestampMatch[1]) * 1000; // Convert to ms
          const currentTime = Date.now();
          const elapsedSeconds = (currentTime - fileTimestamp) / 1000;
          
          if (elapsedSeconds > 0) {
            rates.rawRate = Math.round(lines / elapsedSeconds);
          }
        }
      }
    }

    // Random rate: bits/hour from live binary file
    if (fs.existsSync(LIVE_PATH)) {
      const liveBinPath = path.join(LIVE_PATH, 'hotbits.bin');
      if (fs.existsSync(liveBinPath)) {
        const stats = fs.statSync(liveBinPath);
        const currentTime = Date.now();
        const elapsedHours = (currentTime - stats.birthtimeMs) / (1000 * 60 * 60);
        
        if (elapsedHours > 0) {
          const totalBits = stats.size * 8;
          rates.randomRate = Math.round(totalBits / elapsedHours);
        }
      }
    }

    // Quality: mock for now - could analyze actual test results
    rates.quality = { passed: 85, failed: 5, total: 90 };

  } catch (error) {
    console.error('Error calculating generation rates:', error);
  }

  return rates;
}