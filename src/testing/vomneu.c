#include <stdio.h>
#include <stdlib.h>
#include <gpiod.h>
#include <time.h>
#include <unistd.h>
#include <string.h>
#include <stdint.h>

#define GPIO_LINE 5
#define GPIO_CHIP "gpiochip0"
#define SAMPLE_SIZE 1000
#define LOOPS 1000

struct timing_data {
    uint64_t timestamp;
    uint64_t delta;
};

// Update the debias_bits function to only write complete bytes
static int debias_bits(const uint8_t* input, size_t input_len, uint8_t* output, size_t* output_len) {
    size_t out_idx = 0;
    uint8_t out_bit_idx = 0;
    uint8_t current_byte = 0;

    for (size_t i = 0; i < input_len - 1; i += 2) {
        if (input[i] != input[i + 1]) {
            uint8_t debiased_bit = input[i];
            current_byte = (current_byte << 1) | debiased_bit;
            out_bit_idx++;

            if (out_bit_idx == 8) {
                output[out_idx++] = current_byte;
                current_byte = 0;
                out_bit_idx = 0;
            }
        }
    }

    // Only update output_len with complete bytes
    *output_len = out_idx;
    return 0;
}

int main(void) {
    struct gpiod_chip *chip;
    struct gpiod_line *line;
    int rv;
    uint8_t raw_bits[SAMPLE_SIZE];
    uint8_t debiased_bits[SAMPLE_SIZE/4];
    size_t debiased_size;
    int count = 0;
    struct timespec last_time = {0, 0};
    uint64_t min_delta = UINT64_MAX;
    uint64_t max_delta = 0;

    chip = gpiod_chip_open_by_name(GPIO_CHIP);
    if (!chip) {
        perror("Open chip failed");
        return 1;
    }

    line = gpiod_chip_get_line(chip, GPIO_LINE);
    if (!line) {
        perror("Get line failed");
        gpiod_chip_close(chip);
        return 1;
    }

    struct gpiod_line_request_config config = {
        .consumer = "TRNG",
        .request_type = GPIOD_LINE_REQUEST_EVENT_BOTH_EDGES,
        .flags = GPIOD_LINE_REQUEST_FLAG_BIAS_DISABLE
    };

    rv = gpiod_line_request(line, &config, 0);
    if (rv < 0) {
        perror("Request line failed");
        gpiod_chip_close(chip);
        return 1;
    }

    printf("Collecting %d samples...\n", SAMPLE_SIZE);
    fflush(stdout);

    while (count < SAMPLE_SIZE) {
        struct gpiod_line_event event;
        rv = gpiod_line_event_wait(line, NULL);
        if (rv == 1) {
            gpiod_line_event_read(line, &event);
            
            if (last_time.tv_sec != 0) {
                uint64_t delta_ns = (event.ts.tv_sec - last_time.tv_sec) * 1000000000ULL + 
                                  (event.ts.tv_nsec - last_time.tv_nsec);
                
                raw_bits[count] = (delta_ns % 2);

                if (delta_ns < min_delta) min_delta = delta_ns;
                if (delta_ns > max_delta) max_delta = delta_ns;

                count++;
                if (count % 100 == 0) {
                    printf("Collected %d samples\n", count);
                }
            }
            last_time = event.ts;
        }
    }

    // Apply Von Neumann debiasing
    debias_bits(raw_bits, SAMPLE_SIZE, debiased_bits, &debiased_size);

    printf("\nStatistics:\n");
    printf("Minimum delta: %lu nanoseconds\n", min_delta);
    printf("Maximum delta: %lu nanoseconds\n", max_delta);
    printf("Original bits: %d\n", SAMPLE_SIZE);
    printf("Debiased bytes: %lu\n", debiased_size);

    printf("\nFirst 32 raw bits: ");
    for(int i = 0; i < 32 && i < SAMPLE_SIZE; i++) {
        printf("%d", raw_bits[i]);
    }
    printf("\n");

    printf("First 32 debiased bits: ");
    for(int i = 0; i < 32 && i < debiased_size * 8; i++) {
        printf("%d", (debiased_bits[i/8] >> (7-(i%8))) & 1);
    }
    printf("\n");

    // Write debiased bits to file
    FILE *f = fopen("random.bin", "ab");
    if (f) {
        fwrite(debiased_bits, 1, debiased_size, f);
        fclose(f);
        printf("Wrote %lu bytes to random.bin\n", debiased_size);
    }

    gpiod_line_release(line);
    gpiod_chip_close(chip);
    return 0;
}
