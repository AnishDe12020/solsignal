'use client';

import { useState } from 'react';

const links = [
  { href: '/', label: 'Signals' },
  { href: '/agents', label: 'Agents' },
  { href: '/stats', label: 'Stats' },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
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
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden flex flex-col gap-1.5 p-2 -mr-2"
          aria-label="Toggle menu"
        >
          <span className={`block w-5 h-0.5 bg-zinc-300 transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-zinc-300 transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-zinc-300 transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
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
