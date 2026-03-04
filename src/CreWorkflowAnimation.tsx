import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TerminalSquare,
  Check,
  Activity,
  Cpu,
  GitMerge,
  ChevronRight,
  Zap,
  Clock,
  Lock,
  ArrowDownToLine,
} from "lucide-react";

// ─── Stages ──────────────────────────────────────────────────────────────────
const STAGES = [
  {
    id: 0,
    label: "Bets Placed",
    sublabel: "Users sign & submit intents",
    color: "#0847F7",
    icon: TerminalSquare,
    detail:
      "Each user signs their prediction (UP / DOWN on BTC price) using their EVM wallet. Intents are collected off-chain — no gas cost yet.",
    badge: "OFF-CHAIN",
    badgeColor: "#0847F7",
  },
  {
    id: 1,
    label: "Price Feed",
    sublabel: "Chainlink Data Streams",
    color: "#A78BFA",
    icon: Activity,
    detail:
      "The CRE worker fetches sub-second BTC/USD price from Chainlink Data Streams. Cryptographically signed price reports are used to determine win/loss outcomes.",
    badge: "CHAINLINK",
    badgeColor: "#A78BFA",
  },
  {
    id: 2,
    label: "Off-Chain Resolution",
    sublabel: "CRE resolves all bets",
    color: "#F6AD55",
    icon: Cpu,
    detail:
      "The CRE workflow evaluates each bet against the verified price — resolves winners & losers instantly off-chain. Zero blockchain delay, zero per-tx gas.",
    badge: "CRE ENGINE",
    badgeColor: "#F6AD55",
  },
  {
    id: 3,
    label: "Batch & Merkle",
    sublabel: "Results packed into proof",
    color: "#63B3ED",
    icon: GitMerge,
    detail:
      "All settlement results are aggregated into a Merkle tree. A single Merkle root is computed that cryptographically represents every winner's claim in the batch.",
    badge: "MERKLE PROOF",
    badgeColor: "#63B3ED",
  },
  {
    id: 4,
    label: "On-Chain Commit",
    sublabel: "Root posted to Sepolia",
    color: "#2EBD85",
    icon: Lock,
    detail:
      "The CRE commits one compact transaction to the smart contract: the Merkle root + Settlement ID. This trustlessly anchors all off-chain results on-chain.",
    badge: "ON-CHAIN",
    badgeColor: "#2EBD85",
  },
  {
    id: 5,
    label: "Winners Withdraw",
    sublabel: "Claim via Merkle proof",
    color: "#34D399",
    icon: ArrowDownToLine,
    detail:
      "Eligible winners submit their Merkle proof to the contract. The contract verifies inclusion, then releases funds — no middleman, fully self-custodial.",
    badge: "SETTLED",
    badgeColor: "#34D399",
  },
];

// ─── Moving Particle ──────────────────────────────────────────────────────────
const Particle: React.FC<{ color: string; delay?: number }> = ({
  color,
  delay = 0,
}) => (
  <motion.div
    initial={{ left: "0%", opacity: 0 }}
    animate={{ left: "105%", opacity: [0, 1, 1, 0] }}
    transition={{
      duration: 1.2,
      delay,
      ease: "easeInOut",
      repeat: Infinity,
      repeatDelay: 1.2,
    }}
    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full pointer-events-none"
    style={{ background: color, boxShadow: `0 0 8px ${color}` }}
  />
);

