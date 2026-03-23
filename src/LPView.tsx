import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  Landmark,
  Percent,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  useAccount,
  useBalance,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { toast } from "react-hot-toast";
import { hederaTestnet } from "./config/chains";
import { POOL_RESERVE_ABI, POOL_RESERVE_ADDRESS } from "./contracts/abi";
import {
  formatTokenSymbol,
  showTransactionSubmittedToast,
} from "./utils/chain";

const ACCENT = "#2D84EB";
const DEEP = "#00156E";
const SECONDARY = "#4F46E5";
const ACCENT_SOFT = "rgba(45, 132, 235, 0.14)";
const BORDER = "rgba(255, 255, 255, 0.08)";
const NETWORK_LABEL = hederaTestnet.name;

type TabKey = "deposit" | "withdraw";

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}

interface ActionButtonProps {
  disabled?: boolean;
  onClick: () => void;
  pending?: boolean;
  pendingLabel: string;
  idleLabel: string;
}

function MetricCard({ icon: Icon, label, value, sub }: MetricCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-[22px] p-5"
      style={{
        background:
          "linear-gradient(165deg, rgba(15,21,39,0.95) 0%, rgba(8,11,22,0.98) 100%)",
        border: `1px solid ${BORDER}`,
        boxShadow: "0 24px 64px rgba(0, 0, 0, 0.34)",
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(45,132,235,0.4) 50%, transparent 100%)",
        }}
      />
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{
            background: ACCENT_SOFT,
            border: "1px solid rgba(45, 132, 235, 0.18)",
            color: ACCENT,
          }}
        >
          <Icon size={18} />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
            {label}
          </p>
          {sub ? <p className="mt-1 text-[13px] text-white/70">{sub}</p> : null}
        </div>
      </div>
      <p className="text-[1.85rem] font-bold tracking-[-0.04em] text-white">
        {value}
      </p>
    </div>
  );
}

function ActionButton({
  disabled,
  onClick,
  pending,
  pendingLabel,
  idleLabel,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold tracking-[0.16em] text-white transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        background:
          `linear-gradient(135deg, ${ACCENT} 0%, ${SECONDARY} 58%, ${DEEP} 100%)`,
        boxShadow: "0 18px 40px rgba(45, 132, 235, 0.24)",
      }}
    >
      {pending ? <RefreshCw size={15} className="animate-spin" /> : null}
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

