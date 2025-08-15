#!/bin/bash
# Setup script for advanced randomness testing suites

echo "========================================"
echo "Advanced Test Suites Setup"
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

# 1. TestU01 from University of Montreal
setup_testu01() {
    echo -e "${BLUE}Setting up TestU01...${NC}"
    echo "----------------------------------------"
    
    TESTU01_DIR="$REPOS_DIR/TestU01"
    TESTU01_URL="http://simul.iro.umontreal.ca/testu01/TestU01.zip"
    TESTU01_ALT_URL="https://github.com/umontreal-simul/TestU01-2009/archive/master.zip"
    
    if [ -f "$TESTU01_DIR/lib/libtestu01.a" ]; then
        echo -e "${GREEN}✓ TestU01 already built${NC}"
        return 0
    fi
    
    # Try to download TestU01
    if [ ! -f "$REPOS_DIR/TestU01.zip" ]; then
        echo "Downloading TestU01..."
        
        # Try GitHub mirror first (more reliable)
        if command_exists wget; then
            wget --no-check-certificate -q -O "$REPOS_DIR/TestU01.zip" "$TESTU01_ALT_URL" 2>/dev/null
        elif command_exists curl; then
            curl -sL -o "$REPOS_DIR/TestU01.zip" "$TESTU01_ALT_URL" 2>/dev/null
        fi
        
        # If GitHub fails, try official source
        if [ ! -f "$REPOS_DIR/TestU01.zip" ] || [ $(wc -c < "$REPOS_DIR/TestU01.zip" 2>/dev/null || echo 0) -lt 1000 ]; then
            echo "GitHub mirror failed, trying official source..."
            rm -f "$REPOS_DIR/TestU01.zip"
            
            if command_exists wget; then
                wget --no-check-certificate -q -O "$REPOS_DIR/TestU01.zip" "$TESTU01_URL" 2>/dev/null
            elif command_exists curl; then
                curl -sL -o "$REPOS_DIR/TestU01.zip" "$TESTU01_URL" 2>/dev/null
            fi
        fi
    fi
    
    # Extract and build
    if [ -f "$REPOS_DIR/TestU01.zip" ]; then
        echo "Extracting TestU01..."
        cd "$REPOS_DIR"
        unzip -q -o TestU01.zip
        
        # Find the extracted directory
        if [ -d "TestU01-2009-master" ]; then
            mv TestU01-2009-master TestU01
        elif [ ! -d "TestU01" ]; then
            # Handle different archive structures
            EXTRACTED=$(find . -maxdepth 1 -type d -name "*TestU01*" | head -1)
            if [ -n "$EXTRACTED" ]; then
                mv "$EXTRACTED" TestU01
            fi
        fi
        
        if [ -d "TestU01" ]; then
            cd TestU01
            echo "Building TestU01..."
            
            # Configure and build
            if [ -f "configure" ]; then
                ./configure --prefix=$(pwd)/install >/dev/null 2>&1
                make -j$(nproc) >/dev/null 2>&1
                make install >/dev/null 2>&1
                
                if [ -f "install/lib/libtestu01.a" ] || [ -f "lib/libtestu01.a" ]; then
                    echo -e "${GREEN}✓ TestU01 built successfully${NC}"
                else
                    echo -e "${YELLOW}⚠ TestU01 build completed with warnings${NC}"
                fi
            else
                echo -e "${YELLOW}⚠ TestU01 source structure not recognized${NC}"
                echo "Manual installation required from: http://simul.iro.umontreal.ca/testu01/tu01.html"
            fi
            cd ../../
        else
            echo -e "${RED}✗ Failed to extract TestU01${NC}"
        fi
    else
        echo -e "${RED}✗ Failed to download TestU01${NC}"
        echo "You can manually download from: http://simul.iro.umontreal.ca/testu01/tu01.html"
    fi
    echo ""
}

