"use client";

import {
  createCircuitCallTxInterface,
  createUnprovenCallTx,
  submitTxAsync,
} from "@midnight-ntwrk/midnight-js-contracts";


import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { Contract } from "../contracts/managed/doctor_license/contract/index.js";
import {
  createInitialPrivateState,
  createWitnesses,
  makeCompiledContract,
  PRIVATE_STATE_ID,
  type AquasPrivateState,
} from "./deploy-doctor-license";
import { fromHex, toHex, type BrowserSession } from "./midnight-browser";

export type PrivateCredential = {
  payload: string;
  nonce: string;
  boardKey: string;
  doctorSecret: string;
};

type ContractInternals = {
  _boardKey_0(secret: Uint8Array): Uint8Array;
  _boardAuthorization_0(key: Uint8Array, secret: Uint8Array): Uint8Array;
  _licenseCommitment_0(payload: Uint8Array, nonce: Uint8Array, issuer: Uint8Array): Uint8Array;
};

type CallResult = { public?: { txId?: string; transactionId?: string }; txId?: string };
type CallInterface = Record<string, (...args: unknown[]) => Promise<CallResult>>;

export function cleanContractAddress(address: string): string {
  return address.trim().replace(/^0x/i, "").toLowerCase();
}

function exactBytes(value: string, label: string): Uint8Array {
  const clean = value.trim().replace(/^0x/i, "");
  const bytes = fromHex(clean);
  if (bytes.length !== 32) throw new Error(`${label} must contain 64 hexadecimal characters.`);
  return bytes;
}

function internals(): ContractInternals {
  return new Contract(createWitnesses()) as unknown as ContractInternals;
}

export function deriveBoardIdentity(boardSecretHex: string) {
  const secret = exactBytes(boardSecretHex, "Board secret");
  const key = internals()._boardKey_0(secret);
  const authorization = internals()._boardAuthorization_0(key, secret);
  return { key, authorization };
}

export async function createPrivateCredential(
  boardSecretHex: string,
  metadata: Record<string, string>,
): Promise<{ credentialId: string; privateCredential: PrivateCredential }> {
  const boardSecret = exactBytes(boardSecretHex, "Board secret");
  const boardKey = internals()._boardKey_0(boardSecret);
  const encoded = new TextEncoder().encode(JSON.stringify(metadata));
  const payload = new Uint8Array(await crypto.subtle.digest("SHA-256", encoded));
  const nonce = crypto.getRandomValues(new Uint8Array(32));
  const doctorSecret = crypto.getRandomValues(new Uint8Array(32));
  const credentialId = internals()._licenseCommitment_0(payload, nonce, boardKey);
  return {
    credentialId: toHex(credentialId),
    privateCredential: {
      payload: toHex(payload),
      nonce: toHex(nonce),
      boardKey: toHex(boardKey),
      doctorSecret: toHex(doctorSecret),
    },
  };
}

export function rotatePrivateCredential(privateCredential: PrivateCredential) {
  const nonce = crypto.getRandomValues(new Uint8Array(32));
  const credentialId = internals()._licenseCommitment_0(
    exactBytes(privateCredential.payload, "Credential payload"),
    nonce,
    exactBytes(privateCredential.boardKey, "Board key"),
  );
  return {
    credentialId: toHex(credentialId),
    privateCredential: { ...privateCredential, nonce: toHex(nonce) },
  };
}

