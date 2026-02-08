'use client';

import { useState, useCallback, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  PublicKey,
  SystemProgram,
  TransactionMessage,
  TransactionInstruction,
  VersionedTransaction,
} from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp');

// Instruction discriminators from the IDL
const PUBLISH_SIGNAL_DISC = Buffer.from([169, 80, 49, 93, 169, 216, 95, 190]);
const REGISTER_AGENT_DISC = Buffer.from([135, 157, 66, 195, 2, 113, 175, 30]);

function getRegistryPDA(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('registry')],
    PROGRAM_ID
  )[0];
}

function getAgentProfilePDA(agent: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), agent.toBuffer()],
    PROGRAM_ID
  )[0];
}

function getSignalPDA(agent: PublicKey, index: number): PublicKey {
  const indexBuf = Buffer.alloc(8);
  indexBuf.writeBigUInt64LE(BigInt(index));
  return PublicKey.findProgramAddressSync(
    [Buffer.from('signal'), agent.toBuffer(), indexBuf],
    PROGRAM_ID
  )[0];
}

function encodeBorshString(s: string): Buffer {
  const strBytes = Buffer.from(s, 'utf8');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(strBytes.length);
  return Buffer.concat([lenBuf, strBytes]);
}

function encodeU64(val: number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(Math.round(val)));
  return buf;
}

function encodeI64(val: number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(Math.round(val)));
  return buf;
}

function buildPublishSignalData(params: {
  asset: string;
  direction: 'long' | 'short';
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  timeHorizon: number;
  reasoning: string;
}): Buffer {
  return Buffer.concat([
    PUBLISH_SIGNAL_DISC,
    encodeBorshString(params.asset),
    Buffer.from([params.direction === 'long' ? 0 : 1]), // Direction enum
    Buffer.from([params.confidence]),                     // u8
    encodeU64(params.entryPrice * 1e6),                   // u64 micro-units
    encodeU64(params.targetPrice * 1e6),                  // u64
    encodeU64(params.stopLoss * 1e6),                     // u64
    encodeI64(params.timeHorizon),                        // i64 unix timestamp
    encodeBorshString(params.reasoning),
  ]);
}

function buildRegisterAgentData(name: string): Buffer {
  return Buffer.concat([
    REGISTER_AGENT_DISC,
    encodeBorshString(name),
  ]);
}

interface FieldErrors {
  entryPrice?: string;
  targetPrice?: string;
  stopLoss?: string;
  reasoning?: string;
}

function InlineError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-red-400 text-xs mt-1">{message}</p>;
}

