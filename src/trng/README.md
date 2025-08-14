# TRNG - True Random Number Generator with Network Support

Enhanced TRNG implementation with UDP broadcast capabilities for distributed entropy collection.

## Features

- **Local Mode**: Direct GPIO event capture to stdout
- **Broadcast Mode**: UDP4/UDP6 network broadcasting of entropy data
- **Receive Mode**: Network listener for collecting broadcast entropy
- **Dual Output**: Always prints to stdout (for logging/tee) while broadcasting
- **IPv6 Support**: Full IPv6 multicast capability
- **Clean Architecture**: Modular, maintainable code structure

## Quick Start

### Install Dependencies

```bash
# Run as root or with sudo
sudo ./install-deps.sh
```

### Build

```bash
make
```

### Basic Usage

```bash
# Local mode (GPIO to stdout)
./trng

# Broadcast to network while printing to stdout
./trng -m broadcast -h 192.168.1.255 -p 8888

# Receive from network
./trng -m receive -h 0.0.0.0 -p 8888

# Log while broadcasting
./trng -m broadcast -h 192.168.1.255 | tee entropy.log
```

## Command Line Options

```
-m, --mode MODE        Operation mode: local, broadcast, receive (default: local)
-h, --host HOST        Target host for broadcast or bind address for receive
-p, --port PORT        UDP port (default: 8888)
-6, --ipv6             Use IPv6 instead of IPv4
-g, --gpio-line NUM    GPIO line number (default: 5)
-c, --chip NAME        GPIO chip name (default: gpiochip0)
-v, --verbose          Enable verbose output
-?, --help             Show help message
```

## Network Protocol

The TRNG broadcasts packets with the following structure:

```c
typedef struct {
    uint64_t timestamp_ns;  // Absolute timestamp in nanoseconds
    uint64_t delta_ns;      // Time delta from previous event
    uint32_t sequence;      // Packet sequence number
} TRNGPacket;
```

All multi-byte values are transmitted in network byte order (big-endian).

## Examples

### IPv4 Broadcast
```bash
# Broadcast to local network
./trng -m broadcast -h 192.168.1.255 -p 8888 -v

# Broadcast to specific subnet
./trng -m broadcast -h 10.0.0.255 -p 9999
```

### IPv6 Multicast
```bash
# Link-local multicast (all nodes)
./trng -m broadcast -h ff02::1 -p 8888 -6

# Site-local multicast
./trng -m broadcast -h ff05::1 -p 8888 -6
```

### Multiple Receivers
```bash
# On entropy collector machine
./trng -m receive -h 0.0.0.0 -p 8888 | python3 ../../testing/trng_processor.py

# On another machine (IPv6)
./trng -m receive -h :: -p 8888 -6
```

### Systemd Service

Create a systemd service for automatic startup:

```bash
# Generate service file
make service

# Install and enable
sudo cp trng-broadcast.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now trng-broadcast
```

## Platform Support

Optimized for:
- **Architecture**: AARCH64 (ARM 64-bit)
- **Platforms**: Raspberry Pi 4/5
- **OS**: Raspberry Pi OS (Bookworm), Kali Linux
- **GPIO**: Via libgpiod (modern kernel interface)

## Building for Production

```bash
# Optimized build
make clean && make

# Debug build
make debug

# Install system-wide
sudo make install

# Uninstall
sudo make uninstall
```

## Troubleshooting

### GPIO Access Denied
```bash
# Add user to gpio group
sudo usermod -a -G gpio $USER
# Log out and back in
```

### Network Permission Issues
```bash
# For ports < 1024, need root or capability
sudo setcap cap_net_bind_service=+ep ./trng
```

### Test GPIO Detection
```bash
# List GPIO chips
gpiodetect

# Show chip info
gpioinfo gpiochip0
```

## Performance

- Minimal CPU overhead (~1-2% on Pi 4)
- Network latency: < 1ms on local network
- Supports high-frequency events (tested up to 100kHz)
- Memory usage: < 1MB resident

## Security Considerations

- Run as non-root user when possible (add to gpio group)
- Use specific broadcast addresses, not 255.255.255.255
- Consider network isolation for entropy collection
- Validate entropy quality with statistical tests