import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  TrendingUp,
  Shield,
  Zap,
  BarChart2,
  Globe,
  Lock,
  ChevronRight,
} from "lucide-react";

/* ─────────────────────────── helpers ─────────────────────────── */

const features = [
  {
    icon: TrendingUp,
    title: "Real-time Trading",
    highlight: "Real-time",
    desc: "Predict price movements on live BTC/USD feeds powered by Chainlink Data Streams.",
  },
  {
    icon: Shield,
    title: "On-chain Security",
    highlight: "Security",
    desc: "Every deposit and withdrawal is trustlessly settled via audited smart contracts on Sepolia.",
  },
  {
    icon: Zap,
    title: "Instant Execution",
    highlight: "Instant",
    desc: "Sub-second order placement with real-time balance updates through our WebSocket engine.",
  },
  {
    icon: BarChart2,
    title: "Advanced Analytics",
    highlight: "Analytics",
    desc: "Full trade history, PnL tracking and visual dashboards to measure your edge.",
  },
  {
    icon: Globe,
    title: "Permissionless Access",
    highlight: "Permissionless",
    desc: "Connect any EVM wallet. No KYC, no accounts — just sign and trade.",
  },
  {
    icon: Lock,
    title: "Liquidity Pools",
    highlight: "Liquidity",
    desc: "Become an LP and earn yield from trader activity while backstopping the protocol.",
  },
];

const stats = [
  { value: "$500K+", label: "Total Volume" },
  { value: "50ms", label: "Execution Speed" },
  { value: "100%", label: "On-chain" },
  { value: "0%", label: "Hidden Fees" },
  { value: "24/7", label: "Always Open" },
];

const TICKER_ITEMS = [
  { label: "BTC/USD", value: "$84,231.20", change: "+2.34%", up: true },
  { label: "ETH/USD", value: "$3,241.80", change: "+1.12%", up: true },
  { label: "SOL/USD", value: "$142.50", change: "-0.87%", up: false },
  { label: "BNB/USD", value: "$412.30", change: "+0.55%", up: true },
  { label: "AVAX/USD", value: "$38.72", change: "-1.23%", up: false },
  { label: "LINK/USD", value: "$18.94", change: "+3.21%", up: true },
  { label: "MATIC/USD", value: "$0.892", change: "+0.43%", up: true },
  { label: "ARB/USD", value: "$1.234", change: "-0.65%", up: false },
];

/* ─────────────────────────── component ─────────────────────────── */

