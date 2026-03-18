import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import {
  Activity,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import { BACKEND_URL } from "./constant";

const ACCENT = "#f0b90b";
const ACCENT_SOFT = "rgba(240, 185, 11, 0.14)";
const BORDER = "rgba(255, 255, 255, 0.08)";
const PAGE_SIZE = 20;

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

function formatMoney(value: string | number | undefined) {
  const amount =
    typeof value === "number" ? value : Number.parseFloat(value ?? "0");

  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string) {
  if (!value) return "Awaiting settlement";

  return format(new Date(value), "MMM d, yyyy · HH:mm:ss");
}

interface Order {
  settledAt?: string;
  createdAt?: string;
  marketId?: string;
  rewardRate?: string | number;
  amount: string | number;
  settledWin?: boolean | null;
  status?: string;
}

interface SummaryCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
}

function SummaryCard({ icon: Icon, label, value, sub }: SummaryCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-[22px] p-5"
      style={{
        background:
          "linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(11,11,11,0.96) 100%)",
        border: `1px solid ${BORDER}`,
        boxShadow: "0 24px 64px rgba(0, 0, 0, 0.34)",
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(240,185,11,0.4) 50%, transparent 100%)",
        }}
      />
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{
            background: ACCENT_SOFT,
            border: "1px solid rgba(240, 185, 11, 0.18)",
            color: ACCENT,
          }}
        >
          <Icon size={18} />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
            {label}
          </p>
          <p className="mt-1 text-[13px] text-white/70">{sub}</p>
        </div>
      </div>
      <p className="text-[1.85rem] font-bold tracking-[-0.04em] text-white">
        {value}
      </p>
    </div>
  );
}

