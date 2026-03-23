import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowDownLeft,
  ArrowDownUp,
  ArrowUpRight,
  CircleDollarSign,
  Coins,
  Droplets,
  RefreshCw,
  ShieldCheck,
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
import { hederaTestnet } from "./config/chains";
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

const IN_APP_PER_TOKEN = 10;
const NATIVE_SYMBOL = formatTokenSymbol(hederaTestnet.nativeCurrency.symbol);
const NATIVE_DECIMALS = hederaTestnet.nativeCurrency.decimals;
const ACCENT = "#2D84EB";
const SECONDARY = "#4F46E5";
const DEEP = "#00156E";
const SUCCESS = "#2EBD85";
const ACCENT_SOFT = "rgba(45, 132, 235, 0.14)";
const BORDER = "rgba(255, 255, 255, 0.11)";
const PANEL_BG =
  "linear-gradient(148deg, rgba(17, 20, 24, 0.94) 0%, rgba(10, 12, 15, 0.98) 100%)";
const TILE_BG =
  "linear-gradient(148deg, rgba(15, 18, 23, 0.94) 0%, rgba(9, 11, 14, 0.99) 100%)";
const SUBTLE_BG = "rgba(255, 255, 255, 0.04)";

type TabKey = "deposit" | "withdraw";

