#!/usr/bin/env node

/**
 * SolSignal CLI - Publish trading signals to Solana
 * 
 * Usage:
 *   node publish.js <asset> <direction> <confidence> <entry> <target> <stop> <hours> "<reasoning>"
 * 
 * Example:
 *   node publish.js SOL/USDC long 85 125 145 118 24 "Bullish divergence on RSI"
 */

const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram, Connection, Keypair } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

const PROGRAM_ID = new PublicKey("6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp");

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 8) {
    console.log("Usage: publish.js <asset> <direction> <confidence> <entry> <target> <stop> <hours> <reasoning>");
    console.log("Example: publish.js SOL/USDC long 85 125 145 118 24 \"Bullish divergence\"");
    process.exit(1);
  }

  const [asset, directionStr, confidenceStr, entryStr, targetStr, stopStr, hoursStr, ...reasoningParts] = args;
  
  const direction = directionStr.toLowerCase() === "long" ? { long: {} } : { short: {} };
  const confidence = parseInt(confidenceStr);
  const entryPrice = parseFloat(entryStr);
  const targetPrice = parseFloat(targetStr);
  const stopLoss = parseFloat(stopStr);
  const hours = parseInt(hoursStr);
  const reasoning = reasoningParts.join(" ");

  console.log("Publishing signal...");
  console.log(`  Asset: ${asset}`);
  console.log(`  Direction: ${directionStr.toUpperCase()}`);
  console.log(`  Confidence: ${confidence}%`);
  console.log(`  Entry: $${entryPrice}`);
  console.log(`  Target: $${targetPrice}`);
  console.log(`  Stop: $${stopLoss}`);
  console.log(`  Horizon: ${hours}h`);
  console.log(`  Reasoning: ${reasoning.slice(0, 50)}...`);

  // Load wallet
  const walletPath = process.env.ANCHOR_WALLET || path.join(process.env.HOME, ".config/solana/id.json");
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  // Setup connection
  const rpcUrl = process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  // Create provider
  const wallet = {
    publicKey: walletKeypair.publicKey,
    signTransaction: async (tx) => {
      tx.sign(walletKeypair);
      return tx;
    },
    signAllTransactions: async (txs) => {
      return txs.map((tx) => {
        tx.sign(walletKeypair);
        return tx;
      });
    },
  };

  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });

  // Load IDL
  const idlPath = path.join(__dirname, "../sol-signal/target/idl/sol_signal.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new anchor.Program(idl, provider);

  // Derive PDAs
  const [registryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    PROGRAM_ID
  );

  const [agentProfilePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), walletKeypair.publicKey.toBuffer()],
    PROGRAM_ID
  );

  // Get next signal index
  const registry = await program.account.registry.fetch(registryPDA);
  const nextIndex = registry.totalSignals.toNumber() + 1;

  const indexBuf = Buffer.alloc(8);
  indexBuf.writeBigUInt64LE(BigInt(nextIndex));

  const [signalPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("signal"), walletKeypair.publicKey.toBuffer(), indexBuf],
    PROGRAM_ID
  );

  // Calculate time horizon
  const timeHorizon = Math.floor(Date.now() / 1000) + hours * 3600;

  // Publish signal
  const tx = await program.methods
    .publishSignal(
      asset,
      direction,
      confidence,
      new anchor.BN(Math.round(entryPrice * 1e6)),
      new anchor.BN(Math.round(targetPrice * 1e6)),
      new anchor.BN(Math.round(stopLoss * 1e6)),
      new anchor.BN(timeHorizon),
      reasoning.slice(0, 512)
    )
    .accounts({
      signal: signalPDA,
      agentProfile: agentProfilePDA,
      registry: registryPDA,
      agent: walletKeypair.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("\n✅ Signal published!");
  console.log(`  Tx: ${tx}`);
  console.log(`  Signal PDA: ${signalPDA.toBase58()}`);
  console.log(`  Expires: ${new Date(timeHorizon * 1000).toISOString()}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
