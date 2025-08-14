#!/usr/bin/env python3
import sys
import numpy as np
from scipy import stats
from collections import defaultdict
import json

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NumpyEncoder, self).default(obj)

def analyze_clustering(intervals):
    """
    Analyze event clustering using various statistical measures
    """
    # Calculate Fano factor for different window sizes
    window_sizes = [10, 100, 1000, 10000]  # ms
    fano_factors = {}
    
    for window in window_sizes:
        # Convert window size to ns
        window_ns = window * 1e6
        # Count events in each window
        total_time = float(intervals.sum())
        n_windows = int(total_time / window_ns)
        if n_windows > 1:
            counts = np.zeros(n_windows)
            current_time = 0
            current_window = 0
            current_count = 0
            
            for interval in intervals:
                current_time += interval
                while current_time > (current_window + 1) * window_ns and current_window < n_windows - 1:
                    counts[current_window] = current_count
                    current_window += 1
                    current_count = 0
                current_count += 1
            
            # Add last window
            counts[current_window] = current_count
            
            # Calculate Fano factor
            fano = float(np.var(counts) / np.mean(counts)) if np.mean(counts) > 0 else float('nan')
            fano_factors[window] = fano
    
    # Calculate Allan variance for different tau values
    def allan_variance(data, tau):
        """Calculate Allan variance for given tau."""
        n = len(data)
        m = int(n / tau) * tau
        if m == 0:
            return float('nan')
        
        # Reshape data into tau-sized chunks
        y = data[:m].reshape(-1, tau).sum(axis=1)
        
        # Calculate Allan variance
        return float(np.sum(np.diff(y) ** 2) / (2 * len(y) - 2)) if len(y) > 1 else float('nan')

    # Calculate Allan variance for different tau values
    taus = [2, 4, 8, 16, 32]
    allan_vars = {tau: allan_variance(intervals, tau) for tau in taus}
    
    # Runs test for randomness (with overflow protection)
    median = float(np.median(intervals))
    binary_seq = intervals > median
    runs = np.diff(binary_seq.astype(int)).nonzero()[0].size + 1
    n_pos = int(np.sum(binary_seq))
    n_neg = int(len(intervals) - n_pos)
    
    try:
        # Calculate runs test statistics with overflow protection
        exp_runs = float(2 * n_pos * n_neg / (n_pos + n_neg) + 1)
        var_runs = float(2 * n_pos * n_neg * (2 * n_pos * n_neg - n_pos - n_neg) / 
                        ((n_pos + n_neg)**2 * (n_pos + n_neg - 1)))
        
        if var_runs > 0:
            z_score = float((runs - exp_runs) / np.sqrt(var_runs))
            p_value = float(2 * (1 - stats.norm.cdf(abs(z_score))))
        else:
            z_score = float('nan')
            p_value = float('nan')
    except:
        z_score = float('nan')
        p_value = float('nan')
    
    return {
        'fano_factors': fano_factors,
        'allan_variances': allan_vars,
        'runs_test': {
            'runs': int(runs),
            'z_score': z_score,
            'p_value': p_value
        }
    }

def analyze_periodicity(intervals):
    """
    Analyze periodicity
    """
    # Calculate autocorrelation up to 100 lags
    n_lags = min(100, len(intervals) - 1)
    intervals_norm = intervals - np.mean(intervals)
    acf = np.correlate(intervals_norm, intervals_norm, mode='full')[len(intervals)-1:len(intervals)+n_lags]
    acf = acf / acf[0]  # Normalize
    
    # Find peaks in autocorrelation
    peaks = []
    for i in range(1, len(acf)-1):
        if acf[i] > acf[i-1] and acf[i] > acf[i+1] and acf[i] > 0.1:
            peaks.append((int(i), float(acf[i])))
    
    # Calculate interval distribution entropy
    hist, _ = np.histogram(intervals, bins='auto')
    hist = hist / hist.sum()
    entropy = float(-np.sum(hist * np.log2(hist + 1e-10)))
    
    return {
        'autocorr': {
            'values': [float(x) for x in acf],
            'peaks': peaks
        },
        'interval_entropy': entropy
    }

def main():
    # Read timestamps from stdin
    timestamps = []
    for line in sys.stdin:
        try:
            timestamps.append(int(line.strip()))
        except ValueError:
            continue
    
    if len(timestamps) < 2:
        print("Error: Not enough timestamps provided")
        sys.exit(1)
    
    # Sort timestamps and calculate intervals
    timestamps = np.array(sorted(timestamps))
    intervals = np.diff(timestamps)
    
    # Basic statistics
    stats_dict = {
        'n_events': int(len(timestamps)),
        'total_time_ns': int(timestamps[-1] - timestamps[0]),
        'mean_interval_ns': float(np.mean(intervals)),
        'median_interval_ns': float(np.median(intervals)),
        'std_interval_ns': float(np.std(intervals)),
        'min_interval_ns': int(np.min(intervals)),
        'max_interval_ns': int(np.max(intervals)),
        'cv': float(np.std(intervals) / np.mean(intervals))
    }
    
    # Clustering analysis
    clustering = analyze_clustering(intervals)
    
    # Periodicity analysis
    periodicity = analyze_periodicity(intervals)
    
    # Output results as JSON
    results = {
        'basic_stats': stats_dict,
        'clustering': clustering,
        'periodicity': periodicity
    }
    
    print(json.dumps(results, indent=2, cls=NumpyEncoder))

if __name__ == "__main__":
    main()
