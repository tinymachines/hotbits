#!/bin/bash
# NIST test runner that bypasses all interactive prompts
# Uses expect or python to automate interaction

if [ $# -lt 1 ]; then
    echo "Usage: $0 <input_file>"
    exit 1
fi

INPUT_FILE="$1"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NIST_DIR="$PROJECT_ROOT/repos/sts-2.1.2/sts-2.1.2"

# Check requirements
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file '$INPUT_FILE' not found"
    exit 1
fi

if [ ! -f "$NIST_DIR/assess" ]; then
    echo "Error: NIST STS not found. Run 'make nist-sts' first."
    exit 1
fi

# Get file info
ABS_INPUT="$(cd "$(dirname "$INPUT_FILE")" && pwd)/$(basename "$INPUT_FILE")"
FILE_SIZE=$(wc -c < "$INPUT_FILE")
FILE_BITS=$((FILE_SIZE * 8))

echo "=========================================="
echo "NIST STS Test (Automated)"
echo "=========================================="
echo "Input: $INPUT_FILE"
echo "Size: $FILE_SIZE bytes ($FILE_BITS bits)"
echo ""

# Check if we have enough bits
if [ $FILE_BITS -lt 100000 ]; then
    echo "Warning: File may be too small for some tests"
fi

# Create a Python script to handle the interaction
cat > /tmp/nist_runner.py << 'EOF'
#!/usr/bin/env python3
import subprocess
import sys
import time

if len(sys.argv) < 3:
    print("Usage: nist_runner.py <assess_path> <input_file> <bits>")
    sys.exit(1)

assess_path = sys.argv[1]
input_file = sys.argv[2]
file_bits = sys.argv[3]

# Start the assess program
proc = subprocess.Popen(
    [assess_path, file_bits],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=0
)

# Send all inputs
inputs = [
    "0",           # Input from file
    input_file,    # File path
    "1",           # Single bitstream
    "0",           # Binary format
    file_bits,     # Bit length
    "1",           # Frequency test
    "1",           # Block frequency
    "1",           # Cumulative sums
    "1",           # Runs
    "1",           # Longest run
    "1",           # Rank
    "1",           # DFT
    "1",           # Non-overlapping templates
    "1",           # Overlapping templates
    "1",           # Universal
    "1",           # Approximate entropy
    "1",           # Random excursions
    "1",           # Random excursions variant
    "1",           # Serial
    "1",           # Linear complexity
    "0",           # Continue with defaults (important!)
    "1",           # Number of bitstreams
]

# Send each input with a small delay
for inp in inputs:
    proc.stdin.write(inp + "\n")
    proc.stdin.flush()
    time.sleep(0.1)

# Wait for completion (with timeout)
try:
    output, _ = proc.communicate(timeout=30)
    print(output)
except subprocess.TimeoutExpired:
    proc.kill()
    print("Test timed out after 30 seconds")
EOF

# Run the Python automation script
cd "$NIST_DIR"
python3 /tmp/nist_runner.py ./assess "$ABS_INPUT" "$FILE_BITS" 2>&1 | tee /tmp/nist_output.log

# Parse results
echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="

# Look for p-values in output
grep -E "p_value|SUCCESS|FAILURE" /tmp/nist_output.log | head -20

# Check experiments directory
RESULTS_DIR="experiments/AlgorithmTesting"
if [ -d "$RESULTS_DIR" ]; then
    echo ""
    echo "Test directories created:"
    ls -1 "$RESULTS_DIR" 2>/dev/null | head -10
fi

# Clean up
rm -f /tmp/nist_runner.py /tmp/nist_output.log

cd "$PROJECT_ROOT"

echo ""
echo "=========================================="
echo "NIST test completed"
echo "=========================================="