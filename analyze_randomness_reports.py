#!/usr/bin/env python3
"""
Analyze TRNG randomness test reports and generate failure rate charts.

This script parses NIST Statistical Test Suite and Dieharder test results
to track failure rates and p-values over time.
"""

import os
import re
import glob
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime
from collections import defaultdict
import numpy as np

def parse_timestamp_from_filename(filename):
    """Extract timestamp from filename like '1755896724-dieharder.txt'"""
    basename = os.path.basename(filename)
    timestamp_str = basename.split('-')[0]
    return int(timestamp_str)

def parse_nist_report(filepath):
    """Parse NIST final analysis report and extract test results."""
    results = {
        'timestamp': parse_timestamp_from_filename(filepath),
        'total_tests': 0,
        'failed_tests': 0,
        'p_values': [],
        'failed_test_names': []
    }
    
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    # Look for lines containing proportions (x/y format)
    for line in lines:
        line = line.strip()
        
        # Skip empty lines, separators, and headers
        if (not line or line.startswith('---') or 'generator is' in line or 
            'STATISTICAL TEST' in line or 'RESULTS FOR' in line):
            continue
            
        parts = line.split()
        
        # Look for proportion pattern (x/y) and test name
        for i, part in enumerate(parts):
            if '/' in part and part.replace('/', '').replace('0', '').replace('1', '').replace('2', '').replace('3', '').replace('4', '').replace('5', '').replace('6', '').replace('7', '').replace('8', '').replace('9', '') == '':
                # Found a proportion like 0/1, 1/1, etc.
                if i + 1 < len(parts):
                    proportion = part
                    test_name = parts[i + 1]
                    
                    try:
                        passed, total = proportion.split('/')
                        results['total_tests'] += int(total)
                        
                        if int(passed) == 0:
                            results['failed_tests'] += int(total)
                            results['failed_test_names'].append(test_name)
                    except ValueError:
                        continue
                    
                    # Try to find p-value (look for float values before proportion)
                    for j in range(max(0, i-3), i):
                        try:
                            p_val = float(parts[j])
                            if 0 <= p_val <= 1:
                                results['p_values'].append(p_val)
                                break
                        except (ValueError, IndexError):
                            continue
                    
                break
    
    return results

def parse_dieharder_report(filepath):
    """Parse Dieharder test report and extract test results."""
    results = {
        'timestamp': parse_timestamp_from_filename(filepath),
        'total_tests': 0,
        'failed_tests': 0,
        'weak_tests': 0,
        'p_values': [],
        'failed_test_names': [],
        'weak_test_names': []
    }
    
    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()
            
            # Look for test result lines with p-values and assessments
            if '|' in line and 'p-value' not in line and '#=' not in line:
                parts = [p.strip() for p in line.split('|')]
                
                if len(parts) >= 5:
                    try:
                        test_name = parts[0]
                        p_value_str = parts[3]
                        assessment = parts[4]
                        
                        # Skip header or malformed lines
                        if test_name in ['test_name', 'rng_name'] or not p_value_str:
                            continue
                            
                        results['total_tests'] += 1
                        
                        # Extract p-value
                        try:
                            p_value = float(p_value_str)
                            if 0 <= p_value <= 1:
                                results['p_values'].append(p_value)
                        except ValueError:
                            pass
                        
                        # Check assessment
                        if 'FAILED' in assessment:
                            results['failed_tests'] += 1
                            results['failed_test_names'].append(test_name)
                        elif 'WEAK' in assessment:
                            results['weak_tests'] += 1
                            results['weak_test_names'].append(test_name)
                            
                    except (ValueError, IndexError):
                        continue
    
    return results

def analyze_reports():
    """Analyze all reports in the reports directory."""
    
    # Find all report files
    nist_files = glob.glob('reports/*finalAnalysisReport*.txt')
    dieharder_files = glob.glob('reports/*dieharder*.txt')
    
    print(f"Found {len(nist_files)} NIST reports and {len(dieharder_files)} Dieharder reports")
    
    # Parse NIST reports
    nist_results = []
    for filepath in nist_files:
        try:
            result = parse_nist_report(filepath)
            if result['total_tests'] > 0:
                nist_results.append(result)
        except Exception as e:
            print(f"Error parsing {filepath}: {e}")
    
    # Parse Dieharder reports
    dieharder_results = []
    for filepath in dieharder_files:
        try:
            result = parse_dieharder_report(filepath)
            if result['total_tests'] > 0:
                dieharder_results.append(result)
        except Exception as e:
            print(f"Error parsing {filepath}: {e}")
    
    return nist_results, dieharder_results

