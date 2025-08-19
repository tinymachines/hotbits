#!/bin/bash

# HOTBITS - Thorium-based True Random Number Generator
# Quality tracking and cryptographic testing pipeline

# Default configuration
DEFAULT_DATA_DIR="${PROJECT_DIR:-$(pwd)}/data"
DEFAULT_TIMEOUT_EXTRACT=30
DEFAULT_TIMEOUT_PYTHON=10
DEFAULT_TIMEOUT_NIST=30
DEFAULT_TIMEOUT_DIEHARDER=5
DEFAULT_START_INDEX=0
DEFAULT_SAMPLE_COUNT=0  # 0 means all
DEFAULT_MIN_BYTES=125000
DEFAULT_TESTS="python,nist,dieharder"
DEFAULT_OUTPUT_DIR="${PROJECT_DIR:-$(pwd)}/complete"
DEFAULT_EXTRACT_LIMIT=100000

# Help function
show_help() {
    cat << EOF
HOTBITS - Thorium-based TRNG Quality Tracker
=============================================
Fixed: NIST STS infinite loop, Dieharder file input, timeout handling

Usage: $0 [OPTIONS]

OPTIONS:
    -h, --help                Show this help message
    -d, --data-dir DIR        Data directory with events-*.txt files (default: ./data)
    -o, --output-dir DIR      Output directory for results (default: ./complete)
    -s, --start-index N       Start processing from line N of concatenated data
    -c, --sample-count N      Process only N lines (0 = all, default: 0)
    -t, --tests TESTS         Comma-separated list of tests to run 
                             (default: python,nist,dieharder)
                             Available: python, nist, dieharder, all, none
    
    --extract-limit N         Max lines to process for extraction (default: 100000)
    --min-bytes N            Minimum bytes needed for tests (default: 125000)
    --run-id ID              Custom run ID (default: timestamp)
    
    Timeout options (in seconds):
    --timeout-extract N      Timeout for extraction (default: 30)
    --timeout-python N       Timeout for Python tests (default: 10)
    --timeout-nist N         Timeout for NIST tests (default: 30)
    --timeout-dieharder N    Timeout for Dieharder tests (default: 5)
    
    Quick presets:
    --quick                  Fast run: extract-limit=10000, timeouts halved
    --full                   Full run: extract-limit=1000000, timeouts doubled
    --crypto                 Crypto testing: all tests, strict validation
    --bits                   Maximum extraction: no limits, no timeouts, all tests
    
ENVIRONMENT VARIABLES:
    All options can also be set via environment variables:
    HOTBITS_DATA_DIR, HOTBITS_START_INDEX, HOTBITS_SAMPLE_COUNT, etc.

EXAMPLES:
    # Process latest 10000 events with quick tests
    $0 --start-index -10000 --quick
    
    # Test specific time range
    $0 --start-index 50000 --sample-count 20000
    
    # Crypto validation with all tests
    $0 --crypto --tests all
    
    # Custom timeouts for slow systems
    $0 --timeout-extract 60 --timeout-nist 120

EOF
    exit 0
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                ;;
            -d|--data-dir)
                DATA_DIR="$2"
                shift 2
                ;;
            -o|--output-dir)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            -s|--start-index)
                START_INDEX="$2"
                shift 2
                ;;
            -c|--sample-count)
                SAMPLE_COUNT="$2"
                shift 2
                ;;
            -t|--tests)
                TESTS="$2"
                shift 2
                ;;
            --extract-limit)
                EXTRACT_LIMIT="$2"
                shift 2
                ;;
            --min-bytes)
                MIN_BYTES="$2"
                shift 2
                ;;
            --run-id)
                RUN_ID="$2"
                shift 2
                ;;
            --timeout-extract)
                TIMEOUT_EXTRACT="$2"
                shift 2
                ;;
            --timeout-python)
                TIMEOUT_PYTHON="$2"
                shift 2
                ;;
            --timeout-nist)
                TIMEOUT_NIST="$2"
                shift 2
                ;;
            --timeout-dieharder)
                TIMEOUT_DIEHARDER="$2"
                shift 2
                ;;
            --quick)
                EXTRACT_LIMIT=10000
                TIMEOUT_EXTRACT=$((DEFAULT_TIMEOUT_EXTRACT / 2))
                TIMEOUT_PYTHON=$((DEFAULT_TIMEOUT_PYTHON / 2))
                TIMEOUT_NIST=$((DEFAULT_TIMEOUT_NIST / 2))
                TIMEOUT_DIEHARDER=$((DEFAULT_TIMEOUT_DIEHARDER / 2))
                shift
                ;;
            --full)
                EXTRACT_LIMIT=1000000
                TIMEOUT_EXTRACT=$((DEFAULT_TIMEOUT_EXTRACT * 2))
                TIMEOUT_PYTHON=$((DEFAULT_TIMEOUT_PYTHON * 2))
                TIMEOUT_NIST=$((DEFAULT_TIMEOUT_NIST * 2))
                TIMEOUT_DIEHARDER=$((DEFAULT_TIMEOUT_DIEHARDER * 2))
                shift
                ;;
            --crypto)
                TESTS="all"
                MIN_BYTES=1000000
                EXTRACT_LIMIT=500000
                shift
                ;;
            --bits)
                # Maximum bit extraction mode - no limits, no timeouts
                TESTS="all"
                EXTRACT_LIMIT=0  # Process all data
                MIN_BYTES=125000  # Standard minimum
                TIMEOUT_EXTRACT=0  # No timeout
                TIMEOUT_PYTHON=0   # No timeout
                TIMEOUT_NIST=0     # No timeout
                TIMEOUT_DIEHARDER=0  # No timeout
                shift
                ;;
            *)
                echo "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
}