# 2. Improved NIST STS from GitHub
setup_improved_nist() {
    echo -e "${BLUE}Setting up improved NIST STS...${NC}"
    echo "----------------------------------------"
    
    # There are several improved versions, let's use the most popular one
    IMPROVED_NIST_DIR="$REPOS_DIR/sts-improved"
    
    if [ -d "$IMPROVED_NIST_DIR/.git" ]; then
        echo "Updating improved NIST STS..."
        cd "$IMPROVED_NIST_DIR"
        git pull --quiet
        cd ../../
    else
        echo "Cloning improved NIST STS from GitHub..."
        # This is a maintained fork with improvements
        git clone --quiet https://github.com/terrillmoore/NIST-Statistical-Test-Suite.git "$IMPROVED_NIST_DIR" 2>/dev/null
        
        if [ ! -d "$IMPROVED_NIST_DIR" ]; then
            # Try alternative repository
            git clone --quiet https://github.com/kravietz/nist-sts.git "$IMPROVED_NIST_DIR" 2>/dev/null
        fi
    fi
    
    if [ -d "$IMPROVED_NIST_DIR" ]; then
        cd "$IMPROVED_NIST_DIR"
        
        # Build if makefile exists
        if [ -f "Makefile" ] || [ -f "makefile" ]; then
            echo "Building improved NIST STS..."
            make clean >/dev/null 2>&1
            make >/dev/null 2>&1
            
            if [ -f "assess" ] || [ -f "sts" ]; then
                echo -e "${GREEN}✓ Improved NIST STS built successfully${NC}"
            else
                echo -e "${YELLOW}⚠ Build completed with warnings${NC}"
            fi
        else
            echo -e "${YELLOW}⚠ No makefile found, checking for pre-built binaries${NC}"
        fi
        cd ../../
    else
        echo -e "${RED}✗ Failed to clone improved NIST STS${NC}"
    fi
    echo ""
}

