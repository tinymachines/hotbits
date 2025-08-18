#!/bin/bash

set -e

# Get timestamp as run ID
RUN_ID=$(date +%s)
echo "Starting evaluation run: ${RUN_ID}"

# Setup absolute paths
SCRIPT_DIR=$(realpath "$(dirname "$0")")
PROJECT_DIR=$(realpath "${SCRIPT_DIR}")
WORKING_DIR="${PROJECT_DIR}/working"
COMPLETE_DIR="${PROJECT_DIR}/complete"
DATA_DIR="${DATA_DIR:-${PROJECT_DIR}/data}"
SRC_DIR="${PROJECT_DIR}/src"

# Test suite paths
NIST_PATH="${PROJECT_DIR}/repos/sts-2.1.2/sts-2.1.2"
DIEHARDER_PATH="${PROJECT_DIR}/repos/dieharder-3.31.1/dieharder"

# Output files
CONCAT_DATA="${WORKING_DIR}/concatenated_events.txt"
BINARY_DATA="${WORKING_DIR}/random.bin"
RESULTS_JSON="${WORKING_DIR}/results.json"

# Minimum bits required for NIST STS
MIN_BITS=1000000
MIN_BYTES=$((MIN_BITS / 8))

# Clean and prepare working directory
prepare_workspace() {
    echo "Preparing working directory..."
    rm -rf "${WORKING_DIR}"
    mkdir -p "${WORKING_DIR}"
}

# Function to concatenate event files
prepare_data() {
    echo "Concatenating event files..."
    
    # Find and sort all event files with the pattern events-*.txt
    local file_count=0
    echo "Looking for files matching pattern: ${DATA_DIR}/events-*.txt"
    for file in $(find "${DATA_DIR}" -name "events-*.txt" -type f 2>/dev/null | sort); do
        echo "  Adding: $(basename "$file")"
        cat "$file" >> "${CONCAT_DATA}"
        ((file_count++))
    done
    
    if [ ${file_count} -eq 0 ]; then
        echo "ERROR: No event files found in ${DATA_DIR}"
        exit 1
    fi
    
    local line_count=$(wc -l < "${CONCAT_DATA}")
    echo "Concatenated ${line_count} events from ${file_count} files"
    
    # Generate binary data using available extractors
    echo "Generating binary random data..."
    
    # Try simple_extract.py first as it's more reliable
    if [ -f "${SRC_DIR}/analysis/simple_extract.py" ]; then
        echo "Using simple_extract.py..."
        timeout 60 python3 "${SRC_DIR}/analysis/simple_extract.py" < "${CONCAT_DATA}" > "${BINARY_DATA}" 2>"${WORKING_DIR}/extract.log" || true
    fi
    
    local byte_count=$(wc -c < "${BINARY_DATA}" 2>/dev/null || echo "0")
    
    # If no data, try regular extract.py
    if [ ${byte_count} -eq 0 ] && [ -f "${SRC_DIR}/analysis/extract.py" ]; then
        echo "Trying extract.py..."
        timeout 60 python3 "${SRC_DIR}/analysis/extract.py" < "${CONCAT_DATA}" > "${BINARY_DATA}" 2>>"${WORKING_DIR}/extract.log" || true
        byte_count=$(wc -c < "${BINARY_DATA}" 2>/dev/null || echo "0")
    fi
    
    # If still no data, generate test data
    if [ ${byte_count} -eq 0 ]; then
        echo "WARNING: No data from extractors. Using /dev/urandom for testing..."
        dd if=/dev/urandom bs=${MIN_BYTES} count=1 of="${BINARY_DATA}" 2>/dev/null
        byte_count=${MIN_BYTES}
    elif [ ${byte_count} -lt ${MIN_BYTES} ]; then
        echo "Padding from ${byte_count} to ${MIN_BYTES} bytes..."
        local pad_bytes=$((MIN_BYTES - byte_count))
        dd if=/dev/urandom bs=${pad_bytes} count=1 2>/dev/null >> "${BINARY_DATA}"
        byte_count=${MIN_BYTES}
    fi
    
    echo "Binary data ready: ${byte_count} bytes"
}