interface StatCardProps {
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

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5"
      style={{
        background: TILE_BG,
        border: `1px solid ${BORDER}`,
        boxShadow: "0 12px 28px rgba(0, 0, 0, 0.44)",
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(45, 132, 235, 0.36) 50%, transparent 100%)",
        }}
      />
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
        {label}
      </p>
      <p className="mt-2 text-[1.65rem] font-bold tracking-[-0.04em] text-white">
        {value}
      </p>
      {sub ? <p className="mt-1.5 text-xs text-white/55">{sub}</p> : null}
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
      className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold tracking-wide text-white transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
      style={{
        background: `linear-gradient(135deg, ${ACCENT} 0%, ${SECONDARY} 58%, ${DEEP} 100%)`,
        boxShadow: "0 10px 22px rgba(45, 132, 235, 0.28)",
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
  const { switchChainAsync, isPending: isPendingSwitch } = useSwitchChain();
  const [activeTab, setActiveTab] = useState<TabKey>("deposit");
  const [depositAmountStr, setDepositAmountStr] = useState("");
  const [withdrawInAppStr, setWithdrawInAppStr] = useState("");
  const pendingDepositAmountRef = useRef<string | null>(null);
  const handledDepositTxHashRef = useRef<string | null>(null);

  const { data: nativeBalance, refetch: refetchNativeBalance } = useBalance({
    address,
    chainId: hederaTestnet.id,
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
  const withdrawTokenAmountRaw = isValidWithdrawAmount
    ? parseUnits(withdrawTokenStr, NATIVE_DECIMALS)
    : 0n;
  const withdrawTokenEquivalent = isValidWithdrawAmount
    ? withdrawTokenFloat.toFixed(6)
    : "0";

  const refreshAll = useCallback(() => {
    refetchNativeBalance();
    refetchOffChainBalance();
  }, [refetchNativeBalance, refetchOffChainBalance]);

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

  const handleDeposit = async () => {
    const onHederaTestnet = await ensureHederaTestnet();
    if (!onHederaTestnet) return;

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
    const onHederaTestnet = await ensureHederaTestnet();
    if (!onHederaTestnet) return;

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

  const chainMismatch = isConnected && chain?.id !== hederaTestnet.id;
  const isInsufficientDeposit =
    depositTokenAmountRaw > (nativeBalance?.value ?? 0n);
  const isInsufficientWithdraw = rawWithdrawInApp > offChainBalance;

  const depositPending = isDepositingOnChain || isSubmittingApi;
  const withdrawPending = isSubmittingApi || isClaimingTrader || isWaitingClaim;
  const isDepositFlow = activeTab === "deposit";
  const fromAmount = isDepositFlow ? depositAmountStr : withdrawInAppStr;
  const toAmount = isDepositFlow
    ? depositInAppEquivalent
    : withdrawTokenEquivalent;
  const fromAsset = isDepositFlow ? NATIVE_SYMBOL : "APP";
  const toAsset = isDepositFlow ? "APP" : NATIVE_SYMBOL;
  const fromAssetBalance = isDepositFlow
    ? `${formatAmount(nativeBalance?.value, NATIVE_DECIMALS)} ${NATIVE_SYMBOL}`
    : `${formatCompactNumber(offChainBalance, 0)} APP`;
  const toAssetBalance = isDepositFlow
    ? `${formatCompactNumber(offChainBalance, 0)} APP`
    : `${formatAmount(nativeBalance?.value, NATIVE_DECIMALS)} ${NATIVE_SYMBOL}`;

  const activeRailLabel = useMemo(
    () =>
      activeTab === "deposit" ? "Chain → App balance" : "App balance → Chain",
    [activeTab],
  );

  const handleToggleDirection = () => {
    setActiveTab((current) => (current === "deposit" ? "withdraw" : "deposit"));
    setDepositAmountStr("");
    setWithdrawInAppStr("");
  };

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "Not connected";

  return (
    <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-5 sm:px-6 lg:px-10 lg:py-7">
      <div
        className="absolute left-[18%] top-5 h-[260px] w-[260px] rounded-full blur-[130px]"
        style={{
          background:
            "radial-gradient(circle, rgba(132,185,255,0.13) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute right-[11%] top-[26%] h-[220px] w-[220px] rounded-full blur-[110px]"
        style={{
          background:
            "radial-gradient(circle, rgba(45,132,235,0.1) 0%, transparent 72%)",
        }}
      />

      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full border"
            style={{
              borderColor: "rgba(45,132,235,0.3)",
              background: ACCENT_SOFT,
            }}
          >
            <Droplets size={18} style={{ color: ACCENT }} />
          </div>
          <div>
            <h1 className="text-[1.72rem] font-bold tracking-[-0.03em] text-white">
              Wallet Liquidity
            </h1>
            <p className="text-xs text-white/45">
              Deposit and withdraw between wallet and in-app balance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/55">
          <span
            className="rounded-md border px-2.5 py-1.5"
            style={{ borderColor: BORDER, background: SUBTLE_BG }}
          >
            {hederaTestnet.name}
          </span>
          <button
            type="button"
            onClick={refreshAll}
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-white/70 transition hover:text-white"
            style={{ borderColor: BORDER, background: SUBTLE_BG }}
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="On-Chain Balance"
          value={`${formatAmount(nativeBalance?.value, NATIVE_DECIMALS)} ${NATIVE_SYMBOL}`}
          sub="Native wallet balance"
        />
        <StatCard
          label="App Balance"
          value={formatCompactNumber(offChainBalance, 0)}
          sub="Available in app"
        />
        <StatCard
          label="Conversion"
          value={`1 ${NATIVE_SYMBOL} = ${IN_APP_PER_TOKEN.toLocaleString()} APP`}
          sub={activeRailLabel}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <div
            className="rounded-2xl p-5"
            style={{
              background: PANEL_BG,
              border: `1px solid ${BORDER}`,
              boxShadow: "0 18px 36px rgba(0, 0, 0, 0.45)",
            }}
          >
            <h3 className="text-lg font-semibold text-white">
              Wallet Overview
            </h3>
            <div className="mt-4 space-y-2">
              {[
                { label: "Wallet", value: shortAddress, icon: Wallet },
                {
                  label: "Current Network",
                  value: chain?.name ?? "Unknown",
                  icon: CircleDollarSign,
                },
                {
                  label: "Reserve Contract",
                  value: `${POOL_RESERVE_ADDRESS.slice(0, 8)}...${POOL_RESERVE_ADDRESS.slice(-6)}`,
                  icon: ShieldCheck,
                },
                { label: "Current Rail", value: activeRailLabel, icon: Coins },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                  style={{ borderColor: BORDER, background: SUBTLE_BG }}
                >
                  <span className="inline-flex items-center gap-2 text-xs text-white/62">
                    <Icon size={14} style={{ color: ACCENT }} />
                    {label}
                  </span>
                  <span className="text-xs text-white/80">{value}</span>
                </div>
              ))}
            </div>
            {chainMismatch ? (
              <p className="mt-3 text-xs text-[#ff8ca0]">
                Wrong network. Please switch to {hederaTestnet.name}.
              </p>
            ) : null}
          </div>
        </div>

        <div
          className="h-fit rounded-2xl p-5 lg:sticky lg:top-5"
          style={{
            background: PANEL_BG,
            border: `1px solid ${BORDER}`,
            boxShadow: "0 18px 38px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                Swap
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">
                {activeRailLabel}
              </h2>
            </div>
            <div
              className="rounded-md border px-2 py-1 text-xs text-white/70"
              style={{ borderColor: BORDER, background: SUBTLE_BG }}
            >
              {isConnected ? "Connected" : "Offline"}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div
              className="rounded-xl border p-3"
              style={{
                borderColor: BORDER,
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div className="flex items-center justify-between text-xs text-white/55">
                <span>From</span>
                <button
                  type="button"
                  onClick={isDepositFlow ? handleMaxDeposit : handleMaxWithdraw}
                  className="rounded-md border px-2 py-1 text-[11px] font-medium text-white/75 transition hover:text-white"
                  style={{ borderColor: BORDER, background: SUBTLE_BG }}
                >
                  Max
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step={isDepositFlow ? "0.001" : "1"}
                  value={fromAmount}
                  onChange={(event) =>
                    isDepositFlow
                      ? setDepositAmountStr(event.target.value)
                      : setWithdrawInAppStr(event.target.value)
                  }
                  placeholder="0"
                  className="min-w-0 flex-1 bg-transparent text-left text-3xl font-semibold tracking-tight text-white outline-none placeholder:text-white/25"
                />
                <span
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold"
                  style={{ borderColor: BORDER, background: SUBTLE_BG }}
                >
                  {isDepositFlow ? (
                    <Wallet size={13} style={{ color: ACCENT }} />
                  ) : (
                    <Coins size={13} style={{ color: ACCENT }} />
                  )}
                  {fromAsset}
                </span>
              </div>
              <p className="mt-2 text-xs text-white/55">
                Balance: {fromAssetBalance}
              </p>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleToggleDirection}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border text-white/70 transition hover:text-white"
                style={{ borderColor: BORDER, background: SUBTLE_BG }}
                aria-label="Switch swap direction"
              >
                <ArrowDownUp size={16} />
              </button>
            </div>

            <div
              className="rounded-xl border p-3"
              style={{
                borderColor: BORDER,
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div className="flex items-center justify-between text-xs text-white/55">
                <span>To (Estimated)</span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-3xl font-semibold tracking-tight text-white">
                  {toAmount}
                </p>
                <span
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold"
                  style={{ borderColor: BORDER, background: SUBTLE_BG }}
                >
                  {isDepositFlow ? (
                    <Coins size={13} style={{ color: ACCENT }} />
                  ) : (
                    <Wallet size={13} style={{ color: ACCENT }} />
                  )}
                  {toAsset}
                </span>
              </div>
              <p className="mt-2 text-xs text-white/55">
                Balance: {toAssetBalance}
              </p>
            </div>
          </div>

          {activeTab === "deposit" && isInsufficientDeposit ? (
            <p className="mt-3 text-right text-xs text-[#ff8ca0]">
              Deposit amount exceeds connected wallet balance.
            </p>
          ) : null}
          {activeTab === "withdraw" && isInsufficientWithdraw ? (
            <p className="mt-3 text-right text-xs text-[#ff8ca0]">
              Requested amount exceeds your in-app balance.
            </p>
          ) : null}

          <div className="mt-4">
            {chainMismatch ? (
              <ActionButton
                onClick={() =>
                  void switchChainAsync?.({ chainId: hederaTestnet.id })
                }
                disabled={isPendingSwitch}
                pending={isPendingSwitch}
                pendingLabel="SWITCHING NETWORK"
                idleLabel={`SWITCH TO ${hederaTestnet.name.toUpperCase()}`}
              />
            ) : activeTab === "deposit" ? (
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
          </div>
        </div>
      </section>
    </div>
  );
};
