/**
 * @file clinical-privileges-client.ts
 * @description Midnight Compact client SDK wrappers for the auxiliary clinical_privileges contract.
 * Enables hospital credentialing committees to verify surgical case volumes and complication rates
 * in zero knowledge on the Midnight Blockchain.
 */

import {
  enrollAccreditedHospitalOnChain,
  verifySurgicalPrivilegeOnChain,
  grantSurgicalPrivilegeOnChain,
  revokeSurgicalPrivilegeOnChain,
} from "./doctor-license-client";

export {
  enrollAccreditedHospitalOnChain,
  verifySurgicalPrivilegeOnChain,
  grantSurgicalPrivilegeOnChain,
  revokeSurgicalPrivilegeOnChain,
};

export interface ClinicalPrivilegeGrantState {
  credentialId: string;
  cptCode: string;
  privilegeGrantHash: string;
  grantedAt: number;
  expiresAt: number;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
}

/**
 * Computes deterministic 32-byte hash for a granted surgical privilege.
 */
export async function computePrivilegeGrantHash(
  credentialId: string,
  cptCode: string,
  hospitalId: string,
  grantedAt: number,
): Promise<string> {
  const preimage = `privilege:grant:v1:${credentialId.toLowerCase()}:${cptCode}:${hospitalId.toLowerCase()}:${grantedAt}`;
  const encoded = new TextEncoder().encode(preimage);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
