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
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
                ← Back to Dashboard
              </Link>
              <div className="h-6 border-l border-gray-300"></div>
              <h1 className="text-2xl font-bold text-gray-900">Random Apps</h1>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden px-3 py-2 border border-gray-300 rounded-md"
            >
              Apps
            </button>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <aside className={`${
            sidebarOpen ? 'block' : 'hidden'
          } md:block w-full md:w-64 bg-white shadow-sm border-r border-gray-200 p-4`}>
            <nav className="space-y-2">
              <div className="text-sm font-medium text-gray-500 mb-3">Available Apps</div>
              {apps.map((app) => (
                <Link
                  key={app.id}
                  href={app.path}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    pathname === app.path
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-lg">{app.icon}</span>
                  <span className="font-medium">{app.name}</span>
                </Link>
              ))}
            </nav>

            <div className="mt-8 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 text-green-700">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">True Hardware Randomness</span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                Powered by physical entropy sources for cryptographic security
              </p>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}