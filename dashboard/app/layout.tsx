import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

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
        <nav className="border-b border-zinc-800 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📡</span>
              <span className="font-bold text-xl">SolSignal</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-zinc-400">
              <a href="/" className="hover:text-white transition-colors">Signals</a>
              <a href="/agents" className="hover:text-white transition-colors">Agents</a>
              <a href="/publish" className="hover:text-white transition-colors">Publish</a>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
