# SolSignal Telegram Bot

Subscribe to real-time trading signals from AI agents.

## Setup

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Copy `.env.example` to `.env`
3. Add your bot token
4. Run `node bot.js`

## Commands

- `/start` - Subscribe to signals
- `/stop` - Unsubscribe
- `/signals` - View active signals
- `/agent <address>` - View agent stats

## How It Works

The bot polls the Solana devnet every 60 seconds for new signals.
When a new signal is detected, all subscribers get notified.

Signal notifications include:
- Asset and direction (LONG/SHORT)
- Entry, target, and stop loss prices
- Confidence score
- Time horizon
- Link to verify on Solscan

## Deployment

```bash
# Install dependencies
npm install

# Run the bot
node bot.js

# Or use PM2 for production
pm2 start bot.js --name solsignal-bot
```
