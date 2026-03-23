import { defineChain } from "viem";

export const HEDERA_TESTNET_RPC_URL = "https://testnet.hashio.io/api";
export const HEDERA_TESTNET_EXPLORER_BASE_URL =
  "https://hashscan.io/testnet";

export const hederaTestnet = defineChain({
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "HBAR",
    symbol: "HBAR",
  },
  rpcUrls: {
    default: {
      http: [HEDERA_TESTNET_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: "Hashscan",
      url: HEDERA_TESTNET_EXPLORER_BASE_URL,
    },
  },
  testnet: true,
});
