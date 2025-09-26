'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  return (
    <header className={`mb-6 p-4 backdrop-blur rounded-xl border transition-all duration-500 ${
      theme === 'neon'
        ? 'bg-neon-bg/80 border-neon-panel'
        : 'bg-cosmic-800/80 border-quantum-600/20'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <Image
              src="/images/hotbits-small.png"
              alt="Hotbits Logo"
              width={40}
              height={40}
              className="w-10 h-10"
            />
            <h1 className={`text-2xl font-bold transition-colors duration-500 ${
              theme === 'neon' ? 'text-neon-text' : 'text-fusion-400'
            }`}>
              Hotbits
            </h1>
          </Link>
        </div>

        {/* Navigation Buttons */}
        <nav className="flex items-center space-x-3">
          {/* Home Button */}
          <Link
            href="/"
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              pathname === '/'
                ? theme === 'neon'
                  ? 'bg-neon-action text-white shadow-lg'
                  : 'bg-gradient-to-r from-quantum-500 to-stellar-500 text-white shadow-lg'
                : theme === 'neon'
                  ? 'bg-neon-panel/20 text-neon-text border border-neon-panel hover:bg-neon-panel/40'
                  : 'bg-cosmic-700/50 text-quantum-300 border border-quantum-600/30 hover:bg-cosmic-700'
            }`}
          >
            🏠 Home
          </Link>

          {/* Random Apps Button */}
          <Link
            href="/apps"
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              pathname.startsWith('/apps')
                ? theme === 'neon'
                  ? 'bg-neon-action text-white shadow-lg'
                  : 'bg-gradient-to-r from-quantum-500 to-stellar-500 text-white shadow-lg'
                : theme === 'neon'
                  ? 'bg-neon-panel/20 text-neon-text border border-neon-panel hover:bg-neon-panel/40'
                  : 'bg-cosmic-700/50 text-quantum-300 border border-quantum-600/30 hover:bg-cosmic-700'
            }`}
          >
            🎲 Apps
          </Link>

          {/* Reports Button */}
          <Link
            href="/reports"
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              pathname === '/reports'
                ? theme === 'neon'
                  ? 'bg-neon-action text-white shadow-lg'
                  : 'bg-gradient-to-r from-quantum-500 to-stellar-500 text-white shadow-lg'
                : theme === 'neon'
                  ? 'bg-neon-panel/20 text-neon-text border border-neon-panel hover:bg-neon-panel/40'
                  : 'bg-cosmic-700/50 text-quantum-300 border border-quantum-600/30 hover:bg-cosmic-700'
            }`}
          >
            📊 Reports
          </Link>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              theme === 'neon'
                ? 'bg-neon-panel/20 text-neon-text border border-neon-panel hover:bg-neon-panel/40'
                : 'bg-cosmic-700/50 text-quantum-300 border border-quantum-600/30 hover:bg-cosmic-700'
            }`}
            aria-label="Toggle theme"
          >
            {theme === 'neon' ? '🌌 Cosmic' : '💫 Neon'}
          </button>
        </nav>
      </div>
    </header>
  );
}