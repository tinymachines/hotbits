#!/usr/bin/env python3
"""
TRNG Bit Extraction Pipeline
Converts filtered timestamp deltas into random bit streams
"""

import numpy as np
import sys
import argparse
import hashlib
from scipy import signal
from collections import deque

class BitExtractor:
    def __init__(self, method='adaptive_threshold', **kwargs):
        self.method = method
        self.params = kwargs
        self.buffer = deque()
        self.state = {}
        
    def extract(self, data):
        """Extract bits from timestamp deltas"""
        if self.method == 'adaptive_threshold':
            return self._adaptive_threshold(data)
        elif self.method == 'lsb':
            return self._lsb_extraction(data)
        elif self.method == 'differential':
            return self._differential(data)
        elif self.method == 'von_neumann':
            return self._von_neumann(data)
        elif self.method == 'xor_fold':
            return self._xor_fold(data)
        elif self.method == 'phase':
            return self._phase_extraction(data)
        else:
            raise ValueError(f"Unknown method: {self.method}")
    
    def _adaptive_threshold(self, data):
        """Adaptive threshold based on sliding window median"""
        window_size = self.params.get('window', 100)
        bits = []
        
        for i in range(len(data)):
            # Get window around current sample
            start = max(0, i - window_size // 2)
            end = min(len(data), i + window_size // 2)
            window = data[start:end]
            
            if len(window) > 1:
                threshold = np.median(window)
                bit = 1 if data[i] > threshold else 0
                bits.append(bit)
        
        return np.array(bits)
    
    def _lsb_extraction(self, data):
        """Extract least significant bits"""
        n_bits = self.params.get('n_bits', 8)
        bits = []
        
        for value in data:
            int_val = int(value)
            for bit_pos in range(n_bits):
                bit = (int_val >> bit_pos) & 1
                bits.append(bit)
        
        return np.array(bits)
    
    def _differential(self, data):
        """Compare consecutive values"""
        lag = self.params.get('lag', 1)
        bits = []
        
        for i in range(lag, len(data)):
            bit = 1 if data[i] > data[i-lag] else 0
            bits.append(bit)
        
        return np.array(bits)
    
    def _von_neumann(self, data):
        """Von Neumann debiasing"""
        # First get raw bits
        threshold = np.median(data)
        raw_bits = (data > threshold).astype(int)
        
        # Apply Von Neumann
        bits = []
        for i in range(0, len(raw_bits)-1, 2):
            if raw_bits[i] != raw_bits[i+1]:
                bits.append(raw_bits[i])
        
        return np.array(bits)
    
    def _xor_fold(self, data):
        """XOR folding for whitening"""
        # Get raw bits
        threshold = np.median(data)
        raw_bits = (data > threshold).astype(int)
        
        # XOR fold
        fold_size = self.params.get('fold_size', 8)
        bits = []
        
        for i in range(0, len(raw_bits) - fold_size + 1, fold_size):
            chunk = raw_bits[i:i+fold_size]
            folded_bit = np.sum(chunk) % 2
            bits.append(folded_bit)
        
        return np.array(bits)
    
    def _phase_extraction(self, data):
        """Extract phase information relative to detected period"""
        # Detect dominant period via autocorrelation
        autocorr = np.correlate(data - np.mean(data), data - np.mean(data), mode='full')
        autocorr = autocorr[len(autocorr)//2:]
        
        # Find first peak after lag 0
        peaks = signal.find_peaks(autocorr[:1000], height=autocorr[0]*0.1)[0]
        
        if len(peaks) > 0:
            period = peaks[0]
        else:
            period = 100  # Default period
        
        bits = []
        for i in range(len(data)):
            phase = i % period
            bit = 1 if phase < period/2 else 0
            bits.append(bit)
        
        return np.array(bits)

class SignalFilter:
    def __init__(self, filter_type='highpass', **kwargs):
        self.filter_type = filter_type
        self.params = kwargs
        
    def filter(self, data):
        """Apply signal filtering"""
        if self.filter_type == 'highpass':
            return self._highpass(data)
        elif self.filter_type == 'bandpass':
            return self._bandpass(data)
        elif self.filter_type == 'notch':
            return self._notch(data)
        elif self.filter_type == 'detrend':
            return self._detrend(data)
        elif self.filter_type == 'normalize':
            return self._normalize(data)
        else:
            raise ValueError(f"Unknown filter: {self.filter_type}")
    
    def _highpass(self, data):
        """High-pass filter to remove low-frequency drift"""
        cutoff = self.params.get('cutoff', 0.01)
        order = self.params.get('order', 4)
        
        # Estimate sample rate
        mean_interval = np.mean(data) / 1e9
        fs = 1.0 / mean_interval
        
        # Design filter
        nyquist = fs / 2
        normal_cutoff = cutoff / nyquist
        
        if normal_cutoff >= 1:
            return data  # Cutoff too high, return original
        
        b, a = signal.butter(order, normal_cutoff, btype='high')
        filtered = signal.filtfilt(b, a, data)
        
        return filtered
    
    def _bandpass(self, data):
        """Band-pass filter"""
        low = self.params.get('low', 0.01)
        high = self.params.get('high', 10.0)
        order = self.params.get('order', 4)
        
        mean_interval = np.mean(data) / 1e9
        fs = 1.0 / mean_interval
        nyquist = fs / 2
        
        low_normal = low / nyquist
        high_normal = high / nyquist
        
        if low_normal >= 1 or high_normal >= 1:
            return data
        
        b, a = signal.butter(order, [low_normal, high_normal], btype='band')
        filtered = signal.filtfilt(b, a, data)
        
        return filtered
    
    def _notch(self, data):
        """Notch filter to remove specific frequency"""
        freq = self.params.get('freq', 60.0)
        Q = self.params.get('Q', 30.0)
        
        mean_interval = np.mean(data) / 1e9
        fs = 1.0 / mean_interval
        
        b, a = signal.iirnotch(freq, Q, fs)
        filtered = signal.filtfilt(b, a, data)
        
        return filtered
    
    def _detrend(self, data):
        """Remove linear or polynomial trend"""
        order = self.params.get('order', 1)
        
        if order == 'linear' or order == 1:
            return signal.detrend(data, type='linear')
        else:
            # Polynomial detrending
            x = np.arange(len(data))
            coeffs = np.polyfit(x, data, order)
            trend = np.polyval(coeffs, x)
            return data - trend
    
    def _normalize(self, data):
        """Normalize to zero mean and unit variance"""
        return (data - np.mean(data)) / np.std(data)

class PostProcessor:
    """Post-processing for cryptographic quality"""
    
    @staticmethod
    def sha256_whitening(bits, output_bits=256):
        """Use SHA-256 for whitening"""
        # Convert bits to bytes
        bytes_data = np.packbits(bits)
        
        # Hash
        h = hashlib.sha256(bytes_data).digest()
        
        # Convert back to bits
        output = np.unpackbits(np.frombuffer(h, dtype=np.uint8))
        return output[:output_bits]
    
    @staticmethod
    def von_neumann_debias(bits):
        """Von Neumann debiasing"""
        output = []
        for i in range(0, len(bits)-1, 2):
            if bits[i] != bits[i+1]:
                output.append(bits[i])
        return np.array(output)
    
    @staticmethod
    def peres_debias(bits):
        """More efficient Peres debiasing"""
        output = []
        i = 0
        while i < len(bits) - 1:
            if bits[i] != bits[i+1]:
                output.append(bits[i])
                i += 2
            else:
                # Look for next different pair
                j = i + 2
                while j < len(bits) - 1 and bits[j] == bits[j+1]:
                    j += 2
                if j < len(bits) - 1:
                    output.append(bits[j])
                i = j + 2
        return np.array(output)

def build_pipeline(config):
    """Build processing pipeline from configuration"""
    filters = []
    for filter_conf in config.get('filters', []):
        f_type = filter_conf.pop('type')
        filters.append(SignalFilter(f_type, **filter_conf))
    
    extractor_conf = config.get('extractor', {'method': 'adaptive_threshold'})
    method = extractor_conf.pop('method')
    extractor = BitExtractor(method, **extractor_conf)
    
    postproc = config.get('postprocess', [])
    
    return filters, extractor, postproc

def process_data(data, filters, extractor, postprocessors):
    """Process data through complete pipeline"""
    
    # Apply filters
    filtered = data
    for f in filters:
        filtered = f.filter(filtered)
    
    # Extract bits
    bits = extractor.extract(filtered)
    
    # Post-process
    for proc in postprocessors:
        if proc == 'von_neumann':
            bits = PostProcessor.von_neumann_debias(bits)
        elif proc == 'peres':
            bits = PostProcessor.peres_debias(bits)
        elif proc == 'sha256':
            bits = PostProcessor.sha256_whitening(bits)
    
    return bits

def main():
    parser = argparse.ArgumentParser(description='Extract random bits from timestamp deltas')
    parser.add_argument('--method', '-m', default='adaptive_threshold',
                       choices=['adaptive_threshold', 'lsb', 'differential', 
                               'von_neumann', 'xor_fold', 'phase'],
                       help='Extraction method')
    parser.add_argument('--filter', '-f', action='append', default=[],
                       help='Add filter (e.g., highpass:0.01)')
    parser.add_argument('--postprocess', '-p', action='append', default=[],
                       choices=['von_neumann', 'peres', 'sha256'],
                       help='Post-processing methods')
    parser.add_argument('--output', '-o', default='binary',
                       choices=['binary', 'hex', 'base64', 'bits'],
                       help='Output format')
    parser.add_argument('--stats', '-s', action='store_true',
                       help='Print statistics')
    
    args = parser.parse_args()
    
    # Read data
    data = np.array([float(line.strip()) for line in sys.stdin if line.strip()])
    
    # Build filters
    filters = []
    for filter_spec in args.filter:
        parts = filter_spec.split(':')
        if len(parts) == 2:
            filters.append(SignalFilter(parts[0], cutoff=float(parts[1])))
        else:
            filters.append(SignalFilter(parts[0]))
    
    # Create extractor
    extractor = BitExtractor(args.method)
    
    # Process
    bits = process_data(data, filters, extractor, args.postprocess)
    
    if args.stats:
        print(f"# Input samples: {len(data)}", file=sys.stderr)
        print(f"# Output bits: {len(bits)}", file=sys.stderr)
        print(f"# Compression: {len(bits)/len(data):.2f} bits/sample", file=sys.stderr)
        print(f"# Bit balance: {np.mean(bits):.3f} (ideal: 0.5)", file=sys.stderr)
    
    # Output
    if args.output == 'binary':
        # Pack bits into bytes and write binary
        if len(bits) % 8 != 0:
            # Pad with zeros
            bits = np.pad(bits, (0, 8 - len(bits) % 8))
        bytes_data = np.packbits(bits)
        sys.stdout.buffer.write(bytes_data.tobytes())
    elif args.output == 'hex':
        bytes_data = np.packbits(bits)
        print(bytes_data.tobytes().hex())
    elif args.output == 'base64':
        import base64
        bytes_data = np.packbits(bits)
        print(base64.b64encode(bytes_data.tobytes()).decode())
    elif args.output == 'bits':
        for bit in bits:
            sys.stdout.write(str(bit))

if __name__ == '__main__':
    main()