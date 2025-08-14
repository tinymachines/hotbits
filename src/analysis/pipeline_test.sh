#!/bin/bash

# Pipeline test script for rapid experimentation
# Tests different extraction methods and measures randomness

DATA_FILE="${1:-data/events.txt}"
SAMPLE_SIZE="${2:-10000}"

echo "Testing TRNG Pipeline Configurations"
echo "====================================="
echo "Data file: $DATA_FILE"
echo "Sample size: $SAMPLE_SIZE"
echo ""

# Test different methods
METHODS=(
    "adaptive_threshold"
    "differential"
    "lsb:n_bits=4"
    "von_neumann"
    "xor_fold:fold_size=16"
)

FILTERS=(
    ""
    "highpass:0.01"
    "detrend"
    "notch:2.7"  # Based on frequency analysis
)

POSTPROCS=(
    ""
    "von_neumann"
    "sha256"
)

echo "Method,Filter,PostProc,Bits,Balance,Frequency,ChiSquare,Compression"

for method in "${METHODS[@]}"; do
    for filter in "${FILTERS[@]}"; do
        for postproc in "${POSTPROCS[@]}"; do
            # Build command
            cmd="head -$SAMPLE_SIZE $DATA_FILE | python3 src/analysis/extract.py"
            
            # Add method
            method_name=$(echo $method | cut -d: -f1)
            cmd="$cmd -m $method_name"
            
            # Add filter if specified
            if [ -n "$filter" ]; then
                cmd="$cmd -f $filter"
                filter_name=$(echo $filter | cut -d: -f1)
            else
                filter_name="none"
            fi
            
            # Add postprocessing if specified
            if [ -n "$postproc" ]; then
                cmd="$cmd -p $postproc"
                postproc_name=$postproc
            else
                postproc_name="none"
            fi
            
            # Run extraction and test
            result=$(eval "$cmd" 2>/dev/null | python3 src/analysis/test_randomness.py --quick --json 2>/dev/null)
            
            if [ -n "$result" ]; then
                # Parse JSON results
                freq=$(echo "$result" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('quick',{}).get('frequency',{}).get('value',0))" 2>/dev/null)
                chi=$(echo "$result" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('quick',{}).get('chi_square',{}).get('value',0))" 2>/dev/null)
                comp=$(echo "$result" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('quick',{}).get('compression',{}).get('ratio',0))" 2>/dev/null)
                
                echo "$method_name,$filter_name,$postproc_name,,$freq,$chi,$comp"
            fi
        done
    done
done