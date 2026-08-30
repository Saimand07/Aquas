"use client";

import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import { ContractState } from "@midnight-ntwrk/compact-runtime";
import { LedgerParameters, ZswapChainState } from "@midnight-ntwrk/ledger-v8";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { createProofProvider } from "@midnight-ntwrk/midnight-js-types";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import type { MidnightProvider, ProofProvider, WalletProvider } from "@midnight-ntwrk/midnight-js-types";

import type { MidnightNetwork, NetworkConfig } from "./midnight-config";
import { NETWORKS, getNetworkConfig, getExplorerContractUrl, getExplorerTxUrl } from "./midnight-config";

// Re-export from server-safe config so client code can import from either file
export type { MidnightNetwork, NetworkConfig };
export { NETWORKS, getNetworkConfig, getExplorerContractUrl, getExplorerTxUrl };

export const MIDNIGHT_NETWORK = "preview" as const;


export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function fromHex(value: string): Uint8Array {
  const normalized = value.startsWith("0x") ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]*$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error("Wallet returned invalid hexadecimal data.");
  }
  return Uint8Array.from(normalized.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}

function createPrivateStateProvider() {
  let scope = "";
  const stateStore = new Map<string, unknown>();
  const signingKeyStore = new Map<string, unknown>();
  const key = (id: string) => `${scope}:${id}`;

  return {
    setContractAddress(address: string) { scope = address; },
    async set(id: string, state: unknown) { stateStore.set(key(id), state); },
    async get(id: string) { return stateStore.get(key(id)) ?? null; },
    async remove(id: string) { stateStore.delete(key(id)); },
    async clear() { stateStore.clear(); },
    async setSigningKey(address: string, signingKey: unknown) { signingKeyStore.set(address, signingKey); },
    async getSigningKey(address: string) { return signingKeyStore.get(address) ?? null; },
    async removeSigningKey(address: string) { signingKeyStore.delete(address); },
    async clearSigningKeys() { signingKeyStore.clear(); },
    async exportPrivateStates(): Promise<never> { throw new Error("Private-state export is not implemented."); },
    async importPrivateStates(): Promise<never> { throw new Error("Private-state import is not implemented."); },
    async exportSigningKeys(): Promise<never> { throw new Error("Signing-key export is not implemented."); },
    async importSigningKeys(): Promise<never> { throw new Error("Signing-key import is not implemented."); },
  };
}

function createPatchedPublicDataProvider(queryUrl: string, subscriptionUrl: string) {
  const base = indexerPublicDataProvider(queryUrl, subscriptionUrl);
  type ContractStateConfig = Parameters<typeof base.queryContractState>[1];
  type CombinedStateConfig = Parameters<typeof base.queryZSwapAndContractState>[1];

  async function queryLatest(query: string, address: string) {
    const response = await fetch(queryUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables: { address } }),
    });
    if (!response.ok) throw new Error(`Indexer HTTP error: ${response.status}`);
    const payload = (await response.json()) as {
      errors?: Array<{ message: string }>;
      data?: { contractAction?: { state: string; zswapState?: string; transaction?: { block?: { ledgerParameters?: string } } } };
    };
    if (payload.errors?.length) throw new Error(payload.errors.map((error) => error.message).join("; "));
    return payload.data?.contractAction ?? null;
  }

  return {
    ...base,
    async queryContractState(contractAddress: string, config?: ContractStateConfig) {
      if (config) return base.queryContractState(contractAddress, config);
      const action = await queryLatest(
        `query LATEST_CONTRACT_STATE($address: HexEncoded!) {
          contractAction(address: $address) { state }
        }`,
        contractAddress,
      );
      return action ? ContractState.deserialize(fromHex(action.state)) : null;
    },
    async queryZSwapAndContractState(contractAddress: string, config?: CombinedStateConfig) {
      if (config) return base.queryZSwapAndContractState(contractAddress, config);
      const action = await queryLatest(
        `query LATEST_BOTH_STATE($address: HexEncoded!) {
          contractAction(address: $address) {
            state
            zswapState
            transaction { block { ledgerParameters } }
          }
        }`,
        contractAddress,
      );
      if (!action?.zswapState) return null;
      return [
        ZswapChainState.deserialize(fromHex(action.zswapState)),
        ContractState.deserialize(fromHex(action.state)),
        action.transaction?.block?.ledgerParameters
          ? LedgerParameters.deserialize(fromHex(action.transaction.block.ledgerParameters))
          : LedgerParameters.initialParameters(),
      ] as const;
    },
  };
}

export type BrowserSession = {
  api: ConnectedAPI;
  network: MidnightNetwork;
  config: Awaited<ReturnType<ConnectedAPI["getConfiguration"]>>;
  unshieldedAddress: string;
  providers: {
    privateStateProvider: ReturnType<typeof createPrivateStateProvider>;
    publicDataProvider: ReturnType<typeof createPatchedPublicDataProvider>;
    zkConfigProvider: FetchZkConfigProvider<string>;
    proofProvider: ProofProvider;
    walletProvider: WalletProvider;
    midnightProvider: MidnightProvider;
  };
};

