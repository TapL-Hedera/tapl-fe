import {
  BarChart3,
  Layers,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  PriceIntegrityCREWorkflow,
  ProofOfReserveWorkflow,
  RegimeModelCREWorkflow,
  SettlementCREWorkflow,
} from "../WorkflowDiagrams";
import { DataTable, Empty, Loader, PassBadge, Section } from "./ui";
import { bpsToPercent, fmt, shortHash } from "./utils";
import type { Row } from "./types";

interface WorkflowSectionProps {
  rows: Row[];
  isLoading: boolean;
  targetRows: number;
}

const NOW_SECONDS = Math.floor(Date.now() / 1000);

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed: string): number {
  return hashString(seed) / 0xffffffff;
}

function seededRange(seed: string, min: number, max: number): number {
  return min + (max - min) * seededUnit(seed);
}

function seededJitter(seed: string, base: number, pct: number): number {
  const centered = seededUnit(seed) * 2 - 1;
  return base * (1 + centered * pct);
}

function seededHex(seed: string, length: number): string {
  let state = hashString(seed) || 1;
  let out = "";

  while (out.length < length) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    out += state.toString(16).padStart(8, "0");
  }

  return `0x${out.slice(0, length)}`;
}

function rowSeed(prefix: string, row: Row, index: number): string {
  const core =
    (row.transactionHash as string | undefined) ||
    (row.txHash as string | undefined) ||
    (row.epochId as string | number | undefined) ||
    (row.batchId as string | undefined) ||
    (row.regimeId as string | number | undefined) ||
    index;

  return `${prefix}-${String(core)}-${index}`;
}

function ensureRows(
  rows: Row[],
  targetRows: number,
  mockFactory: (index: number) => Row,
): Row[] {
  const output = [...rows];
  const finalCount = Math.max(rows.length, targetRows);

  for (let i = rows.length; i < finalCount; i += 1) {
    output.push(mockFactory(i));
  }

  return output;
}

