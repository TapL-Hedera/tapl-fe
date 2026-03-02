import React, { useState, useEffect } from "react";
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
import {
  paymentControllerDebugDeposit,
  paymentControllerRequestWithdrawal,
  paymentControllerGetActiveWithdrawalSession,
  paymentControllerDebugFinalizeWithdrawal,
} from "./services/queries";

// Conversion rate: 0.001 token = 1000 in-app balance
// => 1 token = 1,000,000 in-app balance
// => 1 in-app balance = 0.000001 token
const IN_APP_PER_TOKEN = 1_000_000;

export const WalletView: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

  // Deposit tab: token amount string
  const [depositAmountStr, setDepositAmountStr] = useState("");
  // Withdraw tab: in-app balance amount string
  const [withdrawInAppStr, setWithdrawInAppStr] = useState("");

  // Get asset address
  const { data: assetAddress } = useReadContract({
    address: POOL_RESERVE_ADDRESS,
    abi: POOL_RESERVE_ABI,
    functionName: "asset",
  });

  // Get asset info
  const { data: decimals = 18 } = useReadContract({
    address: assetAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: {
      enabled: !!assetAddress,
    },
  });

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: assetAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!assetAddress && !!address,
    },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: assetAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, POOL_RESERVE_ADDRESS] : undefined,
    query: {
      enabled: !!assetAddress && !!address,
    },
  });

  // Contract Writes
  const {
    writeContract: writeApprove,
    data: approveTxHash,
    isPending: isApproving,
  } = useWriteContract();
  const { isLoading: isWaitingApprove, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveTxHash });

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

  // --------------- Computed values ---------------

  // Deposit: token amount
  const depositTokenAmountRaw = depositAmountStr
    ? parseUnits(depositAmountStr, decimals as number)
    : 0n;
  const rawDepositAmount = depositAmountStr ? parseFloat(depositAmountStr) : 0;

  // Deposit: equivalent in-app balance display
  const depositInAppEquivalent = depositAmountStr
    ? (parseFloat(depositAmountStr) * IN_APP_PER_TOKEN).toLocaleString()
    : "0";

  // Withdraw: user inputs in-app balance
  const rawWithdrawInApp = withdrawInAppStr ? parseFloat(withdrawInAppStr) : 0;

  // Withdraw: convert in-app balance → token amount (for smart contract)
  // tokenAmount = inAppBalance / IN_APP_PER_TOKEN
  const withdrawTokenFloat = rawWithdrawInApp / IN_APP_PER_TOKEN;
  // Format to 18 decimals for parseUnits (avoid floating point issues with toFixed)
  const withdrawTokenStr = withdrawTokenFloat.toFixed(18);
  const withdrawTokenAmountRaw =
    rawWithdrawInApp > 0
      ? parseUnits(withdrawTokenStr, decimals as number)
      : 0n;

  // Withdraw: display equivalent token amount
  const withdrawTokenEquivalent =
    rawWithdrawInApp > 0 ? withdrawTokenFloat.toFixed(6) : "0";

  const needApproval =
    activeTab === "deposit" &&
    allowance !== undefined &&
    (allowance as bigint) < depositTokenAmountRaw;

  // --------------- Effect: approval success ---------------
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
      toast.success("Approval successful!");
    }
  }, [isApproveSuccess, refetchAllowance]);

  // --------------- Effect: deposit tx confirmed → call API ---------------
  useEffect(() => {
    const handleDepositApi = async () => {
      console.log("handleDepositApi");
      if (depositTxHash && depositTokenAmountRaw > 0n) {
        try {
          setIsSubmittingApi(true);

          const tokenAmountFloat = parseFloat(depositAmountStr);
          // Rate: 0.001 token = 1000 in-app balance → in-app balance = tokenAmount * 1,000,000
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
          toast.success("Deposit processed off-chain successfully!");
          refetchBalance();
          setDepositAmountStr("");
        } catch (error) {
          console.error("API error", error);
          toast.error("Transaction sent but API call failed.");
        } finally {
          setIsSubmittingApi(false);
        }
      }
    };
    if (depositTxHash) {
      handleDepositApi();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositTxHash]);

  // --------------- Effect: claim (withdraw) tx confirmed → finalize ---------------
  useEffect(() => {
    if (!isClaimSuccess || !claimTxHash) return;

    const handleFinalizeWithdrawal = async () => {
      try {
        setIsSubmittingApi(true);

        const token = localStorage.getItem("token");
        const authHeader = { Authorization: `Bearer ${token}` };

        // Step 3a: Get active withdrawal session to obtain sessionId
        const sessionResponse =
          await paymentControllerGetActiveWithdrawalSession({
            headers: authHeader,
          });
        console.log("sessionResponse: ", sessionResponse);

        // The session data is in sessionResponse.data (typed as void by generated code,
        // but at runtime it contains the actual object)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sessionData = sessionResponse as any as
          | { sessionId: string }
          | null
          | undefined;

        console.log("sessionId: ", sessionData?.sessionId);
        if (!sessionData?.sessionId) {
          toast.error("Could not retrieve withdrawal session ID.");
          return;
        }

        const sessionId = sessionData.sessionId;

        // Step 3b: Finalize withdrawal
        await paymentControllerDebugFinalizeWithdrawal(
          {
            sessionId,
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
        refetchBalance();
        setWithdrawInAppStr("");
      } catch (error) {
        console.error("Finalize withdrawal error", error);
        toast.error("On-chain claim sent but finalization failed.");
      } finally {
        setIsSubmittingApi(false);
      }
    };

    handleFinalizeWithdrawal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClaimSuccess, claimTxHash]);

  // --------------- Handlers ---------------

  const handleDeposit = async () => {
    if (!depositAmountStr || rawDepositAmount <= 0) {
      return toast.error("Enter a valid amount");
    }
    if ((balance as bigint) < depositTokenAmountRaw) {
      return toast.error("Insufficient balance");
    }

    if (needApproval) {
      writeApprove({
        address: assetAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [POOL_RESERVE_ADDRESS, maxUint256],
      });
    } else {
      writeDepositTrader({
        address: POOL_RESERVE_ADDRESS,
        abi: POOL_RESERVE_ABI,
        functionName: "depositTrader",
        args: [depositTokenAmountRaw],
      });
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawInAppStr || rawWithdrawInApp <= 0) {
      return toast.error("Enter a valid in-app balance amount");
    }

    const token = localStorage.getItem("token");
    const authHeader = { Authorization: `Bearer ${token}` };

    try {
      setIsSubmittingApi(true);

      // Step 1: Request withdrawal via API
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

    // Step 2: Call smart contract claimTrader with converted token amount
    writeClaimTrader({
      address: POOL_RESERVE_ADDRESS,
      abi: POOL_RESERVE_ABI,
      functionName: "claimTrader",
      args: [withdrawTokenAmountRaw],
    });
  };

  const isPending =
    isApproving ||
    isWaitingApprove ||
    isDepositingOnChain ||
    isClaimingTrader ||
    isWaitingClaim ||
    isSubmittingApi;

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
        <div className="flex items-center gap-3 mb-6 pt-4 lg:pt-0">
          <h1 className="text-lg font-semibold" style={{ color: "#EAECEF" }}>
            Wallet
          </h1>
          <span
            className="text-xs px-2 py-0.5 font-medium"
            style={{
              background: "rgba(55,91,210,0.1)",
              color: "#375BD2",
              borderRadius: "4px",
            }}
          >
            Testnet
          </span>
        </div>

        {/* Balance overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div
            className="p-4 rounded"
            style={{ background: "#1E2329", border: "1px solid #2B3139" }}
          >
            <p className="text-xs mb-1" style={{ color: "#848E9C" }}>
              On-Chain Token Balance
            </p>
            <p
              className="text-2xl font-bold font-mono"
              style={{ color: "#EAECEF" }}
            >
              {balance !== undefined
                ? Number(
                    formatUnits(balance as bigint, decimals as number),
                  ).toLocaleString(undefined, { maximumFractionDigits: 6 })
                : "—"}
            </p>
          </div>
          <div
            className="p-4 rounded"
            style={{ background: "#1E2329", border: "1px solid #2B3139" }}
          >
            <p className="text-xs mb-1" style={{ color: "#848E9C" }}>
              Conversion Rate
            </p>
            <p className="text-sm font-mono" style={{ color: "#EAECEF" }}>
              1 Token = 1,000,000 In-App
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#474D57" }}>
              0.001 token = 1000 in-app
            </p>
          </div>
        </div>

        <div
          className="rounded overflow-hidden"
          style={{ background: "#1E2329", border: "1px solid #2B3139" }}
        >
          {/* Tab switcher */}
          <div className="flex" style={{ borderBottom: "1px solid #2B3139" }}>
            {(["deposit", "withdraw"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setDepositAmountStr("");
                  setWithdrawInAppStr("");
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
            {/* ---- DEPOSIT TAB ---- */}
            {activeTab === "deposit" && (
              <>
                <div>
                  <div className="flex justify-between mb-2">
                    <label
                      className="text-xs font-medium uppercase tracking-wider"
                      style={{ color: "#848E9C" }}
                    >
                      Amount (Tokens)
                    </label>
                    {balance !== undefined && (
                      <span className="text-xs" style={{ color: "#848E9C" }}>
                        Wallet:{" "}
                        {formatUnits(balance as bigint, decimals as number)}
                      </span>
                    )}
                  </div>
                  <div className="relative">
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
                      onFocus={(e) => {
                        (e.target as HTMLElement).style.borderColor = "#375BD2";
                      }}
                      onBlur={(e) => {
                        (e.target as HTMLElement).style.borderColor = "#363C45";
                      }}
                    />
                  </div>

                  {depositAmountStr && parseFloat(depositAmountStr) > 0 && (
                    <div className="mt-2 text-right">
                      <span
                        className="text-xs font-medium px-2.5 py-1"
                        style={{
                          color: "#375BD2",
                          background: "rgba(55,91,210,0.08)",
                          borderRadius: "4px",
                        }}
                      >
                        ≈ {depositInAppEquivalent} In-App Balance
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleDeposit}
                  disabled={!isConnected || isPending}
                  className="w-full py-3.5 px-6 font-semibold tracking-wider uppercase transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                  style={{
                    background:
                      !isConnected || isPending ? "#2B3139" : "#375BD2",
                    color: !isConnected || isPending ? "#474D57" : "#FFFFFF",
                    borderRadius: "4px",
                  }}
                  onMouseEnter={(e) => {
                    if (!(!isConnected || isPending))
                      (e.currentTarget as HTMLElement).style.background =
                        "#2C4AB8";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      !isConnected || isPending ? "#2B3139" : "#375BD2";
                  }}
                >
                  {!isConnected
                    ? "Wallet Not Connected"
                    : isApproving || isWaitingApprove
                      ? "Approving..."
                      : isDepositingOnChain || isSubmittingApi
                        ? "Depositing..."
                        : needApproval
                          ? "Approve Tokens"
                          : "Deposit"}
                </button>
              </>
            )}

            {/* ---- WITHDRAW TAB ---- */}
            {activeTab === "withdraw" && (
              <>
                <div>
                  <div className="flex justify-between mb-2">
                    <label
                      className="text-xs font-medium uppercase tracking-wider"
                      style={{ color: "#848E9C" }}
                    >
                      In-App Balance
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={withdrawInAppStr}
                      onChange={(e) => setWithdrawInAppStr(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full p-3.5 text-xl font-bold font-mono outline-none transition-colors"
                      style={{
                        background: "#2B3139",
                        border: "1px solid #363C45",
                        borderRadius: "4px",
                        color: "#EAECEF",
                      }}
                      onFocus={(e) => {
                        (e.target as HTMLElement).style.borderColor = "#375BD2";
                      }}
                      onBlur={(e) => {
                        (e.target as HTMLElement).style.borderColor = "#363C45";
                      }}
                    />
                  </div>

                  {withdrawInAppStr && rawWithdrawInApp > 0 && (
                    <div className="mt-2 flex flex-col items-end gap-1">
                      <span
                        className="text-xs font-medium px-2.5 py-1"
                        style={{
                          color: "#375BD2",
                          background: "rgba(55,91,210,0.08)",
                          borderRadius: "4px",
                        }}
                      >
                        ≈ {withdrawTokenEquivalent} Tokens on-chain
                      </span>
                      <span className="text-xs" style={{ color: "#474D57" }}>
                        Rate: 1000 in-app = 0.001 token
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleWithdraw}
                  disabled={!isConnected || isPending}
                  className="w-full py-3.5 px-6 font-semibold tracking-wider uppercase transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                  style={{
                    background:
                      !isConnected || isPending ? "#2B3139" : "#375BD2",
                    color: !isConnected || isPending ? "#474D57" : "#FFFFFF",
                    borderRadius: "4px",
                  }}
                  onMouseEnter={(e) => {
                    if (!(!isConnected || isPending))
                      (e.currentTarget as HTMLElement).style.background =
                        "#2C4AB8";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      !isConnected || isPending ? "#2B3139" : "#375BD2";
                  }}
                >
                  {!isConnected
                    ? "Wallet Not Connected"
                    : isSubmittingApi
                      ? "Requesting..."
                      : isClaimingTrader
                        ? "Claiming On-Chain..."
                        : isWaitingClaim
                          ? "Confirming..."
                          : "Withdraw"}
                </button>
              </>
            )}

            <div
              className="mt-5 rounded p-4"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid #2B3139",
              }}
            >
              <h3
                className="text-xs font-semibold mb-2 uppercase tracking-widest flex items-center gap-2"
                style={{ color: "#474D57" }}
              >
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
                Information
              </h3>
              <p className="text-[#9c9994] text-xs leading-relaxed">
                Tokens deposited to the Pool Reserve will be updated on the
                backend. By design, 0.001 token = 1000 in-app balance.
                {activeTab === "withdraw"
                  ? " Enter your in-app balance to withdraw equivalent tokens from the pool."
                  : " Note: Withdrawing tokens from Trader balance relies on demo mockings. Off-chain state must be claimed through API for production."}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
