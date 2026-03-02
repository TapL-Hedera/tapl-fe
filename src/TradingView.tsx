import React, { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { TradingGrid } from "./TradingGrid";
import { useGameStore } from "./store";
import { useAccount } from "wagmi";
import { useOrderControllerGetUserOrders } from "./services/queries";

export const TradingView: React.FC = () => {
  const ensureCells = useGameStore((state) => state.ensureCells);
  const tickTime = useGameStore((state) => state.tickTime);
  const setOpenBets = useGameStore((state) => state.setOpenBets);
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

  return (
    <div
      className="flex h-screen w-full bg-vibe-bg text-white font-sans overflow-hidden"
      style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
    >
      <Sidebar />
      {/* xl: offset by sidebar width, mobile/tablet: no left padding, bottom padding for bottom nav */}
      <main className="flex-1 flex flex-col xl:pl-[220px] 2xl:pl-64 h-full relative z-10 transition-all duration-300 pb-[60px] xl:pb-0">
        <Header />

        <div className="flex-1 flex flex-col p-2 sm:p-4 md:p-6 relative overflow-hidden">
          {/* Ambient Gold Glow */}
          <div
            className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full pointer-events-none opacity-40"
            style={{
              background:
                "radial-gradient(circle, rgba(255,204,102,0.08) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none opacity-30"
            style={{
              background:
                "radial-gradient(circle, rgba(255,204,102,0.06) 0%, transparent 70%)",
            }}
          />

          <div
            className="flex-1 rounded-xl sm:rounded-2xl flex flex-col overflow-hidden relative z-10"
            style={{
              background: "rgba(26,26,26,0.8)",
              border: "1px solid rgba(255,204,102,0.1)",
              backdropFilter: "blur(16px)",
            }}
          >
            <TradingGrid />
          </div>
        </div>
      </main>
    </div>
  );
};
