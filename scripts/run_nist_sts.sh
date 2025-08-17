#!/bin/bash
# NIST STS automation script - runs tests on a file without manual input

# Check arguments
if [ $# -lt 1 ]; then
    echo "Usage: $0 <input_file> [output_dir]"
    echo "Example: $0 random.bin results/"
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_DIR="${2:-nist_results}"
NIST_DIR="repos/sts-2.1.2/sts-2.1.2"
ASSESS="$NIST_DIR/assess"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file '$INPUT_FILE' not found"
    exit 1
fi

# Check if NIST STS is built
if [ ! -f "$ASSESS" ]; then
    echo "Error: NIST STS not found. Run 'make nist-sts' first."
    exit 1
fi

# Get file size
FILE_SIZE=$(wc -c < "$INPUT_FILE")
FILE_BITS=$((FILE_SIZE * 8))

# NIST STS needs at least 1M bits
MIN_BITS=1000000
if [ $FILE_BITS -lt $MIN_BITS ]; then
    echo "Warning: File has only $FILE_BITS bits, NIST STS needs at least $MIN_BITS bits"
    echo "Repeating data to reach minimum size..."
    
    TEMP_FILE="/tmp/nist_input_$$.bin"
    REPS=$(( (MIN_BITS / FILE_BITS) + 1 ))
    
    for i in $(seq 1 $REPS); do
        cat "$INPUT_FILE"
    done > "$TEMP_FILE"
    
    INPUT_FILE="$TEMP_FILE"
    FILE_SIZE=$(wc -c < "$INPUT_FILE")
    FILE_BITS=$((FILE_SIZE * 8))
    echo "Extended to $FILE_BITS bits"
fi
FILE_BITS=1000000

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Convert to absolute path and then make it relative to NIST dir
ABS_INPUT=$(readlink -f "$INPUT_FILE")
REL_INPUT="../../../$INPUT_FILE"

# If we created a temp file, use that path
if [ -f "/tmp/nist_input_$$.bin" ]; then
    REL_INPUT="$(realpath ${TEMP_FILE})"
    #REL_INPUT="../../..//tmp/nist_input_$$.bin"
fi

# Get absolute paths
ABS_OUTPUT_DIR="$(cd "$(dirname "$OUTPUT_DIR")"; pwd)/$(basename "$OUTPUT_DIR")"

# Prepare NIST STS input script
# This automates the interactive prompts
cat > "$ABS_OUTPUT_DIR/nist_input.txt" << EOF
0
$REL_INPUT
1
0
$FILE_BITS
1
EOF

# Create test parameters (run all 15 tests)
cat > "$ABS_OUTPUT_DIR/test_params.txt" << EOF
1
1
1
1
1
1
1
1
1
1
1
1
1
1
1
EOF

echo "=========================================="
echo "Running NIST Statistical Test Suite"
echo "=========================================="
echo "Input file: $INPUT_FILE"
echo "File size: $FILE_SIZE bytes ($FILE_BITS bits)"
echo "Output directory: $OUTPUT_DIR"
echo ""

# Change to NIST directory (it expects to run from there)
cd "$NIST_DIR"

# Run NIST STS with automated input
echo "Running tests..."

#read -r COMMAND <<< cat << EOF
#EOF
echo "cat $ABS_OUTPUT_DIR/nist_input.txt $ABS_OUTPUT_DIR/test_params.txt | ./assess $FILE_BITS"
#2>&1 \
#| tee $ABS_OUTPUT_DIR/nist_output.log

#${COMMAND}
exit

# Go back to project root
cd ../../../

# Parse results
echo ""
echo "=========================================="
echo "Test Results Summary"
echo "=========================================="

# Look for results in the experiments directory
RESULTS_DIR="$NIST_DIR/experiments/AlgorithmTesting"
if [ -d "$RESULTS_DIR" ]; then
    # Find the most recent results
    LATEST_RESULTS=$(ls -t "$RESULTS_DIR" 2>/dev/null | head -1)
    
    if [ -n "$LATEST_RESULTS" ]; then
        echo "Results found in: $RESULTS_DIR/$LATEST_RESULTS"
        
        # Copy results to output directory
        cp -r "$RESULTS_DIR/$LATEST_RESULTS" "$OUTPUT_DIR/" 2>/dev/null
        
        # Parse final analysis report if it exists
        FINAL_REPORT="$RESULTS_DIR/$LATEST_RESULTS/finalAnalysisReport.txt"
        if [ -f "$FINAL_REPORT" ]; then
            echo ""
            echo "Final Analysis:"
            echo "----------------------------------------"
            grep -E "PASSED|FAILED|SUCCESS" "$FINAL_REPORT" | head -20
        fi
        
        # Count pass/fail
        if [ -f "$FINAL_REPORT" ]; then
            PASSED=$(grep -c "PASSED" "$FINAL_REPORT" 2>/dev/null || echo 0)
            FAILED=$(grep -c "FAILED" "$FINAL_REPORT" 2>/dev/null || echo 0)
            echo ""
            echo "Summary: $PASSED tests passed, $FAILED tests failed"
        fi
    else
        echo "Warning: No results found in experiments directory"
    fi
else
    echo "Warning: Results directory not found"
fi

# Clean up temp file if created
if [ -f "/tmp/nist_input_$$.bin" ]; then
    rm "/tmp/nist_input_$$.bin"
fi

echo ""
echo "NIST STS testing complete. Full results in: $OUTPUT_DIR/"
