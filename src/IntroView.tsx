import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Bolt,
  Clock3,
  Database,
  Droplets,
  Layers,
  Network,
  type LucideIcon,
} from "lucide-react";
import { Squares } from "./Squares";
import { HcsAnchorWorkflow } from "./HcsAnchorWorkflow";

const ACCENT = "#2D84EB";
const SECONDARY = "#4F46E5";
const DEEP = "#00156E";
const SOFT_BLUE = "#8EC1FF";
const TEXT_DIM = "#D0D0D0";

const EDGE_POINTS: {
  icon: LucideIcon;
  title: string;
  description: string;
  tint: string;
}[] = [
  {
    icon: Bolt,
    title: "Realtime Off-chain Engine",
    description:
      "Gameplay logic executes off-chain for instant response and smooth trading.",
    tint: ACCENT,
  },
  {
    icon: Layers,
    title: "Merkle Batch Commit",
    description:
      "Settled orders are grouped, hashed, and compressed into a single Merkle root.",
    tint: SECONDARY,
  },
  {
    icon: Network,
    title: "Hedera Consensus Record",
    description:
      "Each batch gets sequence number, consensus timestamp, and running hash.",
    tint: SOFT_BLUE,
  },
  {
    icon: Database,
    title: "Mirror Node Validation",
    description:
      "Anyone can fetch anchor data from mirror nodes and verify public commit history.",
    tint: "#6EA8FF",
  },
  {
    icon: BadgeCheck,
    title: "Order-level Proof",
    description:
      "Every order can be proven inside an anchored batch with Merkle proof.",
    tint: "#5F91FF",
  },
];

const ADVANTAGES: {
  title: string;
  description: string;
  icon: LucideIcon;
  tint: string;
}[] = [
  {
    title: "Fast UX",
    description:
      "No waiting for block confirmations while users are actively trading.",
    icon: Clock3,
    tint: ACCENT,
  },
  {
    title: "Transparent Settlement",
    description:
      "Important economic outcomes are committed publicly, not hidden in private logs.",
    icon: Network,
    tint: SECONDARY,
  },
  {
    title: "Audit-ready Integrity",
    description:
      "Post-settlement edits become detectable because Merkle root and anchor no longer match.",
    icon: BadgeCheck,
    tint: SOFT_BLUE,
  },
];

type SectionHeaderProps = {
  badge: string;
  title: string;
  subtitle: string;
};

const SectionHeader: React.FC<SectionHeaderProps> = ({
  badge,
  title,
  subtitle,
}) => (
  <div className="mx-auto max-w-4xl text-center">
    <div
      className="inline-flex rounded-full border px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
      style={{
        color: SOFT_BLUE,
        borderColor: "rgba(45, 132, 235, 0.36)",
        background: "rgba(10, 20, 46, 0.85)",
      }}
    >
      {badge}
    </div>
    <h2
      className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl"
      style={{ textShadow: "0 12px 34px rgba(45, 132, 235, 0.35)" }}
    >
      {title}
    </h2>
    <p
      className="mx-auto mt-4 max-w-2xl text-base leading-7"
      style={{ color: TEXT_DIM }}
    >
      {subtitle}
    </p>
  </div>
);

