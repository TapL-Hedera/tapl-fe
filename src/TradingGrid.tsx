import React, { useEffect, useRef, useState } from "react";
import { useGameStore, type CellData } from "./store";
import { format } from "date-fns";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import confetti from "canvas-confetti";
import CryptoJS from "crypto-js";
import { useAccount } from "wagmi";
import toast from "react-hot-toast";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const THUNDER_DURATION_MS = 1800;
const RENDER_INTERVAL_MS = 24;
const ACCENT = "#2D84EB";
const SECONDARY = "#4F46E5";
const DIM_TEXT = "#d0d0d0";
const CONFETTI_COLORS = ["#2ebd85", ACCENT, SECONDARY, "#ffffff"];

function fireWinConfetti(
  winCount: number,
  origin: { x: number; y: number } = { x: 0.5, y: 0.35 },
) {
  const burstScale = Math.min(Math.max(winCount, 1), 6);
  const particleCount = 90 + burstScale * 18;

  confetti({
    particleCount,
    spread: 80,
    startVelocity: 42,
    scalar: 0.7,
    ticks: 70,
    zIndex: 10000,
    colors: CONFETTI_COLORS,
    origin,
  });
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
  const pendingWins = useGameStore((state) => state.pendingWins);
  const socket = useGameStore((state) => state.socket);
  const wssKey = useGameStore((state) => state.wssKey);
  const betAmount = useGameStore((state) => state.betAmount);
  const balance = useGameStore((state) => state.balance);

  const { address } = useAccount();

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [now, setNow] = useState(() => Date.now());
  const [cameraPrice, setCameraPrice] = useState(currentPrice);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  const [isSmallScreen, setIsSmallScreen] = useState(
    () => window.innerWidth < 1280,
  );
  const [thunderCells, setThunderCells] = useState<Record<string, boolean>>({});

  const cellElementsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const triggeredWinsRef = useRef<Set<string>>(new Set());
  const thunderTimeoutsRef = useRef<Record<string, number>>({});
  const lastConfettiAtRef = useRef(0);

  useEffect(() => {
    const thunderImage = new Image();
    thunderImage.src = "/thunder.gif";
  }, []);

  useEffect(
    () => () => {
      Object.values(thunderTimeoutsRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    },
    [],
  );

  useEffect(() => {
    const newWinIds: string[] = [];

    cells.forEach((cell) => {
      const isHit = cell.status === "hit";
      const hasBet =
        (bets[cell.id] || 0) > 0 || (pendingBets[cell.id] || 0) > 0;
      if (isHit && hasBet && !triggeredWinsRef.current.has(cell.id)) {
        triggeredWinsRef.current.add(cell.id);
        newWinIds.push(cell.id);
      }
    });

    if (newWinIds.length === 0) return;

    window.requestAnimationFrame(() => {
      setThunderCells((prev) => {
        const next = { ...prev };
        newWinIds.forEach((cellId) => {
          next[cellId] = true;
        });
        return next;
      });
    });

    newWinIds.forEach((cellId) => {
      if (thunderTimeoutsRef.current[cellId]) {
        window.clearTimeout(thunderTimeoutsRef.current[cellId]);
      }
      thunderTimeoutsRef.current[cellId] = window.setTimeout(() => {
        setThunderCells((prev) => {
          if (!prev[cellId]) return prev;
          const next = { ...prev };
          delete next[cellId];
          return next;
        });
        delete thunderTimeoutsRef.current[cellId];
      }, THUNDER_DURATION_MS);
    });

    const nowTs = performance.now();
    if (nowTs - lastConfettiAtRef.current > 300) {
      lastConfettiAtRef.current = nowTs;
      window.requestAnimationFrame(() => {
        const winRects = newWinIds
          .map((cellId) => cellElementsRef.current[cellId]?.getBoundingClientRect())
          .filter(
            (rect): rect is DOMRect =>
              rect !== undefined && rect.width > 0 && rect.height > 0,
          );

        if (winRects.length === 0) {
          fireWinConfetti(newWinIds.length);
          return;
        }

        const avgCenterX =
          winRects.reduce((sum, rect) => sum + rect.left + rect.width / 2, 0) /
          winRects.length;
        const avgCenterY =
          winRects.reduce((sum, rect) => sum + rect.top + rect.height / 2, 0) /
          winRects.length;

        fireWinConfetti(newWinIds.length, {
          x: Math.min(0.98, Math.max(0.02, avgCenterX / window.innerWidth)),
          y: Math.min(0.9, Math.max(0.08, avgCenterY / window.innerHeight)),
        });
      });
    }
  }, [cells, bets, pendingBets]);

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
        currentCameraPrice += (target - currentCameraPrice) * 0.1; // Smooth camera tracking, snappier follow
      }

      // Keep interpolation on every frame, but commit React updates at a lower cadence.
      if (n - lastRenderTime > RENDER_INTERVAL_MS) {
        const state = useGameStore.getState();
        const serverSyncTime = n + state.serverTimeOffset;
        setNow(serverSyncTime);
        setCameraPrice(currentCameraPrice);
        lastRenderTime = n;

        // Check if chart hit grid for remote wins
        if (Object.keys(state.pendingWins).length > 0) {
          state.checkWinEffects(serverSyncTime);
        }
      }

      frameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frameId);
  }, []);

  const handlePlaceBet = (cell: CellData, canBet: boolean) => {
    try {
      if (cell.timeWindowStart > now && cell.timeWindowStart - now <= 5000) {
        const hasBet = bets[cell.id] || pendingBets[cell.id];
        if (!hasBet) {
          toast("Cell closing soon. Select another!", {
            icon: "⏳",
            style: {
              background: "rgba(18, 20, 30, 0.95)",
              color: "#f6465d",
              border: "1px solid rgba(246, 70, 93, 0.5)",
              boxShadow:
                "0 4px 20px rgba(246, 70, 93, 0.25), inset 0 0 10px rgba(246, 70, 93, 0.1)",
              backdropFilter: "blur(8px)",
              fontWeight: "bold",
              fontSize: "13px",
              padding: "12px 16px",
              borderRadius: "8px",
              letterSpacing: "0.02em",
            },
          });
          return;
        }
      }
      if (canBet) {
        if (!localStorage.getItem("token")) {
          toast("Connect wallet & login to trade!", {
            icon: "🔐",
            style: {
              background: "rgba(18, 20, 30, 0.95)",
              color: "#ffffff",
              border: "1px solid rgba(45, 132, 235, 0.4)",
              boxShadow:
                "0 4px 20px rgba(45, 132, 235, 0.18), inset 0 0 10px rgba(45, 132, 235, 0.08)",
              backdropFilter: "blur(8px)",
              fontWeight: "bold",
              fontSize: "13px",
              padding: "12px 16px",
              borderRadius: "8px",
              letterSpacing: "0.02em",
            },
          });
          return;
        }
        if (!betAmount || betAmount <= 0) {
          toast("Invalid bet amount!", {
            icon: "⚠️",
            style: {
              background: "rgba(18, 20, 30, 0.95)",
              color: "#9acbff",
              border: "1px solid rgba(45, 132, 235, 0.5)",
              boxShadow:
                "0 4px 20px rgba(45, 132, 235, 0.24), inset 0 0 10px rgba(45, 132, 235, 0.12)",
              backdropFilter: "blur(8px)",
              fontWeight: "bold",
              fontSize: "13px",
              padding: "12px 16px",
              borderRadius: "8px",
              letterSpacing: "0.02em",
            },
          });
          return;
        }

        if (betAmount > balance) {
          toast("Insufficient balance!", {
            icon: "💸",
            style: {
              background: "rgba(18, 20, 30, 0.95)",
              color: "#f6465d",
              border: "1px solid rgba(246, 70, 93, 0.5)",
              boxShadow:
                "0 4px 20px rgba(246, 70, 93, 0.25), inset 0 0 10px rgba(246, 70, 93, 0.1)",
              backdropFilter: "blur(8px)",
              fontWeight: "bold",
              fontSize: "13px",
              padding: "12px 16px",
              borderRadius: "8px",
              letterSpacing: "0.02em",
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
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden p-2 font-mono sm:p-3 lg:p-4">
      {/* Dynamic Price Y-Axis (Right side) */}
      <div className="absolute right-0 top-2 sm:top-3 lg:top-4 bottom-2 sm:bottom-3 lg:bottom-4 w-10 sm:w-14 pointer-events-none z-10">
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
                color: DIM_TEXT,
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
          background: "#060910",
          border: "1px solid rgba(255, 255, 255, 0.08)",
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
              style={{
                top: `${lineTop}%`,
                background: "rgba(255, 255, 255, 0.05)",
              }}
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
              background: "rgba(255, 255, 255, 0.05)",
            }}
          />
        ))}

        {/* Current Time Indicator Line */}
        <div
          className="absolute top-0 bottom-0 w-px z-20"
          style={{
            left: `${getTimeX(now)}%`,
            background: "rgba(45, 132, 235, 0.38)",
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
            const isSelected = !isPast && hasAnyBet;
            const hasWon = isHit && hasAnyBet;
            const showThunder = Boolean(thunderCells[cell.id]);
            const showSelectedEffect = isSelected && !hasWon;
            const showWinState = hasWon && !showThunder;

            // Khi chart chạm đến cột (tiến vào thời gian của cell) -> Ẩn toàn bộ ô không cược
            if (now >= cell.timeWindowStart && !hasAnyBet) return null;

            // Sau khi chart đi qua cell (quá khứ) -> Ẩn ô đã cược nếu không trúng VÀ không có pending win
            const hasPendingWin = pendingWins[cell.id] !== undefined;
            if (isPast && !isHit && !hasPendingWin) return null;

            const left = getTimeX(cell.timeWindowStart);
            const top = getPriceY(cell.priceLevel + modePriceStep / 2);
            const isFuture = cell.timeWindowStart > now;

            const intervalMs = 5000;
            const isNext = isFuture && cell.timeWindowStart - now <= intervalMs;
            const canBet = isFuture && !isNext && !hasAnyBet;

            return (
              <div
                key={cell.id}
                ref={(node) => {
                  cellElementsRef.current[cell.id] = node;
                }}
                className={cn(
                  "absolute border-t border-l flex flex-col items-center justify-center text-[10px] transition-[transform,background-color,box-shadow,opacity] duration-200 overflow-hidden isolate",
                  canBet &&
                    !hasAnyBet &&
                    "hover:bg-white/5 hover:scale-[0.985] active:scale-[0.97] cursor-pointer",
                  isNext &&
                    !hasAnyBet &&
                    "opacity-30 cursor-not-allowed animate-pulse",
                  showSelectedEffect &&
                    "cursor-pointer z-10 trading-grid-cell-selected",
                  !isPast && isPending && "animate-pulse",
                  isHit && hasAnyBet && "z-20",
                )}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${colWidth}%`,
                  height: `${rowHeight}%`,
                  borderColor: "rgba(255, 255, 255, 0.05)",
                  background:
                    hasWon
                      ? "rgba(46,189,133,0.35)"
                      : !isPast && hasAnyBet
                        ? "linear-gradient(180deg, rgba(31, 49, 108, 0.35) 0%, rgba(16, 29, 72, 0.5) 100%)"
                        : isNext && !hasAnyBet
                          ? "rgba(246,70,93,0.06)"
                          : undefined,
                  boxShadow:
                    hasWon
                      ? "0 0 20px rgba(46,189,133,0.5), inset 0 0 30px rgba(46,189,133,0.35)"
                      : showSelectedEffect
                        ? "0 0 18px rgba(45, 132, 235, 0.28), inset 0 0 30px rgba(45, 132, 235, 0.2)"
                        : undefined,
                  outline:
                    hasWon
                      ? "1px solid #2EBD85"
                      : showSelectedEffect
                        ? "1px solid #2D84EB"
                        : undefined,
                  ["--selected-cell-stripe-color" as string]:
                    "rgba(129, 140, 248, 0.36)",
                  ["--selected-cell-stripe-soft" as string]:
                    "rgba(79, 70, 229, 0.12)",
                  ["--selected-cell-glow" as string]:
                    "rgba(120, 168, 255, 0.2)",
                  willChange: hasWon || showSelectedEffect ? "transform" : undefined,
                }}
                onClick={() => handlePlaceBet(cell, canBet)}
              >
                {showThunder && (
                  <div className="trading-grid-cell-win-thunder">
                    <img src="/thunder.gif" alt="" aria-hidden="true" />
                  </div>
                )}
                {showSelectedEffect && (
                  <>
                    <div className="trading-grid-cell-selected__sheen" />
                    <div className="trading-grid-cell-selected__stripes" />
                  </>
                )}
                <div
                  className={cn(
                    "relative z-[1] transition-all duration-300 text-[9px] sm:text-[10px] font-mono",
                    cell.multiplier >= 100
                      ? "font-bold"
                      : cell.multiplier >= 10
                        ? "font-semibold"
                        : "",
                  )}
                  style={{
                    color:
                      hasAnyBet && !isHit
                        ? ACCENT
                        : hasWon
                          ? "#2EBD85"
                        : isNext && !hasAnyBet
                            ? "#F6465D"
                            : cell.multiplier >= 100
                              ? "#F6465D"
                              : cell.multiplier >= 10
                                ? SECONDARY
                                : DIM_TEXT,
                    textShadow:
                      hasWon
                        ? "0 0 8px rgba(46,189,133,1)"
                        : hasAnyBet
                          ? "0 0 6px rgba(45, 132, 235, 0.9)"
                          : undefined,
                    transform:
                      hasAnyBet || hasWon ? "scale(1.1)" : undefined,
                  }}
                >
                  {hasAnyBet
                    ? cell.multiplier.toFixed(2)
                    : Number(cell.original.rewardRate).toFixed(2)}
                  x
                </div>
                {hasAnyBet && !isHit && (
                  <div
                    className={cn(
                      "relative z-[1] text-[9px] sm:text-[10px] mt-0.5 sm:mt-1 font-bold px-1.5 sm:px-2 py-0.5 shadow-md",
                      isPending ? "opacity-80 animate-pulse" : "",
                    )}
                    style={{
                      borderRadius: "6px",
                      background:
                        "linear-gradient(135deg, #2D84EB 0%, #4F46E5 58%, #00156E 100%)",
                      color: "#ffffff",
                      boxShadow: "0 0 10px rgba(45, 132, 235, 0.4)",
                    }}
                  >
                    ${displayBetAmount}
                  </div>
                )}
                {showWinState &&
                  (() => {
                    const winPayout =
                      displayBetAmount *
                      (cell.multiplier && !isNaN(cell.multiplier)
                        ? cell.multiplier
                        : 0);
                    return (
                      <div className="relative z-[1] flex flex-col items-center gap-0.5 mt-0.5">
                        <div
                          className="text-[8px] sm:text-[9px] font-black tracking-widest"
                          style={{
                            color: "#2EBD85",
                            textShadow:
                              "0 0 8px #2EBD85, 0 0 16px rgba(46,189,133,0.6)",
                            letterSpacing: "0.15em",
                          }}
                        >
                          WIN!
                        </div>
                        <div
                          className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 shadow-md"
                          style={{
                            borderRadius: "6px",
                            background: "#2EBD85",
                            color: "#ffffff",
                            boxShadow:
                              "0 0 12px #2EBD85, 0 0 24px rgba(46,189,133,0.4)",
                          }}
                        >
                          +$
                          {winPayout > 0
                            ? winPayout.toFixed(2)
                            : displayBetAmount}
                        </div>
                      </div>
                    );
                  })()}
              </div>
            );
          });
        })()}

        {/* SVG UI elements inside container bounds */}
        {history.length > 0 && dimensions.width > 0 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
            <defs>
              <linearGradient id="fadeLeft" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#060910" stopOpacity="1" />
                <stop offset="12%" stopColor="#060910" stopOpacity="0" />
              </linearGradient>
            </defs>

            <path
              d={getSvgPath()}
              fill="none"
              stroke="#2D84EB"
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
                fill="#2D84EB"
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
        style={{ color: DIM_TEXT }}
      >
        {timeLabels.map((t) => (
          <div
            key={`tx_${t}`}
            className="absolute flex justify-center -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${getTimeX(t)}%` }}
          >
            <span style={{ background: "#060910", padding: "0 4px" }}>
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
