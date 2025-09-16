'use client';

import { useState } from 'react';
import { useRandomNumbers } from '@/hooks/useRandomNumbers';

interface DiceResult {
  value: number;
  timestamp: Date;
}

interface DiceType {
  id: string;
  name: string;
  sides: number;
  emoji: string;
  color: string;
}

const diceTypes: DiceType[] = [
  { id: 'd4', name: 'D4 (Tetrahedron)', sides: 4, emoji: '🔺', color: 'bg-red-100 border-red-300' },
  { id: 'd6', name: 'D6 (Standard)', sides: 6, emoji: '🎲', color: 'bg-blue-100 border-blue-300' },
  { id: 'd8', name: 'D8 (Octahedron)', sides: 8, emoji: '🔷', color: 'bg-green-100 border-green-300' },
  { id: 'd10', name: 'D10 (Pentagonal)', sides: 10, emoji: '🔟', color: 'bg-yellow-100 border-yellow-300' },
  { id: 'd12', name: 'D12 (Dodecahedron)', sides: 12, emoji: '🎯', color: 'bg-purple-100 border-purple-300' },
  { id: 'd20', name: 'D20 (Icosahedron)', sides: 20, emoji: '🌟', color: 'bg-pink-100 border-pink-300' },
  { id: 'd100', name: 'D100 (Percentile)', sides: 100, emoji: '💯', color: 'bg-gray-100 border-gray-300' },
];

