import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Database,
  Lock,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

const accent = "#f0b90b";

const platformPillars = [
  {
    eyebrow: "Storage",
    title: "Hold positions, balances, and reserve state in one mental model.",
    description:
      "The homepage now frames wallet balance, trader activity, and LP reserve as one connected system.",
    icon: Database,
  },
  {
    eyebrow: "Execution",
    title: "Move from wallet connect to trade entry with less friction.",
    description:
      "Primary actions stay close to the headline and preview panel so the user understands where to click next.",
    icon: Zap,
  },
  {
    eyebrow: "Trust",
    title: "Explain settlement clearly before the user ever opens the app.",
    description:
      "On-chain wording, reserve context, and round mechanics are simplified into readable cards instead of marketing noise.",
    icon: ShieldCheck,
  },
];

const productSurfaces = [
  {
    title: "Trade cockpit",
    href: "/trade",
    summary:
      "The fast surface for BTC directional rounds, price timing, entry flow, and quick status feedback.",
    bullets: ["Open round", "Tap a direction", "Track round state"],
    stat: "Low-latency entry",
  },
  {
    title: "Wallet rail",
    href: "/wallet",
    summary:
      "The movement layer for deposits, in-app balances, and withdrawals without making the user decode backend concepts.",
    bullets: ["Deposit to app", "Watch available balance", "Withdraw cleanly"],
    stat: "Funding clarity",
  },
  {
    title: "Reserve layer",
    href: "/lp",
    summary:
      "The LP surface for reserve participation, share minting, and understanding how liquidity supports payouts.",
    bullets: ["Provide liquidity", "Mint LP shares", "Follow reserve health"],
    stat: "Protocol support",
  },
];

const operatingFlow = [
  {
    step: "01",
    title: "Connect and authenticate",
    description:
      "Start with wallet signature or demo mode so the product is understandable before capital is committed.",
  },
  {
    step: "02",
    title: "Fund the trading balance",
    description:
      "Move funds into the in-app balance layer, where round entry feels immediate and consistent.",
  },
  {
    step: "03",
    title: "Join live BTC rounds",
    description:
      "Choose a direction, monitor the round, and keep the action loop compact and readable.",
  },
  {
    step: "04",
    title: "Settle or support liquidity",
    description:
      "Profits can move back through the wallet rail, while LP capital continues to back reserve activity.",
  },
];

