import { useEffect, useMemo, useState, type FC } from "react";
import { HcsWorkflow, type WorkflowEdgeId } from "./HcsWorkflow";

type WorkflowStage = "submit-root" | "verify-order";

export type TimelineFrame = {
  stage: WorkflowStage;
  activeEdgeIds: WorkflowEdgeId[];
  visitedEdgeIds: WorkflowEdgeId[];
  label: string;
};

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

export const HcsAnchorWorkflow: FC = () => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrameIndex((previous) => (previous + 1) % TIMELINE.length);
    }, 2200);

    return () => clearInterval(timer);
  }, []);

  const currentFrame = TIMELINE[frameIndex] ?? TIMELINE[0];
  const currentStage = currentFrame.stage;

  const activeEdgeIds = useMemo(
    () => new Set<WorkflowEdgeId>(currentFrame.activeEdgeIds),
    [currentFrame.activeEdgeIds],
  );

  const visitedEdgeIds = useMemo(
    () => new Set<WorkflowEdgeId>(currentFrame.visitedEdgeIds),
    [currentFrame.visitedEdgeIds],
  );

  return (
    <div className="w-full rounded-[26px] border border-white/12 bg-[linear-gradient(180deg,rgba(10,16,38,0.95),rgba(4,9,26,0.98))] p-3 sm:p-4">
      <div className="mb-4 rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(124,92,255,0.25),transparent_40%),radial-gradient(circle_at_84%_8%,rgba(46,189,133,0.22),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] px-4 py-4 sm:px-5">
        <h3 className="text-[24px] font-semibold tracking-tight text-white sm:text-[30px]">
          HCS Anchor Flow
        </h3>
        <p className="mt-1 text-[14px] text-[#d3dcff] sm:text-[16px]">
          Realtime execution. Public commit. Verifiable history.
        </p>
      </div>

      <HcsWorkflow
        activeEdgeIds={activeEdgeIds}
        visitedEdgeIds={visitedEdgeIds}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{
            color: currentStage === "submit-root" ? "#f3e8ff" : "#b8c1db",
            borderColor:
              currentStage === "submit-root"
                ? "rgba(124,92,255,0.5)"
                : "rgba(184,193,219,0.3)",
            background:
              currentStage === "submit-root"
                ? "rgba(124,92,255,0.2)"
                : "rgba(255,255,255,0.03)",
          }}
        >
          submit root
        </span>
        <span
          className="inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{
            color: currentStage === "verify-order" ? "#f3e8ff" : "#b8c1db",
            borderColor:
              currentStage === "verify-order"
                ? "rgba(124,92,255,0.5)"
                : "rgba(184,193,219,0.3)",
            background:
              currentStage === "verify-order"
                ? "rgba(124,92,255,0.2)"
                : "rgba(255,255,255,0.03)",
          }}
        >
          verify order
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-[#4462bf55] bg-[#11204f66] px-4 py-3 text-sm text-[#dbe5ff]">
        <span className="font-semibold text-white">Current step:</span>{" "}
        {currentFrame.label}
      </div>
    </div>
  );
};