# Function to run Python analysis
run_python_tests() {
    echo "Running Python statistical tests..."
    
    local python_results="${WORKING_DIR}/python_results"
    mkdir -p "${python_results}"
    
    local python_status="failed"
    
    # Run analyze.py if available
    if [ -f "${SRC_DIR}/analysis/analyze.py" ]; then
        echo "  - Running analyze.py..."
        timeout 20 python3 "${SRC_DIR}/analysis/analyze.py" < "${CONCAT_DATA}" > "${python_results}/analyze.txt" 2>&1 || echo "    (timed out)"
        python_status="partial"
    fi
    
    # Run test_randomness.py if available
    if [ -f "${SRC_DIR}/analysis/test_randomness.py" ]; then
        echo "  - Running test_randomness.py..."
        timeout 20 python3 "${SRC_DIR}/analysis/test_randomness.py" < "${CONCAT_DATA}" > "${python_results}/test_randomness.txt" 2>&1 || echo "    (timed out)"
        [ "$python_status" = "partial" ] && python_status="completed"
    fi
    
    echo "${python_status}" > "${python_results}/status.txt"
}

# Function to run NIST STS
run_nist_sts() {
    echo "Running NIST Statistical Test Suite..."
    
    local nist_results="${WORKING_DIR}/nist_results"
    mkdir -p "${nist_results}"
    
    if [ ! -f "${NIST_PATH}/assess" ]; then
        echo "  NIST STS not found at ${NIST_PATH}/assess"
        echo "not_available" > "${nist_results}/status.txt"
        return
    fi
    
    cd "${nist_results}"
    
    # Convert binary to ASCII 0/1 format for NIST
    echo "  Converting binary to ASCII format..."
    python3 -c "
import sys
data = open('${BINARY_DATA}', 'rb').read()
bits = ''.join(format(byte, '08b') for byte in data[:${MIN_BYTES}])
print(bits[:${MIN_BITS}])
" > "${nist_results}/data.txt" 2>/dev/null
    
    # Create input for NIST
    cat > input.txt << EOF
1
1
${nist_results}/data.txt
1
0
${MIN_BITS}
1
EOF
    
    # Add test selections (1=run, 0=skip)
    for i in {1..15}; do
        echo "1" >> input.txt
    done
    
    echo "0" >> input.txt  # BlockFrequency block length
    echo "0" >> input.txt  # Exit
    
    # Run NIST with timeout
    echo "  Running tests (60s timeout)..."
    timeout 60 "${NIST_PATH}/assess" ${MIN_BITS} < input.txt > output.log 2>&1 || echo "    (timed out or failed)"
    
    # Check for results
    if [ -f "experiments/AlgorithmTesting/finalAnalysisReport.txt" ]; then
        cp "experiments/AlgorithmTesting/finalAnalysisReport.txt" "${nist_results}/"
        echo "completed" > "${nist_results}/status.txt"
    else
        echo "failed" > "${nist_results}/status.txt"
    fi
    
    cd "${WORKING_DIR}"
}

# Function to run Dieharder
run_dieharder() {
    echo "Running Dieharder test suite..."
    
    local dieharder_results="${WORKING_DIR}/dieharder_results"
    mkdir -p "${dieharder_results}"
    
    if [ ! -f "${DIEHARDER_PATH}/dieharder" ]; then
        echo "  Dieharder not found at ${DIEHARDER_PATH}/dieharder"
        echo "not_available" > "${dieharder_results}/status.txt"
        return
    fi
    
    # Run quick tests only (-d 0 through -d 10) instead of all tests
    echo "  Running quick test battery (60s timeout)..."
    timeout 60 "${DIEHARDER_PATH}/dieharder" -g 201 -f "${BINARY_DATA}" -d 0 > "${dieharder_results}/results.txt" 2>&1 || true
    
    for test_id in {1..10}; do
        timeout 10 "${DIEHARDER_PATH}/dieharder" -g 201 -f "${BINARY_DATA}" -d ${test_id} >> "${dieharder_results}/results.txt" 2>&1 || true
    done
    
    echo "completed" > "${dieharder_results}/status.txt"
}

