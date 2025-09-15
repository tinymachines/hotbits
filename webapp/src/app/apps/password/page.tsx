'use client';

import { useState } from 'react';
import { useRandomNumbers } from '@/hooks/useRandomNumbers';

interface PasswordResult {
  password: string;
  strength: 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Very Strong';
  entropy: number;
  timestamp: Date;
}

const characterSets = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  similar: '0O1lI|`~'
};

const presets = [
  { name: 'High Security', length: 32, lowercase: true, uppercase: true, numbers: true, symbols: true, excludeSimilar: true },
  { name: 'Standard', length: 16, lowercase: true, uppercase: true, numbers: true, symbols: true, excludeSimilar: true },
  { name: 'Simple', length: 12, lowercase: true, uppercase: true, numbers: true, symbols: false, excludeSimilar: true },
  { name: 'PIN', length: 8, lowercase: false, uppercase: false, numbers: true, symbols: false, excludeSimilar: false },
  { name: 'Passphrase Style', length: 20, lowercase: true, uppercase: false, numbers: true, symbols: false, excludeSimilar: true }
];

export default function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [lowercase, setLowercase] = useState(true);
  const [uppercase, setUppercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [excludeSimilar, setExcludeSimilar] = useState(true);
  const [numPasswords, setNumPasswords] = useState(1);
  const [results, setResults] = useState<PasswordResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { getRandomIntegers, error } = useRandomNumbers();

  const buildCharacterSet = (): string => {
    let charSet = '';

    if (lowercase) charSet += characterSets.lowercase;
    if (uppercase) charSet += characterSets.uppercase;
    if (numbers) charSet += characterSets.numbers;
    if (symbols) charSet += characterSets.symbols;

    if (excludeSimilar) {
      for (const char of characterSets.similar) {
        charSet = charSet.replace(new RegExp(char, 'g'), '');
      }
    }

    return charSet;
  };

  const calculateStrength = (password: string, charSet: string): { strength: PasswordResult['strength'], entropy: number } => {
    const entropy = Math.log2(charSet.length) * password.length;

    let strength: PasswordResult['strength'];
    if (entropy < 25) strength = 'Weak';
    else if (entropy < 50) strength = 'Fair';
    else if (entropy < 75) strength = 'Good';
    else if (entropy < 100) strength = 'Strong';
    else strength = 'Very Strong';

    return { strength, entropy: Math.round(entropy) };
  };

  const generatePasswords = async () => {
    if (numPasswords < 1 || numPasswords > 20) return;

    const charSet = buildCharacterSet();
    if (charSet.length === 0) {
      alert('Please select at least one character type!');
      return;
    }

    setIsGenerating(true);
    try {
      console.log(`Generating ${numPasswords} password(s) with charset of ${charSet.length} characters...`);
      const newResults: PasswordResult[] = [];

      for (let i = 0; i < numPasswords; i++) {
        const randomIndices = await getRandomIntegers(length, 0, charSet.length - 1);
        const password = randomIndices.map(index => charSet[index]).join('');
        const { strength, entropy } = calculateStrength(password, charSet);

        newResults.push({
          password,
          strength,
          entropy,
          timestamp: new Date()
        });
      }

      console.log('Generated passwords:', newResults.map(r => ({ password: r.password.slice(0, 4) + '...', strength: r.strength, entropy: r.entropy })));
      setResults(newResults);
    } catch (err) {
      console.error('Password generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const loadPreset = (preset: typeof presets[0]) => {
    setLength(preset.length);
    setLowercase(preset.lowercase);
    setUppercase(preset.uppercase);
    setNumbers(preset.numbers);
    setSymbols(preset.symbols);
    setExcludeSimilar(preset.excludeSimilar);
  };

  const copyToClipboard = (password: string) => {
    navigator.clipboard.writeText(password);
    // Could add a toast notification here
  };

  const getStrengthColor = (strength: PasswordResult['strength']) => {
    switch (strength) {
      case 'Weak': return 'text-red-600 bg-red-100';
      case 'Fair': return 'text-orange-600 bg-orange-100';
      case 'Good': return 'text-yellow-600 bg-yellow-100';
      case 'Strong': return 'text-green-600 bg-green-100';
      case 'Very Strong': return 'text-blue-600 bg-blue-100';
    }
  };

  const charSet = buildCharacterSet();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🔐 Password Generator</h2>
        <p className="text-gray-600 mb-6">
          Generate cryptographically secure passwords using true hardware randomness. Perfect for accounts and security!
        </p>

        {/* Presets */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Quick Presets
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {presets.map((preset, index) => (
              <button
                key={index}
                onClick={() => loadPreset(preset)}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password Length (4-128)
            </label>
            <input
              type="number"
              min="4"
              max="128"
              value={length}
              onChange={(e) => setLength(Math.max(4, Math.min(128, parseInt(e.target.value) || 4)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Passwords (1-20)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={numPasswords}
              onChange={(e) => setNumPasswords(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            />
          </div>
        </div>

        {/* Character Types */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Character Types
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={lowercase}
                onChange={(e) => setLowercase(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Lowercase (a-z)</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={uppercase}
                onChange={(e) => setUppercase(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Uppercase (A-Z)</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={numbers}
                onChange={(e) => setNumbers(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Numbers (0-9)</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={symbols}
                onChange={(e) => setSymbols(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Symbols (!@#$%)</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer md:col-span-2">
              <input
                type="checkbox"
                checked={excludeSimilar}
                onChange={(e) => setExcludeSimilar(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Exclude similar characters (0,O,1,l,I,|)</span>
            </label>
          </div>
        </div>

        {/* Character Set Info */}
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-700">
            <strong>Character set size:</strong> {charSet.length} characters
            {charSet.length > 0 && (
              <span className="ml-2 text-gray-600">
                (~{Math.round(Math.log2(charSet.length) * length)} bits entropy)
              </span>
            )}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generatePasswords}
          disabled={isGenerating || charSet.length === 0}
          className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? 'Generating...' : `Generate ${numPasswords} Password${numPasswords > 1 ? 's' : ''}`}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-md text-red-700">
            Error: {error}
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Passwords</h3>

          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 rounded-lg bg-gray-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-600">#{index + 1}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStrengthColor(result.strength)}`}>
                      {result.strength}
                    </span>
                    <span className="text-xs text-gray-500">
                      {result.entropy} bits entropy
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(result.password)}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Copy
                  </button>
                </div>

                <div className="font-mono text-lg bg-white p-3 rounded border break-all">
                  {result.password}
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  Generated at {result.timestamp.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setResults([])}
            className="mt-4 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Clear All Passwords
          </button>
        </div>
      )}

      {/* Security Info */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="font-semibold text-red-900 mb-2">🔒 Security Notice</h3>
        <div className="text-red-700 text-sm space-y-1">
          <p>• These passwords use cryptographically secure hardware randomness</p>
          <p>• Store passwords in a secure password manager</p>
          <p>• Never share passwords or send them via unencrypted channels</p>
          <p>• Use unique passwords for each account</p>
        </div>
      </div>
    </div>
  );
}