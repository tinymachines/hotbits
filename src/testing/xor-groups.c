#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>

int main(int argc, char *argv[]) {
    if (argc != 2) {
        fprintf(stderr, "Usage: %s <group_size>\n", argv[0]);
        return 1;
    }

    int group_size = atoi(argv[1]);
    if (group_size <= 0) {
        fprintf(stderr, "Group size must be positive\n");
        return 1;
    }

    uint64_t *buffer = malloc(group_size * sizeof(uint64_t));
    if (!buffer) {
        fprintf(stderr, "Memory allocation failed\n");
        return 1;
    }

    char line[256];
    int count = 0;

    while (fgets(line, sizeof(line), stdin)) {
        buffer[count++] = strtoull(line, NULL, 10);
        
        if (count == group_size) {
            uint64_t result = buffer[0];
            for (int i = 1; i < group_size; i++) {
                result ^= buffer[i];
            }
            printf("%lu\n", result);
            count = 0;
        }
    }

    // Handle any remaining numbers if input size isn't perfectly divisible
    if (count > 0) {
        uint64_t result = buffer[0];
        for (int i = 1; i < count; i++) {
            result ^= buffer[i];
        }
        printf("%lu\n", result);
    }

    free(buffer);
    return 0;
}
