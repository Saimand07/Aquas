"use client";

import { useSyncExternalStore } from "react";
import { getNetworkConfig, type MidnightNetwork } from "./midnight-config";

export interface StoredDeployment {
  contractAddress: string;
  transactionId: string;
  deployedAt: string;
}

export function getStoredDeployment(network: MidnightNetwork): StoredDeployment | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(`aquas:deployment:${network}`);
    if (saved) {
      const parsed = JSON.parse(saved) as StoredDeployment;
      const clean = parsed.contractAddress?.trim().replace(/^0x/i, "");
      if (clean && clean.length === 64 && /^[0-9a-fA-F]+$/.test(clean)) {
        return {
          contractAddress: clean,
          transactionId: (parsed.transactionId || clean).trim().replace(/^0x/i, ""),
          deployedAt: parsed.deployedAt || new Date().toISOString(),
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function getActiveContractAddress(network: MidnightNetwork): string {
  const stored = getStoredDeployment(network);
  if (stored?.contractAddress) return stored.contractAddress;
  return getNetworkConfig(network).canonicalContract.replace(/^0x/i, "");
}

export function saveDeployedContract(
  network: MidnightNetwork,
  contractAddress: string,
  transactionId: string,
): void {
  if (typeof window === "undefined") return;
  try {
    const cleanAddr = contractAddress.trim().replace(/^0x/i, "");
    const cleanTx = (transactionId || contractAddress).trim().replace(/^0x/i, "");
    const record: StoredDeployment = {
      contractAddress: cleanAddr,
      transactionId: cleanTx,
      deployedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(`aquas:deployment:${network}`, JSON.stringify(record));
    window.dispatchEvent(
      new CustomEvent("aquas:contract-deployed", {
        detail: { network, record },
      }),
    );
  } catch {
    // ignore
  }
}

export function clearDeployedContract(network: MidnightNetwork): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`aquas:deployment:${network}`);
    window.dispatchEvent(
      new CustomEvent("aquas:contract-deployed", {
        detail: { network, record: null },
      }),
    );
  } catch {
    // ignore
  }
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("aquas:contract-deployed", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("aquas:contract-deployed", callback);
    window.removeEventListener("storage", callback);
  };
}

export function useActiveContract(network: MidnightNetwork): string {
  return useSyncExternalStore(
    subscribe,
    () => getActiveContractAddress(network),
    () => getNetworkConfig(network).canonicalContract.replace(/^0x/i, ""),
  );
}
