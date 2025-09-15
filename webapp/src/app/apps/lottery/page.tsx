'use client';

import { useState } from 'react';
import { useRandomNumbers } from '@/hooks/useRandomNumbers';

interface LotteryResult {
  mainNumbers: number[];
  bonusNumbers: number[];
  timestamp: Date;
}

interface LotteryConfig {
  id: string;
  name: string;
  country: string;
  flag: string;
  mainCount: number;
  mainMin: number;
  mainMax: number;
  bonusCount?: number;
  bonusMin?: number;
  bonusMax?: number;
  jackpot?: string;
}

const lotteries: LotteryConfig[] = [
  {
    id: 'powerball',
    name: 'Powerball',
    country: 'USA',
    flag: '🇺🇸',
    mainCount: 5,
    mainMin: 1,
    mainMax: 69,
    bonusCount: 1,
    bonusMin: 1,
    bonusMax: 26,
    jackpot: '$100M+'
  },
  {
    id: 'mega-millions',
    name: 'Mega Millions',
    country: 'USA',
    flag: '🇺🇸',
    mainCount: 5,
    mainMin: 1,
    mainMax: 70,
    bonusCount: 1,
    bonusMin: 1,
    bonusMax: 25,
    jackpot: '$50M+'
  },
  {
    id: 'euromillions',
    name: 'EuroMillions',
    country: 'Europe',
    flag: '🇪🇺',
    mainCount: 5,
    mainMin: 1,
    mainMax: 50,
    bonusCount: 2,
    bonusMin: 1,
    bonusMax: 12,
    jackpot: '€50M+'
  },
  {
    id: 'uk-lotto',
    name: 'UK Lotto',
    country: 'United Kingdom',
    flag: '🇬🇧',
    mainCount: 6,
    mainMin: 1,
    mainMax: 59,
    jackpot: '£5M+'
  },
  {
    id: 'canada-lotto',
    name: 'Lotto 6/49',
    country: 'Canada',
    flag: '🇨🇦',
    mainCount: 6,
    mainMin: 1,
    mainMax: 49,
    bonusCount: 1,
    bonusMin: 1,
    bonusMax: 49,
    jackpot: 'CAD $5M+'
  },
  {
    id: 'oz-lotto',
    name: 'Oz Lotto',
    country: 'Australia',
    flag: '🇦🇺',
    mainCount: 7,
    mainMin: 1,
    mainMax: 45,
    jackpot: 'AUD $2M+'
  }
];

