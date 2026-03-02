import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogPanel } from "@headlessui/react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSignMessage,
  useSwitchChain,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { useGameStore } from "./store";
import {
  authControllerGetChallenge,
  authControllerLogin,
  authControllerGetWssKey,
  getAccountControllerGetBalanceQueryKey,
  useAccountControllerGetBalance,
} from "./services/queries";
import { io, Socket } from "socket.io-client";
import CryptoJS from "crypto-js";
import { useQueryClient } from "@tanstack/react-query";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { BACKEND_URL } from "./constant";

export const Header: React.FC = () => {
  const balance = useGameStore((state) => state.balance);
  const currentPrice = useGameStore((state) => state.currentPrice);
  const betAmount = useGameStore((state) => state.betAmount);
  const setBetAmount = useGameStore((state) => state.setBetAmount);
  const updatePrice = useGameStore((state) => state.updatePrice);
  const updateGrid = useGameStore((state) => state.updateGrid);
  const setConnection = useGameStore((state) => state.setConnection);
  const updateOrder = useGameStore((state) => state.updateOrder);
  const updateBalance = useGameStore((state) => state.updateBalance);

  const isDemoMode = useGameStore((state) => state.isDemoMode);
  const demoAddress = useGameStore((state) => state.demoAddress);
  const setDemoMode = useGameStore((state) => state.setDemoMode);
  const setDemoAddress = useGameStore((state) => state.setDemoAddress);

  const {
    address: realAddress,
    isConnected: isRealConnected,
    chain,
  } = useAccount();

  const isConnected = isDemoMode || isRealConnected;
  const address = isDemoMode ? demoAddress : realAddress;

  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { switchChain, isPending: isPendingSwitch } = useSwitchChain();
  const isLoggingIn = useRef(false);
  const promptedAddress = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  );

  const { data: balanceData, refetch: refetchBalance } =
    useAccountControllerGetBalance();

  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isFunding, setIsFunding] = useState(false);

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
      if (storedTime) {
        const lastTime = parseInt(storedTime, 10);
        const targetTime = lastTime + 30 * 60 * 1000;
        const now = Date.now();
        const diff = targetTime - now;
        if (diff > 0) {
          setTimeRemaining(diff);
        } else {
          setTimeRemaining(0);
        }
      } else {
        setTimeRemaining(0);
      }
    };

    if (isFundModalOpen) {
      checkTime();
      interval = setInterval(checkTime, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isFundModalOpen]);

  useEffect(() => {
    const handleLogin = async () => {
      if (!isConnected || !address || isLoggingIn.current) return;

      const token = localStorage.getItem("token");
      const storedAddress = localStorage.getItem("wallet-address");

      if (token && storedAddress === address) return;

      if (promptedAddress.current === address) return;

      isLoggingIn.current = true;
      promptedAddress.current = address;
      try {
        const challengeRes = await authControllerGetChallenge({ address });
        const challenge = (challengeRes as unknown as { challenge: string })
          .challenge;

        let signature: string;
        if (isDemoMode) {
          const demoPk = localStorage.getItem("demo-private-key");
          if (!demoPk) {
            setDemoMode(false);
            return;
          }
          const account = privateKeyToAccount(demoPk as `0x${string}`);
          signature = await account.signMessage({ message: challenge });
        } else {
          signature = await signMessageAsync({ message: challenge });
        }

        const loginRes = await authControllerLogin({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, signature }),
        });
        const accessToken = (loginRes as unknown as { accessToken: string })
          .accessToken;

        localStorage.setItem("token", accessToken);
        setToken(accessToken);
        localStorage.setItem("wallet-address", address);
        refetchBalance();
      } catch (error) {
        console.error("Login failed:", error);
      } finally {
        isLoggingIn.current = false;
      }
    };

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
          console.log("Header WSS Connected");

          try {
            if (token) {
              const wssKeyRes = await authControllerGetWssKey();
              const wssKey = (wssKeyRes as unknown as { key: string }).key;
              setConnection(socket, wssKey);

              if (address) {
                const challengeRes = await authControllerGetChallenge({
                  address: address as string,
                });
                console.log("challengeRes: ", challengeRes);
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
          } catch (e) {
            console.error("WSS Subscription Error:", e);
          }
        });

        const events = [
          "grid_update",
          "balance_update",
          "order_update",
          "price_now",
        ];

        events.forEach((evt) => {
          socket?.on(evt, (data) => {
            switch (evt) {
              case "price_now":
                if (data?.price) {
                  updatePrice(data.price);
                }
                break;
              case "grid_update":
                if (Array.isArray(data)) {
                  updateGrid(data);
                }
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

        socket.on("disconnect", () => {
          console.log("Header WSS Disconnected");
        });
      } catch (err) {
        console.error("WebSocket setup failed:", err);
      }
    };

    connectWss();

    return () => {
      isActive = false;
      if (socket) {
        socket.disconnect();
      }
    };
  }, [
    isConnected,
    address,
    updatePrice,
    updateGrid,
    queryClient,
    setConnection,
    updateOrder,
    token,
  ]);

  const [walletMenuOpen, setWalletMenuOpen] = useState(false);

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
      setToken(accessToken);
      localStorage.setItem("wallet-address", newAddress);

      // Auto faucet
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
    } catch (e) {
      console.error(e);
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
    setToken(null);
    localStorage.removeItem("wallet-address");
    promptedAddress.current = null;
    setWalletMenuOpen(false);
  };

  return (
    <header
      className="xl:h-14 flex flex-col xl:flex-row xl:items-center xl:justify-between px-3 sm:px-4 xl:px-6 sticky top-0 z-40 gap-0"
      style={{
        background: "#181A20",
        borderBottom: "1px solid #2B3139",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── Row 1 (always visible): logo + market + price + wallet ── */}
      <div className="flex items-center gap-3 h-14 xl:h-auto">
        {/* tapfun logo — mobile only */}
        <img
          src="/tapfun.png"
          alt="tapfun"
          className="xl:hidden w-6 h-6 object-contain shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />

        {/* Market badge */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 shrink-0"
          style={{
            background: "#1E2329",
            border: "1px solid #2B3139",
            borderRadius: "4px",
          }}
        >
          <span className="font-semibold text-xs" style={{ color: "#EAECEF" }}>
            BTC/USD
          </span>
        </div>

        {/* Live price */}
        <span className="text-sm xl:text-base font-bold font-mono text-white flex items-center gap-1.5 flex-1 min-w-0">
          <span className="truncate" style={{ color: "#2EBD85" }}>
            ${currentPrice.toFixed(2)}
          </span>
          <span className="flex h-1.5 w-1.5 relative shrink-0">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "#2EBD85" }}
            ></span>
            <span
              className="relative inline-flex rounded-full h-1.5 w-1.5"
              style={{ background: "#2EBD85" }}
            ></span>
          </span>
        </span>

        {/* ── Mobile wallet section ── */}
        <div className="xl:hidden ml-auto shrink-0 flex items-center gap-2">
          {!isConnected ? (
            <>
              <button
                onClick={startDemo}
                disabled={isDemoLoading}
                className="font-semibold px-3 py-1.5 active:scale-95 transition-transform text-xs whitespace-nowrap disabled:opacity-50"
                style={{
                  background: "#2B3139",
                  color: "#EAECEF",
                  borderRadius: "4px",
                  border: "1px solid #363C45",
                }}
              >
                {isDemoLoading ? "Starting..." : "Demo"}
              </button>
              <button
                onClick={() => connect({ connector: connectors[0] })}
                className="font-semibold px-3 py-1.5 active:scale-95 transition-transform text-xs whitespace-nowrap"
                style={{
                  background: "#375BD2",
                  color: "#1E2329",
                  borderRadius: "4px",
                }}
              >
                Connect
              </button>
            </>
          ) : chain?.id !== sepolia.id && !isDemoMode ? (
            <button
              onClick={() => switchChain?.({ chainId: sepolia.id })}
              disabled={isPendingSwitch}
              className="font-semibold px-3 py-1.5 active:scale-95 transition-transform text-[11px] whitespace-nowrap disabled:opacity-50"
              style={{
                background: "#375BD2",
                color: "#1E2329",
                borderRadius: "4px",
              }}
            >
              {isPendingSwitch ? "Switching..." : "Switch Network"}
            </button>
          ) : (
            <div className="relative">
              {walletMenuOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setWalletMenuOpen(false)}
                />
              )}
              {/* Wallet chip button */}
              <button
                onClick={() => setWalletMenuOpen((v) => !v)}
                className="relative z-50 font-semibold px-2.5 py-1.5 active:scale-95 transition-transform flex items-center gap-1.5 text-xs"
                style={{
                  background: "#1E2329",
                  border: "1px solid #2B3139",
                  color: "#EAECEF",
                  borderRadius: "4px",
                }}
              >
                {address?.slice(0, 4)}..{address?.slice(-3)}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`opacity-60 transition-transform duration-200 ${walletMenuOpen ? "rotate-180" : ""}`}
                  style={{ color: "#848E9C" }}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {/* Dropdown */}
              {walletMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-52 shadow-2xl overflow-hidden z-50"
                  style={{
                    background: "#1E2329",
                    border: "1px solid #2B3139",
                    borderRadius: "4px",
                  }}
                >
                  <div
                    className="px-3 pt-3 pb-2"
                    style={{ borderBottom: "1px solid #2B3139" }}
                  >
                    <p
                      className="text-[9px] uppercase tracking-wider font-semibold mb-1"
                      style={{ color: "#474D57" }}
                    >
                      {isDemoMode ? "Demo Wallet" : "Connected"}
                    </p>
                    <p
                      className="font-mono text-[11px] truncate"
                      style={{ color: "#EAECEF" }}
                    >
                      {address?.slice(0, 10)}...{address?.slice(-6)}
                    </p>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="w-full text-left px-4 py-3 font-medium transition-colors flex items-center gap-2.5 text-xs"
                    style={{ color: "#F6465D" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(246,70,93,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2 (mobile only): bet + balance + faucet ── */}
      {isConnected && (
        <div
          className="xl:hidden flex items-center gap-2 h-10 overflow-x-auto scrollbar-none"
          style={{ borderTop: "1px solid #2B3139" }}
        >
          {/* Bet selector */}
          <div
            className="flex px-2.5 py-1.5 items-center gap-1.5 shrink-0"
            style={{
              background: "#1E2329",
              border: "1px solid #2B3139",
              borderRadius: "4px",
            }}
          >
            <span
              className="text-[10px] font-medium"
              style={{ color: "#848E9C" }}
            >
              Bet
            </span>
            <select
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              className="bg-transparent font-bold font-mono text-xs outline-none cursor-pointer appearance-none pr-3"
              style={{ color: "#375BD2" }}
            >
              <option
                style={{ background: "#0B0E11", color: "#375BD2" }}
                value={10}
              >
                $10
              </option>
              <option
                style={{ background: "#0B0E11", color: "#375BD2" }}
                value={50}
              >
                $50
              </option>
              <option
                style={{ background: "#0B0E11", color: "#375BD2" }}
                value={100}
              >
                $100
              </option>
            </select>
          </div>

          {/* Balance */}
          <div
            className="flex px-2.5 py-1.5 items-center gap-1.5 shrink-0"
            style={{
              background: "#1E2329",
              border: "1px solid #2B3139",
              borderRadius: "4px",
            }}
          >
            <span
              className="text-[10px] font-medium"
              style={{ color: "#848E9C" }}
            >
              Balance
            </span>
            <span
              className="font-bold font-mono text-xs"
              style={{ color: "#EAECEF" }}
            >
              $
              {Number(
                (balanceData as unknown as { free?: string })?.free ?? balance,
              ).toFixed(2)}
            </span>
          </div>

          {/* Faucet */}
          <button
            onClick={() => setIsFundModalOpen(true)}
            className="shrink-0 font-semibold px-3 py-1.5 transition-all active:scale-95 text-xs"
            style={{
              background: "#375BD2",
              color: "#1E2329",
              borderRadius: "4px",
            }}
          >
            Faucet
          </button>
        </div>
      )}

      {/* ── Desktop right side (xl+): all in one row ── */}
      <div className="hidden xl:flex items-center gap-3">
        {isConnected && (
          <>
            <div
              className="px-3 py-1.5 flex items-center gap-2"
              style={{
                background: "#1E2329",
                border: "1px solid #2B3139",
                borderRadius: "4px",
              }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: "#848E9C" }}
              >
                Bet:
              </span>
              <select
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                className="bg-transparent font-bold font-mono text-sm outline-none cursor-pointer appearance-none pr-4"
                style={{ color: "#375BD2" }}
              >
                <option
                  style={{ background: "#0B0E11", color: "#375BD2" }}
                  value={10}
                >
                  $10
                </option>
                <option
                  style={{ background: "#0B0E11", color: "#375BD2" }}
                  value={50}
                >
                  $50
                </option>
                <option
                  style={{ background: "#0B0E11", color: "#375BD2" }}
                  value={100}
                >
                  $100
                </option>
              </select>
            </div>

            <div
              className="px-4 py-1.5 flex items-center gap-2"
              style={{
                background: "#1E2329",
                border: "1px solid #2B3139",
                borderRadius: "4px",
              }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: "#848E9C" }}
              >
                Balance
              </span>
              <span
                className="font-bold font-mono text-sm"
                style={{ color: "#2EBD85" }}
              >
                $
                {Number(
                  (balanceData as unknown as { free?: string })?.free ??
                    balance,
                ).toFixed(2)}
              </span>
            </div>

            <button
              onClick={() => setIsFundModalOpen(true)}
              className="font-semibold px-4 py-1.5 transition-all active:scale-95 text-sm"
              style={{
                background: "#2B3139",
                color: "#EAECEF",
                borderRadius: "4px",
                border: "1px solid #363C45",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#363C45";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#2B3139";
              }}
            >
              Faucet
            </button>
          </>
        )}

        {isConnected ? (
          chain?.id !== sepolia.id && !isDemoMode ? (
            <button
              onClick={() => switchChain({ chainId: sepolia.id })}
              disabled={isPendingSwitch}
              className="font-semibold px-4 py-2 transition-all active:scale-95 flex items-center gap-2 text-sm disabled:opacity-50"
              style={{
                background: "#375BD2",
                color: "#1E2329",
                borderRadius: "4px",
              }}
            >
              {isPendingSwitch ? "Switching..." : "Switch Network"}
            </button>
          ) : (
            <div className="relative group">
              <button
                className="font-semibold px-4 py-2 transition-all active:scale-95 flex items-center gap-2 text-sm"
                style={{
                  background: "#1E2329",
                  border: "1px solid #2B3139",
                  color: "#EAECEF",
                  borderRadius: "4px",
                }}
              >
                {address?.slice(0, 6)}...{address?.slice(-4)}
                {isDemoMode && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                    style={{
                      background: "rgba(55,91,210,0.1)",
                      color: "#375BD2",
                      border: "1px solid rgba(55,91,210,0.2)",
                    }}
                  >
                    DEMO
                  </span>
                )}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform group-hover:rotate-180"
                  style={{ color: "#848E9C" }}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <div
                className="absolute right-0 top-full mt-1 w-52 shadow-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50"
                style={{
                  background: "#1E2329",
                  border: "1px solid #2B3139",
                  borderRadius: "4px",
                }}
              >
                <div
                  className="px-4 pt-3 pb-2"
                  style={{ borderBottom: "1px solid #2B3139" }}
                >
                  <p
                    className="text-[10px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: "#474D57" }}
                  >
                    {isDemoMode ? "Demo Wallet" : "Connected"}
                  </p>
                  <p
                    className="font-mono text-xs truncate"
                    style={{ color: "#EAECEF" }}
                  >
                    {address}
                  </p>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="w-full text-left px-4 py-3 font-medium transition-colors flex items-center gap-2 text-sm"
                  style={{ color: "#F6465D" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(246,70,93,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Disconnect
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={startDemo}
              disabled={isDemoLoading}
              className="font-semibold px-4 py-2 transition-all active:scale-95 flex items-center gap-2 text-sm disabled:opacity-50"
              style={{
                background: "#2B3139",
                border: "1px solid #363C45",
                color: "#EAECEF",
                borderRadius: "4px",
              }}
            >
              {isDemoLoading ? (
                <div className="h-3.5 w-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              ) : null}
              {isDemoLoading ? "Starting..." : "Try Demo"}
            </button>
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="font-semibold px-4 py-2 transition-all active:scale-95 text-sm"
              style={{
                background: "#375BD2",
                color: "#1E2329",
                borderRadius: "4px",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#2C4AB8";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#375BD2";
              }}
            >
              Connect Wallet
            </button>
          </div>
        )}
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
          <DialogPanel
            className="p-6 max-w-md w-full mx-4 relative"
            style={{
              background: "#1E2329",
              border: "1px solid #2B3139",
              borderRadius: "8px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <button
              onClick={() => setIsFundModalOpen(false)}
              className="absolute top-4 right-4 transition-colors"
              style={{ color: "#474D57" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#EAECEF";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#474D57";
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>

            <h2 className="text-lg font-bold mb-1" style={{ color: "#EAECEF" }}>
              Faucet Account
            </h2>
            <p className="text-sm mb-6" style={{ color: "#848E9C" }}>
              Claim $100 in test funds. Request additional funds every 30
              minutes.
            </p>

            <div className="flex flex-col items-center gap-4">
              {timeRemaining > 0 ? (
                <div
                  className="px-6 py-3 font-mono text-lg font-bold flex items-center gap-2 w-full justify-center"
                  style={{
                    background: "#2B3139",
                    color: "#EAECEF",
                    border: "1px solid #363C45",
                    borderRadius: "4px",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: "#848E9C" }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Next in {Math.floor(timeRemaining / 1000 / 60)}:
                  {String(Math.floor((timeRemaining / 1000) % 60)).padStart(
                    2,
                    "0",
                  )}
                </div>
              ) : (
                <button
                  onClick={async () => {
                    const token = localStorage.getItem("token");
                    if (!token) return;
                    setIsFunding(true);
                    try {
                      await fetch(`${BACKEND_URL}/api/payment/debug/deposit`, {
                        method: "POST",
                        headers: {
                          accept: "*/*",
                          Authorization: `Bearer ${token}`,
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
                  className="w-full font-semibold px-6 py-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-sm"
                  style={{
                    background: "#375BD2",
                    color: "#1E2329",
                    borderRadius: "4px",
                  }}
                  onMouseEnter={(e) => {
                    if (!isFunding)
                      (e.currentTarget as HTMLElement).style.background =
                        "#2C4AB8";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "#375BD2";
                  }}
                >
                  {isFunding ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                      Funding...
                    </>
                  ) : (
                    "Fund $100 Now"
                  )}
                </button>
              )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </header>
  );
};