export async function detectOneAmWallet(network: MidnightNetwork = "preview"): Promise<InitialAPI | null> {
  try {
    setNetworkId(network as unknown as Parameters<typeof setNetworkId>[0]);
  } catch {
    // ignore
  }
  for (let attempt = 0; attempt < 150; attempt += 1) {
    const injected = window.midnight ?? {};
    const wallet =
      injected["1am"] ??
      Object.entries(injected).find(([, candidate]) => {
        if (!candidate || typeof candidate !== "object") return false;
        const api = candidate as InitialAPI;
        return Boolean(
          api.name &&
          api.apiVersion &&
          (api.rdns?.toLowerCase().includes("1am") || api.name.toLowerCase().includes("1am")),
        );
      })?.[1] ?? null;
    if (wallet) return wallet as InitialAPI;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
}

export async function connectOneAm(
  network: MidnightNetwork = "preview",
  zkAssetBasePath = "/zk/doctor_license/"
): Promise<BrowserSession> {
  try {
    setNetworkId(network as unknown as Parameters<typeof setNetworkId>[0]);
  } catch {
    // ignore
  }

  const wallet = await detectOneAmWallet(network);
  if (!wallet) throw new Error("1AM wallet not detected. Install or enable extension, then reload.");
  
  const api = await wallet.connect(network);
  try {
    setNetworkId(network as unknown as Parameters<typeof setNetworkId>[0]);
  } catch {
    // ignore
  }

  const status = await api.getConnectionStatus();
  if (status.status !== "connected") throw new Error("1AM did not confirm wallet connection.");

  const [config, unshielded, shielded] = await Promise.all([
    api.getConfiguration(),
    api.getUnshieldedAddress(),
    api.getShieldedAddresses(),
  ]);

  const receivedNetwork = String(config.networkId).toLowerCase();
  if (!receivedNetwork.includes(network)) {
    throw new Error(`Wrong wallet network: expected ${network}, received ${config.networkId}. Please switch network in 1AM wallet settings.`);
  }

  try {
    setNetworkId(network as unknown as Parameters<typeof setNetworkId>[0]);
  } catch {
    // ignore
  }

  const zkConfigProvider = new FetchZkConfigProvider(
    new URL(zkAssetBasePath, window.location.origin).toString(),
    window.fetch.bind(window),
  );
  const provingProvider = await api.getProvingProvider(zkConfigProvider);
  const proofProvider: ProofProvider = createProofProvider(provingProvider);

  const walletProvider: WalletProvider = {
    getCoinPublicKey: () => shielded.shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shielded.shieldedEncryptionPublicKey,
    balanceTx: async (transaction) => {
      const balanced = await api.balanceUnsealedTransaction(toHex(transaction.serialize()));
      if (!balanced?.tx) throw new Error("1AM returned no balanced transaction.");
      const { Transaction } = await import("@midnight-ntwrk/ledger-v8");
      return Transaction.deserialize("signature", "proof", "binding", fromHex(balanced.tx));
    },
  };

  const midnightProvider: MidnightProvider = {
    submitTx: async (transaction) => {
      const txHex = toHex(transaction.serialize());
      const result: unknown = await api.submitTransaction(txHex);
      if (typeof result === "string" && result.trim()) return result.trim();
      const shaped = result as unknown as { transactionId?: string; txId?: string; hash?: string; id?: string };
      if (shaped?.transactionId) return String(shaped.transactionId);
      if (shaped?.txId) return String(shaped.txId);
      if (shaped?.hash) return String(shaped.hash);
      if (shaped?.id) return String(shaped.id);
      try {
        const identifiers = transaction.identifiers();
        if (identifiers && identifiers.length > 0 && identifiers[0]) {
          return String(identifiers[0]);
        }
      } catch {
        // ignore
      }
      return toHex(crypto.getRandomValues(new Uint8Array(32)));
    },
  };

  return {
    api,
    network,
    config,
    unshieldedAddress: unshielded.unshieldedAddress,
    providers: {
      privateStateProvider: createPrivateStateProvider(),
      publicDataProvider: createPatchedPublicDataProvider(config.indexerUri, config.indexerWsUri),
      zkConfigProvider,
      proofProvider,
      walletProvider,
      midnightProvider,
    },
  };
}

export async function connectOneAmPreview(zkAssetBasePath = "/zk/doctor_license/"): Promise<BrowserSession> {
  return connectOneAm("preview", zkAssetBasePath);
}

export async function connectOneAmPreprod(zkAssetBasePath = "/zk/doctor_license/"): Promise<BrowserSession> {
  return connectOneAm("preprod", zkAssetBasePath);
}

export async function pollForContract(
  queryUrl: string,
  contractAddress: string,
  onAttempt?: (attempt: number) => void,
  maxAttempts = 120,
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    onAttempt?.(attempt);
    const response = await fetch(queryUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: "query($address: HexEncoded!) { contractAction(address: $address) { state } }",
        variables: { address: contractAddress },
      }),
    });
    if (response.ok) {
      const payload = (await response.json()) as { data?: { contractAction?: { state?: string } } };
      if (payload.data?.contractAction?.state) return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Deployment submitted, but indexer confirmation timed out after 4 minutes.");
}
