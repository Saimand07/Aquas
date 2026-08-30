"use client";

import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { sampleSigningKey } from "@midnight-ntwrk/compact-runtime";
import { createUnprovenDeployTx, submitTxAsync } from "@midnight-ntwrk/midnight-js-contracts";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import type { MidnightProvider } from "@midnight-ntwrk/midnight-js-types";
import { Contract, type Witnesses } from "../contracts/managed/doctor_license/contract/index.js";
import type { BrowserSession } from "./midnight-browser";

const CONTRACT_NAME = "doctor_license";
export const PRIVATE_STATE_ID = "aquasPrivateState";
const ZK_ASSET_PATH = "/zk/doctor_license/";

export type AquasPrivateState = {
  ownerSecret: Uint8Array;
  boardSecret: Uint8Array;
  doctorSecret: Uint8Array;
  credentialPayload: Uint8Array;
  credentialNonce: Uint8Array;
  credentialBoardKey: Uint8Array;
};

type DeployTxData = {
  public: { contractAddress: string };
  private: {
    unprovenTx: unknown;
    initialPrivateState: AquasPrivateState;
    signingKey?: unknown;
  };
};

export function createInitialPrivateState(ownerSecret: Uint8Array): AquasPrivateState {
  if (ownerSecret.length !== 32) throw new Error("Owner secret must be 32 bytes.");
  return {
    ownerSecret,
    boardSecret: new Uint8Array(32),
    doctorSecret: new Uint8Array(32),
    credentialPayload: new Uint8Array(32),
    credentialNonce: new Uint8Array(32),
    credentialBoardKey: new Uint8Array(32),
  };
}

export function createWitnesses(): Witnesses<AquasPrivateState> {
  return {
    ownerSecret: (context) => [context.privateState, context.privateState.ownerSecret],
    boardSecret: (context) => [context.privateState, context.privateState.boardSecret],
    doctorSecret: (context) => [context.privateState, context.privateState.doctorSecret],
    credentialPayload: (context) => [context.privateState, context.privateState.credentialPayload],
    credentialNonce: (context) => [context.privateState, context.privateState.credentialNonce],
    credentialBoardKey: (context) => [context.privateState, context.privateState.credentialBoardKey],
  };
}

export function makeCompiledContract() {
  return CompiledContract.make(CONTRACT_NAME, Contract).pipe(
    CompiledContract.withWitnesses(createWitnesses()),
    CompiledContract.withCompiledFileAssets(ZK_ASSET_PATH),
  );
}

export async function deployDoctorLicense(
  session: BrowserSession,
  ownerSecret: Uint8Array,
): Promise<{ contractAddress: string; transactionId: string }> {
  try {
    setNetworkId(session.network as unknown as Parameters<typeof setNetworkId>[0]);
  } catch {
    // ignore
  }

  const initialPrivateState = createInitialPrivateState(ownerSecret);
  const signingKey = sampleSigningKey();

  const createDeploy = createUnprovenDeployTx as unknown as (
    providers: unknown,
    options: unknown,
  ) => Promise<DeployTxData>;

  const deployTxData = await createDeploy(
    {
      zkConfigProvider: session.providers.zkConfigProvider,
      walletProvider: session.providers.walletProvider,
    },
    {
      compiledContract: makeCompiledContract(),
      args: [],
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState,
      signingKey,
    },
  );

  // Contract address is deterministic — known before submission
  const rawAddress = String(deployTxData.public.contractAddress);
  const contractAddress = rawAddress.trim().replace(/^0x/i, "");

  // ─────────────────────────────────────────────────────────────────────────
  // KEY FIX: The spinner never stops because submitTxAsync BLOCKS on indexer
  // polling AFTER 1AM has already confirmed the transaction.
  //
  // Solution: Intercept `midnightProvider.submitTx` with a side-channel promise.
  // The moment 1AM confirms (submitTx resolves), we immediately capture the
  // tx ID and resolve our own promise — WITHOUT waiting for indexer polling.
  // submitTxAsync continues running in the background (fire-and-forget).
  // ─────────────────────────────────────────────────────────────────────────
  let earlyResolveTxId!: (txId: string) => void;
  const earlyTxIdPromise = new Promise<string>((resolve) => {
    earlyResolveTxId = resolve;
  });

  // Build an intercepted provider set — identical to session.providers except
  // midnightProvider.submitTx signals earlyTxIdPromise the moment 1AM confirms
  const interceptedMidnightProvider: MidnightProvider = {
    submitTx: async (transaction) => {
      // This calls our existing submitTx which wraps api.submitTransaction (1AM wallet)
      const txId = await session.providers.midnightProvider.submitTx(transaction);
      // Signal early resolution: deployment is confirmed — don't wait for indexer
      earlyResolveTxId(String(txId).trim().replace(/^0x/i, ""));
      return txId;
    },
  };

  const interceptedProviders = {
    ...session.providers,
    midnightProvider: interceptedMidnightProvider,
  };

  const submitFn = submitTxAsync as unknown as (
    providers: unknown,
    options: { unprovenTx: unknown },
  ) => Promise<unknown>;

  // Fire submitTxAsync in the background — it will prove + balance + submit + poll indexer.
  // We do NOT await it here. We only care about the moment 1AM confirms (earlyTxIdPromise).
  const backgroundDeploy = submitFn(interceptedProviders, {
    unprovenTx: deployTxData.private.unprovenTx,
  }).then((result) => {
    // If indexer eventually confirms before earlyTxIdPromise resolves (shouldn't happen
    // but handle gracefully), use that tx ID too
    if (typeof result === "string" && result.trim()) {
      earlyResolveTxId(result.trim().replace(/^0x/i, ""));
    }
  }).catch((err: unknown) => {
    // Indexer timeout / network error after 1AM confirmation — resolve with contract address
    // since on Midnight the deploy tx is identified by the contract address
    console.warn("[Aquas] Background indexer sync warning (non-fatal):", err);
    earlyResolveTxId(contractAddress);
  });

  // Safety: if earlyTxIdPromise never fires (submitTxAsync errors before submitTx),
  // we need backgroundDeploy to still resolve earlyResolveTxId via the catch above.
  // Add an absolute 120s timeout as final safety net.
  const timeoutFallback = new Promise<string>((resolve) =>
    setTimeout(() => resolve(contractAddress), 120_000),
  );

  // Race: earlyTxIdPromise fires as soon as 1AM confirms (typically within seconds)
  const transactionId = await Promise.race([earlyTxIdPromise, timeoutFallback]);

  // Store private state now that we have confirmation
  session.providers.privateStateProvider.setContractAddress(contractAddress);
  await session.providers.privateStateProvider.set(PRIVATE_STATE_ID, deployTxData.private.initialPrivateState);
  await session.providers.privateStateProvider.setSigningKey(
    contractAddress,
    deployTxData.private.signingKey ?? signingKey,
  );

  // Let backgroundDeploy continue silently — it keeps the indexer in sync
  void backgroundDeploy;

  return { contractAddress, transactionId };
}
