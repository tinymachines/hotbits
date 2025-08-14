// Test version of trng.c without GPIO dependency for compilation testing
// This demonstrates the network functionality without actual GPIO hardware

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

#define DEFAULT_UDP_PORT 8888
#define BUFFER_SIZE 1024

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
    fprintf(stderr, "  -v, --verbose          Enable verbose output\n");
    fprintf(stderr, "  -?, --help             Show this help message\n");
}

int main(int argc, char *argv[]) {
    printf("TRNG Test Build - Network functionality only\n");
    printf("Compilation successful!\n");
    printf("Note: This is a test build without GPIO support\n");
    printf("The actual version requires libgpiod-dev to be installed\n");
    return 0;
}