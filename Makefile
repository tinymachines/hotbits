# Hotbits TRNG Project Makefile

CC = gcc
CFLAGS = -Wall -O2
LDFLAGS = -lgpiod

SRC_DIR = src/testing
BUILD_DIR = build
BIN_DIR = bin

# Source files
SOURCES = $(SRC_DIR)/trng.c \
          $(SRC_DIR)/filter.c \
          $(SRC_DIR)/rng-extractor.c \
          $(SRC_DIR)/vomneu.c \
          $(SRC_DIR)/xor-groups.c

# Object files
OBJECTS = $(patsubst $(SRC_DIR)/%.c,$(BUILD_DIR)/%.o,$(SOURCES))

# Executable names
EXECUTABLES = $(BIN_DIR)/trng \
              $(BIN_DIR)/filter \
              $(BIN_DIR)/rng-extractor \
              $(BIN_DIR)/vomneu \
              $(BIN_DIR)/xor-groups \
              $(BIN_DIR)/transform

# Default target
all: directories $(EXECUTABLES)

# Create necessary directories
directories:
	@mkdir -p $(BUILD_DIR)
	@mkdir -p $(BIN_DIR)

# Build trng (requires gpiod library)
$(BIN_DIR)/trng: $(SRC_DIR)/trng.c
	$(CC) $(CFLAGS) $< -o $@ $(LDFLAGS)

# Build filter
$(BIN_DIR)/filter: $(SRC_DIR)/filter.c
	$(CC) $(CFLAGS) $< -o $@

# Build rng-extractor
$(BIN_DIR)/rng-extractor: $(SRC_DIR)/rng-extractor.c
	$(CC) $(CFLAGS) $< -o $@

# Build vomneu
$(BIN_DIR)/vomneu: $(SRC_DIR)/vomneu.c
	$(CC) $(CFLAGS) $< -o $@

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

.PHONY: all clean directories run install-deps