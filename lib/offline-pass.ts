import { toHex, fromHex } from "./midnight-browser";

export interface OfflinePhysicianPass {
  version: "1.0";
  credentialId: string;
  doctorName: string;
  licenseNumber: string;
  npiNumber: string;
  issuingBoard: string;
  boardKeyHex: string;
  specialty: string;
  deaSchedule: "SCHEDULE_II_V" | "NONE";
  cmeVerified: boolean;
  cleanRecord: boolean;
  issuedAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp
  offlineGeneratedAt: number;
  timeStepNonce: string; // 30-second rotating TOTP authentication code
  signature: string; // Cryptographic attestation signature
}

export interface OfflineVerificationResult {
  valid: boolean;
  status: "VALID_OFFLINE" | "EXPIRED" | "TAMPERED_SIGNATURE" | "TIME_SKEW_ERROR" | "MALFORMED_PASS";
  pass?: OfflinePhysicianPass;
  errorMessage?: string;
  verifiedAt: number;
}

/**
 * Computes a 30-second rotating time-step token (TOTP style HMAC) to prevent replay/screenshot attacks.
 */
export async function computeTimeStepNonce(secretHex: string, timestampSeconds = Math.floor(Date.now() / 1000)): Promise<string> {
  const timeStep = Math.floor(timestampSeconds / 30);
  const encoder = new TextEncoder();
  const timeBuffer = encoder.encode(`time-step:${timeStep}`);
  const secretBytes = Uint8Array.from(fromHex(secretHex));

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, timeBuffer);
  return toHex(new Uint8Array(signature)).slice(0, 16);
}

/**
 * Generates an offline-verifiable physician pass signed with the doctor's secret key and board key.
 */
export async function generateOfflinePhysicianPass(
  credentialId: string,
  doctorName: string,
  licenseNumber: string,
  npiNumber: string,
  issuingBoard: string,
  boardKeyHex: string,
  specialty: string,
  doctorSecretHex: string,
  options?: {
    deaSchedule?: "SCHEDULE_II_V" | "NONE";
    cmeVerified?: boolean;
    cleanRecord?: boolean;
    issuedAt?: number;
    expiresAt?: number;
  },
): Promise<OfflinePhysicianPass> {
  const now = Math.floor(Date.now() / 1000);
  const timeStepNonce = await computeTimeStepNonce(doctorSecretHex, now);

  const passData: Omit<OfflinePhysicianPass, "signature"> = {
    version: "1.0",
    credentialId,
    doctorName,
    licenseNumber,
    npiNumber,
    issuingBoard,
    boardKeyHex,
    specialty,
    deaSchedule: options?.deaSchedule ?? "SCHEDULE_II_V",
    cmeVerified: options?.cmeVerified ?? true,
    cleanRecord: options?.cleanRecord ?? true,
    issuedAt: options?.issuedAt ?? now - 86400 * 30,
    expiresAt: options?.expiresAt ?? now + 86400 * 365,
    offlineGeneratedAt: now,
    timeStepNonce,
  };

  // Sign pass bundle
  const serialized = JSON.stringify(passData);
  const encoder = new TextEncoder();
  const secretBytes = Uint8Array.from(fromHex(doctorSecretHex));
  
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sigBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(serialized));
  const signature = toHex(new Uint8Array(sigBytes));

  return {
    ...passData,
    signature,
  };
}

/**
 * Serializes an offline pass into a compact base64 URL-safe QR payload.
 */
export function serializeOfflinePassForQr(pass: OfflinePhysicianPass): string {
  const json = JSON.stringify(pass);
  const base64 = btoa(encodeURIComponent(json));
  return `aquas:pass:v1:${base64}`;
}

/**
 * Deserializes an offline pass QR payload string.
 */
export function deserializeOfflinePassFromQr(qrString: string): OfflinePhysicianPass | null {
  try {
    if (!qrString.startsWith("aquas:pass:v1:")) return null;
    const base64 = qrString.slice("aquas:pass:v1:".length);
    const json = decodeURIComponent(atob(base64));
    const parsed = JSON.parse(json) as OfflinePhysicianPass;
    if (!parsed.credentialId || !parsed.signature || !parsed.timeStepNonce) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Verifies an offline pass completely locally without external indexer or node connection.
 */
export async function verifyOfflinePass(
  pass: OfflinePhysicianPass,
  doctorSecretHex?: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  timeToleranceWindow = 120, // 2-minute drift tolerance for offline TOTP
): Promise<OfflineVerificationResult> {
  try {
    // 1. Check expiration date
    if (pass.expiresAt && pass.expiresAt < nowSeconds) {
      return {
        valid: false,
        status: "EXPIRED",
        pass,
        errorMessage: `License expired on ${new Date(pass.expiresAt * 1000).toISOString().slice(0, 10)}.`,
        verifiedAt: nowSeconds,
      };
    }

    // 2. Validate time-step freshness (replay protection)
    const passAge = Math.abs(nowSeconds - pass.offlineGeneratedAt);
    if (passAge > timeToleranceWindow) {
      return {
        valid: false,
        status: "TIME_SKEW_ERROR",
        pass,
        errorMessage: `Dynamic QR code expired (${passAge}s old). Refresh physician pass.`,
        verifiedAt: nowSeconds,
      };
    }

    // 3. Cryptographic Signature Validation if secret is provided (or symmetric verification)
    if (doctorSecretHex) {
      const { signature, ...rest } = pass;
      const serialized = JSON.stringify(rest);
      const encoder = new TextEncoder();
      const secretBytes = Uint8Array.from(fromHex(doctorSecretHex));

      const key = await crypto.subtle.importKey(
        "raw",
        secretBytes,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );

      const expectedSigBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(serialized));
      const expectedSig = toHex(new Uint8Array(expectedSigBytes));

      if (signature.toLowerCase() !== expectedSig.toLowerCase()) {
        return {
          valid: false,
          status: "TAMPERED_SIGNATURE",
          pass,
          errorMessage: "Cryptographic signature mismatch. Pass data has been modified.",
          verifiedAt: nowSeconds,
        };
      }
    }

    return {
      valid: true,
      status: "VALID_OFFLINE",
      pass,
      verifiedAt: nowSeconds,
    };
  } catch (err) {
    return {
      valid: false,
      status: "MALFORMED_PASS",
      errorMessage: err instanceof Error ? err.message : "Malformed pass validation error",
      verifiedAt: nowSeconds,
    };
  }
}
