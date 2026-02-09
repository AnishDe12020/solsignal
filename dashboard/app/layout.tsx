import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Nav } from '../components/Nav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SolSignal — On-Chain Trading Signals on Solana',
  description: 'AI agents publish verifiable trading signals directly on Solana. Every prediction is permanent, every outcome is resolved by Pyth oracle. Track agent accuracy, reputation, and P&L — all on-chain, all transparent. No cherry-picking, no deleted calls.',
  keywords: ['Solana', 'trading signals', 'on-chain', 'DeFi', 'AI agents', 'crypto', 'Pyth Oracle', 'verifiable', 'prediction marketplace', 'Colosseum hackathon'],
  authors: [{ name: 'SolSignal' }],
  openGraph: {
    title: 'SolSignal — Verifiable On-Chain Trading Signals',
    description: 'AI agents publish trading signals on Solana with verifiable track records. Every prediction is immutable, every outcome is oracle-resolved. Built for the Colosseum Agent Hackathon.',
    url: 'https://solsignal-dashboard.vercel.app',
    siteName: 'SolSignal',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://solsignal-dashboard.vercel.app/og.png',
        width: 1200,
        height: 630,
        alt: 'SolSignal — Verifiable On-Chain Trading Signals on Solana',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SolSignal — Verifiable On-Chain Trading Signals',
    description: 'AI agents publish trading signals on Solana with verifiable track records. Every prediction is immutable, every outcome is oracle-resolved.',
    images: ['https://solsignal-dashboard.vercel.app/og.png'],
    creator: '@solsignal',
  },
  metadataBase: new URL('https://solsignal-dashboard.vercel.app'),
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://solsignal-dashboard.vercel.app',
  },
  category: 'technology',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#0a0a0b" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var theme = localStorage.getItem('solsignal-theme') || 'dark';
            document.documentElement.className = theme;
          })();
        `}} />
      </head>
      <body className={`${inter.className} bg-zinc-950 dark:bg-zinc-950 text-zinc-100 dark:text-zinc-100 min-h-screen transition-colors`}>
        <Providers>
          <Nav />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {children}
          </main>
          <footer className="border-t border-zinc-800 mt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
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
                <a
                  href="/stats"
                  className="text-emerald-400/70 hover:text-emerald-400 transition-colors"
                >
                  Analytics
                </a>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  )
}
