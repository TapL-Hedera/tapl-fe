import React from "react";
import {
  AreaChart,
  History,
  Wallet,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export const Sidebar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { icon: AreaChart, label: "Trade", path: "/" },
    { icon: History, label: "History", path: "/history" },
    { icon: Wallet, label: "Wallet", path: "/wallet" },
    { icon: TrendingUp, label: "LP", path: "/lp" },
    { icon: ShieldCheck, label: "CRE Proof", path: "/cre-proof" },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden xl:flex fixed left-0 top-0 h-screen flex-col z-50 transition-all duration-300 w-[220px] 2xl:w-64"
        style={{
          background: "#181A20",
          borderRight: "1px solid #2B3139",
        }}
      >
        {/* Brand */}
        <div style={{ borderBottom: "1px solid #2B3139" }}>
          <Link to="/" className="flex items-center gap-3 px-5 py-5">
            <div
              className="w-8 h-8 rounded flex items-center justify-center shrink-0"
              style={{ background: "rgba(55,91,210,0.12)" }}
            >
              <img
                src="/tapfun.png"
                alt="tapfun logo"
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <h1
              className="text-base font-bold tracking-wider"
              style={{ color: "#375BD2" }}
            >
              TAPL
            </h1>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={idx}
                to={item.path}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-150 group text-sm font-medium",
                  isActive
                    ? "nav-active"
                    : "text-bn-text-dim hover:bg-white/[0.04] hover:text-bn-text",
                )}
                style={
                  isActive
                    ? {
                        background: "rgba(55,91,210,0.08)",
                        color: "#375BD2",
                      }
                    : undefined
                }
              >
                <Icon
                  size={17}
                  style={{
                    color: isActive ? "#375BD2" : undefined,
                  }}
                  className={cn(
                    "transition-colors shrink-0",
                    !isActive && "text-[#848E9C] group-hover:text-[#EAECEF]",
                  )}
                />
                <span>{item.label}</span>
                {isActive && (
                  <span
                    className="ml-auto w-0.5 h-4 rounded-full"
                    style={{ background: "#375BD2" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom badge */}
        <div
          className="m-3 rounded p-3"
          style={{
            background: "rgba(55,91,210,0.04)",
            border: "1px solid rgba(55,91,210,0.1)",
          }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-1"
            style={{ color: "#375BD2" }}
          >
            Powered by
          </p>
          <p className="text-xs" style={{ color: "#848E9C" }}>
            Chainlink Data Streams
          </p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav
        className="xl:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2"
        style={{
          background: "#181A20",
          borderTop: "1px solid #2B3139",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          height: "56px",
        }}
      >
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={idx}
              to={item.path}
              className="flex flex-col items-center gap-1 px-4 py-2 transition-all duration-150 min-w-[48px]"
              style={{ color: isActive ? "#375BD2" : "#474D57" }}
            >
              <Icon
                size={20}
                style={{ color: isActive ? "#375BD2" : "#474D57" }}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};
