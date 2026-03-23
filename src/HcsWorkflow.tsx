import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FC,
} from "react";
import { motion } from "framer-motion";
import {
  Clock3,
  Database,
  FileText,
  Hash,
  Layers,
  ListOrdered,
  Network,
  Server,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

const EDGE_PALETTE = {
  blue: "#2D84EB",
  purple: "#7C5CFF",
  green: "#2EBD85",
  orange: "#F59E0B",
  red: "#EF4444",
};

const DEFAULT_NODE_BORDER = "rgba(155,169,208,0.45)";

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 640;

type NodeId =
  | "settled-orders"
  | "anchor-root"
  | "hcs"
  | "sequence"
  | "consensus-time"
  | "running-hash"
  | "mirror-node"
  | "anchor-history"
  | "merkle-proof";

type WorkflowNode = {
  id: NodeId;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  icon: LucideIcon;
  stroke: string;
  fill: string;
  text: string;
  titleClassName?: string;
};

export type WorkflowEdgeId =
  | "build-batch"
  | "submit-root"
  | "read-topic"
  | "serve-history"
  | "sequence-step"
  | "consensus-time-step"
  | "running-hash-step"
  | "verify-order";

type WorkflowEdge = {
  id: WorkflowEdgeId;
  from: NodeId;
  to: NodeId;
  path: string;
  color: string;
  dashed?: boolean;
  label?: string;
  labelX?: number;
  labelY?: number;
};

const NODES: WorkflowNode[] = [
  {
    id: "settled-orders",
    x: 72,
    y: 112,
    w: 180,
    h: 84,
    title: "Settled\nOrders",
    icon: Database,
    stroke: EDGE_PALETTE.blue,
    fill: "rgba(45,132,235,0.22)",
    text: "#e8f4ff",
  },
  {
    id: "anchor-root",
    x: 60,
    y: 232,
    w: 196,
    h: 96,
    title: "Anchor Batch\nMerkle Root",
    icon: Layers,
    stroke: EDGE_PALETTE.purple,
    fill: "rgba(124,92,255,0.16)",
    text: "#f1ebff",
  },
  {
    id: "hcs",
    x: 386,
    y: 132,
    w: 250,
    h: 160,
    title: "Hedera\nconsensus\nservice",
    icon: Network,
    stroke: EDGE_PALETTE.orange,
    fill: "rgba(245,158,11,0.15)",
    text: "#fff0d5",
    titleClassName: "text-[15px] leading-[1.2]",
  },
  {
    id: "sequence",
    x: 520,
    y: 304,
    w: 176,
    h: 74,
    title: "Sequence",
    icon: ListOrdered,
    stroke: EDGE_PALETTE.orange,
    fill: "rgba(245,158,11,0.14)",
    text: "#fff2de",
  },
  {
    id: "consensus-time",
    x: 520,
    y: 390,
    w: 176,
    h: 82,
    title: "Consensus\nTime",
    icon: Clock3,
    stroke: EDGE_PALETTE.green,
    fill: "rgba(46,189,133,0.16)",
    text: "#e2fff2",
  },
  {
    id: "running-hash",
    x: 520,
    y: 484,
    w: 176,
    h: 78,
    title: "Running\nHash",
    icon: Hash,
    stroke: EDGE_PALETTE.red,
    fill: "rgba(239,68,68,0.15)",
    text: "#ffe3e3",
  },
  {
    id: "mirror-node",
    x: 934,
    y: 94,
    w: 184,
    h: 82,
    title: "Mirror Node",
    icon: Server,
    stroke: EDGE_PALETTE.green,
    fill: "rgba(46,189,133,0.16)",
    text: "#e0fff0",
  },
  {
    id: "anchor-history",
    x: 934,
    y: 208,
    w: 184,
    h: 90,
    title: "Anchor\nHistory",
    icon: FileText,
    stroke: EDGE_PALETTE.blue,
    fill: "rgba(45,132,235,0.2)",
    text: "#e8f4ff",
  },
  {
    id: "merkle-proof",
    x: 934,
    y: 330,
    w: 184,
    h: 90,
    title: "Merkle\nProof",
    icon: ShieldCheck,
    stroke: EDGE_PALETTE.purple,
    fill: "rgba(124,92,255,0.16)",
    text: "#efe8ff",
  },
];

const EDGES: WorkflowEdge[] = [
  {
    id: "build-batch",
    from: "settled-orders",
    to: "anchor-root",
    path: "M162 196 V232",
    color: "#8b93a7",
    label: "build batch",
    labelX: 174,
    labelY: 218,
  },
  {
    id: "submit-root",
    from: "anchor-root",
    to: "hcs",
    path: "M256 280 H300 Q320 280 320 258 V214 Q320 194 342 194 H386",
    color: EDGE_PALETTE.purple,
    label: "submit root",
    labelX: 286,
    labelY: 246,
  },
  {
    id: "read-topic",
    from: "hcs",
    to: "mirror-node",
    path: "M636 188 H676 Q696 188 696 170 H934",
    color: EDGE_PALETTE.green,
    label: "read topic",
    labelX: 760,
    labelY: 160,
  },
  {
    id: "serve-history",
    from: "hcs",
    to: "anchor-history",
    path: "M636 246 H706 Q726 246 726 253 H934",
    color: EDGE_PALETTE.blue,
    label: "serve history",
    labelX: 742,
    labelY: 236,
  },
  {
    id: "sequence-step",
    from: "hcs",
    to: "sequence",
    path: "M511 292 V341 H520",
    color: EDGE_PALETTE.orange,
  },
  {
    id: "consensus-time-step",
    from: "hcs",
    to: "consensus-time",
    path: "M489 292 V431 H520",
    color: EDGE_PALETTE.green,
  },
  {
    id: "running-hash-step",
    from: "hcs",
    to: "running-hash",
    path: "M467 292 V523 H520",
    color: EDGE_PALETTE.red,
  },
  {
    id: "verify-order",
    from: "anchor-root",
    to: "merkle-proof",
    path: "M166 328 V570 Q166 590 186 590 H1026 Q1046 590 1046 570 V410",
    color: EDGE_PALETTE.purple,
    dashed: true,
    label: "verify order",
    labelX: 560,
    labelY: 620,
  },
];

const PANEL_STYLE: CSSProperties = {
  position: "absolute",
  borderRadius: 22,
  border: "1px solid rgba(255,255,255,0.06)",
};

const WorkflowNodeCard: FC<{
  node: WorkflowNode;
  isVisited: boolean;
  isCurrent: boolean;
}> = ({ node, isVisited, isCurrent }) => {
  const Icon = node.icon;

  return (
    <motion.div
      className="absolute rounded-[20px] px-3 py-3"
      style={{
        left: node.x,
        top: node.y,
        width: node.w,
        height: node.h,
        border: `1.25px solid ${DEFAULT_NODE_BORDER}`,
        background: isVisited ? node.fill : "rgba(255,255,255,0.03)",
      }}
      animate={{
        boxShadow: isCurrent
          ? `0 0 0 1px ${node.stroke}70, 0 0 24px ${node.stroke}66`
          : isVisited
            ? `0 0 14px ${node.stroke}3a`
            : "none",
        y: isCurrent ? -1.5 : 0,
      }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex h-full flex-col justify-center">
        <div className="mb-2 flex items-center justify-center">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border"
            style={{
              borderColor: isVisited
                ? `${node.stroke}80`
                : "rgba(155,169,208,0.36)",
              background: isVisited
                ? `${node.stroke}26`
                : "rgba(255,255,255,0.05)",
              color: isVisited ? node.stroke : "rgba(224,230,255,0.72)",
            }}
          >
            <Icon size={14} />
          </span>
        </div>
        <p
          className={`whitespace-pre-line text-center font-semibold ${
            node.titleClassName ?? "text-[12px] leading-[1.22]"
          }`}
          style={{ color: isVisited ? node.text : "rgba(224,230,255,0.8)" }}
        >
          {node.title}
        </p>
      </div>
    </motion.div>
  );
};

const EdgeLayer: FC<{
  activeEdgeIds: Set<WorkflowEdgeId>;
  visitedEdgeIds: Set<WorkflowEdgeId>;
}> = ({ activeEdgeIds, visitedEdgeIds }) => {
  return (
    <svg
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      className="absolute inset-0 h-full w-full overflow-visible"
      fill="none"
    >
      <defs>
        {EDGES.map((edge) => (
          <marker
            key={edge.id}
            id={`arr-${edge.id}`}
            markerWidth="5"
            markerHeight="5"
            refX="4.4"
            refY="2.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L5,2.5 L0,5 z" fill={edge.color} />
          </marker>
        ))}
      </defs>

      {EDGES.map((edge) => {
        const isVisited = visitedEdgeIds.has(edge.id);
        const isCurrent = activeEdgeIds.has(edge.id);
        const baseGlow = isCurrent ? 16 : 11;
        const flowGlow = isCurrent ? 22 : 14;

        return (
          <g key={edge.id}>
            <path
              d={edge.path}
              stroke="rgba(255,255,255,0.13)"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={edge.dashed ? "9 8" : undefined}
            />
            <motion.path
              d={edge.path}
              stroke={edge.color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={edge.dashed ? "9 8" : undefined}
              markerEnd={`url(#arr-${edge.id})`}
              style={{
                filter: `drop-shadow(0 0 ${baseGlow}px ${edge.color})`,
              }}
              animate={{
                opacity: isCurrent ? 1 : 0.92,
              }}
              transition={{ duration: 0.35 }}
            />

            <motion.path
              d={edge.path}
              stroke={edge.color}
              strokeWidth={isCurrent ? 6 : 4.3}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={edge.dashed ? "0.22 0.78" : "0.26 0.74"}
              animate={{ strokeDashoffset: [0, -1] }}
              transition={{
                duration: edge.dashed ? 1.45 : 1.15,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                filter: `drop-shadow(0 0 ${flowGlow}px ${edge.color})`,
                opacity: isCurrent ? 1 : 0.82,
              }}
            />
            <motion.path
              d={edge.path}
              stroke="#ffffff"
              strokeWidth={isCurrent ? 2.9 : 2.1}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={edge.dashed ? "0.12 0.88" : "0.14 0.86"}
              animate={{ strokeDashoffset: [0, -1] }}
              transition={{
                duration: edge.dashed ? 1.45 : 1.15,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                filter: `drop-shadow(0 0 12px ${edge.color})`,
                opacity: isCurrent ? 0.98 : 0.72,
              }}
            />

            {edge.label && edge.labelX && edge.labelY ? (
              <text
                x={edge.labelX}
                y={edge.labelY}
                fontSize={12}
                fill={edge.color}
                style={{
                  opacity: isVisited ? 1 : 0.45,
                  fontWeight: 700,
                  letterSpacing: "0.01em",
                }}
              >
                {edge.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
};

type HcsWorkflowProps = {
  activeEdgeIds: Set<WorkflowEdgeId>;
  visitedEdgeIds: Set<WorkflowEdgeId>;
};

export const HcsWorkflow: FC<HcsWorkflowProps> = ({
  activeEdgeIds,
  visitedEdgeIds,
}) => {
  const [canvasScale, setCanvasScale] = useState(1);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    const updateScale = () => {
      const nextScale = Math.min(host.clientWidth / CANVAS_WIDTH, 1);
      setCanvasScale(nextScale > 0 ? nextScale : 1);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(host);

    return () => observer.disconnect();
  }, []);

  const allNodeIds = useMemo(
    () => new Set<NodeId>(NODES.map((node) => node.id)),
    [],
  );

  return (
    <div
      ref={canvasHostRef}
      className="relative w-full overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(7,12,30,0.96),rgba(6,10,24,0.98))]"
    >
      <div style={{ height: CANVAS_HEIGHT * canvasScale }} />
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `scale(${canvasScale})`,
        }}
      >
        <div
          style={{
            ...PANEL_STYLE,
            left: 28,
            top: 58,
            width: 264,
            height: 336,
            background: "rgba(206,214,233,0.16)",
          }}
        />
        <div
          style={{
            ...PANEL_STYLE,
            left: 320,
            top: 58,
            width: 526,
            height: 510,
            background: "rgba(206,198,234,0.16)",
          }}
        />
        <div
          style={{
            ...PANEL_STYLE,
            left: 876,
            top: 58,
            width: 296,
            height: 394,
            background: "rgba(198,231,216,0.18)",
          }}
        />

        <p
          className="absolute text-[22px] font-semibold"
          style={{ left: 100, top: 66, color: EDGE_PALETTE.blue }}
        >
          App Backend
        </p>
        <p
          className="absolute text-[22px] font-semibold"
          style={{ left: 510, top: 66, color: EDGE_PALETTE.purple }}
        >
          Hedera
        </p>
        <p
          className="absolute text-[22px] font-semibold"
          style={{ left: 958, top: 60, color: "#1a9f63" }}
        >
          Public Verify
        </p>

        <EdgeLayer
          activeEdgeIds={activeEdgeIds}
          visitedEdgeIds={visitedEdgeIds}
        />

        {NODES.map((node) => {
          const isVisited = allNodeIds.has(node.id);
          const isCurrent = allNodeIds.has(node.id);

          return (
            <WorkflowNodeCard
              key={node.id}
              node={node}
              isVisited={isVisited}
              isCurrent={isCurrent}
            />
          );
        })}
      </div>
    </div>
  );
};
