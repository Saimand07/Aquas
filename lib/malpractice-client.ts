/**
 * @file malpractice-client.ts
 * @description Midnight Compact client SDK wrappers for malpractice insurance & clean-claims underwriting circuits.
 * Enables hospital risk managers and credentialing desks to verify policy enforceability and underwriting clearance on Midnight.
 */

import {
  enrollUnderwriterOnChain,
  verifyInsurancePolicyOnChain,
  grantUnderwritingClearanceOnChain,
  revokeUnderwritingClearanceOnChain,
} from "./doctor-license-client";

export {
  enrollUnderwriterOnChain,
  verifyInsurancePolicyOnChain,
  grantUnderwritingClearanceOnChain,
  revokeUnderwritingClearanceOnChain,
};

export interface UnderwritingClearanceState {
  credentialId: string;
  policyNumber: string;
  carrierId: string;
  clearanceHash: string;
  clearedAt: number;
  expiresAt: number;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
}

/**
 * Computes deterministic 32-byte hex hash for granted underwriting clearance.
 */
export async function computeUnderwritingClearanceHash(
  credentialId: string,
  policyNumber: string,
  carrierId: string,
  clearedAt: number,
): Promise<string> {
  const preimage = `insurance:clearance:v1:${credentialId.toLowerCase()}:${policyNumber.trim()}:${carrierId.toLowerCase()}:${clearedAt}`;
  const encoded = new TextEncoder().encode(preimage);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
