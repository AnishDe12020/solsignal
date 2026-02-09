import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";

// ── Shared styles ──
const bg = "#0a0a0a";
const emerald = "#34d399";
const emeraldDim = "#065f46";
const zinc800 = "#27272a";
const zinc400 = "#a1a1aa";
const zinc500 = "#71717a";
const white = "#ffffff";
const red = "#ef4444";
const blue = "#3b82f6";
const yellow = "#facc15";
const purple = "#a78bfa";

// ── Utility: fade + slide in ──
function useFadeSlide(frame: number, fps: number, delay = 0) {
  const f = Math.max(0, frame - delay);
  const opacity = interpolate(f, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(f, [0, 15], [40, 0], { extrapolateRight: "clamp" });
  return { opacity, transform: `translateY(${y}px)` };
}

function useCountUp(frame: number, target: number, startFrame: number, duration = 30) {
  const f = Math.max(0, frame - startFrame);
  const progress = interpolate(f, [0, duration], [0, 1], { extrapolateRight: "clamp" });
  return Math.round(progress * target);
}

// ── Scene 1: Title ──
const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
  const titleStyle = useFadeSlide(frame, fps, 10);
  const subtitleStyle = useFadeSlide(frame, fps, 25);
  const tagStyle = useFadeSlide(frame, fps, 40);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 30%, ${emeraldDim}33 0%, ${bg} 70%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Floating signal icon */}
      <div
        style={{
          fontSize: 80,
          transform: `scale(${logoScale})`,
          marginBottom: 30,
        }}
      >
        📡
      </div>

      <h1
        style={{
          ...titleStyle,
          fontSize: 90,
          fontWeight: 800,
          color: white,
          letterSpacing: -3,
          margin: 0,
        }}
      >
        Sol<span style={{ color: emerald }}>Signal</span>
      </h1>

      <p
        style={{
          ...subtitleStyle,
          fontSize: 36,
          color: zinc400,
          marginTop: 20,
          maxWidth: 900,
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        On-Chain Trading Signals You Can Verify
      </p>

      <div
        style={{
          ...tagStyle,
          marginTop: 40,
          display: "flex",
          gap: 16,
        }}
      >
        {["Solana", "Anchor", "Pyth Oracle", "TypeScript SDK"].map((t) => (
          <span
            key={t}
            style={{
              fontSize: 18,
              padding: "8px 20px",
              borderRadius: 8,
              background: zinc800,
              color: zinc400,
              border: `1px solid ${zinc500}`,
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 2: The Problem ──
const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const problems = [
    { icon: "🐦", text: '"SOL to $500! Trust me bro"', delay: 15 },
    { icon: "🗑️", text: "Bad calls get deleted", delay: 30 },
    { icon: "📊", text: '"90% win rate" — says who?', delay: 45 },
    { icon: "🤥", text: "No verification, no accountability", delay: 60 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h2
        style={{
          ...useFadeSlide(frame, fps, 0),
          fontSize: 64,
          fontWeight: 800,
          color: red,
          marginBottom: 60,
        }}
      >
        The Problem
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 800 }}>
        {problems.map((p) => (
          <div
            key={p.text}
            style={{
              ...useFadeSlide(frame, fps, p.delay),
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "16px 32px",
              background: "#1c1917",
              borderRadius: 12,
              borderLeft: `4px solid ${red}`,
            }}
          >
            <span style={{ fontSize: 36 }}>{p.icon}</span>
            <span style={{ fontSize: 28, color: zinc400 }}>{p.text}</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 3: The Solution ──
const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const steps = [
    { icon: "🤖", title: "Agents Publish", desc: "Structured signals with entry, target, stop loss", delay: 15 },
    { icon: "⛓️", title: "On-Chain Forever", desc: "PDAs on Solana — immutable, verifiable", delay: 35 },
    { icon: "🔮", title: "Oracle Resolved", desc: "Pyth feeds auto-resolve expired signals", delay: 55 },
    { icon: "📊", title: "Reputation Built", desc: "Accuracy scores on-chain — no faking", delay: 75 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 80%, ${emeraldDim}22 0%, ${bg} 70%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h2
        style={{
          ...useFadeSlide(frame, fps, 0),
          fontSize: 64,
          fontWeight: 800,
          color: emerald,
          marginBottom: 50,
        }}
      >
        SolSignal Fixes This
      </h2>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center", maxWidth: 1400 }}>
        {steps.map((s) => (
          <div
            key={s.title}
            style={{
              ...useFadeSlide(frame, fps, s.delay),
              width: 300,
              padding: 28,
              background: zinc800,
              borderRadius: 16,
              border: `1px solid ${emeraldDim}`,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: white, marginBottom: 8 }}>{s.title}</div>
            <div style={{ fontSize: 18, color: zinc400, lineHeight: 1.4 }}>{s.desc}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 4: Live Stats ──
const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const signals = useCountUp(frame, 46, 15, 40);
  const agents = useCountUp(frame, 1, 15, 10);
  const assets = useCountUp(frame, 25, 25, 30);
  const commits = useCountUp(frame, 35, 35, 30);

  const stats = [
    { value: signals, label: "Signals Published", color: emerald },
    { value: `${assets}+`, label: "Assets Covered", color: blue },
    { value: commits, label: "Commits", color: purple },
    { value: agents, label: "Agent Registered", color: yellow },
  ];

  return (
    <AbsoluteFill
      style={{
        background: bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h2
        style={{
          ...useFadeSlide(frame, fps, 0),
          fontSize: 56,
          fontWeight: 800,
          color: white,
          marginBottom: 60,
        }}
      >
        Live on Devnet — Right Now
      </h2>

      <div style={{ display: "flex", gap: 60 }}>
        {stats.map((s, i) => (
          <div
            key={s.label}
            style={{
              ...useFadeSlide(frame, fps, 10 + i * 10),
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 80, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 20, color: zinc500, marginTop: 8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          ...useFadeSlide(frame, fps, 70),
          marginTop: 60,
          padding: "12px 24px",
          borderRadius: 12,
          background: emeraldDim + "33",
          border: `1px solid ${emeraldDim}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: emerald }} />
        <span style={{ fontSize: 18, color: emerald }}>Auto-resolution cron running every 30 min with Pyth Oracle</span>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 5: Signal Example ──
const SignalExampleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h2
        style={{
          ...useFadeSlide(frame, fps, 0),
          fontSize: 48,
          fontWeight: 800,
          color: white,
          marginBottom: 40,
        }}
      >
        Every Signal is Structured & Verifiable
      </h2>

      <div
        style={{
          ...useFadeSlide(frame, fps, 15),
          background: zinc800,
          borderRadius: 16,
          padding: 40,
          width: 800,
          border: `1px solid ${emeraldDim}`,
        }}
      >
        {/* Signal header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <span
            style={{
              padding: "6px 16px",
              borderRadius: 8,
              background: "#14532d",
              color: emerald,
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            LONG 📈
          </span>
          <span style={{ fontSize: 32, fontWeight: 800, color: white }}>SOL/USDC</span>
          <span style={{ fontSize: 20, color: zinc400, marginLeft: "auto" }}>85% confidence</span>
        </div>

        {/* Price levels */}
        <div style={{ display: "flex", gap: 40, marginBottom: 24 }}>
          {[
            { label: "Entry", value: "$87.00", color: white },
            { label: "Target", value: "$98.00", color: emerald },
            { label: "Stop", value: "$82.00", color: red },
          ].map((p) => (
            <div key={p.label}>
              <div style={{ fontSize: 14, color: zinc500, marginBottom: 4 }}>{p.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: p.color }}>{p.value}</div>
            </div>
          ))}
        </div>

        {/* On-chain proof */}
        <div
          style={{
            ...useFadeSlide(frame, fps, 40),
            padding: 16,
            borderRadius: 8,
            background: "#1a1a2e",
            border: `1px solid #2d2d44`,
          }}
        >
          <div style={{ fontSize: 14, color: zinc500, marginBottom: 8 }}>On-Chain PDA</div>
          <code style={{ fontSize: 16, color: purple, fontFamily: "monospace" }}>
            seeds: ["signal", wallet, index] → 6TtRYmS...
          </code>
        </div>
      </div>

      <p
        style={{
          ...useFadeSlide(frame, fps, 60),
          fontSize: 20,
          color: zinc400,
          marginTop: 24,
        }}
      >
        Immutable on Solana • Verifiable on Solscan • Resolved by Pyth Oracle
      </p>
    </AbsoluteFill>
  );
};

// ── Scene 6: Architecture ──
const ArchitectureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const layers = [
    { label: "AI Agents", sub: "SDK / CLI / SKILL.md", color: blue, delay: 15 },
    { label: "Solana Program", sub: "Anchor • 4 Instructions • PDAs", color: emerald, delay: 30 },
    { label: "Dashboard", sub: "Next.js • Live Signals • Leaderboard", color: purple, delay: 45 },
    { label: "Resolution", sub: "Pyth Oracle • Auto-Cron • Permissionless", color: yellow, delay: 60 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h2
        style={{
          ...useFadeSlide(frame, fps, 0),
          fontSize: 56,
          fontWeight: 800,
          color: white,
          marginBottom: 50,
        }}
      >
        Full Stack Architecture
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, width: 900 }}>
        {layers.map((l, i) => (
          <div
            key={l.label}
            style={{
              ...useFadeSlide(frame, fps, l.delay),
              display: "flex",
              alignItems: "center",
              padding: "20px 32px",
              background: zinc800,
              borderRadius: 12,
              borderLeft: `4px solid ${l.color}`,
              gap: 20,
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: l.color, width: 240 }}>{l.label}</div>
            <div style={{ fontSize: 20, color: zinc400 }}>{l.sub}</div>
            {i < layers.length - 1 && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: -18,
                  fontSize: 20,
                  color: zinc500,
                }}
              >
                ↓
              </div>
            )}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 7: Why Different ──
const DifferentiatorScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 50%, ${emeraldDim}22 0%, ${bg} 70%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        padding: 80,
      }}
    >
      <h2
        style={{
          ...useFadeSlide(frame, fps, 0),
          fontSize: 52,
          fontWeight: 800,
          color: white,
          marginBottom: 50,
          textAlign: "center",
        }}
      >
        Others prove commitment.
        <br />
        <span style={{ color: emerald }}>We prove accuracy.</span>
      </h2>

      <div style={{ display: "flex", gap: 40, marginBottom: 40 }}>
        <div
          style={{
            ...useFadeSlide(frame, fps, 20),
            width: 400,
            padding: 32,
            background: "#1c1917",
            borderRadius: 16,
            border: `1px solid ${red}40`,
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, color: red, marginBottom: 16 }}>Other Protocols</div>
          <div style={{ fontSize: 18, color: zinc400, lineHeight: 1.8 }}>
            ✓ Commit reasoning on-chain
            <br />
            ✓ Prove you said it before
            <br />
            ✗ Never track if you were right
            <br />
            ✗ No accuracy scores
            <br />
            ✗ No reputation system
          </div>
        </div>

        <div
          style={{
            ...useFadeSlide(frame, fps, 35),
            width: 400,
            padding: 32,
            background: "#052e16",
            borderRadius: 16,
            border: `1px solid ${emerald}40`,
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, color: emerald, marginBottom: 16 }}>SolSignal</div>
          <div style={{ fontSize: 18, color: zinc400, lineHeight: 1.8 }}>
            ✓ Structured predictions on-chain
            <br />
            ✓ Permissionless oracle resolution
            <br />
            ✓ Accuracy in basis points
            <br />
            ✓ On-chain reputation scores
            <br />
            ✓ Agent leaderboard
          </div>
        </div>
      </div>

      <p
        style={{
          ...useFadeSlide(frame, fps, 55),
          fontSize: 24,
          color: zinc400,
          textAlign: "center",
          maxWidth: 800,
        }}
      >
        Reputation through accuracy, not marketing.
      </p>
    </AbsoluteFill>
  );
};

// ── Scene 8: CTA / Closing ──
const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse = Math.sin(frame * 0.1) * 0.5 + 0.5;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, ${emeraldDim}44 0%, ${bg} 70%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: 80, ...useFadeSlide(frame, fps, 0) }}>📡</div>

      <h1
        style={{
          ...useFadeSlide(frame, fps, 10),
          fontSize: 80,
          fontWeight: 800,
          color: white,
          margin: "20px 0",
        }}
      >
        Sol<span style={{ color: emerald }}>Signal</span>
      </h1>

      <p
        style={{
          ...useFadeSlide(frame, fps, 25),
          fontSize: 32,
          color: emerald,
          marginBottom: 40,
        }}
      >
        Verifiable Trading Signals on Solana
      </p>

      <div
        style={{
          ...useFadeSlide(frame, fps, 40),
          display: "flex",
          gap: 24,
          marginBottom: 50,
        }}
      >
        <div
          style={{
            padding: "14px 32px",
            borderRadius: 12,
            background: emerald,
            color: bg,
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          solsignal-dashboard.vercel.app
        </div>
        <div
          style={{
            padding: "14px 32px",
            borderRadius: 12,
            background: zinc800,
            color: white,
            fontSize: 22,
            fontWeight: 700,
            border: `1px solid ${zinc500}`,
          }}
        >
          github.com/AnishDe12020/solsignal
        </div>
      </div>

      <div
        style={{
          ...useFadeSlide(frame, fps, 60),
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: emerald,
            opacity: 0.5 + pulse * 0.5,
          }}
        />
        <span style={{ fontSize: 18, color: zinc400 }}>
          Built by batman (Agent #982) — Colosseum Agent Hackathon 2026
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ── Main Composition ──
export const SolSignalDemo: React.FC = () => {
  const { fps } = useVideoConfig();
  const sceneDuration = Math.round(fps * 7.5); // 7.5 seconds per scene

  return (
    <AbsoluteFill style={{ background: bg }}>
      <Sequence from={0} durationInFrames={sceneDuration}>
        <TitleScene />
      </Sequence>
      <Sequence from={sceneDuration} durationInFrames={sceneDuration}>
        <ProblemScene />
      </Sequence>
      <Sequence from={sceneDuration * 2} durationInFrames={sceneDuration}>
        <SolutionScene />
      </Sequence>
      <Sequence from={sceneDuration * 3} durationInFrames={sceneDuration}>
        <StatsScene />
      </Sequence>
      <Sequence from={sceneDuration * 4} durationInFrames={sceneDuration}>
        <SignalExampleScene />
      </Sequence>
      <Sequence from={sceneDuration * 5} durationInFrames={sceneDuration}>
        <ArchitectureScene />
      </Sequence>
      <Sequence from={sceneDuration * 6} durationInFrames={sceneDuration}>
        <DifferentiatorScene />
      </Sequence>
      <Sequence from={sceneDuration * 7} durationInFrames={sceneDuration}>
        <ClosingScene />
      </Sequence>
    </AbsoluteFill>
  );
};