export default function PublishPage() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const [formData, setFormData] = useState({
    asset: 'SOL/USDC',
    direction: 'long' as 'long' | 'short',
    confidence: 75,
    entryPrice: '',
    targetPrice: '',
    stopLoss: '',
    timeHorizon: '24',
    reasoning: '',
  });

  const [publishing, setPublishing] = useState(false);
  const [txResult, setTxResult] = useState<{ sig: string; signalPDA: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [needsRegistration, setNeedsRegistration] = useState<boolean | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Validate a single field
  const validateField = useCallback((name: string, value: string, allData: typeof formData): string | undefined => {
    const entry = parseFloat(allData.entryPrice);
    const target = parseFloat(allData.targetPrice);
    const stop = parseFloat(allData.stopLoss);

    switch (name) {
      case 'entryPrice': {
        if (!value.trim()) return 'Entry price is required';
        const v = parseFloat(value);
        if (isNaN(v) || v <= 0) return 'Must be a positive number';
        return undefined;
      }
      case 'targetPrice': {
        if (!value.trim()) return 'Target price is required';
        const v = parseFloat(value);
        if (isNaN(v) || v <= 0) return 'Must be a positive number';
        if (!isNaN(entry) && entry > 0) {
          if (allData.direction === 'long' && v <= entry) return 'Target must be above entry for longs';
          if (allData.direction === 'short' && v >= entry) return 'Target must be below entry for shorts';
        }
        return undefined;
      }
      case 'stopLoss': {
        if (!value.trim()) return 'Stop loss is required';
        const v = parseFloat(value);
        if (isNaN(v) || v <= 0) return 'Must be a positive number';
        if (!isNaN(entry) && entry > 0) {
          if (allData.direction === 'long' && v >= entry) return 'Stop loss must be below entry for longs';
          if (allData.direction === 'short' && v <= entry) return 'Stop loss must be above entry for shorts';
        }
        return undefined;
      }
      case 'reasoning': {
        if (value.length > 512) return 'Maximum 512 characters';
        return undefined;
      }
      default:
        return undefined;
    }
  }, []);

  // Re-validate dependent fields when direction changes
  useEffect(() => {
    const newErrors: FieldErrors = {};
    if (touched.targetPrice) {
      newErrors.targetPrice = validateField('targetPrice', formData.targetPrice, formData);
    }
    if (touched.stopLoss) {
      newErrors.stopLoss = validateField('stopLoss', formData.stopLoss, formData);
    }
    setFieldErrors(prev => ({ ...prev, ...newErrors }));
  }, [formData.direction, formData.entryPrice, formData.targetPrice, formData.stopLoss, touched, validateField]);

  const handleFieldChange = (name: string, value: string) => {
    const newData = { ...formData, [name]: value };
    setFormData(newData);
    // Validate on change if field was already touched
    if (touched[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: validateField(name, value, newData) }));
    }
  };

  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    setFieldErrors(prev => ({
      ...prev,
      [name]: validateField(name, (formData as any)[name], formData),
    }));
  };

  const validateAll = (): boolean => {
    const errors: FieldErrors = {
      entryPrice: validateField('entryPrice', formData.entryPrice, formData),
      targetPrice: validateField('targetPrice', formData.targetPrice, formData),
      stopLoss: validateField('stopLoss', formData.stopLoss, formData),
      reasoning: validateField('reasoning', formData.reasoning, formData),
    };
    setFieldErrors(errors);
    setTouched({ entryPrice: true, targetPrice: true, stopLoss: true, reasoning: true });
    return !errors.entryPrice && !errors.targetPrice && !errors.stopLoss && !errors.reasoning;
  };

  // Check if agent is registered
  const checkRegistration = useCallback(async () => {
    if (!publicKey) return;
    try {
      const agentProfilePDA = getAgentProfilePDA(publicKey);
      const account = await connection.getAccountInfo(agentProfilePDA);
      setNeedsRegistration(!account);
    } catch {
      setNeedsRegistration(true);
    }
  }, [publicKey, connection]);

  // Check on connect
  useEffect(() => {
    if (connected && publicKey) {
      checkRegistration();
    }
  }, [connected, publicKey, checkRegistration]);

  const handleRegister = async () => {
    if (!publicKey || !sendTransaction) return;
    setRegistering(true);
    setError(null);

    try {
      const agentProfilePDA = getAgentProfilePDA(publicKey);
      const registryPDA = getRegistryPDA();

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: agentProfilePDA, isSigner: false, isWritable: true },
          { pubkey: registryPDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildRegisterAgentData('agent'),
      });

      const { blockhash } = await connection.getLatestBlockhash();
      const message = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [ix],
      }).compileToV0Message();

      const tx = new VersionedTransaction(message);
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, 'confirmed');

      setNeedsRegistration(false);
    } catch (e: any) {
      setError(`Registration failed: ${e.message}`);
    } finally {
      setRegistering(false);
    }
  };

  const handlePublish = async () => {
    if (!publicKey || !sendTransaction) return;

    if (!validateAll()) return;

    const entry = parseFloat(formData.entryPrice);
    const target = parseFloat(formData.targetPrice);
    const stop = parseFloat(formData.stopLoss);

    setPublishing(true);
    setError(null);
    setTxResult(null);

    try {
      // Fetch registry to get next signal index
      const registryRes = await fetch('/api/registry');
      const registryData = await registryRes.json();
      const nextIndex = registryData.totalSignals + 1;

      const agentProfilePDA = getAgentProfilePDA(publicKey);
      const registryPDA = getRegistryPDA();
      const signalPDA = getSignalPDA(publicKey, nextIndex);

      const timeHorizonUnix = Math.floor(Date.now() / 1000) + parseInt(formData.timeHorizon) * 3600;

      const data = buildPublishSignalData({
        asset: formData.asset,
        direction: formData.direction,
        confidence: formData.confidence,
        entryPrice: entry,
        targetPrice: target,
        stopLoss: stop,
        timeHorizon: timeHorizonUnix,
        reasoning: formData.reasoning || 'No reasoning provided',
      });

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: signalPDA, isSigner: false, isWritable: true },
          { pubkey: agentProfilePDA, isSigner: false, isWritable: true },
          { pubkey: registryPDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
      });

      const { blockhash } = await connection.getLatestBlockhash();
      const message = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [ix],
      }).compileToV0Message();

      const tx = new VersionedTransaction(message);
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, 'confirmed');

      setTxResult({ sig, signalPDA: signalPDA.toBase58() });
    } catch (e: any) {
      setError(`Publish failed: ${e.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const hasErrors = !!(fieldErrors.entryPrice || fieldErrors.targetPrice || fieldErrors.stopLoss || fieldErrors.reasoning);

  const canPublish = connected &&
    formData.entryPrice &&
    formData.targetPrice &&
    formData.stopLoss &&
    !publishing &&
    !needsRegistration &&
    !hasErrors;

  const inputClass = (field: keyof FieldErrors) =>
    `w-full bg-zinc-900 border rounded-lg px-4 py-3 text-white focus:ring-1 outline-none transition-colors ${
      fieldErrors[field] && touched[field as string]
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
        : 'border-zinc-700 focus:border-emerald-500 focus:ring-emerald-500'
    }`;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Publish Signal</h1>
        <p className="text-zinc-400">
          Submit a trading signal to the blockchain. Once published, it cannot be deleted.
        </p>
      </div>

      <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 text-amber-200 text-sm">
        Signals are permanent. They affect your on-chain reputation. Think before you publish.
      </div>

      {/* Wallet Connection */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-zinc-400">
            {connected ? 'Wallet Connected' : 'Connect your wallet to publish signals'}
          </div>
          {publicKey && (
            <div className="font-mono text-xs text-zinc-500 mt-1">
              {publicKey.toBase58().slice(0, 12)}...{publicKey.toBase58().slice(-8)}
            </div>
          )}
        </div>
        <WalletMultiButton />
      </div>

      {/* Agent Registration */}
      {connected && needsRegistration && (
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
          <p className="text-blue-200 text-sm mb-3">
            You need to register as an agent before publishing signals.
          </p>
          <button
            onClick={handleRegister}
            disabled={registering}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {registering ? 'Registering...' : 'Register Agent'}
          </button>
        </div>
      )}

      {/* Success message */}
      {txResult && (
        <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-4">
          <p className="text-emerald-200 font-medium mb-2">Signal published successfully!</p>
          <div className="text-sm space-y-1">
            <div>
              <span className="text-zinc-400">Transaction: </span>
              <a
                href={`https://solscan.io/tx/${txResult.sig}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 font-mono"
              >
                {txResult.sig.slice(0, 16)}... &rarr;
              </a>
            </div>
            <div>
              <span className="text-zinc-400">Signal: </span>
              <a
                href={`/signal/${txResult.signalPDA}`}
                className="text-emerald-400 hover:text-emerald-300 font-mono"
              >
                View signal &rarr;
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 text-red-200 text-sm">
          {error}
        </div>
      )}

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Asset Pair</label>
            <select
              value={formData.asset}
              onChange={(e) => setFormData({ ...formData, asset: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="SOL/USDC">SOL/USDC</option>
              <option value="BTC/USDC">BTC/USDC</option>
              <option value="ETH/USDC">ETH/USDC</option>
              <option value="BONK/USDC">BONK/USDC</option>
              <option value="JUP/USDC">JUP/USDC</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Direction</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, direction: 'long' })}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  formData.direction === 'long'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                LONG
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, direction: 'short' })}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  formData.direction === 'short'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                SHORT
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">
            Confidence: {formData.confidence}%
          </label>
          <input
            type="range"
            min="10"
            max="100"
            value={formData.confidence}
            onChange={(e) =>
              setFormData({ ...formData, confidence: parseInt(e.target.value) })
            }
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>Low (10%)</span>
            <span>High (100%)</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Entry Price ($)</label>
            <input
              type="number"
              step="any"
              placeholder="125.00"
              value={formData.entryPrice}
              onChange={(e) => handleFieldChange('entryPrice', e.target.value)}
              onBlur={() => handleBlur('entryPrice')}
              className={inputClass('entryPrice')}
            />
            <InlineError message={touched.entryPrice ? fieldErrors.entryPrice : undefined} />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Target Price ($)</label>
            <input
              type="number"
              step="any"
              placeholder="145.00"
              value={formData.targetPrice}
              onChange={(e) => handleFieldChange('targetPrice', e.target.value)}
              onBlur={() => handleBlur('targetPrice')}
              className={inputClass('targetPrice')}
            />
            <InlineError message={touched.targetPrice ? fieldErrors.targetPrice : undefined} />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Stop Loss ($)</label>
            <input
              type="number"
              step="any"
              placeholder="118.00"
              value={formData.stopLoss}
              onChange={(e) => handleFieldChange('stopLoss', e.target.value)}
              onBlur={() => handleBlur('stopLoss')}
              className={inputClass('stopLoss')}
            />
            <InlineError message={touched.stopLoss ? fieldErrors.stopLoss : undefined} />
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">Time Horizon</label>
          <select
            value={formData.timeHorizon}
            onChange={(e) => setFormData({ ...formData, timeHorizon: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            <option value="6">6 hours</option>
            <option value="12">12 hours</option>
            <option value="24">24 hours</option>
            <option value="48">48 hours</option>
            <option value="72">72 hours</option>
            <option value="168">1 week</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">Reasoning (optional)</label>
          <textarea
            placeholder="Technical analysis, market thesis, catalysts..."
            value={formData.reasoning}
            onChange={(e) => handleFieldChange('reasoning', e.target.value)}
            onBlur={() => handleBlur('reasoning')}
            rows={4}
            maxLength={512}
            className={`resize-none ${inputClass('reasoning')}`}
          />
          <div className="flex justify-between mt-1">
            <InlineError message={touched.reasoning ? fieldErrors.reasoning : undefined} />
            <span className={`text-xs ${formData.reasoning.length > 480 ? 'text-amber-400' : 'text-zinc-500'}`}>
              {formData.reasoning.length}/512 characters
            </span>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <h3 className="font-semibold mb-3">Signal Preview</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-500">Asset:</span>{' '}
              <span className="font-medium">{formData.asset}</span>
            </div>
            <div>
              <span className="text-zinc-500">Direction:</span>{' '}
              <span
                className={`font-medium ${
                  formData.direction === 'long' ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {formData.direction.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Confidence:</span>{' '}
              <span className="font-medium">{formData.confidence}%</span>
            </div>
            <div>
              <span className="text-zinc-500">Horizon:</span>{' '}
              <span className="font-medium">{formData.timeHorizon}h</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePublish}
          disabled={!canPublish}
          className={`w-full py-4 rounded-lg font-semibold transition-colors ${
            canPublish
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
          }`}
        >
          {publishing
            ? 'Publishing...'
            : !connected
            ? 'Connect Wallet to Publish'
            : needsRegistration
            ? 'Register Agent First'
            : hasErrors
            ? 'Fix Errors to Publish'
            : 'Publish Signal On-Chain'}
        </button>

        <p className="text-xs text-zinc-500 text-center">
          Publishing requires a Solana wallet with devnet SOL.{' '}
          <a
            href="https://faucet.solana.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 underline"
          >
            Get devnet SOL
          </a>
        </p>
      </form>
    </div>
  );
}
