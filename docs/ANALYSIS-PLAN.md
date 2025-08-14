# TRNG Time-Domain Analysis Plan

## Objective
Transform raw timestamp deltas into high-quality random bit streams by identifying and removing periodic/deterministic signals while preserving true entropy.

## Current Data Profile
- **Sample Size**: ~12k timestamp deltas (nanosecond precision)
- **Mean Interval**: ~179 ms (highly variable)
- **Distribution**: Wide spread (0.01 ms to 1424 ms)
- **Challenge**: Likely contains periodic system noise, drift, and environmental patterns

## Analysis Pipeline

### Phase 1: Signal Characterization
**Goal**: Identify all periodic and quasi-periodic components

1. **Frequency Domain Analysis**
   - FFT to identify dominant frequencies
   - Power spectral density estimation
   - Autocorrelation analysis for periodic patterns
   - Wavelet transform for time-varying frequencies

2. **Statistical Tests**
   - Run distribution analysis (should approach exponential for random events)
   - Entropy estimation (Shannon, min-entropy)
   - Serial correlation tests
   - Runs tests for patterns

3. **Visualization**
   - Time series plot with moving averages
   - Histogram of delta distributions
   - Spectrogram for frequency evolution
   - Phase space reconstruction

### Phase 2: Signal Filtering Strategies
**Goal**: Remove deterministic components while preserving entropy

1. **High-Pass Filtering**
   - Remove low-frequency drift and environmental changes
   - Cutoff frequency based on spectral analysis
   - Preserve microsecond-scale variations

2. **Adaptive Thresholding**
   - Dynamic median-based bit extraction
   - Von Neumann debiasing for simple patterns
   - XOR folding for whitening

3. **Differential Encoding**
   - Use delta-of-deltas to remove linear trends
   - Modulo operations to wrap large values
   - Sign-based bit extraction

4. **Frequency Notch Filtering**
   - Remove specific periodic signals (60Hz, system timers)
   - Adaptive notch filters for varying frequencies
   - Preserve broadband noise

### Phase 3: Entropy Extraction Methods
**Goal**: Convert filtered signals to random bits

1. **Threshold Methods**
   ```
   bit = (delta > adaptive_threshold) ? 1 : 0
   ```
   - Median-based threshold
   - Quantile-based (ensure 50/50 distribution)
   - Local adaptive (sliding window)

2. **LSB Extraction**
   ```
   bits = delta & 0xFF  # Extract least significant bits
   ```
   - Use only noise-dominated bits
   - Combine multiple samples
   - Apply cryptographic hashing

3. **Comparison Methods**
   ```
   bit = (delta[i] > delta[i-1]) ? 1 : 0
   ```
   - Relative comparisons remove bias
   - Multi-sample voting
   - Lag-based comparisons

4. **Phase Extraction**
   ```
   bit = (delta % period) > (period/2)
   ```
   - Extract phase relative to detected periods
   - Use residuals after detrending

### Phase 4: Post-Processing
**Goal**: Ensure cryptographic quality

1. **Whitening Filters**
   - SHA-256 based extraction
   - Linear feedback shift registers (LFSR)
   - Cryptographic sponge functions

2. **Statistical Correction**
   - Von Neumann debiasing
   - Peres algorithm for efficiency
   - Entropy pooling and mixing

3. **Output Formatting**
   - Raw binary stream
   - Base64 encoding
   - Structured packets with metadata

## Testing Framework

### Rapid Iteration Tests
1. **Quick Sanity Checks** (< 1 second)
   - Bit frequency (should be ~50%)
   - Byte distribution (chi-square)
   - Simple autocorrelation

2. **Intermediate Tests** (< 1 minute)
   - NIST STS subset (monobit, runs, frequency)
   - Compression ratio test
   - Spectral tests

3. **Full Validation** (Dieharder)
   ```bash
   # Generate 10MB test file
   ./pipeline.py < data/events.txt | head -c 10000000 > test.bin
   
   # Run dieharder battery
   dieharder -a -f test.bin
   ```

### Success Metrics
- **Primary**: Pass rate on dieharder tests (target: >95%)
- **Secondary**: Entropy per bit (target: >0.95)
- **Efficiency**: Bits extracted per timestamp (target: >1)

## Implementation Approach

### Tools to Build
1. **analyze.py**: Signal characterization and visualization
2. **filter.py**: Configurable filtering pipeline
3. **extract.py**: Bit extraction methods
4. **test.py**: Automated testing harness
5. **optimize.py**: Parameter tuning with genetic algorithms

### Rapid Experimentation
```python
# Pipeline configuration format
config = {
    "filters": [
        {"type": "highpass", "cutoff": 1000},
        {"type": "notch", "freq": 60},
    ],
    "extractor": {
        "method": "adaptive_threshold",
        "window": 100
    },
    "postprocess": ["von_neumann", "sha256"]
}
```

### Parallel Testing
- Run multiple configurations simultaneously
- Use multiprocessing for independent pipelines
- Cache intermediate results
- Real-time dieharder scoring

## Quick Start Experiments

### Experiment 1: Baseline
```bash
# Direct threshold extraction
cat data/events.txt | python3 -c "
import sys
for line in sys:
    delta = int(line)
    bit = '1' if delta > 150000000 else '0'
    sys.stdout.write(bit)
" | xxd -r -p | dieharder -a -g 201 -k 2
```

### Experiment 2: Differential
```bash
# Delta-of-deltas approach
python3 analyze.py --method differential < data/events.txt | \
  extract.py --method lsb | \
  dieharder -a -g 201
```

### Experiment 3: Frequency Domain
```bash
# Remove periodic signals via FFT
python3 filter.py --fft-denoise --threshold 3sigma < data/events.txt | \
  extract.py --method adaptive | \
  test.py --quick
```

## Next Steps
1. Implement basic pipeline (analyze.py)
2. Run frequency analysis on current data
3. Test simplest extraction methods
4. Iterate based on dieharder scores
5. Document winning configurations

## References
- NIST SP 800-90B: Entropy Sources
- "A Provably Secure True Random Number Generator" (Sunar et al.)
- Linux /dev/random architecture
- Dieharder test battery documentation