import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import {
  useWorkerControllerGetPriceIntegrityBatches,
  useWorkerControllerGetBatchSubmitted,
  useWorkerControllerGetSettlementBatches,
  useWorkerControllerGetSolvencyReports,
  useWorkerControllerGetLPDistributionRequests,
  useWorkerControllerGetReserveAllocated,
  useWorkerControllerGetVolatilityRegimes,
} from "./services/queries";
import {
  ShieldCheck,
  Activity,
  Layers,
  BarChart3,
  ArrowRightLeft,
  TrendingUp,
  Coins,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Zap,
} from "lucide-react";

// Helper: format a bps value (basis points) as %
function bpsToPercent(bps: number | undefined): string {
  if (bps == null) return "-";
  return (bps / 100).toFixed(2) + "%";
}

// Helper: shorten a hash
function shortHash(h: string | undefined): string {
  if (!h) return "-";
  return h.slice(0, 8) + "..." + h.slice(-6);
}

// Helper: format a large number with commas
function fmt(n: number | string | undefined): string {
  if (n == null) return "-";
  const num = Number(n);
  if (isNaN(num)) return String(n);
  return num.toLocaleString();
}

// Rolling 7-day window
const now = Math.floor(Date.now() / 1000);
const sevenDaysAgo = now - 7 * 24 * 60 * 60;

const DEFAULT_PARAMS = {
  fromTimestamp: sevenDaysAgo,
  toTimestamp: now,
  pageSize: 10,
  page: 1,
};

