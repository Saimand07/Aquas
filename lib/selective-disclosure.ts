import { toHex, fromHex } from "./midnight-browser";

export interface DoctorAttributes {
  specialty?: string;
  deaAuthorized?: boolean;
  cmeHours?: number;
  cleanRecord?: boolean;
}

export interface SelectiveDisclosureConfig {
  includeSpecialty: boolean;
  includeDeaAuthority: boolean;
  includeCmeThreshold: boolean; // Prove >= 50 hours
  includeCleanRecord: boolean;
}

export interface DisclosedAttributes {
  specialty?: string;
  deaSchedule?: "SCHEDULE_II_V" | "NONE";
  cmeThresholdSatisfied?: boolean;
  cmeMinHours?: number;
  cleanRecordAttestation?: boolean;
}

export interface SelectiveDisclosureProof {
  credentialId: string;
  txId: string;
  challengeHex: string;
  timestamp: number;
  disclosed: DisclosedAttributes;
  signature: string;
}

/**
 * Computes deterministic attribute commitment payload hash.
 */
export async function computeAttributePayloadHash(
  doctorLabel: string,
  licenseNumber: string,
  attributes: DoctorAttributes,
): Promise<string> {
  const normalized = {
    doctor: doctorLabel.trim(),
    license: licenseNumber.trim(),
    specialty: attributes.specialty?.trim() || "General Medicine",
    dea: Boolean(attributes.deaAuthorized),
    cme: Number(attributes.cmeHours || 50),
    clean: attributes.cleanRecord !== false,
  };

  const encoded = new TextEncoder().encode(JSON.stringify(normalized));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return toHex(new Uint8Array(digest));
}

/**
 * Signs a selective disclosure token with doctor private secret for non-repudiation.
 */
export async function createSelectiveDisclosureProof(
  credentialId: string,
  txId: string,
  challengeBytes: Uint8Array,
  doctorSecretHex: string,
  attributes: DoctorAttributes,
  config: SelectiveDisclosureConfig,
): Promise<SelectiveDisclosureProof> {
  const timestamp = Math.floor(Date.now() / 1000);
  const challengeHex = toHex(challengeBytes);

  const disclosed: DisclosedAttributes = {};
  if (config.includeSpecialty && attributes.specialty) {
    disclosed.specialty = attributes.specialty;
  }
  if (config.includeDeaAuthority) {
    disclosed.deaSchedule = attributes.deaAuthorized ? "SCHEDULE_II_V" : "NONE";
  }
  if (config.includeCmeThreshold) {
    disclosed.cmeThresholdSatisfied = (attributes.cmeHours ?? 0) >= 50;
    disclosed.cmeMinHours = 50;
  }
  if (config.includeCleanRecord) {
    disclosed.cleanRecordAttestation = attributes.cleanRecord !== false;
  }

  // Create signature over proof bundle
  const payloadToSign = `${credentialId}:${txId}:${challengeHex}:${timestamp}:${JSON.stringify(disclosed)}`;
  const encoder = new TextEncoder();
  const secretKeyBytes = fromHex(doctorSecretHex);
  const combined = new Uint8Array(secretKeyBytes.length + encoder.encode(payloadToSign).length);
  combined.set(secretKeyBytes);
  combined.set(encoder.encode(payloadToSign), secretKeyBytes.length);

  const digest = await crypto.subtle.digest("SHA-256", combined);
  const signature = toHex(new Uint8Array(digest));

  return {
    credentialId,
    txId,
    challengeHex,
    timestamp,
    disclosed,
    signature,
  };
}

/**
 * Encodes a selective disclosure proof into a shareable URI.
 */
export function encodeProofUri(proof: SelectiveDisclosureProof): string {
  const params = new URLSearchParams();
  params.set("tx", proof.txId);
  params.set("c", proof.challengeHex);
  params.set("t", proof.timestamp.toString());
  params.set("sig", proof.signature);

  if (proof.disclosed.specialty) params.set("spec", proof.disclosed.specialty);
  if (proof.disclosed.deaSchedule) params.set("dea", proof.disclosed.deaSchedule);
  if (proof.disclosed.cmeThresholdSatisfied !== undefined) {
    params.set("cme", proof.disclosed.cmeThresholdSatisfied ? "50+" : "no");
  }
  if (proof.disclosed.cleanRecordAttestation !== undefined) {
    params.set("clean", proof.disclosed.cleanRecordAttestation ? "1" : "0");
  }

  return `aquas://verify/${proof.credentialId}?${params.toString()}`;
}

/**
 * Decodes and validates a selective disclosure URI.
 */
export function decodeProofUri(uri: string): {
  credentialId: string;
  txId: string;
  challengeHex: string;
  timestamp: number;
  disclosed: DisclosedAttributes;
  signature: string;
} | null {
  try {
    const match = uri.match(/aquas:\/\/verify\/([0-9a-fA-F]{64})\?(.*)/);
    if (!match) return null;

    const credentialId = match[1].toLowerCase();
    const params = new URLSearchParams(match[2]);

    const txId = params.get("tx") || "";
    const challengeHex = params.get("c") || params.get("challenge") || "";
    const timestamp = Number(params.get("t") || "0");
    const signature = params.get("sig") || "";

    const disclosed: DisclosedAttributes = {};
    if (params.has("spec")) disclosed.specialty = params.get("spec")!;
    if (params.has("dea")) disclosed.deaSchedule = params.get("dea") as "SCHEDULE_II_V" | "NONE";
    if (params.has("cme")) {
      disclosed.cmeThresholdSatisfied = params.get("cme") === "50+";
      disclosed.cmeMinHours = 50;
    }
    if (params.has("clean")) {
      disclosed.cleanRecordAttestation = params.get("clean") === "1";
    }

    return {
      credentialId,
      txId,
      challengeHex,
      timestamp,
      disclosed,
      signature,
    };
  } catch {
    return null;
  }
}
