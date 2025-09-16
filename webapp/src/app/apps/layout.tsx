'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const apps = [
  { id: 'coin-flip', name: 'Coin Flip', icon: '🪙', path: '/apps/coin-flip' },
  { id: 'dice-roll', name: 'Dice Roll', icon: '🎲', path: '/apps/dice-roll' },
  { id: 'cards', name: 'Playing Cards', icon: '🃏', path: '/apps/cards' },
  { id: 'lottery', name: 'Lottery Pick', icon: '🎫', path: '/apps/lottery' },
  { id: 'choice', name: 'Random Choice', icon: '🎯', path: '/apps/choice' },
  { id: 'password', name: 'Password Gen', icon: '🔐', path: '/apps/password' },
];

export default function AppsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-cosmic-dust">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="bg-cosmic-800/80 backdrop-blur shadow-quantum border-b border-quantum-600/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-quantum-400 hover:text-quantum-300 font-medium transition-colors">
                ← Back to Dashboard
              </Link>
              <div className="h-6 border-l border-quantum-600/40"></div>
              <h1 className="text-2xl font-bold text-fusion-400 shadow-fusion">Random Apps</h1>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden px-3 py-2 border border-quantum-600/40 rounded-md text-quantum-300 hover:bg-cosmic-700/50"
            >
              Apps
            </button>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <aside className={`${
            sidebarOpen ? 'block' : 'hidden'
          } md:block w-full md:w-64 bg-cosmic-800/60 backdrop-blur shadow-quantum border-r border-quantum-600/20 p-4`}>
            <nav className="space-y-2">
              <div className="text-sm font-medium text-quantum-400 mb-3">Available Apps</div>
              {apps.map((app) => (
                <Link
                  key={app.id}
                  href={app.path}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                    pathname === app.path
                      ? 'bg-quantum-600/20 text-fusion-400 border border-quantum-400/40 shadow-quantum'
                      : 'text-quantum-300 hover:bg-cosmic-700/50 hover:text-quantum-200'
                  }`}
                >
                  <span className="text-lg">{app.icon}</span>
                  <span className="font-medium">{app.name}</span>
                </Link>
              ))}
            </nav>

            <div className="mt-8 p-3 bg-fusion-600/10 rounded-lg border border-fusion-400/30">
              <div className="flex items-center space-x-2 text-fusion-400">
                <div className="w-2 h-2 bg-fusion-500 rounded-full shadow-fusion"></div>
                <span className="text-sm font-medium">True Hardware Randomness</span>
              </div>
              <p className="text-xs text-quantum-300 mt-1">
                Powered by physical entropy sources for cryptographic security
              </p>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6 bg-cosmic-900/20">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}