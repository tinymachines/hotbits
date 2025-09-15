'use client';

import { useState } from 'react';
import { useRandomNumbers } from '@/hooks/useRandomNumbers';

interface ChoiceResult {
  choice: string;
  index: number;
  timestamp: Date;
}

const presetLists = [
  {
    name: 'Yes/No',
    items: ['Yes', 'No']
  },
  {
    name: 'Rock Paper Scissors',
    items: ['Rock', 'Paper', 'Scissors']
  },
  {
    name: 'Directions',
    items: ['North', 'South', 'East', 'West']
  },
  {
    name: 'Dice Sides',
    items: ['1', '2', '3', '4', '5', '6']
  },
  {
    name: 'Colors',
    items: ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange']
  },
  {
    name: 'Days of Week',
    items: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  }
];

export default function RandomChoice() {
  const [customList, setCustomList] = useState('Pizza\nBurgers\nSushi\nTacos\nPasta');
  const [numChoices, setNumChoices] = useState(1);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [results, setResults] = useState<ChoiceResult[]>([]);
  const [isChoosing, setIsChoosing] = useState(false);
  const { getRandomIntegers, error } = useRandomNumbers();

  const parseChoices = (input: string): string[] => {
    return input
      .split(/[\n,;]/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
  };

  const makeChoice = async () => {
    const choices = parseChoices(customList);

    if (choices.length === 0) {
      alert('Please add some choices to pick from!');
      return;
    }

    if (numChoices > choices.length && !allowDuplicates) {
      alert(`Cannot pick ${numChoices} unique items from ${choices.length} choices. Enable duplicates or reduce the number.`);
      return;
    }

    setIsChoosing(true);
    try {
      console.log(`Making ${numChoices} choice(s) from ${choices.length} options...`);

      if (allowDuplicates) {
        // Simple random selection with duplicates allowed
        const randomIndices = await getRandomIntegers(numChoices, 0, choices.length - 1);
        const newResults = randomIndices.map(index => ({
          choice: choices[index],
          index,
          timestamp: new Date()
        }));
        setResults(newResults);
      } else {
        // Unique selection without duplicates
        const selectedIndices = new Set<number>();
        const newResults: ChoiceResult[] = [];

        while (newResults.length < numChoices && selectedIndices.size < choices.length) {
          const batch = await getRandomIntegers(numChoices - newResults.length, 0, choices.length - 1);

          for (const index of batch) {
            if (!selectedIndices.has(index) && newResults.length < numChoices) {
              selectedIndices.add(index);
              newResults.push({
                choice: choices[index],
                index,
                timestamp: new Date()
              });
            }
          }
        }

        setResults(newResults);
      }
    } catch (err) {
      console.error('Choice selection failed:', err);
    } finally {
      setIsChoosing(false);
    }
  };

  const loadPreset = (preset: typeof presetLists[0]) => {
    setCustomList(preset.items.join('\n'));
  };

  const choices = parseChoices(customList);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🎯 Random Choice Picker</h2>
        <p className="text-gray-600 mb-6">
          Make random selections from custom lists using true hardware randomness. Perfect for decisions!
        </p>

        {/* Preset Lists */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Quick Presets
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {presetLists.map((preset, index) => (
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

        {/* Custom List Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Choices (one per line, or comma/semicolon separated)
          </label>
          <textarea
            value={customList}
            onChange={(e) => setCustomList(e.target.value)}
            placeholder="Enter your choices here..."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          />
          <div className="mt-2 text-sm text-gray-600">
            {choices.length} choice{choices.length !== 1 ? 's' : ''} available
          </div>
        </div>

        {/* Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Choices to Pick
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={numChoices}
              onChange={(e) => setNumChoices(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowDuplicates}
                onChange={(e) => setAllowDuplicates(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Allow duplicate selections</span>
            </label>
          </div>
        </div>

        {/* Pick Button */}
        <button
          onClick={makeChoice}
          disabled={isChoosing || choices.length === 0}
          className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isChoosing ? 'Choosing...' : `Pick ${numChoices} Choice${numChoices > 1 ? 's' : ''}`}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-md text-red-700">
            Error: {error}
          </div>
        )}
      </div>

      {/* Large Results Display */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">Random Selection</h3>

          <div className="flex justify-center items-center space-x-6 mb-6 flex-wrap gap-4">
            {results.slice(-5).map((result, index) => (
              <div
                key={index}
                className="flex flex-col items-center p-6 rounded-xl border-2 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 border-blue-300 min-w-[120px]"
              >
                <div className="text-4xl mb-3">🎯</div>
                <div className="text-xl font-bold text-gray-800 mb-2 text-center break-words">
                  {result.choice}
                </div>
                <div className="text-sm text-gray-600">
                  Choice #{index + 1}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {results.length > 1 ? 'Your Random Choices' : 'Your Random Choice'}
            </div>
            <div className="text-lg text-gray-600">
              Selected from {choices.length} options
            </div>
          </div>
        </div>
      )}

      {/* Detailed Results */}
      {results.length > 5 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">All Selections</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {results.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-800">{result.choice}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {result.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setResults([])}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Clear Results
          </button>
        </div>
      )}

      {/* Available Choices Preview */}
      {choices.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Choices ({choices.length})</h3>
          <div className="flex flex-wrap gap-2">
            {choices.slice(0, 20).map((choice, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
              >
                {choice}
              </span>
            ))}
            {choices.length > 20 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                +{choices.length - 20} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">🔬 True Randomness</h3>
        <p className="text-blue-700 text-sm">
          Selections use cryptographically secure randomness from physical entropy sources,
          ensuring completely fair and unpredictable choices for any decision-making scenario.
        </p>
      </div>
    </div>
  );
}