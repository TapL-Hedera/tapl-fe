import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import {
  POLKADOT_HUB_TESTNET_RPC_URL,
  polkadotHubTestnet,
} from "../config/chains";

const queryClient = new QueryClient();

const config = createConfig({
  chains: [polkadotHubTestnet],
  connectors: [injected()],
  transports: {
    [polkadotHubTestnet.id]: http(POLKADOT_HUB_TESTNET_RPC_URL),
  },
});

export function Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
