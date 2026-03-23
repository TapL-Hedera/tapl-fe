import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Dialog, DialogPanel } from "@headlessui/react";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  X,
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import { BACKEND_URL } from "./constant";
import {
  getExplorerSearchUrl,
  getExplorerTopicMessagesUrl,
  getExplorerTxUrl,
} from "./utils/chain";

const ACCENT = "#2D84EB";
const SECONDARY = "#4F46E5";
const DEEP = "#00156E";
const BORDER = "rgba(255, 255, 255, 0.11)";
const PANEL_BG =
  "linear-gradient(148deg, rgba(17, 20, 24, 0.94) 0%, rgba(10, 12, 15, 0.98) 100%)";
const TILE_BG =
  "linear-gradient(148deg, rgba(15, 18, 23, 0.94) 0%, rgba(9, 11, 14, 0.99) 100%)";
const SOFT_TEXT = "rgba(226,232,240,0.72)";
const PAGE_SIZE = 10;

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

function formatMoney(value: string | number | undefined) {
  const amount =
    typeof value === "number" ? value : Number.parseFloat(value ?? "0");

  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string) {
  if (!value) return "Awaiting settlement";

  try {
    return format(new Date(value), "MMM d, yyyy · HH:mm:ss");
  } catch {
    return value;
  }
}