async function callContract(
  session: BrowserSession,
  contractAddress: string,
  privateState: AquasPrivateState,
  circuit: string,
  args: unknown[],
): Promise<string> {
  const cleanAddr = cleanContractAddress(contractAddress);
  
  try {
    setNetworkId(session.network as unknown as Parameters<typeof setNetworkId>[0]);
  } catch {
    // ignore
  }

  session.providers.privateStateProvider.setContractAddress(cleanAddr);
  await session.providers.privateStateProvider.set(PRIVATE_STATE_ID, privateState);

  // 1. Create the unproven call transaction without blocking on indexer watch
  const makeCall = createUnprovenCallTx as unknown as (
    providers: unknown,
    options: unknown,
  ) => Promise<{ private: { unprovenTx: unknown; nextPrivateState?: unknown } }>;

  let unprovenCallTx: unknown;
  let nextPrivateState: unknown;

  try {
    const unprovenData = await makeCall(session.providers, {
      compiledContract: makeCompiledContract(),
      contractAddress: cleanAddr,
      circuitId: circuit,
      args,
      privateStateId: PRIVATE_STATE_ID,
    });
    unprovenCallTx = unprovenData.private.unprovenTx;
    nextPrivateState = unprovenData.private.nextPrivateState;
  } catch (createErr) {
    console.warn("[Aquas] createUnprovenCallTx fallback to circuit interface:", createErr);
    // Fallback: try createCircuitCallTxInterface
    const createCalls = createCircuitCallTxInterface as unknown as (
      providers: unknown,
      compiledContract: unknown,
      address: string,
      privateStateId: string,
    ) => CallInterface;
    
    const circuitInterface = createCalls(
      session.providers,
      makeCompiledContract(),
      cleanAddr,
      PRIVATE_STATE_ID,
    );
    
    if (typeof circuitInterface[circuit] === "function") {
      const res = await circuitInterface[circuit](...args);
      const txId = res?.public?.txId || res?.public?.transactionId || res?.txId;
      return txId ? String(txId).replace(/^0x/i, "") : cleanAddr;
    }
    throw createErr;
  }

  // 2. Submit asynchronously: proveTx (1AM Proofstation) -> balanceTx (1AM approval popup) -> submitTx (on-chain)
  // This opens the 1AM wallet popup for the user to approve!
  const submitFn = submitTxAsync as unknown as (
    providers: unknown,
    options: { unprovenTx: unknown },
  ) => Promise<unknown>;

  const txResult = await submitFn(session.providers, {
    unprovenTx: unprovenCallTx,
  });

  // 3. Save next private state if updated
  if (nextPrivateState) {
    await session.providers.privateStateProvider.set(PRIVATE_STATE_ID, nextPrivateState);
  }

  let txId = typeof txResult === "string" && txResult.trim()
    ? txResult.trim().replace(/^0x/i, "")
    : (txResult as { transactionId?: string })?.transactionId?.replace(/^0x/i, "") || cleanAddr;

  if (txId.length === 66 && txId.startsWith("00")) {
    txId = txId.slice(2);
  }

  return txId;
}



export async function registerBoardOnChain(
  session: BrowserSession,
  contractAddress: string,
  ownerSecretHex: string,
  boardSecretHex: string,
) {
  const ownerSecret = exactBytes(ownerSecretHex, "Owner secret");
  const boardSecret = exactBytes(boardSecretHex, "Board secret");
  const { key, authorization } = deriveBoardIdentity(boardSecretHex);
  const privateState = { ...createInitialPrivateState(ownerSecret), boardSecret };
  return callContract(session, contractAddress, privateState, "createBoard", [key, authorization]);
}

export async function issueLicenseOnChain(
  session: BrowserSession,
  contractAddress: string,
  boardSecretHex: string,
  credentialId: string,
  issuedAt: bigint,
  expiresAt: bigint,
) {
  const privateState = createInitialPrivateState(new Uint8Array(32));
  privateState.boardSecret = exactBytes(boardSecretHex, "Board secret");
  return callContract(session, contractAddress, privateState, "createLicense", [
    exactBytes(credentialId, "Credential ID"),
    issuedAt,
    expiresAt,
  ]);
}

export async function renewLicenseOnChain(
  session: BrowserSession,
  contractAddress: string,
  boardSecretHex: string,
  oldCredentialId: string,
  newCredentialId: string,
  issuedAt: bigint,
  expiresAt: bigint,
) {
  const privateState = createInitialPrivateState(new Uint8Array(32));
  privateState.boardSecret = exactBytes(boardSecretHex, "Board secret");
  return callContract(session, contractAddress, privateState, "updateLicense", [
    exactBytes(oldCredentialId, "Old credential ID"),
    exactBytes(newCredentialId, "New credential ID"),
    issuedAt,
    expiresAt,
  ]);
}

export async function revokeLicenseOnChain(
  session: BrowserSession,
  contractAddress: string,
  boardSecretHex: string,
  credentialId: string,
) {
  const privateState = createInitialPrivateState(new Uint8Array(32));
  privateState.boardSecret = exactBytes(boardSecretHex, "Board secret");
  return callContract(session, contractAddress, privateState, "deleteLicense", [
    exactBytes(credentialId, "Credential ID"),
  ]);
}

export async function proveLicenseOnChain(
  session: BrowserSession,
  contractAddress: string,
  privateCredential: PrivateCredential,
  credentialId: string,
  challenge: Uint8Array,
) {
  const privateState = createInitialPrivateState(new Uint8Array(32));
  privateState.credentialPayload = exactBytes(privateCredential.payload, "Credential payload");
  privateState.credentialNonce = exactBytes(privateCredential.nonce, "Credential nonce");
  privateState.credentialBoardKey = exactBytes(privateCredential.boardKey, "Board key");
  privateState.doctorSecret = exactBytes(privateCredential.doctorSecret, "Doctor secret");
  return callContract(session, contractAddress, privateState, "proveValidLicense", [
    exactBytes(credentialId, "Credential ID"),
    challenge,
    BigInt(Math.floor(Date.now() / 1000)),
  ]);
}
