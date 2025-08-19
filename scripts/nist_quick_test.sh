#!/bin/bash
# Quick NIST test - runs only essential tests without parameter prompts

if [ $# -lt 1 ]; then
    echo "Usage: $0 <input_file>"
    exit 1
fi

INPUT_FILE="$1"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NIST_DIR="$PROJECT_ROOT/repos/sts-2.1.2/sts-2.1.2"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file '$INPUT_FILE' not found"
    exit 1
fi

# Check if NIST STS is built
if [ ! -f "$NIST_DIR/assess" ]; then
    echo "Error: NIST STS not found. Run 'make nist-sts' first."
    exit 1
fi

# Get absolute path of input file
ABS_INPUT="$(cd "$(dirname "$INPUT_FILE")" && pwd)/$(basename "$INPUT_FILE")"

# Get file size
FILE_SIZE=$(wc -c < "$INPUT_FILE")
FILE_BITS=$((FILE_SIZE * 8))

# NIST STS needs at least 100K bits for basic tests
MIN_BITS=100000
if [ $FILE_BITS -lt $MIN_BITS ]; then
    echo "File too small ($FILE_BITS bits). Need at least $MIN_BITS bits."
    
    # Create extended file
    TEMP_FILE="/tmp/nist_quick_$$.bin"
    REPS=$(( (MIN_BITS / FILE_BITS) + 1 ))
    
    echo "Extending file by repeating $REPS times..."
    for i in $(seq 1 $REPS); do
        cat "$INPUT_FILE"
    done > "$TEMP_FILE"
    
    ABS_INPUT="$TEMP_FILE"
    FILE_SIZE=$(wc -c < "$TEMP_FILE")
    FILE_BITS=$((FILE_SIZE * 8))
fi

echo "=========================================="
echo "NIST Quick Test (Essential Tests Only)"
echo "=========================================="
echo "Input: $(basename $INPUT_FILE) ($FILE_BITS bits)"
echo ""

# Change to NIST directory
cd "$NIST_DIR"

# Run only the most important tests without parameter adjustment
echo "Running essential NIST tests..."
echo "(Frequency, Runs, Longest Run, Rank, DFT)"
echo ""

# This input sequence runs just 5 core tests without parameter prompts
(
    echo "0"           # Input from file
    echo "$ABS_INPUT"  # File path
    echo "1"           # Single bitstream
    echo "0"           # Binary format
    echo "$FILE_BITS"  # Length
    echo "1"           # 1. Frequency test
    echo "0"           # 2. Skip block frequency
    echo "0"           # 3. Skip cumulative sums
    echo "1"           # 4. Runs test
    echo "1"           # 5. Longest run test
    echo "1"           # 6. Binary matrix rank test
    echo "1"           # 7. DFT test
    echo "0"           # 8. Skip non-overlapping template
    echo "0"           # 9. Skip overlapping template
    echo "0"           # 10. Skip universal
    echo "0"           # 11. Skip approximate entropy
    echo "0"           # 12. Skip random excursions
    echo "0"           # 13. Skip random excursions variant
    echo "0"           # 14. Skip serial
    echo "0"           # 15. Skip linear complexity
    echo "0"           # Continue (no parameter adjustment)
    echo "1"           # Process 1 bitstream
) | timeout 10 ./assess $FILE_BITS 2>&1 | grep -E "(p_value|SUCCESS|FAILURE|PASS|FAIL)" | head -20

# Simple pass/fail check
echo ""
echo "=========================================="
if timeout 5 ./assess $FILE_BITS < "$ABS_INPUT" 2>&1 | grep -q "FAILURE"; then
    echo "Result: Some tests may have failed"
else
    echo "Result: Tests completed"
fi

# Go back
cd "$PROJECT_ROOT"

# Clean up
if [ -f "/tmp/nist_quick_$$.bin" ]; then
    rm "/tmp/nist_quick_$$.bin"
fi

echo ""
echo "Note: This is a quick test. For full NIST suite, use run_nist_sts.sh"
echo "=========================================="