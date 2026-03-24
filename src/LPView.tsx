import React, { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock3,
  Coins,
  Droplets,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { hederaTestnet } from "./config/chains";
import { POOL_RESERVE_ADDRESS } from "./contracts/abi";
import { formatTokenSymbol } from "./utils/chain";

const ACCENT = "#2D84EB";
const SECONDARY = "#4F46E5";
const DEEP = "#00156E";
const ACCENT_SOFT = "rgba(45, 132, 235, 0.14)";
const BORDER = "rgba(255, 255, 255, 0.11)";
const PANEL_BG =
  "linear-gradient(148deg, rgba(17, 20, 24, 0.94) 0%, rgba(10, 12, 15, 0.98) 100%)";
const TILE_BG =
  "linear-gradient(148deg, rgba(15, 18, 23, 0.94) 0%, rgba(9, 11, 14, 0.99) 100%)";
const SUBTLE_BG = "rgba(255, 255, 255, 0.04)";

const COMING_SOON_MESSAGE =
  "LP deposit and withdrawal are coming soon. This feature is currently unavailable on the frontend.";

type TabKey = "deposit" | "withdraw";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5"
      style={{
        background: TILE_BG,
        border: `1px solid ${BORDER}`,
        boxShadow: "0 12px 28px rgba(0, 0, 0, 0.44)",
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(45, 132, 235, 0.36) 50%, transparent 100%)",
        }}
      />
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
        {label}
      </p>
      <p className="mt-2 text-[1.4rem] font-bold tracking-[-0.03em] text-white">
        {value}
      </p>
      {sub ? <p className="mt-1.5 text-xs text-white/55">{sub}</p> : null}
    </div>
  );
}

