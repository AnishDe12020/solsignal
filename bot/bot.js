/**
 * SolSignal Telegram Bot
 * Subscribe to real-time trading signals from AI agents
 */

const TelegramBot = require('node-telegram-bot-api');
const { Connection, PublicKey } = require('@solana/web3.js');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PROGRAM_ID = new PublicKey('6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp');
const RPC_URL = 'https://api.devnet.solana.com';

// In-memory subscriber store (use Redis in production)
const subscribers = new Set();
let lastSignalCount = 0;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const connection = new Connection(RPC_URL, 'confirmed');

// Parse signal from account data
function parseSignal(data) {
  try {
    let offset = 8;
    const agent = new PublicKey(data.slice(offset, offset + 32)).toBase58();
    offset += 32;
    offset += 8; // index
    
    const assetLen = data.readUInt32LE(offset);
    offset += 4;
    const asset = data.slice(offset, offset + assetLen).toString('utf8');
    offset += assetLen;
    
    const direction = data[offset] === 0 ? 'LONG 📈' : 'SHORT 📉';
    offset += 1;
    
    const confidence = data[offset];
    offset += 1;
    
    const entryPrice = Number(data.readBigUInt64LE(offset)) / 1e6;
    offset += 8;
    const targetPrice = Number(data.readBigUInt64LE(offset)) / 1e6;
    offset += 8;
    const stopLoss = Number(data.readBigUInt64LE(offset)) / 1e6;
    offset += 8;
    const timeHorizon = Number(data.readBigInt64LE(offset)) * 1000;
    
    return { agent, asset, direction, confidence, entryPrice, targetPrice, stopLoss, timeHorizon };
  } catch {
    return null;
  }
}

function formatPrice(p) {
  if (p < 0.01) return p.toFixed(8);
  if (p < 1) return p.toFixed(4);
  return p.toLocaleString();
}

async function fetchSignals() {
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{ dataSize: 220 }],
  });
  return accounts.map(a => ({
    pubkey: a.pubkey.toBase58(),
    signal: parseSignal(a.account.data)
  })).filter(s => s.signal);
}

async function checkNewSignals() {
  try {
    const signals = await fetchSignals();
    if (signals.length > lastSignalCount && lastSignalCount > 0) {
      // New signal detected
      const newest = signals[signals.length - 1];
      const { signal, pubkey } = newest;
      
      const msg = `🚨 *New Signal Published*

${signal.direction} *${signal.asset}*

💰 Entry: $${formatPrice(signal.entryPrice)}
🎯 Target: $${formatPrice(signal.targetPrice)}
🛑 Stop: $${formatPrice(signal.stopLoss)}
📊 Confidence: ${signal.confidence}%
⏰ Expires: ${new Date(signal.timeHorizon).toLocaleString()}

[Verify on Solscan](https://solscan.io/account/${pubkey}?cluster=devnet)`;
      
      for (const chatId of subscribers) {
        try {
          await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown', disable_web_page_preview: true });
        } catch (e) {
          // Remove invalid subscribers
          if (e.response?.statusCode === 403) {
            subscribers.delete(chatId);
          }
        }
      }
    }
    lastSignalCount = signals.length;
  } catch (e) {
    console.error('Error checking signals:', e.message);
  }
}

// Commands
bot.onText(/\/start/, (msg) => {
  subscribers.add(msg.chat.id);
  bot.sendMessage(msg.chat.id, 
    `✅ Subscribed to SolSignal alerts!\n\nYou'll receive notifications when new trading signals are published on-chain.\n\nCommands:\n/signals - View active signals\n/stop - Unsubscribe`
  );
});

bot.onText(/\/stop/, (msg) => {
  subscribers.delete(msg.chat.id);
  bot.sendMessage(msg.chat.id, '👋 Unsubscribed from alerts.');
});

bot.onText(/\/signals/, async (msg) => {
  const signals = await fetchSignals();
  if (signals.length === 0) {
    return bot.sendMessage(msg.chat.id, 'No active signals.');
  }
  
  let text = `📊 *Active Signals (${signals.length})*\n\n`;
  for (const { signal } of signals.slice(0, 5)) {
    text += `${signal.direction} *${signal.asset}* (${signal.confidence}%)\n`;
    text += `Entry: $${formatPrice(signal.entryPrice)} → Target: $${formatPrice(signal.targetPrice)}\n\n`;
  }
  
  if (signals.length > 5) {
    text += `_...and ${signals.length - 5} more_`;
  }
  
  bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});

// Start polling
console.log('SolSignal Bot started');
setInterval(checkNewSignals, 60000);
checkNewSignals();
