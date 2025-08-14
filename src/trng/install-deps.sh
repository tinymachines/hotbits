#!/bin/bash

# Dependency installer for TRNG on Raspberry Pi (Bookworm/Kali)
# Supports AARCH64 architecture

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}This script must be run as root (use sudo)${NC}"
        exit 1
    fi
}

# Detect distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
        echo -e "${GREEN}Detected: $PRETTY_NAME${NC}"
    else
        echo -e "${RED}Cannot detect distribution${NC}"
        exit 1
    fi
}

# Check architecture
check_arch() {
    ARCH=$(uname -m)
    if [[ "$ARCH" != "aarch64" && "$ARCH" != "armv7l" ]]; then
        echo -e "${YELLOW}Warning: This script is optimized for ARM architecture${NC}"
        echo -e "${YELLOW}Current architecture: $ARCH${NC}"
        read -p "Continue anyway? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        echo -e "${GREEN}Architecture: $ARCH${NC}"
    fi
}

# Update package lists
update_packages() {
    echo -e "${GREEN}Updating package lists...${NC}"
    apt-get update || {
        echo -e "${RED}Failed to update package lists${NC}"
        exit 1
    }
}

# Install build essentials
install_build_tools() {
    echo -e "${GREEN}Installing build tools...${NC}"
    apt-get install -y \
        build-essential \
        gcc \
        make \
        git \
        pkg-config || {
        echo -e "${RED}Failed to install build tools${NC}"
        exit 1
    }
}

# Install GPIO libraries
install_gpio_libs() {
    echo -e "${GREEN}Installing GPIO libraries...${NC}"
    apt-get install -y \
        libgpiod-dev \
        libgpiod2 \
        gpiod || {
        echo -e "${RED}Failed to install GPIO libraries${NC}"
        exit 1
    }
}

# Install networking tools (optional but useful)
install_network_tools() {
    echo -e "${GREEN}Installing network analysis tools...${NC}"
    apt-get install -y \
        netcat-openbsd \
        tcpdump \
        net-tools \
        iputils-ping || {
        echo -e "${YELLOW}Warning: Some network tools failed to install${NC}"
    }
}

# Setup GPIO permissions
setup_gpio_permissions() {
    echo -e "${GREEN}Setting up GPIO permissions...${NC}"
    
    # Create gpio group if it doesn't exist
    if ! getent group gpio > /dev/null 2>&1; then
        groupadd gpio
        echo -e "${GREEN}Created gpio group${NC}"
    fi
    
    # Add current user to gpio group (if not root)
    if [ -n "$SUDO_USER" ]; then
        usermod -a -G gpio $SUDO_USER
        echo -e "${GREEN}Added $SUDO_USER to gpio group${NC}"
        echo -e "${YELLOW}Note: User must log out and back in for group changes to take effect${NC}"
    fi
    
    # Create udev rule for GPIO access
    cat > /etc/udev/rules.d/99-gpio.rules <<EOF
# GPIO access for gpio group
SUBSYSTEM=="gpio", GROUP="gpio", MODE="0660"
SUBSYSTEM=="gpiochip", GROUP="gpio", MODE="0660"
EOF
    
    # Reload udev rules
    udevadm control --reload-rules
    udevadm trigger
    
    echo -e "${GREEN}GPIO permissions configured${NC}"
}

# Test GPIO access
test_gpio() {
    echo -e "${GREEN}Testing GPIO access...${NC}"
    
    if command -v gpiodetect &> /dev/null; then
        gpiodetect || {
            echo -e "${YELLOW}Warning: Could not detect GPIO chips${NC}"
            echo -e "${YELLOW}This might be normal if not running on actual hardware${NC}"
        }
    else
        echo -e "${YELLOW}gpiodetect not found, skipping test${NC}"
    fi
}

# Build the TRNG binary
build_trng() {
    echo -e "${GREEN}Building TRNG binary...${NC}"
    
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    cd "$SCRIPT_DIR"
    
    if [ -f Makefile ]; then
        make clean
        make || {
            echo -e "${RED}Failed to build TRNG${NC}"
            exit 1
        }
        echo -e "${GREEN}TRNG built successfully${NC}"
    else
        echo -e "${YELLOW}Makefile not found in current directory${NC}"
    fi
}

# Main installation
main() {
    echo -e "${GREEN}==================================${NC}"
    echo -e "${GREEN}TRNG Dependency Installer${NC}"
    echo -e "${GREEN}==================================${NC}"
    echo
    
    check_root
    detect_distro
    check_arch
    update_packages
    install_build_tools
    install_gpio_libs
    install_network_tools
    setup_gpio_permissions
    test_gpio
    build_trng
    
    echo
    echo -e "${GREEN}==================================${NC}"
    echo -e "${GREEN}Installation Complete!${NC}"
    echo -e "${GREEN}==================================${NC}"
    echo
    echo -e "${GREEN}Next steps:${NC}"
    echo -e "  1. Test the TRNG: ${YELLOW}./trng -v${NC}"
    echo -e "  2. See examples: ${YELLOW}make examples${NC}"
    echo -e "  3. Install system-wide: ${YELLOW}sudo make install${NC}"
    echo
    echo -e "${YELLOW}Note: If you were added to the gpio group, log out and back in${NC}"
}

# Run main function
main "$@"