export default function LotteryQuickPick() {
  const [selectedLottery, setSelectedLottery] = useState(lotteries[0]);
  const [numTickets, setNumTickets] = useState(1);
  const [results, setResults] = useState<LotteryResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { getRandomIntegers, error } = useRandomNumbers();

  const generateTickets = async () => {
    if (numTickets < 1 || numTickets > 20) return;

    setIsGenerating(true);
    try {
      console.log(`Generating ${numTickets} tickets for ${selectedLottery.name}...`);
      const newResults: LotteryResult[] = [];

      for (let i = 0; i < numTickets; i++) {
        // Generate main numbers (no duplicates)
        const mainNumbers = await generateUniqueNumbers(
          selectedLottery.mainCount,
          selectedLottery.mainMin,
          selectedLottery.mainMax
        );

        // Generate bonus numbers if needed
        let bonusNumbers: number[] = [];
        if (selectedLottery.bonusCount && selectedLottery.bonusMin && selectedLottery.bonusMax) {
          bonusNumbers = await generateUniqueNumbers(
            selectedLottery.bonusCount,
            selectedLottery.bonusMin,
            selectedLottery.bonusMax,
            mainNumbers // Exclude main numbers from bonus selection
          );
        }

        newResults.push({
          mainNumbers: mainNumbers.sort((a, b) => a - b),
          bonusNumbers: bonusNumbers.sort((a, b) => a - b),
          timestamp: new Date()
        });
      }

      console.log('Generated lottery results:', newResults);
      setResults(newResults);
    } catch (err) {
      console.error('Lottery generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateUniqueNumbers = async (count: number, min: number, max: number, exclude: number[] = []): Promise<number[]> => {
    const numbers: number[] = [];
    const maxAttempts = 1000; // Prevent infinite loops
    let attempts = 0;

    while (numbers.length < count && attempts < maxAttempts) {
      const batch = await getRandomIntegers(count - numbers.length, min, max);

      for (const num of batch) {
        if (!numbers.includes(num) && !exclude.includes(num) && numbers.length < count) {
          numbers.push(num);
        }
      }
      attempts++;
    }

    return numbers;
  };

  const calculateOdds = (lottery: LotteryConfig): string => {
    const mainOdds = combination(lottery.mainMax, lottery.mainCount);
    const bonusOdds = lottery.bonusCount ? combination(lottery.bonusMax!, lottery.bonusCount) : 1;
    const totalOdds = mainOdds * bonusOdds;

    if (totalOdds > 1000000) {
      return `1 in ${(totalOdds / 1000000).toFixed(1)}M`;
    }
    return `1 in ${totalOdds.toLocaleString()}`;
  };

  const combination = (n: number, r: number): number => {
    if (r > n) return 0;
    let result = 1;
    for (let i = 0; i < r; i++) {
      result = result * (n - i) / (i + 1);
    }
    return Math.round(result);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🎫 Lottery Quick Pick</h2>
        <p className="text-gray-600 mb-6">
          Generate lottery numbers for popular games using true hardware randomness. Good luck!
        </p>

        {/* Lottery Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Lottery
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lotteries.map(lottery => (
              <button
                key={lottery.id}
                onClick={() => setSelectedLottery(lottery)}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  selectedLottery.id === lottery.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">{lottery.flag}</span>
                  <span className="font-semibold text-gray-900">{lottery.name}</span>
                </div>
                <div className="text-xs text-gray-600">
                  {lottery.mainCount} numbers ({lottery.mainMin}-{lottery.mainMax})
                  {lottery.bonusCount && ` + ${lottery.bonusCount} bonus`}
                </div>
                <div className="text-xs text-green-600 font-medium mt-1">
                  {lottery.jackpot}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Number of Tickets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Tickets (1-20)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={numTickets}
              onChange={(e) => setNumTickets(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            />
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <div className="font-medium">Odds of winning:</div>
              <div>{calculateOdds(selectedLottery)}</div>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateTickets}
          disabled={isGenerating}
          className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? 'Generating...' : `Generate ${numTickets} Ticket${numTickets > 1 ? 's' : ''}`}
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
          <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">Your Lucky Numbers</h3>

          {results.slice(-3).map((result, index) => (
            <div key={index} className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
              <div className="text-center mb-4">
                <div className="text-lg font-semibold text-gray-800">Ticket #{results.length - index}</div>
                <div className="text-sm text-gray-600">{selectedLottery.name}</div>
              </div>

              <div className="flex justify-center items-center space-x-3 mb-4">
                {result.mainNumbers.map((num, i) => (
                  <div
                    key={i}
                    className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg"
                  >
                    {num}
                  </div>
                ))}

                {result.bonusNumbers.length > 0 && (
                  <>
                    <div className="text-gray-400 font-bold text-2xl">+</div>
                    {result.bonusNumbers.map((num, i) => (
                      <div
                        key={i}
                        className="w-12 h-12 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg"
                      >
                        {num}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          ))}

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {results.length} Ticket{results.length > 1 ? 's' : ''} Generated
            </div>
            <div className="text-lg text-gray-600">
              {selectedLottery.name} • {calculateOdds(selectedLottery)} chance
            </div>
          </div>
        </div>
      )}

      {/* All Results */}
      {results.length > 3 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">All Tickets</h3>

          <div className="space-y-3">
            {results.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-600">#{index + 1}</span>
                  <div className="flex space-x-1">
                    {result.mainNumbers.map((num, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold"
                      >
                        {num}
                      </span>
                    ))}
                    {result.bonusNumbers.length > 0 && (
                      <>
                        <span className="text-gray-400">+</span>
                        {result.bonusNumbers.map((num, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center justify-center w-8 h-8 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold"
                          >
                            {num}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {result.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setResults([])}
            className="mt-4 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Clear All Tickets
          </button>
        </div>
      )}

      {/* Lottery Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-900 mb-2">🍀 Disclaimer</h3>
        <p className="text-yellow-700 text-sm">
          These numbers are generated using cryptographically secure randomness for entertainment purposes.
          Please play responsibly and never spend more than you can afford to lose.
        </p>
      </div>
    </div>
  );
}