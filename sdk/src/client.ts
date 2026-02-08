import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  TransactionSignature,
} from '@solana/web3.js';
import { PROGRAM_ID, REGISTRY_SEED, AGENT_SEED, SIGNAL_SEED } from './constants';
import type {
  PublishSignalParams,
  SignalData,
  AgentProfileData,
  RegistryData,
  Direction,
  Outcome,
} from './types';

// Import IDL at runtime
import idl from '../../sol-signal/target/idl/sol_signal.json';

export class SolSignalClient {
  private program: Program;
  private provider: AnchorProvider;

  constructor(connection: Connection, wallet: any) {
    this.provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
    this.program = new Program(idl as Idl, this.provider);
  }

  // === PDA Derivations ===

  getRegistryPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync([REGISTRY_SEED], PROGRAM_ID);
  }

  getAgentProfilePDA(agent: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [AGENT_SEED, agent.toBuffer()],
      PROGRAM_ID
    );
  }

  getSignalPDA(agent: PublicKey, index: number | bigint): [PublicKey, number] {
    const indexBuf = Buffer.alloc(8);
    indexBuf.writeBigUInt64LE(BigInt(index));
    return PublicKey.findProgramAddressSync(
      [SIGNAL_SEED, agent.toBuffer(), indexBuf],
      PROGRAM_ID
    );
  }

  // === Instructions ===

  async initialize(): Promise<TransactionSignature> {
    const [registryPDA] = this.getRegistryPDA();
    return this.program.methods
      .initialize()
      .accounts({
        registry: registryPDA,
        authority: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async registerAgent(name: string): Promise<TransactionSignature> {
    const agent = this.provider.wallet.publicKey;
    const [agentProfilePDA] = this.getAgentProfilePDA(agent);
    const [registryPDA] = this.getRegistryPDA();

    return this.program.methods
      .registerAgent(name)
      .accounts({
        agentProfile: agentProfilePDA,
        registry: registryPDA,
        agent,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async publishSignal(
    params: PublishSignalParams
  ): Promise<TransactionSignature> {
    const agent = this.provider.wallet.publicKey;
    const [registryPDA] = this.getRegistryPDA();
    const [agentProfilePDA] = this.getAgentProfilePDA(agent);

    // Fetch registry to get next signal index
    const registry = await this.fetchRegistry();
    const nextIndex = Number(registry.totalSignals) + 1;
    const [signalPDA] = this.getSignalPDA(agent, nextIndex);

    const direction =
      params.direction === 'long' ? { long: {} } : { short: {} };

    return this.program.methods
      .publishSignal(
        params.asset,
        direction,
        params.confidence,
        new BN(Math.round(params.entryPrice * 1e6)), // Price in micro-units
        new BN(Math.round(params.targetPrice * 1e6)),
        new BN(Math.round(params.stopLoss * 1e6)),
        new BN(params.timeHorizon),
        params.reasoning
      )
      .accounts({
        signal: signalPDA,
        agentProfile: agentProfilePDA,
        registry: registryPDA,
        agent,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async resolveSignal(
    signalAddress: PublicKey,
    resolutionPrice: number
  ): Promise<TransactionSignature> {
    const signal = await this.fetchSignal(signalAddress);
    const [agentProfilePDA] = this.getAgentProfilePDA(signal.agent);

    return this.program.methods
      .resolveSignal(new BN(Math.round(resolutionPrice * 1e6)))
      .accounts({
        signal: signalAddress,
        agentProfile: agentProfilePDA,
        resolver: this.provider.wallet.publicKey,
      })
      .rpc();
  }

  // === Fetch Accounts ===

  async fetchRegistry(): Promise<RegistryData> {
    const [registryPDA] = this.getRegistryPDA();
    const data = await this.program.account.registry.fetch(registryPDA);
    return data as unknown as RegistryData;
  }

  async fetchAgentProfile(agent: PublicKey): Promise<AgentProfileData> {
    const [agentProfilePDA] = this.getAgentProfilePDA(agent);
    const data = await this.program.account.agentProfile.fetch(agentProfilePDA);
    return data as unknown as AgentProfileData;
  }

  async fetchSignal(address: PublicKey): Promise<SignalData> {
    const data = await this.program.account.signal.fetch(address);
    return data as unknown as SignalData;
  }

  async fetchAllSignals(): Promise<{ publicKey: PublicKey; account: SignalData }[]> {
    const signals = await this.program.account.signal.all();
    return signals.map((s) => ({
      publicKey: s.publicKey,
      account: s.account as unknown as SignalData,
    }));
  }

  async fetchAllAgents(): Promise<
    { publicKey: PublicKey; account: AgentProfileData }[]
  > {
    const agents = await this.program.account.agentProfile.all();
    return agents.map((a) => ({
      publicKey: a.publicKey,
      account: a.account as unknown as AgentProfileData,
    }));
  }

  async fetchSignalsByAgent(
    agent: PublicKey
  ): Promise<{ publicKey: PublicKey; account: SignalData }[]> {
    const signals = await this.program.account.signal.all([
      {
        memcmp: {
          offset: 8, // After discriminator
          bytes: agent.toBase58(),
        },
      },
    ]);
    return signals.map((s) => ({
      publicKey: s.publicKey,
      account: s.account as unknown as SignalData,
    }));
  }

  // === Utility ===

  static priceFromMicro(micro: bigint | BN): number {
    const val = typeof micro === 'bigint' ? micro : BigInt(micro.toString());
    return Number(val) / 1e6;
  }

  static directionToString(d: any): Direction {
    if ('long' in d) return 'long';
    return 'short';
  }

  static outcomeToString(o: any): Outcome {
    if ('pending' in o) return 'pending';
    if ('correct' in o) return 'correct';
    if ('incorrect' in o) return 'incorrect';
    return 'expired';
  }
}
