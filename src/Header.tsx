import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogPanel } from "@headlessui/react";
import { useQueryClient } from "@tanstack/react-query";
import CryptoJS from "crypto-js";
import { Link, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { io, Socket } from "socket.io-client";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSignMessage,
  useSwitchChain,
} from "wagmi";
import { moonbaseAlpha } from "wagmi/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { ChevronDown } from "lucide-react";
import { BACKEND_URL } from "./constant";
import {
  authControllerGetChallenge,
  authControllerGetWssKey,
  authControllerLogin,
  getAccountControllerGetBalanceQueryKey,
  useAccountControllerGetBalance,
} from "./services/queries";
import { useGameStore } from "./store";

const NAV_ITEMS = [
  { label: "Trade", path: "/trade" },
  { label: "History", path: "/history" },
  { label: "Wallet", path: "/wallet" },
  { label: "Liquidity", path: "/lp" },
] as const;

function HeaderButton({
  label,
  onClick,
  variant = "secondary",
  badge,
}: {
  label: string;
  onClick: () => void;
  variant?: "secondary" | "primary";
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition"
      style={{
        background:
          variant === "primary"
            ? "#f0b90b"
            : "linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.02) 100%)",
        color: variant === "primary" ? "#050505" : "#f5f5f5",
        border:
          variant === "primary"
            ? "1px solid rgba(240, 185, 11, 0.34)"
            : "1px solid rgba(255,255,255,0.08)",
        boxShadow:
          variant === "primary"
            ? "0 10px 24px rgba(240, 185, 11, 0.18)"
            : "none",
      }}
    >
      {label}
      {badge ? (
        <span className="rounded-md bg-black/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export const Header: React.FC = () => {
  const updatePrice = useGameStore((state) => state.updatePrice);
  const updateGrid = useGameStore((state) => state.updateGrid);
  const setConnection = useGameStore((state) => state.setConnection);
  const updateOrder = useGameStore((state) => state.updateOrder);
  const updateBalance = useGameStore((state) => state.updateBalance);
  const isDemoMode = useGameStore((state) => state.isDemoMode);
  const demoAddress = useGameStore((state) => state.demoAddress);
  const setDemoMode = useGameStore((state) => state.setDemoMode);
  const setDemoAddress = useGameStore((state) => state.setDemoAddress);

  const location = useLocation();
  const {
    address: realAddress,
    isConnected: isRealConnected,
    chain,
  } = useAccount();

  const address = isDemoMode ? demoAddress : realAddress;
  const isConnected = isDemoMode || isRealConnected;

  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { switchChain, isPending: isPendingSwitch } = useSwitchChain();
  const queryClient = useQueryClient();

  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  );
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isFunding, setIsFunding] = useState(false);

  const promptedAddress = useRef<string | null>(null);
  const isLoggingIn = useRef(false);

  const { data: balanceData, refetch: refetchBalance } =
    useAccountControllerGetBalance();

  useEffect(() => {
    if (
      balanceData &&
      typeof (balanceData as unknown as { free?: string }).free !== "undefined"
    ) {
      updateBalance(Number((balanceData as unknown as { free?: string }).free));
    }
  }, [balanceData, updateBalance]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const checkTime = () => {
      const storedTime = localStorage.getItem("last-fund-time");
      if (!storedTime) {
        setTimeRemaining(0);
        return;
      }

      const lastTime = parseInt(storedTime, 10);
      const targetTime = lastTime + 30 * 60 * 1000;
      const now = Date.now();
      setTimeRemaining(Math.max(targetTime - now, 0));
    };

    if (isFundModalOpen) {
      checkTime();
      interval = setInterval(checkTime, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isFundModalOpen]);

  const handleLogin = async () => {
    if (!isConnected || !address || isLoggingIn.current) return;

    const storedToken = localStorage.getItem("token");
    const storedAddress = localStorage.getItem("wallet-address");

    if (storedToken && storedAddress === address) return;
    if (promptedAddress.current === address) return;

    isLoggingIn.current = true;
    promptedAddress.current = address;

    try {
      const challengeRes = await authControllerGetChallenge({ address });
      const challenge = (challengeRes as unknown as { challenge: string })
        .challenge;

      const signature = isDemoMode
        ? await privateKeyToAccount(
            localStorage.getItem("demo-private-key") as `0x${string}`,
          ).signMessage({ message: challenge })
        : await signMessageAsync({ message: challenge });

      const loginRes = await authControllerLogin({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature }),
      });

      const accessToken = (loginRes as unknown as { accessToken: string })
        .accessToken;

      localStorage.setItem("token", accessToken);
      localStorage.setItem("wallet-address", address);
      setToken(accessToken);
      refetchBalance();
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      isLoggingIn.current = false;
    }
  };

  useEffect(() => {
    handleLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, isDemoMode]);

  useEffect(() => {
    let socket: Socket | null = null;
    let isActive = true;

    const connectWss = async () => {
      try {
        socket = io(BACKEND_URL);

        socket.on("connect", async () => {
          if (!isActive) return;

          try {
            if (token) {
              const wssKeyRes = await authControllerGetWssKey();
              const wssKey = (wssKeyRes as unknown as { key: string }).key;
              setConnection(socket, wssKey);

              if (address) {
                const challengeRes = await authControllerGetChallenge({
                  address: address as string,
                });
                const wssChallenge = (
                  challengeRes as unknown as { challenge: string }
                ).challenge;

                const hmac = CryptoJS.algo.HMAC.create(
                  CryptoJS.algo.SHA256,
                  CryptoJS.enc.Hex.parse(wssKey),
                );
                hmac.update(address);
                hmac.update(wssChallenge);

                const wssSignature = hmac.finalize().toString(CryptoJS.enc.Hex);

                socket?.emit("subscribe_user", {
                  userId: address,
                  signature: wssSignature,
                });
              }
            }
          } catch (error) {
            console.error("WSS subscription error:", error);
          }
        });

        const events = [
          "grid_update",
          "balance_update",
          "order_update",
          "price_now",
        ] as const;

        events.forEach((eventName) => {
          socket?.on(eventName, (data) => {
            switch (eventName) {
              case "price_now":
                if (data?.price) updatePrice(data.price, data.ts);
                break;
              case "grid_update":
                if (Array.isArray(data)) updateGrid(data);
                break;
              case "balance_update":
                if (data) {
                  queryClient.setQueryData(
                    getAccountControllerGetBalanceQueryKey(),
                    data,
                  );
                }
                break;
              case "order_update":
                updateOrder(data);
                break;
            }
          });
        });
      } catch (error) {
        console.error("WebSocket setup failed:", error);
      }
    };

    connectWss();

    return () => {
      isActive = false;
      socket?.disconnect();
    };
  }, [
    address,
    queryClient,
    setConnection,
    token,
    updateGrid,
    updateOrder,
    updatePrice,
  ]);

  const startDemo = async () => {
    try {
      setIsDemoLoading(true);
      const newPk = generatePrivateKey();
      const account = privateKeyToAccount(newPk);
      localStorage.setItem("demo-private-key", newPk);

      const newAddress = account.address;
      setDemoAddress(newAddress);

      const challengeRes = await authControllerGetChallenge({
        address: newAddress,
      });
      const challenge = (challengeRes as unknown as { challenge: string })
        .challenge;
      const signature = await account.signMessage({ message: challenge });

      const loginRes = await authControllerLogin({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: newAddress, signature }),
      });
      const accessToken = (loginRes as unknown as { accessToken: string })
        .accessToken;

      localStorage.setItem("token", accessToken);
      localStorage.setItem("wallet-address", newAddress);
      setToken(accessToken);

      await fetch(`${BACKEND_URL}/api/payment/debug/deposit`, {
        method: "POST",
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: "100",
          txHash: `0x${Date.now()}`,
          logIndex: 2,
        }),
      });

      setDemoMode(true);
      refetchBalance();
    } catch (error) {
      console.error(error);
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (isDemoMode) {
      setDemoMode(false);
      setDemoAddress(null);
      localStorage.removeItem("demo-private-key");
    } else {
      disconnect();
    }

    localStorage.removeItem("token");
    localStorage.removeItem("wallet-address");
    setToken(null);
    promptedAddress.current = null;
    setWalletMenuOpen(false);
  };

  return (
    <header
      className="sticky top-0 z-40 border-b border-white/8 bg-[#090909]/94 backdrop-blur-xl"
      style={{
        fontFamily: "'Space Grotesk', sans-serif",
        borderTop: "1px solid rgba(240, 185, 11, 0.82)",
      }}
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap">
          <div className="flex min-w-0 items-center gap-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#111111] shadow-[0_10px_30px_rgba(0,0,0,0.28)]">
                <img
                  src="/polkatap.png"
                  alt="PolkaTap"
                  className="h-6 w-6 object-contain"
                />
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[1.65rem] font-semibold tracking-[-0.06em] text-white">
                  PolkaTap
                </p>
                <span className="hidden rounded-md border border-white/8 bg-white/[0.03] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/48 lg:inline-flex">
                  Beta
                </span>
              </div>
            </Link>
          </div>

          <nav className="hidden items-center gap-1 rounded-2xl border border-white/8 bg-white/[0.02] p-1 lg:flex lg:ml-4">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="rounded-xl px-4 py-2 text-sm font-medium transition"
                  style={{
                    background: isActive
                      ? "rgba(255,255,255,0.06)"
                      : "transparent",
                    color: isActive ? "#ffffff" : "rgba(255,255,255,0.62)",
                    border: isActive
                      ? "1px solid rgba(255,255,255,0.08)"
                      : "1px solid transparent",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {!isConnected ? (
              <>
                <HeaderButton
                  label={isDemoLoading ? "Starting demo" : "Demo mode"}
                  onClick={startDemo}
                  badge="beta"
                />
                <HeaderButton
                  label="Connect wallet"
                  onClick={() => connect({ connector: connectors[0] })}
                  variant="primary"
                />
              </>
            ) : chain?.id !== moonbaseAlpha.id && !isDemoMode ? (
              <HeaderButton
                label={isPendingSwitch ? "Switching" : "Switch network"}
                onClick={() => switchChain?.({ chainId: moonbaseAlpha.id })}
                variant="primary"
              />
            ) : !token ? (
              <HeaderButton
                label="Sign in"
                onClick={() => {
                  promptedAddress.current = null;
                  handleLogin();
                }}
                badge="wallet"
              />
            ) : (
              <>
                <HeaderButton
                  label="Faucet"
                  onClick={() => setIsFundModalOpen(true)}
                />
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setWalletMenuOpen((value) => !value)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-4 text-sm font-medium text-white transition hover:bg-white/[0.06]"
                  >
                    <span className="font-mono text-[13px]">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                    {isDemoMode ? (
                      <span className="rounded-md bg-[#f0b90b]/14 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#f0b90b]">
                        Demo
                      </span>
                    ) : null}
                    <ChevronDown size={15} className="text-white/48" />
                  </button>

                  {walletMenuOpen && (
                    <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-2xl border border-white/8 bg-[#101010] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                      <div className="border-b border-white/8 px-4 py-3">
                        <p className="text-[11px] font-medium text-white/42">
                          {isDemoMode ? "Demo wallet" : "Connected wallet"}
                        </p>
                        <p className="mt-2 break-all font-mono text-xs text-white">
                          {address?.slice(0, 6)}...{address?.slice(-4)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
                        <button
                          type="button"
                          className="rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-xs font-medium text-white/75 transition hover:bg-white/[0.06] hover:text-white"
                          onClick={() => {
                            if (address) {
                              navigator.clipboard.writeText(address);
                              toast.success("Address copied!");
                            }
                          }}
                        >
                          Copy
                        </button>
                        <a
                          href={`https://moonbase.moonscan.io/address/${address}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-xs font-medium text-white/75 transition hover:bg-white/[0.06] hover:text-white"
                        >
                          Explorer
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-[#f87171] transition hover:bg-[#f87171]/8"
                      >
                        Disconnect
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <nav className="flex items-center gap-2 overflow-x-auto pb-1 lg:hidden">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className="shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition"
                style={{
                  background: isActive
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(255,255,255,0.03)",
                  color: isActive ? "#ffffff" : "rgba(255,255,255,0.68)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <Dialog
        open={isFundModalOpen}
        onClose={() => setIsFundModalOpen(false)}
        className="relative z-50"
      >
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          aria-hidden="true"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="relative mx-4 w-full max-w-md rounded-2xl border border-white/8 bg-[#101010] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <button
              type="button"
              onClick={() => setIsFundModalOpen(false)}
              className="absolute right-4 top-4 text-white/50 transition hover:text-white"
            >
              x
            </button>

            <h2 className="text-lg font-bold text-white">Faucet account</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Claim $100 in test funds. Additional requests unlock every 30
              minutes.
            </p>

            <div className="mt-6">
              {timeRemaining > 0 ? (
                <div className="rounded-2xl border border-white/8 bg-white/4 px-5 py-4 text-center font-mono text-lg text-white">
                  Next in {Math.floor(timeRemaining / 1000 / 60)}:
                  {String(Math.floor((timeRemaining / 1000) % 60)).padStart(
                    2,
                    "0",
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    const authToken = localStorage.getItem("token");
                    if (!authToken) return;

                    setIsFunding(true);
                    try {
                      await fetch(`${BACKEND_URL}/api/payment/debug/deposit`, {
                        method: "POST",
                        headers: {
                          accept: "*/*",
                          Authorization: `Bearer ${authToken}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          amount: "100",
                          txHash: `0x${Date.now()}`,
                          logIndex: 2,
                        }),
                      });
                      localStorage.setItem(
                        "last-fund-time",
                        Date.now().toString(),
                      );
                      refetchBalance();
                    } catch (error) {
                      console.error("Deposit failed:", error);
                    } finally {
                      setIsFunding(false);
                    }
                  }}
                  disabled={isFunding}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f0b90b] px-5 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-black transition disabled:opacity-50"
                >
                  {isFunding ? "Funding..." : "Fund $100 now"}
                </button>
              )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </header>
  );
};