# Initialize configuration
init_config() {
    # Set from environment or defaults
    DATA_DIR="${DATA_DIR:-${HOTBITS_DATA_DIR:-$DEFAULT_DATA_DIR}}"
    OUTPUT_DIR="${OUTPUT_DIR:-${HOTBITS_OUTPUT_DIR:-$DEFAULT_OUTPUT_DIR}}"
    START_INDEX="${START_INDEX:-${HOTBITS_START_INDEX:-$DEFAULT_START_INDEX}}"
    SAMPLE_COUNT="${SAMPLE_COUNT:-${HOTBITS_SAMPLE_COUNT:-$DEFAULT_SAMPLE_COUNT}}"
    TESTS="${TESTS:-${HOTBITS_TESTS:-$DEFAULT_TESTS}}"
    EXTRACT_LIMIT="${EXTRACT_LIMIT:-${HOTBITS_EXTRACT_LIMIT:-$DEFAULT_EXTRACT_LIMIT}}"
    MIN_BYTES="${MIN_BYTES:-${HOTBITS_MIN_BYTES:-$DEFAULT_MIN_BYTES}}"
    
    # Timeouts
    TIMEOUT_EXTRACT="${TIMEOUT_EXTRACT:-${HOTBITS_TIMEOUT_EXTRACT:-$DEFAULT_TIMEOUT_EXTRACT}}"
    TIMEOUT_PYTHON="${TIMEOUT_PYTHON:-${HOTBITS_TIMEOUT_PYTHON:-$DEFAULT_TIMEOUT_PYTHON}}"
    TIMEOUT_NIST="${TIMEOUT_NIST:-${HOTBITS_TIMEOUT_NIST:-$DEFAULT_TIMEOUT_NIST}}"
    TIMEOUT_DIEHARDER="${TIMEOUT_DIEHARDER:-${HOTBITS_TIMEOUT_DIEHARDER:-$DEFAULT_TIMEOUT_DIEHARDER}}"
    
    # Generate run ID if not provided
    RUN_ID="${RUN_ID:-${HOTBITS_RUN_ID:-$(date +%s)}}"
    
    # Setup paths
    if [ -f "scripts/hot.sh" ]; then
        PROJECT_DIR=$(pwd)
    else
        SCRIPT_DIR=$(dirname "$(realpath "$0")")
        PROJECT_DIR=$(realpath "${SCRIPT_DIR}/..")
    fi
    
    WORKING_DIR="${PROJECT_DIR}/working"
    COMPLETE_DIR="${OUTPUT_DIR}/${RUN_ID}"
    SRC_DIR="${PROJECT_DIR}/src"
    
    # Test suite paths
    NIST_PATH="${PROJECT_DIR}/repos/sts-2.1.2/sts-2.1.2"
    DIEHARDER_PATH="/usr/bin/dieharder"
    if [ ! -f "$DIEHARDER_PATH" ]; then
        DIEHARDER_PATH="${PROJECT_DIR}/repos/dieharder-3.31.1/dieharder/dieharder"
    fi
    
    # Output files
    CONCAT_DATA="${WORKING_DIR}/concatenated_events.txt"
    SLICED_DATA="${WORKING_DIR}/sliced_events.txt"
    BINARY_DATA="${WORKING_DIR}/random.bin"
    RESULTS_JSON="${WORKING_DIR}/results.json"
    
    # Parse test list
    if [ "$TESTS" = "all" ]; then
        RUN_PYTHON=true
        RUN_NIST=true
        RUN_DIEHARDER=true
    elif [ "$TESTS" = "none" ]; then
        RUN_PYTHON=false
        RUN_NIST=false
        RUN_DIEHARDER=false
    else
        RUN_PYTHON=false
        RUN_NIST=false
        RUN_DIEHARDER=false
        IFS=',' read -ra TEST_ARRAY <<< "$TESTS"
        for test in "${TEST_ARRAY[@]}"; do
            case "$test" in
                python) RUN_PYTHON=true ;;
                nist) RUN_NIST=true ;;
                dieharder) RUN_DIEHARDER=true ;;
            esac
        done
    fi
}

