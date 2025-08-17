#!/bin/bash
# Improved evaluation script using better extraction techniques

echo "============================================================"
echo "IMPROVED TRNG EVALUATION"
echo "============================================================"
echo ""

# Clean up previous results
rm -rf ./evaluate_improved 2>/dev/null
mkdir -p ./evaluate_improved

# Process data through improved pipeline
echo "Processing timestamp data..."
cat data/events.txt | python3 src/analysis/simple_extract.py --stats --test > evaluate_improved/random.bin 2> evaluate_improved/extraction_stats.txt

# Show extraction statistics
echo "Extraction Statistics:"
echo "----------------------------------------"
cat evaluate_improved/extraction_stats.txt
echo ""

# Run randomness tests
echo "Running randomness tests..."
cat evaluate_improved/random.bin | python3 src/analysis/test_randomness.py --quick > evaluate_improved/test_results.txt 2>&1

echo "Test Results:"
echo "----------------------------------------"
cat evaluate_improved/test_results.txt
echo ""

# Generate more random data for extended testing
echo "Generating extended random data (10x repetition)..."
for i in {1..10}; do
    cat data/events.txt | python3 src/analysis/simple_extract.py --output binary 2>/dev/null
done > evaluate_improved/extended_random.bin

SIZE=$(wc -c < evaluate_improved/extended_random.bin)
echo "Generated $SIZE bytes of random data"
echo ""

# Run extended tests
echo "Running extended randomness tests..."
cat evaluate_improved/extended_random.bin | python3 src/analysis/test_randomness.py > evaluate_improved/extended_test_results.txt 2>&1

echo "Extended Test Results:"
echo "----------------------------------------"
cat evaluate_improved/extended_test_results.txt

echo ""
echo "============================================================"
echo "Evaluation complete. Results saved in ./evaluate_improved/"
echo "============================================================"