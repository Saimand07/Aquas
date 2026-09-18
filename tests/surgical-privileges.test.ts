import { describe, expect, it } from "vitest";
import {
  CPT_SURGICAL_CATALOG,
  ACCREDITED_SURGICAL_FACILITIES,
  deriveProcedureCommitment,
  createBlindedProcedureAttestation,
  verifyBlindedAttestation,
  computePrivilegeChallengeNullifier,
  evaluateCaseVolumePrivilege,
  verifySurgicalPrivilegeProof,
  mapToFhirClinicalImpression,
  mapToFhirProcedure,
  type BlindedProcedureAttestation,
} from "../lib/surgical-privileges";

describe("Confidential Surgical Privileging & Case-Volume Engine", () => {
  const doctorSecretHex = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";
  const hospitalSecretHex = "99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa";
  const committeeChallenge = "CHALLENGE-MT-SINAI-SURGERY-2026-Q3";

  describe("CPT Surgical Catalog & Accredited Facilities", () => {
    it("indexes primary surgical specialties with statutory case-volume standards", () => {
      expect(CPT_SURGICAL_CATALOG["33533"]).toBeDefined();
      expect(CPT_SURGICAL_CATALOG["33533"].procedureName).toContain("Coronary Artery Bypass");
      expect(CPT_SURGICAL_CATALOG["33533"].min12MonthVolume).toBe(50);
      expect(CPT_SURGICAL_CATALOG["33533"].maxAdverseRatePercent).toBe(1.5);

      expect(CPT_SURGICAL_CATALOG["27447"].specialty).toBe("Orthopedic Surgery");
      expect(CPT_SURGICAL_CATALOG["27447"].min12MonthVolume).toBe(35);

      expect(CPT_SURGICAL_CATALOG["61510"].specialty).toBe("Neurosurgery");
      expect(CPT_SURGICAL_CATALOG["61510"].min12MonthVolume).toBe(25);
    });

    it("verifies JCAHO accredited operating facilities", () => {
      const facility = ACCREDITED_SURGICAL_FACILITIES["HOSP-MAYO-001"];
      expect(facility).toBeDefined();
      expect(facility.accredited).toBe(true);
      expect(facility.jcahoNumber).toContain("JCAHO-");
    });
  });

  describe("Blinded Procedure Commitments & Attestation Verification", () => {
    it("computes deterministic SHA-256 procedure commitments", async () => {
      const now = Math.floor(Date.now() / 1000);
      const salt = "a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f809";

      const commitment1 = await deriveProcedureCommitment("33533", "OPTIMAL_OUTCOME", "HOSP-MAYO-001", now, salt);
      const commitment2 = await deriveProcedureCommitment("33533", "OPTIMAL_OUTCOME", "HOSP-MAYO-001", now, salt);

      expect(commitment1).toBe(commitment2);
      expect(commitment1).toMatch(/^[0-9a-f]{64}$/);

      // Altering salt alters the commitment
      const commitmentDifferentSalt = await deriveProcedureCommitment("33533", "OPTIMAL_OUTCOME", "HOSP-MAYO-001", now, "ff".repeat(32));
      expect(commitmentDifferentSalt).not.toBe(commitment1);
    });

    it("creates and cryptographically verifies hospital-attested procedure records", async () => {
      const now = Math.floor(Date.now() / 1000);
      const salt = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

      const attestation = await createBlindedProcedureAttestation(
        "33533",
        "OPTIMAL_OUTCOME",
        "HOSP-CLEV-002",
        now,
        salt,
        hospitalSecretHex,
      );

      const isValid = await verifyBlindedAttestation(attestation, hospitalSecretHex);
      expect(isValid).toBe(true);

      // Fails with wrong hospital secret
      const isInvalid = await verifyBlindedAttestation(attestation, "00".repeat(32));
      expect(isInvalid).toBe(false);
    });
  });

  describe("Zero-Knowledge Challenge Nullifiers", () => {
    it("binds doctor secret and committee challenge preventing replay across hospitals", async () => {
      const nullifier1 = await computePrivilegeChallengeNullifier(doctorSecretHex, committeeChallenge, "33533");
      const nullifier2 = await computePrivilegeChallengeNullifier(doctorSecretHex, committeeChallenge, "33533");

      expect(nullifier1).toBe(nullifier2);
      expect(nullifier1).toMatch(/^[0-9a-f]{64}$/);

      // Different hospital challenge produces different nullifier
      const differentNullifier = await computePrivilegeChallengeNullifier(
        doctorSecretHex,
        "CHALLENGE-CLEVELAND-CLINIC-2026",
        "33533",
      );
      expect(differentNullifier).not.toBe(nullifier1);
    });
  });

  describe("Clinical Competency & Case-Volume Threshold Evaluation", () => {
    // Helper to generate a batch of procedure attestations
    async function generateMockOperativeLog(
      cptCode: string,
      count: number,
      majorAdverseCount: number,
      hospitalId = "HOSP-MAYO-001",
      daysAgoOffset = 30,
    ): Promise<BlindedProcedureAttestation[]> {
      const procs: BlindedProcedureAttestation[] = [];
      const baseTime = Math.floor(Date.now() / 1000) - daysAgoOffset * 86400;

      for (let i = 0; i < count; i++) {
        const isAdverse = i < majorAdverseCount;
        const outcome = isAdverse ? "MAJOR_ADVERSE_EVENT" : "OPTIMAL_OUTCOME";
        const salt = (i + 1).toString(16).padStart(64, "0");
        const time = baseTime + i * 3600; // spread out

        const att = await createBlindedProcedureAttestation(
          cptCode,
          outcome,
          hospitalId,
          time,
          salt,
          hospitalSecretHex,
        );
        procs.push(att);
      }
      return procs;
    }

    it("grants surgical privilege when surgeon meets >= 50 CABG procedures with < 1.5% adverse rate", async () => {
      // 52 procedures, 0 adverse events (0.0% < 1.5%)
      const log = await generateMockOperativeLog("33533", 52, 0);

      const proof = await evaluateCaseVolumePrivilege(log, "33533", committeeChallenge, doctorSecretHex);

      expect(proof.privilegeGranted).toBe(true);
      expect(proof.meetsVolumeThreshold).toBe(true);
      expect(proof.meetsSafetyThreshold).toBe(true);
      expect(proof.allHospitalsAccredited).toBe(true);
      expect(proof.totalProceduresAttested).toBe(52);
      expect(proof.adverseRateProvenPercent).toBe(0);
      expect(proof.requiredVolumeThreshold).toBe(50);
      expect(proof.shieldedProcedureCommitments.length).toBe(52);
    });

    it("denies privilege when procedure count is below the mandated threshold (< 50)", async () => {
      // 30 procedures (< 50 required for CABG)
      const log = await generateMockOperativeLog("33533", 30, 0);

      const proof = await evaluateCaseVolumePrivilege(log, "33533", committeeChallenge, doctorSecretHex);

      expect(proof.privilegeGranted).toBe(false);
      expect(proof.meetsVolumeThreshold).toBe(false);
      expect(proof.meetsSafetyThreshold).toBe(true);
    });

    it("denies privilege when adverse event rate exceeds the safety ceiling (> 1.5%)", async () => {
      // 50 procedures with 2 major complications = 4.0% complication rate (> 1.5% limit)
      const log = await generateMockOperativeLog("33533", 50, 2);

      const proof = await evaluateCaseVolumePrivilege(log, "33533", committeeChallenge, doctorSecretHex);

      expect(proof.privilegeGranted).toBe(false);
      expect(proof.meetsVolumeThreshold).toBe(true);
      expect(proof.meetsSafetyThreshold).toBe(false);
      expect(proof.adverseRateProvenPercent).toBe(4.0);
    });

    it("excludes procedures outside the rolling 365-day qualifying window", async () => {
      // 60 procedures performed 400 days ago
      const log = await generateMockOperativeLog("33533", 60, 0, "HOSP-MAYO-001", 400);

      const proof = await evaluateCaseVolumePrivilege(log, "33533", committeeChallenge, doctorSecretHex);

      expect(proof.privilegeGranted).toBe(false);
      expect(proof.totalProceduresAttested).toBe(0);
      expect(proof.meetsVolumeThreshold).toBe(false);
    });

    it("denies privilege if procedures were performed at unaccredited facilities", async () => {
      // 55 procedures at unknown / unaccredited facility
      const log = await generateMockOperativeLog("33533", 55, 0, "HOSP-UNACCREDITED-999");

      const proof = await evaluateCaseVolumePrivilege(log, "33533", committeeChallenge, doctorSecretHex);

      expect(proof.privilegeGranted).toBe(false);
      expect(proof.allHospitalsAccredited).toBe(false);
    });
  });

  describe("Privilege Proof Verification & Anti-Replay Nullifiers", () => {
    it("verifies genuine granted proof and rejects replayed nullifiers", async () => {
      const log = [];
      for (let i = 0; i < 55; i++) {
        const salt = (i + 1).toString(16).padStart(64, "0");
        const att = await createBlindedProcedureAttestation(
          "33533",
          "OPTIMAL_OUTCOME",
          "HOSP-MAYO-001",
          Math.floor(Date.now() / 1000) - 1000,
          salt,
          hospitalSecretHex,
        );
        log.push(att);
      }

      const proof = await evaluateCaseVolumePrivilege(log, "33533", committeeChallenge, doctorSecretHex);

      // First verification: valid
      const result1 = await verifySurgicalPrivilegeProof(proof);
      expect(result1.valid).toBe(true);

      // Register consumed nullifier
      const consumed = new Set<string>([proof.challengeNullifier.toLowerCase()]);

      // Replay attempt with same challenge nullifier: rejected
      const result2 = await verifySurgicalPrivilegeProof(proof, consumed);
      expect(result2.valid).toBe(false);
      expect(result2.reason).toContain("replay attack prevented");
    });

    it("detects tampered compliance seals", async () => {
      const log = [];
      for (let i = 0; i < 50; i++) {
        const salt = (i + 1).toString(16).padStart(64, "0");
        const att = await createBlindedProcedureAttestation(
          "33533",
          "OPTIMAL_OUTCOME",
          "HOSP-MAYO-001",
          Math.floor(Date.now() / 1000) - 1000,
          salt,
          hospitalSecretHex,
        );
        log.push(att);
      }

      const proof = await evaluateCaseVolumePrivilege(log, "33533", committeeChallenge, doctorSecretHex);
      proof.totalProceduresAttested = 999; // Tampered volume

      const result = await verifySurgicalPrivilegeProof(proof);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("mismatch: cryptographic proof bundle was tampered");
    });
  });

  describe("HL7 FHIR R4 Interoperability", () => {
    it("maps privilege proofs to valid FHIR R4 ClinicalImpression resources", async () => {
      const log = [];
      for (let i = 0; i < 50; i++) {
        const salt = (i + 1).toString(16).padStart(64, "0");
        const att = await createBlindedProcedureAttestation(
          "33533",
          "OPTIMAL_OUTCOME",
          "HOSP-MAYO-001",
          Math.floor(Date.now() / 1000) - 1000,
          salt,
          hospitalSecretHex,
        );
        log.push(att);
      }

      const proof = await evaluateCaseVolumePrivilege(log, "33533", committeeChallenge, doctorSecretHex);
      const fhirImpression = mapToFhirClinicalImpression(proof);

      expect(fhirImpression.resourceType).toBe("ClinicalImpression");
      expect(fhirImpression.status).toBe("completed");
      expect(fhirImpression.code.coding[0].code).toBe("33533");
      expect(fhirImpression.extension.find((e) => e.url.endsWith("privilege-granted"))?.valueBoolean).toBe(true);
    });

    it("maps procedure attestations to HIPAA-safe FHIR Procedure resources", async () => {
      const salt = "9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef";
      const att = await createBlindedProcedureAttestation(
        "27447",
        "OPTIMAL_OUTCOME",
        "HOSP-MAYO-001",
        Math.floor(Date.now() / 1000) - 1000,
        salt,
        hospitalSecretHex,
      );

      const fhirProcedure = mapToFhirProcedure(att);
      expect(fhirProcedure.resourceType).toBe("Procedure");
      expect(fhirProcedure.status).toBe("completed");
      expect(fhirProcedure.code.coding[0].code).toBe("27447");
      expect(fhirProcedure.extension[0].valueString).toBe(att.procedureCommitment);
    });
  });
});