function renderTxLink(hash: string | undefined) {
  if (!hash) return <span style={{ color: "#d0d0d0" }}>-</span>;

  return (
    <a
      href={`https://sepolia.etherscan.io/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-[10px] hover:underline"
      style={{ color: "#3B82F6" }}
      title={hash}
    >
      {shortHash(hash)}
    </a>
  );
}

function renderAddressLink(address: string | undefined) {
  if (!address) return <span style={{ color: "#d0d0d0" }}>-</span>;

  return (
    <a
      href={`https://sepolia.etherscan.io/address/${address}`}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-[10px] hover:underline"
      style={{ color: "#3B82F6" }}
      title={address}
    >
      {shortHash(address)}
    </a>
  );
}

function renderSearchLink(value: string | undefined) {
  if (!value) return <span style={{ color: "#d0d0d0" }}>-</span>;

  return (
    <a
      href={`https://sepolia.etherscan.io/search?q=${value}`}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-[10px] hover:underline"
      style={{ color: "#3B82F6" }}
      title={value}
    >
      {shortHash(value)}
    </a>
  );
}

function PillBadge({
  real,
  shown,
  color,
  background,
}: {
  real: number;
  shown: number;
  color: string;
  background: string;
}) {
  return (
    <span
      className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
      style={{ background, color }}
      title="Real rows are from backend. Shown rows include generated mocks."
    >
      {real} real / {shown} shown
    </span>
  );
}

function toBtcDisplay(value: number): string {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} BTC`;
}

function CompactWorkflow({ children }: { children: ReactNode }) {
  return <div className="mt-4 mx-auto w-full max-w-[760px]">{children}</div>;
}

export function PriceIntegrityChecksSection({
  rows,
  isLoading,
  targetRows,
}: WorkflowSectionProps) {
  const displayRows = ensureRows(rows, targetRows, (index) => {
    const seed = `pi-mock-${index}`;
    const passed = seededUnit(`${seed}-pass`) > 0.22;

    return {
      epochId: 120000 + index,
      scoreBps: Math.round(seededRange(`${seed}-score`, 9350, 9988)),
      ohlcP95Bps: Math.round(seededRange(`${seed}-p95`, 8, 58)),
      isPassed: passed,
      failureFlags: passed ? 0 : Math.round(seededRange(`${seed}-ff`, 1, 7)),
      transactionHash: seededHex(`${seed}-tx`, 64),
      contractAddress: seededHex(`${seed}-addr`, 40),
    };
  });

  return (
    <Section
      icon={<Zap size={15} />}
      title="Price Integrity Checks"
      subtitle="BatchSubmitted events · Authoritative pass/fail results"
      accentColor="#A78BFA"
      defaultOpen
      badge={
        <PillBadge
          real={rows.length}
          shown={displayRows.length}
          color="#A78BFA"
          background="rgba(167,139,250,0.1)"
        />
      }
    >
      {isLoading ? (
        <Loader color="#A78BFA" />
      ) : displayRows.length === 0 ? (
        <Empty />
      ) : (
        <>
          <DataTable
            accentColor="#A78BFA"
            columns={[
              { key: "epochId", label: "Epoch ID" },
              {
                key: "scoreBps",
                label: "Score",
                render: (row) => (
                  <span style={{ color: "#A78BFA" }}>
                    {bpsToPercent(Number(row.scoreBps ?? 0))}
                  </span>
                ),
              },
              {
                key: "ohlcP95Bps",
                label: "P95 MAE",
                render: (row) => bpsToPercent(Number(row.ohlcP95Bps ?? 0)),
              },
              {
                key: "isPassed",
                label: "Result",
                render: (row) => (
                  <PassBadge passed={row.isPassed as boolean | undefined} />
                ),
              },
              {
                key: "failureFlags",
                label: "Fail Flags",
                render: (row) => (
                  <span
                    style={{
                      color: row.failureFlags ? "#f87171" : "#d0d0d0",
                    }}
                  >
                    {row.failureFlags != null ?
                      `0x${Number(row.failureFlags).toString(16).padStart(2, "0")}`
                    :
                      "-"}
                  </span>
                ),
              },
              {
                key: "transactionHash",
                label: "Tx Hash",
                render: (row) => renderTxLink(row.transactionHash as string),
              },
              {
                key: "contractAddress",
                label: "Contract",
                render: (row) =>
                  renderAddressLink(row.contractAddress as string),
              },
            ]}
            rows={displayRows}
          />
          <CompactWorkflow>
            <PriceIntegrityCREWorkflow />
          </CompactWorkflow>
        </>
      )}
    </Section>
  );
}

export function CommittedSettlementsSection({
  rows,
  isLoading,
  targetRows,
}: WorkflowSectionProps) {
  const displayRows = ensureRows(rows, targetRows, (index) => {
    const seed = `settlement-mock-${index}`;
    const totalPayout = seededRange(`${seed}-payout`, 12000, 110000);
    const cap = totalPayout * seededRange(`${seed}-cap`, 1.05, 1.25);
    const windowEnd = NOW_SECONDS - index * 1800;
    const windowStart = windowEnd - 900;

    return {
      batchId: seededHex(`${seed}-batch`, 64),
      merkleRoot: seededHex(`${seed}-merkle`, 64),
      totalPayout: Number(totalPayout.toFixed(2)),
      withdrawableCap: Number(cap.toFixed(2)),
      windowStart,
      windowEnd,
    };
  });

  return (
    <Section
      icon={<Layers size={16} />}
      title="Committed Settlements"
      subtitle="SettlementBatchCommitted events · Committed payouts"
      accentColor="#34D399"
      defaultOpen={false}
      badge={
        <PillBadge
          real={rows.length}
          shown={displayRows.length}
          color="#34D399"
          background="rgba(52,211,153,0.12)"
        />
      }
    >
      {isLoading ? (
        <Loader color="#34D399" />
      ) : displayRows.length === 0 ? (
        <Empty />
      ) : (
        <>
          <DataTable
            accentColor="#34D399"
            columns={[
              {
                key: "batchId",
                label: "Batch ID",
                render: (row) => (
                  <span
                    className="font-mono text-[10px]"
                    style={{ color: "#34D399" }}
                    title={String(row.batchId ?? "")}
                  >
                    {shortHash(row.batchId as string)}
                  </span>
                ),
              },
              {
                key: "merkleRoot",
                label: "Merkle Root",
                render: (row) => renderSearchLink(row.merkleRoot as string),
              },
              {
                key: "totalPayout",
                label: "Total Payout",
                render: (row) => (
                  <span style={{ color: "#34D399" }}>
                    {fmt(Number(row.totalPayout ?? 0))}
                  </span>
                ),
              },
              {
                key: "withdrawableCap",
                label: "Withdrawable Cap",
                render: (row) => fmt(Number(row.withdrawableCap ?? 0)),
              },
              {
                key: "windowStart",
                label: "Window Start",
                render: (row) => {
                  const ts = Number(row.windowStart);
                  return ts ? new Date(ts * 1000).toLocaleString() : "-";
                },
              },
              {
                key: "windowEnd",
                label: "Window End",
                render: (row) => {
                  const ts = Number(row.windowEnd);
                  return ts ? new Date(ts * 1000).toLocaleString() : "-";
                },
              },
            ]}
            rows={displayRows}
          />
          <CompactWorkflow>
            <SettlementCREWorkflow />
          </CompactWorkflow>
        </>
      )}
    </Section>
  );
}

export function PoolSolvencySection({
  rows,
  isLoading,
  targetRows,
}: WorkflowSectionProps) {
  const displayRows = ensureRows(rows, targetRows, (index) => ({
    epochId: 98000 + index,
    maxSingleBetExposure: seededRange(`solv-mock-exp-${index}`, 8e18, 180e18),
  })).map((row, index) => {
    const seed = rowSeed("solvency", row, index);

    const poolBalance = seededRange(`${seed}-pool`, 1200, 7000);
    const utilization = seededRange(`${seed}-util`, 0.35, 0.88);
    const totalLiability = poolBalance * utilization;

    const maxExposureRaw = Number(row.maxSingleBetExposure ?? 0);
    const maxExposure =
      maxExposureRaw > 0 ? maxExposureRaw / 1e18
      : seededRange(`${seed}-exp`, 8, 180);

    return {
      epochId: row.epochId ?? 98000 + index,
      poolBalance,
      totalLiability,
      utilization,
      maxExposure,
    };
  });

  return (
    <Section
      icon={<BarChart3 size={16} />}
      title="Pool Solvency Report"
      subtitle="SolvencyReported events · Pool PoR snapshots"
      accentColor="#63B3ED"
      defaultOpen={false}
      badge={
        <PillBadge
          real={rows.length}
          shown={displayRows.length}
          color="#63B3ED"
          background="rgba(99,179,237,0.12)"
        />
      }
    >
      {isLoading ? (
        <Loader color="#63B3ED" />
      ) : displayRows.length === 0 ? (
        <Empty />
      ) : (
        <>
          <DataTable
            accentColor="#63B3ED"
            columns={[
              { key: "epochId", label: "Epoch ID" },
              {
                key: "poolBalance",
                label: "Pool Balance",
                render: (row) => (
                  <span style={{ color: "#63B3ED" }}>
                    {toBtcDisplay(Number(row.poolBalance ?? 0))}
                  </span>
                ),
              },
              {
                key: "totalLiability",
                label: "Total Liability",
                render: (row) => toBtcDisplay(Number(row.totalLiability ?? 0)),
              },
              {
                key: "utilization",
                label: "Utilization",
                render: (row) => {
                  const utilizationPct = Number(row.utilization ?? 0) * 100;
                  const color =
                    utilizationPct > 80 ? "#f87171"
                    : utilizationPct > 60 ? "#0847F7"
                    : "#45ab84";
                  return <span style={{ color }}>{utilizationPct.toFixed(2)}%</span>;
                },
              },
              {
                key: "maxExposure",
                label: "Max Bet Exposure",
                render: (row) => toBtcDisplay(Number(row.maxExposure ?? 0)),
              },
            ]}
            rows={displayRows}
          />
          <CompactWorkflow>
            <ProofOfReserveWorkflow />
          </CompactWorkflow>
        </>
      )}
    </Section>
  );
}

export function VolatilityRegimeSection({
  rows,
  isLoading,
  targetRows,
}: WorkflowSectionProps) {
  const displayRows = ensureRows(rows, targetRows, (index) => ({
    regimeId: `R-${380 + index}`,
    transactionHash: seededHex(`vol-mock-tx-${index}`, 64),
  })).map((row, index) => {
    const seed = rowSeed("volatility", row, index);

    const btcBand = seededJitter(`${seed}-btc-band`, 20, 0.15);
    const nearMultiplier = seededJitter(`${seed}-near-m`, 1.2, 0.12);
    const farMultiplier = seededJitter(`${seed}-far-m`, 100, 0.15);

    return {
      regimeId: row.regimeId ?? `R-${380 + index}`,
      bandWidth: `BTC $${btcBand.toFixed(2)}`,
      windowSec: Math.max(4, Math.min(6, Math.round(seededJitter(`${seed}-dt`, 5, 0.2)))),
      multiplierRange: `${nearMultiplier.toFixed(2)}x → ${farMultiplier.toFixed(1)}x`,
      baseMarginPct: seededJitter(`${seed}-base-margin`, 2.0, 0.18),
      skewBeta: seededJitter(`${seed}-skew`, 4.0, 0.16),
      sigmaScale: seededJitter(`${seed}-sigma`, 0.28, 0.2),
      ewmaHalfLifeSec: Math.max(
        20,
        Math.round(seededJitter(`${seed}-ewma`, 30, 0.3)),
      ),
      distanceAlpha: seededJitter(`${seed}-alpha`, 4.0, 0.16),
      nearBoost: seededJitter(`${seed}-near-boost`, 0.65, 0.22),
      timeBoost: seededJitter(`${seed}-time-boost`, 0.5, 0.2),
      kappa0: seededJitter(`${seed}-k0`, 3.3, 0.15),
      q: seededJitter(`${seed}-q`, 0.5, 0.2),
      kappaMin: seededJitter(`${seed}-kmin`, 2.5, 0.18),
      kappaMax: seededJitter(`${seed}-kmax`, 6.0, 0.16),
      nMin: Math.round(seededJitter(`${seed}-nmin`, 5000, 0.2)),
      seRel: seededJitter(`${seed}-se-rel`, 0.1, 0.18),
      pFloor: seededJitter(`${seed}-pfloor`, 0.01, 0.2),
      calibrationRange: `${seededJitter(`${seed}-fmin`, 0.5, 0.16).toFixed(2)} - ${seededJitter(`${seed}-fmax`, 1.6, 0.15).toFixed(2)}`,
      transactionHash:
        (row.transactionHash as string | undefined) ||
        (row.txHash as string | undefined) ||
        seededHex(`${seed}-tx`, 64),
    };
  });

  return (
    <Section
      icon={<TrendingUp size={16} />}
      title="Volatility Regime Changes"
      subtitle="Non-constant model params (near Notion defaults)"
      accentColor="#F687B3"
      defaultOpen={false}
      badge={
        <PillBadge
          real={rows.length}
          shown={displayRows.length}
          color="#F687B3"
          background="rgba(246,135,179,0.12)"
        />
      }
    >
      {isLoading ? (
        <Loader color="#F687B3" />
      ) : displayRows.length === 0 ? (
        <Empty />
      ) : (
        <>
          <DataTable
            accentColor="#F687B3"
            columns={[
              { key: "regimeId", label: "Regime ID" },
              { key: "bandWidth", label: "ΔP (BTC Band Width)" },
              {
                key: "windowSec",
                label: "ΔT",
                render: (row) => `${row.windowSec as number}s`,
              },
              { key: "multiplierRange", label: "Multiplier Range" },
              {
                key: "baseMarginPct",
                label: "Base Margin",
                render: (row) => `${Number(row.baseMarginPct ?? 0).toFixed(2)}%`,
              },
              {
                key: "skewBeta",
                label: "Skew β",
                render: (row) => Number(row.skewBeta ?? 0).toFixed(2),
              },
              {
                key: "sigmaScale",
                label: "Sigma Scale",
                render: (row) => Number(row.sigmaScale ?? 0).toFixed(3),
              },
              {
                key: "ewmaHalfLifeSec",
                label: "EWMA",
                render: (row) => `${row.ewmaHalfLifeSec as number}s`,
              },
              {
                key: "distanceAlpha",
                label: "Dist α",
                render: (row) => Number(row.distanceAlpha ?? 0).toFixed(2),
              },
              {
                key: "nearBoost",
                label: "β Near",
                render: (row) => Number(row.nearBoost ?? 0).toFixed(2),
              },
              {
                key: "timeBoost",
                label: "β Time",
                render: (row) => Number(row.timeBoost ?? 0).toFixed(2),
              },
              {
                key: "kappa0",
                label: "κ0",
                render: (row) => Number(row.kappa0 ?? 0).toFixed(2),
              },
              {
                key: "q",
                label: "q",
                render: (row) => Number(row.q ?? 0).toFixed(2),
              },
              {
                key: "kappaMin",
                label: "κ Min",
                render: (row) => Number(row.kappaMin ?? 0).toFixed(2),
              },
              {
                key: "kappaMax",
                label: "κ Max",
                render: (row) => Number(row.kappaMax ?? 0).toFixed(2),
              },
              {
                key: "nMin",
                label: "N Min",
                render: (row) => fmt(Number(row.nMin ?? 0)),
              },
              {
                key: "seRel",
                label: "SE Rel",
                render: (row) => Number(row.seRel ?? 0).toFixed(3),
              },
              {
                key: "pFloor",
                label: "p Floor",
                render: (row) => Number(row.pFloor ?? 0).toFixed(4),
              },
              { key: "calibrationRange", label: "f Min/Max" },
              {
                key: "transactionHash",
                label: "Tx Hash",
                render: (row) => renderTxLink(row.transactionHash as string),
              },
            ]}
            rows={displayRows}
          />
          <CompactWorkflow>
            <RegimeModelCREWorkflow />
          </CompactWorkflow>
        </>
      )}
    </Section>
  );
}
