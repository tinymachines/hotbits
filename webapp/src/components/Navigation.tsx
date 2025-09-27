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
        <nav className="flex items-center space-x-2">
          {/* Home Button */}
          <Link
            href="/"
            className={`px-2 py-1 rounded text-xs font-normal transition-all duration-200 ${
              pathname === '/'
                ? theme === 'neon'
                  ? 'bg-neon-panel text-neon-bg border border-neon-panel'
                  : 'bg-quantum-300 text-cosmic-900 border border-quantum-300'
                : theme === 'neon'
                  ? 'bg-transparent text-neon-panel border border-neon-panel hover:bg-neon-panel hover:text-neon-bg'
                  : 'bg-transparent text-quantum-300 border border-quantum-300 hover:bg-quantum-300 hover:text-cosmic-900'
            }`}
          >
            Home
          </Link>

          {/* Random Apps Button */}
          <Link
            href="/apps"
            className={`px-2 py-1 rounded text-xs font-normal transition-all duration-200 ${
              pathname.startsWith('/apps')
                ? theme === 'neon'
                  ? 'bg-neon-panel text-neon-bg border border-neon-panel'
                  : 'bg-quantum-300 text-cosmic-900 border border-quantum-300'
                : theme === 'neon'
                  ? 'bg-transparent text-neon-panel border border-neon-panel hover:bg-neon-panel hover:text-neon-bg'
                  : 'bg-transparent text-quantum-300 border border-quantum-300 hover:bg-quantum-300 hover:text-cosmic-900'
            }`}
          >
            Apps
          </Link>


          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className={`px-2 py-1 rounded text-xs font-normal transition-all duration-200 ${
              theme === 'neon'
                ? 'bg-transparent text-neon-panel border border-neon-panel hover:bg-neon-panel hover:text-neon-bg'
                : 'bg-transparent text-quantum-300 border border-quantum-300 hover:bg-quantum-300 hover:text-cosmic-900'
            }`}
            aria-label="Toggle theme"
          >
            {theme === 'neon' ? 'Cosmic' : 'Neon'}
          </button>
        </nav>
      </div>
    </header>
  );
}