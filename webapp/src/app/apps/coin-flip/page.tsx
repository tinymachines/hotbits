'use client';

import { useState } from 'react';
import { useRandomNumbers } from '@/hooks/useRandomNumbers';
import CoinSVG from '@/components/coins/CoinSVG';

interface CoinFlipResult {
  result: 'heads' | 'tails';
  timestamp: Date;
}

const coinTypes = [
  { id: 'us-quarter', name: 'US Quarter', flag: '🇺🇸' },
  { id: 'us-penny', name: 'US Penny', flag: '🇺🇸' },
  { id: 'euro', name: 'Euro', flag: '🇪🇺' },
  { id: 'bitcoin', name: 'Bitcoin', flag: '₿' },
  { id: 'uk-pound', name: 'British Pound', flag: '🇬🇧' },
  { id: 'canadian', name: 'Canadian Dollar', flag: '🇨🇦' },
];

export default function CoinFlip() {
  const [selectedCoin, setSelectedCoin] = useState(coinTypes[0]);
  const [numCoins, setNumCoins] = useState(1);
  const [results, setResults] = useState<CoinFlipResult[]>([]);
  const [isFlipping, setIsFlipping] = useState(false);
  const { getRandomBooleans, error } = useRandomNumbers();

  const flipCoins = async () => {
    if (numCoins < 1 || numCoins > 50) return;

    setIsFlipping(true);
    try {
      console.log(`Flipping ${numCoins} coins...`);
      const randomResults = await getRandomBooleans(numCoins);
      console.log('Random results:', randomResults);
      const newResults = randomResults.map(result => ({
        result: result ? 'heads' : 'tails' as 'heads' | 'tails',
        timestamp: new Date()
      }));
      console.log('Processed results:', newResults);
      setResults(newResults);
    } catch (err) {
      console.error('Coin flip failed:', err);
    } finally {
      setIsFlipping(false);
    }
  };

  const getStats = () => {
    const heads = results.filter(r => r.result === 'heads').length;
    const tails = results.length - heads;
    return { heads, tails, total: results.length };
  };

  const stats = getStats();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-cosmic-800/60 backdrop-blur rounded-lg border border-quantum-600/30 p-6 mb-6">
        <h2 className="text-2xl font-bold text-fusion-400 mb-4">🪙 Coin Flip</h2>
        <p className="text-quantum-300 mb-6">
          Flip virtual coins using true hardware randomness. Perfect for making fair decisions!
        </p>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-quantum-300 mb-2">
              Coin Type
            </label>
            <select
              value={selectedCoin.id}
              onChange={(e) => setSelectedCoin(coinTypes.find(c => c.id === e.target.value) || coinTypes[0])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            >
              {coinTypes.map(coin => (
                <option key={coin.id} value={coin.id}>
                  {coin.flag} {coin.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-quantum-300 mb-2">
              Number of Coins (1-50)
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={numCoins}
              onChange={(e) => setNumCoins(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            />
          </div>
        </div>

        {/* Flip Button */}
        <button
          onClick={flipCoins}
          disabled={isFlipping}
          className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isFlipping ? 'Flipping...' : `Flip ${numCoins} Coin${numCoins > 1 ? 's' : ''}`}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-md text-red-700">
            Error: {error}
          </div>
        )}
      </div>

      {/* Large Results Display */}
      {results.length > 0 && (
        <div className="bg-cosmic-800/60 backdrop-blur rounded-lg border border-quantum-600/30 p-8 mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">Latest Results</h3>
          <div className="flex justify-center items-center space-x-6 mb-6">
            {results.slice(-5).map((result, index) => (
              <div
                key={index}
                className={`flex flex-col items-center p-6 rounded-xl border-2 shadow-lg ${
                  result.result === 'heads'
                    ? 'bg-yellow-50 border-yellow-400'
                    : 'bg-gray-100 border-gray-400'
                }`}
              >
                <div className="mb-2">
                  <CoinSVG
                    coinType={selectedCoin.id}
                    side={result.result}
                    size={96}
                    className="drop-shadow-lg"
                  />
                </div>
                <div className="text-lg font-bold text-gray-700">
                  {result.result.toUpperCase()}
                </div>
              </div>
            ))}
          </div>

          {results.length > 1 && (
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {stats.heads} Heads • {stats.tails} Tails
              </div>
              <div className="text-lg text-gray-600">
                {Math.round((stats.heads / stats.total) * 100)}% Heads • {Math.round((stats.tails / stats.total) * 100)}% Tails
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-cosmic-800/60 backdrop-blur rounded-lg border border-quantum-600/30 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Results</h3>

          {/* Individual Results */}
          <div className="grid grid-cols-5 md:grid-cols-10 gap-4 mb-6">
            {results.map((result, index) => (
              <div
                key={index}
                className={`flex flex-col items-center p-3 rounded-lg border-2 ${
                  result.result === 'heads'
                    ? 'bg-yellow-50 border-yellow-300'
                    : 'bg-gray-50 border-gray-300'
                }`}
              >
                <div className="mb-1">
                  <CoinSVG
                    coinType={selectedCoin.id}
                    side={result.result}
                    size={48}
                    className="drop-shadow-md"
                  />
                </div>
                <div className="text-xs font-medium text-gray-700">
                  {result.result}
                </div>
              </div>
            ))}
          </div>

          {/* Statistics */}
          {results.length > 1 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Statistics</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{stats.heads}</div>
                  <div className="text-sm text-gray-700">Heads ({Math.round((stats.heads / stats.total) * 100)}%)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-600">{stats.tails}</div>
                  <div className="text-sm text-gray-700">Tails ({Math.round((stats.tails / stats.total) * 100)}%)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                  <div className="text-sm text-gray-700">Total Flips</div>
                </div>
              </div>
            </div>
          )}

          {/* Clear Results */}
          <button
            onClick={() => setResults([])}
            className="mt-4 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Clear Results
          </button>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">🔬 True Randomness</h3>
        <p className="text-blue-700 text-sm">
          These coin flips use cryptographically secure randomness generated from physical entropy sources,
          ensuring truly unpredictable results that can't be reproduced or predicted.
        </p>
      </div>
    </div>
  );
}