export const HistoryView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  const fetchHistory = async (pageIdx: number) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const offset = pageIdx * PAGE_SIZE;
      const res = await axios.get(
        `${BACKEND_URL}/api/orders/user?limit=${PAGE_SIZE}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            accept: "*/*",
          },
        },
      );
      const data = res.data?.data || res.data;
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  const stats = useMemo(() => {
    const settled = orders.filter((order) => order.settledWin !== null);
    const wins = settled.filter((order) => order.settledWin === true).length;
    const pending = orders.filter((order) => order.settledWin == null).length;
    const totalVolume = orders.reduce((sum, order) => {
      const amount =
        typeof order.amount === "number"
          ? order.amount
          : Number.parseFloat(order.amount || "0");

      return sum + amount;
    }, 0);

    return {
      total: orders.length,
      settled: settled.length,
      winRate:
        settled.length > 0
          ? `${((wins / settled.length) * 100).toFixed(1)}%`
          : "0.0%",
      pending,
      volume: formatMoney(totalVolume),
    };
  }, [orders]);

  const hasNextPage = orders.length === PAGE_SIZE;

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div
        className="absolute left-1/2 top-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{
          background:
            "radial-gradient(circle, rgba(240,185,11,0.16) 0%, transparent 72%)",
        }}
      />

      <section className="relative overflow-hidden rounded-[28px] border border-white/8 bg-[#0b0b0b]/95 px-6 py-6 shadow-[0_36px_90px_rgba(0,0,0,0.38)] lg:px-8">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{
                background: ACCENT_SOFT,
                color: ACCENT,
                border: "1px solid rgba(240, 185, 11, 0.2)",
              }}
            >
              <Sparkles size={13} />
              History
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-[-0.05em] text-white md:text-5xl">
              Trading activity ledger
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
              Review settled outcomes, pending positions, and turnover with the
              same visual system used across the rest of the app.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
              Page {page + 1}
            </div>
            <button
              type="button"
              onClick={() => fetchHistory(page)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={14} className={cn(loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Activity}
          label="Orders"
          value={stats.total.toString()}
          sub="Rows on this page"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Settled"
          value={stats.settled.toString()}
          sub="Resolved outcomes"
        />
        <SummaryCard
          icon={Target}
          label="Win Rate"
          value={stats.winRate}
          sub="Settled positions only"
        />
        <SummaryCard
          icon={Clock3}
          label="Pending"
          value={stats.pending.toString()}
          sub={`Volume ${stats.volume}`}
        />
      </section>

      <section
        className="relative overflow-hidden rounded-[28px]"
        style={{
          background:
            "linear-gradient(180deg, rgba(14,14,14,0.98) 0%, rgba(9,9,9,0.98) 100%)",
          border: `1px solid ${BORDER}`,
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div
          className="absolute right-6 top-6 h-28 w-28 rounded-full blur-3xl"
          style={{ background: "rgba(240, 185, 11, 0.12)" }}
        />

        <div className="relative z-10 flex items-center justify-between border-b border-white/8 px-6 py-5 lg:px-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
              Timeline
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-white">
              Order-by-order history
            </h2>
          </div>
          <div className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
            {loading ? "Loading" : `${orders.length} visible`}
          </div>
        </div>

        <div className="relative z-10 overflow-auto">
          <table className="min-w-[760px] w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                {[
                  "Settled Date",
                  "Market",
                  "Reward Rate",
                  "Amount",
                  "Status",
                ].map((label) => (
                  <th
                    key={label}
                    className="sticky top-0 z-10 bg-[#0d0d0d] px-6 py-4"
                    style={{ borderBottom: `1px solid ${BORDER}` }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 text-white/60">
                      <Loader2
                        className="h-8 w-8 animate-spin"
                        style={{ color: ACCENT }}
                      />
                      <p className="text-sm uppercase tracking-[0.18em]">
                        Loading order history
                      </p>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="mx-auto max-w-md rounded-[24px] border border-white/8 bg-white/[0.03] px-6 py-8">
                      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/45">
                        No activity yet
                      </p>
                      <p className="mt-3 text-base text-white/65">
                        No order history found for this wallet session.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order, index) => {
                  const statusVariant =
                    order.settledWin === true
                      ? {
                          label: "Win",
                          background: "rgba(46, 189, 133, 0.12)",
                          color: "#2EBD85",
                        }
                      : order.settledWin === false
                        ? {
                            label: "Lose",
                            background: "rgba(246, 70, 93, 0.12)",
                            color: "#F6465D",
                          }
                        : {
                            label: order.status || "Pending",
                            background: "rgba(255,255,255,0.06)",
                            color: "rgba(255,255,255,0.72)",
                          };

                  return (
                    <tr
                      key={`${order.marketId ?? "market"}-${order.createdAt ?? index}`}
                      className="transition hover:bg-white/[0.025]"
                    >
                      <td className="border-b border-white/6 px-6 py-5 text-sm text-white/68">
                        {formatDate(order.settledAt || order.createdAt)}
                      </td>
                      <td className="border-b border-white/6 px-6 py-5 text-sm font-semibold text-white">
                        {order.marketId || "BTCUSDT"}
                      </td>
                      <td className="border-b border-white/6 px-6 py-5 text-sm font-mono text-white/82">
                        {order.rewardRate
                          ? `${Number(order.rewardRate).toFixed(3)}x`
                          : "-"}
                      </td>
                      <td className="border-b border-white/6 px-6 py-5 text-sm font-semibold text-[#f7c948]">
                        {formatMoney(order.amount)}
                      </td>
                      <td className="border-b border-white/6 px-6 py-5">
                        <span
                          className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                          style={{
                            background: statusVariant.background,
                            color: statusVariant.color,
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          {statusVariant.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 px-6 py-5 lg:px-7">
          <button
            type="button"
            disabled={page === 0 || loading}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={14} />
            Previous
          </button>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Showing up to {PAGE_SIZE} rows per page
          </p>
          <button
            type="button"
            disabled={!hasNextPage || loading}
            onClick={() => setPage((value) => value + 1)}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background:
                "linear-gradient(135deg, rgba(240,185,11,1) 0%, rgba(255,205,52,1) 100%)",
              boxShadow: "0 18px 40px rgba(240, 185, 11, 0.18)",
            }}
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      </section>
    </div>
  );
};