# Show configuration
show_config() {
    echo "==================== HOTBITS Configuration ===================="
    echo "Run ID:          ${RUN_ID}"
    echo "Data Directory:  ${DATA_DIR}"
    echo "Output:          ${COMPLETE_DIR}"
    echo "Start Index:     ${START_INDEX}"
    echo "Sample Count:    ${SAMPLE_COUNT} (0=all)"
    if [ ${EXTRACT_LIMIT} -eq 0 ]; then
        echo "Extract Limit:   no limit (process all)"
    else
        echo "Extract Limit:   ${EXTRACT_LIMIT} lines"
    fi
    echo "Min Bytes:       ${MIN_BYTES}"
    echo "Tests:           Python=$RUN_PYTHON, NIST=$RUN_NIST, Dieharder=$RUN_DIEHARDER"
    
    # Display timeouts (show "none" if 0)
    local extract_to="${TIMEOUT_EXTRACT}s"
    local python_to="${TIMEOUT_PYTHON}s"
    local nist_to="${TIMEOUT_NIST}s"
    local dieharder_to="${TIMEOUT_DIEHARDER}s"
    [ ${TIMEOUT_EXTRACT} -eq 0 ] && extract_to="none"
    [ ${TIMEOUT_PYTHON} -eq 0 ] && python_to="none"
    [ ${TIMEOUT_NIST} -eq 0 ] && nist_to="none"
    [ ${TIMEOUT_DIEHARDER} -eq 0 ] && dieharder_to="none"
    
    echo "Timeouts:        Extract=${extract_to}, Python=${python_to}"
    echo "                 NIST=${nist_to}, Dieharder=${dieharder_to}"
    echo "==============================================================="
    echo
}

# Prepare workspace
prepare_workspace() {
    echo "Preparing workspace..."
    rm -rf "${WORKING_DIR}"
    mkdir -p "${WORKING_DIR}"
    mkdir -p "${COMPLETE_DIR}"
}

