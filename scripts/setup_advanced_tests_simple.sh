#!/bin/bash
# Simplified setup script for advanced randomness testing suites
# Focuses on the most reliable and useful tools

echo "========================================"
echo "Advanced Test Suites Setup (Simplified)"
echo "========================================"
echo ""

REPOS_DIR="repos"
mkdir -p $REPOS_DIR

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check command existence
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. ENT - Simple and reliable entropy tests
setup_ent() {
    echo -e "${BLUE}Setting up ENT (Entropy Tests)...${NC}"
    echo "----------------------------------------"
    
    # Check if already installed via package manager
    if command_exists ent; then
        echo -e "${GREEN}✓ ENT already installed via package manager${NC}"
        return 0
    fi
    
    # Try to install via package manager first
    echo "Attempting to install ENT via package manager..."
    if [ -f /etc/debian_version ]; then
        sudo apt-get install -y ent 2>/dev/null
    elif [ -f /etc/redhat-release ]; then
        sudo yum install -y ent 2>/dev/null || sudo dnf install -y ent 2>/dev/null
    fi
    
    if command_exists ent; then
        echo -e "${GREEN}✓ ENT installed successfully${NC}"
    else
        echo -e "${YELLOW}⚠ ENT not available via package manager${NC}"
        echo "You can build it manually from: https://www.fourmilab.ch/random/"
    fi
    echo ""
}

# 2. RNGTest - Simple FIPS 140-2 tests
setup_rngtest() {
    echo -e "${BLUE}Setting up rng-tools (includes rngtest)...${NC}"
    echo "----------------------------------------"
    
    if command_exists rngtest; then
        echo -e "${GREEN}✓ rngtest already installed${NC}"
        return 0
    fi
    
    echo "Installing rng-tools..."
    if [ -f /etc/debian_version ]; then
        sudo apt-get install -y rng-tools 2>/dev/null
    elif [ -f /etc/redhat-release ]; then
        sudo yum install -y rng-tools 2>/dev/null || sudo dnf install -y rng-tools 2>/dev/null
    elif [ -f /etc/arch-release ]; then
        sudo pacman -S --noconfirm rng-tools 2>/dev/null
    fi
    
    if command_exists rngtest; then
        echo -e "${GREEN}✓ rngtest installed successfully${NC}"
    else
        echo -e "${YELLOW}⚠ rngtest not available${NC}"
    fi
    echo ""
}

# 3. Create wrapper scripts for easy testing
create_wrappers() {
    echo -e "${BLUE}Creating test wrapper scripts...${NC}"
    echo "----------------------------------------"
    
    # Create a simple test runner
    cat > scripts/run_all_tests.sh << 'EOF'
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
EOF
    chmod +x scripts/run_all_tests.sh
    
    echo -e "${GREEN}✓ Created scripts/run_all_tests.sh${NC}"
    echo ""
}

# 4. Download test data corpus for validation
setup_test_data() {
    echo -e "${BLUE}Setting up test data...${NC}"
    echo "----------------------------------------"
    
    TEST_DATA_DIR="test_data"
    mkdir -p $TEST_DATA_DIR
    
    # Create known good/bad test files
    echo "Creating test files..."
    
    # Good random data (from /dev/urandom)
    if [ ! -f "$TEST_DATA_DIR/good_random.bin" ]; then
        dd if=/dev/urandom of="$TEST_DATA_DIR/good_random.bin" bs=1024 count=100 2>/dev/null
        echo -e "${GREEN}✓ Created good_random.bin (100KB)${NC}"
    fi
    
    # Bad data - all zeros
    if [ ! -f "$TEST_DATA_DIR/bad_zeros.bin" ]; then
        dd if=/dev/zero of="$TEST_DATA_DIR/bad_zeros.bin" bs=1024 count=100 2>/dev/null
        echo -e "${GREEN}✓ Created bad_zeros.bin (100KB)${NC}"
    fi
    
    # Bad data - repeating pattern
    if [ ! -f "$TEST_DATA_DIR/bad_pattern.bin" ]; then
        python3 -c "import sys; sys.stdout.buffer.write(b'ABCD' * 25600)" > "$TEST_DATA_DIR/bad_pattern.bin"
        echo -e "${GREEN}✓ Created bad_pattern.bin (100KB)${NC}"
    fi
    
    echo ""
}

# Main setup function
main() {
    echo "This simplified script sets up the most reliable test tools:"
    echo "  1. ENT - Fast entropy calculations"
    echo "  2. rngtest - FIPS 140-2 compliance tests"
    echo "  3. Test wrapper scripts"
    echo "  4. Test data for validation"
    echo ""
    
    # Run setup functions
    setup_ent
    setup_rngtest
    create_wrappers
    setup_test_data
    
    echo "========================================"
    echo "Setup Summary"
    echo "========================================"
    
    # Check what's available
    echo -n "ENT: "
    if command_exists ent; then
        echo -e "${GREEN}✓ Ready${NC}"
    else
        echo -e "${RED}✗ Not available${NC}"
    fi
    
    echo -n "rngtest: "
    if command_exists rngtest; then
        echo -e "${GREEN}✓ Ready${NC}"
    else
        echo -e "${RED}✗ Not available${NC}"
    fi
    
    echo -n "Dieharder: "
    if command_exists dieharder; then
        echo -e "${GREEN}✓ Ready${NC}"
    else
        echo -e "${YELLOW}○ Not installed (run 'make install-dieharder')${NC}"
    fi
    
    echo -n "NIST STS: "
    if [ -f "repos/sts-2.1.2/sts-2.1.2/assess" ]; then
        echo -e "${GREEN}✓ Ready${NC}"
    else
        echo -e "${YELLOW}○ Not built (run 'make nist-sts')${NC}"
    fi
    
    echo ""
    echo "Quick test command: ./scripts/run_all_tests.sh <your_file>"
    echo ""
}

# Run main function
main