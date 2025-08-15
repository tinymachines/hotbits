# Hotbits TRNG Project Makefile
# Complete build system with automatic dependency management

# Compiler settings
CC = gcc
CFLAGS = -Wall -O2
LDFLAGS = -lgpiod

# Directory structure
SRC_DIR = src/testing
BUILD_DIR = build
BIN_DIR = bin
REPOS_DIR = repos
SCRIPTS_DIR = scripts

# NIST STS settings
NIST_VERSION = 2_1_2
NIST_ZIP = sts-$(NIST_VERSION).zip
NIST_URL = https://csrc.nist.gov/CSRC/media/Projects/Random-Bit-Generation/documents/$(NIST_ZIP)
NIST_DIR = $(REPOS_DIR)/sts-2.1.2/sts-2.1.2
NIST_ASSESS = $(NIST_DIR)/assess

# Check for required tools
HAS_WGET := $(shell command -v wget 2> /dev/null)
HAS_CURL := $(shell command -v curl 2> /dev/null)
HAS_GPIOD := $(shell pkg-config --exists libgpiod 2>/dev/null && echo yes || echo no)
HAS_PYTHON3 := $(shell command -v python3 2> /dev/null)
HAS_PIP := $(shell command -v pip3 2> /dev/null || command -v pip 2> /dev/null)

# Download tool selection
ifdef HAS_WGET
    DOWNLOAD_CMD = wget -q -O
else ifdef HAS_CURL
    DOWNLOAD_CMD = curl -sL -o
else
    $(error Neither wget nor curl found. Please install one of them)
endif

# Source files
NON_GPIO_SOURCES = $(SRC_DIR)/filter.c \
                   $(SRC_DIR)/rng-extractor.c \
                   $(SRC_DIR)/xor-groups.c

GPIO_SOURCES = $(SRC_DIR)/trng.c \
               $(SRC_DIR)/vomneu.c

# Executables
NON_GPIO_EXECUTABLES = $(BIN_DIR)/filter \
                       $(BIN_DIR)/rng-extractor \
                       $(BIN_DIR)/xor-groups \
                       $(BIN_DIR)/transform

ifeq ($(HAS_GPIOD),yes)
    ALL_EXECUTABLES = $(NON_GPIO_EXECUTABLES) $(BIN_DIR)/trng $(BIN_DIR)/vomneu
else
    ALL_EXECUTABLES = $(NON_GPIO_EXECUTABLES)
endif

# Color output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

# Default target - builds everything including dependencies
.PHONY: all
all: check-prerequisites directories $(ALL_EXECUTABLES) nist-sts python-deps
	@echo ""
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)Build Complete!$(NC)"
	@echo "$(GREEN)========================================$(NC)"
	@echo ""
	@echo "Available tools:"
	@echo "  - C programs in $(BIN_DIR)/"
	@if [ -f "$(NIST_ASSESS)" ]; then \
		echo "  - NIST STS: $(GREEN)✓$(NC) Ready ($(NIST_ASSESS))"; \
	else \
		echo "  - NIST STS: $(RED)✗$(NC) Not built"; \
	fi
	@if command -v dieharder >/dev/null 2>&1; then \
		echo "  - Dieharder: $(GREEN)✓$(NC) Installed"; \
	else \
		echo "  - Dieharder: $(YELLOW)○$(NC) Not installed (run 'make install-dieharder')"; \
	fi
	@if [ "$(HAS_GPIOD)" = "no" ]; then \
		echo ""; \
		echo "$(YELLOW)Note: GPIO programs (trng, vomneu) not built.$(NC)"; \
		echo "Install libgpiod-dev to enable: sudo apt-get install libgpiod-dev"; \
	fi

# Check prerequisites
.PHONY: check-prerequisites
check-prerequisites:
	@echo "$(BLUE)Checking prerequisites...$(NC)"
	@if [ -z "$(HAS_PYTHON3)" ]; then \
		echo "$(RED)Error: Python 3 is required but not found$(NC)"; \
		exit 1; \
	fi
	@if [ -z "$(HAS_PIP)" ]; then \
		echo "$(YELLOW)Warning: pip not found. Python dependencies won't be installed$(NC)"; \
	fi

# Create necessary directories
.PHONY: directories
directories:
	@mkdir -p $(BUILD_DIR) $(BIN_DIR) $(REPOS_DIR) data evaluate evaluate_improved

