'use client';

import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';

const links = [
  { href: '/', label: 'Signals' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/autonomous', label: '🤖 Autonomous' },
  { href: '/compare', label: 'Compare' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/agents', label: 'Agents' },
  { href: '/stats', label: 'Stats' },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="border-b border-zinc-800 dark:border-zinc-800 bg-zinc-950/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl">📡</span>
          <span className="font-bold text-xl tracking-tight">SolSignal</span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 text-sm">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/publish"
            className="ml-2 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
          >
            Publish
          </a>
          <button
            onClick={toggleTheme}
            className="ml-3 p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="flex flex-col gap-1.5 p-2 -mr-2"
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-0.5 bg-zinc-300 transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-zinc-300 transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-zinc-300 transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950 px-6 py-4 space-y-1">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/publish"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors text-center mt-2"
          >
            Publish Signal
          </a>
        </div>
      )}
    </nav>
  );
}
