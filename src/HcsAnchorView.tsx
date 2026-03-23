import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ExternalLink, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { BACKEND_URL } from "./constant";
import {
  getExplorerSearchUrl,
  getExplorerTopicMessagesUrl,
  getExplorerTxUrl,
} from "./utils/chain";
import { HcsWorkflow, type WorkflowEdgeId } from "./HcsWorkflow";
import type { TimelineFrame } from "./HcsAnchorWorkflow";

const ACCENT = "#2D84EB";
const SECONDARY = "#4F46E5";
const DEEP = "#00156E";
const BORDER = "rgba(255, 255, 255, 0.11)";
const PANEL_BG =
  "linear-gradient(148deg, rgba(17, 20, 24, 0.94) 0%, rgba(10, 12, 15, 0.98) 100%)";
const TILE_BG =
  "linear-gradient(148deg, rgba(15, 18, 23, 0.94) 0%, rgba(9, 11, 14, 0.99) 100%)";

interface HcsAnchorBatch {
  batchId: string;
  status: string;
  orderCount: number;
  merkleRoot: string;
  topicId: string;
  sequenceNumber: string;
  consensusTimestamp?: string;
  createdAt?: string;
  submittedAt?: string;
  transactionHash?: string;
  txHash?: string;
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

function shortenHash(value?: string, head = 10, tail = 8) {
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

function normalizeBatches(payload: unknown): HcsAnchorBatch[] {
  if (Array.isArray(payload)) {
    return payload as HcsAnchorBatch[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    "items" in payload &&
    Array.isArray((payload as { items?: unknown }).items)
  ) {
    return (payload as { items: HcsAnchorBatch[] }).items;
  }

  return [];
}

function resolveTxHash(batch: HcsAnchorBatch) {
  return batch.transactionHash ?? batch.txHash;
}

export const HcsAnchorView: React.FC = () => {
  const [batches, setBatches] = useState<HcsAnchorBatch[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${BACKEND_URL}/api/v1/hcs-anchor/batches`,
        {
          params: { limit: 100, offset: 0 },
          headers: {
            accept: "*/*",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      const payload = getResponsePayload(response.data);
      setBatches(normalizeBatches(payload));
    } catch (error) {
      console.error("Failed to fetch HCS anchor batches", error);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const summary = useMemo(() => {
    const submitted = batches.filter((batch) => batch.status === "SUBMITTED");
    const totalOrders = batches.reduce(
      (sum, batch) => sum + Number(batch.orderCount || 0),
      0,
    );

    return {
      total: batches.length,
      submitted: submitted.length,
      totalOrders,
    };
  }, [batches]);

  const [frameIndex, setFrameIndex] = useState(0);

  const TIMELINE: TimelineFrame[] = [
    {
      stage: "verify-order",
      activeEdgeIds: ["build-batch"],
      visitedEdgeIds: ["build-batch"],
      label: "Build Anchor Batch Merkle root from Settled Orders",
    },
    {
      stage: "verify-order",
      activeEdgeIds: ["verify-order"],
      visitedEdgeIds: ["build-batch", "verify-order"],
      label: "Verify order with Merkle proof",
    },
    {
      stage: "verify-order",
      activeEdgeIds: ["verify-order"],
      visitedEdgeIds: ["build-batch", "verify-order"],
      label: "Verify order with Merkle proof",
    },
    {
      stage: "submit-root",
      activeEdgeIds: ["build-batch"],
      visitedEdgeIds: ["build-batch"],
      label: "Build Anchor Batch Merkle root from Settled Orders",
    },
    {
      stage: "submit-root",
      activeEdgeIds: ["submit-root"],
      visitedEdgeIds: ["build-batch", "submit-root"],
      label: "Submit anchor Merkle root to HCS topic",
    },
    {
      stage: "submit-root",
      activeEdgeIds: [
        "sequence-step",
        "consensus-time-step",
        "running-hash-step",
      ],
      visitedEdgeIds: [
        "build-batch",
        "submit-root",
        "sequence-step",
        "consensus-time-step",
        "running-hash-step",
      ],
      label: "Emit Sequence + Consensus Time + Running Hash (parallel)",
    },
    {
      stage: "submit-root",
      activeEdgeIds: ["read-topic", "serve-history"],
      visitedEdgeIds: [
        "build-batch",
        "submit-root",
        "sequence-step",
        "consensus-time-step",
        "running-hash-step",
        "read-topic",
        "serve-history",
      ],
      label: "Read topic + serve history (parallel)",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setFrameIndex((previous) => (previous + 1) % TIMELINE.length);
    }, 2200);

    return () => clearInterval(timer);
  }, []);

  const currentFrame = TIMELINE[frameIndex] ?? TIMELINE[0];

  const activeEdgeIds = useMemo(
    () => new Set<WorkflowEdgeId>(currentFrame.activeEdgeIds),
    [currentFrame.activeEdgeIds],
  );

  const visitedEdgeIds = useMemo(
    () => new Set<WorkflowEdgeId>(currentFrame.visitedEdgeIds),
    [currentFrame.visitedEdgeIds],
  );

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
              background: "rgba(45,132,235,0.14)",
            }}
          >
            <ShieldCheck size={18} style={{ color: ACCENT }} />
          </div>
          <div>
            <h1 className="text-[1.72rem] font-bold tracking-[-0.03em] text-white">
              HCS Anchor
            </h1>
            <p className="text-xs text-white/45">
              Anchored batch history with sequence, timestamps, and HashScan
              links
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchBatches}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/75 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            borderColor: BORDER,
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Batches", value: summary.total.toString() },
          { label: "Submitted", value: summary.submitted.toString() },
          { label: "Total Orders", value: summary.totalOrders.toString() },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl p-4"
            style={{
              border: `1px solid ${BORDER}`,
              background: TILE_BG,
              boxShadow: "0 12px 28px rgba(0, 0, 0, 0.44)",
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
              {item.label}
            </p>
            <p className="mt-2 text-[1.48rem] font-bold tracking-[-0.03em] text-white">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <HcsWorkflow
        activeEdgeIds={activeEdgeIds}
        visitedEdgeIds={visitedEdgeIds}
      />

      <section
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
            Anchor Batches
          </p>
          <p className="text-xs uppercase tracking-[0.16em] text-white/52">
            {loading ? "Loading" : `${batches.length} rows`}
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 text-white/60">
            <Loader2
              className="h-8 w-8 animate-spin"
              style={{ color: ACCENT }}
            />
            <p className="text-sm uppercase tracking-[0.18em]">
              Loading anchor batches
            </p>
          </div>
        ) : batches.length === 0 ? (
          <div className="flex min-h-[420px] items-center justify-center px-6">
            <div
              className="w-full max-w-md rounded-2xl px-6 py-7 text-center"
              style={{
                border: `1px solid ${BORDER}`,
                background: TILE_BG,
              }}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
                No anchored batches
              </p>
              <p className="mt-3 text-sm text-white/65">
                No batch history found yet. Try refreshing in a moment.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1240px] w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.18em] text-white/45">
                  <th className="px-4 py-3 font-semibold">Batch ID</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Orders</th>
                  <th className="px-4 py-3 font-semibold">Merkle Root</th>
                  <th className="px-4 py-3 font-semibold">Topic</th>
                  <th className="px-4 py-3 font-semibold">Sequence</th>
                  <th className="px-4 py-3 font-semibold">Consensus Time</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch, index) => {
                  const txHash = resolveTxHash(batch);
                  const actionHref = txHash
                    ? getExplorerTxUrl(txHash)
                    : batch.topicId
                      ? getExplorerTopicMessagesUrl(batch.topicId)
                      : getExplorerSearchUrl(batch.batchId);

                  return (
                    <tr
                      key={`${batch.batchId}-${index}`}
                      className="border-b border-white/5 text-sm text-white/80"
                      style={{
                        background:
                          index % 2 === 0 ? TILE_BG : "rgba(12, 16, 26, 0.95)",
                      }}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-white/78">
                        {batch.batchId}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                          style={{
                            background:
                              batch.status === "SUBMITTED"
                                ? "rgba(46,189,133,0.12)"
                                : "rgba(148,163,184,0.14)",
                            color:
                              batch.status === "SUBMITTED"
                                ? "#2EBD85"
                                : "rgba(226,232,240,0.78)",
                            border: "1px solid rgba(255,255,255,0.07)",
                          }}
                        >
                          {batch.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#8ec1ff]">
                        {batch.orderCount}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-white/74">
                        <span title={batch.merkleRoot}>
                          {shortenHash(batch.merkleRoot, 12, 12)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-white/74">
                        {batch.topicId || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-white/74">
                        {batch.sequenceNumber || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-white/72">
                        {formatAnchorTime(batch.consensusTimestamp)}
                      </td>
                      <td className="px-4 py-3 text-xs text-white/68 text-nowrap">
                        {formatAnchorTime(batch.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-white/68">
                        {formatAnchorTime(batch.submittedAt)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <a
                          href={actionHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75 transition hover:text-white"
                          style={{
                            borderColor: txHash
                              ? "rgba(45,132,235,0.4)"
                              : "rgba(255,255,255,0.2)",
                            background: txHash
                              ? `linear-gradient(135deg, ${ACCENT} 0%, ${SECONDARY} 58%, ${DEEP} 100%)`
                              : "rgba(255,255,255,0.04)",
                          }}
                        >
                          Open
                          <ExternalLink size={12} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
