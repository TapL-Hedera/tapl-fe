import React from "react";
import { motion, type Variants } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Zap,
  Layers,
  Activity,
  ArrowRightLeft,
  Lock,
  Globe,
  Database,
  TerminalSquare,
  Network,
  Cpu,
  ArrowRight,
} from "lucide-react";

export const IntroView: React.FC = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const workflows = [
    {
      icon: <Activity size={24} />,
      title: "Price Integrity via Streams",
      desc: "High-frequency sub-second BTC/USD market data pulled from Chainlink Data Streams directly to the matching engine.",
      color: "#0847F7",
    },
    {
      icon: <Database size={24} />,
      title: "Batch Submissions",
      desc: "Trades, liquidity events, and oracle reports are aggregated off-chain and submitted as verifiable batches to our smart contracts.",
      color: "#A78BFA",
    },
    {
      icon: <Layers size={24} />,
      title: "Deterministic Settlement",
      desc: "Settlement payloads are built off-chain safely and cleanly. Winners withdraw without locking up large on-chain gas fees per tx.",
      color: "#34D399",
    },
    {
      icon: <ShieldCheck size={24} />,
      title: "Continuous Solvency",
      desc: "Pools are audited constantly by the Chainlink Runtime Environment (CRE). Real-time Proof of Reserve ensures full collateralization.",
      color: "#63B3ED",
    },
    {
      icon: <ArrowRightLeft size={24} />,
      title: "LP & Yield Distribution",
      desc: "Cross-chain logic via CCIP to automatically balance liquidity provider distributions globally, maintaining capital efficiency.",
      color: "#F6AD55",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto w-full relative">
      <div
        className="absolute top-1/4 left-1/3 w-[600px] h-[600px] opacity-10 pointer-events-none rounded-full blur-[120px]"
        style={{
          background: "radial-gradient(circle, #0847F7 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] opacity-10 pointer-events-none rounded-full blur-[100px]"
        style={{
          background: "radial-gradient(circle, #2EBD85 0%, transparent 70%)",
        }}
      />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-10 pb-24 lg:pb-12"
      >
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="text-center mb-16 mt-8">
          <div
            className="inline-block px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest mb-6"
            style={{
              background: "rgba(8, 71, 247, 0.15)",
              color: "#0847F7",
              border: "1px solid rgba(8, 71, 247, 0.3)",
            }}
          >
            Introducing TAPL Protocol
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-[1.15]">
            On-chain Derivatives <br className="hidden md:block" />
            <span style={{ color: "#0847F7" }}>Powered by Chainlink CRE</span>
          </h1>
          <p
            className="max-w-2xl mx-auto text-sm md:text-base leading-relaxed"
            style={{ color: "#a0a0a0" }}
          >
            TAPL brings sub-second market prediction to Web3. Trade without
            limits, provide liquidity safely, and benefit from lightning-fast
            Chainlink decentralized oracle networks executing off-chain
            computations and returning verifiable results on-chain.
          </p>
          <div className="flex justify-center mt-10">
            <Link
              to="/trade"
              className="px-8 py-3 rounded text-sm font-bold font-mono tracking-widest flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(8,71,247,0.3)] hover:shadow-[0_4px_30px_rgba(8,71,247,0.5)]"
              style={{
                background: "#0847F7",
                color: "#ffffff",
              }}
            >
              START TRADING <ArrowRight size={16} />
            </Link>
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div variants={itemVariants} className="mb-20">
          <h2 className="text-2xl font-bold mb-3 text-center">How It Works</h2>
          <p
            className="max-w-3xl mx-auto text-center text-sm md:text-base leading-relaxed mb-8"
            style={{ color: "#a0a0a0" }}
          >
            TAPL is a prediction trading app where you connect your wallet, pick
            a market direction, and let Chainlink-powered infrastructure handle
            fair pricing, execution, and settlement.
          </p>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              {
                step: "01",
                title: "Connect Wallet",
                desc: "Use any EVM-compatible wallet to access TAPL instantly with no account creation.",
                color: "#0847F7",
              },
              {
                step: "02",
                title: "Place Prediction",
                desc: "Choose market direction and submit your position with transparent on-chain intent.",
                color: "#2EBD85",
              },
              {
                step: "03",
                title: "CRE Processing",
                desc: "Chainlink CRE validates market data, computes outcomes, and prepares secure batches.",
                color: "#A78BFA",
              },
              {
                step: "04",
                title: "Settle & Withdraw",
                desc: "Final results are committed on-chain and eligible winnings can be withdrawn trustlessly.",
                color: "#F6AD55",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl p-5"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <div
                  className="inline-flex items-center justify-center rounded px-2 py-1 text-[11px] font-bold mb-3"
                  style={{
                    background: `${item.color}20`,
                    color: item.color,
                    border: `1px solid ${item.color}30`,
                  }}
                >
                  STEP {item.step}
                </div>
                <h3 className="text-sm font-semibold mb-2">{item.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#a0a0a0" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* General App Features */}
        <motion.div variants={itemVariants} className="mb-20">
          <h2 className="text-2xl font-bold mb-8 text-center">Core Pillars</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Globe size={20} />,
                title: "Permissionless Access",
                desc: "No KYC, no signups. Connect any EVM-compatible wallet to trade transparently.",
                color: "#0847F7",
              },
              {
                icon: <Zap size={20} />,
                title: "Instant Execution",
                desc: "Orders bypass slow blockchain layers thanks to off-chain sequencer networks matching trades in real-time.",
                color: "#2EBD85",
              },
              {
                icon: <Lock size={20} />,
                title: "Self-Custodial",
                desc: "You retain full control over your funds via thoroughly tested, heavily audited EVM smart contracts.",
                color: "#A78BFA",
              },
            ].map((feat, i) => (
              <div
                key={i}
                className="rounded-xl p-6"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                <div
                  className="w-10 h-10 rounded flex items-center justify-center mb-5"
                  style={{
                    background: `${feat.color}15`,
                    color: feat.color,
                    border: `1px solid ${feat.color}30`,
                  }}
                >
                  {feat.icon}
                </div>
                <h3
                  className="text-base font-semibold mb-2"
                  style={{ color: "#ffffff" }}
                >
                  {feat.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#a0a0a0" }}
                >
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Highlighted section for CRE Workflow */}
        <motion.div variants={itemVariants} className="my-16">
          <div
            className="rounded-2xl relative overflow-hidden p-8 md:p-12 border border-[#0847F7]/20"
            style={{
              background:
                "linear-gradient(135deg, rgba(8, 71, 247, 0.08) 0%, rgba(22, 20, 42, 0.8) 100%)",
            }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#0847F7]/10 blur-[80px] rounded-full" />

            <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold mb-5 flex items-center gap-3">
                  <Network className="text-[#0847F7]" />
                  How CRE Workflows Drive TAPL
                </h3>
                <p
                  className="mb-6 text-sm md:text-base leading-relaxed"
                  style={{ color: "#d0d0d0" }}
                >
                  Traditional DApps struggle with the blockchain trilemma —
                  managing latency, data cost, and security. By integrating the{" "}
                  <b>Chainlink Runtime Environment (CRE)</b>, we offload heavy
                  validation and data ingestion processes into scalable worker
                  networks.
                </p>
                <p
                  className="text-sm md:text-base leading-relaxed"
                  style={{ color: "#d0d0d0" }}
                >
                  This serverless execution layer handles price verification,
                  calculates PnL synchronously, runs pool solvency reports, and
                  compiles Merkle roots of user actions — committing them
                  trustlessly onto the Sepolia blockchain.
                </p>
              </div>

              <div className="space-y-4">
                {workflows.map((wf, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{
                      x: 5,
                      backgroundColor: "rgba(255, 255, 255, 0.06)",
                    }}
                    className="flex items-start gap-4 p-4 rounded-lg transition-colors border border-transparent hover:border-white/10"
                    style={{ background: "rgba(255, 255, 255, 0.02)" }}
                  >
                    <div
                      className="w-10 h-10 rounded shrink-0 flex items-center justify-center mt-0.5"
                      style={{
                        background: `${wf.color}20`,
                        color: wf.color,
                      }}
                    >
                      {wf.icon}
                    </div>
                    <div>
                      <h4
                        className="text-sm font-bold mb-1"
                        style={{ color: "#ffffff" }}
                      >
                        {wf.title}
                      </h4>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: "#a0a0a0" }}
                      >
                        {wf.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Architecture diagram abstraction */}
        <motion.div variants={itemVariants} className="text-center mt-20 mb-10">
          <h2 className="text-2xl font-bold mb-8">Architectural Flow</h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 max-w-4xl mx-auto">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-6 w-full md:w-auto hover:bg-white/10 transition-colors">
              <TerminalSquare
                size={28}
                className="mx-auto mb-3 text-[#0847F7]"
              />
              <h4 className="font-semibold text-sm mb-2">1. Frontend UX</h4>
              <p className="text-xs text-[#a0a0a0]">
                User predicts BTC price with click. Order signed via EVM wallet.
              </p>
            </div>

            <div className="rotate-90 md:rotate-0 text-[#d0d0d0] shrink-0">
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                ➜
              </motion.div>
            </div>

            <div className="flex-1 bg-white/5 border rounded-xl p-6 w-full md:w-auto hover:bg-[#0847F7]/10 transition-colors border-[#0847F7]/30 shadow-[0_0_30px_rgba(8,71,247,0.15)] relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0847F7] text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                Chainlink CRE
              </div>
              <Cpu size={28} className="mx-auto mb-3 text-[#0847F7]" />
              <h4 className="font-semibold text-sm mb-2">
                2. Processing Engine
              </h4>
              <p className="text-xs text-white/80">
                Validates Streams price, builds batches, calculates score &
                solvency.
              </p>
            </div>

            <div className="rotate-90 md:rotate-0 text-[#d0d0d0] shrink-0">
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
              >
                ➜
              </motion.div>
            </div>

            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-6 w-full md:w-auto hover:bg-white/10 transition-colors">
              <Layers size={28} className="mx-auto mb-3 text-[#2EBD85]" />
              <h4 className="font-semibold text-sm mb-2">
                3. On-chain Settlement
              </h4>
              <p className="text-xs text-[#a0a0a0]">
                Zero-knowledge Merkle proofs submitted. Winnings released via
                Smart Contract.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};
