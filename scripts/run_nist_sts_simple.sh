#!/bin/bash
# Simplified NIST STS runner - more robust path handling

if [ $# -lt 1 ]; then
    echo "Usage: $0 <input_file> [output_dir]"
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_DIR="${2:-nist_results}"
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

# NIST STS needs at least 1M bits
MIN_BITS=1000000
if [ $FILE_BITS -lt $MIN_BITS ]; then
    echo "File too small ($FILE_BITS bits). Extending to $MIN_BITS bits..."
    
    # Create temp file with repeated data
    TEMP_FILE="/tmp/nist_extended_$$.bin"
    REPS=$(( (MIN_BITS / FILE_BITS) + 1 ))
    
    for i in $(seq 1 $REPS); do
        cat "$INPUT_FILE"
    done > "$TEMP_FILE"
    
    ABS_INPUT="$TEMP_FILE"
    FILE_SIZE=$(wc -c < "$TEMP_FILE")
    FILE_BITS=$((FILE_SIZE * 8))
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "=========================================="
echo "NIST Statistical Test Suite (Simplified)"
echo "=========================================="
echo "Input: $INPUT_FILE ($FILE_BITS bits)"
echo "Output: $OUTPUT_DIR/"
echo ""

# Change to NIST directory
cd "$NIST_DIR"

# Create input script for NIST (all tests)
echo "Running all 15 NIST tests..."
(
    echo "0"           # Input from file
    echo "$ABS_INPUT"  # File path (absolute)
    echo "1"           # How many bitstreams
    echo "0"           # Input file format (ASCII)
    echo "$FILE_BITS"  # Length of bitstream
    echo "1"           # Frequency test
    echo "1"           # Block frequency test
    echo "1"           # Cumulative sums test
    echo "1"           # Runs test
    echo "1"           # Longest run of ones test
    echo "1"           # Binary matrix rank test
    echo "1"           # DFT test
    echo "1"           # Non-overlapping template test
    echo "1"           # Overlapping template test
    echo "1"           # Universal test
    echo "1"           # Approximate entropy test
    echo "1"           # Random excursions test
    echo "1"           # Random excursions variant test
    echo "1"           # Serial test
    echo "1"           # Linear complexity test
    echo "0"           # Continue with default parameters
    echo "1"           # Number of bitstreams to process
) | timeout 30 ./assess $FILE_BITS 2>&1 | tee "$PROJECT_ROOT/$OUTPUT_DIR/output.log"

# Go back to project root
cd "$PROJECT_ROOT"

# Parse results
echo ""
echo "=========================================="
echo "Results Summary"
echo "=========================================="

# Look for pass/fail in experiments directory
RESULTS_DIR="$NIST_DIR/experiments/AlgorithmTesting"
if [ -d "$RESULTS_DIR" ]; then
    # Count test results
    PASSED=0
    FAILED=0
    
    # Check each test directory
    for TEST_DIR in "$RESULTS_DIR"/*; do
        if [ -d "$TEST_DIR" ]; then
            TEST_NAME=$(basename "$TEST_DIR")
            
            # Look for stats file
            STATS_FILE="$TEST_DIR/stats.txt"
            FINAL_FILE="$TEST_DIR/finalAnalysisReport.txt"
            
            if [ -f "$FINAL_FILE" ]; then
                if grep -q "PASSED" "$FINAL_FILE" 2>/dev/null; then
                    echo "✓ $TEST_NAME: PASSED"
                    ((PASSED++))
                elif grep -q "FAILED" "$FINAL_FILE" 2>/dev/null; then
                    echo "✗ $TEST_NAME: FAILED"
                    ((FAILED++))
                else
                    echo "? $TEST_NAME: Unknown"
                fi
            fi
        fi
    done
    
    echo ""
    echo "Total: $PASSED passed, $FAILED failed"
else
    echo "Could not find results directory"
    echo "Check $OUTPUT_DIR/output.log for details"
fi

# Clean up temp file
if [ -f "/tmp/nist_extended_$$.bin" ]; then
    rm "/tmp/nist_extended_$$.bin"
fi

echo ""
echo "Full output saved to: $OUTPUT_DIR/output.log"