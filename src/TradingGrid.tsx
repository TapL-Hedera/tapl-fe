import React, { useEffect, useRef, useState } from "react";
import { useGameStore, type CellData } from "./store";
import { format } from "date-fns";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import CryptoJS from "crypto-js";
import { useAccount } from "wagmi";
import toast from "react-hot-toast";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export const TradingGrid: React.FC = () => {
  const cells = useGameStore((state) => state.cells);
  const history = useGameStore((state) => state.history);
  const basePrice = useGameStore((state) => state.basePrice);
  const currentPrice = useGameStore((state) => state.currentPrice);
  const modePriceStep = useGameStore((state) => state.modePriceStep);
  const modeIntervalSeconds = useGameStore(
    (state) => state.modeIntervalSeconds,
  );
  const placeBet = useGameStore((state) => state.placeBet);
  const bets = useGameStore((state) => state.bets);
  const pendingBets = useGameStore((state) => state.pendingBets);
  const socket = useGameStore((state) => state.socket);
  const wssKey = useGameStore((state) => state.wssKey);
  const betAmount = useGameStore((state) => state.betAmount);
  const balance = useGameStore((state) => state.balance);

  const { address: realAddress } = useAccount();
  const isDemoMode = useGameStore((state) => state.isDemoMode);
  const demoAddress = useGameStore((state) => state.demoAddress);
  const address = isDemoMode ? demoAddress : realAddress;

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [now, setNow] = useState(() => Date.now());
  const [cameraPrice, setCameraPrice] = useState(currentPrice);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  const [isSmallScreen, setIsSmallScreen] = useState(
    () => window.innerWidth < 1280,
  );

  // Animation loop for perfect smooth scrolling
  useEffect(() => {
    let frameId: number;
    let lastRenderTime = 0;

    // Use a mutable variable for smooth interpolation to avoid dependencies and stale state
    let currentCameraPrice = useGameStore.getState().currentPrice;

    const loop = () => {
      const n = Date.now();
      const target = useGameStore.getState().currentPrice;

      if (currentCameraPrice === 0 && target !== 0) {
        currentCameraPrice = target;
      } else {
        currentCameraPrice += (target - currentCameraPrice) * 0.06; // Smooth camera tracking
      }

      // Throttle React renders to ~30fps to reduce CPU load and avoid memory leaks from excessive rerenders
      if (n - lastRenderTime > 33) {
        setNow(n);
        setCameraPrice(currentCameraPrice);
        lastRenderTime = n;
      }

      frameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frameId);
  }, []);

  const handlePlaceBet = (cell: CellData, canBet: boolean) => {
    try {
      if (canBet) {
        if (!localStorage.getItem("token")) {
          toast.error("Please connect wallet and login to place bet");
          return;
        }
        if (!betAmount || betAmount <= 0) {
          toast.error("Invalid bet amount");
          return;
        }

        if (betAmount > balance) {
          toast.error("Insufficient balance!", {
            style: {
              background: "#252422",
              color: "#d57455",
              border: "1px solid rgba(213, 116, 85, 0.5)",
            },
          });
          return;
        }

        if (socket && wssKey) {
          const amountStr = betAmount.toString();
          const cellOrigin = cell.original;
          const cellId = `${cellOrigin.startTs}:${cellOrigin.endTs}:${cellOrigin.lowerPrice}:${cellOrigin.upperPrice}`;
          const message = `${cellOrigin.gridTs}:${cellId}:${amountStr}`;

          const hmac = CryptoJS.algo.HMAC.create(
            CryptoJS.algo.SHA256,
            CryptoJS.enc.Hex.parse(wssKey),
          );
          hmac.update(message);
          const signature = hmac.finalize().toString(CryptoJS.enc.Hex);

          const payload = {
            userId: address,
            marketId: "BTCUSDT",
            amount: amountStr,
            cell: cellOrigin,
            userSignature: signature,
          };

          console.log("payload: ", payload);
          socket.emit("place_bet", payload);
        }
        placeBet(cell.id, betAmount);
      }
    } catch (error) {
      console.log("handlePlaceBet() error: ", error);
    }
  };

  // Container dimensions + mobile detection
  useEffect(() => {
    if (!containerRef.current) return;

    let frameId: number;
    const updateSize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w > 0 && h > 0) {
        setDimensions((prev) =>
          prev.width !== w || prev.height !== h
            ? { width: w, height: h }
            : prev,
        );
      } else {
        frameId = requestAnimationFrame(updateSize);
      }
      setIsMobile(window.innerWidth < 640);
      setIsSmallScreen(window.innerWidth < 1280);
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => {
      window.removeEventListener("resize", updateSize);
      cancelAnimationFrame(frameId);
    };
  }, [cells.length]);

  if (cells.length === 0) return null;

  // Time & Price Span — current line sits ~36% from left, rest is bettable future
  // Mobile (<640px):  ~10s past history + 25s future (5 cols)
  // Tablet (<1280px): ~15s past history + 35s future (7 cols to exact match backend data)
  // Desktop:          ~20s past history + 35s future (7 cols to exact match backend data)
  const pastSpanMs = isMobile ? 10000 : isSmallScreen ? 15000 : 20000;
  const futureSpanMs = isMobile ? 25000 : 35000;
  const timeSpanMs = pastSpanMs + futureSpanMs;

  const firstTime = now - pastSpanMs;
  const lastTime = now + futureSpanMs;

  const priceSpan = 9; // 9 rows (-4 to 4) matches backend data
  const maxPrice = cameraPrice + 4.5 * modePriceStep;
  const minPrice = cameraPrice - 4.5 * modePriceStep;
  const totalPriceSpan = maxPrice - minPrice;

  // Horizontal price levels
  const priceLevels: number[] = [];
  const startLevelIdx = Math.floor((minPrice - basePrice) / modePriceStep) - 1;
  const endLevelIdx = Math.ceil((maxPrice - basePrice) / modePriceStep) + 1;
  for (let i = startLevelIdx; i <= endLevelIdx; i++) {
    priceLevels.push(basePrice + i * modePriceStep);
  }

  // Percentage Helpers
  const getTimeX = (t: number) => ((t - firstTime) / timeSpanMs) * 100;
  const getPriceY = (p: number) => ((maxPrice - p) / totalPriceSpan) * 100;

  const rowHeight = 100 / priceSpan;
  const colWidth = ((modeIntervalSeconds * 1000) / timeSpanMs) * 100;

  // SVG Chart Path
  const getSvgPath = () => {
    if (history.length === 0) return "";
    return history
      .map((pt, i) => {
        const x = (getTimeX(pt.time) * dimensions.width) / 100;
        const y = (getPriceY(pt.price) * dimensions.height) / 100;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  const lPt =
    history.length > 0
      ? {
          x:
            (getTimeX(history[history.length - 1].time) * dimensions.width) /
            100,
          y:
            (getPriceY(history[history.length - 1].price) * dimensions.height) /
            100,
        }
      : null;

  // Time labels interval
  const timeLabels = [];
  const labelInterval = 15000; // every 15s
  let tLabel = Math.floor(firstTime / labelInterval) * labelInterval;
  while (tLabel <= lastTime + labelInterval) {
    if (tLabel >= firstTime && tLabel <= lastTime) timeLabels.push(tLabel);
    tLabel += labelInterval;
  }

  return (
    <div className="flex-1 flex flex-col p-2 sm:p-3 lg:p-4 relative overflow-hidden font-mono">
      {/* Dynamic Price Y-Axis (Right side) */}
      <div className="absolute right-0 top-2 sm:top-3 bottom-10 sm:bottom-14 w-10 sm:w-14 pointer-events-none z-10">
        {priceLevels.map((p) => {
          const top = getPriceY(p);
          if (top < -10 || top > 110) return null;
          return (
            <div
              key={`y_${p}`}
              className="absolute w-full text-[8px] sm:text-[9px] pointer-events-none font-bold"
              style={{
                top: `${top}%`,
                right: 0,
                transform: "translateY(-50%)",
                color: "#848E9C",
              }}
            >
              <span
                className="absolute right-1"
                style={{ top: "50%", transform: "translateY(-50%)" }}
              >
                ${p.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>

      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden mr-10 sm:mr-14"
        style={{
          background: "#0B0E11",
          border: "1px solid #2B3139",
          borderRadius: "4px",
        }}
      >
        {/* Horizontal Grid lines */}
        {priceLevels.map((p) => {
          const lineTop = getPriceY(p);
          if (lineTop < -10 || lineTop > 110) return null;
          return (
            <div
              key={`hx_${p}`}
              className="absolute w-full h-px"
              style={{ top: `${lineTop}%`, background: "#2B3139" }}
            />
          );
        })}

        {/* Vertical Grid lines (15s intervals) */}
        {timeLabels.map((t) => (
          <div
            key={`vx_${t}`}
            className="absolute top-0 bottom-0 w-px"
            style={{
              left: `${getTimeX(t)}%`,
              background: "#2B3139",
            }}
          />
        ))}

        {/* Current Time Indicator Line */}
        <div
          className="absolute top-0 bottom-0 w-px z-20"
          style={{
            left: `${getTimeX(now)}%`,
            background: "rgba(55,91,210,0.4)",
          }}
        />

        {/* Main Grid Cells */}
        {(() => {
          return cells.map((cell) => {
            // Optimization: skip rendering cells fully out of viewport
            if (
              cell.timeWindowEnd < firstTime ||
              cell.timeWindowStart > lastTime
            )
              return null;

            const isPast = now >= cell.timeWindowEnd;
            const isHit = cell.status === "hit";
            const betAmountVal = bets[cell.id] || 0;
            const pendingBetAmountVal = pendingBets[cell.id] || 0;
            const hasBet = betAmountVal > 0;
            const isPending = pendingBetAmountVal > 0;
            const hasAnyBet = hasBet || isPending;
            const displayBetAmount = hasBet
              ? betAmountVal
              : pendingBetAmountVal;

            // Khi chart chạm đến cột (tiến vào thời gian của cell) -> Ẩn toàn bộ ô không cược
            if (now >= cell.timeWindowStart && !hasAnyBet) return null;

            // Sau khi chart đi qua cell (quá khứ) -> Ẩn tiếp ô đã cược nếu như không trúng (fail)
            if (isPast && !isHit) return null;

            const left = getTimeX(cell.timeWindowStart);
            const top = getPriceY(cell.priceLevel + modePriceStep / 2);
            const isFuture = cell.timeWindowStart > now;

            const intervalMs = modeIntervalSeconds * 1000;
            const isNext = isFuture && cell.timeWindowStart - now <= intervalMs;
            const canBet = isFuture && !isNext && !hasAnyBet;

            return (
              <div
                key={cell.id}
                className={cn(
                  "absolute border-t border-l flex flex-col items-center justify-center text-[10px] transition duration-300",
                  canBet && !hasAnyBet && "hover:bg-white/5 cursor-pointer",
                  isNext &&
                    !hasAnyBet &&
                    "opacity-30 cursor-not-allowed animate-pulse",
                  !isPast && hasBet && "cursor-pointer z-10",
                  !isPast && isPending && "cursor-pointer z-10 animate-pulse",
                  isHit && hasAnyBet && "z-20",
                )}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${colWidth}%`,
                  height: `${rowHeight}%`,
                  borderColor: "#2B3139",
                  background:
                    !isPast && hasBet
                      ? "rgba(55,91,210,0.08)"
                      : isHit && hasAnyBet
                        ? "rgba(46,189,133,0.15)"
                        : isNext && !hasAnyBet
                          ? "rgba(246,70,93,0.06)"
                          : undefined,
                  boxShadow:
                    !isPast && hasBet
                      ? "inset 0 0 16px rgba(55,91,210,0.1)"
                      : isHit && hasAnyBet
                        ? "0 0 20px rgba(46,189,133,0.3), inset 0 0 20px rgba(46,189,133,0.15)"
                        : undefined,
                  outline:
                    !isPast && hasBet
                      ? "1px solid rgba(55,91,210,0.3)"
                      : isHit && hasAnyBet
                        ? "1px solid #2EBD85"
                        : undefined,
                }}
                onClick={() => handlePlaceBet(cell, canBet)}
              >
                <div
                  className={cn(
                    "transition-all duration-300 text-[9px] sm:text-[10px] font-mono",
                    cell.multiplier >= 100
                      ? "font-bold"
                      : cell.multiplier >= 10
                        ? "font-semibold"
                        : "",
                  )}
                  style={{
                    color:
                      hasAnyBet && !isHit
                        ? "#375BD2"
                        : isHit && hasAnyBet
                          ? "#2EBD85"
                          : isNext && !hasAnyBet
                            ? "#F6465D"
                            : cell.multiplier >= 100
                              ? "#F6465D"
                              : cell.multiplier >= 10
                                ? "#375BD2"
                                : "#848E9C",
                    textShadow:
                      isHit && hasAnyBet
                        ? "0 0 8px rgba(46,189,133,1)"
                        : hasAnyBet
                          ? "0 0 5px rgba(55,91,210,0.8)"
                          : undefined,
                    transform: hasAnyBet || isHit ? "scale(1.1)" : undefined,
                  }}
                >
                  {hasAnyBet
                    ? cell.multiplier.toFixed(2)
                    : Number(cell.original.rewardRate).toFixed(2)}
                  x
                </div>
                {hasAnyBet && (
                  <div
                    className={cn(
                      "text-[9px] sm:text-[10px] mt-0.5 sm:mt-1 font-bold px-1.5 sm:px-2 py-0.5 shadow-md",
                      isHit
                        ? "animate-bounce"
                        : isPending && !isHit
                          ? "opacity-80 animate-pulse"
                          : "",
                    )}
                    style={{
                      borderRadius: "4px",
                      background: isHit ? "#2EBD85" : "#375BD2",
                      color: "#1E2329",
                      boxShadow: isHit
                        ? "0 0 10px #2EBD85"
                        : "0 0 8px rgba(55,91,210,0.5)",
                    }}
                  >
                    ${displayBetAmount}
                  </div>
                )}
              </div>
            );
          });
        })()}

        {/* SVG UI elements inside container bounds */}
        {history.length > 0 && dimensions.width > 0 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
            <defs>
              <linearGradient id="fadeLeft" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0B0E11" stopOpacity="1" />
                <stop offset="12%" stopColor="#0B0E11" stopOpacity="0" />
              </linearGradient>
            </defs>

            <path
              d={getSvgPath()}
              fill="none"
              stroke="#2EBD85"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* End Point Glow */}
            {lPt && (
              <circle
                cx={lPt.x}
                cy={lPt.y}
                r="3.5"
                fill="#2EBD85"
                className="animate-pulse"
              />
            )}

            {/* Fade Out Edge on Left */}
            <rect x="0" y="0" width="12%" height="100%" fill="url(#fadeLeft)" />
          </svg>
        )}
      </div>

      {/* Dynamic Time X-Axis (Bottom) */}
      <div
        className="absolute bottom-1 sm:bottom-4 left-2 sm:left-4 right-12 sm:right-16 h-5 sm:h-6 flex mt-2 text-[7px] sm:text-[9px] overflow-hidden font-bold"
        style={{ color: "#848E9C" }}
      >
        {timeLabels.map((t) => (
          <div
            key={`tx_${t}`}
            className="absolute flex justify-center -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${getTimeX(t)}%` }}
          >
            <span style={{ background: "#0B0E11", padding: "0 4px" }}>
              {isMobile
                ? format(new Date(t), "HH:mm:ss")
                : format(new Date(t), "HH:mm:ss a")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
