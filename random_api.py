#!/usr/bin/env python3
"""
Hotbits FastAPI Random Number Service

A FastAPI service that delivers cryptographically secure random numbers
from tested binary data, tracking bit usage to prevent reuse.
"""

import os
import json
import struct
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
import uvicorn

app = FastAPI(title="Hotbits Random Number Service", 
              description="True Random Number Generator using tested cryptographic entropy")

# Mount static files for serving images
app.mount("/static", StaticFiles(directory="."), name="static")

class RandomIntegerRequest(BaseModel):
    num: int = Field(default=100, ge=1, le=10000, description="Number of integers to generate")
    min_val: int = Field(default=1, ge=-1000000000, le=1000000000, description="Minimum value")
    max_val: int = Field(default=100, ge=-1000000000, le=1000000000, description="Maximum value")
    base: int = Field(default=10, description="Number base (2, 8, 10, 16)")
    columns: int = Field(default=5, ge=1, le=100, description="Number of columns for formatting")
    format: str = Field(default="html", description="Output format (html or plain)")

class BitPointer:
    """Manages the bit pointer for tracking used entropy."""
    
    def __init__(self, pointer_file: str = "live/bit_pointer.json"):
        self.pointer_file = Path(pointer_file)
        self.bit_offset = self._load_pointer()
        
    def _load_pointer(self) -> int:
        """Load the current bit offset from file."""
        if self.pointer_file.exists():
            try:
                with open(self.pointer_file, 'r') as f:
                    data = json.load(f)
                    return data.get('bit_offset', 0)
            except (json.JSONDecodeError, IOError):
                return 0
        return 0
    
    def _save_pointer(self):
        """Save the current bit offset to file."""
        try:
            self.pointer_file.parent.mkdir(exist_ok=True)
            with open(self.pointer_file, 'w') as f:
                json.dump({
                    'bit_offset': self.bit_offset,
                    'bytes_used': self.bit_offset // 8,
                    'total_bits_consumed': self.bit_offset
                }, f)
        except IOError as e:
            raise HTTPException(status_code=500, detail=f"Failed to save bit pointer: {e}")
    
    def consume_bits(self, num_bits: int) -> int:
        """Mark bits as consumed and return the starting bit offset."""
        start_offset = self.bit_offset
        self.bit_offset += num_bits
        self._save_pointer()
        return start_offset