export const LandingPage: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{ background: "#0B0E11", fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Navigation ── */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300`}
        style={{
          background: scrolled ? "rgba(11,14,17,0.97)" : "rgba(11,14,17,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: scrolled
            ? "1px solid #2B3139"
            : "1px solid transparent",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ background: "rgba(55,91,210,0.12)" }}
            >
              <img
                src="/tapfun.png"
                alt="tapfun"
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <span className="text-base font-bold" style={{ color: "#375BD2" }}>
              TAPFUN
            </span>
          </Link>

          {/* Desktop nav links */}
          <div
            className="hidden md:flex items-center gap-6 text-sm font-medium"
            style={{ color: "#848E9C" }}
          >
            <a
              href="#features"
              className="hover:text-white transition-colors duration-150"
            >
              Features
            </a>
            <a
              href="#how"
              className="hover:text-white transition-colors duration-150"
            >
              How It Works
            </a>
            <a
              href="#stats"
              className="hover:text-white transition-colors duration-150"
            >
              Stats
            </a>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link
              to="/app"
              className="hidden md:flex items-center text-sm font-medium transition-colors duration-150"
              style={{ color: "#EAECEF" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "#375BD2")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "#EAECEF")
              }
            >
              Log In
            </Link>
            <Link
              to="/app"
              className="flex items-center gap-1.5 text-sm font-semibold"
              style={{
                background: "#375BD2",
                color: "#1E2329",
                borderRadius: "4px",
                padding: "8px 18px",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "#2C4AB8")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "#375BD2")
              }
            >
              Launch App <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Live Price Ticker ── */}
      <div
        className="fixed top-16 w-full z-40 overflow-hidden"
        style={{ background: "#181A20", borderBottom: "1px solid #2B3139" }}
      >
        <div
          ref={tickerRef}
          className="flex gap-0 whitespace-nowrap py-2"
          style={{ animation: "marquee 30s linear infinite" }}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-3 px-8 text-xs"
            >
              <span className="font-semibold" style={{ color: "#EAECEF" }}>
                {item.label}
              </span>
              <span
                className="font-mono font-medium"
                style={{ color: "#EAECEF" }}
              >
                {item.value}
              </span>
              <span
                className="font-medium"
                style={{ color: item.up ? "#2EBD85" : "#F6465D" }}
              >
                {item.change}
              </span>
              <span style={{ color: "#2B3139" }}>|</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="relative z-10 pt-52 pb-24 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          {/* Eyebrow tag */}
          <div className="label-tag mb-7">
            Built on Web3 · Powered by Chainlink
          </div>

          {/* Headline */}
          <h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1]"
            style={{ color: "#EAECEF" }}
          >
            Trade BTC/USD with{" "}
            <span style={{ color: "#375BD2" }}>On-chain</span>
            <br />
            Price Precision
          </h1>

          <p
            className="text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: "#848E9C" }}
          >
            Predict price movements on live BTC/USD feeds powered by Chainlink
            Data Streams. Deposit, bet, and withdraw with full on-chain
            transparency.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/app"
              className="group flex items-center gap-2 font-semibold text-sm"
              style={{
                background: "#375BD2",
                color: "#1E2329",
                borderRadius: "4px",
                padding: "12px 28px",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "#2C4AB8")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "#375BD2")
              }
            >
              GET EARLY ACCESS
              <ChevronRight
                size={16}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 font-medium text-sm transition-colors duration-150"
              style={{
                border: "1px solid #2B3139",
                borderRadius: "4px",
                padding: "12px 28px",
                color: "#848E9C",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#474D57";
                (e.currentTarget as HTMLElement).style.color = "#EAECEF";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#2B3139";
                (e.currentTarget as HTMLElement).style.color = "#848E9C";
              }}
            >
              Explore Features
            </a>
          </div>

          {/* Hero sub note */}
          <p className="mt-6 text-xs" style={{ color: "#474D57" }}>
            Demo mode available — no wallet required to get started.
          </p>
        </motion.div>

        {/* Floating status badge */}
        <motion.div
          className="mt-14 animate-float flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div
            className="glass rounded px-6 py-3 flex items-center gap-5"
            style={{ border: "1px solid #2B3139" }}
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
              </span>
              <span
                className="text-xs font-semibold"
                style={{ color: "#2EBD85" }}
              >
                LIVE
              </span>
            </div>
            <div className="w-px h-4" style={{ background: "#2B3139" }} />
            <span className="text-xs font-mono" style={{ color: "#848E9C" }}>
              BTC/USD · Real-time via Chainlink
            </span>
          </div>
        </motion.div>
      </section>

      {/* ── Stats bar ── */}
      <section
        id="stats"
        className="relative z-10 py-16 px-6"
        style={{
          borderTop: "1px solid #2B3139",
          borderBottom: "1px solid #2B3139",
          background: "#181A20",
        }}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="text-center"
            >
              <div
                className="text-2xl font-bold mb-1.5 font-mono"
                style={{ color: "#375BD2" }}
              >
                {stat.value}
              </div>
              <div
                className="text-xs uppercase tracking-wider font-medium"
                style={{ color: "#474D57" }}
              >
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="label-tag mb-5">Accessible for Everyone</div>
            <h2
              className="text-3xl md:text-5xl font-bold mb-5"
              style={{ color: "#EAECEF" }}
            >
              Crypto Trading{" "}
              <span style={{ color: "#375BD2" }}>Made Accessible</span>
            </h2>
            <p
              className="max-w-xl mx-auto text-sm"
              style={{ color: "#848E9C" }}
            >
              Everything you need to trade smarter, safer, and faster — all
              powered by Chainlink oracle data.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="feature-card group"
                >
                  <div
                    className="w-10 h-10 rounded flex items-center justify-center mb-5"
                    style={{ background: "rgba(55,91,210,0.08)" }}
                  >
                    <Icon size={20} style={{ color: "#375BD2" }} />
                  </div>
                  <h3
                    className="text-base font-semibold mb-2"
                    style={{ color: "#EAECEF" }}
                  >
                    {feat.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "#848E9C" }}
                  >
                    {feat.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section
        id="how"
        className="relative z-10 py-24 px-6"
        style={{ borderTop: "1px solid #2B3139" }}
      >
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="label-tag mb-5">How It Works</div>
            <h2
              className="text-3xl md:text-4xl font-bold mb-10"
              style={{ color: "#EAECEF" }}
            >
              Start Trading in{" "}
              <span style={{ color: "#375BD2" }}>3 Simple</span> Steps
            </h2>

            <div className="space-y-6">
              {[
                {
                  step: "01",
                  title: "Connect Your Wallet",
                  desc: "Link any EVM-compatible wallet or start instantly with demo mode — no commitment required.",
                },
                {
                  step: "02",
                  title: "Deposit Tokens",
                  desc: "Deposit ERC-20 tokens into the Pool Reserve contract. Your balance is credited instantly.",
                },
                {
                  step: "03",
                  title: "Trade & Earn",
                  desc: "Predict BTC price direction on each candle. Win and grow your balance, then withdraw anytime.",
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-5 items-start">
                  <div
                    className="shrink-0 w-10 h-10 rounded flex items-center justify-center font-bold font-mono text-xs"
                    style={{
                      background: "rgba(55,91,210,0.06)",
                      border: "1px solid rgba(55,91,210,0.15)",
                      color: "#375BD2",
                    }}
                  >
                    {item.step}
                  </div>
                  <div>
                    <h4
                      className="font-semibold mb-1 text-sm"
                      style={{ color: "#EAECEF" }}
                    >
                      {item.title}
                    </h4>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "#848E9C" }}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div
              className="rounded-lg p-6"
              style={{ background: "#181A20", border: "1px solid #2B3139" }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-6"
                style={{ color: "#375BD2" }}
              >
                Platform Stats · Live
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { label: "Active Traders", val: "2,400+" },
                  { label: "Bets Placed", val: "180K+" },
                  { label: "Avg Win Rate", val: "52.4%" },
                  { label: "Chainlink Feeds", val: "1" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="rounded pa-4 text-center"
                    style={{
                      background: "#1E2329",
                      border: "1px solid #2B3139",
                      padding: "18px 12px",
                    }}
                  >
                    <div
                      className="text-2xl font-bold font-mono mb-1"
                      style={{ color: "#375BD2" }}
                    >
                      {item.val}
                    </div>
                    <div
                      className="text-xs uppercase tracking-wider"
                      style={{ color: "#474D57" }}
                    >
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>

              <p
                className="text-xs text-center mb-4"
                style={{ color: "#474D57" }}
              >
                $49,232,300 contribution received
              </p>
              <div
                className="w-full rounded-full overflow-hidden"
                style={{ background: "#2B3139", height: "4px" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: "72%", background: "#375BD2" }}
                />
              </div>
              <div
                className="flex justify-between mt-2 text-xs"
                style={{ color: "#474D57" }}
              >
                <span>72% funded</span>
                <span>Goal: $68M</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section
        className="relative z-10 py-24 px-6 text-center"
        style={{ borderTop: "1px solid #2B3139", background: "#181A20" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <div className="label-tag mb-7">Start for Free</div>
          <h2
            className="text-3xl md:text-5xl font-bold mb-6 leading-tight"
            style={{ color: "#EAECEF" }}
          >
            Ready to trade the{" "}
            <span style={{ color: "#375BD2" }}>smarter way</span>?
          </h2>
          <p className="mb-10 text-sm" style={{ color: "#848E9C" }}>
            Join thousands of traders experiencing the future of on-chain
            prediction markets. No sign-up. Just connect and trade.
          </p>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 font-semibold text-sm"
            style={{
              background: "#375BD2",
              color: "#1E2329",
              borderRadius: "4px",
              padding: "14px 36px",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "#2C4AB8")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "#375BD2")
            }
          >
            GET STARTED FREE <ArrowRight size={15} />
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="relative z-10 py-10 px-6"
        style={{ borderTop: "1px solid #2B3139" }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold" style={{ color: "#375BD2" }}>
              TAPFUN
            </span>
            <span className="text-xs" style={{ color: "#474D57" }}>
              · Powered by Chainlink
            </span>
          </div>
          <div
            className="flex items-center gap-6 text-xs uppercase tracking-wider"
            style={{ color: "#474D57" }}
          >
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#how" className="hover:text-white transition-colors">
              How It Works
            </a>
            <Link to="/app" className="hover:text-white transition-colors">
              App
            </Link>
          </div>
          <div className="text-xs" style={{ color: "#474D57" }}>
            © 2024 TAPFUN. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
