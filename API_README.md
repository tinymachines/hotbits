# Hotbits FastAPI Random Number Service

A FastAPI web service that delivers cryptographically secure random numbers from tested binary entropy data, with bit-level tracking to prevent reuse.

## Features

- **True Random Numbers**: Generated from tested cryptographic entropy sources
- **Bit Pointer Tracking**: Tracks and persists bit usage to prevent entropy reuse
- **Web Interface**: User-friendly interface similar to Random.org
- **REST API**: Programmatic access for automated clients
- **Multiple Formats**: Support for decimal, hexadecimal, octal, and binary output
- **Entropy Monitoring**: Real-time status of available entropy bits

## Quick Start

1. **Ensure you have entropy data**:
   ```bash
   # The service expects live/hotbits.bin to exist
   ls -la live/hotbits.bin
   ```

2. **Start the service**:
   ```bash
   ./start_api.sh
   ```

3. **Access the web interface**:
   Open http://localhost:8000 in your browser

## API Endpoints

### Web Interface
- `GET /` - Main random number generator interface
- `GET /integers/` - Generate integers with form parameters

### REST API
- `POST /api/integers` - Generate random integers (JSON)
- `GET /api/status` - Get entropy pool status

### Interactive Documentation
- `GET /docs` - Swagger UI documentation
- `GET /redoc` - ReDoc documentation

## API Usage Examples

### Generate Random Integers
```bash
curl -X POST "http://localhost:8000/api/integers" \
  -H "Content-Type: application/json" \
  -d '{
    "num": 10,
    "min_val": 1,
    "max_val": 100,
    "base": 10,
    "columns": 5,
    "format": "html"
  }'
```

### Check Entropy Status
```bash
curl "http://localhost:8000/api/status"
```

### Generate via Web Interface
```bash
# Generate 5 hex numbers between 1-255
curl "http://localhost:8000/integers/?num=5&min=1&max=255&base=16&col=5&format=plain"
```

## Request Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `num` | int | 100 | 1-10,000 | Number of integers to generate |
| `min_val` | int | 1 | ±1,000,000,000 | Minimum value (inclusive) |
| `max_val` | int | 100 | ±1,000,000,000 | Maximum value (inclusive) |
| `base` | int | 10 | 2,8,10,16 | Number base for output |
| `columns` | int | 5 | 1-100 | Number of columns for formatting |
| `format` | str | "html" | "html","plain" | Output format |

## Response Formats

### JSON API Response
```json
{
  "numbers": [42, 17, 89, 3, 56],
  "parameters": {
    "num": 5,
    "min_val": 1,
    "max_val": 100,
    "base": 10,
    "columns": 5,
    "format": "html"
  },
  "count": 5
}
```

### Status Response
```json
{
  "entropy_file": "live/hotbits.bin",
  "file_size_bytes": 327126,
  "total_bits": 2617008,
  "used_bits": 119,
  "available_bits": 2616889,
  "usage_percentage": 0.0045
}
```

## Bit Pointer System

The service tracks entropy usage with a persistent bit pointer:

- **File**: `live/bit_pointer.json`
- **Purpose**: Prevents reuse of random bits
- **Persistence**: Survives service restarts
- **Safety**: Uses rejection sampling to avoid bias

## Security Features

1. **Cryptographic Entropy**: Uses tested physical entropy sources
2. **No Bit Reuse**: Strict bit pointer advancement
3. **Rejection Sampling**: Eliminates modulo bias
4. **Entropy Monitoring**: Warns when entropy is low

## Error Handling

The service returns appropriate HTTP status codes:

- `400` - Invalid parameters (min > max, etc.)
- `500` - Internal server error (file access issues)
- `503` - Insufficient entropy available

## Monitoring and Maintenance

### Check Entropy Status
```bash
curl -s localhost:8000/api/status | jq '.usage_percentage'
```

### Monitor Bit Consumption
```bash
watch -n 5 'curl -s localhost:8000/api/status | jq "{used_bits, available_bits, usage_percentage}"'
```

### Reset Bit Pointer (if needed)
```bash
rm live/bit_pointer.json
# Service will restart from bit 0
```

## Development

### Requirements
- Python 3.8+
- FastAPI
- Uvicorn
- Jinja2

### Local Development
```bash
source venv/bin/activate
uvicorn random_api:app --reload --host 0.0.0.0 --port 8000
```

## Production Deployment

For production use:

```bash
# Use multiple workers
uvicorn random_api:app --workers 4 --host 0.0.0.0 --port 8000

# Or use gunicorn
gunicorn random_api:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

Consider adding:
- Rate limiting
- Authentication
- HTTPS/TLS
- Request logging
- Entropy pool monitoring alerts