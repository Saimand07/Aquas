/**
 * midnight-config.ts — server-safe network configuration.
 *
 * This file intentionally has NO "use client" directive so it can be
 * imported by both Next.js Server Components, API Routes (route.ts),
 * and Client Components alike.
 *
 * Do NOT import browser-only code (window, crypto, dapp-connector-api, etc.) here.
 */

export type MidnightNetwork = "preview" | "preprod";

export interface NetworkConfig {
  id: MidnightNetwork;
  name: string;
  badge: string;
  rpcUri: string;
  indexerUri: string;
  indexerWsUri: string;
  explorerBaseUrl: string;
  canonicalContract: string;
}

export const NETWORKS: Record<MidnightNetwork, NetworkConfig> = {
  preview: {
    id: "preview",
    name: "Midnight Preview Testnet",
    badge: "PREVIEW",
    rpcUri: "wss://rpc.preview.midnight.network",
    indexerUri: "https://api-preview.1am.xyz/api/v4/graphql",
    indexerWsUri: "wss://api-preview.1am.xyz/api/v4/graphql/ws",
    explorerBaseUrl: "https://preview.midnightexplorer.com",
    canonicalContract:
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
      "0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74",
  },
  preprod: {
    id: "preprod",
    name: "Midnight Preprod Network",
    badge: "PREPROD",
    rpcUri: "wss://rpc.preprod.midnight.network",
    indexerUri: "https://api-preprod.1am.xyz/api/v4/graphql",
    indexerWsUri: "wss://api-preprod.1am.xyz/api/v4/graphql/ws",
    explorerBaseUrl: "https://preprod.midnightexplorer.com",
    canonicalContract:
      process.env.NEXT_PUBLIC_PREPROD_CONTRACT_ADDRESS ||
      "0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74",
  },
};

export function getNetworkConfig(network: MidnightNetwork = "preview"): NetworkConfig {
  return NETWORKS[network] ?? NETWORKS.preview;
}

export function getExplorerContractUrl(contractAddress: string, network: MidnightNetwork = "preview"): string {
  const cleanAddr = contractAddress.trim().replace(/^0x/i, "");
  return `https://explorer.1am.xyz/contract/${cleanAddr}?network=${network}`;
}

export function getExplorerTxUrl(txId: string, network: MidnightNetwork = "preview"): string {
  const cleanTx = txId.trim().replace(/^0x/i, "");
  return `https://explorer.1am.xyz/tx/${cleanTx}?network=${network}`;
}

