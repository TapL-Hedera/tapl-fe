import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  Landmark,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  useAccount,
  useBalance,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { toast } from "react-hot-toast";
import { polkadotHubTestnet } from "./config/chains";
import { POOL_RESERVE_ADDRESS, POOL_RESERVE_ABI } from "./contracts/abi";
import {
  formatTokenSymbol,
  showTransactionSubmittedToast,
} from "./utils/chain";
import {
  paymentControllerDebugDeposit,
  paymentControllerDebugFinalizeWithdrawal,
  paymentControllerGetActiveWithdrawalSession,
  paymentControllerRequestWithdrawal,
  useAccountControllerGetBalance,
} from "./services/queries";

const IN_APP_PER_TOKEN = 1_000_000;
const NATIVE_SYMBOL = formatTokenSymbol(polkadotHubTestnet.nativeCurrency.symbol);
const NATIVE_DECIMALS = polkadotHubTestnet.nativeCurrency.decimals;
const ACCENT = "#f0b90b";
const ACCENT_SOFT = "rgba(240, 185, 11, 0.14)";
const BORDER = "rgba(255, 255, 255, 0.08)";

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
          "linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(11,11,11,0.96) 100%)",
        border: `1px solid ${BORDER}`,
        boxShadow: "0 24px 64px rgba(0, 0, 0, 0.34)",
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(240,185,11,0.4) 50%, transparent 100%)",
        }}
      />
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{
            background: ACCENT_SOFT,
            border: "1px solid rgba(240, 185, 11, 0.18)",
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
      className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold tracking-[0.16em] text-black transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        background:
          "linear-gradient(135deg, rgba(240,185,11,1) 0%, rgba(255,205,52,1) 100%)",
        boxShadow: "0 18px 40px rgba(240, 185, 11, 0.18)",
      }}
    >
      {pending && <RefreshCw size={15} className="animate-spin" />}
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

