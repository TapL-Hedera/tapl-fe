import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";

export const Layout: React.FC = () => {
  const location = useLocation();
  const isIntro = location.pathname === "/";

  return (
    <div
      className="flex h-screen w-full text-white font-sans overflow-hidden relative"
      style={{
        background: "#050505",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {/* Universal Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-20 pointer-events-none rounded-full blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, rgba(240,185,11,0.85) 0%, transparent 70%)",
        }}
      />

      <main
        className="relative z-10 flex h-full flex-1 flex-col overflow-auto transition-all duration-300"
      >
        {!isIntro && <Header />}
        <Outlet />
      </main>
    </div>
  );
};