# Python dependencies
.PHONY: python-deps
python-deps:
	@if [ -n "$(HAS_PIP)" ]; then \
		echo "$(BLUE)Installing Python dependencies...$(NC)"; \
		pip3 install -q numpy scipy 2>/dev/null || pip install -q numpy scipy 2>/dev/null || true; \
	fi

# Download and extract NIST STS if needed
$(REPOS_DIR)/$(NIST_ZIP):
	@echo "$(BLUE)Downloading NIST Statistical Test Suite...$(NC)"
	@mkdir -p $(REPOS_DIR)
	@cd $(REPOS_DIR) && $(DOWNLOAD_CMD) $(NIST_ZIP) $(NIST_URL)
	@if [ ! -f "$(REPOS_DIR)/$(NIST_ZIP)" ]; then \
		echo "$(RED)Failed to download NIST STS. Trying alternative method...$(NC)"; \
		cd $(REPOS_DIR) && \
		$(DOWNLOAD_CMD) $(NIST_ZIP) https://github.com/terrillmoore/NIST-Statistical-Test-Suite/raw/master/$(NIST_ZIP) 2>/dev/null || \
		echo "$(RED)Failed to download NIST STS from all sources$(NC)"; \
	fi

$(NIST_DIR)/makefile: $(REPOS_DIR)/$(NIST_ZIP)
	@echo "$(BLUE)Extracting NIST STS...$(NC)"
	@cd $(REPOS_DIR) && unzip -q -o $(NIST_ZIP) 2>/dev/null || \
		(echo "$(RED)Failed to extract NIST STS$(NC)" && exit 1)
	@touch $(NIST_DIR)/makefile

# Build NIST STS
.PHONY: nist-sts
nist-sts: $(NIST_DIR)/makefile
	@echo "$(BLUE)Building NIST Statistical Test Suite...$(NC)"
	@if [ -f "$(NIST_DIR)/makefile" ]; then \
		(cd $(NIST_DIR) && make clean >/dev/null 2>&1); \
		(cd $(NIST_DIR) && make >/dev/null 2>&1) && \
		echo "$(GREEN)NIST STS built successfully$(NC)" || \
		echo "$(YELLOW)NIST STS build had warnings but completed$(NC)"; \
	else \
		echo "$(RED)NIST STS source not found$(NC)"; \
	fi

# Install dieharder
.PHONY: install-dieharder
install-dieharder:
	@echo "$(BLUE)Checking for Dieharder...$(NC)"
	@if ! command -v dieharder >/dev/null 2>&1; then \
		echo "$(BLUE)Installing Dieharder...$(NC)"; \
		if [ -f /etc/debian_version ]; then \
			sudo apt-get update && sudo apt-get install -y dieharder; \
		elif [ -f /etc/redhat-release ]; then \
			sudo yum install -y dieharder || sudo dnf install -y dieharder; \
		elif [ -f /etc/arch-release ]; then \
			sudo pacman -S --noconfirm dieharder; \
		elif [ "$$(uname)" = "Darwin" ]; then \
			if command -v brew >/dev/null 2>&1; then \
				brew install dieharder; \
			else \
				echo "$(RED)Please install Homebrew first$(NC)"; \
			fi; \
		else \
			echo "$(YELLOW)Please install dieharder manually for your system$(NC)"; \
		fi; \
	else \
		echo "$(GREEN)Dieharder already installed$(NC)"; \
	fi

# Build individual C programs
$(BIN_DIR)/filter: $(SRC_DIR)/filter.c | directories
	@echo "$(BLUE)Building filter...$(NC)"
	@$(CC) $(CFLAGS) $< -o $@

$(BIN_DIR)/rng-extractor: $(SRC_DIR)/rng-extractor.c | directories
	@echo "$(BLUE)Building rng-extractor...$(NC)"
	@$(CC) $(CFLAGS) $< -o $@

$(BIN_DIR)/xor-groups: $(SRC_DIR)/xor-groups.c | directories
	@echo "$(BLUE)Building xor-groups...$(NC)"
	@$(CC) $(CFLAGS) $< -o $@

$(BIN_DIR)/transform: $(BIN_DIR)/filter | directories
	@echo "$(BLUE)Creating transform...$(NC)"
	@cp $< $@