function formatAmount(
  value: bigint | undefined,
  decimals: number,
  digits = 4,
  fallback = "—",
) {
  if (value === undefined) return fallback;

  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function safeParseUnits(value: string, decimals: number) {
  if (!value) return 0n;

  try {
    return parseUnits(value, decimals);
  } catch {
    return 0n;
  }
}

function truncateAddress(value: string | undefined) {
  if (!value) return "Loading...";
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export const LPView: React.FC = () => {
  const { address, isConnected, chain } = useAccount();
  const { switchChainAsync, isPending: isPendingSwitch } = useSwitchChain();
  const [activeTab, setActiveTab] = useState<TabKey>("deposit");
  const [depositAmountStr, setDepositAmountStr] = useState("");
  const [withdrawSharesStr, setWithdrawSharesStr] = useState("");

  const { data: nativeBalance, refetch: refetchNativeBalance } = useBalance({
    address,
    chainId: hederaTestnet.id,
    query: { enabled: !!address },
  });

  const { data: lpShares, refetch: refetchLPShares } = useReadContract({
    address: POOL_RESERVE_ADDRESS,
    abi: POOL_RESERVE_ABI,
    functionName: "lpSharesOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: totalLPShares, refetch: refetchTotalLPShares } =
    useReadContract({
      address: POOL_RESERVE_ADDRESS,
      abi: POOL_RESERVE_ABI,
      functionName: "totalLPShares",
    });

  const { data: lpValue, refetch: refetchLPValue } = useReadContract({
    address: POOL_RESERVE_ADDRESS,
    abi: POOL_RESERVE_ABI,
    functionName: "lpValueOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: totalCollateral, refetch: refetchTotalCollateral } =
    useReadContract({
      address: POOL_RESERVE_ADDRESS,
      abi: POOL_RESERVE_ABI,
      functionName: "totalCollateral",
    });

  const parsedDecimals =
    nativeBalance?.decimals ?? chain?.nativeCurrency.decimals ?? 18;
  const assetSymbolLabel = formatTokenSymbol(
    nativeBalance?.symbol ??
      chain?.nativeCurrency.symbol ??
      hederaTestnet.nativeCurrency.symbol,
  );
  const networkName = chain?.name ?? NETWORK_LABEL;

  const depositAmountRaw = safeParseUnits(depositAmountStr, parsedDecimals);
  const withdrawSharesRaw = safeParseUnits(withdrawSharesStr, parsedDecimals);

  const rawDepositAmount = Number.parseFloat(depositAmountStr);
  const rawWithdrawShares = Number.parseFloat(withdrawSharesStr);

  const { data: previewDepositShares } = useReadContract({
    address: POOL_RESERVE_ADDRESS,
    abi: POOL_RESERVE_ABI,
    functionName: "previewDepositLP",
    args: [depositAmountRaw],
    query: { enabled: depositAmountRaw > 0n },
  });

  const { data: previewWithdrawAssets } = useReadContract({
    address: POOL_RESERVE_ADDRESS,
    abi: POOL_RESERVE_ABI,
    functionName: "previewWithdrawLP",
    args: [withdrawSharesRaw],
    query: { enabled: withdrawSharesRaw > 0n },
  });

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

  const sharePercent =
    lpShares && totalLPShares && (totalLPShares as bigint) > 0n
      ? (
          (Number(lpShares as bigint) / Number(totalLPShares as bigint)) *
          100
        ).toFixed(4)
      : "0.0000";

  const refreshAll = useCallback(() => {
    refetchLPShares();
    refetchTotalLPShares();
    refetchLPValue();
    refetchTotalCollateral();
    refetchNativeBalance();
  }, [
    refetchLPValue,
    refetchLPShares,
    refetchNativeBalance,
    refetchTotalCollateral,
    refetchTotalLPShares,
  ]);

  const ensureHederaTestnet = useCallback(async () => {
    if (!isConnected) {
      toast.error("Connect wallet to continue.");
      return false;
    }

    if (chain?.id === hederaTestnet.id) {
      return true;
    }

    if (!switchChainAsync) {
      toast.error(`Switch to ${hederaTestnet.name} to continue.`);
      return false;
    }

    try {
      await switchChainAsync({ chainId: hederaTestnet.id });
      return true;
    } catch (error) {
      console.error("Network switch failed", error);
      toast.error(`Please switch to ${hederaTestnet.name} before continuing.`);
      return false;
    }
  }, [chain?.id, isConnected, switchChainAsync]);

  useEffect(() => {
    if (!depositLPTxHash) return;

    showTransactionSubmittedToast({
      hash: depositLPTxHash,
      title: "LP deposit transaction submitted",
      description: `Your LP deposit is on the way to ${NETWORK_LABEL}.`,
    });
  }, [depositLPTxHash]);

  useEffect(() => {
    if (!withdrawLPTxHash) return;

    showTransactionSubmittedToast({
      hash: withdrawLPTxHash,
      title: "LP withdrawal transaction submitted",
      description: `Your LP withdrawal is on the way to ${NETWORK_LABEL}.`,
    });
  }, [withdrawLPTxHash]);

  useEffect(() => {
    if (!isDepositSuccess) return;

    toast.success("LP deposit confirmed!");
    setDepositAmountStr("");
    refreshAll();
  }, [isDepositSuccess, refreshAll]);

  useEffect(() => {
    if (!isWithdrawSuccess) return;

    toast.success("LP withdrawal confirmed!");
    setWithdrawSharesStr("");
    refreshAll();
  }, [isWithdrawSuccess, refreshAll]);

  const handleDeposit = async () => {
    const onHederaTestnet = await ensureHederaTestnet();
    if (!onHederaTestnet) return;

    if (!depositAmountStr || depositAmountRaw <= 0n) {
      toast.error("Enter a valid token amount");
      return;
    }

    if ((nativeBalance?.value ?? 0n) < depositAmountRaw) {
      toast.error("Insufficient token balance");
      return;
    }

    writeDepositLP({
      address: POOL_RESERVE_ADDRESS,
      abi: POOL_RESERVE_ABI,
      functionName: "depositLP",
      value: depositAmountRaw,
    });
  };

  const handleWithdraw = async () => {
    const onHederaTestnet = await ensureHederaTestnet();
    if (!onHederaTestnet) return;

    if (!withdrawSharesStr || withdrawSharesRaw <= 0n) {
      toast.error("Enter a valid shares amount");
      return;
    }

    if (lpShares !== undefined && (lpShares as bigint) < withdrawSharesRaw) {
      toast.error("Insufficient LP shares");
      return;
    }

    writeWithdrawLP({
      address: POOL_RESERVE_ADDRESS,
      abi: POOL_RESERVE_ABI,
      functionName: "withdrawLP",
      args: [withdrawSharesRaw],
    });
  };

  const handleMaxDeposit = () => {
    if (!nativeBalance?.value) return;

    setDepositAmountStr(formatUnits(nativeBalance.value, parsedDecimals));
  };

  const handleMaxWithdraw = () => {
    if (!lpShares) return;

    setWithdrawSharesStr(formatUnits(lpShares as bigint, parsedDecimals));
  };

  const chainMismatch = isConnected && chain?.id !== hederaTestnet.id;
  const isPendingDeposit = isDepositingLP || isWaitingDeposit;
  const isPendingWithdraw = isWithdrawingLP || isWaitingWithdraw;
  const isInsufficientDeposit = depositAmountRaw > (nativeBalance?.value ?? 0n);
  const isInsufficientWithdraw = withdrawSharesRaw > (lpShares ?? 0n);
  const currentModeLabel =
    activeTab === "deposit"
      ? `${assetSymbolLabel} -> LP shares`
      : `LP shares -> ${assetSymbolLabel}`;

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div
        className="absolute left-1/2 top-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{
          background:
            "radial-gradient(circle, rgba(45,132,235,0.16) 0%, transparent 72%)",
        }}
      />
      <div
        className="absolute right-[-120px] top-[24%] h-[320px] w-[320px] rounded-full blur-[130px]"
        style={{
          background:
            "radial-gradient(circle, rgba(79,70,229,0.14) 0%, transparent 72%)",
        }}
      />

      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(15,21,39,0.95)_0%,rgba(8,11,22,0.98)_100%)] px-6 py-6 shadow-[0_36px_90px_rgba(0,0,0,0.38)] lg:px-8">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{
                background: ACCENT_SOFT,
                color: ACCENT,
                border: "1px solid rgba(45, 132, 235, 0.2)",
              }}
            >
              <Sparkles size={13} />
              Liquidity Pool
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-[-0.05em] text-white md:text-5xl">
              Manage reserve LP position
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
              {networkName}
            </div>
            <button
              type="button"
              onClick={refreshAll}
              className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/[0.06] hover:text-white"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Coins}
          label="Your Shares"
          value={formatAmount(lpShares as bigint | undefined, parsedDecimals)}
          sub="LP shares owned"
        />
        <MetricCard
          icon={Landmark}
          label="Share Value"
          value={`${formatAmount(lpValue as bigint | undefined, parsedDecimals)} ${assetSymbolLabel}`}
          sub="Underlying asset equivalent"
        />
        <MetricCard
          icon={Percent}
          label="Pool Share"
          value={`${sharePercent}%`}
          sub="Ownership of total LP supply"
        />
        <MetricCard
          icon={Wallet}
          label="Pool Total"
          value={`${formatAmount(totalCollateral as bigint | undefined, parsedDecimals)} ${assetSymbolLabel}`}
          sub="Collateral held in reserve"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <div
          className="relative overflow-hidden rounded-[28px] p-6 lg:p-7"
          style={{
            background:
              "linear-gradient(165deg, rgba(15,21,39,0.95) 0%, rgba(8,11,22,0.98) 100%)",
            border: `1px solid ${BORDER}`,
            boxShadow: "0 24px 70px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div
            className="absolute right-6 top-6 h-28 w-28 rounded-full blur-3xl"
            style={{ background: "rgba(45, 132, 235, 0.12)" }}
          />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Action
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-white">
                {activeTab === "deposit"
                  ? `Deposit ${assetSymbolLabel}`
                  : `Withdraw ${assetSymbolLabel}`}
              </h2>
            </div>
            <div
              className="inline-flex rounded-full border border-white/8 bg-white/4 p-1"
              role="tablist"
              aria-label="Liquidity actions"
            >
              {(["deposit", "withdraw"] as const).map((tab) => {
                const active = activeTab === tab;

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab);
                      setDepositAmountStr("");
                      setWithdrawSharesStr("");
                    }}
                    className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition"
                    style={{
                      background: active ? ACCENT : "transparent",
                      color: active ? "#ffffff" : "rgba(255,255,255,0.58)",
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative z-10 mt-8 space-y-6">
            {activeTab === "deposit" ? (
              <>
                <div>
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                      Asset amount
                    </label>
                    <p className="text-xs text-white/60">
                      Available{" "}
                      <span className="font-semibold text-white">
                        {formatAmount(nativeBalance?.value, parsedDecimals)}{" "}
                        {assetSymbolLabel}
                      </span>
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-3 rounded-[24px] px-5 py-4"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={depositAmountStr}
                      onChange={(event) =>
                        setDepositAmountStr(event.target.value)
                      }
                      placeholder="0.00"
                      className="min-w-0 flex-1 bg-transparent text-3xl font-bold tracking-[-0.04em] text-white outline-none placeholder:text-white/20"
                    />
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
                        style={{
                          background: ACCENT_SOFT,
                          color: ACCENT,
                          border: "1px solid rgba(45, 132, 235, 0.18)",
                        }}
                      >
                        {assetSymbolLabel}
                      </span>
                      <button
                        type="button"
                        onClick={handleMaxDeposit}
                        className="rounded-full border border-white/8 bg-white/4 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70 transition hover:bg-white/7 hover:text-white"
                      >
                        Max
                      </button>
                    </div>
                  </div>
                </div>

                {depositAmountRaw > 0n && previewDepositShares !== undefined ? (
                  <div
                    className="flex items-center justify-between rounded-[22px] px-4 py-4"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(45, 132, 235, 0.16)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-2xl"
                        style={{
                          background: ACCENT_SOFT,
                          color: ACCENT,
                        }}
                      >
                        <ArrowUpRight size={16} />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                          Preview
                        </p>
                        <p className="mt-1 text-sm text-white/65">
                          Estimated LP shares minted
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      {formatAmount(
                        previewDepositShares as bigint | undefined,
                        parsedDecimals,
                        6,
                      )}{" "}
                      LP
                    </p>
                  </div>
                ) : null}

                {isInsufficientDeposit ? (
                  <p className="text-right text-xs text-[#f87171]">
                    Deposit amount exceeds the available wallet balance.
                  </p>
                ) : null}

                {chainMismatch ? (
                  <ActionButton
                    onClick={() =>
                      void switchChainAsync?.({ chainId: hederaTestnet.id })
                    }
                    disabled={isPendingSwitch}
                    pending={isPendingSwitch}
                    pendingLabel="SWITCHING NETWORK"
                    idleLabel={`SWITCH TO ${NETWORK_LABEL.toUpperCase()}`}
                  />
                ) : (
                  <ActionButton
                    onClick={handleDeposit}
                    disabled={
                      !isConnected ||
                      isPendingDeposit ||
                      !Number.isFinite(rawDepositAmount) ||
                      rawDepositAmount <= 0 ||
                      isInsufficientDeposit
                    }
                    pending={isPendingDeposit}
                    pendingLabel="PROCESSING DEPOSIT"
                    idleLabel={
                      isConnected
                        ? `DEPOSIT ${assetSymbolLabel}`
                        : "CONNECT WALLET TO DEPOSIT"
                    }
                  />
                )}
              </>
            ) : (
              <>
                <div>
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                      LP shares
                    </label>
                    <p className="text-xs text-white/60">
                      Available{" "}
                      <span className="font-semibold text-white">
                        {formatAmount(
                          lpShares as bigint | undefined,
                          parsedDecimals,
                          6,
                        )}{" "}
                        LP
                      </span>
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-3 rounded-[24px] px-5 py-4"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.000001"
                      value={withdrawSharesStr}
                      onChange={(event) =>
                        setWithdrawSharesStr(event.target.value)
                      }
                      placeholder="0.00"
                      className="min-w-0 flex-1 bg-transparent text-3xl font-bold tracking-[-0.04em] text-white outline-none placeholder:text-white/20"
                    />
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/8 bg-white/4 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                        LP
                      </span>
                      <button
                        type="button"
                        onClick={handleMaxWithdraw}
                        className="rounded-full border border-white/8 bg-white/4 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70 transition hover:bg-white/7 hover:text-white"
                      >
                        Max
                      </button>
                    </div>
                  </div>
                </div>

                {withdrawSharesRaw > 0n &&
                previewWithdrawAssets !== undefined ? (
                  <div
                    className="flex items-center justify-between rounded-[22px] px-4 py-4"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(45, 132, 235, 0.16)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-2xl"
                        style={{
                          background: ACCENT_SOFT,
                          color: ACCENT,
                        }}
                      >
                        <ArrowDownLeft size={16} />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                          Preview
                        </p>
                        <p className="mt-1 text-sm text-white/65">
                          Estimated asset returned
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      {formatAmount(
                        previewWithdrawAssets as bigint | undefined,
                        parsedDecimals,
                        6,
                      )}{" "}
                      {assetSymbolLabel}
                    </p>
                  </div>
                ) : null}

                {isInsufficientWithdraw ? (
                  <p className="text-right text-xs text-[#f87171]">
                    Requested shares exceed your LP balance.
                  </p>
                ) : null}

                {chainMismatch ? (
                  <ActionButton
                    onClick={() =>
                      void switchChainAsync?.({ chainId: hederaTestnet.id })
                    }
                    disabled={isPendingSwitch}
                    pending={isPendingSwitch}
                    pendingLabel="SWITCHING NETWORK"
                    idleLabel={`SWITCH TO ${NETWORK_LABEL.toUpperCase()}`}
                  />
                ) : (
                  <ActionButton
                    onClick={handleWithdraw}
                    disabled={
                      !isConnected ||
                      isPendingWithdraw ||
                      !Number.isFinite(rawWithdrawShares) ||
                      rawWithdrawShares <= 0 ||
                      isInsufficientWithdraw
                    }
                    pending={isPendingWithdraw}
                    pendingLabel="PROCESSING WITHDRAWAL"
                    idleLabel={
                      isConnected
                        ? `WITHDRAW ${assetSymbolLabel}`
                        : "CONNECT WALLET TO WITHDRAW"
                    }
                  />
                )}
              </>
            )}
          </div>
        </div>

        <div>
          <div
            className="rounded-[28px] p-6"
            style={{
              background:
                "linear-gradient(165deg, rgba(15,21,39,0.95) 0%, rgba(8,11,22,0.98) 100%)",
              border: `1px solid ${BORDER}`,
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
              Rail
            </p>
            <div className="mt-5 space-y-3">
              {[
                {
                  icon: ShieldCheck,
                  title: "Reserve contract",
                  value: truncateAddress(POOL_RESERVE_ADDRESS),
                },
                {
                  icon: Coins,
                  title: "Native asset",
                  value: `${assetSymbolLabel}`,
                },
                {
                  icon: Landmark,
                  title: "Current mode",
                  value: currentModeLabel,
                },
                {
                  icon: Wallet,
                  title: "Deposit rail",
                  value:
                    activeTab === "deposit"
                      ? "Native token transfer"
                      : "Burn LP shares",
                },
              ].map(({ icon: Icon, title, value }) => (
                <div
                  key={title}
                  className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-2xl"
                      style={{
                        background: ACCENT_SOFT,
                        color: ACCENT,
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                  </div>
                  <p className="text-right text-sm text-white/60">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