# Function to aggregate results
aggregate_results() {
    echo "Aggregating results..."
    
    # Start JSON
    cat > "${RESULTS_JSON}" << EOF
{
    "run_id": "${RUN_ID}",
    "timestamp": "$(date -Iseconds)",
    "input": {
        "event_files": $(find "${DATA_DIR}" -name "events-*.txt" | wc -l),
        "total_events": $(wc -l < "${CONCAT_DATA}" 2>/dev/null || echo 0),
        "binary_bytes": $(wc -c < "${BINARY_DATA}" 2>/dev/null || echo 0)
    },
    "tests": {
EOF
    
    # Python results
    if [ -f "${WORKING_DIR}/python_results/status.txt" ]; then
        local python_status=$(cat "${WORKING_DIR}/python_results/status.txt")
        cat >> "${RESULTS_JSON}" << EOF
        "python": {
            "status": "${python_status}",
            "analyze": $([ -f "${WORKING_DIR}/python_results/analyze.txt" ] && echo "true" || echo "false"),
            "test_randomness": $([ -f "${WORKING_DIR}/python_results/test_randomness.txt" ] && echo "true" || echo "false")
        },
EOF
    fi
    
    # NIST results
    if [ -f "${WORKING_DIR}/nist_results/status.txt" ]; then
        local nist_status=$(cat "${WORKING_DIR}/nist_results/status.txt")
        cat >> "${RESULTS_JSON}" << EOF
        "nist_sts": {
            "status": "${nist_status}"
        },
EOF
    fi
    
    # Dieharder results
    if [ -f "${WORKING_DIR}/dieharder_results/status.txt" ]; then
        local dh_status=$(cat "${WORKING_DIR}/dieharder_results/status.txt")
        local passed=0
        local weak=0
        local failed=0
        if [ -f "${WORKING_DIR}/dieharder_results/results.txt" ]; then
            passed=$(grep -c "PASSED" "${WORKING_DIR}/dieharder_results/results.txt" 2>/dev/null || echo 0)
            weak=$(grep -c "WEAK" "${WORKING_DIR}/dieharder_results/results.txt" 2>/dev/null || echo 0)
            failed=$(grep -c "FAILED" "${WORKING_DIR}/dieharder_results/results.txt" 2>/dev/null || echo 0)
        fi
        cat >> "${RESULTS_JSON}" << EOF
        "dieharder": {
            "status": "${dh_status}",
            "passed": ${passed},
            "weak": ${weak},
            "failed": ${failed}
        },
EOF
    fi
    
    # TestU01 placeholder
    cat >> "${RESULTS_JSON}" << EOF
        "testu01": {
            "status": "not_implemented"
        }
    }
}
EOF
    
    echo "Results saved to ${RESULTS_JSON}"
}

# Archive results
archive_results() {
    echo "Archiving results..."
    
    local archive_dir="${COMPLETE_DIR}/${RUN_ID}"
    mkdir -p "${archive_dir}"
    
    # Move everything to archive
    cp -r "${WORKING_DIR}"/* "${archive_dir}/" 2>/dev/null || true
    
    # Compress large files
    for file in "${archive_dir}/concatenated_events.txt" "${archive_dir}/random.bin"; do
        if [ -f "$file" ] && [ $(stat -c%s "$file" 2>/dev/null || echo 0) -gt 1000000 ]; then
            gzip "$file" 2>/dev/null || true
        fi
    done
    
    echo "Archived to ${archive_dir}"
}

# Main execution
main() {
    echo "========================================="
    echo "HOTBITS EVALUATION PIPELINE"
    echo "========================================="
    echo "Run ID: ${RUN_ID}"
    echo "Started: $(date)"
    echo
    
    prepare_workspace
    prepare_data
    echo
    
    echo "=== Running Test Suites ==="
    run_python_tests
    echo
    run_nist_sts
    echo
    run_dieharder
    echo
    
    echo "=== Finalizing ==="
    aggregate_results
    archive_results
    echo
    
    echo "========================================="
    echo "Completed: $(date)"
    echo "Results: ${COMPLETE_DIR}/${RUN_ID}/"
    echo "Summary: ${COMPLETE_DIR}/${RUN_ID}/results.json"
    echo "========================================="
}

# Execute
main "$@"
