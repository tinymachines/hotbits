#!/bin/bash
# Run all available randomness tests on a file

if [ $# -lt 1 ]; then
    echo "Usage: $0 <random_file>"
    exit 1
fi

FILE="$1"
echo "Testing: $FILE"
echo "Size: $(wc -c < $FILE) bytes"
echo ""

# 1. ENT test
if command -v ent >/dev/null 2>&1; then
    echo "=== ENT Analysis ==="
    ent "$FILE"
    echo ""
fi

# 2. rngtest (FIPS 140-2)
if command -v rngtest >/dev/null 2>&1; then
    echo "=== FIPS 140-2 Tests (rngtest) ==="
    cat "$FILE" | rngtest 2>&1 | head -20
    echo ""
fi

# 3. Dieharder (if available)
if command -v dieharder >/dev/null 2>&1; then
    echo "=== Dieharder Quick Test ==="
    echo "Running birthdays test..."
    dieharder -d 0 -f "$FILE" -t 1 2>&1 | grep -E "PASSED|WEAK|FAILED"
    echo ""
fi

# 4. Python tests
if [ -f "src/analysis/test_randomness.py" ]; then
    echo "=== Python Randomness Tests ==="
    cat "$FILE" | python3 src/analysis/test_randomness.py --quick 2>&1
    echo ""
fi

# 5. NIST STS (if available)
if [ -f "scripts/run_nist_sts.sh" ]; then
    echo "=== NIST STS Tests ==="
    echo "To run full NIST tests: ./scripts/run_nist_sts.sh $FILE"
    echo ""
fi