def create_failure_rate_chart(nist_results, dieharder_results):
    """Create a chart showing failure rates over time."""
    
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10))
    
    # NIST failure rates
    if nist_results:
        nist_df = pd.DataFrame(nist_results)
        nist_df['datetime'] = pd.to_datetime(nist_df['timestamp'], unit='s')
        nist_df['failure_rate'] = (nist_df['failed_tests'] / nist_df['total_tests']) * 100
        nist_df = nist_df.sort_values('datetime')
        
        ax1.plot(nist_df['datetime'], nist_df['failure_rate'], 'ro-', linewidth=2, markersize=4)
        ax1.set_title('NIST Statistical Test Suite - Failure Rate Over Time')
        ax1.set_ylabel('Failure Rate (%)')
        ax1.grid(True, alpha=0.3)
        ax1.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d %H:%M'))
        ax1.xaxis.set_major_locator(mdates.HourLocator(interval=6))
        plt.setp(ax1.xaxis.get_majorticklabels(), rotation=45)
    
    # Dieharder failure/weak rates
    if dieharder_results:
        dieharder_df = pd.DataFrame(dieharder_results)
        dieharder_df['datetime'] = pd.to_datetime(dieharder_df['timestamp'], unit='s')
        dieharder_df['failure_rate'] = (dieharder_df['failed_tests'] / dieharder_df['total_tests']) * 100
        dieharder_df['weak_rate'] = (dieharder_df['weak_tests'] / dieharder_df['total_tests']) * 100
        dieharder_df = dieharder_df.sort_values('datetime')
        
        ax2.plot(dieharder_df['datetime'], dieharder_df['failure_rate'], 'ro-', linewidth=2, markersize=4, label='Failed')
        ax2.plot(dieharder_df['datetime'], dieharder_df['weak_rate'], 'yo-', linewidth=2, markersize=4, label='Weak')
        ax2.set_title('Dieharder Tests - Failure/Weak Rate Over Time')
        ax2.set_ylabel('Rate (%)')
        ax2.set_xlabel('Time')
        ax2.grid(True, alpha=0.3)
        ax2.legend()
        ax2.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d %H:%M'))
        ax2.xaxis.set_major_locator(mdates.HourLocator(interval=6))
        plt.setp(ax2.xaxis.get_majorticklabels(), rotation=45)
    
    plt.tight_layout()
    plt.savefig('failure_rates_over_time.png', dpi=300, bbox_inches='tight')
    print("Saved failure rate chart as 'failure_rates_over_time.png'")
    
    return fig