class RandomGenerator:
    """Generates random numbers from binary entropy data."""
    
    def __init__(self, data_file: str = "live/hotbits.bin"):
        self.data_file = Path(data_file)
        self.bit_pointer = BitPointer()
        self._validate_data_file()
        
    def _validate_data_file(self):
        """Ensure the data file exists and has sufficient entropy."""
        if not self.data_file.exists():
            raise HTTPException(status_code=500, 
                              detail=f"Entropy file not found: {self.data_file}")
        
        file_size = self.data_file.stat().st_size
        available_bits = file_size * 8 - self.bit_pointer.bit_offset
        
        if available_bits < 1000:  # Warn if less than 1000 bits remaining
            raise HTTPException(status_code=503, 
                              detail=f"Low entropy: only {available_bits} bits remaining")
    
    def _extract_bits(self, start_bit: int, num_bits: int) -> int:
        """Extract num_bits starting from start_bit position."""
        start_byte = start_bit // 8
        end_byte = (start_bit + num_bits - 1) // 8 + 1
        
        with open(self.data_file, 'rb') as f:
            f.seek(start_byte)
            data = f.read(end_byte - start_byte)
        
        if len(data) < (end_byte - start_byte):
            raise HTTPException(status_code=503, detail="Insufficient entropy data")
        
        # Convert bytes to a large integer
        bits_value = 0
        for byte in data:
            bits_value = (bits_value << 8) | byte
        
        # Extract the desired bits
        bit_offset_in_first_byte = start_bit % 8
        total_bits = len(data) * 8
        shift = total_bits - bit_offset_in_first_byte - num_bits
        mask = (1 << num_bits) - 1
        
        return (bits_value >> shift) & mask
    
    def _bits_needed_for_range(self, min_val: int, max_val: int) -> int:
        """Calculate bits needed to represent a value in the given range."""
        range_size = max_val - min_val + 1
        return range_size.bit_length()
    
    def generate_integers(self, request: RandomIntegerRequest) -> List[int]:
        """Generate random integers according to the request parameters."""
        if request.min_val > request.max_val:
            raise HTTPException(status_code=400, 
                              detail="Minimum value cannot be greater than maximum value")
        
        bits_per_number = self._bits_needed_for_range(request.min_val, request.max_val)
        total_bits_needed = bits_per_number * request.num * 2  # 2x for rejection sampling safety
        
        self._validate_data_file()
        available_bits = (self.data_file.stat().st_size * 8) - self.bit_pointer.bit_offset
        if total_bits_needed > available_bits:
            raise HTTPException(status_code=503, 
                              detail=f"Insufficient entropy: need {total_bits_needed} bits, have {available_bits}")
        
        range_size = request.max_val - request.min_val + 1
        results = []
        bits_consumed = 0
        
        while len(results) < request.num:
            start_bit = self.bit_pointer.consume_bits(bits_per_number)
            random_bits = self._extract_bits(start_bit, bits_per_number)
            bits_consumed += bits_per_number
            
            # Rejection sampling to avoid bias
            max_valid = ((1 << bits_per_number) // range_size) * range_size
            if random_bits < max_valid:
                value = request.min_val + (random_bits % range_size)
                results.append(value)
        
        return results
    
    def get_status(self) -> dict:
        """Get current entropy pool status."""
        file_size = self.data_file.stat().st_size
        total_bits = file_size * 8
        used_bits = self.bit_pointer.bit_offset
        available_bits = total_bits - used_bits
        
        return {
            "entropy_file": str(self.data_file),
            "file_size_bytes": file_size,
            "total_bits": total_bits,
            "used_bits": used_bits,
            "available_bits": available_bits,
            "usage_percentage": (used_bits / total_bits) * 100 if total_bits > 0 else 0
        }

# Global generator instance
generator = RandomGenerator()

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Serve the main random number generator interface."""
    return HTMLResponse(content=open("templates/index.html").read())

@app.get("/reports", response_class=HTMLResponse)
async def reports(request: Request):
    """Serve the randomness analysis reports page."""
    return HTMLResponse(content=open("templates/reports.html").read())

@app.get("/integers/", response_class=HTMLResponse)
async def generate_integers_form(
    request: Request,
    num: int = 100,
    min: int = 1,
    max: int = 100,
    base: int = 10,
    col: int = 5,
    format: str = "html"
):
    """Generate random integers with web interface."""
    
    try:
        req = RandomIntegerRequest(
            num=num, min_val=min, max_val=max, base=base, 
            columns=col, format=format
        )
        
        numbers = generator.generate_integers(req)
        
        if format == "plain":
            return PlainTextResponse(_format_numbers_plain(numbers, req))
        else:
            return HTMLResponse(_format_numbers_html(numbers, req))
            
    except Exception as e:
        if format == "plain":
            return PlainTextResponse(f"Error: {str(e)}", status_code=500)
        else:
            return HTMLResponse(f"<h1>Error</h1><p>{str(e)}</p>", status_code=500)

@app.post("/api/integers")
async def api_generate_integers(request: RandomIntegerRequest):
    """API endpoint for generating random integers."""
    numbers = generator.generate_integers(request)
    
    return {
        "numbers": numbers,
        "parameters": request.dict(),
        "count": len(numbers)
    }

@app.get("/api/status")
async def api_status():
    """Get entropy pool status."""
    return generator.get_status()

def _format_numbers_html(numbers: List[int], req: RandomIntegerRequest) -> str:
    """Format numbers as HTML response."""
    
    def format_number(n: int) -> str:
        if req.base == 16:
            return f"{n:x}"
        elif req.base == 8:
            return f"{n:o}"
        elif req.base == 2:
            return f"{n:b}"
        else:
            return str(n)
    
    formatted_numbers = [format_number(n) for n in numbers]
    
    # Group into columns
    rows = []
    for i in range(0, len(formatted_numbers), req.columns):
        row = formatted_numbers[i:i+req.columns]
        rows.append("\t".join(row))
    
    base_names = {2: "Binary", 8: "Octal", 10: "Decimal", 16: "Hexadecimal"}
    base_name = base_names.get(req.base, f"Base {req.base}")
    
    html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Hotbits Random Numbers</title>
    <style>
        body {{ font-family: monospace; margin: 40px; }}
        .numbers {{ background: #f5f5f5; padding: 20px; white-space: pre; }}
        .header {{ margin-bottom: 20px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Hotbits Random Integer Generator</h1>
        <p>Generated {len(numbers)} random integers between {req.min_val} and {req.max_val}</p>
        <p>Number system: {base_name} (base {req.base})</p>
        <p>Format: {req.columns} columns</p>
    </div>
    <div class="numbers">{chr(10).join(rows)}</div>
    <p><a href="/">← Generate more numbers</a></p>
</body>
</html>"""
    return html

def _format_numbers_plain(numbers: List[int], req: RandomIntegerRequest) -> str:
    """Format numbers as plain text response."""
    
    def format_number(n: int) -> str:
        if req.base == 16:
            return f"{n:x}"
        elif req.base == 8:
            return f"{n:o}"
        elif req.base == 2:
            return f"{n:b}"
        else:
            return str(n)
    
    formatted_numbers = [format_number(n) for n in numbers]
    
    # Group into columns
    rows = []
    for i in range(0, len(formatted_numbers), req.columns):
        row = formatted_numbers[i:i+req.columns]
        rows.append("\t".join(row))
    
    return "\n".join(rows)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)