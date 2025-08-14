#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <unistd.h>

#define DEBUG_PRINT(...) fprintf(stderr, __VA_ARGS__)
#define MAX_BUFFER 10000000  // Maximum number of timestamps to buffer
			     //
// Von Neumann extractor for bit pairs
void von_neumann_extract(uint8_t *input, size_t input_len, uint8_t *output, size_t *output_len) {
    size_t out_idx = 0;
    uint8_t out_bit_pos = 0;
    uint8_t current_byte = 0;
    
    for (size_t i = 0; i < input_len - 1; i += 2) {
        if (input[i] != input[i + 1]) {
            current_byte = (current_byte << 1) | input[i];
            out_bit_pos++;
            
            if (out_bit_pos == 8) {
                output[out_idx++] = current_byte;
                current_byte = 0;
                out_bit_pos = 0;
            }
        }
    }
    
    if (out_bit_pos > 0) {
        current_byte <<= (8 - out_bit_pos);
        output[out_idx++] = current_byte;
    }
    
    *output_len = out_idx;
}

// Extract bits using interval comparison
void interval_compare(uint64_t *intervals, size_t count, uint8_t *output, size_t *output_len) {
    size_t out_idx = 0;
    uint8_t out_bit_pos = 0;
    uint8_t current_byte = 0;
    
    for (size_t i = 0; i < count - 1; i += 2) {
        current_byte = (current_byte << 1) | (intervals[i] > intervals[i + 1]);
        out_bit_pos++;
        
        if (out_bit_pos == 8) {
            output[out_idx++] = current_byte;
            current_byte = 0;
            out_bit_pos = 0;
        }
    }
    
    if (out_bit_pos > 0) {
        current_byte <<= (8 - out_bit_pos);
        output[out_idx++] = current_byte;
    }
    
    *output_len = out_idx;
}

// XOR folding on timestamp bits
void xor_fold(uint64_t *timestamps, size_t count, uint8_t *output, size_t *output_len) {
    size_t out_idx = 0;
    
    for (size_t i = 0; i < count - 1; i++) {
        uint64_t xor_result = timestamps[i] ^ timestamps[i + 1];
        output[out_idx++] = xor_result & 0xFF;
    }
    
    *output_len = out_idx;
}

// LSB extraction with optional bit position selection
void extract_lsbs(uint64_t *values, size_t count, int bit_pos, uint8_t *output, size_t *output_len) {
    size_t out_idx = 0;
    uint8_t current_byte = 0;
    int bit_count = 0;
    
    for (size_t i = 0; i < count; i++) {
        current_byte = (current_byte << 1) | ((values[i] >> bit_pos) & 1);
        bit_count++;
        
        if (bit_count == 8) {
            output[out_idx++] = current_byte;
            current_byte = 0;
            bit_count = 0;
        }
    }
    
    if (bit_count > 0) {
        current_byte <<= (8 - bit_count);
        output[out_idx++] = current_byte;
    }
    
    *output_len = out_idx;
}

int main(int argc, char *argv[]) {
    int method = 0;
    int bit_pos = 0;
    int c;
    
    while ((c = getopt(argc, argv, "m:b:")) != -1) {
        switch (c) {
            case 'm':
                method = atoi(optarg);
                break;
            case 'b':
                bit_pos = atoi(optarg);
                break;
            default:
                DEBUG_PRINT("Usage: %s [-m method] [-b bit_pos]\n", argv[0]);
                return 1;
        }
    }
    
    DEBUG_PRINT("Selected method: %d\n", method);
    
    // Read timestamps/intervals from stdin
    uint64_t *values = malloc(MAX_BUFFER * sizeof(uint64_t));
    if (!values) {
        DEBUG_PRINT("Failed to allocate values buffer\n");
        return 1;
    }
    
    size_t count = 0;
    char line[100];
    DEBUG_PRINT("Reading input values...\n");
    
    while (fgets(line, sizeof(line), stdin) && count < 10000000) {
        values[count] = strtoull(line, NULL, 10);
        if (values[count] > 0 || line[0] == '0') {  // Valid number or explicit zero
            count++;
        }
    }
    
    DEBUG_PRINT("Read %zu values\n", count);
    
    if (count == 0) {
        DEBUG_PRINT("No input values read\n");
        free(values);
        return 1;
    }
    
    // Allocate output buffer
    uint8_t *output = malloc(count + 1);  // +1 for safety
    if (!output) {
        DEBUG_PRINT("Failed to allocate output buffer\n");
        free(values);
        return 1;
    }
    
    size_t output_len = 0;
    
    DEBUG_PRINT("Applying extraction method %d...\n", method);
    
    // Apply selected extraction method
    switch (method) {
        case 0:
            DEBUG_PRINT("Using interval comparison...\n");
            interval_compare(values, count, output, &output_len);
            break;
        case 1: {
            DEBUG_PRINT("Using Von Neumann extraction...\n");
            uint8_t *bits = malloc(count);
            if (!bits) {
                DEBUG_PRINT("Failed to allocate bits buffer\n");
                free(values);
                free(output);
                return 1;
            }
            for (size_t i = 0; i < count; i++) {
                bits[i] = values[i] & 1;
            }
            von_neumann_extract(bits, count, output, &output_len);
            free(bits);
            break;
        }
        case 2:
            DEBUG_PRINT("Using XOR folding...\n");
            xor_fold(values, count, output, &output_len);
            break;
        case 3:
            DEBUG_PRINT("Using LSB extraction (bit %d)...\n", bit_pos);
            extract_lsbs(values, count, bit_pos, output, &output_len);
            break;
        default:
            DEBUG_PRINT("Invalid method selected\n");
            free(values);
            free(output);
            return 1;
    }
    
    DEBUG_PRINT("Generated %zu output bytes\n", output_len);
    
    // Write output in raw binary format
    size_t written = fwrite(output, 1, output_len, stdout);
    DEBUG_PRINT("Wrote %zu bytes to output\n", written);
    
    free(values);
    free(output);
    return 0;
}
