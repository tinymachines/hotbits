#!/usr/bin/env python3
"""
Simplified TRNG extraction focusing on proven techniques
"""

import numpy as np
import sys
import argparse
from scipy import signal
import hashlib

class SimpleTRNGExtractor:
    def __init__(self):
        self.window_size = 256  # For adaptive threshold
        
    def extract_bits_adaptive(self, data):
        """Extract bits using adaptive threshold based on local statistics"""
        bits = []
        
        for i in range(len(data)):
            # Get local window
            start = max(0, i - self.window_size // 2)
            end = min(len(data), i + self.window_size // 2)
            window = data[start:end]
            
            if len(window) > 2:
                # Use median as threshold
                threshold = np.median(window)
                bit = 1 if data[i] > threshold else 0
                bits.append(bit)
        
        return np.array(bits, dtype=np.uint8)
    
    def von_neumann_debias(self, bits):
        """Von Neumann debiasing - proven technique"""
        output = []
        
        for i in range(0, len(bits) - 1, 2):
            if bits[i] == 0 and bits[i+1] == 1:
                output.append(0)
            elif bits[i] == 1 and bits[i+1] == 0:
                output.append(1)
            # Discard 00 and 11 pairs
        
        return np.array(output, dtype=np.uint8)
    
    def xor_fold(self, bits, fold_size=8):
        """XOR folding for entropy concentration"""
        output = []
        
        for i in range(0, len(bits) - fold_size + 1, fold_size):
            chunk = bits[i:i+fold_size]
            # XOR all bits in chunk
            folded = chunk[0]
            for j in range(1, fold_size):
                folded ^= chunk[j]
            output.append(folded)
        
        return np.array(output, dtype=np.uint8)
    
    def sha256_whitening(self, bits):
        """Final whitening with SHA-256"""
        # Pack bits to bytes
        if len(bits) % 8 != 0:
            bits = np.pad(bits, (0, 8 - len(bits) % 8))
        
        bytes_data = np.packbits(bits)
        
        # Hash for cryptographic whitening
        h = hashlib.sha256(bytes_data).digest()
        
        # Convert back to bits
        output_bits = np.unpackbits(np.frombuffer(h, dtype=np.uint8))
        return output_bits
    
    def process(self, data):
        """Main processing pipeline"""
        # Step 1: Remove outliers (simple approach)
        q1 = np.percentile(data, 25)
        q3 = np.percentile(data, 75)
        iqr = q3 - q1
        lower_bound = q1 - 3 * iqr
        upper_bound = q3 + 3 * iqr
        
        # Keep data within bounds
        filtered_data = data[(data >= lower_bound) & (data <= upper_bound)]
        
        if len(filtered_data) < 100:
            filtered_data = data  # Use all data if too much was filtered
        
        # Step 2: Extract bits with adaptive threshold
        raw_bits = self.extract_bits_adaptive(filtered_data)
        
        # Step 3: Von Neumann debiasing
        debiased_bits = self.von_neumann_debias(raw_bits)
        
        # Step 4: XOR folding for additional entropy concentration
        if len(debiased_bits) > 16:
            folded_bits = self.xor_fold(debiased_bits, fold_size=8)
        else:
            folded_bits = debiased_bits
        
        # Step 5: Process in blocks with SHA-256
        output_bits = []
        block_size = 256  # Process 256 bits at a time
        
        for i in range(0, len(folded_bits), block_size):
            block = folded_bits[i:i+block_size]
            if len(block) >= 32:  # Need at least 32 bits for meaningful hashing
                hashed = self.sha256_whitening(block)
                output_bits.extend(hashed[:min(len(block), 256)])  # Don't expand data
        
        # Add any remaining bits
        remainder_start = (len(folded_bits) // block_size) * block_size
        if remainder_start < len(folded_bits):
            output_bits.extend(folded_bits[remainder_start:])
        
        return np.array(output_bits, dtype=np.uint8)

def test_randomness(bits):
    """Quick randomness tests"""
    if len(bits) == 0:
        return {"passed": False, "reason": "No bits generated"}
    
    results = {}
    
    # Test 1: Frequency test (monobit)
    n_ones = np.sum(bits)
    n_zeros = len(bits) - n_ones
    bias = abs(n_ones - n_zeros) / len(bits)
    results['frequency'] = bias < 0.01  # Should be close to 0
    
    # Test 2: Runs test
    if len(bits) > 1:
        runs = 1
        for i in range(1, len(bits)):
            if bits[i] != bits[i-1]:
                runs += 1
        expected_runs = (2 * n_ones * n_zeros) / len(bits) + 1
        if expected_runs > 0:
            runs_ratio = abs(runs - expected_runs) / expected_runs
            results['runs'] = runs_ratio < 0.1
        else:
            results['runs'] = False
    
    # Test 3: Chi-square test
    if len(bits) >= 100:
        # Group into bytes
        n_bytes = len(bits) // 8
        byte_counts = {}
        for i in range(n_bytes):
            byte_val = 0
            for j in range(8):
                byte_val = (byte_val << 1) | bits[i*8 + j]
            byte_counts[byte_val] = byte_counts.get(byte_val, 0) + 1
        
        # Chi-square calculation
        expected = n_bytes / 256
        chi_square = 0
        for i in range(256):
            observed = byte_counts.get(i, 0)
            chi_square += ((observed - expected) ** 2) / expected
        
        # Rough threshold for 256 degrees of freedom
        results['chi_square'] = chi_square < 300
    
    results['passed'] = all(results.values())
    return results

def main():
    parser = argparse.ArgumentParser(description='Simple TRNG extraction')
    parser.add_argument('--output', '-o', default='binary',
                       choices=['binary', 'hex', 'bits'],
                       help='Output format')
    parser.add_argument('--stats', '-s', action='store_true',
                       help='Print statistics')
    parser.add_argument('--test', '-t', action='store_true',
                       help='Run randomness tests')
    
    args = parser.parse_args()
    
    # Read data
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
    
    # Process
    extractor = SimpleTRNGExtractor()
    output_bits = extractor.process(data)
    
    if args.stats or args.test:
        print(f"# Input samples: {len(data)}", file=sys.stderr)
        print(f"# Output bits: {len(output_bits)}", file=sys.stderr)
        
        if len(output_bits) > 0:
            print(f"# Compression: {len(output_bits)/len(data):.3f} bits/sample", file=sys.stderr)
            
            n_ones = np.sum(output_bits)
            n_zeros = len(output_bits) - n_ones
            balance = n_ones / len(output_bits)
            print(f"# Bit balance: {balance:.4f} (ideal: 0.5000)", file=sys.stderr)
            
            if args.test:
                test_results = test_randomness(output_bits)
                print(f"# Randomness tests:", file=sys.stderr)
                for test_name, passed in test_results.items():
                    if test_name != 'passed':
                        status = "PASS" if passed else "FAIL"
                        print(f"#   {test_name}: {status}", file=sys.stderr)
                print(f"# Overall: {'PASS' if test_results['passed'] else 'FAIL'}", file=sys.stderr)
    
    # Output
    if len(output_bits) > 0:
        if args.output == 'binary':
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