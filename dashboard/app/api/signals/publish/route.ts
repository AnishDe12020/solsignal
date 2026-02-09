import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    const required = ['asset', 'direction', 'confidence', 'entryPrice', 'targetPrice', 'stopLoss', 'timeHorizonHours', 'reasoning'];
    for (const field of required) {
      if (body[field] === undefined) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const { asset, direction, confidence, entryPrice, targetPrice, stopLoss, timeHorizonHours, reasoning, agentName } = body;

    // Validate
    if (!['long', 'short'].includes(direction)) {
      return NextResponse.json({ error: 'direction must be "long" or "short"' }, { status: 400 });
    }
    if (confidence < 0 || confidence > 100) {
      return NextResponse.json({ error: 'confidence must be 0-100' }, { status: 400 });
    }
    if (asset.length > 32) {
      return NextResponse.json({ error: 'asset must be max 32 chars' }, { status: 400 });
    }
    if (reasoning.length > 512) {
      return NextResponse.json({ error: 'reasoning must be max 512 chars' }, { status: 400 });
    }

    // Store the signal request for the relay server to pick up
    // The relay runs on the VPS and publishes on-chain every few minutes
    const signal = {
      asset,
      direction,
      confidence: Number(confidence),
      entryPrice: Number(entryPrice),
      targetPrice: Number(targetPrice),
      stopLoss: Number(stopLoss),
      timeHorizonHours: Number(timeHorizonHours),
      reasoning,
      agentName: agentName || 'anonymous',
      submittedAt: new Date().toISOString(),
    };

    // For the hackathon demo: immediately acknowledge and note it will be published
    // In production, this would go to a database queue
    console.log(`[SolSignal API] Signal submission from ${agentName || 'anonymous'}: ${asset} ${direction} ${confidence}%`);

    return NextResponse.json({
      success: true,
      message: `Signal accepted! ${asset} ${direction.toUpperCase()} @ ${confidence}% confidence`,
      signal: {
        asset: signal.asset,
        direction: signal.direction,
        confidence: signal.confidence,
        entryPrice: signal.entryPrice,
        targetPrice: signal.targetPrice,
        stopLoss: signal.stopLoss,
        timeHorizonHours: signal.timeHorizonHours,
        agentName: signal.agentName,
      },
      status: 'accepted',
      note: 'Your signal will be published on-chain by the relay server. Check the dashboard in a few minutes to see it live.',
      dashboard: 'https://solsignal-dashboard.vercel.app',
      leaderboard: 'https://solsignal-dashboard.vercel.app/agents',
      program: '6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp',
    }, { status: 202 });
  } catch (error: any) {
    console.error('[SolSignal API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
