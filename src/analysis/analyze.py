#!/usr/bin/env python3
"""
TRNG Time-Domain Analysis Pipeline
Characterizes timestamp delta signals to identify periodic components
"""

import numpy as np
import sys
import argparse
from scipy import signal, stats
from scipy.fft import fft, fftfreq
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings('ignore')

class TRNGAnalyzer:
    def __init__(self, data, sample_rate=None):
        self.data = np.array(data)
        self.n_samples = len(data)
        
        # Estimate sample rate from mean interval if not provided
        if sample_rate is None:
            mean_interval_s = np.mean(data) / 1e9
            self.sample_rate = 1.0 / mean_interval_s
        else:
            self.sample_rate = sample_rate
            
    def basic_stats(self):
        """Compute basic statistical properties"""
        stats_dict = {
            'count': self.n_samples,
            'mean': np.mean(self.data),
            'std': np.std(self.data),
            'min': np.min(self.data),
            'max': np.max(self.data),
            'median': np.median(self.data),
            'q25': np.percentile(self.data, 25),
            'q75': np.percentile(self.data, 75),
            'skew': stats.skew(self.data),
            'kurtosis': stats.kurtosis(self.data),
            'entropy': self._shannon_entropy()
        }
        return stats_dict
    
    def _shannon_entropy(self, bins=256):
        """Calculate Shannon entropy"""
        hist, _ = np.histogram(self.data, bins=bins)
        prob = hist / np.sum(hist)
        prob = prob[prob > 0]  # Remove zeros
        return -np.sum(prob * np.log2(prob))
    
    def frequency_analysis(self, plot=False):
        """Perform FFT and identify dominant frequencies"""
        # Remove DC component
        data_centered = self.data - np.mean(self.data)
        
        # Apply window to reduce spectral leakage
        window = signal.windows.hann(len(data_centered))
        data_windowed = data_centered * window
        
        # Compute FFT
        fft_vals = fft(data_windowed)
        fft_freq = fftfreq(self.n_samples, d=1/self.sample_rate)
        
        # Get power spectrum (only positive frequencies)
        n_half = self.n_samples // 2
        power = np.abs(fft_vals[:n_half]) ** 2
        freq = fft_freq[:n_half]
        
        # Find peaks
        peaks, properties = signal.find_peaks(power, 
                                             height=np.max(power)*0.1,
                                             distance=10)
        
        dominant_freqs = []
        if len(peaks) > 0:
            # Sort by power
            sorted_idx = np.argsort(properties['peak_heights'])[::-1]
            for i in sorted_idx[:5]:  # Top 5 frequencies
                idx = peaks[i]
                dominant_freqs.append({
                    'frequency': freq[idx],
                    'period_ms': 1000.0 / freq[idx] if freq[idx] > 0 else np.inf,
                    'power': properties['peak_heights'][i],
                    'relative_power': properties['peak_heights'][i] / np.max(power)
                })
        
        if plot:
            plt.figure(figsize=(12, 6))
            plt.subplot(1, 2, 1)
            plt.semilogy(freq[:1000], power[:1000])
            plt.xlabel('Frequency (Hz)')
            plt.ylabel('Power')
            plt.title('Power Spectral Density')
            plt.grid(True, alpha=0.3)
            
            plt.subplot(1, 2, 2)
            # Plot spectrogram
            f, t, Sxx = signal.spectrogram(data_centered, fs=self.sample_rate, 
                                          nperseg=min(256, len(data_centered)))
            plt.pcolormesh(t, f[:50], Sxx[:50], shading='gouraud')
            plt.ylabel('Frequency [Hz]')
            plt.xlabel('Time [s]')
            plt.title('Spectrogram')
            plt.colorbar()
            
            plt.tight_layout()
            plt.savefig('frequency_analysis.png', dpi=150)
            print("Saved frequency_analysis.png")
        
        return dominant_freqs
    
    def autocorrelation_analysis(self, max_lag=1000):
        """Compute autocorrelation to find periodic patterns"""
        # Normalize data
        data_norm = (self.data - np.mean(self.data)) / np.std(self.data)
        
        # Compute autocorrelation
        autocorr = signal.correlate(data_norm, data_norm, mode='full')
        autocorr = autocorr[len(autocorr)//2:]
        autocorr = autocorr / autocorr[0]
        
        # Find peaks in autocorrelation
        peaks, _ = signal.find_peaks(autocorr[:max_lag], height=0.1)
        
        periodic_lags = []
        for peak in peaks[:5]:  # First 5 peaks
            if peak > 0:
                periodic_lags.append({
                    'lag': peak,
                    'correlation': autocorr[peak],
                    'period_ms': peak * np.mean(self.data) / 1e6
                })
        
        return periodic_lags, autocorr[:max_lag]
    
    def distribution_analysis(self, plot=False):
        """Analyze distribution properties"""
        # Test for exponential distribution (expected for random intervals)
        exp_params = stats.expon.fit(self.data)
        ks_stat, ks_pval = stats.kstest(self.data, lambda x: stats.expon.cdf(x, *exp_params))
        
        # Test for normality
        norm_stat, norm_pval = stats.normaltest(self.data)
        
        # Compute histogram
        hist, bins = np.histogram(self.data, bins=100, density=True)
        
        if plot:
            plt.figure(figsize=(12, 4))
            
            plt.subplot(1, 3, 1)
            plt.hist(self.data / 1e6, bins=100, density=True, alpha=0.7, label='Data')
            
            # Overlay fitted exponential
            x = np.linspace(np.min(self.data), np.max(self.data), 100)
            plt.plot(x / 1e6, stats.expon.pdf(x, *exp_params), 'r-', 
                    label=f'Exponential fit', linewidth=2)
            plt.xlabel('Delta (ms)')
            plt.ylabel('Density')
            plt.title('Distribution')
            plt.legend()
            
            plt.subplot(1, 3, 2)
            stats.probplot(self.data, dist="expon", plot=plt)
            plt.title('Exponential Q-Q Plot')
            
            plt.subplot(1, 3, 3)
            plt.plot(self.data[:1000] / 1e6)
            plt.xlabel('Sample')
            plt.ylabel('Delta (ms)')
            plt.title('Time Series (first 1000 samples)')
            
            plt.tight_layout()
            plt.savefig('distribution_analysis.png', dpi=150)
            print("Saved distribution_analysis.png")
        
        return {
            'exponential_ks_stat': ks_stat,
            'exponential_ks_pval': ks_pval,
            'normal_stat': norm_stat,
            'normal_pval': norm_pval,
            'likely_exponential': ks_pval > 0.05,
            'likely_normal': norm_pval > 0.05
        }
    
    def identify_patterns(self):
        """Identify potential non-random patterns"""
        patterns = []
        
        # Check for obvious periodicity
        diffs = np.diff(self.data)
        if np.std(diffs) < np.mean(diffs) * 0.1:
            patterns.append("Low variance in differences - possible regular sampling")
        
        # Check for clustering
        median = np.median(self.data)
        above = self.data > median
        runs = np.diff(np.where(np.diff(above))[0])
        if len(runs) > 0 and np.max(runs) > 20:
            patterns.append(f"Long runs detected (max: {np.max(runs)}) - possible bias")
        
        # Check for quantization
        unique_vals = len(np.unique(self.data))
        if unique_vals < self.n_samples * 0.1:
            patterns.append(f"Low unique values ({unique_vals}) - possible quantization")
        
        # Check for drift
        first_half = np.mean(self.data[:self.n_samples//2])
        second_half = np.mean(self.data[self.n_samples//2:])
        drift_ratio = abs(first_half - second_half) / np.mean(self.data)
        if drift_ratio > 0.2:
            patterns.append(f"Significant drift detected ({drift_ratio:.1%})")
        
        return patterns
    
    def generate_report(self):
        """Generate comprehensive analysis report"""
        print("=" * 60)
        print("TRNG TIMESTAMP DELTA ANALYSIS REPORT")
        print("=" * 60)
        
        # Basic statistics
        print("\n1. BASIC STATISTICS")
        print("-" * 40)
        stats = self.basic_stats()
        for key, val in stats.items():
            if key in ['mean', 'std', 'min', 'max', 'median', 'q25', 'q75']:
                print(f"  {key:12s}: {val/1e6:10.2f} ms")
            else:
                print(f"  {key:12s}: {val:10.3f}")
        
        # Frequency analysis
        print("\n2. FREQUENCY DOMAIN ANALYSIS")
        print("-" * 40)
        freqs = self.frequency_analysis()
        if freqs:
            print("  Dominant frequencies detected:")
            for f in freqs[:3]:
                print(f"    {f['frequency']:6.2f} Hz (period: {f['period_ms']:6.1f} ms, "
                      f"relative power: {f['relative_power']:.1%})")
        else:
            print("  No dominant frequencies detected")
        
        # Autocorrelation
        print("\n3. AUTOCORRELATION ANALYSIS")
        print("-" * 40)
        periodic_lags, _ = self.autocorrelation_analysis()
        if periodic_lags:
            print("  Periodic patterns detected:")
            for lag in periodic_lags[:3]:
                print(f"    Lag {lag['lag']:4d}: correlation={lag['correlation']:.3f}, "
                      f"period≈{lag['period_ms']:.1f} ms")
        else:
            print("  No significant periodic patterns")
        
        # Distribution analysis
        print("\n4. DISTRIBUTION ANALYSIS")
        print("-" * 40)
        dist = self.distribution_analysis()
        print(f"  Exponential fit: KS statistic={dist['exponential_ks_stat']:.4f}, "
              f"p-value={dist['exponential_ks_pval']:.4f}")
        if dist['likely_exponential']:
            print("  ✓ Data is consistent with exponential distribution (good for TRNG)")
        else:
            print("  ✗ Data deviates from exponential distribution")
        
        # Pattern detection
        print("\n5. PATTERN DETECTION")
        print("-" * 40)
        patterns = self.identify_patterns()
        if patterns:
            print("  Potential issues detected:")
            for p in patterns:
                print(f"    - {p}")
        else:
            print("  ✓ No obvious patterns detected")
        
        # Recommendations
        print("\n6. RECOMMENDATIONS")
        print("-" * 40)
        
        if freqs and freqs[0]['relative_power'] > 0.3:
            print("  • Strong periodic signal detected - apply notch filter at "
                  f"{freqs[0]['frequency']:.1f} Hz")
        
        if not dist['likely_exponential']:
            print("  • Non-exponential distribution - check hardware/environment")
        
        if stats['entropy'] < 6:
            print(f"  • Low entropy ({stats['entropy']:.1f} bits) - increase sampling precision")
        
        if patterns:
            print("  • Address detected patterns before bit extraction")
        
        print("\n" + "=" * 60)

def main():
    parser = argparse.ArgumentParser(description='Analyze TRNG timestamp deltas')
    parser.add_argument('--input', '-i', default='-', 
                       help='Input file (default: stdin)')
    parser.add_argument('--plot', '-p', action='store_true',
                       help='Generate visualization plots')
    parser.add_argument('--max-samples', '-n', type=int, default=None,
                       help='Maximum number of samples to analyze')
    
    args = parser.parse_args()
    
    # Load data
    if args.input == '-':
        data = [float(line.strip()) for line in sys.stdin if line.strip()]
    else:
        data = np.loadtxt(args.input)
    
    if args.max_samples:
        data = data[:args.max_samples]
    
    print(f"Loaded {len(data)} samples")
    
    # Analyze
    analyzer = TRNGAnalyzer(data)
    analyzer.generate_report()
    
    if args.plot:
        analyzer.frequency_analysis(plot=True)
        analyzer.distribution_analysis(plot=True)

if __name__ == '__main__':
    main()