'use client';

import { useState } from 'react';
import { useRandomNumbers } from '@/hooks/useRandomNumbers';

interface Card {
  suit: string;
  value: string;
  color: 'red' | 'black';
  unicode: string;
}

interface DrawnCard extends Card {
  timestamp: Date;
}

const suits = [
  { name: 'Spades', symbol: '♠', color: 'black' as const, unicode: '♠' },
  { name: 'Hearts', symbol: '♥', color: 'red' as const, unicode: '♥' },
  { name: 'Diamonds', symbol: '♦', color: 'red' as const, unicode: '♦' },
  { name: 'Clubs', symbol: '♣', color: 'black' as const, unicode: '♣' }
];

const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export default function PlayingCards() {
  const [numDecks, setNumDecks] = useState(1);
  const [numCards, setNumCards] = useState(5);
  const [selectedSuits, setSelectedSuits] = useState(suits.map(s => s.name));
  const [includeJokers, setIncludeJokers] = useState(false);
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const { getRandomIntegers, error } = useRandomNumbers();

  const createDeck = (): Card[] => {
    const deck: Card[] = [];

    // Add regular cards
    for (let d = 0; d < numDecks; d++) {
      for (const suit of suits) {
        if (selectedSuits.includes(suit.name)) {
          for (const value of values) {
            deck.push({
              suit: suit.name,
              value,
              color: suit.color,
              unicode: suit.unicode
            });
          }
        }
      }

      // Add jokers if enabled
      if (includeJokers) {
        deck.push({ suit: 'Joker', value: 'Red', color: 'red', unicode: '🃏' });
        deck.push({ suit: 'Joker', value: 'Black', color: 'black', unicode: '🃏' });
      }
    }

    return deck;
  };

  const drawCards = async () => {
    if (numCards < 1 || numCards > 100) return;

    setIsDrawing(true);
    try {
      const deck = createDeck();
      if (deck.length === 0) {
        alert('Please select at least one suit!');
        return;
      }

      if (numCards > deck.length) {
        alert(`Cannot draw ${numCards} cards from a deck of ${deck.length} cards!`);
        return;
      }

      console.log(`Drawing ${numCards} cards from deck of ${deck.length}...`);
      const randomIndices = await getRandomIntegers(numCards, 0, deck.length - 1);

      // Remove duplicates by tracking used indices
      const usedIndices = new Set<number>();
      const selectedCards: Card[] = [];

      for (const index of randomIndices) {
        if (!usedIndices.has(index) && selectedCards.length < numCards) {
          usedIndices.add(index);
          selectedCards.push(deck[index]);
        }
      }

      // If we need more cards due to duplicates, draw additional ones
      while (selectedCards.length < numCards && usedIndices.size < deck.length) {
        const additionalIndices = await getRandomIntegers(numCards - selectedCards.length, 0, deck.length - 1);
        for (const index of additionalIndices) {
          if (!usedIndices.has(index) && selectedCards.length < numCards) {
            usedIndices.add(index);
            selectedCards.push(deck[index]);
          }
        }
      }

      const newDrawnCards = selectedCards.map(card => ({
        ...card,
        timestamp: new Date()
      }));

      console.log('Drawn cards:', newDrawnCards);
      setDrawnCards(newDrawnCards);
    } catch (err) {
      console.error('Card draw failed:', err);
    } finally {
      setIsDrawing(false);
    }
  };

  const toggleSuit = (suitName: string) => {
    setSelectedSuits(prev =>
      prev.includes(suitName)
        ? prev.filter(s => s !== suitName)
        : [...prev, suitName]
    );
  };

  const getCardDisplay = (card: Card) => {
    if (card.suit === 'Joker') {
      return '🃏';
    }
    return `${card.value}${card.unicode}`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-cosmic-800/60 backdrop-blur rounded-lg border border-quantum-600/30 p-6 mb-6">
        <h2 className="text-2xl font-bold text-fusion-400 mb-4">🃏 Playing Cards</h2>
        <p className="text-quantum-300 mb-6">
          Draw cards from a customizable deck with true hardware randomness. Perfect for card games and magic tricks!
        </p>

        {/* Deck Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-quantum-300 mb-2">
              Number of Decks (1-8)
            </label>
            <input
              type="number"
              min="1"
              max="8"
              value={numDecks}
              onChange={(e) => setNumDecks(Math.max(1, Math.min(8, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-quantum-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-quantum-300 mb-2">
              Cards to Draw (1-100)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={numCards}
              onChange={(e) => setNumCards(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-quantum-300"
            />
          </div>
        </div>

        {/* Suit Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-quantum-300 mb-3">
            Select Suits
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {suits.map(suit => (
              <button
                key={suit.name}
                onClick={() => toggleSuit(suit.name)}
                className={`p-3 border-2 rounded-lg transition-all ${
                  selectedSuits.includes(suit.name)
                    ? `border-${suit.color === 'red' ? 'red' : 'black'}-500 bg-${suit.color === 'red' ? 'red' : 'gray'}-50`
                    : 'border-quantum-600/30 bg-cosmic-800/60 backdrop-blur hover:bg-gray-50'
                }`}
              >
                <div className={`text-2xl mb-1 ${suit.color === 'red' ? 'text-red-600' : 'text-black'}`}>
                  {suit.unicode}
                </div>
                <div className="text-xs font-medium text-quantum-300">{suit.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Jokers Option */}
        <div className="mb-6">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeJokers}
              onChange={(e) => setIncludeJokers(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-quantum-300">Include Jokers (2 per deck)</span>
          </label>
        </div>

        {/* Draw Button */}
        <button
          onClick={drawCards}
          disabled={isDrawing || selectedSuits.length === 0}
          className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isDrawing ? 'Drawing...' : `Draw ${numCards} Card${numCards > 1 ? 's' : ''}`}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-md text-red-700">
            Error: {error}
          </div>
        )}
      </div>

      {/* Large Results Display */}
      {drawnCards.length > 0 && (
        <div className="bg-cosmic-800/60 backdrop-blur rounded-lg border border-quantum-600/30 p-8 mb-6">
          <h3 className="text-xl font-semibold text-fusion-400 mb-6 text-center">Drawn Cards</h3>
          <div className="flex justify-center items-center space-x-4 mb-6 flex-wrap gap-4">
            {drawnCards.slice(-8).map((card, index) => (
              <div
                key={index}
                className={`flex flex-col items-center p-4 rounded-xl border-2 shadow-lg bg-cosmic-800/60 backdrop-blur ${
                  card.color === 'red' ? 'border-red-300' : 'border-gray-400'
                }`}
                style={{ minWidth: '80px' }}
              >
                <div className={`text-4xl font-bold mb-2 ${card.color === 'red' ? 'text-red-600' : 'text-black'}`}>
                  {getCardDisplay(card)}
                </div>
                <div className="text-xs text-center text-quantum-300">
                  {card.suit !== 'Joker' ? `${card.value} of ${card.suit}` : `${card.value} Joker`}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-fusion-400 mb-2">
              {drawnCards.length} Cards Drawn
            </div>
            <div className="text-lg text-quantum-300">
              From {numDecks} deck{numDecks > 1 ? 's' : ''} • {selectedSuits.join(', ')} suits
            </div>
          </div>
        </div>
      )}

      {/* Detailed Results */}
      {drawnCards.length > 0 && (
        <div className="bg-cosmic-800/60 backdrop-blur rounded-lg border border-quantum-600/30 p-6 mb-6">
          <h3 className="text-lg font-semibold text-fusion-400 mb-4">All Drawn Cards</h3>

          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3 mb-6">
            {drawnCards.map((card, index) => (
              <div
                key={index}
                className={`flex flex-col items-center p-2 rounded-lg border ${
                  card.color === 'red' ? 'border-red-200 bg-red-50' : 'border-quantum-600/30 bg-gray-50'
                }`}
              >
                <div className={`text-lg font-bold ${card.color === 'red' ? 'text-red-600' : 'text-black'}`}>
                  {getCardDisplay(card)}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setDrawnCards([])}
            className="px-4 py-2 text-sm bg-gray-100 text-quantum-300 rounded-md hover:bg-gray-200"
          >
            Clear Cards
          </button>
        </div>
      )}

      {/* Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-900 mb-2">🔬 True Randomness</h3>
        <p className="text-green-700 text-sm">
          Card draws use cryptographically secure randomness from physical entropy sources,
          ensuring fair and unpredictable results for any card game or magic trick.
        </p>
      </div>
    </div>
  );
}