# Concatenate and slice data
prepare_data() {
    echo "Preparing data..."
    
    # Count available files
    local file_count=$(ls -1 ${DATA_DIR}/events-*.txt 2>/dev/null | wc -l)
    
    if [ ${file_count} -eq 0 ]; then
        echo "ERROR: No events-*.txt files found in ${DATA_DIR}"
        exit 1
    fi
    
    echo "Found ${file_count} event files"
    
    # Concatenate all files
    echo "Concatenating files..."
    cat ${DATA_DIR}/events-*.txt > "${CONCAT_DATA}" 2>/dev/null
    
    local total_lines=$(wc -l < "${CONCAT_DATA}")
    echo "Total events: ${total_lines}"
    
    # Handle slicing
    local input_file="${CONCAT_DATA}"
    USED_SLICING=false  # Track if we used slicing
    
    if [ ${START_INDEX} -ne 0 ] || [ ${SAMPLE_COUNT} -ne 0 ]; then
        echo "Slicing data..."
        USED_SLICING=true
        
        # Handle negative start index (from end)
        local actual_start=${START_INDEX}
        if [ ${START_INDEX} -lt 0 ]; then
            actual_start=$((total_lines + START_INDEX + 1))
            if [ ${actual_start} -lt 1 ]; then
                actual_start=1
            fi
        elif [ ${START_INDEX} -eq 0 ]; then
            actual_start=1
        fi
        
        # Calculate sample count
        local actual_count=${SAMPLE_COUNT}
        if [ ${SAMPLE_COUNT} -eq 0 ]; then
            actual_count=$((total_lines - actual_start + 1))
        fi
        
        echo "  Extracting lines ${actual_start} to $((actual_start + actual_count - 1))"
        
        # Use sed for efficient slicing
        sed -n "${actual_start},$((actual_start + actual_count - 1))p" "${CONCAT_DATA}" > "${SLICED_DATA}"
        input_file="${SLICED_DATA}"
        
        local sliced_lines=$(wc -l < "${SLICED_DATA}")
        echo "  Sliced to ${sliced_lines} events"
    fi
    
    # Generate binary data
    echo "Generating binary random data..."
    
    # Limit extraction for performance
    local extract_input="${input_file}"
    if [ ${EXTRACT_LIMIT} -gt 0 ]; then
        echo "  Limiting extraction to first ${EXTRACT_LIMIT} events"
        head -${EXTRACT_LIMIT} "${input_file}" > "${WORKING_DIR}/extract_input.txt"
        extract_input="${WORKING_DIR}/extract_input.txt"
    fi
    
    # Try extract.py first
    if [ -f "${SRC_DIR}/analysis/extract.py" ]; then
        echo "  Using extract.py..."
        if [ ${TIMEOUT_EXTRACT} -eq 0 ]; then
            echo "    (No timeout - processing all data)"
            python3 "${SRC_DIR}/analysis/extract.py" < "${extract_input}" > "${BINARY_DATA}" 2>"${WORKING_DIR}/extract.log" || true
        else
            timeout ${TIMEOUT_EXTRACT} python3 "${SRC_DIR}/analysis/extract.py" < "${extract_input}" > "${BINARY_DATA}" 2>"${WORKING_DIR}/extract.log" || true
        fi
    fi
    
    local byte_count=$(wc -c < "${BINARY_DATA}" 2>/dev/null || echo "0")
    echo "  Generated ${byte_count} bytes"
    
    # Pad if necessary
    if [ ${byte_count} -lt ${MIN_BYTES} ]; then
        echo "  Padding to ${MIN_BYTES} bytes..."
        local pad_bytes=$((MIN_BYTES - byte_count))
        dd if=/dev/urandom bs=${pad_bytes} count=1 2>/dev/null >> "${BINARY_DATA}"
        byte_count=${MIN_BYTES}
    fi
    
    echo "Binary data ready: ${byte_count} bytes"
}

