import numpy as np
from collections import deque
import sys

class TRNGProcessor:
    def __init__(self, calibration_size=10000, output_buffer_size=1024):
        self.calibration_size = calibration_size
        self.output_buffer_size = output_buffer_size
        self.threshold = None
        self.calibration_data = []
        self.bit_buffer = deque()
        
    def calibrate(self, time_deltas):
        """Calculate threshold from initial sample of time deltas"""
        hist, bins = np.histogram(time_deltas, bins=1000)
        cumsum = np.cumsum(hist)
        total_samples = cumsum[-1]
        median_idx = np.searchsorted(cumsum, total_samples / 2)
        self.threshold = bins[median_idx]
        return self.threshold
        
    def process_sample(self, time_delta):
        """Convert a single time delta to a bit"""
        return 1 if time_delta > self.threshold else 0
        
    def get_byte(self):
        """Accumulate 8 bits and return a byte"""
        while len(self.bit_buffer) < 8:
            return None
        byte = 0
        for _ in range(8):
            byte = (byte << 1) | self.bit_buffer.popleft()
        return byte
        
    def process_stream(self, input_stream):
        """Process stream of time deltas and yield random bytes"""
        # Calibration phase
        if self.threshold is None:
            calibration_data = []
            for _ in range(self.calibration_size):
                try:
                    delta = int(next(input_stream))
                    calibration_data.append(delta)
                except StopIteration:
                    break
            self.calibrate(calibration_data)
            
        # Processing phase
        for line in input_stream:
            delta = int(line)
            bit = self.process_sample(delta)
            self.bit_buffer.append(bit)
            
            if len(self.bit_buffer) >= 8:
                byte = self.get_byte()
                if byte is not None:
                    yield byte

def main():
    processor = TRNGProcessor()
    for byte in processor.process_stream(sys.stdin):
        sys.stdout.buffer.write(bytes([byte]))
        sys.stdout.buffer.flush()

if __name__ == "__main__":
    main()
