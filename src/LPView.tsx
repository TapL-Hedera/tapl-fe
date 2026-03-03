import React, { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { parseUnits, formatUnits, maxUint256 } from "viem";
import { toast } from "react-hot-toast";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import {
  POOL_RESERVE_ADDRESS,
  POOL_RESERVE_ABI,
  ERC20_ABI,
} from "./contracts/abi";

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconRefresh = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 2v6h-6" />
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M3 22v-6h6" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
  </svg>
);

const IconInfo = () => (
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
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

const IconTrendingUp = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

const IconCoins = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="8" cy="8" r="6" />
    <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
    <path d="M7 6h1v4" />
    <path d="m16.71 13.88.7.71-2.82 2.82" />
  </svg>
);

const IconPieChart = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  sub,
  accent,
}) => (
  <div className="flex items-start gap-3 p-4 sci-card group">
    <div
      className="shrink-0 p-2 rounded"
      style={{
        background: accent ? "rgba(8, 71, 247,0.12)" : "rgba(255,255,255,0.04)",
        color: accent ? "#0847F7" : "#d0d0d0",
      }}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <p
        className="text-xs font-medium uppercase tracking-wider mb-1"
        style={{ color: "#d0d0d0" }}
      >
        {label}
      </p>
      <p
        className="text-lg font-bold font-mono break-all"
        style={{ color: accent ? "#0847F7" : "#ffffff" }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-0.5" style={{ color: "#a0a0a0" }}>
          {sub}
        </p>
      )}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const LPView: React.FC = () => {
  const { address, isConnected, chain } = useAccount();
  const { switchChain, isPending: isPendingSwitch } = useSwitchChain();
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

  // Input state
  const [depositAmountStr, setDepositAmountStr] = useState("");
  const [withdrawSharesStr, setWithdrawSharesStr] = useState("");

  // ── Contract Reads ──────────────────────────────────────────────────────────

  // Asset address
  const { data: assetAddress } = useReadContract({
    address: POOL_RESERVE_ADDRESS,
    abi: POOL_RESERVE_ABI,
    functionName: "asset",
  });

  // Token decimals
  const { data: decimals = 18 } = useReadContract({
    address: assetAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: !!assetAddress },
  });

  // User token balance
  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: assetAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!assetAddress && !!address },
  });

  // Allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: assetAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, POOL_RESERVE_ADDRESS] : undefined,
    query: { enabled: !!assetAddress && !!address },
  });

  // LP Shares of user
  const { data: lpShares, refetch: refetchLPShares } = useReadContract({
    address: POOL_RESERVE_ADDRESS,
    abi: POOL_RESERVE_ABI,
    functionName: "lpSharesOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Total LP Shares
  const { data: totalLPShares, refetch: refetchTotalLPShares } =
    useReadContract({
      address: POOL_RESERVE_ADDRESS,
      abi: POOL_RESERVE_ABI,
      functionName: "totalLPShares",
    });

  // LP Value of user
  const { data: lpValue, refetch: refetchLPValue } = useReadContract({
    address: POOL_RESERVE_ADDRESS,
    abi: POOL_RESERVE_ABI,
    functionName: "lpValueOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Total Collateral
  const { data: totalCollateral, refetch: refetchTotalCollateral } =
    useReadContract({
      address: POOL_RESERVE_ADDRESS,
      abi: POOL_RESERVE_ABI,
      functionName: "totalCollateral",
    });

  // Preview: shares user would get for deposit amount
  const depositAmountRaw = depositAmountStr
    ? parseUnits(depositAmountStr, decimals as number)
    : 0n;

  const { data: previewDepositShares } = useReadContract({
    address: POOL_RESERVE_ADDRESS,
    abi: POOL_RESERVE_ABI,
    functionName: "previewDepositLP",
    args: [depositAmountRaw],
    query: { enabled: depositAmountRaw > 0n },
  });

  // Preview: assets user would get for withdraw shares
  const withdrawSharesRaw = withdrawSharesStr
    ? parseUnits(withdrawSharesStr, decimals as number)
    : 0n;

  const { data: previewWithdrawAssets } = useReadContract({
    address: POOL_RESERVE_ADDRESS,
    abi: POOL_RESERVE_ABI,
    functionName: "previewWithdrawLP",
    args: [withdrawSharesRaw],
    query: { enabled: withdrawSharesRaw > 0n },
  });

  // ── Contract Writes ─────────────────────────────────────────────────────────

  const {
    writeContract: writeApprove,
    data: approveTxHash,
    isPending: isApproving,
  } = useWriteContract();
  const { isLoading: isWaitingApprove, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveTxHash });

  const {
    writeContract: writeDepositLP,
    data: depositLPTxHash,
    isPending: isDepositingLP,
  } = useWriteContract();
  const { isLoading: isWaitingDeposit, isSuccess: isDepositSuccess } =
    useWaitForTransactionReceipt({ hash: depositLPTxHash });

  const {
    writeContract: writeWithdrawLP,
    data: withdrawLPTxHash,
    isPending: isWithdrawingLP,
  } = useWriteContract();
  const { isLoading: isWaitingWithdraw, isSuccess: isWithdrawSuccess } =
    useWaitForTransactionReceipt({ hash: withdrawLPTxHash });

  // ── Computed ────────────────────────────────────────────────────────────────

  const needApproval =
    activeTab === "deposit" &&
    allowance !== undefined &&
    (allowance as bigint) < depositAmountRaw;

  // Share ownership %
  const sharePercent =
    lpShares && totalLPShares && (totalLPShares as bigint) > 0n
      ? (
          (Number(lpShares as bigint) / Number(totalLPShares as bigint)) *
          100
        ).toFixed(4)
      : "0.0000";

  // ── Refresh helper ──────────────────────────────────────────────────────────

  const refreshAll = useCallback(() => {
    refetchLPShares();
    refetchTotalLPShares();
    refetchLPValue();
    refetchTotalCollateral();
    refetchTokenBalance();
    refetchAllowance();
  }, [
    refetchLPShares,
    refetchTotalLPShares,
    refetchLPValue,
    refetchTotalCollateral,
    refetchTokenBalance,
    refetchAllowance,
  ]);

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
      toast.success("Approval successful!");
    }
  }, [isApproveSuccess, refetchAllowance]);

  useEffect(() => {
    if (isDepositSuccess) {
      toast.success("LP Deposit confirmed!");
      setDepositAmountStr("");
      refreshAll();
    }
  }, [isDepositSuccess, refreshAll]);

  useEffect(() => {
    if (isWithdrawSuccess) {
      toast.success("LP Withdrawal confirmed!");
      setWithdrawSharesStr("");
      refreshAll();
    }
  }, [isWithdrawSuccess, refreshAll]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDeposit = () => {
    if (!depositAmountStr || depositAmountRaw <= 0n) {
      return toast.error("Enter a valid token amount");
    }
    if (
      tokenBalance !== undefined &&
      (tokenBalance as bigint) < depositAmountRaw
    ) {
      return toast.error("Insufficient token balance");
    }

    if (needApproval) {
      writeApprove({
        address: assetAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [POOL_RESERVE_ADDRESS, maxUint256],
      });
    } else {
      writeDepositLP({
        address: POOL_RESERVE_ADDRESS,
        abi: POOL_RESERVE_ABI,
        functionName: "depositLP",
        args: [depositAmountRaw],
      });
    }
  };

  const handleWithdraw = () => {
    if (!withdrawSharesStr || withdrawSharesRaw <= 0n) {
      return toast.error("Enter a valid shares amount");
    }
    if (lpShares !== undefined && (lpShares as bigint) < withdrawSharesRaw) {
      return toast.error("Insufficient LP shares");
    }

    writeWithdrawLP({
      address: POOL_RESERVE_ADDRESS,
      abi: POOL_RESERVE_ABI,
      functionName: "withdrawLP",
      args: [withdrawSharesRaw],
    });
  };

  const handleMaxWithdraw = () => {
    if (lpShares) {
      setWithdrawSharesStr(formatUnits(lpShares as bigint, decimals as number));
    }
  };

  const handleMaxDeposit = () => {
    if (tokenBalance) {
      setDepositAmountStr(
        formatUnits(tokenBalance as bigint, decimals as number),
      );
    }
  };

  const isPendingDeposit =
    isApproving || isWaitingApprove || isDepositingLP || isWaitingDeposit;
  const isPendingWithdraw = isWithdrawingLP || isWaitingWithdraw;

  // ── Formatting helpers ──────────────────────────────────────────────────────

  const fmt = (val: bigint | undefined, dec: number, digits = 6) =>
    val !== undefined
      ? Number(formatUnits(val, dec)).toLocaleString(undefined, {
          maximumFractionDigits: digits,
        })
      : "—";

  const dec = decimals as number;

  return (
    <div
      className="min-h-screen xl:pl-[220px] 2xl:pl-64 flex flex-col pb-14 xl:pb-0 overflow-x-hidden relative"
      style={{
        background: "#080A0C",
        color: "#ffffff",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Subtle background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-20 pointer-events-none rounded-full blur-[100px]"
        style={{
          background: "radial-gradient(circle, #0847F7 0%, transparent 70%)",
        }}
      />
      <Header />
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-4xl mx-auto w-full relative z-10">
        {/* Page heading */}
        <div className="flex justify-between items-center mb-6 pt-4 lg:pt-0">
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "#ffffff" }}>
              LP Position
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "#d0d0d0" }}>
              Provide liquidity · earn yield from the pool
            </p>
          </div>
          <button
            onClick={refreshAll}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors px-3 py-1.5"
            style={{
              color: "#d0d0d0",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: "4px",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "#ffffff")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "#d0d0d0")
            }
          >
            <IconRefresh />
            Refresh
          </button>
        </div>

        {/* ── Position Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={<IconCoins />}
            label="Your Shares"
            value={fmt(lpShares as bigint | undefined, dec)}
            sub="LP shares owned"
            accent={!!(lpShares && (lpShares as bigint) > 0n)}
          />
          <StatCard
            icon={<IconTrendingUp />}
            label="Share Value"
            value={fmt(lpValue as bigint | undefined, dec)}
            sub="Tokens claimable"
          />
          <StatCard
            icon={<IconPieChart />}
            label="Pool Share"
            value={`${sharePercent}%`}
            sub="Of total LP shares"
          />
          <StatCard
            icon={<IconCoins />}
            label="Pool Total"
            value={fmt(totalCollateral as bigint | undefined, dec)}
            sub="All collateral in pool"
          />
        </div>

        {/* ── Action Panel ── */}
        <div className="max-w-xl mx-auto w-full overflow-hidden sci-card">
          {/* Tabs */}
          <div
            className="flex relative"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            {(["deposit", "withdraw"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setDepositAmountStr("");
                  setWithdrawSharesStr("");
                }}
                className={`flex-1 py-4 px-6 text-sm font-bold transition-all duration-300 capitalize relative overflow-hidden
                  ${activeTab === tab ? "text-white" : "text-[#a0a0a0] hover:text-[#d0d0d0]"}`}
              >
                {activeTab === tab && (
                  <div className="absolute inset-0 bg-linear-to-t from-[#0847F7]/20 to-transparent opacity-50"></div>
                )}
                <span className="relative z-10">{tab}</span>
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0847F7] animate-pulse">
                    <div className="absolute inset-0 bg-[#0847F7] blur-sm"></div>
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-5 relative">
            {/* Background elements inside the form */}
            <div className="absolute top-1/2 left-0 w-64 h-64 bg-[#0847F7] rounded-full blur-[120px] opacity-10 pointer-events-none -translate-y-1/2"></div>
            {/* ── DEPOSIT TAB ── */}
            {activeTab === "deposit" && (
              <>
                {/* Token amount input */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label
                      className="text-xs font-medium uppercase tracking-wider"
                      style={{ color: "#d0d0d0" }}
                    >
                      Amount (Tokens)
                    </label>
                    {tokenBalance !== undefined && (
                      <button
                        onClick={handleMaxDeposit}
                        className="text-xs font-mono transition-colors"
                        style={{ color: "#0847F7" }}
                      >
                        Max: {fmt(tokenBalance as bigint, dec)}
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    value={depositAmountStr}
                    onChange={(e) => setDepositAmountStr(e.target.value)}
                    placeholder="0.0"
                    min="0"
                    step="0.001"
                    className="w-full p-4 pl-5 text-xl font-bold font-mono outline-none transition-all duration-300 relative z-10"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "12px",
                      color: "#FFFFFF",
                    }}
                    onFocus={(e) => {
                      (e.target as HTMLElement).style.borderColor = "#0847F7";
                      (e.target as HTMLElement).style.boxShadow =
                        "0 0 0 3px rgba(8, 71, 247,0.2)";
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLElement).style.borderColor =
                        "rgba(255,255,255,0.08)";
                      (e.target as HTMLElement).style.boxShadow = "none";
                    }}
                  />

                  {depositAmountStr &&
                    depositAmountRaw > 0n &&
                    previewDepositShares !== undefined && (
                      <div className="mt-2 text-right">
                        <span
                          className="text-xs font-medium px-2.5 py-1"
                          style={{
                            color: "#0847F7",
                            background: "rgba(8, 71, 247,0.08)",
                            borderRadius: "4px",
                          }}
                        >
                          ≈ {fmt(previewDepositShares as bigint, dec)} shares
                          minted
                        </span>
                      </div>
                    )}
                </div>

                {isConnected && chain?.id !== sepolia.id ? (
                  <button
                    onClick={() => switchChain?.({ chainId: sepolia.id })}
                    disabled={isPendingSwitch}
                    className="w-full py-4 rounded-xl font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:scale-100 uppercase tracking-wider"
                    style={{ background: "#0847F7", color: "#ffffff" }}
                  >
                    {isPendingSwitch ? "Switching..." : "Switch to Sepolia"}
                  </button>
                ) : (
                  <button
                    onClick={handleDeposit}
                    disabled={!isConnected || isPendingDeposit}
                    className="w-full py-4 rounded-xl font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:scale-100 uppercase tracking-wider"
                    style={{ background: "#0847F7", color: "#ffffff" }}
                  >
                    {!isConnected
                      ? "Wallet Not Connected"
                      : isApproving || isWaitingApprove
                        ? "Approving…"
                        : isDepositingLP || isWaitingDeposit
                          ? "Depositing…"
                          : needApproval
                            ? "Approve Tokens"
                            : "Deposit LP"}
                  </button>
                )}
              </>
            )}

            {/* ── WITHDRAW TAB ── */}
            {activeTab === "withdraw" && (
              <>
                {/* Shares input */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label
                      className="text-xs font-medium uppercase tracking-wider"
                      style={{ color: "#d0d0d0" }}
                    >
                      Shares to Burn
                    </label>
                    {lpShares !== undefined && (
                      <button
                        onClick={handleMaxWithdraw}
                        className="text-xs font-mono"
                        style={{ color: "#0847F7" }}
                      >
                        Max: {fmt(lpShares as bigint, dec)}
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    value={withdrawSharesStr}
                    onChange={(e) => setWithdrawSharesStr(e.target.value)}
                    placeholder="0.0"
                    min="0"
                    step="0.000001"
                    className="w-full p-4 pl-5 text-xl font-bold font-mono outline-none transition-all duration-300 relative z-10"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "12px",
                      color: "#FFFFFF",
                    }}
                    onFocus={(e) => {
                      (e.target as HTMLElement).style.borderColor = "#0847F7";
                      (e.target as HTMLElement).style.boxShadow =
                        "0 0 0 3px rgba(8, 71, 247,0.2)";
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLElement).style.borderColor =
                        "rgba(255,255,255,0.08)";
                      (e.target as HTMLElement).style.boxShadow = "none";
                    }}
                  />

                  {withdrawSharesStr &&
                    withdrawSharesRaw > 0n &&
                    previewWithdrawAssets !== undefined && (
                      <div className="mt-2 text-right">
                        <span
                          className="text-xs font-medium px-2.5 py-1"
                          style={{
                            color: "#0847F7",
                            background: "rgba(55,91,210,0.08)",
                            borderRadius: "4px",
                          }}
                        >
                          ≈ {fmt(previewWithdrawAssets as bigint, dec)} tokens
                          returned
                        </span>
                      </div>
                    )}
                </div>

                {lpShares !== undefined &&
                  withdrawSharesRaw > 0n &&
                  (lpShares as bigint) < withdrawSharesRaw && (
                    <p
                      className="text-xs text-right"
                      style={{ color: "#F6465D" }}
                    >
                      Exceeds your LP shares balance
                    </p>
                  )}

                {isConnected && chain?.id !== sepolia.id ? (
                  <button
                    onClick={() => switchChain?.({ chainId: sepolia.id })}
                    disabled={isPendingSwitch}
                    className="w-full py-4 rounded-xl font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:scale-100 uppercase tracking-wider"
                    style={{ background: "#0847F7", color: "#ffffff" }}
                  >
                    {isPendingSwitch ? "Switching..." : "Switch to Sepolia"}
                  </button>
                ) : (
                  <button
                    onClick={handleWithdraw}
                    disabled={!isConnected || isPendingWithdraw}
                    className="w-full py-4 rounded-xl font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:scale-100 uppercase tracking-wider"
                    style={{ background: "#0847F7", color: "#ffffff" }}
                  >
                    {!isConnected
                      ? "Wallet Not Connected"
                      : isWithdrawingLP || isWaitingWithdraw
                        ? "Withdrawing…"
                        : "Withdraw LP"}
                  </button>
                )}
              </>
            )}

            {/* Info box */}
            <div
              className="p-4 rounded-xl relative z-10"
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <h3
                className="text-xs font-semibold mb-2 uppercase tracking-widest flex items-center gap-2"
                style={{ color: "#a0a0a0" }}
              >
                <IconInfo />
                How it works
              </h3>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "#d0d0d0" }}
              >
                {activeTab === "deposit"
                  ? "Deposit tokens to mint LP shares proportional to your contribution. Approve once, then deposit any amount."
                  : "Withdraw by burning LP shares. The contract calculates the proportional token amount to return."}
              </p>
            </div>
          </div>
        </div>

        {/* ── Pool Breakdown ── */}
        <div className="max-w-xl mx-auto w-full mt-4 p-4 sci-card">
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-4 flex items-center gap-2"
            style={{ color: "#d0d0d0" }}
          >
            <IconPieChart />
            Pool Breakdown
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              {
                label: "Total LP Shares",
                val: fmt(totalLPShares as bigint | undefined, dec),
                accent: false,
              },
              {
                label: "Total Collateral",
                val: fmt(totalCollateral as bigint | undefined, dec),
                accent: false,
              },
              {
                label: "Your Shares",
                val: fmt(lpShares as bigint | undefined, dec),
                accent: true,
              },
              {
                label: "Your Value",
                val: fmt(lpValue as bigint | undefined, dec),
                accent: true,
              },
            ].map(({ label, val, accent }) => (
              <div key={label}>
                <p className="text-xs mb-0.5" style={{ color: "#d0d0d0" }}>
                  {label}
                </p>
                <p
                  className="font-mono font-bold"
                  style={{ color: accent ? "#0847F7" : "#ffffff" }}
                >
                  {val}
                </p>
              </div>
            ))}
          </div>

          {totalLPShares !== undefined &&
            (totalLPShares as bigint) > 0n &&
            lpShares !== undefined && (
              <div className="mt-4">
                <div
                  className="flex justify-between text-xs mb-1.5"
                  style={{ color: "#d0d0d0" }}
                >
                  <span>Your pool share</span>
                  <span style={{ color: "#0847F7" }}>{sharePercent}%</span>
                </div>
                <div
                  className="h-1.5 overflow-hidden"
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "2px",
                  }}
                >
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${Math.min(parseFloat(sharePercent), 100)}%`,
                      background: "#0847F7",
                      borderRadius: "2px",
                    }}
                  />
                </div>
              </div>
            )}
        </div>
      </main>
    </div>
  );
};
