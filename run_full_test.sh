#!/bin/bash
# Full TRNG evaluation pipeline for test data

echo "============================================================"
echo "FULL TRNG EVALUATION PIPELINE"
echo "============================================================"
echo ""

# Input and output files
INPUT_FILE="${1:-src/analysis/test-data.txt}"
OUTPUT_DIR="working"
BINARY_FILE="$OUTPUT_DIR/random.bin"
STATS_FILE="$OUTPUT_DIR/stats.txt"

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
    # Use file input for dieharder (-a runs all tests)
    dieharder -a -f $BINARY_FILE
    echo ""
else
    echo "Step 4: Dieharder not installed (install with: sudo apt-get install dieharder)"
    echo ""
fi

# Step 5: If NIST STS is available, run it automatically
if [ -f "repos/sts-2.1.2/sts-2.1.2/assess" ]; then
    echo "Step 5: Running NIST STS tests..."
    echo "----------------------------------------"
    # Use the simplified NIST script
    if [ -f "scripts/run_nist_sts_simple.sh" ]; then
        chmod +x scripts/run_nist_sts_simple.sh
        ./scripts/run_nist_sts_simple.sh $BINARY_FILE $OUTPUT_DIR/nist_results 2>&1 | tail -40
    elif [ -f "scripts/run_nist_sts.sh" ]; then
        chmod +x scripts/run_nist_sts.sh
        ./scripts/run_nist_sts.sh $BINARY_FILE $OUTPUT_DIR/nist_results 2>&1 | tail -30
    else
        echo "NIST automation script not found"
        echo "To run manually: cd repos/sts-2.1.2/sts-2.1.2 && ./assess"
    fi
else
    echo "Step 5: NIST STS not found. Run 'make nist-sts' to build it."
fi

echo ""
echo "============================================================"
echo "EVALUATION COMPLETE"
echo "Random binary saved to: $BINARY_FILE"
echo "============================================================"
