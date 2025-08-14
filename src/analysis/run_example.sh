#!/bin/bash

echo "TRNG Analysis Pipeline Example"
echo "=============================="
echo ""

# Step 1: Analyze raw data
echo "Step 1: Analyzing raw timestamp deltas..."
python3 src/analysis/analyze.py -i data/events.txt > analysis_report.txt
echo "Analysis saved to analysis_report.txt"
echo ""

# Step 2: Extract bits with filtering based on analysis
echo "Step 2: Extracting random bits with optimized pipeline..."
echo ""

# Configuration based on analysis results:
# - Notch filter at 2.7 Hz to remove dominant periodic signal
# - Adaptive threshold for bit extraction
# - Von Neumann debiasing for post-processing

cat data/events.txt | \
    python3 src/analysis/extract.py \
        -m adaptive_threshold \
        -f notch:2.7 \
        -f detrend \
        -p von_neumann \
        -s \
        -o binary > random_output.bin 2> extraction_stats.txt

echo "Extraction statistics:"
cat extraction_stats.txt
echo ""

# Step 3: Test randomness
echo "Step 3: Testing randomness quality..."
python3 src/analysis/test_randomness.py \
    -i random_output.bin \
    -q \
    -v

echo ""
echo "Pipeline complete!"
echo ""
echo "Files generated:"
echo "  - analysis_report.txt: Signal analysis results"
echo "  - random_output.bin: Extracted random bits"
echo "  - extraction_stats.txt: Extraction statistics"
echo ""
echo "Next steps:"
echo "  1. Review analysis_report.txt for signal characteristics"
echo "  2. Test random_output.bin with dieharder for full validation"
echo "  3. Adjust filters and extraction methods based on results"