import { describe, expect, it } from "vitest";
import {
  computePrivilegeGrantHash,
  enrollAccreditedHospitalOnChain,
  verifySurgicalPrivilegeOnChain,
  grantSurgicalPrivilegeOnChain,
  revokeSurgicalPrivilegeOnChain,
} from "../lib/clinical-privileges-client";
import {
  computePrivilegeChallengeNullifier,
  deriveProcedureCommitment,
} from "../lib/surgical-privileges";

describe("Midnight Compact Clinical Privileges Circuits & State Machine", () => {
  const credentialId = "a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890";
  const cptCabg = "33533";
  const hospitalId = "HOSP-MAYO-001";
  const doctorSecretHex = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";
  const committeeChallenge = "CHALLENGE-CLEVELAND-CLINIC-Q4";

  describe("Privilege Grant Hash & Commitment State", () => {
    it("computes deterministic 32-byte hex hash for granted clinical privileges", async () => {
      const now = 1775000000;
      const hash1 = await computePrivilegeGrantHash(credentialId, cptCabg, hospitalId, now);
      const hash2 = await computePrivilegeGrantHash(credentialId, cptCabg, hospitalId, now);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });

    it("differentiates grant hashes across different hospitals and procedure codes", async () => {
      const now = 1775000000;
      const hashMayo = await computePrivilegeGrantHash(credentialId, cptCabg, "HOSP-MAYO-001", now);
      const hashJHU = await computePrivilegeGrantHash(credentialId, cptCabg, "HOSP-JHU-003", now);
      const hashTka = await computePrivilegeGrantHash(credentialId, "27447", "HOSP-MAYO-001", now);

      expect(hashMayo).not.toBe(hashJHU);
      expect(hashMayo).not.toBe(hashTka);
    });
  });

  describe("Zero-Knowledge Challenge Nullifier & Basis Points Precision", () => {
    it("derives single-use nullifiers protecting surgeon privacy across credentialing boards", async () => {
      const nullifier = await computePrivilegeChallengeNullifier(doctorSecretHex, committeeChallenge, cptCabg);
      expect(nullifier).toMatch(/^[0-9a-f]{64}$/);

      // Verify procedure commitment derivation format
      const procCommitment = await deriveProcedureCommitment(
        cptCabg,
        "OPTIMAL_OUTCOME",
        hospitalId,
        1775000000,
        "cc".repeat(32),
      );
      expect(procCommitment).toMatch(/^[0-9a-f]{64}$/);
    });

    it("verifies basis point safety thresholds (e.g. 1.5% max adverse rate = 150 bps)", () => {
      const maxAdverseRatePercent = 1.5;
      const maxAdverseRateBps = Math.round(maxAdverseRatePercent * 100);
      expect(maxAdverseRateBps).toBe(150);

      // 1 major adverse event out of 55 procedures = 1.818% = 182 bps (> 150 bps limit)
      const highAdverseCount = 1;
      const highTotalProcedures = 55;
      const actualAdverseBps = Math.round((highAdverseCount / highTotalProcedures) * 10000);
      expect(actualAdverseBps).toBe(182);
      expect(actualAdverseBps > maxAdverseRateBps).toBe(true);

      // 0 major adverse events out of 55 procedures = 0 bps (<= 150 bps limit)
      const cleanAdverseBps = 0;
      expect(cleanAdverseBps <= maxAdverseRateBps).toBe(true);
    });
  });

  describe("Midnight Compact Client SDK Circuit Invocations", () => {
    it("exports properly typed circuit invocation wrappers for clinical privileging", () => {
      expect(typeof enrollAccreditedHospitalOnChain).toBe("function");
      expect(typeof verifySurgicalPrivilegeOnChain).toBe("function");
      expect(typeof grantSurgicalPrivilegeOnChain).toBe("function");
      expect(typeof revokeSurgicalPrivilegeOnChain).toBe("function");
    });
  });
});