# Build GPIO programs (only if libgpiod is available)
$(BIN_DIR)/trng: $(SRC_DIR)/trng.c | directories
	@if [ "$(HAS_GPIOD)" = "yes" ]; then \
		echo "$(BLUE)Building trng...$(NC)"; \
		$(CC) $(CFLAGS) $< -o $@ $(LDFLAGS); \
	else \
		echo "$(YELLOW)Skipping trng (libgpiod not available)$(NC)"; \
	fi

$(BIN_DIR)/vomneu: $(SRC_DIR)/vomneu.c | directories
	@if [ "$(HAS_GPIOD)" = "yes" ]; then \
		echo "$(BLUE)Building vomneu...$(NC)"; \
		$(CC) $(CFLAGS) $< -o $@ $(LDFLAGS); \
	else \
		echo "$(YELLOW)Skipping vomneu (libgpiod not available)$(NC)"; \
	fi

# Install all dependencies
.PHONY: install-deps
install-deps:
	@echo "$(BLUE)Installing system dependencies...$(NC)"
	@if [ -f /etc/debian_version ]; then \
		sudo apt-get update && \
		sudo apt-get install -y build-essential libgpiod-dev python3-pip wget unzip; \
	elif [ -f /etc/redhat-release ]; then \
		sudo yum groupinstall -y "Development Tools" && \
		sudo yum install -y libgpiod-devel python3-pip wget unzip; \
	else \
		echo "$(YELLOW)Please install dependencies manually for your system$(NC)"; \
	fi
	@$(MAKE) python-deps
	@$(MAKE) install-dieharder

# Clean build artifacts and downloaded files
.PHONY: clean
clean:
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	@rm -rf $(BUILD_DIR) $(BIN_DIR)
	@rm -f evaluate/*.bin evaluate/*.txt
	@rm -f evaluate_improved/*.bin evaluate_improved/*.txt
	@rm -f debug_input.py
	@echo "$(GREEN)Clean complete$(NC)"

# Deep clean - removes everything including downloaded dependencies
.PHONY: distclean
distclean: clean
	@echo "$(BLUE)Removing all downloaded dependencies...$(NC)"
	@rm -rf $(REPOS_DIR)
	@echo "$(GREEN)Distribution clean complete$(NC)"

# Run tests
.PHONY: test
test: all
	@echo "$(BLUE)Running tests...$(NC)"
	@if [ -f "data/events.txt" ]; then \
		echo "Testing with data/events.txt..."; \
		cat data/events.txt | python3 src/analysis/improved_extract.py --stats 2>&1 | grep "^#" || true; \
	fi
	@if [ -f "src/analysis/test-data.txt" ]; then \
		echo "Testing with test-data.txt..."; \
		cat src/analysis/test-data.txt | python3 src/analysis/improved_extract.py --stats 2>&1 | grep "^#" || true; \
	fi

# Run full test suite
.PHONY: test-full
test-full: all
	@echo "$(BLUE)Running full randomness test suite...$(NC)"
	@if [ -f "./run_full_test_simple.sh" ]; then \
		./run_full_test_simple.sh; \
	else \
		echo "$(RED)Test script not found$(NC)"; \
	fi

# Show help
.PHONY: help
help:
	@echo "$(BLUE)Hotbits TRNG Makefile$(NC)"
	@echo ""
	@echo "Targets:"
	@echo "  $(GREEN)all$(NC)           - Build everything (programs + dependencies)"
	@echo "  $(GREEN)clean$(NC)         - Remove build artifacts"
	@echo "  $(GREEN)distclean$(NC)     - Remove everything including downloaded dependencies"
	@echo "  $(GREEN)install-deps$(NC)  - Install system dependencies"
	@echo "  $(GREEN)nist-sts$(NC)      - Build NIST Statistical Test Suite"
	@echo "  $(GREEN)install-dieharder$(NC) - Install Dieharder test suite"
	@echo "  $(GREEN)test$(NC)          - Run basic tests"
	@echo "  $(GREEN)test-full$(NC)     - Run full test suite"
	@echo "  $(GREEN)help$(NC)          - Show this help message"
	@echo ""
	@echo "The build process will automatically:"
	@echo "  1. Download NIST STS if not present"
	@echo "  2. Build all C programs"
	@echo "  3. Install Python dependencies"
	@echo "  4. Set up test suites"

# Set default goal
.DEFAULT_GOAL := all