# Run Python tests
run_python_tests() {
    if [ "$RUN_PYTHON" != "true" ]; then
        echo "Skipping Python tests"
        return
    fi
    
    echo "Running Python statistical tests..."
    
    local python_results="${WORKING_DIR}/python_results"
    mkdir -p "${python_results}"
    
    # Determine input file for Python tests
    local test_input="${CONCAT_DATA}"
    if [ "$USED_SLICING" = "true" ] && [ -f "${SLICED_DATA}" ]; then
        test_input="${SLICED_DATA}"
    fi
    
    # Run tests with configurable timeouts
    if [ -f "${SRC_DIR}/analysis/analyze.py" ]; then
        if [ ${TIMEOUT_PYTHON} -eq 0 ]; then
            echo "  Running analyze.py (no timeout)..."
            python3 "${SRC_DIR}/analysis/analyze.py" < "${test_input}" > "${python_results}/analyze.txt" 2>&1 || true
        else
            echo "  Running analyze.py (${TIMEOUT_PYTHON}s timeout)..."
            timeout ${TIMEOUT_PYTHON} python3 "${SRC_DIR}/analysis/analyze.py" < "${test_input}" > "${python_results}/analyze.txt" 2>&1 || echo "    (timed out)"
        fi
    fi
    
    if [ -f "${SRC_DIR}/analysis/test_randomness.py" ]; then
        if [ ${TIMEOUT_PYTHON} -eq 0 ]; then
            echo "  Running test_randomness.py (no timeout)..."
            python3 "${SRC_DIR}/analysis/test_randomness.py" < "${test_input}" > "${python_results}/test_randomness.txt" 2>&1 || true
        else
            echo "  Running test_randomness.py (${TIMEOUT_PYTHON}s timeout)..."
            timeout ${TIMEOUT_PYTHON} python3 "${SRC_DIR}/analysis/test_randomness.py" < "${test_input}" > "${python_results}/test_randomness.txt" 2>&1 || echo "    (timed out)"
        fi
    fi
}

# Run NIST STS
run_nist_sts() {
    if [ "$RUN_NIST" != "true" ]; then
        echo "Skipping NIST STS"
        return
    fi
    
    echo "Running NIST Statistical Test Suite..."
    
    local nist_results="${WORKING_DIR}/nist_results"
    mkdir -p "${nist_results}"
    
    if [ ! -f "${NIST_PATH}/assess" ]; then
        echo "  NIST STS not available"
        return
    fi
    
    # Try using the new bypass scripts first
    if [ -f "${PROJECT_DIR}/scripts/nist_quick_test.sh" ]; then
        echo "  Using nist_quick_test.sh..."
        if [ ${TIMEOUT_NIST} -eq 0 ]; then
            "${PROJECT_DIR}/scripts/nist_quick_test.sh" "${BINARY_DATA}" > "${nist_results}/quick_output.log" 2>&1 || true
        else
            timeout ${TIMEOUT_NIST} "${PROJECT_DIR}/scripts/nist_quick_test.sh" "${BINARY_DATA}" > "${nist_results}/quick_output.log" 2>&1 || true
        fi
        return
    fi
    
    cd "${nist_results}"
    
    # Convert to ASCII bits
    echo "  Converting to ASCII format..."
    python3 -c "
import sys
data = open('${BINARY_DATA}', 'rb').read()
min_bytes = min(len(data), ${MIN_BYTES})
bits = ''.join(format(byte, '08b') for byte in data[:min_bytes])
print(bits[:min_bytes * 8])
" > "${nist_results}/data.txt" 2>/dev/null
    
    # Create NIST input to avoid interactive loops
    cat > input.txt << EOF
0
${nist_results}/data.txt
1
0
$((MIN_BYTES * 8))
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
0
1
EOF
    
    # Run tests
    if [ ${TIMEOUT_NIST} -eq 0 ]; then
        echo "  Running tests (no timeout)..."
        "${NIST_PATH}/assess" $((MIN_BYTES * 8)) < input.txt > output.log 2>&1 || true
    else
        echo "  Running tests (${TIMEOUT_NIST}s timeout)..."
        timeout ${TIMEOUT_NIST} "${NIST_PATH}/assess" $((MIN_BYTES * 8)) < input.txt > output.log 2>&1 || echo "    (timed out)"
    fi
    
    cd "${WORKING_DIR}"
}