export const IntroView: React.FC = () => {
  return (
    <div className="relative flex-1 overflow-y-auto overflow-x-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-x-0 top-0 h-[480px]"
          style={{
            background:
              "radial-gradient(circle at top, rgba(240,185,11,0.16) 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
            maskImage:
              "linear-gradient(180deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 42%, transparent 100%)",
          }}
        />
        <div className="absolute left-[-8rem] top-44 h-72 w-72 rounded-full bg-[#f0b90b]/8 blur-3xl" />
        <div className="absolute right-[-5rem] top-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-4 pb-18 pt-5 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="sticky top-0 z-30 mb-10"
        >
          <div className="rounded-full border border-white/8 bg-[rgba(8,8,8,0.9)] px-4 py-3 shadow-[0_22px_50px_rgba(0,0,0,0.28)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link to="/" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                  <img
                    src="/polkatap.png"
                    alt="PolkaTap"
                    className="h-6 w-6 object-contain"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/34">
                    PolkaTap
                  </p>
                  <p className="text-sm text-white/72">Polkadot Hackathon</p>
                </div>
              </Link>

              <div className="hidden items-center gap-6 text-sm text-white/54 md:flex">
                <a href="#platform" className="transition hover:text-white">
                  Platform
                </a>
                <a href="#surfaces" className="transition hover:text-white">
                  Surfaces
                </a>
                <a href="#process" className="transition hover:text-white">
                  Process
                </a>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to="/wallet"
                  className="hidden rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/68 transition hover:border-white/18 hover:text-white sm:inline-flex"
                >
                  Wallet
                </Link>
                <Link
                  to="/trade"
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-black shadow-[0_18px_42px_rgba(240,185,11,0.18)] transition hover:-translate-y-0.5"
                  style={{
                    background:
                      "linear-gradient(135deg, #f0b90b 0%, #ffcf4c 100%)",
                  }}
                >
                  Launch trade
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </motion.header>

        <section className="py-10 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mx-auto flex max-w-5xl flex-col items-center text-center"
          >
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em]"
              style={{
                background: "rgba(240, 185, 11, 0.08)",
                border: "1px solid rgba(240, 185, 11, 0.14)",
                color: accent,
              }}
            >
              <Sparkles size={12} />
              Operational trading UI
            </div>

            <h1 className="mt-8 max-w-5xl text-5xl font-semibold leading-[0.95] tracking-[-0.08em] text-white md:text-7xl lg:text-[92px]">
              Trading infrastructure
              <span className="block text-white/58">
                for BTC rounds on Polkadot
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-white/52 md:text-lg">
              Wallet funding, round execution, and reserve-backed settlement,
              presented as one clean operating system instead of a noisy promo
              page.
            </p>

            <div className="mt-9 flex w-full max-w-3xl items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d9a300]/80">
              <span className="hidden h-px flex-1 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08))] md:block" />
              <Link
                to="/trade"
                className="inline-flex rounded-full border border-white/8 bg-white/[0.02] p-1 shadow-[0_10px_34px_rgba(0,0,0,0.18)] transition hover:border-white/14"
              >
                <span
                  className="rounded-full px-7 py-3 text-[13px] tracking-normal text-black"
                  style={{
                    background:
                      "linear-gradient(135deg, #f0b90b 0%, #ffcf4c 100%)",
                    boxShadow: "0 8px 24px rgba(240, 185, 11, 0.18)",
                  }}
                >
                  Trading
                </span>
              </Link>
              <span className="hidden h-px flex-1 bg-[linear-gradient(90deg,rgba(255,255,255,0.08),transparent)] md:block" />
            </div>

            <div className="mt-12 h-px w-full max-w-5xl bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)]" />
          </motion.div>
        </section>

        <motion.section
          id="platform"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          className="py-12"
        >
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/34">
              Platform story
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.07em] text-white md:text-5xl">
              A cleaner homepage for a product that already has real moving
              parts.
            </h2>
            <p className="mt-4 text-base leading-8 text-white/56">
              Instead of treating PolkaTap like a generic crypto promo page, the
              new layout explains what happens operationally: where money
              enters, how rounds execute, and how reserve liquidity supports
              outcomes.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {platformPillars.map(
              ({ eyebrow, title, description, icon: Icon }) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.35 }}
                  className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,#111111_0%,#0c0c0c_100%)] p-5 shadow-[0_16px_38px_rgba(0,0,0,0.24)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/34">
                      {eyebrow}
                    </span>
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-2xl"
                      style={{
                        background: "rgba(240, 185, 11, 0.1)",
                        color: accent,
                        border: "1px solid rgba(240, 185, 11, 0.12)",
                      }}
                    >
                      <Icon size={18} />
                    </div>
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold tracking-[-0.05em] text-white">
                    {title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-white/56">
                    {description}
                  </p>
                </motion.div>
              ),
            )}
          </div>
        </motion.section>

        <section id="surfaces" className="py-8">
          <div className="rounded-[34px] border border-white/8 bg-[linear-gradient(180deg,#101010_0%,#0b0b0b_100%)] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.3)] sm:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/34">
                  Product surfaces
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-white md:text-5xl">
                  Three surfaces, one product language.
                </h2>
              </div>
              <Link
                to="/trade"
                className="inline-flex items-center gap-2 self-start text-sm font-medium text-white/68 transition hover:text-white"
              >
                Open the app
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {productSurfaces.map((card) => (
                <Link
                  key={card.title}
                  to={card.href}
                  className="group rounded-[28px] border border-white/8 bg-white/[0.03] p-5 transition hover:border-white/16 hover:bg-white/[0.05]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/32">
                      <BarChart3 size={13} style={{ color: accent }} />
                      Surface
                    </div>
                    <span
                      className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                      style={{
                        color: accent,
                        background: "rgba(240, 185, 11, 0.08)",
                      }}
                    >
                      {card.stat}
                    </span>
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold tracking-[-0.05em] text-white">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-white/56">
                    {card.summary}
                  </p>
                  <div className="mt-5 space-y-2">
                    {card.bullets.map((point) => (
                      <div
                        key={point}
                        className="flex items-center gap-2 text-sm text-white/68"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-[#f0b90b]" />
                        {point}
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-white/74 transition group-hover:text-white">
                    Explore surface
                    <ArrowRight size={14} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="process" className="py-12">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/34">
                Operating flow
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.07em] text-white md:text-5xl">
                Explain the loop before asking for trust.
              </h2>
              <p className="mt-4 text-base leading-8 text-white/56">
                Pixeltable's homepage works because the product flow is visible.
                This refactor follows that principle for PolkaTap: first show
                the sequence, then ask the user to enter it.
              </p>

              <div className="mt-8 rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,#111111_0%,#0c0c0c_100%)] p-5 shadow-[0_16px_38px_rgba(0,0,0,0.24)]">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{
                      background: "rgba(240, 185, 11, 0.1)",
                      color: accent,
                    }}
                  >
                    <Lock size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/86">
                      Demo-first onboarding
                    </p>
                    <p className="mt-1 text-sm text-white/56">
                      Users can understand the shape of the product before they
                      move real funds.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {operatingFlow.map((item) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: 18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,#111111_0%,#0c0c0c_100%)] p-5 shadow-[0_16px_38px_rgba(0,0,0,0.24)]"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold"
                      style={{
                        background: "rgba(240, 185, 11, 0.1)",
                        color: accent,
                        border: "1px solid rgba(240, 185, 11, 0.14)",
                      }}
                    >
                      {item.step}
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold tracking-[-0.05em] text-white">
                        {item.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-white/56">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-12 pt-4">
          <div className="rounded-[34px] border border-white/8 bg-[linear-gradient(180deg,#111111_0%,#0d0d0d_100%)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.32)] sm:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/34">
                  Next step
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-white md:text-5xl">
                  The homepage now feels like the front door of a product, not a
                  placeholder promo screen.
                </h2>
                <p className="mt-4 text-base leading-8 text-white/56">
                  Users can choose the trading loop, the wallet rail, or the LP
                  side with much less cognitive load, while the rest of the app
                  keeps its current routes and functionality.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/trade"
                  className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5"
                  style={{
                    background:
                      "linear-gradient(135deg, #f0b90b 0%, #ffcf4c 100%)",
                  }}
                >
                  Start trading
                  <ArrowRight size={15} />
                </Link>
                <Link
                  to="/wallet"
                  className="inline-flex items-center rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-white/72 transition hover:border-white/18 hover:text-white"
                >
                  Open wallet
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