function formatAmount(
  value: bigint | undefined,
  decimals: number,
  digits = 4,
  fallback = "—",
) {
  if (value === undefined) return fallback;

  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

export const LPView: React.FC = () => {
  const { address, chain } = useAccount();
  const [activeTab, setActiveTab] = useState<TabKey>("deposit");

  const { data: nativeBalance, refetch: refetchNativeBalance } = useBalance({
    address,
    chainId: hederaTestnet.id,
    query: { enabled: !!address },
  });

  const nativeSymbol = formatTokenSymbol(
    nativeBalance?.symbol ??
      chain?.nativeCurrency.symbol ??
      hederaTestnet.nativeCurrency.symbol,
  );
  const nativeDecimals =
    nativeBalance?.decimals ?? chain?.nativeCurrency.decimals ?? 18;

  const railLabel = useMemo(
    () =>
      activeTab === "deposit" ? "Wallet -> LP shares" : "LP shares -> Wallet",
    [activeTab],
  );

  return (
    <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-5 sm:px-6 lg:px-10 lg:py-7">
      <div
        className="absolute left-[18%] top-5 h-[260px] w-[260px] rounded-full blur-[130px]"
        style={{
          background:
            "radial-gradient(circle, rgba(132,185,255,0.13) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute right-[11%] top-[26%] h-[220px] w-[220px] rounded-full blur-[110px]"
        style={{
          background:
            "radial-gradient(circle, rgba(45,132,235,0.1) 0%, transparent 72%)",
        }}
      />

      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full border"
            style={{
              borderColor: "rgba(45,132,235,0.3)",
              background: ACCENT_SOFT,
            }}
          >
            <Droplets size={18} style={{ color: ACCENT }} />
          </div>
          <div>
            <h1 className="text-[1.72rem] font-bold tracking-[-0.03em] text-white">
              Liquidity Pool
            </h1>
            <p className="text-xs text-white/45">{COMING_SOON_MESSAGE}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/55">
          <span
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5"
            style={{ borderColor: BORDER, background: SUBTLE_BG }}
          >
            <Clock3 size={12} />
            Coming soon
          </span>
          <span
            className="rounded-md border px-2.5 py-1.5"
            style={{ borderColor: BORDER, background: SUBTLE_BG }}
          >
            {hederaTestnet.name}
          </span>
          <button
            type="button"
            onClick={() => refetchNativeBalance()}
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-white/70 transition hover:text-white"
            style={{ borderColor: BORDER, background: SUBTLE_BG }}
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Feature Status"
          value="Coming Soon"
          sub="Frontend actions are intentionally disabled"
        />
        <StatCard
          label="Reserve Contract"
          value={`${POOL_RESERVE_ADDRESS.slice(0, 8)}...${POOL_RESERVE_ADDRESS.slice(-6)}`}
          sub="LP operations settle through this contract"
        />
        <StatCard
          label="Current Rail"
          value={railLabel}
          sub="Planned interaction path"
        />
        <StatCard
          label="Wallet Native Balance"
          value={`${formatAmount(nativeBalance?.value, nativeDecimals)} ${nativeSymbol}`}
          sub="Read-only for now"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div
          className="rounded-2xl p-5"
          style={{
            background: PANEL_BG,
            border: `1px solid ${BORDER}`,
            boxShadow: "0 18px 36px rgba(0, 0, 0, 0.45)",
          }}
        >
          <h3 className="text-lg font-semibold text-white">What LP Means</h3>
          <p className="mt-2 text-sm text-white/65">
            The LP module lets users provide liquidity to the reserve pool,
            receive LP shares, and later redeem those shares for underlying
            assets. LP shares represent proportional ownership of the pool.
          </p>

          <div className="mt-4 space-y-2">
            {[
              {
                title: "Provide Liquidity",
                detail: "Supply native assets into the reserve pool.",
                icon: ArrowUpRight,
              },
              {
                title: "Receive LP Shares",
                detail: "Shares track your ownership of total pool liquidity.",
                icon: Coins,
              },
              {
                title: "Redeem On Withdraw",
                detail: "Burn shares to receive underlying assets back.",
                icon: ArrowDownLeft,
              },
              {
                title: "Reserve Safety Model",
                detail: "Pool accounting and collateral are enforced on-chain.",
                icon: ShieldCheck,
              },
            ].map(({ title, detail, icon: Icon }) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-lg border px-3 py-3"
                style={{ borderColor: BORDER, background: SUBTLE_BG }}
              >
                <div
                  className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md"
                  style={{ background: ACCENT_SOFT }}
                >
                  <Icon size={14} style={{ color: ACCENT }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-xs text-white/65">{detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-4 rounded-xl border px-4 py-3"
            style={{
              borderColor: "rgba(45,132,235,0.25)",
              background: ACCENT_SOFT,
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9bcbff]">
              Current Availability
            </p>
            <p className="mt-1 text-sm text-white/85">{COMING_SOON_MESSAGE}</p>
          </div>
        </div>

        <div
          className="h-fit rounded-2xl p-5"
          style={{
            background: PANEL_BG,
            border: `1px solid ${BORDER}`,
            boxShadow: "0 18px 38px rgba(0, 0, 0, 0.5)",
          }}
        >
          <h3 className="text-lg font-semibold text-white">Planned Flow</h3>

          <div className="mt-3 inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
            {(["deposit", "withdraw"] as const).map((tab) => {
              const isActive = activeTab === tab;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className="rounded-lg px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition"
                  style={{
                    color: isActive ? "#ffffff" : "rgba(255,255,255,0.58)",
                    background: isActive
                      ? `linear-gradient(135deg, ${ACCENT} 0%, ${SECONDARY} 58%, ${DEEP} 100%)`
                      : "transparent",
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div
            className="mt-4 rounded-xl border px-4 py-3"
            style={{ borderColor: BORDER, background: SUBTLE_BG }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Availability Note
            </p>
            <p className="mt-2 text-sm text-white/80">
              This page is informational right now. Transaction inputs and
              action buttons remain disabled until LP is released.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled
              className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white/70 opacity-70"
              style={{
                background:
                  "linear-gradient(135deg, rgba(45,132,235,0.35) 0%, rgba(79,70,229,0.35) 58%, rgba(0,21,110,0.35) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <ArrowUpRight size={14} />
              Deposit LP
            </button>
            <button
              type="button"
              disabled
              className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white/70 opacity-70"
              style={{
                background:
                  "linear-gradient(135deg, rgba(45,132,235,0.35) 0%, rgba(79,70,229,0.35) 58%, rgba(0,21,110,0.35) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <ArrowDownLeft size={14} />
              Withdraw LP
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
