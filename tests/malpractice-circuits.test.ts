import { describe, expect, it } from "vitest";
import {
  computeUnderwritingClearanceHash,
  enrollUnderwriterOnChain,
  verifyInsurancePolicyOnChain,
  grantUnderwritingClearanceOnChain,
  revokeUnderwritingClearanceOnChain,
} from "../lib/malpractice-client";
import {
  computeUnderwritingChallengeNullifier,
  deriveInsuranceCertificateCommitment,
  STANDARD_UNDERWRITING_REQUIREMENTS,
} from "../lib/malpractice-insurance";

describe("Midnight Compact Malpractice Insurance Circuits & State Machine", () => {
  const credentialId = "a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890";
  const policyNumber = "MP-2025-994817";
  const carrierId = "CARRIER-MEDPRO-01";
  const doctorSecretHex = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";
  const riskManagerChallenge = "CHALLENGE-CLEVELAND-CLINIC-RISK-2026";
  const now = 1775000000;

  describe("Underwriting Clearance Hash & Policy Commitment State", () => {
    it("computes deterministic 32-byte hex hash for granted underwriting clearance", async () => {
      const hash1 = await computeUnderwritingClearanceHash(credentialId, policyNumber, carrierId, now);
      const hash2 = await computeUnderwritingClearanceHash(credentialId, policyNumber, carrierId, now);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });

    it("differentiates clearance hashes across different policies, carriers, and credentials", async () => {
      const hashMedPro = await computeUnderwritingClearanceHash(credentialId, policyNumber, carrierId, now);
      const hashTDC = await computeUnderwritingClearanceHash(credentialId, policyNumber, "CARRIER-TDC-02", now);
      const hashOtherPolicy = await computeUnderwritingClearanceHash(credentialId, "POL-9999", carrierId, now);
      const hashOtherDoc = await computeUnderwritingClearanceHash("ff".repeat(32), policyNumber, carrierId, now);

      expect(hashMedPro).not.toBe(hashTDC);
      expect(hashMedPro).not.toBe(hashOtherPolicy);
      expect(hashMedPro).not.toBe(hashOtherDoc);
    });
  });

  describe("Zero-Knowledge Challenge Nullifier & Underwriting Policy Bounds", () => {
    it("derives single-use challenge nullifiers binding doctor secret and risk manager challenge", async () => {
      const nullifier = await computeUnderwritingChallengeNullifier(
        doctorSecretHex,
        riskManagerChallenge,
        policyNumber,
        5,
      );
      expect(nullifier).toMatch(/^[0-9a-f]{64}$/);

      // Verify certificate commitment format
      const certCommitment = await deriveInsuranceCertificateCommitment(
        doctorSecretHex,
        policyNumber,
        carrierId,
        1_000_000,
        3_000_000,
        true,
        now - 5 * 365 * 86400,
        now + 365 * 86400,
        "bb".repeat(32),
      );
      expect(certCommitment).toMatch(/^[0-9a-f]{64}$/);
    });

    it("evaluates statutory coverage limits ($1M / $3M) and tail coverage requirements", () => {
      const standardReq = STANDARD_UNDERWRITING_REQUIREMENTS;
      expect(standardReq.minPerClaimLimitUsd).toBe(1_000_000);
      expect(standardReq.minAggregateLimitUsd).toBe(3_000_000);
      expect(standardReq.requireTailCoverage).toBe(true);
      expect(standardReq.maxPaidIndemnityUsd).toBe(0);

      // Test limit boundary conditions
      const qualifyingPolicyLimits = { perClaim: 1_000_000, aggregate: 3_000_000 };
      expect(qualifyingPolicyLimits.perClaim >= standardReq.minPerClaimLimitUsd).toBe(true);
      expect(qualifyingPolicyLimits.aggregate >= standardReq.minAggregateLimitUsd).toBe(true);

      const sublimitPolicy = { perClaim: 500_000, aggregate: 1_500_000 };
      expect(sublimitPolicy.perClaim >= standardReq.minPerClaimLimitUsd).toBe(false);
      expect(sublimitPolicy.aggregate >= standardReq.minAggregateLimitUsd).toBe(false);
    });
  });

  describe("Midnight Compact Client SDK Circuit Invocations", () => {
    it("exports properly typed circuit invocation wrappers for malpractice underwriting", () => {
      expect(typeof enrollUnderwriterOnChain).toBe("function");
      expect(typeof verifyInsurancePolicyOnChain).toBe("function");
      expect(typeof grantUnderwritingClearanceOnChain).toBe("function");
      expect(typeof revokeUnderwritingClearanceOnChain).toBe("function");
    });
  });
});
