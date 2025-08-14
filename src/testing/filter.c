#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <unistd.h>

#define MAX_BUFFER 10000000  // Maximum number of timestamps to buffer

// Transformation options
struct transform_options {
    uint64_t dead_time_ns;     // Minimum time between events
    uint64_t window_size_ns;   // Time window for aggregation
    int window_mode;           // 0: first event, 1: last event, 2: mean time
    int output_mode;           // 0: timestamps, 1: intervals
};

// Read command line arguments
void parse_args(int argc, char *argv[], struct transform_options *opts) {
    int c;
    
    // Set defaults
    opts->dead_time_ns = 0;
    opts->window_size_ns = 0;
    opts->window_mode = 0;
    opts->output_mode = 0;
    
    while ((c = getopt(argc, argv, "d:w:m:o:")) != -1) {
        switch (c) {
            case 'd':
                opts->dead_time_ns = strtoull(optarg, NULL, 10);
                break;
            case 'w':
                opts->window_size_ns = strtoull(optarg, NULL, 10);
                break;
            case 'm':
                opts->window_mode = atoi(optarg);
                break;
            case 'o':
                opts->output_mode = atoi(optarg);
                break;
            default:
                fprintf(stderr, "Usage: %s [-d dead_time_ns] [-w window_size_ns] [-m window_mode] [-o output_mode]\n", argv[0]);
                exit(1);
        }
    }
}

// Apply dead time filter
uint64_t* apply_dead_time(uint64_t *timestamps, size_t count, uint64_t dead_time, size_t *new_count) {
    if (count == 0) {
        *new_count = 0;
        return NULL;
    }
    
    uint64_t *filtered = malloc(count * sizeof(uint64_t));
    if (!filtered) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(1);
    }
    
    size_t j = 0;
    filtered[j++] = timestamps[0];
    
    for (size_t i = 1; i < count; i++) {
        if (timestamps[i] - filtered[j-1] > dead_time) {
            filtered[j++] = timestamps[i];
        }
    }
    
    *new_count = j;
    return filtered;
}

// Apply time window aggregation
uint64_t* apply_window(uint64_t *timestamps, size_t count, uint64_t window_size, 
                      int mode, size_t *new_count) {
    if (count == 0 || window_size == 0) {
        *new_count = 0;
        return NULL;
    }
    
    uint64_t *windowed = malloc(count * sizeof(uint64_t));
    if (!windowed) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(1);
    }
    
    size_t j = 0;
    size_t window_start = 0;
    uint64_t current_window = timestamps[0] / window_size * window_size;
    
    for (size_t i = 1; i <= count; i++) {
        uint64_t next_window = (i < count) ? 
            (timestamps[i] / window_size * window_size) : current_window + window_size;
            
        if (next_window > current_window) {
            // Process current window
            switch (mode) {
                case 0: // First event
                    windowed[j++] = timestamps[window_start];
                    break;
                case 1: // Last event
                    windowed[j++] = timestamps[i-1];
                    break;
                case 2: { // Mean time
                    uint64_t sum = 0;
                    for (size_t k = window_start; k < i; k++) {
                        sum += timestamps[k];
                    }
                    windowed[j++] = sum / (i - window_start);
                    break;
                }
            }
            window_start = i;
            current_window = next_window;
        }
    }
    
    *new_count = j;
    return windowed;
}

int main(int argc, char *argv[]) {
    struct transform_options opts;
    parse_args(argc, argv, &opts);
    
    // Read timestamps from stdin
    uint64_t *timestamps = malloc(MAX_BUFFER * sizeof(uint64_t));
    if (!timestamps) {
        fprintf(stderr, "Memory allocation failed\n");
        return 1;
    }
    
    size_t count = 0;
    char line[100];
    
    while (fgets(line, sizeof(line), stdin) && count < MAX_BUFFER) {
        timestamps[count++] = strtoull(line, NULL, 10);
    }
    
    // Apply transformations
    size_t new_count;
    uint64_t *result = timestamps;
    
    if (opts.dead_time_ns > 0) {
        uint64_t *filtered = apply_dead_time(result, count, opts.dead_time_ns, &new_count);
        if (result != timestamps) free(result);
        result = filtered;
        count = new_count;
    }
    
    if (opts.window_size_ns > 0) {
        uint64_t *windowed = apply_window(result, count, opts.window_size_ns, 
                                        opts.window_mode, &new_count);
        if (result != timestamps) free(result);
        result = windowed;
        count = new_count;
    }
    
    // Output results
    if (opts.output_mode == 0) {
        // Output timestamps
        for (size_t i = 0; i < count; i++) {
            printf("%lu\n", result[i]);
        }
    } else {
        // Output intervals
        for (size_t i = 1; i < count; i++) {
            printf("%lu\n", result[i] - result[i-1]);
        }
    }
    
    if (result != timestamps) free(result);
    free(timestamps);
    
    return 0;
}
