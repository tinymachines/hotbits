#!/bin/bash
# Simple full TRNG evaluation pipeline

echo "============================================================"
echo "FULL TRNG EVALUATION PIPELINE"
echo "============================================================"
echo ""

# Input file
INPUT_FILE="${1:-src/analysis/test-data.txt}"
OUTPUT_DIR="evaluate_improved"

# Create output directory
mkdir -p $OUTPUT_DIR

# Step 1: Generate random binary
echo "Step 1: Generating random binary from $INPUT_FILE..."
cat $INPUT_FILE | python3 src/analysis/improved_extract.py > $OUTPUT_DIR/final_random.bin

# Step 2: Get statistics
echo ""
echo "Step 2: Extraction Statistics:"
echo "----------------------------------------"
cat $INPUT_FILE | python3 src/analysis/improved_extract.py --stats 2>&1 | grep "^#"

# Step 3: Check output
SIZE=$(wc -c < $OUTPUT_DIR/final_random.bin)
echo ""
echo "Generated: $SIZE bytes ($(($SIZE * 8)) bits)"
echo ""

# Step 4: Run randomness tests
echo "Step 4: Randomness Tests:"
echo "----------------------------------------"
cat $OUTPUT_DIR/final_random.bin | python3 src/analysis/test_randomness.py 2>&1

echo ""
echo "============================================================"
echo "Binary file saved to: $OUTPUT_DIR/final_random.bin"
echo ""
echo "To run additional tests:"
echo "  - Dieharder: cat $OUTPUT_DIR/final_random.bin | dieharder -a -g 200"
echo "  - NIST STS: cd repos/sts-2.1.2/sts-2.1.2/ && ./assess 1000000"
echo "============================================================"