function formatCompactNumber(value: number, digits = 2) {
  return value.toLocaleString(undefined, {
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

export const WalletView: React.FC = () => {
  const { address, isConnected, chain } = useAccount();
  const { switchChain, isPending: isPendingSwitch } = useSwitchChain();
  const [activeTab, setActiveTab] = useState<TabKey>("deposit");
  const [depositAmountStr, setDepositAmountStr] = useState("");
  const [withdrawInAppStr, setWithdrawInAppStr] = useState("");
  const pendingDepositAmountRef = useRef<string | null>(null);
  const handledDepositTxHashRef = useRef<string | null>(null);

  const { data: nativeBalance, refetch: refetchNativeBalance } = useBalance({
    address,
    chainId: polkadotHubTestnet.id,
    query: { enabled: !!address },
  });

  const { data: offChainBalanceData, refetch: refetchOffChainBalance } =
    useAccountControllerGetBalance();
  const offChainBalance = Number(
    (offChainBalanceData as { free?: string } | undefined)?.free ?? 0,
  );

  const {
    writeContract: writeDepositTrader,
    data: depositTxHash,
    isPending: isDepositingOnChain,
  } = useWriteContract();

  const {
    writeContract: writeClaimTrader,
    data: claimTxHash,
    isPending: isClaimingTrader,
  } = useWriteContract();
  const { isLoading: isWaitingClaim, isSuccess: isClaimSuccess } =
    useWaitForTransactionReceipt({ hash: claimTxHash });

  const [isSubmittingApi, setIsSubmittingApi] = useState(false);

  const depositTokenAmountRaw = safeParseUnits(
    depositAmountStr,
    NATIVE_DECIMALS,
  );
  const rawDepositAmount = depositAmountStr
    ? Number.parseFloat(depositAmountStr)
    : 0;
  const isValidDepositAmount =
    Number.isFinite(rawDepositAmount) &&
    rawDepositAmount > 0 &&
    depositTokenAmountRaw > 0n;

  const depositInAppEquivalent = depositAmountStr
    ? formatCompactNumber(rawDepositAmount * IN_APP_PER_TOKEN, 0)
    : "0";

  const rawWithdrawInApp = withdrawInAppStr
    ? Number.parseFloat(withdrawInAppStr)
    : 0;
  const isValidWithdrawAmount =
    Number.isFinite(rawWithdrawInApp) && rawWithdrawInApp > 0;
  const withdrawTokenFloat = rawWithdrawInApp / IN_APP_PER_TOKEN;
  const withdrawTokenStr = withdrawTokenFloat.toFixed(18);
  const withdrawTokenAmountRaw =
    isValidWithdrawAmount
      ? parseUnits(withdrawTokenStr, NATIVE_DECIMALS)
      : 0n;
  const withdrawTokenEquivalent =
    isValidWithdrawAmount ? withdrawTokenFloat.toFixed(6) : "0";

  const refreshAll = useCallback(() => {
    refetchNativeBalance();
    refetchOffChainBalance();
  }, [refetchNativeBalance, refetchOffChainBalance]);

  useEffect(() => {
    if (!depositTxHash) return;

    showTransactionSubmittedToast({
      hash: depositTxHash,
      title: "Deposit transaction submitted",
      description: "Your wallet has broadcast the deposit transaction.",
    });
  }, [depositTxHash]);

  useEffect(() => {
    if (!claimTxHash) return;

    showTransactionSubmittedToast({
      hash: claimTxHash,
      title: "Withdrawal claim transaction submitted",
      description:
        "Your wallet has broadcast the withdrawal claim transaction.",
    });
  }, [claimTxHash]);

  useEffect(() => {
    const handleDepositApi = async () => {
      if (!depositTxHash || handledDepositTxHashRef.current === depositTxHash) {
        return;
      }

      const submittedAmountStr = pendingDepositAmountRef.current;
      const tokenAmountFloat = submittedAmountStr
        ? Number.parseFloat(submittedAmountStr)
        : NaN;

      if (!Number.isFinite(tokenAmountFloat) || tokenAmountFloat <= 0) {
        pendingDepositAmountRef.current = null;
        handledDepositTxHashRef.current = depositTxHash;
        return;
      }

      handledDepositTxHashRef.current = depositTxHash;

      try {
        setIsSubmittingApi(true);

        const apiAmount = Math.floor(
          tokenAmountFloat * IN_APP_PER_TOKEN,
        ).toString();

        const token = localStorage.getItem("token");

        await paymentControllerDebugDeposit(
          {
            amount: apiAmount,
            txHash: depositTxHash,
            logIndex: 0,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        refreshAll();
        setDepositAmountStr("");
        pendingDepositAmountRef.current = null;
      } catch (error) {
        console.error("API error", error);
        toast.error("Transaction sent but API call failed.");
      } finally {
        setIsSubmittingApi(false);
      }
    };

    handleDepositApi();
  }, [depositTxHash, refreshAll]);

  useEffect(() => {
    if (!isClaimSuccess || !claimTxHash) return;

    const handleFinalizeWithdrawal = async () => {
      try {
        setIsSubmittingApi(true);

        const token = localStorage.getItem("token");
        const authHeader = { Authorization: `Bearer ${token}` };

        const sessionResponse =
          await paymentControllerGetActiveWithdrawalSession({
            headers: authHeader,
          });

        const sessionData = sessionResponse as unknown as
          | { sessionId: string }
          | null
          | undefined;

        if (!sessionData?.sessionId) {
          toast.error("Could not retrieve withdrawal session ID.");
          return;
        }

        await paymentControllerDebugFinalizeWithdrawal(
          {
            sessionId: sessionData.sessionId,
            txHash: claimTxHash,
            logIndex: 0,
          },
          {
            headers: {
              ...authHeader,
              "Content-Type": "application/json",
            },
          },
        );

        toast.success("Withdrawal finalized successfully!");
        refreshAll();
        setWithdrawInAppStr("");
      } catch (error) {
        console.error("Finalize withdrawal error", error);
        toast.error("On-chain claim sent but finalization failed.");
      } finally {
        setIsSubmittingApi(false);
      }
    };

    handleFinalizeWithdrawal();
  }, [claimTxHash, isClaimSuccess, refreshAll]);

  const handleDeposit = () => {
    if (!depositAmountStr || !isValidDepositAmount) {
      toast.error("Enter a valid amount");
      return;
    }

    if ((nativeBalance?.value ?? 0n) < depositTokenAmountRaw) {
      toast.error("Insufficient balance");
      return;
    }

    pendingDepositAmountRef.current = depositAmountStr;

    writeDepositTrader({
      address: POOL_RESERVE_ADDRESS,
      abi: POOL_RESERVE_ABI,
      functionName: "depositTrader",
      value: depositTokenAmountRaw,
    });
  };

  const handleWithdraw = async () => {
    if (!withdrawInAppStr || !isValidWithdrawAmount) {
      toast.error("Enter a valid in-app balance amount");
      return;
    }

    const token = localStorage.getItem("token");
    const authHeader = { Authorization: `Bearer ${token}` };

    try {
      setIsSubmittingApi(true);

      await paymentControllerRequestWithdrawal(
        { amount: withdrawInAppStr },
        { headers: { ...authHeader, "Content-Type": "application/json" } },
      );

      toast.success("Withdrawal request submitted. Processing on-chain...");
    } catch (error) {
      console.error("Request withdrawal error", error);
      toast.error("Failed to initiate withdrawal request.");
      setIsSubmittingApi(false);
      return;
    } finally {
      setIsSubmittingApi(false);
    }

    writeClaimTrader({
      address: POOL_RESERVE_ADDRESS,
      abi: POOL_RESERVE_ABI,
      functionName: "claimTrader",
      args: [withdrawTokenAmountRaw],
    });
  };

  const handleMaxDeposit = () => {
    if (!nativeBalance?.value) return;

    setDepositAmountStr(formatUnits(nativeBalance.value, NATIVE_DECIMALS));
  };

  const handleMaxWithdraw = () => {
    if (offChainBalance <= 0) return;

    setWithdrawInAppStr(offChainBalance.toString());
  };

  const chainMismatch = isConnected && chain?.id !== polkadotHubTestnet.id;
  const isInsufficientDeposit =
    depositTokenAmountRaw > (nativeBalance?.value ?? 0n);
  const isInsufficientWithdraw = rawWithdrawInApp > offChainBalance;

  const depositPending = isDepositingOnChain || isSubmittingApi;
  const withdrawPending = isSubmittingApi || isClaimingTrader || isWaitingClaim;

  const activeRailLabel = useMemo(
    () =>
      activeTab === "deposit" ? "Chain → App balance" : "App balance → Chain",
    [activeTab],
  );

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div
        className="absolute left-1/2 top-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{
          background:
            "radial-gradient(circle, rgba(240,185,11,0.16) 0%, transparent 72%)",
        }}
      />

      <section className="relative overflow-hidden rounded-[28px] border border-white/8 bg-[#0b0b0b]/95 px-6 py-6 shadow-[0_36px_90px_rgba(0,0,0,0.38)] lg:px-8">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{
                background: ACCENT_SOFT,
                color: ACCENT,
                border: "1px solid rgba(240, 185, 11, 0.2)",
              }}
            >
              <Sparkles size={13} />
              Wallet
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-[-0.05em] text-white md:text-5xl">
              Balance funding
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
              {polkadotHubTestnet.name}
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          icon={Wallet}
          label="On-Chain"
          value={`${formatAmount(nativeBalance?.value, NATIVE_DECIMALS)} ${NATIVE_SYMBOL}`}
          sub="Native wallet balance"
        />
        <MetricCard
          icon={Coins}
          label="App Balance"
          value={formatCompactNumber(offChainBalance, 0)}
          sub="Available for trading"
        />
        <MetricCard
          icon={Landmark}
          label="Conversion"
          value={`1 ${NATIVE_SYMBOL}`}
          sub={`${IN_APP_PER_TOKEN.toLocaleString()} in-app units`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <div
          className="relative overflow-hidden rounded-[28px] p-6 lg:p-7"
          style={{
            background:
              "linear-gradient(180deg, rgba(14,14,14,0.98) 0%, rgba(9,9,9,0.98) 100%)",
            border: `1px solid ${BORDER}`,
            boxShadow: "0 24px 70px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div
            className="absolute right-6 top-6 h-28 w-28 rounded-full blur-3xl"
            style={{ background: "rgba(240, 185, 11, 0.12)" }}
          />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Action
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-white">
                {activeTab === "deposit"
                  ? `Deposit ${NATIVE_SYMBOL}`
                  : `Withdraw ${NATIVE_SYMBOL}`}
              </h2>
            </div>
            <div
              className="inline-flex rounded-full border border-white/8 bg-white/4 p-1"
              role="tablist"
              aria-label="Wallet actions"
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
                      setWithdrawInAppStr("");
                    }}
                    className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition"
                    style={{
                      background: active ? ACCENT : "transparent",
                      color: active ? "#050505" : "rgba(255,255,255,0.58)",
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
                      Native amount
                    </label>
                    <p className="text-xs text-white/60">
                      Available{" "}
                      <span className="font-semibold text-white">
                        {formatAmount(nativeBalance?.value, NATIVE_DECIMALS)}{" "}
                        {NATIVE_SYMBOL}
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
                          border: "1px solid rgba(240, 185, 11, 0.18)",
                        }}
                      >
                        {NATIVE_SYMBOL}
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

                {depositTokenAmountRaw > 0n && (
                  <div
                    className="flex items-center justify-between rounded-[22px] px-4 py-4"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(240, 185, 11, 0.16)",
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
                          In-app balance credited
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      {depositInAppEquivalent}
                    </p>
                  </div>
                )}

                {isInsufficientDeposit && (
                  <p className="text-right text-xs text-[#f87171]">
                    Deposit amount exceeds the connected wallet balance.
                  </p>
                )}

                {chainMismatch ? (
                  <ActionButton
                    onClick={() =>
                      switchChain?.({ chainId: polkadotHubTestnet.id })
                    }
                    disabled={isPendingSwitch}
                    pending={isPendingSwitch}
                    pendingLabel="SWITCHING NETWORK"
                    idleLabel={`SWITCH TO ${polkadotHubTestnet.name.toUpperCase()}`}
                  />
                ) : (
                  <ActionButton
                    onClick={handleDeposit}
                    disabled={
                      !isConnected ||
                      depositPending ||
                      !isValidDepositAmount ||
                      isInsufficientDeposit
                    }
                    pending={depositPending}
                    pendingLabel="PROCESSING DEPOSIT"
                    idleLabel={
                      isConnected
                        ? `DEPOSIT ${NATIVE_SYMBOL}`
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
                      In-app amount
                    </label>
                    <p className="text-xs text-white/60">
                      Available{" "}
                      <span className="font-semibold text-white">
                        {formatCompactNumber(offChainBalance, 0)}
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
                      step="1"
                      value={withdrawInAppStr}
                      onChange={(event) =>
                        setWithdrawInAppStr(event.target.value)
                      }
                      placeholder="0"
                      className="min-w-0 flex-1 bg-transparent text-3xl font-bold tracking-[-0.04em] text-white outline-none placeholder:text-white/20"
                    />
                    <div className="flex items-center gap-2">
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

                {withdrawTokenAmountRaw > 0n && (
                  <div
                    className="flex items-center justify-between rounded-[22px] px-4 py-4"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(240, 185, 11, 0.16)",
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
                          Native amount returned on-chain
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      {withdrawTokenEquivalent} {NATIVE_SYMBOL}
                    </p>
                  </div>
                )}

                {isInsufficientWithdraw && (
                  <p className="text-right text-xs text-[#f87171]">
                    Requested amount exceeds your in-app balance.
                  </p>
                )}

                {chainMismatch ? (
                  <ActionButton
                    onClick={() =>
                      switchChain?.({ chainId: polkadotHubTestnet.id })
                    }
                    disabled={isPendingSwitch}
                    pending={isPendingSwitch}
                    pendingLabel="SWITCHING NETWORK"
                    idleLabel={`SWITCH TO ${polkadotHubTestnet.name.toUpperCase()}`}
                  />
                ) : (
                  <ActionButton
                    onClick={handleWithdraw}
                    disabled={
                      !isConnected ||
                      withdrawPending ||
                      !isValidWithdrawAmount ||
                      isInsufficientWithdraw
                    }
                    pending={withdrawPending}
                    pendingLabel="PROCESSING WITHDRAWAL"
                    idleLabel={
                      isConnected
                        ? `WITHDRAW ${NATIVE_SYMBOL}`
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
                "linear-gradient(180deg, rgba(16,16,16,0.98) 0%, rgba(10,10,10,0.98) 100%)",
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
                  value: `${POOL_RESERVE_ADDRESS.slice(0, 8)}...${POOL_RESERVE_ADDRESS.slice(-6)}`,
                },
                {
                  icon: Wallet,
                  title: "Current mode",
                  value: activeRailLabel,
                },
                {
                  icon: Coins,
                  title: "Convert rate",
                  value: `1000 APP = 0.001 ${NATIVE_SYMBOL}`,
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
                  <p className="text-sm text-white/60">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
