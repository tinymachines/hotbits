#!/usr/bin/env python3
"""
Improved TRNG Bit Extraction Pipeline
Addresses periodic signals and low entropy issues
"""

import numpy as np
import sys
import argparse
from scipy import signal
from collections import deque
import hashlib

class ImprovedTRNGPipeline:
    def __init__(self):
        self.sample_rate = None
        self.calibration_samples = 1000
        
    def estimate_sample_rate(self, data):
        """Estimate sampling rate from data"""
        mean_interval_ms = np.mean(data)
        self.sample_rate = 1000.0 / mean_interval_ms  # Hz
        return self.sample_rate
    
    def remove_periodic_signals(self, data):
        """Remove detected periodic components using notch filters"""
        # Estimate sample rate
        if self.sample_rate is None:
            self.estimate_sample_rate(data)
        
        # Detected problematic frequencies (Hz)
        notch_frequencies = [0.16, 0.38, 1.74]
        
        filtered = data.copy()
        
        for freq in notch_frequencies:
            try:
                if freq < self.sample_rate / 2:  # Below Nyquist
                    # Design notch filter with narrow Q
                    Q = 30.0  # Higher Q for narrower notch
                    w0 = freq / (self.sample_rate / 2)  # Normalized frequency
                    
                    # Use butterworth bandstop as alternative
                    low_freq = freq * 0.95
                    high_freq = freq * 1.05
                    
                    if high_freq < self.sample_rate / 2:
                        b, a = signal.butter(4, [low_freq/(self.sample_rate/2), 
                                                high_freq/(self.sample_rate/2)], 
                                              btype='bandstop')
                        filtered = signal.filtfilt(b, a, filtered)
            except:
                # Skip if filter design fails
                continue
        
        return filtered
    
    def apply_highpass_filter(self, data, cutoff=0.01):
        """Remove low-frequency drift and DC bias"""
        if self.sample_rate is None:
            self.estimate_sample_rate(data)
        
        nyquist = self.sample_rate / 2
        normal_cutoff = cutoff / nyquist
        
        if normal_cutoff >= 1:
            return data
        
        # 6th order Butterworth for sharper cutoff
        b, a = signal.butter(6, normal_cutoff, btype='high')
        filtered = signal.filtfilt(b, a, data)
        
        return filtered
    
    def differential_encoding(self, data):
        """Convert to differential values to remove trends"""
        return np.diff(data)
    
    def adaptive_bit_extraction(self, data, window_size=50):
        """Extract bits using adaptive local thresholds"""
        bits = []
        
        # Use sliding window for local statistics
        for i in range(len(data)):
            # Get local window
            start = max(0, i - window_size // 2)
            end = min(len(data), i + window_size // 2)
            window = data[start:end]
            
            if len(window) > 2:
                # Use robust statistics (median and MAD)
                median = np.median(window)
                mad = np.median(np.abs(window - median))
                
                # Adaptive threshold based on local distribution
                if mad > 0:
                    z_score = (data[i] - median) / (1.4826 * mad)
                    # Extract bit based on z-score
                    bit = 1 if z_score > 0 else 0
                else:
                    # Fallback to simple comparison
                    bit = 1 if data[i] > median else 0
                
                bits.append(bit)
        
        return np.array(bits)
    
    def multi_bit_extraction(self, data):
        """Extract multiple bits per sample using different techniques"""
        all_bits = []
        
        # Method 1: Threshold crossing
        median = np.median(data)
        bits1 = (data > median).astype(int)
        all_bits.append(bits1)
        
        # Method 2: LSB of integer part
        # Handle NaN and inf values
        clean_data = np.nan_to_num(data, nan=0.0, posinf=1e6, neginf=-1e6)
        int_data = np.abs(clean_data).astype(np.int64)
        bits2 = (int_data & 1).astype(int)
        all_bits.append(bits2)
        
        # Method 3: Differential comparison
        if len(data) > 1:
            diff = np.diff(data)
            diff_median = np.median(diff)
            bits3 = np.zeros(len(data), dtype=int)
            bits3[1:] = (diff > diff_median).astype(int)
            all_bits.append(bits3)
        
        # XOR combine for better entropy
        combined = all_bits[0].astype(int)
        for bits in all_bits[1:]:
            combined = combined ^ bits.astype(int)
        
        return combined
    
    def von_neumann_whitening(self, bits):
        """Apply Von Neumann debiasing for uniform distribution"""
        output = []
        i = 0
        
        while i < len(bits) - 1:
            if bits[i] == 0 and bits[i+1] == 1:
                output.append(0)
                i += 2
            elif bits[i] == 1 and bits[i+1] == 0:
                output.append(1)
                i += 2
            else:
                # Discard equal pairs
                i += 2
        
        return np.array(output)
    
    def xor_whitening(self, bits, block_size=16):
        """XOR-based whitening using overlapping blocks"""
        if len(bits) < block_size * 2:
            return bits
        
        output = []
        
        # Overlapping XOR for better mixing
        for i in range(0, len(bits) - block_size, block_size // 2):
            block1 = bits[i:i+block_size]
            block2 = bits[i+block_size//2:i+3*block_size//2]
            
            if len(block2) == block_size:
                xored = block1 ^ block2
                # Extract middle bits (less correlated)
                output.extend(xored[block_size//4:3*block_size//4])
        
        return np.array(output)
    
    def hash_whitening(self, bits, output_bits=256):
        """Use cryptographic hash for final whitening"""
        # Pack bits to bytes
        if len(bits) % 8 != 0:
            bits = np.pad(bits, (0, 8 - len(bits) % 8))
        
        bytes_data = np.packbits(bits)
        
        # Use SHA3-256 for better avalanche effect
        h = hashlib.sha3_256(bytes_data).digest()
        
        # Convert back to bits
        output = np.unpackbits(np.frombuffer(h, dtype=np.uint8))
        return output[:output_bits]
    
    def process(self, data):
        """Complete processing pipeline"""
        # Step 1: Preprocessing
        # Remove DC offset
        data = data - np.mean(data)
        
        # Step 2: Filter periodic signals (optional - may be too aggressive)
        # filtered = self.remove_periodic_signals(data)
        
        # Step 3: Apply high-pass filter
        filtered = self.apply_highpass_filter(data, cutoff=0.01)
        
        # Step 4: Differential encoding (skip if too few samples)
        if len(filtered) > 1:
            diff_data = self.differential_encoding(filtered)
        else:
            diff_data = filtered
        
        # Step 5: Multi-method bit extraction
        if len(diff_data) > 0:
            bits = self.multi_bit_extraction(diff_data)
        else:
            # Fallback to simple threshold
            median = np.median(data)
            bits = (data > median).astype(int)
        
        # Step 6: Von Neumann debiasing (if we have enough bits)
        if len(bits) > 100:
            debiased = self.von_neumann_whitening(bits)
        else:
            debiased = bits
        
        # Step 7: XOR whitening (if we have enough bits)
        if len(debiased) > 32:
            whitened = self.xor_whitening(debiased)
        else:
            whitened = debiased
        
        # Step 8: Return raw whitened bits if too few for hash
        if len(whitened) < 512:
            return whitened
        
        # Final hash whitening for blocks
        final_bits = []
        block_size = 512  # Process in 512-bit blocks
        
        for i in range(0, len(whitened) - block_size + 1, block_size):
            block = whitened[i:i+block_size]
            hashed = self.hash_whitening(block, 256)
            final_bits.extend(hashed)
        
        # Add remaining bits without hashing
        remainder = len(whitened) % block_size
        if remainder > 0:
            final_bits.extend(whitened[-remainder:])
        
        return np.array(final_bits, dtype=int)

def main():
    parser = argparse.ArgumentParser(description='Improved TRNG bit extraction')
    parser.add_argument('--output', '-o', default='binary',
                       choices=['binary', 'hex', 'bits'],
                       help='Output format')
    parser.add_argument('--stats', '-s', action='store_true',
                       help='Print statistics')
    
    args = parser.parse_args()
    
    # Read timestamp deltas from stdin
    data = []
    for line in sys.stdin:
        try:
            value = float(line.strip())
            data.append(value)
        except ValueError:
            continue
    
    data = np.array(data)
    
    if len(data) < 100:
        print("Error: Need at least 100 samples", file=sys.stderr)
        sys.exit(1)
    
    # Process data
    pipeline = ImprovedTRNGPipeline()
    output_bits = pipeline.process(data)
    
    if args.stats:
        # Calculate statistics
        if len(output_bits) > 0:
            bit_balance = np.mean(output_bits)
            
            # Run frequency test
            n_ones = np.sum(output_bits)
            n_zeros = len(output_bits) - n_ones
            chi_square = ((n_ones - n_zeros) ** 2) / len(output_bits) if len(output_bits) > 0 else 0
            
            print(f"# Input samples: {len(data)}", file=sys.stderr)
            print(f"# Output bits: {len(output_bits)}", file=sys.stderr)
            print(f"# Compression ratio: {len(output_bits)/len(data):.3f} bits/sample", file=sys.stderr)
            print(f"# Bit balance: {bit_balance:.4f} (ideal: 0.5000)", file=sys.stderr)
            print(f"# Chi-square: {chi_square:.4f} (lower is better)", file=sys.stderr)
            
            # Autocorrelation check
            if len(output_bits) > 1000:
                autocorr = np.correlate(output_bits - 0.5, output_bits - 0.5, mode='same')
                autocorr = autocorr / autocorr[len(autocorr)//2]
                max_autocorr = np.max(np.abs(autocorr[len(autocorr)//2+1:len(autocorr)//2+100]))
                print(f"# Max autocorrelation (lag 1-100): {max_autocorr:.4f}", file=sys.stderr)
        else:
            print(f"# Error: No bits produced from {len(data)} samples", file=sys.stderr)
    
    # Output
    if args.output == 'binary':
        # Pack bits into bytes
        if len(output_bits) % 8 != 0:
            output_bits = np.pad(output_bits, (0, 8 - len(output_bits) % 8))
        bytes_data = np.packbits(output_bits)
        sys.stdout.buffer.write(bytes_data.tobytes())
    elif args.output == 'hex':
        if len(output_bits) % 8 != 0:
            output_bits = np.pad(output_bits, (0, 8 - len(output_bits) % 8))
        bytes_data = np.packbits(output_bits)
        print(bytes_data.tobytes().hex())
    elif args.output == 'bits':
        for bit in output_bits:
            sys.stdout.write(str(bit))

if __name__ == '__main__':
    main()