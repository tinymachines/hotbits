#!/bin/bash
# Setup script for randomness testing tools

echo "========================================"
echo "Setting up randomness testing tools"
echo "========================================"
echo ""

# Check if running with sufficient permissions
if [ "$EUID" -eq 0 ]; then 
   echo "Please do not run this script as root for security reasons."
   echo "The script will use sudo when needed."
   exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Setup NIST STS
setup_nist_sts() {
    echo "Setting up NIST Statistical Test Suite..."
    echo "----------------------------------------"
    
    if [ -f "repos/sts-2.1.2/sts-2.1.2/assess" ]; then
        echo "✓ NIST STS already built"
    else
        echo "Building NIST STS..."
        cd repos/sts-2.1.2/sts-2.1.2
        make clean 2>/dev/null
        make
        if [ -f "assess" ]; then
            echo "✓ NIST STS built successfully"
        else
            echo "✗ Failed to build NIST STS"
        fi
        cd ../../..
    fi
    echo ""
}

# Setup Dieharder
setup_dieharder() {
    echo "Setting up Dieharder..."
    echo "----------------------------------------"
    
    if command_exists dieharder; then
        echo "✓ Dieharder already installed"
        dieharder --version | head -1
    else
        echo "Dieharder not found. Installing from package manager..."
        
        # Detect OS and install accordingly
        if [ -f /etc/debian_version ]; then
            # Debian/Ubuntu
            echo "Detected Debian/Ubuntu system"
            echo "Installing dieharder via apt..."
            sudo apt-get update
            sudo apt-get install -y dieharder
        elif [ -f /etc/redhat-release ]; then
            # RHEL/CentOS/Fedora
            echo "Detected Red Hat-based system"
            echo "Installing dieharder via yum/dnf..."
            if command_exists dnf; then
                sudo dnf install -y dieharder
            else
                sudo yum install -y epel-release
                sudo yum install -y dieharder
            fi
        elif [ -f /etc/arch-release ]; then
            # Arch Linux
            echo "Detected Arch Linux"
            echo "Installing dieharder via pacman..."
            sudo pacman -S --noconfirm dieharder
        elif [ "$(uname)" = "Darwin" ]; then
            # macOS
            echo "Detected macOS"
            if command_exists brew; then
                echo "Installing dieharder via Homebrew..."
                brew install dieharder
            else
                echo "Homebrew not found. Please install Homebrew first:"
                echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            fi
        else
            echo "Unable to detect OS or package manager"
            echo "Please install dieharder manually:"
            echo "  - Debian/Ubuntu: sudo apt-get install dieharder"
            echo "  - RHEL/CentOS: sudo yum install dieharder"
            echo "  - Arch: sudo pacman -S dieharder"
            echo "  - macOS: brew install dieharder"
        fi
        
        # Check if installation was successful
        if command_exists dieharder; then
            echo "✓ Dieharder installed successfully"
            dieharder --version | head -1
        else
            echo "✗ Failed to install dieharder"
            echo ""
            echo "Alternative: Building from source"
            echo "You can manually build dieharder from:"
            echo "  https://github.com/eddelbuettel/dieharder"
        fi
    fi
    echo ""
}

# Setup TestU01 (optional, advanced testing)
setup_testu01() {
    echo "TestU01 Information"
    echo "----------------------------------------"
    echo "TestU01 is an advanced statistical test suite from University of Montreal."
    echo "It provides even more comprehensive testing than NIST STS."
    echo ""
    echo "To install TestU01:"
    echo "  1. Download from: http://simul.iro.umontreal.ca/testu01/tu01.html"
    echo "  2. Extract and build:"
    echo "     tar -xzf TestU01.tar.gz"
    echo "     cd TestU01-1.2.3"
    echo "     ./configure --prefix=/usr/local"
    echo "     make"
    echo "     sudo make install"
    echo ""
}

# Main execution
main() {
    echo "This script will set up randomness testing tools for the Hotbits TRNG"
    echo ""
    
    # Create repos directory if it doesn't exist
    mkdir -p repos
    
    # Setup each tool
    setup_nist_sts
    setup_dieharder
    setup_testu01
    
    echo "========================================"
    echo "Setup Summary"
    echo "========================================"
    
    # Check status
    echo -n "NIST STS: "
    if [ -f "repos/sts-2.1.2/sts-2.1.2/assess" ]; then
        echo "✓ Ready"
    else
        echo "✗ Not available"
    fi
    
    echo -n "Dieharder: "
    if command_exists dieharder; then
        echo "✓ Ready"
    else
        echo "✗ Not available"
    fi
    
    echo ""
    echo "You can now run the full test suite with:"
    echo "  ./run_full_test_simple.sh"
    echo ""
}

# Run main function
main