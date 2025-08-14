# Makefile for TRNG with networking support
# Target: AARCH64 / Raspberry Pi (Bookworm/Kali)

CC = gcc
CFLAGS = -Wall -O2 -std=gnu99
LDFLAGS = -lgpiod

# Architecture-specific optimizations for AARCH64
ARCH := $(shell uname -m)
ifeq ($(ARCH),aarch64)
    CFLAGS += -march=armv8-a -mtune=cortex-a72
endif

# Binary name and installation paths
BINARY = trng
PREFIX = /usr/local
BINDIR = $(PREFIX)/bin
SYSTEMD_DIR = /etc/systemd/system

# Build targets
.PHONY: all clean install uninstall test debug service

all: $(BINARY)

$(BINARY): trng.c
	$(CC) $(CFLAGS) $< -o $@ $(LDFLAGS)
	@echo "Build complete: $(BINARY)"

debug: CFLAGS += -g -DDEBUG
debug: clean $(BINARY)

clean:
	rm -f $(BINARY) *.o

install: $(BINARY)
	@echo "Installing $(BINARY) to $(BINDIR)"
	install -D -m 755 $(BINARY) $(BINDIR)/$(BINARY)

uninstall:
	@echo "Removing $(BINARY) from $(BINDIR)"
	rm -f $(BINDIR)/$(BINARY)

# Test different modes
test: $(BINARY)
	@echo "Testing local mode (5 seconds)..."
	timeout 5 ./$(BINARY) -v || true
	@echo ""
	@echo "Testing broadcast mode help..."
	./$(BINARY) -m broadcast -?
	@echo ""
	@echo "Testing receive mode help..."
	./$(BINARY) -m receive -?

# Create systemd service file
service:
	@echo "Creating systemd service file..."
	@echo "[Unit]" > trng-broadcast.service
	@echo "Description=TRNG Broadcast Service" >> trng-broadcast.service
	@echo "After=network.target" >> trng-broadcast.service
	@echo "" >> trng-broadcast.service
	@echo "[Service]" >> trng-broadcast.service
	@echo "Type=simple" >> trng-broadcast.service
	@echo "ExecStart=$(BINDIR)/$(BINARY) -m broadcast -h 255.255.255.255 -p 8888 -v" >> trng-broadcast.service
	@echo "Restart=always" >> trng-broadcast.service
	@echo "RestartSec=10" >> trng-broadcast.service
	@echo "User=nobody" >> trng-broadcast.service
	@echo "Group=gpio" >> trng-broadcast.service
	@echo "" >> trng-broadcast.service
	@echo "[Install]" >> trng-broadcast.service
	@echo "WantedBy=multi-user.target" >> trng-broadcast.service
	@echo "Service file created: trng-broadcast.service"
	@echo "To install: sudo cp trng-broadcast.service $(SYSTEMD_DIR)/"
	@echo "Then: sudo systemctl daemon-reload && sudo systemctl enable trng-broadcast"

# Show usage examples
examples:
	@echo "TRNG Usage Examples:"
	@echo "==================="
	@echo ""
	@echo "Local mode (GPIO to stdout):"
	@echo "  ./$(BINARY)"
	@echo ""
	@echo "Broadcast to IPv4 network:"
	@echo "  ./$(BINARY) -m broadcast -h 192.168.1.255 -p 8888"
	@echo ""
	@echo "Broadcast to IPv6 multicast:"
	@echo "  ./$(BINARY) -m broadcast -h ff02::1 -p 8888 -6"
	@echo ""
	@echo "Receive from network:"
	@echo "  ./$(BINARY) -m receive -h 0.0.0.0 -p 8888"
	@echo ""
	@echo "Pipe to file while broadcasting:"
	@echo "  ./$(BINARY) -m broadcast -h 192.168.1.255 | tee entropy.log"
	@echo ""
	@echo "Verbose mode with custom GPIO:"
	@echo "  ./$(BINARY) -g 17 -c gpiochip0 -v"

help:
	@echo "Available targets:"
	@echo "  all      - Build the TRNG binary (default)"
	@echo "  debug    - Build with debug symbols"
	@echo "  clean    - Remove build artifacts"
	@echo "  install  - Install to system"
	@echo "  uninstall- Remove from system"
	@echo "  test     - Run basic tests"
	@echo "  service  - Generate systemd service file"
	@echo "  examples - Show usage examples"
	@echo "  help     - Show this help message"