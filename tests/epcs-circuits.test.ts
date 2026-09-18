import { describe, expect, it } from "vitest";
import {
  computePrescriptionHash,
  computePrescriptionNullifier,
  deriveEphemeralPrescriptionToken,
  verifyEphemeralPrescriptionToken,
  SCHEDULE_BITS,
  CONTROLLED_SUBSTANCES_CATALOG,
} from "../lib/epcs-engine";
import {
  enrollDeaIssuerOnChain,
  verifyPrescriptionAuthorizationOnChain,
  revokeDeaRegistrationOnChain,
} from "../lib/doctor-license-client";

describe("Confidential DEA EPCS Circuits & Anti-Replay Nullifier State Machine", () => {
  const doctorSecretHex = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";
  const pharmacyAChallenge = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";
  const pharmacyBChallenge = "99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa";
  const testNdcOxycodone = "00054-0168-13"; // Schedule II: Oxycodone
  const testNdcSuboxone = "12496-1208-01";  // Schedule III: Suboxone
  const testNdcXanax = "00009-0029-01";     // Schedule IV: Alprazolam
  const fullAuthorityBitmask = SCHEDULE_BITS.SCHEDULE_II | SCHEDULE_BITS.SCHEDULE_III | SCHEDULE_BITS.SCHEDULE_IV | SCHEDULE_BITS.SCHEDULE_V;
  const nonNarcoticBitmask = SCHEDULE_BITS.SCHEDULE_IV | SCHEDULE_BITS.SCHEDULE_V;

  describe("Cryptographic Prescription Nullifiers & Anti-Correlation", () => {
    it("derives deterministic 32-byte hex nullifier for identical prescription parameters", async () => {
      const rxHash = await computePrescriptionHash("patient-blind-01", testNdcOxycodone, "10 mg", 30, "1992883710", 1700000000, "nonce-01");
      const nullifier1 = await computePrescriptionNullifier(rxHash, pharmacyAChallenge, doctorSecretHex);
      const nullifier2 = await computePrescriptionNullifier(rxHash, pharmacyAChallenge, doctorSecretHex);

      expect(nullifier1).toBe(nullifier2);
      expect(nullifier1).toMatch(/^[0-9a-f]{64}$/);
    });

    it("derives distinct nullifiers across different pharmacies to prevent cross-facility tracking", async () => {
      const rxHash = await computePrescriptionHash("patient-blind-01", testNdcOxycodone, "10 mg", 30, "1992883710", 1700000000, "nonce-01");
      const nullifierCVS = await computePrescriptionNullifier(rxHash, pharmacyAChallenge, doctorSecretHex);
      const nullifierWalgreens = await computePrescriptionNullifier(rxHash, pharmacyBChallenge, doctorSecretHex);

      expect(nullifierCVS).not.toBe(nullifierWalgreens);
      expect(nullifierCVS).toMatch(/^[0-9a-f]{64}$/);
      expect(nullifierWalgreens).toMatch(/^[0-9a-f]{64}$/);
    });

    it("derives distinct nullifiers when doctor secret or prescription payload changes", async () => {
      const rxHash1 = await computePrescriptionHash("patient-blind-01", testNdcOxycodone, "10 mg", 30, "1992883710", 1700000000, "nonce-01");
      const rxHash2 = await computePrescriptionHash("patient-blind-02", testNdcSuboxone, "8 mg", 14, "1992883710", 1700000000, "nonce-02");

      const nullifier1 = await computePrescriptionNullifier(rxHash1, pharmacyAChallenge, doctorSecretHex);
      const nullifier2 = await computePrescriptionNullifier(rxHash2, pharmacyAChallenge, doctorSecretHex);
      const nullifierOtherDoctor = await computePrescriptionNullifier(rxHash1, pharmacyAChallenge, "ff".repeat(32));

      expect(nullifier1).not.toBe(nullifier2);
      expect(nullifier1).not.toBe(nullifierOtherDoctor);
    });
  });

  describe("EPCS Prescribing Authority & Ephemeral Prescription Authorization Tokens", () => {
    it("successfully issues and verifies Schedule II EPAT under full DEA authority", async () => {
      const token = await deriveEphemeralPrescriptionToken(
        doctorSecretHex,
        fullAuthorityBitmask,
        testNdcOxycodone,
        "MRN-PATIENT-99201",
        "10 mg",
        30,
        "1992883710",
        pharmacyAChallenge,
      );

      expect(token.schedule).toBe("SCHEDULE_II");
      expect(token.scheduleBit).toBe(0x01);
      expect(token.genericName).toBe("Oxycodone Hydrochloride");
      expect(token.prescriptionNullifier).toMatch(/^[0-9a-f]{64}$/);
      expect(token.signature).toMatch(/^[0-9a-f]{64}$/);

      const verification = await verifyEphemeralPrescriptionToken(token, fullAuthorityBitmask);
      expect(verification.valid).toBe(true);
      expect(verification.reason).toContain("Dispense approved");
    });

    it("prevents double-dispensing through on-chain nullifier consumption", async () => {
      const token = await deriveEphemeralPrescriptionToken(
        doctorSecretHex,
        fullAuthorityBitmask,
        testNdcOxycodone,
        "MRN-PATIENT-44102",
        "10 mg",
        20,
        "1992883710",
        pharmacyAChallenge,
      );

      const usedNullifiers = new Set<string>();

      // First dispense attempt must succeed
      const firstDispense = await verifyEphemeralPrescriptionToken(token, fullAuthorityBitmask, usedNullifiers);
      expect(firstDispense.valid).toBe(true);

      // Nullifier is recorded in on-chain set upon dispense
      usedNullifiers.add(token.prescriptionNullifier.toLowerCase());

      // Second dispense attempt must be rejected immediately
      const secondDispense = await verifyEphemeralPrescriptionToken(token, fullAuthorityBitmask, usedNullifiers);
      expect(secondDispense.valid).toBe(false);
      expect(secondDispense.reason).toContain("already been dispensed");
    });

    it("rejects Schedule II prescription when prescriber only holds Schedule IV-V authority", async () => {
      await expect(
        deriveEphemeralPrescriptionToken(
          doctorSecretHex,
          nonNarcoticBitmask,
          testNdcOxycodone, // Schedule II requires 0x01
          "MRN-PATIENT-11002",
          "10 mg",
          30,
          "1992883710",
        ),
      ).rejects.toThrow(/does not authorize SCHEDULE_II/);
    });

    it("allows Schedule IV prescription when prescriber holds Schedule IV-V authority", async () => {
      const token = await deriveEphemeralPrescriptionToken(
        doctorSecretHex,
        nonNarcoticBitmask,
        testNdcXanax,
        "MRN-PATIENT-33219",
        "0.5 mg",
        30,
        "1992883710",
      );

      expect(token.schedule).toBe("SCHEDULE_IV");
      const check = await verifyEphemeralPrescriptionToken(token, nonNarcoticBitmask);
      expect(check.valid).toBe(true);
    });

    it("rejects expired prescription tokens", async () => {
      const now = Math.floor(Date.now() / 1000);
      const token = await deriveEphemeralPrescriptionToken(
        doctorSecretHex,
        fullAuthorityBitmask,
        testNdcSuboxone,
        "MRN-PATIENT-55011",
        "8 mg / 2 mg",
        14,
        "1992883710",
        pharmacyAChallenge,
        now,
      );

      // Verify at timestamp past expiration (> 7 days)
      const futureTime = token.expiresAt + 10;
      const expiredCheck = await verifyEphemeralPrescriptionToken(
        token,
        fullAuthorityBitmask,
        new Set(),
        futureTime,
      );

      expect(expiredCheck.valid).toBe(false);
      expect(expiredCheck.reason).toContain("Prescription token expired");
    });
  });

  describe("Controlled Substances Regulatory Compliance (21 CFR Part 1306)", () => {
    it("strictly mandates 0 refills on all Schedule II substances in catalog", () => {
      const schedule2Entries = Object.values(CONTROLLED_SUBSTANCES_CATALOG).filter(
        (sub) => sub.schedule === "SCHEDULE_II",
      );

      expect(schedule2Entries.length).toBeGreaterThanOrEqual(5);
      for (const entry of schedule2Entries) {
        expect(entry.maxRefillsAllowed).toBe(0);
        expect(entry.requiresStrictIdentityCheck).toBe(true);
      }
    });

    it("permits maximum 5 refills on Schedule III and IV substances", () => {
      const schedule3And4 = Object.values(CONTROLLED_SUBSTANCES_CATALOG).filter(
        (sub) => sub.schedule === "SCHEDULE_III" || sub.schedule === "SCHEDULE_IV",
      );

      expect(schedule3And4.length).toBeGreaterThanOrEqual(4);
      for (const entry of schedule3And4) {
        expect(entry.maxRefillsAllowed).toBeLessThanOrEqual(5);
      }
    });
  });

  describe("Midnight Compact EPCS Client SDK Bindings", () => {
    it("exports properly typed circuit invocation wrappers for EPCS authority and dispensing", () => {
      expect(typeof enrollDeaIssuerOnChain).toBe("function");
      expect(typeof verifyPrescriptionAuthorizationOnChain).toBe("function");
      expect(typeof revokeDeaRegistrationOnChain).toBe("function");
    });
  });
});
