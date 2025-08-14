#include <stdio.h>
#include <stdlib.h>
#include <gpiod.h>
#include <time.h>
#include <unistd.h>
#include <string.h>
#include <stdint.h>

#define GPIO_LINE 5
#define GPIO_CHIP "gpiochip0"


int main(void) {
    struct gpiod_chip *chip;
    struct gpiod_line *line;
    int rv;
    struct timespec last_time = {0, 0};
    uint64_t min_delta = UINT64_MAX;
    uint64_t max_delta = 0;
    uint64_t delta_ns = 0;

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
	            .request_type = GPIOD_LINE_REQUEST_EVENT_RISING_EDGE,
		    .flags = GPIOD_LINE_REQUEST_FLAG_BIAS_DISABLE
    };

    rv = gpiod_line_request(line, &config, 0);
    if (rv < 0) {
        perror("Request line failed");
        gpiod_chip_close(chip);
        return 1;
    }


    while (1) {

        struct gpiod_line_event event;
        rv = gpiod_line_event_wait(line, NULL);

	if (rv == 1) {

	    gpiod_line_event_read(line, &event);

	    if (last_time.tv_sec != 0) {
	      delta_ns = (event.ts.tv_sec - last_time.tv_sec) * 1000000000ULL + (event.ts.tv_nsec - last_time.tv_nsec);

              if (delta_ns < min_delta) min_delta = delta_ns;
              if (delta_ns > max_delta) max_delta = delta_ns;

	      printf ("%ld\n", delta_ns);

	      fflush(stdout);
	    }
            last_time = event.ts;
        }
    }

    gpiod_line_release(line);
    gpiod_chip_close(chip);
    return 0;
}

//timestamp = event.ts.tv_sec * 1000000000ULL + event.ts.tv_nsec;
//printf("%ld, %ld, %ld, %ld\n", delta_ns, last_delta, delta_ns^last_delta, (delta_ns^last_delta)%2);
//printf("%ld", (delta_ns^last_delta)%2);
//printf("%ld.%09ld\n", event.ts.tv_sec, event.ts.tv_nsec);
//printf("%ld%09ld\n", event.ts.tv_sec, event.ts.tv_nsec);
//lastval=event.ts.tv_sec+event.ts.tv_nsec;
//lastval=event.ts.tv_nsec;
//printf("%ld\n", lastval);
//printf("%ld%09ld\n", event.ts.tv_sec, event.ts.tv_nsec);
//lastval=event.ts.tv_nsec;
//fflush(stdout);