# 3. PractRand - Another excellent test suite
setup_practrand() {
    echo -e "${BLUE}Setting up PractRand...${NC}"
    echo "----------------------------------------"
    
    PRACTRAND_DIR="$REPOS_DIR/PractRand"
    
    if [ -f "$PRACTRAND_DIR/bin/RNG_test" ] || [ -f "$PRACTRAND_DIR/RNG_test" ]; then
        echo -e "${GREEN}✓ PractRand already built${NC}"
        return 0
    fi
    
    if [ ! -d "$PRACTRAND_DIR" ]; then
        echo "Downloading PractRand..."
        
        # Try GitHub mirror first (more reliable)
        git clone --quiet --depth 1 https://github.com/planet36/PractRand.git "$PRACTRAND_DIR" 2>/dev/null
        
        # If GitHub fails, try sourceforge
        if [ ! -d "$PRACTRAND_DIR" ]; then
            echo "Trying SourceForge download..."
            if command_exists wget; then
                wget --no-check-certificate -O "$REPOS_DIR/PractRand0.95.zip" \
                    "https://downloads.sourceforge.net/project/pracrand/PractRand-0.95.zip" 2>/dev/null
            elif command_exists curl; then
                curl -L -o "$REPOS_DIR/PractRand0.95.zip" \
                    "https://downloads.sourceforge.net/project/pracrand/PractRand-0.95.zip" 2>/dev/null
            fi
            
            if [ -f "$REPOS_DIR/PractRand0.95.zip" ]; then
                cd "$REPOS_DIR"
                unzip -q -o PractRand0.95.zip 2>/dev/null || echo "Unzip failed"
                if [ -d "PractRand-0.95" ]; then
                    mv PractRand-0.95 PractRand
                fi
                cd ..
            fi
        fi
    fi
    
    if [ -d "$PRACTRAND_DIR" ]; then
        cd "$PRACTRAND_DIR"
        echo "Building PractRand..."
        
        # PractRand uses g++ and has specific build requirements
        if [ -f "Makefile" ]; then
            make clean >/dev/null 2>&1
            make >/dev/null 2>&1
        else
            # Manual compilation if no makefile
            g++ -O3 -march=native -o bin/RNG_test src/*.cpp src/RNGs/*.cpp src/RNGs/other/*.cpp 2>/dev/null
        fi
        
        if [ -f "bin/RNG_test" ] || [ -f "RNG_test" ]; then
            echo -e "${GREEN}✓ PractRand built successfully${NC}"
        else
            echo -e "${YELLOW}⚠ PractRand build incomplete${NC}"
        fi
        cd ../../
    else
        echo -e "${RED}✗ Failed to setup PractRand${NC}"
    fi
    echo ""
}

# 4. ENT - Simple entropy tests
setup_ent() {
    echo -e "${BLUE}Setting up ENT (Entropy Tests)...${NC}"
    echo "----------------------------------------"
    
    ENT_DIR="$REPOS_DIR/ent"
    
    if [ -f "$ENT_DIR/ent" ] || command_exists ent; then
        echo -e "${GREEN}✓ ENT already available${NC}"
        return 0
    fi
    
    # First check if it's available via package manager
    if ! command_exists ent; then
        if [ ! -d "$ENT_DIR" ]; then
            echo "Downloading ENT..."
            
            # Download from fourmilab (original source)
            mkdir -p "$ENT_DIR"
            cd "$ENT_DIR"
            
            if command_exists wget; then
                wget --no-check-certificate -q "https://www.fourmilab.ch/random/random.zip" 2>/dev/null
            elif command_exists curl; then
                curl -sL -o random.zip "https://www.fourmilab.ch/random/random.zip" 2>/dev/null
            fi
            
            if [ -f "random.zip" ]; then
                unzip -q random.zip 2>/dev/null
                rm -f random.zip
            else
                # Try GitHub mirror (doesn't require auth)
                cd ..
                git clone --quiet --depth 1 https://github.com/psemiletov/ent.git "$ENT_DIR" 2>/dev/null || true
            fi
            
            cd ../../
        fi
    fi
    
    if [ -d "$ENT_DIR" ]; then
        cd "$ENT_DIR"
        echo "Building ENT..."
        
        if [ -f "Makefile" ]; then
            make clean >/dev/null 2>&1
            make >/dev/null 2>&1
        else
            # Direct compilation
            gcc -O3 -o ent ent.c randtest.c 2>/dev/null
        fi
        
        if [ -f "ent" ]; then
            echo -e "${GREEN}✓ ENT built successfully${NC}"
        else
            echo -e "${YELLOW}⚠ ENT not built, may be available via package manager${NC}"
            echo "  Try: sudo apt-get install ent"
        fi
        cd ../../
    fi
    echo ""
}

# Main setup function
main() {
    echo "This script sets up advanced randomness testing suites:"
    echo "  1. TestU01 - Comprehensive test battery from U. of Montreal"
    echo "  2. Improved NIST STS - Enhanced versions from GitHub"
    echo "  3. PractRand - Modern, powerful test suite"
    echo "  4. ENT - Fast entropy calculations"
    echo ""
    
    # Create repos directory
    mkdir -p "$REPOS_DIR"
    
    # Run setup functions
    setup_testu01
    setup_improved_nist
    setup_practrand
    setup_ent
    
    echo "========================================"
    echo "Setup Summary"
    echo "========================================"
    
    # Check what's available
    echo -n "TestU01: "
    if [ -f "$REPOS_DIR/TestU01/lib/libtestu01.a" ] || [ -f "$REPOS_DIR/TestU01/install/lib/libtestu01.a" ]; then
        echo -e "${GREEN}✓ Ready${NC}"
    else
        echo -e "${RED}✗ Not available${NC}"
    fi
    
    echo -n "Improved NIST: "
    if [ -f "$REPOS_DIR/sts-improved/assess" ] || [ -f "$REPOS_DIR/sts-improved/sts" ]; then
        echo -e "${GREEN}✓ Ready${NC}"
    else
        echo -e "${RED}✗ Not available${NC}"
    fi
    
    echo -n "PractRand: "
    if [ -f "$REPOS_DIR/PractRand/bin/RNG_test" ] || [ -f "$REPOS_DIR/PractRand/RNG_test" ]; then
        echo -e "${GREEN}✓ Ready${NC}"
    else
        echo -e "${RED}✗ Not available${NC}"
    fi
    
    echo -n "ENT: "
    if [ -f "$REPOS_DIR/ent/ent" ] || command_exists ent; then
        echo -e "${GREEN}✓ Ready${NC}"
    else
        echo -e "${RED}✗ Not available${NC}"
    fi
    
    echo ""
    echo "Advanced test suites setup complete!"
}

# Run main function
main