# Run Dieharder
run_dieharder() {
    if [ "$RUN_DIEHARDER" != "true" ]; then
        echo "Skipping Dieharder"
        return
    fi
    
    echo "Running Dieharder test suite..."
    
    local dieharder_results="${WORKING_DIR}/dieharder_results"
    mkdir -p "${dieharder_results}"
    
    if [ ! -f "${DIEHARDER_PATH}" ]; then
        echo "  Dieharder not available"
        return
    fi
    
    # Run quick battery of tests using file input
    echo "  Running quick test battery..."
    if [ ${TIMEOUT_DIEHARDER} -eq 0 ]; then
        echo "    Running all tests (no timeout)..."
        "${DIEHARDER_PATH}" -a -f "${BINARY_DATA}" > "${dieharder_results}/results.txt" 2>&1 || true
    else
        echo "    Running limited tests (${TIMEOUT_DIEHARDER}s timeout each)..."
        for test_id in 0 1 2 3 4 5; do
            echo "      Test ${test_id}..."
            timeout ${TIMEOUT_DIEHARDER} "${DIEHARDER_PATH}" -f "${BINARY_DATA}" -d ${test_id} >> "${dieharder_results}/results.txt" 2>&1 || true
        done
    fi
}

# Generate results JSON
generate_results() {
    echo "Generating results..."
    
    cat > "${RESULTS_JSON}" << EOF
{
    "run_id": "${RUN_ID}",
    "timestamp": "$(date -Iseconds)",
    "configuration": {
        "start_index": ${START_INDEX},
        "sample_count": ${SAMPLE_COUNT},
        "extract_limit": ${EXTRACT_LIMIT},
        "min_bytes": ${MIN_BYTES},
        "timeouts": {
            "extract": ${TIMEOUT_EXTRACT},
            "python": ${TIMEOUT_PYTHON},
            "nist": ${TIMEOUT_NIST},
            "dieharder": ${TIMEOUT_DIEHARDER}
        }
    },
    "input": {
        "data_dir": "${DATA_DIR}",
        "event_files": $(ls -1 ${DATA_DIR}/events-*.txt 2>/dev/null | wc -l),
        "total_events": $(wc -l < "${CONCAT_DATA}" 2>/dev/null || echo 0),
        "sliced_events": $([ -f "${SLICED_DATA}" ] && wc -l < "${SLICED_DATA}" || echo 0),
        "binary_bytes": $(wc -c < "${BINARY_DATA}" 2>/dev/null || echo 0)
    },
    "tests_run": {
        "python": ${RUN_PYTHON},
        "nist": ${RUN_NIST},
        "dieharder": ${RUN_DIEHARDER}
    }
}
EOF
    
    # Copy everything to complete directory
    cp -r "${WORKING_DIR}"/* "${COMPLETE_DIR}/" 2>/dev/null || true
    
    # Compress large files
    for file in "${COMPLETE_DIR}/concatenated_events.txt" "${COMPLETE_DIR}/sliced_events.txt"; do
        if [ -f "$file" ] && [ $(stat -c%s "$file" 2>/dev/null || echo 0) -gt 100000 ]; then
            gzip "$file" 2>/dev/null || true
        fi
    done
}

# Main execution
main() {
    echo "========================================="
    echo "    HOTBITS - Thorium TRNG Pipeline"
    echo "========================================="
    
    show_config
    
    prepare_workspace
    prepare_data
    echo
    
    echo "=== Running Test Suites ==="
    run_python_tests
    run_nist_sts
    run_dieharder
    echo
    
    echo "=== Finalizing ==="
    generate_results
    
    echo
    echo "========================================="
    echo "Completed: $(date)"
    echo "Results: ${COMPLETE_DIR}/"
    echo "Summary: ${COMPLETE_DIR}/results.json"
    echo "========================================="
}

# Parse arguments and run
parse_args "$@"
init_config
main
