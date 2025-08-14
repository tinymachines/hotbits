#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <time.h>
#include <stdint.h>
#include <signal.h>
#include <errno.h>
#include <getopt.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netdb.h>
#include <gpiod.h>

#define GPIO_LINE 5
#define GPIO_CHIP "gpiochip0"
#define DEFAULT_UDP_PORT 8888
#define BUFFER_SIZE 1024
#define MAX_PACKET_SIZE 65507

typedef enum {
    MODE_LOCAL,
    MODE_BROADCAST,
    MODE_RECEIVE
} OperationMode;

typedef struct {
    OperationMode mode;
    char *host;
    int port;
    int use_ipv6;
    int gpio_line;
    char *gpio_chip;
    int verbose;
} Config;

typedef struct {
    uint64_t timestamp_ns;
    uint64_t delta_ns;
    uint32_t sequence;
} TRNGPacket;

static volatile int running = 1;
static Config config = {
    .mode = MODE_LOCAL,
    .host = NULL,
    .port = DEFAULT_UDP_PORT,
    .use_ipv6 = 0,
    .gpio_line = GPIO_LINE,
    .gpio_chip = GPIO_CHIP,
    .verbose = 0
};

void signal_handler(int sig) {
    if (sig == SIGINT || sig == SIGTERM) {
        running = 0;
    }
}

void print_usage(const char *prog) {
    fprintf(stderr, "Usage: %s [OPTIONS]\n", prog);
    fprintf(stderr, "Options:\n");
    fprintf(stderr, "  -m, --mode MODE        Operation mode: local, broadcast, receive (default: local)\n");
    fprintf(stderr, "  -h, --host HOST        Target host for broadcast or bind address for receive\n");
    fprintf(stderr, "  -p, --port PORT        UDP port (default: %d)\n", DEFAULT_UDP_PORT);
    fprintf(stderr, "  -6, --ipv6             Use IPv6 instead of IPv4\n");
    fprintf(stderr, "  -g, --gpio-line NUM    GPIO line number (default: %d)\n", GPIO_LINE);
    fprintf(stderr, "  -c, --chip NAME        GPIO chip name (default: %s)\n", GPIO_CHIP);
    fprintf(stderr, "  -v, --verbose          Enable verbose output\n");
    fprintf(stderr, "  -?, --help             Show this help message\n");
    fprintf(stderr, "\nExamples:\n");
    fprintf(stderr, "  %s                                    # Local mode (GPIO to stdout)\n", prog);
    fprintf(stderr, "  %s -m broadcast -h 192.168.1.255      # Broadcast to IPv4 network\n", prog);
    fprintf(stderr, "  %s -m broadcast -h ff02::1 -6         # Broadcast to IPv6 multicast\n", prog);
    fprintf(stderr, "  %s -m receive -h 0.0.0.0              # Receive on all interfaces\n", prog);
}

int parse_arguments(int argc, char *argv[]) {
    static struct option long_options[] = {
        {"mode",      required_argument, 0, 'm'},
        {"host",      required_argument, 0, 'h'},
        {"port",      required_argument, 0, 'p'},
        {"ipv6",      no_argument,       0, '6'},
        {"gpio-line", required_argument, 0, 'g'},
        {"chip",      required_argument, 0, 'c'},
        {"verbose",   no_argument,       0, 'v'},
        {"help",      no_argument,       0, '?'},
        {0, 0, 0, 0}
    };

    int opt;
    while ((opt = getopt_long(argc, argv, "m:h:p:6g:c:v?", long_options, NULL)) != -1) {
        switch (opt) {
            case 'm':
                if (strcmp(optarg, "local") == 0) {
                    config.mode = MODE_LOCAL;
                } else if (strcmp(optarg, "broadcast") == 0) {
                    config.mode = MODE_BROADCAST;
                } else if (strcmp(optarg, "receive") == 0) {
                    config.mode = MODE_RECEIVE;
                } else {
                    fprintf(stderr, "Invalid mode: %s\n", optarg);
                    return -1;
                }
                break;
            case 'h':
                config.host = optarg;
                break;
            case 'p':
                config.port = atoi(optarg);
                if (config.port <= 0 || config.port > 65535) {
                    fprintf(stderr, "Invalid port: %s\n", optarg);
                    return -1;
                }
                break;
            case '6':
                config.use_ipv6 = 1;
                break;
            case 'g':
                config.gpio_line = atoi(optarg);
                break;
            case 'c':
                config.gpio_chip = optarg;
                break;
            case 'v':
                config.verbose = 1;
                break;
            case '?':
                print_usage(argv[0]);
                exit(0);
            default:
                print_usage(argv[0]);
                return -1;
        }
    }

    if (config.mode == MODE_BROADCAST && !config.host) {
        fprintf(stderr, "Broadcast mode requires -h/--host\n");
        return -1;
    }

    if (config.mode == MODE_RECEIVE && !config.host) {
        config.host = config.use_ipv6 ? "::" : "0.0.0.0";
    }

    return 0;
}

