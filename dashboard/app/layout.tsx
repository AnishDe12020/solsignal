import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SolSignal - On-Chain Market Intelligence',
  description: 'Verifiable trading signals on Solana. Track agent accuracy, reputation, and signal performance.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 min-h-screen`}>
        <Providers>
          <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <span className="text-2xl">📡</span>
                <span className="font-bold text-xl tracking-tight">SolSignal</span>
              </a>
              <div className="flex items-center gap-1 text-sm">
                <a href="/" className="px-3 py-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors">
                  Signals
                </a>
                <a href="/agents" className="px-3 py-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors">
                  Agents
                </a>
                <a href="/stats" className="px-3 py-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors">
                  Stats
                </a>
                <a href="/publish" className="ml-2 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors">
                  Publish
                </a>
              </div>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto px-6 py-8">
            {children}
          </main>
          <footer className="border-t border-zinc-800 mt-16">
            <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between text-sm text-zinc-500">
              <div className="flex items-center gap-2">
                <span>📡</span>
                <span>SolSignal</span>
                <span className="text-zinc-700">&middot;</span>
                <span>On-Chain Market Intelligence</span>
              </div>
              <div className="flex items-center gap-4">
                <span>Solana Devnet</span>
                <a
                  href="https://solscan.io/account/6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp?cluster=devnet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400/70 hover:text-emerald-400 transition-colors"
                >
                  Program
                </a>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  )
}
