#!/usr/bin/env node

/**
 * SolSignal Relay Server
 * 
 * Accepts signal submissions via HTTP and publishes them on-chain
 * using batman's wallet. This lets other agents publish without
 * needing their own Solana wallet.
 * 
 * Usage: node scripts/signal-relay.js
 * Port: 3847 (or PORT env var)
 */

const http = require('http');
const { Connection, Keypair, PublicKey, SystemProgram } = require('@solana/web3.js');
const { AnchorProvider, Program, BN, Wallet } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

const PROGRAM_ID = new PublicKey('6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp');
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PORT = process.env.PORT || 3847;

// Load IDL
const idlPath = path.join(__dirname, '..', 'sol-signal', 'target', 'idl', 'sol_signal.json');
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

// Load wallet
const walletPath = process.env.ANCHOR_WALLET || path.join(process.env.HOME, '.config/solana/id.json');
const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));

// Setup Anchor
const connection = new Connection(RPC_URL, 'confirmed');
const wallet = new Wallet(keypair);
const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
const program = new Program(idl, provider);

// Track published signals per agent to prevent spam
const agentSignalCount = {};
const MAX_SIGNALS_PER_AGENT = 10;

// Queued signals waiting to be published
const queue = [];
let processing = false;

async function publishSignal(signal) {
  const { asset, direction, confidence, entryPrice, targetPrice, stopLoss, timeHorizonHours, reasoning, agentName } = signal;
  
  // Get registry for next index
  const [registryPDA] = PublicKey.findProgramAddressSync([Buffer.from('registry')], PROGRAM_ID);
  const registry = await program.account.registry.fetch(registryPDA);
  const nextIndex = Number(registry.totalSignals) + 1;
  
  const [agentProfilePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), keypair.publicKey.toBuffer()],
    PROGRAM_ID
  );
  
  const indexBuf = Buffer.alloc(8);
  indexBuf.writeBigUInt64LE(BigInt(nextIndex));
  const [signalPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('signal'), keypair.publicKey.toBuffer(), indexBuf],
    PROGRAM_ID
  );
  
  const directionEnum = direction === 'long' ? { long: {} } : { short: {} };
  const timeHorizon = Math.floor(Date.now() / 1000) + (timeHorizonHours * 3600);
  
  // Prepend agent name to reasoning
  const fullReasoning = agentName ? `[${agentName}] ${reasoning}`.substring(0, 512) : reasoning.substring(0, 512);
  
  const tx = await program.methods
    .publishSignal(
      asset,
      directionEnum,
      confidence,
      new BN(Math.round(entryPrice * 1e6)),
      new BN(Math.round(targetPrice * 1e6)),
      new BN(Math.round(stopLoss * 1e6)),
      new BN(timeHorizon),
      fullReasoning
    )
    .accounts({
      signal: signalPDA,
      agentProfile: agentProfilePDA,
      registry: registryPDA,
      agent: keypair.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  
  return { tx, signalPDA: signalPDA.toBase58(), index: nextIndex };
}

async function processQueue() {
  if (processing || queue.length === 0) return;
  processing = true;
  
  while (queue.length > 0) {
    const { signal, resolve, reject } = queue.shift();
    try {
      const result = await publishSignal(signal);
      resolve(result);
    } catch (err) {
      reject(err);
    }
    // Small delay between publishes
    await new Promise(r => setTimeout(r, 2000));
  }
  
  processing = false;
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      program: PROGRAM_ID.toBase58(),
      network: 'devnet',
      queueLength: queue.length,
      agentsServed: Object.keys(agentSignalCount).length,
    }));
    return;
  }
  
  if (req.method === 'POST' && req.url === '/publish') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const signal = JSON.parse(body);
        
        // Validate
        const required = ['asset', 'direction', 'confidence', 'entryPrice', 'targetPrice', 'stopLoss', 'timeHorizonHours', 'reasoning'];
        for (const field of required) {
          if (signal[field] === undefined) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Missing: ${field}` }));
            return;
          }
        }
        
        if (!['long', 'short'].includes(signal.direction)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'direction must be "long" or "short"' }));
          return;
        }
        
        // Rate limit per agent
        const agentKey = signal.agentName || 'anonymous';
        agentSignalCount[agentKey] = (agentSignalCount[agentKey] || 0) + 1;
        if (agentSignalCount[agentKey] > MAX_SIGNALS_PER_AGENT) {
          res.writeHead(429, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Rate limit: max ${MAX_SIGNALS_PER_AGENT} signals per agent` }));
          return;
        }
        
        // Queue and publish
        const result = await new Promise((resolve, reject) => {
          queue.push({ signal, resolve, reject });
          processQueue();
        });
        
        console.log(`[${new Date().toISOString()}] Published signal for ${agentKey}: ${signal.asset} ${signal.direction} → tx: ${result.tx}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: `Signal published on-chain!`,
          tx: result.tx,
          signalPDA: result.signalPDA,
          index: result.index,
          verify: `https://solscan.io/tx/${result.tx}?cluster=devnet`,
          dashboard: 'https://solsignal-dashboard.vercel.app',
        }));
      } catch (err) {
        console.error(`[${new Date().toISOString()}] Error:`, err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }
  
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n📡 SolSignal Relay Server`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Network: devnet`);
  console.log(`   Program: ${PROGRAM_ID.toBase58()}`);
  console.log(`   Wallet: ${keypair.publicKey.toBase58()}`);
  console.log(`\n   POST /publish — submit a signal`);
  console.log(`   GET /health — server status\n`);
});