// ─── Section wrapper ─────────────────────────────────────────────────────────
interface SectionProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accentColor: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Section: React.FC<SectionProps> = ({
  icon,
  title,
  subtitle,
  accentColor,
  badge,
  children,
  defaultOpen = true,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="overflow-hidden shrink-0"
      style={{
        background: "#1E2329",
        border: "1px solid #2B3139",
        borderRadius: "4px",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
        style={{ borderBottom: open ? "1px solid #2B3139" : "none" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded flex items-center justify-center shrink-0"
            style={{ background: `${accentColor}15` }}
          >
            <span style={{ color: accentColor }}>{icon}</span>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#EAECEF" }}>
              {title}
            </p>
            <p className="text-xs" style={{ color: "#848E9C" }}>
              {subtitle}
            </p>
          </div>
          {badge && <div className="ml-3">{badge}</div>}
        </div>
        <span style={{ color: "#848E9C" }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {open && <div className="px-5 pb-5 pt-4">{children}</div>}
    </div>
  );
};

// ─── Loading / Empty indicators ───────────────────────────────────────────────
const Loader = ({ color }: { color: string }) => (
  <div className="flex items-center justify-center py-10">
    <RefreshCw size={24} className="animate-spin" style={{ color }} />
    <span className="ml-2 text-sm" style={{ color: "#848E9C" }}>
      Loading…
    </span>
  </div>
);

const Empty = () => (
  <p className="py-8 text-center text-sm" style={{ color: "#848E9C" }}>
    No events found for this period.
  </p>
);

// ─── Generic table ────────────────────────────────────────────────────────────
interface Column {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => React.ReactNode;
}

const DataTable: React.FC<{
  columns: Column[];
  rows: Record<string, unknown>[];
  accentColor: string;
}> = ({ columns, rows, accentColor }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse min-w-[600px] text-xs">
      <thead>
        <tr
          className="border-b text-[10px] uppercase tracking-widest font-bold"
          style={{ borderColor: `${accentColor}22`, color: "#848E9C" }}
        >
          {columns.map((c) => (
            <th
              key={c.key}
              className="py-3 pr-5 font-semibold whitespace-nowrap"
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={i}
            className="border-b transition-colors"
            style={{ borderColor: `${accentColor}12` }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                `${accentColor}08`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            {columns.map((c) => (
              <td
                key={c.key}
                className="py-3 pr-5 text-white font-mono whitespace-nowrap"
              >
                {c.render ? c.render(row) : String(row[c.key] ?? "-")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Stat chip ────────────────────────────────────────────────────────────────
const StatChip: React.FC<{
  label: string;
  value: React.ReactNode;
  color: string;
}> = ({ label, value, color }) => (
  <div
    className="px-4 py-3 flex flex-col gap-0.5"
    style={{
      background: "#1E2329",
      border: "1px solid #2B3139",
      borderRadius: "4px",
    }}
  >
    <span
      className="text-[10px] uppercase tracking-widest"
      style={{ color: "#848E9C" }}
    >
      {label}
    </span>
    <span className="text-sm font-bold font-mono" style={{ color }}>
      {value}
    </span>
  </div>
);

// ─── Pass/Fail Badge ─────────────────────────────────────────────────────────
const PassBadge: React.FC<{ passed?: boolean }> = ({ passed }) => {
  if (passed == null) return <span style={{ color: "#848E9C" }}>-</span>;
  return passed ? (
    <span className="flex items-center gap-1 text-[#45ab84] font-bold">
      <CheckCircle2 size={13} /> PASS
    </span>
  ) : (
    <span className="flex items-center gap-1 text-red-400 font-bold">
      <XCircle size={13} /> FAIL
    </span>
  );
};

// ─── Main View ────────────────────────────────────────────────────────────────
export const CREProofView: React.FC = () => {
  const params = { ...DEFAULT_PARAMS };

  const { data: priceIntegrityData, isLoading: piLoading } =
    useWorkerControllerGetPriceIntegrityBatches(params);

  console.log("priceIntegrityData: ", priceIntegrityData);
  const { data: batchSubmittedData, isLoading: bsLoading } =
    useWorkerControllerGetBatchSubmitted(params);

  const { data: settlementData, isLoading: settlementLoading } =
    useWorkerControllerGetSettlementBatches(params);

  const { data: solvencyData, isLoading: solvencyLoading } =
    useWorkerControllerGetSolvencyReports(params);

  const { data: lpDistData, isLoading: lpLoading } =
    useWorkerControllerGetLPDistributionRequests(params);

  const { data: reserveData, isLoading: reserveLoading } =
    useWorkerControllerGetReserveAllocated(params);

  const { data: volatilityData, isLoading: volLoading } =
    useWorkerControllerGetVolatilityRegimes(params);

  // customClient does `.then(({ data }) => data)` — it strips the axios envelope.
  // So priceIntegrityData IS the API response body, e.g. { data: [...], page, pageSize, total }
  // The events array lives at .data
  function safeRows(payload: unknown): Record<string, unknown>[] {
    if (!payload) return [];
    // If it's already an array, use it directly
    if (Array.isArray(payload)) return payload as Record<string, unknown>[];
    // If it's { data: [...] }, unwrap it
    const p = payload as Record<string, unknown>;
    if (Array.isArray(p.data)) return p.data as Record<string, unknown>[];
    return [];
  }

  const piRows = safeRows(priceIntegrityData);
  console.log("piRows: ", piRows);
  const bsRows = safeRows(batchSubmittedData);
  console.log("bsRows: ", bsRows);
  const settlementRows = safeRows(settlementData);
  const solvencyRows = safeRows(solvencyData);
  const lpDistRows = safeRows(lpDistData);
  const reserveRows = safeRows(reserveData);
  const volRows = safeRows(volatilityData);

  // Compute summary stats from batchSubmitted
  // customClient strips axios envelope — batchSubmittedData = { data: [...], page, pageSize, total }
  const totalBatches =
    (batchSubmittedData as { total?: number } | undefined)?.total ?? 0;
  const passedBatches = bsRows.filter((r) => r.isPassed === true).length;
  const failedBatches = bsRows.filter((r) => r.isPassed === false).length;
  const avgScore =
    bsRows.length > 0
      ? bsRows.reduce((s, r) => s + Number(r.scoreBps ?? 0), 0) / bsRows.length
      : 0;

  return (
    <div
      className="flex h-screen w-full text-vibe-text font-sans overflow-hidden"
      style={{ background: "#0B0E11", fontFamily: "'Inter', sans-serif" }}
    >
      <Sidebar />
      <main className="flex-1 flex flex-col xl:pl-[220px] 2xl:pl-64 h-full relative z-10 transition-all duration-300 overflow-hidden pb-[60px] xl:pb-0">
        <Header />

        <div className="flex-1 flex flex-col p-3 sm:p-5 gap-4 overflow-y-auto relative">
          {/* Page title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 flex items-center justify-center"
                style={{
                  background: "rgba(252,213,53,0.1)",
                  borderRadius: "4px",
                }}
              >
                <ShieldCheck size={18} style={{ color: "#FCD535" }} />
              </div>
              <div>
                <h2
                  className="text-base font-semibold"
                  style={{ color: "#EAECEF" }}
                >
                  CRE Proof
                </h2>
                <p className="text-xs" style={{ color: "#848E9C" }}>
                  On-chain Chainlink CRE workflow events · Last 7 days
                </p>
              </div>
            </div>

            {/* Summary stats */}
            <div className="hidden md:flex gap-2">
              <StatChip
                label="Total Batches"
                value={fmt(totalBatches)}
                color="#FCD535"
              />
              <StatChip
                label="Passed"
                value={
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    {passedBatches}
                  </span>
                }
                color="#2EBD85"
              />
              <StatChip
                label="Failed"
                value={
                  <span className="flex items-center gap-1">
                    <XCircle size={12} />
                    {failedBatches}
                  </span>
                }
                color="#F6465D"
              />
              <StatChip
                label="Avg Score"
                value={bpsToPercent(avgScore)}
                color="#848E9C"
              />
            </div>
          </div>

          {/* ── 1. Price Integrity Batches ── */}
          <Section
            icon={<Activity size={15} />}
            title="Price Integrity Batches"
            subtitle="PriceIntegrityBatchReported events · Chainlink vs Internal OHLC"
            accentColor="#375BD2"
            badge={
              <span
                className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                style={{
                  background: "rgba(55,91,210,0.1)",
                  color: "#375BD2",
                  borderRadius: "4px",
                }}
              >
                {piRows.length} rows
              </span>
            }
          >
            {piLoading ? (
              <Loader color="#375BD2" />
            ) : piRows.length === 0 ? (
              <Empty />
            ) : (
              <DataTable
                accentColor="#375BD2"
                columns={[
                  { key: "epochId", label: "Epoch ID" },
                  {
                    key: "windowStart",
                    label: "Window Start",
                    render: (r) => {
                      const ts = Number(r.windowStart);
                      if (!ts) return "-";
                      return new Date(ts * 1000).toLocaleString();
                    },
                  },
                  { key: "candleCount", label: "Candles" },
                  {
                    key: "scoreBps",
                    label: "Score",
                    render: (r) => (
                      <span style={{ color: "#375BD2" }}>
                        {bpsToPercent(r.scoreBps as number)}
                      </span>
                    ),
                  },
                  {
                    key: "ohlcP95Bps",
                    label: "P95 MAE",
                    render: (r) => bpsToPercent(r.ohlcP95Bps as number),
                  },
                  {
                    key: "ohlcMaxBps",
                    label: "Max MAE",
                    render: (r) => bpsToPercent(r.ohlcMaxBps as number),
                  },
                  {
                    key: "directionMatchBps",
                    label: "Dir Match",
                    render: (r) => bpsToPercent(r.directionMatchBps as number),
                  },
                  { key: "outlierCount", label: "Outliers" },
                  {
                    key: "internalCandlesHash",
                    label: "Int Hash",
                    render: (r) => (
                      <span
                        title={String(r.internalCandlesHash ?? "")}
                        className="font-mono text-[10px]"
                        style={{ color: "#848E9C" }}
                      >
                        {shortHash(r.internalCandlesHash as string)}
                      </span>
                    ),
                  },
                  {
                    key: "diffMerkleRoot",
                    label: "Merkle Root",
                    render: (r) => (
                      <span
                        title={String(r.diffMerkleRoot ?? "")}
                        className="font-mono text-[10px]"
                        style={{ color: "#848E9C" }}
                      >
                        {shortHash(r.diffMerkleRoot as string)}
                      </span>
                    ),
                  },
                ]}
                rows={piRows}
              />
            )}
          </Section>

          {/* ── 2. Batch Submitted ── */}
          <Section
            icon={<Zap size={15} />}
            title="Batch Submitted"
            subtitle="BatchSubmitted events · Authoritative pass/fail results"
            accentColor="#A78BFA"
            badge={
              <span
                className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                style={{
                  background: "rgba(167,139,250,0.1)",
                  color: "#A78BFA",
                  borderRadius: "4px",
                }}
              >
                {bsRows.length} rows
              </span>
            }
          >
            {bsLoading ? (
              <Loader color="#A78BFA" />
            ) : bsRows.length === 0 ? (
              <Empty />
            ) : (
              <DataTable
                accentColor="#A78BFA"
                columns={[
                  { key: "epochId", label: "Epoch ID" },
                  {
                    key: "scoreBps",
                    label: "Score",
                    render: (r) => (
                      <span style={{ color: "#A78BFA" }}>
                        {bpsToPercent(r.scoreBps as number)}
                      </span>
                    ),
                  },
                  {
                    key: "ohlcP95Bps",
                    label: "P95 MAE",
                    render: (r) => bpsToPercent(r.ohlcP95Bps as number),
                  },
                  {
                    key: "isPassed",
                    label: "Result",
                    render: (r) => <PassBadge passed={r.isPassed as boolean} />,
                  },
                  {
                    key: "failureFlags",
                    label: "Fail Flags",
                    render: (r) => (
                      <span
                        style={{
                          color: r.failureFlags ? "#f87171" : "#848E9C",
                        }}
                      >
                        {r.failureFlags != null
                          ? `0x${Number(r.failureFlags).toString(16).padStart(2, "0")}`
                          : "-"}
                      </span>
                    ),
                  },
                  {
                    key: "txHash",
                    label: "Tx Hash",
                    render: (r) => (
                      <span
                        className="font-mono text-[10px]"
                        style={{ color: "#848E9C" }}
                        title={String(r.txHash ?? "")}
                      >
                        {shortHash(r.txHash as string)}
                      </span>
                    ),
                  },
                ]}
                rows={bsRows}
              />
            )}
          </Section>

          {/* ── 3. Settlement Batches ── */}
          <Section
            icon={<Layers size={16} />}
            title="Settlement Batches"
            subtitle="SettlementBatchCommitted events · Committed payouts"
            accentColor="#34D399"
            badge={
              <span
                className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                style={{
                  background: "rgba(52,211,153,0.12)",
                  color: "#34D399",
                }}
              >
                {settlementRows.length} rows
              </span>
            }
          >
            {settlementLoading ? (
              <Loader color="#34D399" />
            ) : settlementRows.length === 0 ? (
              <Empty />
            ) : (
              <DataTable
                accentColor="#34D399"
                columns={[
                  {
                    key: "batchId",
                    label: "Batch ID",
                    render: (r) => (
                      <span
                        className="font-mono text-[10px]"
                        style={{ color: "#34D399" }}
                        title={String(r.batchId ?? "")}
                      >
                        {shortHash(r.batchId as string)}
                      </span>
                    ),
                  },
                  {
                    key: "merkleRoot",
                    label: "Merkle Root",
                    render: (r) => (
                      <span
                        className="font-mono text-[10px]"
                        style={{ color: "#848E9C" }}
                        title={String(r.merkleRoot ?? "")}
                      >
                        {shortHash(r.merkleRoot as string)}
                      </span>
                    ),
                  },
                  {
                    key: "totalPayout",
                    label: "Total Payout",
                    render: (r) => (
                      <span style={{ color: "#34D399" }}>
                        {fmt(r.totalPayout as number)}
                      </span>
                    ),
                  },
                  {
                    key: "withdrawableCap",
                    label: "Withdrawable Cap",
                    render: (r) => fmt(r.withdrawableCap as number),
                  },
                  {
                    key: "windowStart",
                    label: "Window Start",
                    render: (r) => {
                      const ts = Number(r.windowStart);
                      return ts
                        ? new Date(ts * 1000).toLocaleDateString()
                        : "-";
                    },
                  },
                  {
                    key: "windowEnd",
                    label: "Window End",
                    render: (r) => {
                      const ts = Number(r.windowEnd);
                      return ts
                        ? new Date(ts * 1000).toLocaleDateString()
                        : "-";
                    },
                  },
                ]}
                rows={settlementRows}
              />
            )}
          </Section>

          {/* ── 4. Solvency Reports ── */}
          <Section
            icon={<BarChart3 size={16} />}
            title="Pool Solvency Reports"
            subtitle="SolvencyReported events · Pool PoR snapshots"
            accentColor="#63B3ED"
            badge={
              <span
                className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                style={{
                  background: "rgba(99,179,237,0.12)",
                  color: "#63B3ED",
                }}
              >
                {solvencyRows.length} rows
              </span>
            }
          >
            {solvencyLoading ? (
              <Loader color="#63B3ED" />
            ) : solvencyRows.length === 0 ? (
              <Empty />
            ) : (
              <DataTable
                accentColor="#63B3ED"
                columns={[
                  { key: "epochId", label: "Epoch ID" },
                  {
                    key: "poolBalance",
                    label: "Pool Balance",
                    render: (r) => (
                      <span style={{ color: "#63B3ED" }}>
                        {fmt(r.poolBalance as number)}
                      </span>
                    ),
                  },
                  {
                    key: "totalLiability",
                    label: "Total Liability",
                    render: (r) => fmt(r.totalLiability as number),
                  },
                  {
                    key: "utilizationBps",
                    label: "Utilization",
                    render: (r) => {
                      const pct = Number(r.utilizationBps ?? 0) / 100;
                      const color =
                        pct > 80 ? "#f87171" : pct > 60 ? "#375BD2" : "#45ab84";
                      return <span style={{ color }}>{pct.toFixed(2)}%</span>;
                    },
                  },
                  {
                    key: "maxSingleBetExposure",
                    label: "Max Bet Exposure",
                    render: (r) => fmt(r.maxSingleBetExposure as number),
                  },
                ]}
                rows={solvencyRows}
              />
            )}
          </Section>

          {/* ── 5 & 6. LP Distribution + Reserve Allocated ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 shrink-0">
            {/* LP Distribution */}
            <Section
              icon={<ArrowRightLeft size={16} />}
              title="LP Distribution Requests"
              subtitle="CCIPDistributionRequested events"
              accentColor="#F6AD55"
              badge={
                <span
                  className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                  style={{
                    background: "rgba(246,173,85,0.12)",
                    color: "#F6AD55",
                  }}
                >
                  {lpDistRows.length} rows
                </span>
              }
              defaultOpen={false}
            >
              {lpLoading ? (
                <Loader color="#F6AD55" />
              ) : lpDistRows.length === 0 ? (
                <Empty />
              ) : (
                <DataTable
                  accentColor="#F6AD55"
                  columns={[
                    { key: "epochId", label: "Epoch" },
                    {
                      key: "amount",
                      label: "Amount",
                      render: (r) => (
                        <span style={{ color: "#F6AD55" }}>
                          {fmt(r.amount as number)}
                        </span>
                      ),
                    },
                    {
                      key: "dstChainSelector",
                      label: "Dest Chain",
                      render: (r) => String(r.dstChainSelector ?? "-"),
                    },
                    {
                      key: "receiver",
                      label: "Receiver",
                      render: (r) => (
                        <span
                          className="font-mono text-[10px]"
                          style={{ color: "#848E9C" }}
                          title={String(r.receiver ?? "")}
                        >
                          {shortHash(r.receiver as string)}
                        </span>
                      ),
                    },
                  ]}
                  rows={lpDistRows}
                />
              )}
            </Section>

            {/* Reserve Allocated */}
            <Section
              icon={<Coins size={16} />}
              title="Reserve Allocated"
              subtitle="ReserveAllocatedToDistributor events"
              accentColor="#FC8181"
              badge={
                <span
                  className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                  style={{
                    background: "rgba(252,129,129,0.12)",
                    color: "#FC8181",
                  }}
                >
                  {reserveRows.length} rows
                </span>
              }
              defaultOpen={false}
            >
              {reserveLoading ? (
                <Loader color="#FC8181" />
              ) : reserveRows.length === 0 ? (
                <Empty />
              ) : (
                <DataTable
                  accentColor="#FC8181"
                  columns={[
                    {
                      key: "amount",
                      label: "Amount",
                      render: (r) => (
                        <span style={{ color: "#FC8181" }}>
                          {fmt(r.amount as number)}
                        </span>
                      ),
                    },
                    {
                      key: "receiver",
                      label: "Receiver",
                      render: (r) => (
                        <span
                          className="font-mono text-[10px]"
                          style={{ color: "#848E9C" }}
                          title={String(r.receiver ?? "")}
                        >
                          {shortHash(r.receiver as string)}
                        </span>
                      ),
                    },
                    {
                      key: "txHash",
                      label: "Tx Hash",
                      render: (r) => (
                        <span
                          className="font-mono text-[10px]"
                          style={{ color: "#848E9C" }}
                          title={String(r.txHash ?? "")}
                        >
                          {shortHash(r.txHash as string)}
                        </span>
                      ),
                    },
                  ]}
                  rows={reserveRows}
                />
              )}
            </Section>
          </div>

          {/* ── 7. Volatility Regimes ── */}
          <Section
            icon={<TrendingUp size={16} />}
            title="Volatility Regime Changes"
            subtitle="VolatilityRegimeChanged events · Strategy rebalances"
            accentColor="#F687B3"
            badge={
              <span
                className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                style={{
                  background: "rgba(246,135,179,0.12)",
                  color: "#F687B3",
                }}
              >
                {volRows.length} rows
              </span>
            }
            defaultOpen={false}
          >
            {volLoading ? (
              <Loader color="#F687B3" />
            ) : volRows.length === 0 ? (
              <Empty />
            ) : (
              <DataTable
                accentColor="#F687B3"
                columns={[
                  { key: "regimeId", label: "Regime ID" },
                  {
                    key: "fortressSpreadBps",
                    label: "Fortress Spread",
                    render: (r) => (
                      <span style={{ color: "#F687B3" }}>
                        {bpsToPercent(r.fortressSpreadBps as number)}
                      </span>
                    ),
                  },
                  {
                    key: "maxMultiplier",
                    label: "Max Multiplier",
                    render: (r) => (
                      <span style={{ color: "#375BD2" }}>
                        {r.maxMultiplier != null
                          ? `${Number(r.maxMultiplier).toFixed(2)}x`
                          : "-"}
                      </span>
                    ),
                  },
                  {
                    key: "blockNumber",
                    label: "Block",
                    render: (r) => fmt(r.blockNumber as number),
                  },
                  {
                    key: "txHash",
                    label: "Tx Hash",
                    render: (r) => (
                      <span
                        className="font-mono text-[10px]"
                        style={{ color: "#848E9C" }}
                        title={String(r.txHash ?? "")}
                      >
                        {shortHash(r.txHash as string)}
                      </span>
                    ),
                  },
                ]}
                rows={volRows}
              />
            )}
          </Section>

          {/* Footer note */}
          <p className="text-center text-[10px] pb-4" style={{ color: "#444" }}>
            Data sourced from on-chain Chainlink CRE events · Indexed by Tapfun
            worker
          </p>
        </div>
      </main>
    </div>
  );
};
