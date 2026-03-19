import { defineChain } from "viem";

export const POLKADOT_HUB_TESTNET_RPC_URL = "https://eth-rpc-testnet.polkadot.io/";
export const POLKADOT_HUB_TESTNET_EXPLORER_BASE_URL =
  "https://blockscout-testnet.polkadot.io";

export const polkadotHubTestnet = defineChain({
  id: 420420417,
  name: "Polkadot Hub TestNet",
  nativeCurrency: {
    decimals: 18,
    name: "Paseo",
    symbol: "PAS",
  },
  rpcUrls: {
    default: {
      http: [POLKADOT_HUB_TESTNET_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: "Polkadot Hub TestNet Blockscout",
      url: POLKADOT_HUB_TESTNET_EXPLORER_BASE_URL,
    },
  },
  testnet: true,
});