function formatAnchorTime(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${hours}:${minutes} ${day}/${month}`;
}

function shortHash(value?: string, head = 8, tail = 6) {
  if (!value) return "—";
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function getResponsePayload(data: unknown) {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data?: unknown }).data;
  }

  return data;
}

interface Order {
  id?: string;
  orderId?: string;
  order_id?: string;
  settledAt?: string;
  createdAt?: string;
  marketId?: string;
  rewardRate?: string | number;
  amount: string | number;
  settledWin?: boolean | null;
  status?: string;
}

interface OrderProofNode {
  position: string;
  hash: string;
}

interface OrderProof {
  orderId: string;
  batchId: string;
  leafHash: string;
  merkleRoot: string;
  proof: OrderProofNode[];
  verified: boolean;
  topicId?: string;
  sequenceNumber?: string;
  consensusTimestamp?: string;
  transactionHash?: string;
  txHash?: string;
}

function resolveOrderId(order: Order) {
  if (order.orderId) return order.orderId;
  if (order.id) return order.id;
  if (order.order_id) return order.order_id;
  return undefined;
}

function getOrderProofKeys(order: Order) {
  const keys = [order.orderId, order.id, order.order_id]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return [...new Set(keys)];
}

function isOrderSettled(order: Order) {
  const status = (order.status ?? "").toLowerCase();
  return (
    Boolean(order.settledAt) ||
    order.settledWin !== null ||
    status.includes("settled") ||
    status.includes("resolved") ||
    status.includes("complete")
  );
}

function isOrderStillAnchoring(order: Order) {
  const status = (order.status ?? "").toLowerCase();
  return (
    status.includes("pending") ||
    status.includes("processing") ||
    status.includes("anchoring")
  );
}

function normalizeOrders(payload: unknown): Order[] {
  if (Array.isArray(payload)) {
    return payload as Order[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    "items" in payload &&
    Array.isArray((payload as { items?: unknown }).items)
  ) {
    return (payload as { items: Order[] }).items;
  }

  return [];
}

function normalizeProof(payload: unknown): OrderProof | null {
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as Partial<OrderProof>;
  if (!candidate.orderId || !candidate.batchId) return null;

  return {
    orderId: candidate.orderId,
    batchId: candidate.batchId,
    leafHash: candidate.leafHash ?? "",
    merkleRoot: candidate.merkleRoot ?? "",
    proof: Array.isArray(candidate.proof) ? candidate.proof : [],
    verified: Boolean(candidate.verified),
    topicId: candidate.topicId,
    sequenceNumber: candidate.sequenceNumber,
    consensusTimestamp: candidate.consensusTimestamp,
    transactionHash: candidate.transactionHash,
    txHash: candidate.txHash,
  };
}

function isProofPendingError(error: unknown) {
  const fallbackMessage =
    error instanceof Error ? error.message.toLowerCase() : "";

  if (!axios.isAxiosError(error)) {
    return /(not ready|pending|processing|anchoring|not found|empty)/.test(
      fallbackMessage,
    );
  }

  const status = error.response?.status;
  if (status === 202 || status === 204 || status === 404 || status === 409) {
    return true;
  }

  const responseMessage = getResponsePayload(error.response?.data);
  const details =
    typeof responseMessage === "string"
      ? responseMessage.toLowerCase()
      : JSON.stringify(responseMessage ?? "").toLowerCase();

  return /(not ready|pending|processing|anchoring|not found|no proof|empty)/.test(
    `${details} ${fallbackMessage}`,
  );
}

export const HistoryView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  const [isProofOpen, setIsProofOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);
  const [proofData, setProofData] = useState<OrderProof | null>(null);
  const [proofButtonLoadingOrderId, setProofButtonLoadingOrderId] = useState<
    string | null
  >(null);
  const [pendingProofByOrderId, setPendingProofByOrderId] = useState<
    Record<string, boolean>
  >({});

  const fetchHistory = async (pageIdx: number) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const offset = pageIdx * PAGE_SIZE;
      const response = await axios.get(
        `${BACKEND_URL}/api/orders/user?limit=${PAGE_SIZE}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            accept: "*/*",
          },
        },
      );
      const payload = getResponsePayload(response.data);
      setOrders(normalizeOrders(payload));
    } catch (error) {
      console.error(error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  const fetchProof = useCallback(
    async (orderId: string, orderKeys: string[] = [orderId]) => {
      const targetKeys = orderKeys.length ? orderKeys : [orderId];

      setProofLoading(true);
      setProofError(null);
      setProofData(null);

      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${BACKEND_URL}/api/v1/hcs-anchor/orders/${encodeURIComponent(orderId)}/proof`,
          {
            headers: {
              accept: "*/*",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );

        const payload = normalizeProof(getResponsePayload(response.data));
        if (!payload) {
          throw new Error("Proof payload is empty or malformed.");
        }

        setProofData(payload);
        setPendingProofByOrderId((current) => {
          const hasAnyPending = targetKeys.some((key) => current[key]);
          if (!hasAnyPending) return current;

          const next = { ...current };
          targetKeys.forEach((key) => {
            delete next[key];
          });
          return next;
        });
      } catch (error) {
        console.error("Failed to load order proof", error);
        const isPending = isProofPendingError(error);
        const message = isPending
          ? "Proof is still anchoring on backend. Please try again shortly."
          : error instanceof Error
            ? error.message
            : "Failed to fetch proof for this order.";
        setProofError(message);
        setPendingProofByOrderId((current) => {
          if (isPending) {
            const next = { ...current };
            targetKeys.forEach((key) => {
              next[key] = true;
            });
            return next;
          }

          const hasAnyPending = targetKeys.some((key) => current[key]);
          if (!hasAnyPending) return current;

          const next = { ...current };
          targetKeys.forEach((key) => {
            delete next[key];
          });
          return next;
        });
      } finally {
        setProofLoading(false);
      }
    },
    [],
  );

  const openProof = useCallback(
    (order: Order) => {
      if (!isOrderSettled(order)) return;

      const orderId = resolveOrderId(order);
      if (!orderId) return;
      const orderProofKeys = getOrderProofKeys(order);

      setProofButtonLoadingOrderId(orderId);
      setSelectedOrderId(orderId);
      setIsProofOpen(true);
      void fetchProof(orderId, orderProofKeys).finally(() => {
        setProofButtonLoadingOrderId((current) =>
          current === orderId ? null : current,
        );
      });
    },
    [fetchProof],
  );

  const closeProof = () => {
    setIsProofOpen(false);
    setSelectedOrderId(null);
    setProofError(null);
    setProofData(null);
    setProofLoading(false);
  };

  const stats = useMemo(() => {
    const settled = orders.filter((order) => order.settledWin !== null);
    const wins = settled.filter((order) => order.settledWin === true).length;
    const pending = orders.filter((order) => order.settledWin == null).length;
    const totalVolume = orders.reduce((sum, order) => {
      const amount =
        typeof order.amount === "number"
          ? order.amount
          : Number.parseFloat(order.amount || "0");

      return sum + amount;
    }, 0);

    return {
      total: orders.length,
      settled: settled.length,
      winRate:
        settled.length > 0
          ? `${((wins / settled.length) * 100).toFixed(1)}%`
          : "0.0%",
      pending,
      volume: formatMoney(totalVolume),
    };
  }, [orders]);

  const hasNextPage = orders.length === PAGE_SIZE;
  const proofTxHash = proofData?.transactionHash ?? proofData?.txHash;
  const proofSearchHref = proofData?.topicId
    ? getExplorerTopicMessagesUrl(proofData.topicId)
    : proofData?.batchId
      ? getExplorerSearchUrl(proofData.batchId)
      : undefined;

  return (
    <>
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
                background: "rgba(45,132,235,0.14)",
              }}
            >
              <ScrollText size={18} style={{ color: ACCENT }} />
            </div>
            <div>
              <h1 className="text-[1.72rem] font-bold tracking-[-0.03em] text-white">
                Execution Journal
              </h1>
              <p className="text-xs text-white/45">
                Filled, settled, and pending orders in one stream
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-white/55">
            <span
              className="rounded-md border px-2.5 py-1.5"
              style={{
                borderColor: BORDER,
                background: "rgba(255,255,255,0.04)",
              }}
            >
              Page {page + 1}
            </span>
            <button
              type="button"
              onClick={() => fetchHistory(page)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-white/70 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                borderColor: BORDER,
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <RefreshCw size={12} className={cn(loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[290px_1fr]">
          <aside
            className="rounded-2xl p-5"
            style={{
              background: PANEL_BG,
              border: `1px solid ${BORDER}`,
              boxShadow: "0 18px 36px rgba(0, 0, 0, 0.45)",
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/46">
              Snapshot
            </p>

            <div className="mt-4 space-y-2.5">
              {[
                { label: "Orders", value: stats.total.toString() },
                { label: "Settled", value: stats.settled.toString() },
                { label: "Win rate", value: stats.winRate },
                { label: "Pending", value: stats.pending.toString() },
                { label: "Volume", value: stats.volume },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl px-3.5 py-3"
                  style={{
                    border: `1px solid ${BORDER}`,
                    background: TILE_BG,
                  }}
                >
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/58">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-white/10 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/46">
                Pagination
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={page === 0 || loading}
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    border: `1px solid ${BORDER}`,
                    background: "rgba(255,255,255,0.04)",
                    color: SOFT_TEXT,
                  }}
                >
                  <ChevronLeft size={13} />
                  Prev
                </button>
                <button
                  type="button"
                  disabled={!hasNextPage || loading}
                  onClick={() => setPage((value) => value + 1)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    background: `linear-gradient(135deg, ${ACCENT} 0%, ${SECONDARY} 58%, ${DEEP} 100%)`,
                    boxShadow: "0 10px 22px rgba(45,132,235,0.28)",
                  }}
                >
                  Next
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </aside>

          <div
            className="overflow-hidden rounded-2xl"
            style={{
              background: PANEL_BG,
              border: `1px solid ${BORDER}`,
              boxShadow: "0 18px 36px rgba(0, 0, 0, 0.45)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: `1px solid ${BORDER}` }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/46">
                Order Stream
              </p>
              <p className="text-xs uppercase tracking-[0.16em] text-white/52">
                {loading ? "Loading" : `${orders.length} rows`}
              </p>
            </div>

            {loading ? (
              <div className="flex min-h-[440px] flex-col items-center justify-center gap-4 text-white/60">
                <Loader2
                  className="h-8 w-8 animate-spin"
                  style={{ color: ACCENT }}
                />
                <p className="text-sm uppercase tracking-[0.18em]">
                  Loading order history
                </p>
              </div>
            ) : orders.length === 0 ? (
              <div className="flex min-h-[440px] items-center justify-center px-6">
                <div
                  className="w-full max-w-md rounded-2xl px-6 py-7 text-center"
                  style={{
                    border: `1px solid ${BORDER}`,
                    background: TILE_BG,
                  }}
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
                    No activity yet
                  </p>
                  <p className="mt-3 text-sm text-white/65">
                    No order history found for this wallet session.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 p-3 sm:p-4">
                {orders.map((order, index) => {
                  const orderId = resolveOrderId(order);
                  const orderProofKeys = getOrderProofKeys(order);
                  const isSettledOrder = isOrderSettled(order);
                  const isButtonLoading =
                    !!orderId && proofButtonLoadingOrderId === orderId;
                  const hasPendingProofFromError = orderProofKeys.some((key) =>
                    Boolean(pendingProofByOrderId[key]),
                  );
                  const isProofPending =
                    isSettledOrder &&
                    (isOrderStillAnchoring(order) || hasPendingProofFromError);
                  const statusVariant =
                    order.settledWin === true
                      ? {
                          label: "Win",
                          background: "rgba(46, 189, 133, 0.12)",
                          color: "#2EBD85",
                        }
                      : order.settledWin === false
                        ? {
                            label: "Lose",
                            background: "rgba(246, 70, 93, 0.12)",
                            color: "#F6465D",
                          }
                        : {
                            label: "Pending",
                            background: "rgba(148,163,184,0.12)",
                            color: "rgba(226,232,240,0.75)",
                          };

                  return (
                    <article
                      key={`${orderId ?? "order"}-${order.createdAt ?? index}`}
                      className="rounded-xl px-4 py-3.5 transition hover:border-[#2D84EB]/45"
                      style={{
                        border: `1px solid ${BORDER}`,
                        background:
                          index % 2 === 0 ? TILE_BG : "rgba(12, 16, 26, 0.95)",
                      }}
                    >
                      <div className="grid gap-3 md:grid-cols-[1.55fr_0.82fr_0.8fr_0.95fr_auto_auto] md:items-center">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.16em] text-white/46">
                            Settled Date
                          </p>
                          <p className="mt-1 text-sm text-white/78">
                            {formatDate(order.settledAt || order.createdAt)}
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-white/52">
                            Order ID: {shortHash(orderId, 10, 10)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-[0.16em] text-white/46">
                            Market
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {order.marketId || "BTCUSDT"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-[0.16em] text-white/46">
                            Reward
                          </p>
                          <p className="mt-1 font-mono text-sm text-white/82">
                            {order.rewardRate
                              ? `${Number(order.rewardRate).toFixed(3)}x`
                              : "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-[0.16em] text-white/46">
                            Amount
                          </p>
                          <p
                            className="mt-1 text-sm font-semibold"
                            style={{ color: "#8ec1ff" }}
                          >
                            {formatMoney(order.amount)}
                          </p>
                        </div>

                        <div className="md:justify-self-end">
                          <span
                            className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                            style={{
                              background: statusVariant.background,
                              color: statusVariant.color,
                              border: "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            {statusVariant.label}
                          </span>
                        </div>

                        <div className="md:justify-self-end">
                          {isSettledOrder ? (
                            <button
                              type="button"
                              onClick={() => openProof(order)}
                              disabled={
                                !orderId || isButtonLoading || isProofPending
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                              style={{
                                borderColor: "rgba(45,132,235,0.42)",
                                background:
                                  "linear-gradient(135deg, rgba(45,132,235,0.2) 0%, rgba(79,70,229,0.2) 100%)",
                              }}
                            >
                              {isButtonLoading || isProofPending ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <ShieldCheck size={12} />
                              )}
                              {isButtonLoading
                                ? "Checking"
                                : isProofPending
                                  ? "Anchoring"
                                  : "Proof"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <Dialog open={isProofOpen} onClose={closeProof} className="relative z-50">
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          aria-hidden
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(14,21,42,0.98)_0%,rgba(8,11,21,0.98)_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <button
              type="button"
              onClick={closeProof}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>

            <div className="border-b border-white/10 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
                HCS Merkle Proof
              </p>
              <h3 className="mt-2 text-xl font-bold text-white">
                {selectedOrderId
                  ? `Order ${shortHash(selectedOrderId, 12, 12)}`
                  : "Order proof"}
              </h3>
            </div>

            <div className="max-h-[72vh] overflow-y-auto px-5 py-4">
              {proofLoading ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-white/70">
                  <Loader2
                    className="h-7 w-7 animate-spin"
                    style={{ color: ACCENT }}
                  />
                  <p className="text-sm uppercase tracking-[0.16em]">
                    Loading merkle proof
                  </p>
                </div>
              ) : proofError ? (
                <div
                  className="rounded-xl px-4 py-4 text-sm"
                  style={{
                    border: "1px solid rgba(246, 70, 93, 0.4)",
                    background: "rgba(246, 70, 93, 0.1)",
                    color: "#fecaca",
                  }}
                >
                  {proofError}
                </div>
              ) : proofData ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                      style={{
                        background: proofData.verified
                          ? "rgba(46,189,133,0.14)"
                          : "rgba(246,70,93,0.14)",
                        color: proofData.verified ? "#2EBD85" : "#F87171",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {proofData.verified ? "Verified" : "Not verified"}
                    </span>
                    <span className="text-xs font-mono text-white/65">
                      Batch: {proofData.batchId}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div
                      className="rounded-xl px-3.5 py-3"
                      style={{
                        border: `1px solid ${BORDER}`,
                        background: TILE_BG,
                      }}
                    >
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/46">
                        Topic / Sequence
                      </p>
                      <p className="mt-1 font-mono text-xs text-white/84">
                        {proofData.topicId || "—"} /{" "}
                        {proofData.sequenceNumber || "—"}
                      </p>
                    </div>
                    <div
                      className="rounded-xl px-3.5 py-3"
                      style={{
                        border: `1px solid ${BORDER}`,
                        background: TILE_BG,
                      }}
                    >
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/46">
                        Consensus Time
                      </p>
                      <p className="mt-1 text-xs text-white/84">
                        {formatAnchorTime(proofData.consensusTimestamp)}
                      </p>
                    </div>
                  </div>

                  <div
                    className="rounded-xl px-3.5 py-3"
                    style={{
                      border: `1px solid ${BORDER}`,
                      background: TILE_BG,
                    }}
                  >
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/46">
                      Leaf Hash
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-white/84">
                      {proofData.leafHash || "—"}
                    </p>
                  </div>

                  <div
                    className="rounded-xl px-3.5 py-3"
                    style={{
                      border: `1px solid ${BORDER}`,
                      background: TILE_BG,
                    }}
                  >
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/46">
                      Merkle Root
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-white/84">
                      {proofData.merkleRoot || "—"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {proofSearchHref ? (
                      <a
                        href={proofSearchHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75 transition hover:text-white"
                      >
                        Search Batch
                        <ExternalLink size={12} />
                      </a>
                    ) : null}
                    {proofTxHash ? (
                      <a
                        href={getExplorerTxUrl(proofTxHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white"
                        style={{
                          background: `linear-gradient(135deg, ${ACCENT} 0%, ${SECONDARY} 58%, ${DEEP} 100%)`,
                          boxShadow: "0 10px 22px rgba(45,132,235,0.28)",
                        }}
                      >
                        Open Transaction
                        <ExternalLink size={12} />
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-white/65">No proof loaded.</div>
              )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
};
