#!/bin/bash

# Process time series data to extract random bits
# Removes background signals and applies optimal extraction

INPUT_FILE="${1:-working/concatenated.txt}"
OUTPUT_FILE="${2:-working/cleaned_random.bin}"

echo "Processing timestamp delta series..."
echo "Input: $INPUT_FILE"
echo "Output: $OUTPUT_FILE"

# Count input samples
SAMPLE_COUNT=$(wc -l < "$INPUT_FILE")
echo "Total samples: $SAMPLE_COUNT"

# Process with optimal settings
cat "$INPUT_FILE" | python src/analysis/extract.py \
  --filter highpass:0.001 \
  --filter detrend \
  --method adaptive_threshold \
  --postprocess von_neumann \
  --stats \
  --output binary > "$OUTPUT_FILE" 2> working/extraction.log

# Show statistics
echo ""
echo "Extraction Statistics:"
cat working/extraction.log

# Check output size
OUTPUT_SIZE=$(stat -c%s "$OUTPUT_FILE" 2>/dev/null || stat -f%z "$OUTPUT_FILE" 2>/dev/null)
echo ""
echo "Output size: $OUTPUT_SIZE bytes"
echo "Bits per input sample: $(echo "scale=3; $OUTPUT_SIZE * 8 / $SAMPLE_COUNT" | bc)"

# Quick randomness check
echo ""
echo "Quick entropy check (first 1MB):"
head -c 1048576 "$OUTPUT_FILE" | ent