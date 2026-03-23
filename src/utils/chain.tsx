/* eslint-disable react-refresh/only-export-components */
import { ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { HEDERA_TESTNET_EXPLORER_BASE_URL } from "../config/chains";

export const EXPLORER_BASE_URL = HEDERA_TESTNET_EXPLORER_BASE_URL;

export function formatTokenSymbol(symbol: string) {
  return symbol === "DEV" ? "$DEV" : symbol;
}

export function getExplorerTxUrl(hash: string) {
  return `${EXPLORER_BASE_URL}/transaction/${hash}`;
}

export function getExplorerAddressUrl(address: string) {
  return `${EXPLORER_BASE_URL}/account/${address}`;
}

export function getExplorerSearchUrl(value: string) {
  return `${EXPLORER_BASE_URL}/search?q=${value}`;
}

export function getExplorerTopicMessagesUrl(topicId: string) {
  return `${EXPLORER_BASE_URL}/topic/${topicId}/messages`;
}

export function showTransactionSubmittedToast({
  hash,
  title,
  description = "You can track this transaction on Hedera Hashscan.",
}: {
  hash: string;
  title: string;
  description?: string;
}) {
  const explorerUrl = getExplorerTxUrl(hash);

  toast.custom(
    (t) => (
      <div
        className={`pointer-events-auto w-[min(92vw,420px)] rounded-2xl border border-white/10 bg-[#0b0b0b]/95 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur transition-all ${
          t.visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <p className="text-sm font-semibold tracking-[-0.02em]">{title}</p>
        <p className="mt-1 text-sm text-white/65">{description}</p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              window.open(explorerUrl, "_blank", "noopener,noreferrer");
              toast.dismiss(t.id);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#2D84EB]/25 bg-[#2D84EB]/12 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#2D84EB] transition hover:bg-[#2D84EB]/18"
          >
            Open explorer
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    ),
    {
      id: `tx-submitted-${hash}`,
      duration: 8000,
      position: "top-right",
    },
  );
}