int create_socket(int is_receiver) {
    int sock;
    int family = config.use_ipv6 ? AF_INET6 : AF_INET;
    
    sock = socket(family, SOCK_DGRAM, 0);
    if (sock < 0) {
        perror("socket");
        return -1;
    }

    if (is_receiver) {
        int reuse = 1;
        if (setsockopt(sock, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse)) < 0) {
            perror("setsockopt(SO_REUSEADDR)");
            close(sock);
            return -1;
        }

        if (config.use_ipv6) {
            struct sockaddr_in6 addr;
            memset(&addr, 0, sizeof(addr));
            addr.sin6_family = AF_INET6;
            addr.sin6_port = htons(config.port);
            
            if (inet_pton(AF_INET6, config.host, &addr.sin6_addr) <= 0) {
                fprintf(stderr, "Invalid IPv6 address: %s\n", config.host);
                close(sock);
                return -1;
            }

            if (bind(sock, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
                perror("bind");
                close(sock);
                return -1;
            }
        } else {
            struct sockaddr_in addr;
            memset(&addr, 0, sizeof(addr));
            addr.sin_family = AF_INET;
            addr.sin_port = htons(config.port);
            
            if (inet_pton(AF_INET, config.host, &addr.sin_addr) <= 0) {
                fprintf(stderr, "Invalid IPv4 address: %s\n", config.host);
                close(sock);
                return -1;
            }

            if (bind(sock, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
                perror("bind");
                close(sock);
                return -1;
            }
        }
    } else {
        int broadcast = 1;
        if (!config.use_ipv6) {
            if (setsockopt(sock, SOL_SOCKET, SO_BROADCAST, &broadcast, sizeof(broadcast)) < 0) {
                perror("setsockopt(SO_BROADCAST)");
                close(sock);
                return -1;
            }
        }
    }

    return sock;
}

int send_packet(int sock, const TRNGPacket *packet) {
    struct sockaddr_storage addr;
    socklen_t addr_len;
    
    memset(&addr, 0, sizeof(addr));
    
    if (config.use_ipv6) {
        struct sockaddr_in6 *addr6 = (struct sockaddr_in6 *)&addr;
        addr6->sin6_family = AF_INET6;
        addr6->sin6_port = htons(config.port);
        
        if (inet_pton(AF_INET6, config.host, &addr6->sin6_addr) <= 0) {
            fprintf(stderr, "Invalid IPv6 address: %s\n", config.host);
            return -1;
        }
        addr_len = sizeof(struct sockaddr_in6);
    } else {
        struct sockaddr_in *addr4 = (struct sockaddr_in *)&addr;
        addr4->sin_family = AF_INET;
        addr4->sin_port = htons(config.port);
        
        if (inet_pton(AF_INET, config.host, &addr4->sin_addr) <= 0) {
            fprintf(stderr, "Invalid IPv4 address: %s\n", config.host);
            return -1;
        }
        addr_len = sizeof(struct sockaddr_in);
    }

    TRNGPacket net_packet;
    net_packet.timestamp_ns = htobe64(packet->timestamp_ns);
    net_packet.delta_ns = htobe64(packet->delta_ns);
    net_packet.sequence = htonl(packet->sequence);

    ssize_t sent = sendto(sock, &net_packet, sizeof(net_packet), 0,
                         (struct sockaddr *)&addr, addr_len);
    
    if (sent < 0) {
        perror("sendto");
        return -1;
    }
    
    return 0;
}

int run_gpio_mode(int broadcast_sock) {
    struct gpiod_chip *chip;
    struct gpiod_line *line;
    int rv;
    struct timespec last_time = {0, 0};
    uint64_t delta_ns = 0;
    uint32_t sequence = 0;

    chip = gpiod_chip_open_by_name(config.gpio_chip);
    if (!chip) {
        perror("gpiod_chip_open_by_name");
        return -1;
    }

    line = gpiod_chip_get_line(chip, config.gpio_line);
    if (!line) {
        perror("gpiod_chip_get_line");
        gpiod_chip_close(chip);
        return -1;
    }

    struct gpiod_line_request_config gpio_config = {
        .consumer = "TRNG",
        .request_type = GPIOD_LINE_REQUEST_EVENT_RISING_EDGE,
        .flags = GPIOD_LINE_REQUEST_FLAG_BIAS_DISABLE
    };

    rv = gpiod_line_request(line, &gpio_config, 0);
    if (rv < 0) {
        perror("gpiod_line_request");
        gpiod_chip_close(chip);
        return -1;
    }

    if (config.verbose) {
        fprintf(stderr, "GPIO initialized on chip %s, line %d\n", 
                config.gpio_chip, config.gpio_line);
        if (config.mode == MODE_BROADCAST) {
            fprintf(stderr, "Broadcasting to %s:%d (%s)\n",
                    config.host, config.port, config.use_ipv6 ? "IPv6" : "IPv4");
        }
    }

    while (running) {
        struct gpiod_line_event event;
        struct timespec timeout = {1, 0};
        
        rv = gpiod_line_event_wait(line, &timeout);
        
        if (rv == 1) {
            gpiod_line_event_read(line, &event);

            if (last_time.tv_sec != 0) {
                delta_ns = (event.ts.tv_sec - last_time.tv_sec) * 1000000000ULL + 
                          (event.ts.tv_nsec - last_time.tv_nsec);
                
                uint64_t timestamp_ns = event.ts.tv_sec * 1000000000ULL + event.ts.tv_nsec;
                
                printf("%ld\n", delta_ns);
                fflush(stdout);

                if (broadcast_sock >= 0) {
                    TRNGPacket packet = {
                        .timestamp_ns = timestamp_ns,
                        .delta_ns = delta_ns,
                        .sequence = sequence++
                    };
                    
                    if (send_packet(broadcast_sock, &packet) < 0) {
                        fprintf(stderr, "Failed to send packet %u\n", packet.sequence);
                    } else if (config.verbose) {
                        fprintf(stderr, "Sent packet %u: delta=%ld ns\n", 
                                packet.sequence, delta_ns);
                    }
                }
            }
            
            last_time = event.ts;
        } else if (rv < 0 && errno != EINTR) {
            perror("gpiod_line_event_wait");
            break;
        }
    }

    gpiod_line_release(line);
    gpiod_chip_close(chip);
    
    return 0;
}

int run_receive_mode() {
    int sock = create_socket(1);
    if (sock < 0) {
        return -1;
    }

    if (config.verbose) {
        fprintf(stderr, "Listening on %s:%d (%s)\n",
                config.host, config.port, config.use_ipv6 ? "IPv6" : "IPv4");
    }

    TRNGPacket packet;
    struct sockaddr_storage from_addr;
    socklen_t from_len;
    char addr_str[INET6_ADDRSTRLEN];

    while (running) {
        from_len = sizeof(from_addr);
        ssize_t received = recvfrom(sock, &packet, sizeof(packet), 0,
                                   (struct sockaddr *)&from_addr, &from_len);
        
        if (received < 0) {
            if (errno == EINTR) continue;
            perror("recvfrom");
            break;
        }
        
        if (received != sizeof(packet)) {
            fprintf(stderr, "Received invalid packet size: %zd\n", received);
            continue;
        }

        packet.timestamp_ns = be64toh(packet.timestamp_ns);
        packet.delta_ns = be64toh(packet.delta_ns);
        packet.sequence = ntohl(packet.sequence);

        printf("%ld\n", packet.delta_ns);
        fflush(stdout);

        if (config.verbose) {
            if (from_addr.ss_family == AF_INET) {
                struct sockaddr_in *addr4 = (struct sockaddr_in *)&from_addr;
                inet_ntop(AF_INET, &addr4->sin_addr, addr_str, sizeof(addr_str));
            } else {
                struct sockaddr_in6 *addr6 = (struct sockaddr_in6 *)&from_addr;
                inet_ntop(AF_INET6, &addr6->sin6_addr, addr_str, sizeof(addr_str));
            }
            fprintf(stderr, "Received packet %u from %s: delta=%ld ns\n",
                    packet.sequence, addr_str, packet.delta_ns);
        }
    }

    close(sock);
    return 0;
}

int main(int argc, char *argv[]) {
    if (parse_arguments(argc, argv) < 0) {
        return 1;
    }

    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);

    int ret = 0;

    switch (config.mode) {
        case MODE_LOCAL:
            ret = run_gpio_mode(-1);
            break;
            
        case MODE_BROADCAST: {
            int sock = create_socket(0);
            if (sock < 0) {
                return 1;
            }
            ret = run_gpio_mode(sock);
            close(sock);
            break;
        }
        
        case MODE_RECEIVE:
            ret = run_receive_mode();
            break;
    }

    if (config.verbose) {
        fprintf(stderr, "Shutting down...\n");
    }

    return ret;
}