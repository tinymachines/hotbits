#!/usr/bin/env python3
"""
TRNG Randomness Testing Wrapper
Automates testing with dieharder and NIST tests
"""

import subprocess
import sys
import os
import tempfile
import argparse
import json
import time
import numpy as np
from pathlib import Path

class RandomnessTest:
    def __init__(self, verbose=False):
        self.verbose = verbose
        self.results = {}
        
    def quick_tests(self, data):
        """Quick statistical tests (< 1 second)"""
        results = {}
        
        # Convert to bits if needed
        if isinstance(data, bytes):
            bits = np.unpackbits(np.frombuffer(data, dtype=np.uint8))
        else:
            bits = data
        
        # Frequency test (monobit)
        n_ones = np.sum(bits)
        n_zeros = len(bits) - n_ones
        frequency = n_ones / len(bits)
        results['frequency'] = {
            'value': frequency,
            'pass': 0.45 < frequency < 0.55,
            'ideal': 0.5
        }
        
        # Runs test
        runs = []
        current_run = 1
        for i in range(1, len(bits)):
            if bits[i] == bits[i-1]:
                current_run += 1
            else:
                runs.append(current_run)
                current_run = 1
        runs.append(current_run)
        
        max_run = max(runs) if runs else 0
        avg_run = np.mean(runs) if runs else 0
        
        results['runs'] = {
            'max_run': max_run,
            'avg_run': avg_run,
            'pass': max_run < 20,  # Rough threshold
        }
        
        # Chi-square test on bytes
        if len(data) >= 256:
            bytes_data = np.packbits(bits[:len(bits)//8*8])
            observed, _ = np.histogram(bytes_data, bins=256, range=(0, 256))
            expected = len(bytes_data) / 256
            chi_square = np.sum((observed - expected)**2 / expected)
            # Critical value for 255 df at 0.05 significance ≈ 293
            results['chi_square'] = {
                'value': chi_square,
                'pass': 200 < chi_square < 350,
                'df': 255
            }
        
        # Compression test
        if isinstance(data, bytes):
            import zlib
            compressed = zlib.compress(data, level=9)
            ratio = len(compressed) / len(data)
            results['compression'] = {
                'ratio': ratio,
                'pass': ratio > 0.95,  # Good random data doesn't compress well
                'ideal': 1.0
            }
        
        return results
    
    def dieharder_test(self, data, test_ids=None, quick=False):
        """Run dieharder tests"""
        results = {}
        
        # Write data to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.bin') as f:
            if isinstance(data, bytes):
                f.write(data)
            else:
                # Convert bits to bytes
                bits_padded = np.pad(data, (0, 8 - len(data) % 8))
                bytes_data = np.packbits(bits_padded)
                f.write(bytes_data.tobytes())
            temp_file = f.name
        
        try:
            if quick:
                # Quick subset of tests
                test_ids = [0, 1, 2, 3, 4, 5, 6, 7, 8, 15]  # Fast tests
            elif test_ids is None:
                test_ids = range(0, 18)  # All diehard tests
            
            for test_id in test_ids:
                if self.verbose:
                    print(f"Running dieharder test {test_id}...", file=sys.stderr)
                
                cmd = ['dieharder', '-g', '201', '-f', temp_file, '-d', str(test_id)]
                
                try:
                    result = subprocess.run(cmd, capture_output=True, text=True, 
                                          timeout=30)
                    
                    # Parse output
                    lines = result.stdout.strip().split('\n')
                    for line in lines:
                        if 'PASSED' in line or 'WEAK' in line or 'FAILED' in line:
                            parts = line.split()
                            if len(parts) >= 3:
                                test_name = ' '.join(parts[:-3])
                                p_value = float(parts[-2]) if parts[-2] != 'n/a' else None
                                assessment = parts[-1]
                                
                                results[test_name] = {
                                    'p_value': p_value,
                                    'assessment': assessment,
                                    'pass': assessment in ['PASSED', 'WEAK']
                                }
                
                except subprocess.TimeoutExpired:
                    if self.verbose:
                        print(f"Test {test_id} timed out", file=sys.stderr)
                except Exception as e:
                    if self.verbose:
                        print(f"Error running test {test_id}: {e}", file=sys.stderr)
        
        finally:
            os.unlink(temp_file)
        
        return results
    
    def nist_sts_test(self, data):
        """Run NIST Statistical Test Suite (if available)"""
        # This would require NIST STS to be installed and configured
        # For now, we'll implement a subset of tests
        results = {}
        
        if isinstance(data, bytes):
            bits = np.unpackbits(np.frombuffer(data, dtype=np.uint8))
        else:
            bits = data
        
        # Frequency test
        n = len(bits)
        s = 2 * np.sum(bits) - n
        s_obs = abs(s) / np.sqrt(n)
        p_value = 2 * (1 - self._normal_cdf(s_obs))
        
        results['frequency'] = {
            'statistic': s_obs,
            'p_value': p_value,
            'pass': p_value > 0.01
        }
        
        # Block frequency test (m=128)
        m = 128
        if n >= m:
            n_blocks = n // m
            chi_square = 0
            for i in range(n_blocks):
                block = bits[i*m:(i+1)*m]
                pi = np.sum(block) / m
                chi_square += (pi - 0.5)**2
            
            chi_square *= 4 * m
            p_value = 1 - self._chi_square_cdf(chi_square, n_blocks)
            
            results['block_frequency'] = {
                'chi_square': chi_square,
                'p_value': p_value,
                'pass': p_value > 0.01
            }
        
        return results
    
    def _normal_cdf(self, x):
        """Approximate normal CDF"""
        from math import erf, sqrt
        return 0.5 * (1 + erf(x / sqrt(2)))
    
    def _chi_square_cdf(self, x, df):
        """Approximate chi-square CDF"""
        from scipy import stats
        return stats.chi2.cdf(x, df)
    
    def generate_report(self, all_results):
        """Generate test report"""
        print("\n" + "=" * 60)
        print("RANDOMNESS TEST REPORT")
        print("=" * 60)
        
        for test_suite, results in all_results.items():
            print(f"\n{test_suite.upper()}")
            print("-" * 40)
            
            if not results:
                print("  No results")
                continue
            
            passed = sum(1 for r in results.values() if r.get('pass', False))
            total = len(results)
            
            print(f"  Passed: {passed}/{total} ({100*passed/total:.1f}%)")
            
            # Show failures
            failures = [name for name, r in results.items() if not r.get('pass', False)]
            if failures and len(failures) <= 5:
                print(f"  Failed: {', '.join(failures)}")
            elif failures:
                print(f"  Failed: {len(failures)} tests")
            
            # Show details for quick tests
            if test_suite == 'quick' and self.verbose:
                for name, result in results.items():
                    status = "✓" if result.get('pass') else "✗"
                    if 'value' in result:
                        print(f"    {status} {name}: {result['value']:.4f}")
        
        print("\n" + "=" * 60)

def main():
    parser = argparse.ArgumentParser(description='Test randomness of TRNG output')
    parser.add_argument('--input', '-i', default='-',
                       help='Input file (default: stdin)')
    parser.add_argument('--size', '-n', type=int, default=1000000,
                       help='Number of bytes to test')
    parser.add_argument('--quick', '-q', action='store_true',
                       help='Run quick tests only')
    parser.add_argument('--dieharder', '-d', action='store_true',
                       help='Run dieharder tests')
    parser.add_argument('--all', '-a', action='store_true',
                       help='Run all available tests')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Verbose output')
    parser.add_argument('--json', '-j', action='store_true',
                       help='Output results as JSON')
    
    args = parser.parse_args()
    
    # Read data
    if args.input == '-':
        data = sys.stdin.buffer.read(args.size)
    else:
        with open(args.input, 'rb') as f:
            data = f.read(args.size)
    
    print(f"Testing {len(data)} bytes of data", file=sys.stderr)
    
    tester = RandomnessTest(verbose=args.verbose)
    all_results = {}
    
    # Quick tests (always run)
    all_results['quick'] = tester.quick_tests(data)
    
    # Dieharder tests
    if args.dieharder or args.all:
        if len(data) < 10000:
            print("Warning: Dieharder needs at least 10KB of data", file=sys.stderr)
        else:
            all_results['dieharder'] = tester.dieharder_test(data, quick=args.quick)
    
    # NIST tests
    if args.all:
        all_results['nist'] = tester.nist_sts_test(data)
    
    # Output results
    if args.json:
        print(json.dumps(all_results, indent=2))
    else:
        tester.generate_report(all_results)
    
    # Return exit code based on pass rate
    total_tests = sum(len(r) for r in all_results.values())
    passed_tests = sum(sum(1 for t in r.values() if t.get('pass', False)) 
                      for r in all_results.values())
    
    pass_rate = passed_tests / total_tests if total_tests > 0 else 0
    exit(0 if pass_rate > 0.8 else 1)

if __name__ == '__main__':
    main()