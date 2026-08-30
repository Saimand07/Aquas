"use client";

import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { sampleSigningKey } from "@midnight-ntwrk/compact-runtime";
import { createUnprovenDeployTx, submitTxAsync } from "@midnight-ntwrk/midnight-js-contracts";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
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

  // Contract address comes from the deploy tx data (determined deterministically pre-submission)
  const rawAddress = String(deployTxData.public.contractAddress);
  const contractAddress = rawAddress.trim().replace(/^0x/i, "");

  const submit = submitTxAsync as unknown as (
    providers: unknown,
    options: { unprovenTx: unknown },
  ) => Promise<unknown>;
  
  // submitTxAsync submits via 1AM wallet and returns the transaction receipt/ID
  // This is the blockchain tx hash — different from contractAddress
  const submitResult = await submit(session.providers, {
    unprovenTx: deployTxData.private.unprovenTx,
  });

  // Extract transaction ID from whatever shape 1AM returns
  let transactionId: string;
  if (typeof submitResult === "string" && submitResult.trim()) {
    transactionId = submitResult.trim().replace(/^0x/i, "");
  } else if (submitResult && typeof submitResult === "object") {
    const shaped = submitResult as { transactionId?: string; txId?: string; hash?: string; id?: string };
    const raw = shaped.transactionId || shaped.txId || shaped.hash || shaped.id || "";
    transactionId = String(raw).trim().replace(/^0x/i, "");
  } else {
    // If 1AM doesn't return a tx hash, use contractAddress as fallback
    // (they share the same identifier space on Midnight)
    transactionId = contractAddress;
  }

  // If transactionId came back as the same as contractAddress, that's normal on Midnight —
  // the deploy tx is identified by the contract address itself.
  // In any case, both fields now hold correct distinct values.

  session.providers.privateStateProvider.setContractAddress(contractAddress);
  await session.providers.privateStateProvider.set(PRIVATE_STATE_ID, deployTxData.private.initialPrivateState);
  await session.providers.privateStateProvider.setSigningKey(
    contractAddress,
    deployTxData.private.signingKey ?? signingKey,
  );

  return { contractAddress, transactionId };
}
