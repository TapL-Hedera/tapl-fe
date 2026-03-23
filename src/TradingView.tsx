import React, { useEffect } from "react";
import { useAccount } from "wagmi";
import { CircleDollarSign, Droplets, Gauge } from "lucide-react";
import { TradingGrid } from "./TradingGrid";
import { useGameStore } from "./store";
import { useOrderControllerGetUserOrders } from "./services/queries";
import { HowItWorksModal } from "./HowItWorksModal";

const ACCENT = "#2D84EB";
const SECONDARY = "#4F46E5";
const DEEP = "#00156E";
const ACCENT_SOFT = "rgba(45, 132, 235, 0.14)";
const BORDER = "rgba(255, 255, 255, 0.11)";
const PANEL_BG =
  "linear-gradient(148deg, rgba(17, 20, 24, 0.94) 0%, rgba(10, 12, 15, 0.98) 100%)";
const TILE_BG =
  "linear-gradient(148deg, rgba(15, 18, 23, 0.94) 0%, rgba(9, 11, 14, 0.99) 100%)";

const formatUsd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export const TradingView: React.FC = () => {
  const ensureCells = useGameStore((state) => state.ensureCells);
  const tickTime = useGameStore((state) => state.tickTime);
  const setOpenBets = useGameStore((state) => state.setOpenBets);
  const currentPrice = useGameStore((state) => state.currentPrice);
  const balance = useGameStore((state) => state.balance);
  const betAmount = useGameStore((state) => state.betAmount);
  const setBetAmount = useGameStore((state) => state.setBetAmount);
  const { address } = useAccount();

  const { data: openOrdersData } = useOrderControllerGetUserOrders(
    {
      limit: 100,
      offset: 0,
    },
    {
      query: {
        enabled: !!address,
        queryKey: ["open-orders", address],
      },
    },
  );

  useEffect(() => {
    if (openOrdersData && Array.isArray(openOrdersData)) {
      setOpenBets(openOrdersData);
    }
  }, [openOrdersData, setOpenBets]);

  useEffect(() => {
    ensureCells();

    const tickInterval = setInterval(() => {
      tickTime();
    }, 1000);

    return () => {
      clearInterval(tickInterval);
    };
  }, [ensureCells, tickTime]);

  return (
    <div className="relative mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-4 px-3 py-4 sm:px-5 lg:px-8 lg:py-6">
      <HowItWorksModal />

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
              Trading Desk
            </h1>
            <p className="text-xs text-white/45">
              Live BTC grid execution and position sizing controls
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/55">
          <span
            className="rounded-md border px-2.5 py-1.5"
            style={{
              borderColor: BORDER,
              background: "rgba(45,132,235,0.16)",
              color: "#b7d7ff",
            }}
          >
            Live
          </span>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                "linear-gradient(90deg, transparent 0%, rgba(45,132,235,0.36) 50%, transparent 100%)",
            }}
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
            BTC Price
          </p>
          <p className="mt-2 text-[1.65rem] font-bold tracking-[-0.04em] text-white">
            ${formatUsd(currentPrice)}
          </p>
        </div>

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
                "linear-gradient(90deg, transparent 0%, rgba(45,132,235,0.36) 50%, transparent 100%)",
            }}
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
            Balance
          </p>
          <p className="mt-2 text-[1.65rem] font-bold tracking-[-0.04em] text-white">
            ${formatUsd(Number(balance))}
          </p>
          <p className="mt-1.5 text-xs text-white/55">Available funds</p>
        </div>

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
                "linear-gradient(90deg, transparent 0%, rgba(45,132,235,0.36) 50%, transparent 100%)",
            }}
          />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
                Bet Value
              </p>
              <p className="mt-2 text-[1.65rem] font-bold tracking-[-0.04em] text-white">
                ${betAmount}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-white/55">
              <Gauge size={12} />
              Per position
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[10, 25, 50, 100].map((value) => {
              const active = betAmount === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBetAmount(value)}
                  className="inline-flex h-9 min-w-[58px] items-center justify-center rounded-lg px-3 text-sm font-semibold transition"
                  style={{
                    background: active
                      ? `linear-gradient(135deg, ${ACCENT} 0%, ${SECONDARY} 58%, ${DEEP} 100%)`
                      : "rgba(255,255,255,0.04)",
                    color: active ? "#ffffff" : "rgba(255,255,255,0.74)",
                    border: active
                      ? "1px solid rgba(45,132,235,0.34)"
                      : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: active
                      ? "0 10px 20px rgba(45,132,235,0.24)"
                      : "none",
                  }}
                >
                  ${value}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl min-h-[540px] md:min-h-[620px]"
        style={{
          background: PANEL_BG,
          border: `1px solid ${BORDER}`,
          boxShadow: "0 20px 44px rgba(2, 6, 23, 0.42)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/46">
            Trading Grid
          </p>
          <p className="inline-flex items-center gap-1.5 text-xs text-white/55">
            <CircleDollarSign size={13} style={{ color: ACCENT }} />
            Real-time market tape
          </p>
        </div>

        <div className="min-h-0 flex flex-1">
          <TradingGrid />
        </div>
      </section>
    </div>
  );
};