export default function DiceRoll() {
  const [selectedDice, setSelectedDice] = useState(diceTypes[1]); // Default to D6
  const [numDice, setNumDice] = useState(2);
  const [results, setResults] = useState<DiceResult[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const { getRandomIntegers, error } = useRandomNumbers();

  const rollDice = async () => {
    if (numDice < 1 || numDice > 20) return;

    setIsRolling(true);
    try {
      const randomValues = await getRandomIntegers(numDice, 1, selectedDice.sides);
      const newResults = randomValues.map(value => ({
        value,
        timestamp: new Date()
      }));
      setResults(newResults);
    } catch (err) {
      console.error('Dice roll failed:', err);
    } finally {
      setIsRolling(false);
    }
  };

  const getStats = () => {
    if (results.length === 0) return { sum: 0, avg: 0, min: 0, max: 0 };

    const sum = results.reduce((acc, r) => acc + r.value, 0);
    const avg = sum / results.length;
    const min = Math.min(...results.map(r => r.value));
    const max = Math.max(...results.map(r => r.value));

    return { sum, avg: Math.round(avg * 100) / 100, min, max };
  };

  const stats = getStats();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-cosmic-800/60 backdrop-blur rounded-lg border border-quantum-600/30 p-6 mb-6">
        <h2 className="text-2xl font-bold text-fusion-400 mb-4">🎲 Dice Roller</h2>
        <p className="text-quantum-300 mb-6">
          Roll various types of dice with true hardware randomness. Perfect for tabletop games and random decisions!
        </p>

        {/* Dice Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-quantum-300 mb-3">
            Select Dice Type
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {diceTypes.map(dice => (
              <button
                key={dice.id}
                onClick={() => setSelectedDice(dice)}
                className={`p-3 border-2 rounded-lg transition-all ${
                  selectedDice.id === dice.id
                    ? `${dice.color} border-current`
                    : 'bg-cosmic-800/60 backdrop-blur border-quantum-600/30 hover:bg-gray-50'
                }`}
              >
                <div className="text-2xl mb-1">{dice.emoji}</div>
                <div className="text-xs font-medium">{dice.id.toUpperCase()}</div>
              </button>
            ))}
          </div>
          <p className="text-sm text-quantum-300 mt-2">
            Selected: {selectedDice.name} ({selectedDice.sides} sides)
          </p>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-quantum-300 mb-2">
              Number of Dice (1-20)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={numDice}
              onChange={(e) => setNumDice(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-quantum-300"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={rollDice}
              disabled={isRolling}
              className="w-full px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRolling ? 'Rolling...' : `Roll ${numDice} ${selectedDice.id.toUpperCase()}${numDice > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-md text-red-700">
            Error: {error}
          </div>
        )}
      </div>

      {/* Large Results Display */}
      {results.length > 0 && (
        <div className="bg-cosmic-800/60 backdrop-blur rounded-lg border border-quantum-600/30 p-8 mb-6">
          <h3 className="text-xl font-semibold text-fusion-400 mb-6 text-center">Latest Roll Results</h3>
          <div className="flex justify-center items-center space-x-6 mb-6 flex-wrap gap-4">
            {results.slice(-6).map((result, index) => (
              <div
                key={index}
                className={`flex flex-col items-center p-6 rounded-xl border-2 shadow-lg ${selectedDice.color}`}
              >
                <div className="text-6xl mb-2">{selectedDice.emoji}</div>
                <div className="text-4xl font-bold text-gray-800 mb-1">{result.value}</div>
                <div className="text-sm font-medium text-quantum-300">{selectedDice.id.toUpperCase()}</div>
              </div>
            ))}
          </div>

          {results.length > 1 && (
            <div className="text-center">
              <div className="text-3xl font-bold text-fusion-400 mb-2">
                Total: {stats.sum} • Average: {stats.avg}
              </div>
              <div className="text-lg text-quantum-300">
                Min: {stats.min} • Max: {stats.max} • {results.length} Dice
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-cosmic-800/60 backdrop-blur rounded-lg border border-quantum-600/30 p-6 mb-6">
          <h3 className="text-lg font-semibold text-fusion-400 mb-4">Results</h3>

          {/* Individual Results */}
          <div className="grid grid-cols-5 md:grid-cols-10 gap-4 mb-6">
            {results.map((result, index) => (
              <div
                key={index}
                className={`flex flex-col items-center p-4 rounded-lg border-2 ${selectedDice.color}`}
              >
                <div className="text-xl font-bold mb-1">{result.value}</div>
                <div className="text-lg">{selectedDice.emoji}</div>
              </div>
            ))}
          </div>

          {/* Statistics */}
          {results.length > 1 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-fusion-400 mb-3">Statistics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.sum}</div>
                  <div className="text-sm text-quantum-300">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.avg}</div>
                  <div className="text-sm text-quantum-300">Average</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{stats.min}</div>
                  <div className="text-sm text-quantum-300">Minimum</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{stats.max}</div>
                  <div className="text-sm text-quantum-300">Maximum</div>
                </div>
              </div>
            </div>
          )}

          {/* Clear Results */}
          <button
            onClick={() => setResults([])}
            className="mt-4 px-4 py-2 text-sm bg-gray-100 text-quantum-300 rounded-md hover:bg-gray-200"
          >
            Clear Results
          </button>
        </div>
      )}

      {/* Common Dice Combinations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-cosmic-800/60 backdrop-blur rounded-lg border border-quantum-600/30 p-4">
          <h3 className="font-semibold text-fusion-400 mb-3">Quick Presets</h3>
          <div className="space-y-2">
            <button
              onClick={() => { setSelectedDice(diceTypes[1]); setNumDice(2); }}
              className="w-full text-left px-3 py-2 text-sm text-quantum-300 rounded-md hover:bg-gray-100"
            >
              🎲 2d6 - Board games (Monopoly, etc.)
            </button>
            <button
              onClick={() => { setSelectedDice(diceTypes[5]); setNumDice(1); }}
              className="w-full text-left px-3 py-2 text-sm text-quantum-300 rounded-md hover:bg-gray-100"
            >
              🌟 1d20 - D&D attack rolls
            </button>
            <button
              onClick={() => { setSelectedDice(diceTypes[1]); setNumDice(3); }}
              className="w-full text-left px-3 py-2 text-sm text-quantum-300 rounded-md hover:bg-gray-100"
            >
              🎲 3d6 - D&D ability scores
            </button>
            <button
              onClick={() => { setSelectedDice(diceTypes[6]); setNumDice(1); }}
              className="w-full text-left px-3 py-2 text-sm text-quantum-300 rounded-md hover:bg-gray-100"
            >
              💯 1d100 - Percentile rolls
            </button>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">🔬 True Randomness</h3>
          <p className="text-green-700 text-sm">
            Unlike computer-generated pseudo-random dice, these results come from physical entropy sources
            like radioactive decay, making them truly unpredictable and perfect for fair gaming.
          </p>
        </div>
      </div>
    </div>
  );
}