def create_pvalue_chart(nist_results, dieharder_results):
    """Create a chart showing p-value distributions over time."""
    
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10))
    
    # NIST p-values
    if nist_results:
        nist_timestamps = []
        nist_pvalues = []
        
        for result in nist_results:
            timestamp = result['timestamp']
            for pval in result['p_values']:
                nist_timestamps.append(timestamp)
                nist_pvalues.append(pval)
        
        if nist_timestamps:
            nist_df = pd.DataFrame({
                'timestamp': nist_timestamps,
                'p_value': nist_pvalues
            })
            nist_df['datetime'] = pd.to_datetime(nist_df['timestamp'], unit='s')
            
            # Create scatter plot with some jitter for visibility
            ax1.scatter(nist_df['datetime'], nist_df['p_value'], alpha=0.6, s=20)
            ax1.axhline(y=0.01, color='r', linestyle='--', alpha=0.7, label='α=0.01 threshold')
            ax1.set_title('NIST Statistical Test Suite - P-Values Over Time')
            ax1.set_ylabel('P-Value')
            ax1.grid(True, alpha=0.3)
            ax1.legend()
            ax1.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d %H:%M'))
            ax1.xaxis.set_major_locator(mdates.HourLocator(interval=6))
            plt.setp(ax1.xaxis.get_majorticklabels(), rotation=45)
    
    # Dieharder p-values
    if dieharder_results:
        dieharder_timestamps = []
        dieharder_pvalues = []
        
        for result in dieharder_results:
            timestamp = result['timestamp']
            for pval in result['p_values']:
                dieharder_timestamps.append(timestamp)
                dieharder_pvalues.append(pval)
        
        if dieharder_timestamps:
            dieharder_df = pd.DataFrame({
                'timestamp': dieharder_timestamps,
                'p_value': dieharder_pvalues
            })
            dieharder_df['datetime'] = pd.to_datetime(dieharder_df['timestamp'], unit='s')
            
            ax2.scatter(dieharder_df['datetime'], dieharder_df['p_value'], alpha=0.6, s=20)
            ax2.axhline(y=0.01, color='r', linestyle='--', alpha=0.7, label='α=0.01 threshold')
            ax2.set_title('Dieharder Tests - P-Values Over Time')
            ax2.set_ylabel('P-Value')
            ax2.set_xlabel('Time')
            ax2.grid(True, alpha=0.3)
            ax2.legend()
            ax2.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d %H:%M'))
            ax2.xaxis.set_major_locator(mdates.HourLocator(interval=6))
            plt.setp(ax2.xaxis.get_majorticklabels(), rotation=45)
    
    plt.tight_layout()
    plt.savefig('pvalues_over_time.png', dpi=300, bbox_inches='tight')
    print("Saved p-value chart as 'pvalues_over_time.png'")
    
    return fig

def print_summary(nist_results, dieharder_results):
    """Print summary statistics."""
    
    print("\n" + "="*60)
    print("RANDOMNESS TEST ANALYSIS SUMMARY")
    print("="*60)
    
    if nist_results:
        print(f"\nNIST Statistical Test Suite ({len(nist_results)} reports):")
        total_tests = sum(r['total_tests'] for r in nist_results)
        total_failures = sum(r['failed_tests'] for r in nist_results)
        avg_failure_rate = (total_failures / total_tests) * 100 if total_tests > 0 else 0
        
        print(f"  Total tests run: {total_tests}")
        print(f"  Total failures: {total_failures}")
        print(f"  Average failure rate: {avg_failure_rate:.2f}%")
        
        # Find most recent failures
        recent_failures = []
        for result in sorted(nist_results, key=lambda x: x['timestamp'], reverse=True)[:3]:
            if result['failed_test_names']:
                timestamp = datetime.fromtimestamp(result['timestamp'])
                recent_failures.append((timestamp, result['failed_test_names']))
        
        if recent_failures:
            print("  Recent failures:")
            for timestamp, test_names in recent_failures:
                print(f"    {timestamp.strftime('%m/%d %H:%M')}: {', '.join(test_names)}")
    
    if dieharder_results:
        print(f"\nDieharder Tests ({len(dieharder_results)} reports):")
        total_tests = sum(r['total_tests'] for r in dieharder_results)
        total_failures = sum(r['failed_tests'] for r in dieharder_results)
        total_weak = sum(r['weak_tests'] for r in dieharder_results)
        avg_failure_rate = (total_failures / total_tests) * 100 if total_tests > 0 else 0
        avg_weak_rate = (total_weak / total_tests) * 100 if total_tests > 0 else 0
        
        print(f"  Total tests run: {total_tests}")
        print(f"  Total failures: {total_failures}")
        print(f"  Total weak: {total_weak}")
        print(f"  Average failure rate: {avg_failure_rate:.2f}%")
        print(f"  Average weak rate: {avg_weak_rate:.2f}%")

def main():
    """Main analysis function."""
    print("Analyzing TRNG randomness test reports...")
    
    # Check if reports directory exists
    if not os.path.exists('reports'):
        print("Error: reports directory not found!")
        return
    
    # Analyze reports
    nist_results, dieharder_results = analyze_reports()
    
    if not nist_results and not dieharder_results:
        print("No valid reports found!")
        return
    
    # Print summary
    print_summary(nist_results, dieharder_results)
    
    # Create charts
    print("\nGenerating charts...")
    create_failure_rate_chart(nist_results, dieharder_results)
    create_pvalue_chart(nist_results, dieharder_results)
    
    print("\nAnalysis complete!")

if __name__ == '__main__':
    main()