import React, { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
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
  <div
    className="flex items-start gap-3 p-4"
    style={{
      background: accent ? "rgba(55,91,210,0.06)" : "#1E2329",
      border: accent ? "1px solid rgba(55,91,210,0.25)" : "1px solid #2B3139",
      borderRadius: "4px",
    }}
  >
    <div
      className="shrink-0 p-2 rounded"
      style={{
        background: accent ? "rgba(55,91,210,0.12)" : "rgba(255,255,255,0.04)",
        color: accent ? "#375BD2" : "#848E9C",
      }}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <p
        className="text-xs font-medium uppercase tracking-wider mb-1"
        style={{ color: "#848E9C" }}
      >
        {label}
      </p>
      <p
        className="text-lg font-bold font-mono break-all"
        style={{ color: accent ? "#375BD2" : "#EAECEF" }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-0.5" style={{ color: "#474D57" }}>
          {sub}
        </p>
      )}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const LPView: React.FC = () => {
  const { address, isConnected } = useAccount();
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
      className="min-h-screen xl:pl-[220px] 2xl:pl-64 flex flex-col pb-14 xl:pb-0 overflow-x-hidden"
      style={{
        background: "#0B0E11",
        color: "#EAECEF",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <Header />
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-4xl mx-auto w-full">
        {/* Page heading */}
        <div className="flex justify-between items-center mb-6 pt-4 lg:pt-0">
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "#EAECEF" }}>
              LP Position
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "#848E9C" }}>
              Provide liquidity · earn yield from the pool
            </p>
          </div>
          <button
            onClick={refreshAll}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors px-3 py-1.5"
            style={{
              color: "#848E9C",
              background: "#1E2329",
              border: "1px solid #2B3139",
              borderRadius: "4px",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "#EAECEF")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "#848E9C")
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
        <div
          className="max-w-xl mx-auto w-full overflow-hidden"
          style={{
            background: "#1E2329",
            border: "1px solid #2B3139",
            borderRadius: "4px",
          }}
        >
          {/* Tabs */}
          <div className="flex" style={{ borderBottom: "1px solid #2B3139" }}>
            {(["deposit", "withdraw"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setDepositAmountStr("");
                  setWithdrawSharesStr("");
                }}
                className="flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 capitalize"
                style={{
                  color: activeTab === tab ? "#EAECEF" : "#474D57",
                  borderBottom:
                    activeTab === tab
                      ? "2px solid #375BD2"
                      : "2px solid transparent",
                  background: "transparent",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-5">
            {/* ── DEPOSIT TAB ── */}
            {activeTab === "deposit" && (
              <>
                {/* Token amount input */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label
                      className="text-xs font-medium uppercase tracking-wider"
                      style={{ color: "#848E9C" }}
                    >
                      Amount (Tokens)
                    </label>
                    {tokenBalance !== undefined && (
                      <button
                        onClick={handleMaxDeposit}
                        className="text-xs font-mono transition-colors"
                        style={{ color: "#375BD2" }}
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
                    className="w-full p-3.5 text-xl font-bold font-mono outline-none transition-colors"
                    style={{
                      background: "#2B3139",
                      border: "1px solid #363C45",
                      borderRadius: "4px",
                      color: "#EAECEF",
                    }}
                    onFocus={(e) =>
                      ((e.target as HTMLElement).style.borderColor = "#375BD2")
                    }
                    onBlur={(e) =>
                      ((e.target as HTMLElement).style.borderColor = "#363C45")
                    }
                  />

                  {depositAmountStr &&
                    depositAmountRaw > 0n &&
                    previewDepositShares !== undefined && (
                      <div className="mt-2 text-right">
                        <span
                          className="text-xs font-medium px-2.5 py-1"
                          style={{
                            color: "#375BD2",
                            background: "rgba(55,91,210,0.08)",
                            borderRadius: "4px",
                          }}
                        >
                          ≈ {fmt(previewDepositShares as bigint, dec)} shares
                          minted
                        </span>
                      </div>
                    )}
                </div>

                <button
                  onClick={handleDeposit}
                  disabled={!isConnected || isPendingDeposit}
                  className="w-full py-3.5 px-6 text-sm font-semibold tracking-wider uppercase transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background:
                      !isConnected || isPendingDeposit ? "#2B3139" : "#375BD2",
                    color:
                      !isConnected || isPendingDeposit ? "#474D57" : "#FFFFFF",
                    borderRadius: "4px",
                  }}
                  onMouseEnter={(e) => {
                    if (!(!isConnected || isPendingDeposit))
                      (e.currentTarget as HTMLElement).style.background =
                        "#2C4AB8";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      !isConnected || isPendingDeposit ? "#2B3139" : "#375BD2";
                  }}
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
                      style={{ color: "#848E9C" }}
                    >
                      Shares to Burn
                    </label>
                    {lpShares !== undefined && (
                      <button
                        onClick={handleMaxWithdraw}
                        className="text-xs font-mono"
                        style={{ color: "#375BD2" }}
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
                    className="w-full p-3.5 text-xl font-bold font-mono outline-none transition-colors"
                    style={{
                      background: "#2B3139",
                      border: "1px solid #363C45",
                      borderRadius: "4px",
                      color: "#EAECEF",
                    }}
                    onFocus={(e) =>
                      ((e.target as HTMLElement).style.borderColor = "#375BD2")
                    }
                    onBlur={(e) =>
                      ((e.target as HTMLElement).style.borderColor = "#363C45")
                    }
                  />

                  {withdrawSharesStr &&
                    withdrawSharesRaw > 0n &&
                    previewWithdrawAssets !== undefined && (
                      <div className="mt-2 text-right">
                        <span
                          className="text-xs font-medium px-2.5 py-1"
                          style={{
                            color: "#375BD2",
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

                <button
                  onClick={handleWithdraw}
                  disabled={!isConnected || isPendingWithdraw}
                  className="w-full py-3.5 px-6 text-sm font-semibold tracking-wider uppercase transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background:
                      !isConnected || isPendingWithdraw ? "#2B3139" : "#375BD2",
                    color:
                      !isConnected || isPendingWithdraw ? "#474D57" : "#FFFFFF",
                    borderRadius: "4px",
                  }}
                  onMouseEnter={(e) => {
                    if (!(!isConnected || isPendingWithdraw))
                      (e.currentTarget as HTMLElement).style.background =
                        "#2C4AB8";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      !isConnected || isPendingWithdraw ? "#2B3139" : "#375BD2";
                  }}
                >
                  {!isConnected
                    ? "Wallet Not Connected"
                    : isWithdrawingLP || isWaitingWithdraw
                      ? "Withdrawing…"
                      : "Withdraw LP"}
                </button>
              </>
            )}

            {/* Info box */}
            <div
              className="p-4 rounded"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid #2B3139",
              }}
            >
              <h3
                className="text-xs font-semibold mb-2 uppercase tracking-widest flex items-center gap-2"
                style={{ color: "#474D57" }}
              >
                <IconInfo />
                How it works
              </h3>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "#848E9C" }}
              >
                {activeTab === "deposit"
                  ? "Deposit tokens to mint LP shares proportional to your contribution. Approve once, then deposit any amount."
                  : "Withdraw by burning LP shares. The contract calculates the proportional token amount to return."}
              </p>
            </div>
          </div>
        </div>

        {/* ── Pool Breakdown ── */}
        <div
          className="max-w-xl mx-auto w-full mt-4 p-4"
          style={{
            background: "#1E2329",
            border: "1px solid #2B3139",
            borderRadius: "4px",
          }}
        >
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-4 flex items-center gap-2"
            style={{ color: "#848E9C" }}
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
                <p className="text-xs mb-0.5" style={{ color: "#848E9C" }}>
                  {label}
                </p>
                <p
                  className="font-mono font-bold"
                  style={{ color: accent ? "#375BD2" : "#EAECEF" }}
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
                  style={{ color: "#848E9C" }}
                >
                  <span>Your pool share</span>
                  <span style={{ color: "#375BD2" }}>{sharePercent}%</span>
                </div>
                <div
                  className="h-1.5 overflow-hidden"
                  style={{ background: "#2B3139", borderRadius: "2px" }}
                >
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${Math.min(parseFloat(sharePercent), 100)}%`,
                      background: "#375BD2",
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
