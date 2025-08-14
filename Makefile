# Hotbits TRNG Project Makefile

CC = gcc
CFLAGS = -Wall -O2
LDFLAGS = -lgpiod

SRC_DIR = src/testing
BUILD_DIR = build
BIN_DIR = bin

# Check if libgpiod is available
HAS_GPIOD := $(shell pkg-config --exists libgpiod && echo yes || echo no)

# Source files that don't require GPIO
NON_GPIO_SOURCES = $(SRC_DIR)/filter.c \
                   $(SRC_DIR)/rng-extractor.c \
                   $(SRC_DIR)/xor-groups.c

# Source files that require GPIO
GPIO_SOURCES = $(SRC_DIR)/trng.c \
               $(SRC_DIR)/vomneu.c

# Executable names
NON_GPIO_EXECUTABLES = $(BIN_DIR)/filter \
                       $(BIN_DIR)/rng-extractor \
                       $(BIN_DIR)/xor-groups \
                       $(BIN_DIR)/transform

ifeq ($(HAS_GPIOD),yes)
    ALL_EXECUTABLES = $(NON_GPIO_EXECUTABLES) $(BIN_DIR)/trng $(BIN_DIR)/vomneu
else
    ALL_EXECUTABLES = $(NON_GPIO_EXECUTABLES)
endif

# Default target
all: directories $(ALL_EXECUTABLES)
	@if [ "$(HAS_GPIOD)" = "no" ]; then \
		echo ""; \
		echo "WARNING: libgpiod not found. GPIO-dependent programs (trng, vomneu) were not built."; \
		echo "To build these programs, install libgpiod-dev:"; \
		echo "  sudo apt-get install libgpiod-dev"; \
		echo ""; \
	fi

# Create necessary directories
directories:
	@mkdir -p $(BUILD_DIR)
	@mkdir -p $(BIN_DIR)

# Build trng (requires gpiod library)
$(BIN_DIR)/trng: $(SRC_DIR)/trng.c
	@if [ "$(HAS_GPIOD)" = "yes" ]; then \
		echo "Building trng..."; \
		$(CC) $(CFLAGS) $< -o $@ $(LDFLAGS); \
	else \
		echo "Skipping trng (libgpiod not available)"; \
	fi

# Build filter
$(BIN_DIR)/filter: $(SRC_DIR)/filter.c
	$(CC) $(CFLAGS) $< -o $@

# Build rng-extractor
$(BIN_DIR)/rng-extractor: $(SRC_DIR)/rng-extractor.c
	$(CC) $(CFLAGS) $< -o $@

# Build vomneu (requires gpiod library)
$(BIN_DIR)/vomneu: $(SRC_DIR)/vomneu.c
	@if [ "$(HAS_GPIOD)" = "yes" ]; then \
		echo "Building vomneu..."; \
		$(CC) $(CFLAGS) $< -o $@ $(LDFLAGS); \
	else \
		echo "Skipping vomneu (libgpiod not available)"; \
	fi

# Build xor-groups
$(BIN_DIR)/xor-groups: $(SRC_DIR)/xor-groups.c
	$(CC) $(CFLAGS) $< -o $@

# Create transform as a copy of filter
$(BIN_DIR)/transform: $(BIN_DIR)/filter
	cp $< $@

# Clean build artifacts
clean:
	rm -rf $(BUILD_DIR) $(BIN_DIR)

# Run the main TRNG program
run: $(BIN_DIR)/trng
	$(BIN_DIR)/trng

# Install dependencies (for Debian/Ubuntu)
install-deps:
	@echo "Installing libgpiod development libraries..."
	sudo apt-get update && sudo apt-get install -y libgpiod-dev

# Check dependencies
check-deps:
	@echo "Checking dependencies..."
	@echo -n "libgpiod: "
	@if [ "$(HAS_GPIOD)" = "yes" ]; then \
		echo "✓ installed"; \
	else \
		echo "✗ not installed (run 'make install-deps' to install)"; \
	fi
	@echo -n "gcc: "
	@if which gcc > /dev/null; then \
		echo "✓ installed"; \
	else \
		echo "✗ not installed"; \
	fi

.PHONY: all clean directories run install-deps check-deps