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
      "0x2459ebb32d836193b34e132505e339f54ae9f18fb215fe78e07935bdcb74007c",
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
      "0xd1eb4aa822360421f5ad357831faf4ebef2b9a7b23e425ee05d3822d92f21244",
  },
};


export function getNetworkConfig(network: MidnightNetwork = "preview"): NetworkConfig {
  return NETWORKS[network] ?? NETWORKS.preview;
}

export function normalizeTxHash(txId: string): string {
  let clean = txId.trim().replace(/^0x/i, "");
  // Midnight SDK sometimes returns a 66-hex string with a 00-prefix (33 bytes).
  // The actual 32-byte transaction hash indexed by 1AM Explorer and Midnight Explorer is the 64-hex string.
  if (clean.length === 66 && clean.startsWith("00")) {
    clean = clean.slice(2);
  }
  return clean;
}

export function getExplorerContractUrl(contractAddress: string, network: MidnightNetwork = "preview"): string {
  const cleanAddr = contractAddress.trim().replace(/^0x/i, "");
  return `https://explorer.1am.xyz/contract/${cleanAddr}?network=${network}`;
}

export function getExplorerTxUrl(txId: string, network: MidnightNetwork = "preview"): string {
  const cleanTx = normalizeTxHash(txId);
  return `https://explorer.1am.xyz/tx/${cleanTx}?network=${network}`;
}

export function getMidnightExplorerTxUrl(txId: string, network: MidnightNetwork = "preview"): string {
  const cleanTx = normalizeTxHash(txId);
  return `https://${network}.midnightexplorer.com/tx/0x${cleanTx}`;
}