// ─── Stage Node ───────────────────────────────────────────────────────────────
const StageNode: React.FC<{
  stage: (typeof STAGES)[0];
  isActive: boolean;
  isCurrent: boolean;
  isComplete: boolean;
}> = ({ stage, isActive, isCurrent, isComplete }) => {
  const Icon = stage.icon;
  return (
    <div className="flex flex-col items-center w-20 shrink-0 relative">
      {/* Top badge */}
      <motion.div
        animate={{ opacity: isActive ? 1 : 0.25 }}
        className="mb-2 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-widest whitespace-nowrap"
        style={{
          background: `${stage.badgeColor}18`,
          color: stage.badgeColor,
          border: `1px solid ${stage.badgeColor}30`,
        }}
      >
        {stage.badge}
      </motion.div>

      {/* Icon box */}
      <motion.div
        animate={{
          scale: isCurrent ? 1.15 : isComplete ? 1.05 : 1,
          borderColor: isActive ? `${stage.color}80` : "rgba(255,255,255,0.08)",
          boxShadow: isCurrent
            ? `0 0 20px ${stage.color}50`
            : isComplete
              ? `0 0 10px ${stage.color}30`
              : "none",
        }}
        transition={{ duration: 0.4 }}
        className="w-12 h-12 rounded-xl border flex items-center justify-center relative"
        style={{
          background: isActive ? `${stage.color}15` : "rgba(255,255,255,0.04)",
        }}
      >
        {/* Spin ring when current */}
        {isCurrent && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, ease: "linear", repeat: Infinity }}
            className="absolute inset-1 rounded-lg border border-dashed"
            style={{ borderColor: `${stage.color}60` }}
          />
        )}

        {isComplete ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
          >
            <Check size={18} style={{ color: stage.color }} />
          </motion.div>
        ) : (
          <Icon
            size={18}
            style={{ color: isActive ? stage.color : "#4a4a4a" }}
          />
        )}

        {/* Active pulse ring */}
        {isCurrent && (
          <motion.span
            animate={{ scale: [1, 2], opacity: [0.5, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="absolute inset-0 rounded-xl"
            style={{ background: `${stage.color}30` }}
          />
        )}
      </motion.div>

      {/* Label */}
      <div className="mt-2 text-center">
        <div
          className="text-[10px] font-bold leading-tight"
          style={{ color: isActive ? "#fff" : "#4a4a4a" }}
        >
          {stage.label}
        </div>
        <div
          className="text-[8px] leading-tight mt-0.5"
          style={{ color: isActive ? "#888" : "#333" }}
        >
          {stage.sublabel}
        </div>
      </div>
    </div>
  );
};

// ─── Connector ────────────────────────────────────────────────────────────────
const Connector: React.FC<{
  active: boolean;
  isCurrent: boolean;
  color: string;
  nextColor: string;
}> = ({ active, isCurrent, color, nextColor }) => (
  <div className="flex-1 relative h-0.5 self-center mt-[-28px] mx-1">
    <div className="absolute inset-0 bg-white/5 rounded-full" />
    {active && (
      <motion.div
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration: 0.6 }}
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}, ${nextColor})` }}
      />
    )}
    {isCurrent && (
      <>
        <Particle color={color} />
        <Particle color={nextColor} delay={0.6} />
      </>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const CreWorkflowAnimation: React.FC = () => {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const TOTAL = STAGES.length;

  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => setStep((p) => (p + 1) % (TOTAL + 1)), 2800);
    return () => clearInterval(t);
  }, [isPlaying, TOTAL]);

  const activeStep = step % (TOTAL + 1); // 0-6, where 6 resets
  const currentStage = activeStep < TOTAL ? STAGES[activeStep] : null;
  const progressPct = (activeStep / TOTAL) * 100;

  return (
    <div className="w-full relative rounded-2xl overflow-hidden border border-white/5 bg-[#08090D]">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b border-white/5"
        style={{ background: "rgba(8, 71, 247, 0.04)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-[11px] text-gray-400 font-mono tracking-wider">
            chainlink-cre / settlement-workflow.ts
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: isPlaying ? "#2EBD85" : "#555" }}
          />
          <span
            className="text-[10px] font-mono"
            style={{ color: isPlaying ? "#2EBD85" : "#555" }}
          >
            {isPlaying ? "LIVE" : "PAUSED"}
          </span>
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="ml-2 px-2 py-0.5 text-[10px] font-bold rounded border transition-colors"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              color: "#888",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            {isPlaying ? "PAUSE" : "PLAY"}
          </button>
        </div>
      </div>

      {/* Stage pipeline */}
      <div className="px-6 pt-10 pb-6">
        <div className="flex items-start justify-between">
          {STAGES.map((stage, idx) => {
            const isActive = activeStep > idx;
            const isCurrent = activeStep === idx;
            const isComplete = activeStep > idx;
            return (
              <React.Fragment key={stage.id}>
                <StageNode
                  stage={stage}
                  isActive={isActive || isCurrent}
                  isCurrent={isCurrent}
                  isComplete={isComplete}
                />
                {idx < STAGES.length - 1 && (
                  <Connector
                    active={activeStep > idx}
                    isCurrent={activeStep === idx + 1}
                    color={stage.color}
                    nextColor={STAGES[idx + 1].color}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      <div className="mx-6 mb-6 rounded-xl overflow-hidden border border-white/5">
        <AnimatePresence mode="wait">
          {currentStage ? (
            <motion.div
              key={currentStage.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="p-5 flex items-start gap-4"
              style={{ background: `${currentStage.color}08` }}
            >
              <div
                className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center mt-0.5"
                style={{
                  background: `${currentStage.color}20`,
                  border: `1px solid ${currentStage.color}30`,
                }}
              >
                {React.createElement(currentStage.icon, {
                  size: 18,
                  style: { color: currentStage.color },
                })}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="text-xs font-bold"
                    style={{ color: currentStage.color }}
                  >
                    {currentStage.label}
                  </span>
                  <ChevronRight
                    size={12}
                    style={{ color: currentStage.color }}
                  />
                  <span className="text-[11px] text-gray-400">
                    {currentStage.sublabel}
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed text-gray-300">
                  {currentStage.detail}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-1 text-[10px] text-gray-500 font-mono">
                <Clock size={10} />
                {activeStep + 1}/{TOTAL}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="p-5 flex items-center gap-4"
              style={{ background: "rgba(46, 189, 133, 0.08)" }}
            >
              <div
                className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
                style={{
                  background: "rgba(46, 189, 133, 0.2)",
                  border: "1px solid rgba(46, 189, 133, 0.3)",
                }}
              >
                <Zap size={18} style={{ color: "#2EBD85" }} />
              </div>
              <div>
                <p className="text-xs font-bold text-[#2EBD85] mb-1">
                  Settlement Cycle Complete ✓
                </p>
                <p className="text-[12px] text-gray-400">
                  All bets resolved off-chain. One Merkle root committed
                  on-chain. Winners can now withdraw trustlessly. Next cycle
                  starting…
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Metrics row */}
      <div className="border-t border-white/5 grid grid-cols-3 divide-x divide-white/5">
        {[
          {
            label: "Resolution",
            value: "Off-Chain",
            sub: "< 100ms",
            color: "#F6AD55",
          },
          {
            label: "Commit Tx",
            value: "1 per batch",
            sub: "Merkle root only",
            color: "#A78BFA",
          },
          {
            label: "Withdrawal",
            value: "Self-Custodial",
            sub: "Merkle proof",
            color: "#2EBD85",
          },
        ].map((m) => (
          <div key={m.label} className="px-5 py-3 text-center">
            <div className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">
              {m.label}
            </div>
            <div className="text-sm font-bold" style={{ color: m.color }}>
              {m.value}
            </div>
            <div className="text-[9px] text-gray-500 mt-0.5">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full bg-white/5">
        <motion.div
          className="h-full"
          style={{
            background: "linear-gradient(90deg, #0847F7, #A78BFA, #2EBD85)",
          }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
};
