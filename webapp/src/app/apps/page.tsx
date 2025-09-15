'use client';

import Link from 'next/link';

const apps = [
  {
    id: 'coin-flip',
    name: 'Coin Flip',
    icon: '🪙',
    description: 'Flip virtual coins with multiple currency designs',
    path: '/apps/coin-flip',
    color: 'bg-yellow-100 border-yellow-200 text-yellow-800'
  },
  {
    id: 'dice-roll',
    name: 'Dice Roll',
    icon: '🎲',
    description: 'Roll various types of dice (d4, d6, d8, d10, d12, d20)',
    path: '/apps/dice-roll',
    color: 'bg-red-100 border-red-200 text-red-800'
  },
  {
    id: 'cards',
    name: 'Playing Cards',
    icon: '🃏',
    description: 'Draw cards from shuffled decks with full customization',
    path: '/apps/cards',
    color: 'bg-blue-100 border-blue-200 text-blue-800'
  },
  {
    id: 'lottery',
    name: 'Lottery Pick',
    icon: '🎫',
    description: 'Generate numbers for popular lottery games',
    path: '/apps/lottery',
    color: 'bg-purple-100 border-purple-200 text-purple-800'
  },
  {
    id: 'choice',
    name: 'Random Choice',
    icon: '🎯',
    description: 'Pick random items from custom lists',
    path: '/apps/choice',
    color: 'bg-green-100 border-green-200 text-green-800'
  },
  {
    id: 'password',
    name: 'Password Generator',
    icon: '🔐',
    description: 'Generate secure passwords with true randomness',
    path: '/apps/password',
    color: 'bg-gray-100 border-gray-200 text-gray-800'
  }
];

export default function AppsHome() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Random Apps</h2>
        <p className="text-lg text-gray-600 mb-6">
          Explore our collection of random number applications powered by true hardware entropy.
          Each app uses cryptographically secure randomness from physical sources.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-blue-500 text-xl">⚡</div>
            <div>
              <h3 className="font-semibold text-blue-900">Why True Randomness Matters</h3>
              <p className="text-blue-700 text-sm mt-1">
                Unlike computer-generated pseudo-random numbers, our apps use physical entropy sources
                like radioactive decay and thermal noise for unpredictable, cryptographically secure results.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apps.map((app) => (
          <Link
            key={app.id}
            href={app.path}
            className="block group"
          >
            <div className={`border-2 rounded-lg p-6 transition-all hover:shadow-lg hover:scale-[1.02] ${app.color}`}>
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">{app.icon}</span>
                <h3 className="text-lg font-semibold">{app.name}</h3>
              </div>
              <p className="text-sm opacity-80">{app.description}</p>
              <div className="mt-4 flex items-center text-sm font-medium">
                <span>Launch App</span>
                <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-12 bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Coming Soon</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
          <div>🎱 Magic 8-Ball</div>
          <div>👥 Team Generator</div>
          <div>🎨 Color Palette</div>
          <div>📊 Statistical Tools</div>
        </div>
        <p className="text-sm text-gray-500 mt-3">
          More apps are in development. Have an idea? Let us know!
        </p>
      </div>
    </div>
  );
}