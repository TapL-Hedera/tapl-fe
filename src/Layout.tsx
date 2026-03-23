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
        background:
          "radial-gradient(circle at 50% -10%, rgba(45,132,235,0.2) 0%, rgba(79,70,229,0.1) 24%, transparent 56%), linear-gradient(180deg, #06080f 0%, #04060c 48%, #030409 100%)",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {/* Universal Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[820px] h-[400px] opacity-25 pointer-events-none rounded-full blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, rgba(45,132,235,0.85) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute right-[-140px] top-[18%] h-[340px] w-[340px] pointer-events-none rounded-full blur-[120px]"
        style={{ background: "rgba(79, 70, 229, 0.18)" }}
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
