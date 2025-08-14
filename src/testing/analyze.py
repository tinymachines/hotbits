import numpy as np
from scipy import stats
import re
import sys

def extract_pvalues(dieharder_output):
    pattern = r'\|\s*[\d\.]+\s*\|\s*([\d\.]+)\s*\|\s*PASSED|FAILED'
    pvalues = [float(match) for line in dieharder_output.split('\n')
               if (match := re.search(pattern, line))]
    return np.array(pvalues)

def compute_composite_score(pvalues):
    # KS test against uniform distribution
    ks_stat, ks_pvalue = stats.kstest(pvalues, 'uniform')
    
    # Basic statistics
    metrics = {
        'ks_pvalue': ks_pvalue,
        'min_pvalue': np.min(pvalues),
        'mean_pvalue': np.mean(pvalues),
        'std_pvalue': np.std(pvalues),
        'uniformity_score': 1 - ks_stat  # Higher is better
    }
    
    return metrics

def main():
    dieharder_output = sys.stdin.read()
    pvalues = extract_pvalues(dieharder_output)
    metrics = compute_composite_score(pvalues)
    
    print("\nDieharder Composite Analysis:")
    print(f"Uniformity Score (higher=better): {metrics['uniformity_score']:.4f}")
    print(f"KS-test p-value: {metrics['ks_pvalue']:.4f}")
    print(f"Min p-value: {metrics['min_pvalue']:.4f}")
    print(f"Mean p-value: {metrics['mean_pvalue']:.4f}")
    print(f"Std p-value: {metrics['std_pvalue']:.4f}")

if __name__ == "__main__":
    main()
