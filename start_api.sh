#!/bin/bash

# Start the Hotbits FastAPI Random Number Service
# This script activates the virtual environment and starts the service

# Change to the project directory
cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Error: Virtual environment not found. Please run 'python -m venv venv' first."
    exit 1
fi

# Check if hotbits.bin exists
if [ ! -f "live/hotbits.bin" ]; then
    echo "Error: Entropy file 'live/hotbits.bin' not found."
    echo "Please ensure you have generated the binary entropy data first."
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if needed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "Installing dependencies..."
    pip install fastapi uvicorn jinja2 python-multipart
fi

# Start the service
echo "Starting Hotbits Random Number Service..."
echo "Web interface will be available at: http://localhost:8000"
echo "API documentation available at: http://localhost:8000/docs"
echo "Press Ctrl+C to stop the service"
echo ""

uvicorn random_api:app --host 0.0.0.0 --port 8000 --reload