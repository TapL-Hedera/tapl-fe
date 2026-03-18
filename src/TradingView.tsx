import React, { useEffect, useState } from "react";
import { TradingGrid } from "./TradingGrid";
import { useGameStore } from "./store";
import { useAccount } from "wagmi";
import { useOrderControllerGetUserOrders } from "./services/queries";
import { HowItWorksModal } from "./HowItWorksModal";

const formatUsd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const generateRandomAddress = () => {
  let address = "0x";
  for (let i = 0; i < 40; i++) {
    address += Math.floor(Math.random() * 16).toString(16);
  }
  return address;
};

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const truncateAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

export const TradingView: React.FC = () => {
  const ensureCells = useGameStore((state) => state.ensureCells);
  const tickTime = useGameStore((state) => state.tickTime);
  const setOpenBets = useGameStore((state) => state.setOpenBets);
  const currentPrice = useGameStore((state) => state.currentPrice);
  const balance = useGameStore((state) => state.balance);
  const betAmount = useGameStore((state) => state.betAmount);
  const setBetAmount = useGameStore((state) => state.setBetAmount);
  const { address } = useAccount();
  const [feedNotification, setFeedNotification] = useState<{
    id: number;
    user: string;
    amount: string;
  } | null>(null);

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
    // Generate initial grid and start simulation
    ensureCells();

    // Mock grid tick every 1000ms
    const tickInterval = setInterval(() => {
      tickTime();
    }, 1000);

    return () => {
      clearInterval(tickInterval);
    };
  }, [ensureCells, tickTime]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let isUnmounted = false;

    const pushFakeWinNotification = () => {
      if (isUnmounted) return;

      const user = generateRandomAddress();
      const amount = (Math.random() * 500 + 10).toFixed(2); // random amount between 10 and 510

      setFeedNotification({
        id: Date.now(),
        user,
        amount,
      });

      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (!isUnmounted) setFeedNotification(null);
      }, 4500);

      timer = setTimeout(pushFakeWinNotification, randomInt(2000, 13000));
    };

    timer = setTimeout(pushFakeWinNotification, randomInt(2000, 13000));

    return () => {
      isUnmounted = true;
      if (timer) clearTimeout(timer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden p-2 sm:p-4 md:p-6">
      <HowItWorksModal />
      <div
        className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full pointer-events-none opacity-40"
        style={{
          background:
            "radial-gradient(circle, rgba(240, 185, 11,0.08) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(240, 185, 11,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-4">
        <div className="grid gap-2.5 xl:grid-cols-[0.92fr_0.92fr_1.16fr]">
          <div className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,#111111_0%,#0c0c0c_100%)] px-4 py-3 shadow-[0_14px_34px_rgba(0,0,0,0.22)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/34">
              BTC price
            </p>
            <div className="mt-2.5 flex items-end justify-between gap-3">
              <div>
                <p className="text-[1.95rem] font-bold tracking-[-0.07em] text-white sm:text-[2.1rem]">
                  ${formatUsd(currentPrice)}
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/26">
                  BTC/USD
                </p>
              </div>
              <span className="inline-flex h-7 items-center rounded-full border border-[#f0b90b]/18 bg-[#f0b90b]/10 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f0b90b]">
                Live
              </span>
            </div>
          </div>

          <div className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,#111111_0%,#0c0c0c_100%)] px-4 py-3 shadow-[0_14px_34px_rgba(0,0,0,0.22)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/34">
              Balance
            </p>
            <div className="mt-2.5 flex items-end justify-between gap-3">
              <div>
                <p className="text-[1.95rem] font-bold tracking-[-0.07em] text-white sm:text-[2.1rem]">
                  ${formatUsd(Number(balance))}
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/26">
                  Available funds
                </p>
              </div>
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/32">
                Trader wallet
              </span>
            </div>
          </div>

          <div className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,#111111_0%,#0c0c0c_100%)] px-4 py-3 shadow-[0_14px_34px_rgba(0,0,0,0.22)]">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/34">
                  Bet value
                </p>
                <p className="mt-2 text-[1.7rem] font-bold tracking-[-0.07em] text-white sm:text-[1.85rem]">
                  ${betAmount}
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/26">
                  Per position
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[10, 25, 50, 100].map((value) => {
                  const active = betAmount === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setBetAmount(value)}
                      className="inline-flex h-9 min-w-[60px] items-center justify-center rounded-full px-3.5 text-[1rem] font-semibold tracking-[-0.04em] transition"
                      style={{
                        background: active
                          ? "linear-gradient(135deg, #f0b90b 0%, #ffcf4c 100%)"
                          : "rgba(255,255,255,0.04)",
                        color: active ? "#050505" : "rgba(255,255,255,0.74)",
                        border: active
                          ? "1px solid rgba(240, 185, 11, 0.24)"
                          : "1px solid rgba(255,255,255,0.08)",
                        boxShadow: active
                          ? "0 10px 20px rgba(240, 185, 11, 0.14)"
                          : "none",
                      }}
                    >
                      ${value}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex flex-1 flex-col overflow-hidden rounded-[28px] border border-white/8 bg-[#090909] shadow-[0_28px_90px_rgba(0,0,0,0.34)]">
          {feedNotification ? (
            <div className="pointer-events-none absolute left-3 top-3 z-30 sm:left-4 sm:top-4">
              <div
                key={feedNotification.id}
                className="wallet-win-toast ml-3 mt-3 w-fit rounded-lg border px-2.5 py-1.5 backdrop-blur-md sm:px-3 sm:py-2"
                style={{
                  background: "rgba(11, 16, 28, 0.8)",
                  borderColor: "rgba(240, 185, 11, 0.42)",
                  boxShadow:
                    "0 4px 12px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(240, 185, 11, 0.12)",
                }}
              >
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded border border-bn-yellow/35 bg-bn-yellow/18 text-[12px] leading-none shadow-[0_0_10px_rgba(240,185,11,0.24)] sm:h-7 sm:w-7 sm:text-[14px]">
                    🚀
                  </div>

                  <span className="text-[13px] font-medium leading-none text-white/90 sm:text-[14px]">
                    {truncateAddress(feedNotification.user)}
                  </span>

                  <span className="rounded bg-bn-yellow/18 px-1.5 py-0.5 text-[10px] font-bold leading-none text-bn-yellow sm:text-[11px]">
                    WIN
                  </span>

                  <span className="text-[13px] font-bold leading-none text-bn-green sm:text-[14px]">
                    +${feedNotification.amount}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
          <TradingGrid />
        </div>
      </div>
    </div>
  );
};