export const IntroView: React.FC = () => {
  return (
    <div className="relative z-0 flex-1 w-full overflow-y-auto">
      <div className="pointer-events-none fixed inset-0 z-0">
        <Squares
          direction="diagonal"
          speed={0.22}
          borderColor="rgba(45, 132, 235, 0.16)"
          hoverFillColor="rgba(79, 70, 229, 0.13)"
          squareSize={46}
          className="h-full w-full opacity-[0.78]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 52% 4%, rgba(45,132,235,0.24) 0%, rgba(79,70,229,0.14) 30%, transparent 62%), linear-gradient(180deg, rgba(1,5,20,0.28) 0%, rgba(1,7,24,0.82) 50%, rgba(1,6,20,0.95) 100%)",
          }}
        />
        <div className="absolute left-0 top-[18%] h-[2px] w-[42%] bg-gradient-to-r from-transparent via-[#2D84EB]/40 to-transparent" />
        <div className="absolute right-0 top-[26%] h-[2px] w-[38%] bg-gradient-to-l from-transparent via-[#4F46E5]/36 to-transparent" />
        <div className="absolute left-1/2 top-0 h-[440px] w-[1px] -translate-x-1/2 bg-gradient-to-b from-[#2D84EB]/34 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1160px] px-4 pb-24 pt-6 sm:px-6 lg:px-10">
        <header className="flex items-center">
          <Link to="/" className="inline-flex items-center gap-3">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl border"
              style={{
                borderColor: "rgba(45, 132, 235, 0.56)",
                background:
                  "linear-gradient(145deg, rgba(45,132,235,0.95) 0%, rgba(79,70,229,0.88) 64%, rgba(0,21,110,0.9) 100%)",
                boxShadow: "0 16px 36px rgba(45, 132, 235, 0.5)",
              }}
            >
              <Droplets size={16} className="text-white" />
            </span>
            <span
              className="text-[33px] font-bold uppercase italic tracking-tight"
              style={{
                color: ACCENT,
                textShadow: "0 10px 24px rgba(45, 132, 235, 0.46)",
              }}
            >
              TAPL
            </span>
          </Link>
        </header>

        <section className="mx-auto mt-12 max-w-5xl text-center sm:mt-16">
          <div
            className="relative overflow-hidden rounded-[28px] border px-5 py-10 sm:px-10 sm:py-14"
            style={{
              borderColor: "rgba(45, 132, 235, 0.34)",
              background:
                "linear-gradient(180deg, rgba(10, 18, 44, 0.9) 0%, rgba(3, 10, 31, 0.95) 100%)",
              boxShadow:
                "0 30px 80px rgba(5, 9, 30, 0.72), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-[#2D84EB]/55 to-transparent" />
              <div className="absolute left-[12%] top-10 h-px w-[76%] bg-gradient-to-r from-transparent via-[#4F46E5]/40 to-transparent" />
            </div>

            <h1 className="mt-7 text-5xl font-semibold leading-[1.03] tracking-tight text-white sm:text-6xl md:text-7xl">
              Tap. Bet. Capture
              <span className="block bg-gradient-to-r from-[#FFFFFF] via-[#8EC1FF] to-[#4F46E5] bg-clip-text text-transparent">
                Every Price Move
              </span>
            </h1>

            <p
              className="mx-auto mt-6 max-w-3xl text-base leading-8 sm:text-lg"
              style={{ color: TEXT_DIM }}
            >
              TAPL is built for rapid tap-to-bet execution. Enter positions in
              seconds, react to live momentum, and manage risk with a fast
              interface designed for active players.
            </p>

            <div
              className="mt-8 flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: SOFT_BLUE }}
            >
              {[
                "Tap To Bet",
                "Instant Entry",
                "Live Price Feed",
                "Real-Time PnL",
              ].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border px-3 py-1 transition hover:-translate-y-0.5"
                  style={{
                    borderColor: "rgba(45, 132, 235, 0.35)",
                    background: "rgba(10, 18, 44, 0.9)",
                    boxShadow: "0 6px 18px rgba(45, 132, 235, 0.2)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/trade"
                className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-xl border px-7 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5 hover:scale-[1.01]"
                style={{
                  borderColor: "rgba(45, 132, 235, 0.42)",
                  background: `linear-gradient(135deg, ${ACCENT} 0%, ${SECONDARY} 58%, ${DEEP} 100%)`,
                  boxShadow: "0 18px 34px rgba(45, 132, 235, 0.46)",
                }}
              >
                Start Betting Now
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-6xl">
          <SectionHeader
            badge="Anchor Workflow"
            title="HCS Anchor Workflow"
            subtitle="From settled orders to public mirror-node verification and order-level Merkle proof."
          />
          <div className="mt-10">
            <HcsAnchorWorkflow />
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-6xl">
          <SectionHeader
            badge="Our Edge"
            title="Where We Excel, Others Fall Behind."
            subtitle="Fast player experience, low-cost anchoring, and verifiable settlement history in one architecture."
          />

          <div
            className="mt-12 rounded-[24px] border px-4 py-6 sm:px-6 sm:py-8"
            style={{
              borderColor: "rgba(148, 163, 184, 0.3)",
              background:
                "linear-gradient(180deg, rgba(5, 14, 41, 0.78) 0%, rgba(3, 10, 30, 0.93) 100%)",
              boxShadow: "0 24px 70px rgba(5, 9, 30, 0.6)",
            }}
          >
            <div className="grid gap-4 md:grid-cols-3 md:divide-x md:divide-white/10">
              {EDGE_POINTS.slice(0, 3).map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="group rounded-xl px-3 py-4 text-center transition duration-300 hover:-translate-y-1 hover:bg-white/[0.04]"
                  >
                    <span
                      className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-xl border transition group-hover:scale-110"
                      style={{
                        borderColor: `${item.tint}77`,
                        background:
                          "linear-gradient(160deg, rgba(9, 20, 52, 0.92) 0%, rgba(11, 28, 68, 0.7) 100%)",
                        boxShadow: `0 10px 24px ${item.tint}30`,
                      }}
                    >
                      <Icon size={21} style={{ color: item.tint }} />
                    </span>
                    <h3 className="mt-5 text-xl font-semibold text-white sm:text-[22px]">
                      {item.title}
                    </h3>
                    <p
                      className="mx-auto mt-2 max-w-xs text-sm leading-6"
                      style={{ color: TEXT_DIM }}
                    >
                      {item.description}
                    </p>
                  </article>
                );
              })}
            </div>

            <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2 md:divide-x md:divide-white/10">
              {EDGE_POINTS.slice(3).map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="group rounded-xl px-3 py-4 text-center transition duration-300 hover:-translate-y-1 hover:bg-white/[0.04]"
                  >
                    <span
                      className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-xl border transition group-hover:scale-110"
                      style={{
                        borderColor: `${item.tint}77`,
                        background:
                          "linear-gradient(160deg, rgba(9, 20, 52, 0.92) 0%, rgba(11, 28, 68, 0.7) 100%)",
                        boxShadow: `0 10px 24px ${item.tint}30`,
                      }}
                    >
                      <Icon size={21} style={{ color: item.tint }} />
                    </span>
                    <h3 className="mt-5 text-xl font-semibold text-white sm:text-[22px]">
                      {item.title}
                    </h3>
                    <p
                      className="mx-auto mt-2 max-w-xs text-sm leading-6"
                      style={{ color: TEXT_DIM }}
                    >
                      {item.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-6xl">
          <SectionHeader
            badge="Our Advantages"
            title="Leading The Revolution, Setting New Standards."
            subtitle="A concise architecture: fast where users need it, verifiable where trust matters."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {ADVANTAGES.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="group relative overflow-hidden rounded-[24px] border p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_46px_rgba(16,24,56,0.62)]"
                  style={{
                    borderColor: "rgba(148, 163, 184, 0.28)",
                    background:
                      "linear-gradient(180deg, rgba(8, 18, 49, 0.84) 0%, rgba(3, 10, 29, 0.97) 100%)",
                  }}
                >
                  <div className="absolute right-0 top-0 h-[3px] w-[62%] bg-gradient-to-l from-transparent via-white/25 to-transparent" />
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
                      backgroundSize: "28px 28px",
                    }}
                  />
                  <div
                    className="relative inline-flex h-16 w-16 items-center justify-center rounded-xl border transition group-hover:scale-110"
                    style={{
                      borderColor: `${item.tint}80`,
                      color: item.tint,
                      background:
                        "linear-gradient(160deg, rgba(9, 20, 52, 0.92) 0%, rgba(11, 28, 68, 0.72) 100%)",
                      boxShadow: `0 10px 24px ${item.tint}30`,
                    }}
                  >
                    <Icon size={22} />
                  </div>

                  <h3 className="relative mt-6 text-3xl font-semibold text-white sm:text-[34px]">
                    {item.title}
                  </h3>
                  <p
                    className="relative mt-3 text-base leading-7"
                    style={{ color: TEXT_DIM }}
                  >
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
