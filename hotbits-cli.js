#!/usr/bin/env node

/**
 * HOTBITS CLI - Thorium-based TRNG Quality Tracker
 * Command-line interface for the Hotbits TRNG pipeline
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// CLI configuration
const CLI_VERSION = '1.0.0';
const SCRIPT_PATH = path.join(__dirname, 'scripts', 'hot.sh');

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

// Parse command line arguments
function parseArgs(args) {
    const commands = {
        test: 'Run quality tests on TRNG data',
        monitor: 'Real-time monitoring of TRNG quality',
        analyze: 'Analyze historical TRNG data',
        generate: 'Generate random data for cryptographic use',
        help: 'Show help information',
        version: 'Show version information',
    };

    if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
        showHelp(commands);
        process.exit(0);
    }

    if (args[0] === 'version' || args[0] === '--version' || args[0] === '-v') {
        console.log(`HOTBITS CLI v${CLI_VERSION}`);
        process.exit(0);
    }

    return {
        command: args[0],
        args: args.slice(1)
    };
}

// Show help message
function showHelp(commands) {
    console.log(`
${colors.bright}${colors.cyan}HOTBITS CLI - Thorium-based TRNG Quality Tracker${colors.reset}
${colors.bright}Version ${CLI_VERSION}${colors.reset}

${colors.yellow}Usage:${colors.reset}
  hotbits <command> [options]

${colors.yellow}Commands:${colors.reset}`);
    
    for (const [cmd, desc] of Object.entries(commands)) {
        console.log(`  ${colors.green}${cmd.padEnd(12)}${colors.reset} ${desc}`);
    }

    console.log(`
${colors.yellow}Examples:${colors.reset}
  ${colors.bright}# Quick test of recent data${colors.reset}
  hotbits test --quick --last 10000

  ${colors.bright}# Full cryptographic validation${colors.reset}
  hotbits test --crypto

  ${colors.bright}# Monitor real-time quality${colors.reset}
  hotbits monitor --interval 60

  ${colors.bright}# Analyze specific time range${colors.reset}
  hotbits analyze --from 2025-01-01 --to 2025-01-31

  ${colors.bright}# Generate random integers${colors.reset}
  hotbits generate --count 100 --min 1 --max 1000

${colors.yellow}For detailed options:${colors.reset}
  hotbits test --help
`);
}

// Execute test command
async function runTest(args) {
    // Map user-friendly arguments to hot.sh arguments
    const mappings = {
        '--quick': '--quick',
        '--full': '--full',
        '--crypto': '--crypto',
        '--last': '--start-index',
        '--count': '--sample-count',
        '--skip-python': null,
        '--skip-nist': null,
        '--skip-dieharder': null,
    };

    const hotArgs = [];
    let skipTests = [];

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--help' || arg === '-h') {
            console.log(`
${colors.bright}HOTBITS TEST - Run quality tests on TRNG data${colors.reset}

${colors.yellow}Options:${colors.reset}
  --quick              Quick test with reduced parameters
  --full               Full test with extended parameters
  --crypto             Cryptographic validation mode
  --last N             Test last N events
  --count N            Test specific number of events
  --skip-python        Skip Python statistical tests
  --skip-nist          Skip NIST test suite
  --skip-dieharder     Skip Dieharder tests
  --output DIR         Output directory for results

${colors.yellow}Examples:${colors.reset}
  hotbits test --quick --last 5000
  hotbits test --crypto --count 100000
`);
            process.exit(0);
        }

        if (arg === '--last' && i + 1 < args.length) {
            hotArgs.push('--start-index', `-${args[++i]}`);
        } else if (arg === '--skip-python') {
            skipTests.push('python');
        } else if (arg === '--skip-nist') {
            skipTests.push('nist');
        } else if (arg === '--skip-dieharder') {
            skipTests.push('dieharder');
        } else if (mappings[arg] !== undefined) {
            if (mappings[arg]) {
                hotArgs.push(mappings[arg]);
                if (arg === '--count' && i + 1 < args.length) {
                    hotArgs.push(args[++i]);
                }
            }
        } else if (arg === '--output' && i + 1 < args.length) {
            hotArgs.push('--output-dir', args[++i]);
        } else {
            hotArgs.push(arg);
        }
    }

    // Handle test skipping
    if (skipTests.length > 0) {
        const allTests = ['python', 'nist', 'dieharder'];
        const runTests = allTests.filter(t => !skipTests.includes(t));
        if (runTests.length > 0) {
            hotArgs.push('--tests', runTests.join(','));
        } else {
            hotArgs.push('--tests', 'none');
        }
    }

    // Run hot.sh script
    return runScript(hotArgs);
}

// Real-time monitoring
async function runMonitor(args) {
    let interval = 60; // Default 60 seconds
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--interval' && i + 1 < args.length) {
            interval = parseInt(args[++i]);
        } else if (args[i] === '--help' || args[i] === '-h') {
            console.log(`
${colors.bright}HOTBITS MONITOR - Real-time TRNG quality monitoring${colors.reset}

${colors.yellow}Options:${colors.reset}
  --interval N    Check interval in seconds (default: 60)
  --window N      Number of events to test per check (default: 1000)

${colors.yellow}Example:${colors.reset}
  hotbits monitor --interval 30 --window 5000
`);
            process.exit(0);
        }
    }

    console.log(`${colors.cyan}Starting HOTBITS monitoring (interval: ${interval}s)${colors.reset}`);
    console.log('Press Ctrl+C to stop\n');

    // Run monitoring loop
    const monitor = async () => {
        const timestamp = new Date().toISOString();
        console.log(`${colors.yellow}[${timestamp}] Running quality check...${colors.reset}`);
        
        await runScript(['--quick', '--start-index', '-1000', '--tests', 'python']);
        
        // Parse results and show summary
        const resultsDir = getLatestResults();
        if (resultsDir) {
            const results = parseResults(resultsDir);
            showMonitorSummary(results);
        }
    };

    // Initial run
    await monitor();

    // Set up interval
    setInterval(monitor, interval * 1000);
}

// Generate random numbers
async function runGenerate(args) {
    let count = 10;
    let min = 0;
    let max = 100;
    let format = 'decimal';

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--count' && i + 1 < args.length) {
            count = parseInt(args[++i]);
        } else if (arg === '--min' && i + 1 < args.length) {
            min = parseInt(args[++i]);
        } else if (arg === '--max' && i + 1 < args.length) {
            max = parseInt(args[++i]);
        } else if (arg === '--format' && i + 1 < args.length) {
            format = args[++i];
        } else if (arg === '--help' || arg === '-h') {
            console.log(`
${colors.bright}HOTBITS GENERATE - Generate cryptographic random numbers${colors.reset}

${colors.yellow}Options:${colors.reset}
  --count N        Number of random values (default: 10)
  --min N          Minimum value (default: 0)
  --max N          Maximum value (default: 100)
  --format FORMAT  Output format: decimal, hex, binary (default: decimal)

${colors.yellow}Examples:${colors.reset}
  hotbits generate --count 100 --min 1 --max 1000
  hotbits generate --count 32 --format hex
`);
            process.exit(0);
        }
    }

    console.log(`${colors.cyan}Generating ${count} random values...${colors.reset}`);
    
    // Run extraction
    await runScript(['--quick', '--tests', 'none']);
    
    // Read binary data and generate numbers
    const resultsDir = getLatestResults();
    if (resultsDir) {
        const binaryPath = path.join(resultsDir, 'random.bin');
        if (fs.existsSync(binaryPath)) {
            const data = fs.readFileSync(binaryPath);
            const numbers = generateRandomNumbers(data, count, min, max, format);
            
            console.log(`\n${colors.green}Random values:${colors.reset}`);
            numbers.forEach((num, i) => {
                console.log(`  ${(i + 1).toString().padStart(3)}: ${num}`);
            });
        }
    }
}

// Generate random numbers from binary data
function generateRandomNumbers(data, count, min, max, format) {
    const numbers = [];
    const range = max - min + 1;
    let offset = 0;

    for (let i = 0; i < count && offset < data.length - 4; i++) {
        // Read 4 bytes as uint32
        const value = data.readUInt32LE(offset);
        offset += 4;

        if (format === 'hex') {
            numbers.push(value.toString(16).padStart(8, '0'));
        } else if (format === 'binary') {
            numbers.push(value.toString(2).padStart(32, '0'));
        } else {
            // Scale to range
            const scaled = min + (value % range);
            numbers.push(scaled);
        }
    }

    return numbers;
}

// Run the hot.sh script
function runScript(args) {
    return new Promise((resolve, reject) => {
        const proc = spawn(SCRIPT_PATH, args, {
            stdio: 'inherit',
            shell: true
        });

        proc.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Process exited with code ${code}`));
            }
        });

        proc.on('error', (err) => {
            reject(err);
        });
    });
}

// Get latest results directory
function getLatestResults() {
    const completeDir = path.join(__dirname, 'complete');
    if (!fs.existsSync(completeDir)) return null;

    const dirs = fs.readdirSync(completeDir)
        .filter(d => fs.statSync(path.join(completeDir, d)).isDirectory())
        .sort((a, b) => b.localeCompare(a));

    return dirs.length > 0 ? path.join(completeDir, dirs[0]) : null;
}

// Parse results JSON
function parseResults(dir) {
    const jsonPath = path.join(dir, 'results.json');
    if (fs.existsSync(jsonPath)) {
        return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }
    return null;
}

// Show monitoring summary
function showMonitorSummary(results) {
    if (!results) return;

    console.log(`  ${colors.bright}Quality Metrics:${colors.reset}`);
    console.log(`    Events processed: ${results.input.sliced_events || results.input.total_events}`);
    console.log(`    Random bytes generated: ${results.input.binary_bytes}`);
    
    if (results.tests_run.python) {
        console.log(`    Python tests: ${colors.green}✓${colors.reset}`);
    }
    console.log();
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const { command, args: cmdArgs } = parseArgs(args);

    try {
        switch (command) {
            case 'test':
                await runTest(cmdArgs);
                break;
            case 'monitor':
                await runMonitor(cmdArgs);
                break;
            case 'analyze':
                console.log(`${colors.yellow}Analyze command not yet implemented${colors.reset}`);
                break;
            case 'generate':
                await runGenerate(cmdArgs);
                break;
            default:
                console.log(`${colors.red}Unknown command: ${command}${colors.reset}`);
                console.log('Use "hotbits help" for usage information');
                process.exit(1);
        }
    } catch (error) {
        console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}