#!/bin/bash
# Full TRNG evaluation pipeline for test data

echo "============================================================"
echo "FULL TRNG EVALUATION PIPELINE"
echo "============================================================"
echo ""

# Input and output files
INPUT_FILE="${1:-src/analysis/test-data.txt}"
OUTPUT_DIR="evaluate_improved"
BINARY_FILE="$OUTPUT_DIR/final_random.bin"
STATS_FILE="$OUTPUT_DIR/final_stats.txt"

# Create output directory
mkdir -p $OUTPUT_DIR

# Step 1: Extract random bits with statistics
echo "Step 1: Extracting random bits from $INPUT_FILE..."
echo "----------------------------------------"
# Run twice: once for binary output, once for stats
cat $INPUT_FILE | python3 src/analysis/improved_extract.py > $BINARY_FILE
cat $INPUT_FILE | python3 src/analysis/improved_extract.py --stats 2>&1 | grep "^#" > $STATS_FILE

cat $STATS_FILE
echo ""

# Step 2: Check file size
SIZE=$(wc -c < $BINARY_FILE)
echo "Generated $SIZE bytes of random data"
echo ""

# Step 3: Run Python randomness tests (all tests, not just quick)
echo "Step 3: Running Python randomness tests..."
echo "----------------------------------------"
cat $BINARY_FILE | python3 src/analysis/test_randomness.py 2>&1
echo ""

# Step 4: If Dieharder is installed, run it
if command -v dieharder &> /dev/null; then
    echo "Step 4: Running Dieharder tests (this may take a while)..."
    echo "----------------------------------------"
    # Run a subset of dieharder tests for speed
    cat $BINARY_FILE | dieharder -g 200 -d 0 -d 1 -d 2 -d 3 -d 4 2>&1 | head -50
    echo ""
else
    echo "Step 4: Dieharder not installed (install with: sudo apt-get install dieharder)"
    echo ""
fi

# Step 5: If NIST STS is available, prepare for it
if [ -f "repos/sts-2.1.2/sts-2.1.2/assess" ]; then
    echo "Step 5: Preparing for NIST STS tests..."
    echo "----------------------------------------"
    # NIST STS needs at least 1M bits (125000 bytes)
    if [ $SIZE -lt 125000 ]; then
        echo "File too small for NIST STS (need 125KB, have $(($SIZE/1024))KB)"
        echo "Generating repeated data for testing..."
        REPS=$((125000 / $SIZE + 1))
        for i in $(seq 1 $REPS); do
            cat $BINARY_FILE
        done > $OUTPUT_DIR/nist_input.bin
        echo "Created $(wc -c < $OUTPUT_DIR/nist_input.bin) bytes for NIST testing"
    else
        cp $BINARY_FILE $OUTPUT_DIR/nist_input.bin
    fi
    echo "NIST input ready at $OUTPUT_DIR/nist_input.bin"
    echo "To run NIST tests: cd repos/sts-2.1.2/sts-2.1.2/ && ./assess 1000000 < ../../../$OUTPUT_DIR/nist_input.bin"
else
    echo "Step 5: NIST STS not found at repos/sts-2.1.2/sts-2.1.2/assess"
fi

echo ""
echo "============================================================"
echo "EVALUATION COMPLETE"
echo "Random binary saved to: $BINARY_FILE"
echo "============================================================"