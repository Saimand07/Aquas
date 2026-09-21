import { describe, expect, it } from "vitest";
import {
  blindPatientIdentifier,
  checkPrescriberScheduleAuthority,
  computePrescriptionHash,
  deriveEphemeralPrescriptionToken,
  getAllControlledSubstances,
  getControlledSubstanceByNdc,
  getSubstancesBySchedule,
  SCHEDULE_BITS,
  verifyEphemeralPrescriptionToken,
} from "../lib/epcs-engine";
import { mapToFhirMedicationRequest } from "../lib/ehr-adapter";

describe("Confidential DEA EPCS & Opioid Authority Engine", () => {
  const doctorSecretHex = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";
  const pharmacyNpi = "1928374650"; // Standard 10-digit NPI
  const oxycodoneNdc = "00054-0168-13"; // Schedule II
  const suboxoneNdc = "12496-1208-01"; // Schedule III
  const xanaxNdc = "00009-0029-01"; // Schedule IV

  // Full authority bitmask (Schedules II, III, IV, V: 0x01 | 0x02 | 0x04 | 0x08 = 0x0F)
  const fullDeaScheduleBitmask =
    SCHEDULE_BITS.SCHEDULE_II |
    SCHEDULE_BITS.SCHEDULE_III |
    SCHEDULE_BITS.SCHEDULE_IV |
    SCHEDULE_BITS.SCHEDULE_V;

  describe("Controlled Substances Catalog & Schedule Bitmasks", () => {
    it("indexes controlled substances across all 4 DEA schedules", () => {
      const all = getAllControlledSubstances();
      expect(all.length).toBeGreaterThanOrEqual(10);

      const sched2 = getSubstancesBySchedule("SCHEDULE_II");
      const sched3 = getSubstancesBySchedule("SCHEDULE_III");
      const sched4 = getSubstancesBySchedule("SCHEDULE_IV");
      const sched5 = getSubstancesBySchedule("SCHEDULE_V");

      expect(sched2.length).toBeGreaterThanOrEqual(4);
      expect(sched3.length).toBeGreaterThanOrEqual(2);
      expect(sched4.length).toBeGreaterThanOrEqual(3);
      expect(sched5.length).toBeGreaterThanOrEqual(2);
    });

    it("enforces zero refills for Schedule II substances under 21 CFR § 1306.12", () => {
      const oxycodone = getControlledSubstanceByNdc(oxycodoneNdc);
      expect(oxycodone).toBeDefined();
      expect(oxycodone?.schedule).toBe("SCHEDULE_II");
      expect(oxycodone?.maxRefillsAllowed).toBe(0);
      expect(oxycodone?.requiresStrictIdentityCheck).toBe(true);
    });

    it("allows up to 5 refills for Schedule III and IV substances", () => {
      const suboxone = getControlledSubstanceByNdc(suboxoneNdc);
      const xanax = getControlledSubstanceByNdc(xanaxNdc);

      expect(suboxone?.maxRefillsAllowed).toBe(5);
      expect(xanax?.maxRefillsAllowed).toBe(5);
    });

    it("accurately evaluates prescriber schedule authority bitmasks", () => {
      // Full authority: can prescribe all
      expect(checkPrescriberScheduleAuthority(fullDeaScheduleBitmask, SCHEDULE_BITS.SCHEDULE_II)).toBe(true);
      expect(checkPrescriberScheduleAuthority(fullDeaScheduleBitmask, SCHEDULE_BITS.SCHEDULE_IV)).toBe(true);

      // Mid-level practitioner authority: Schedules III, IV, V only (no Schedule II)
      const midLevelBitmask = SCHEDULE_BITS.SCHEDULE_III | SCHEDULE_BITS.SCHEDULE_IV | SCHEDULE_BITS.SCHEDULE_V;
      expect(checkPrescriberScheduleAuthority(midLevelBitmask, SCHEDULE_BITS.SCHEDULE_III)).toBe(true);
      expect(checkPrescriberScheduleAuthority(midLevelBitmask, SCHEDULE_BITS.SCHEDULE_II)).toBe(false);

      // Schedule II-only authority
      const sched2Only = SCHEDULE_BITS.SCHEDULE_II;
      expect(checkPrescriberScheduleAuthority(sched2Only, SCHEDULE_BITS.SCHEDULE_II)).toBe(true);
      expect(checkPrescriberScheduleAuthority(sched2Only, SCHEDULE_BITS.SCHEDULE_IV)).toBe(false);
    });
  });

  describe("Patient Identity Blinding & Cryptographic Hashing", () => {
    it("blinds patient identifiers with non-reversible cryptographic salts", async () => {
      const mrn = "PATIENT-MRN-928471";
      const salt1 = "11111111111111111111111111111111";
      const salt2 = "22222222222222222222222222222222";

      const blinded1 = await blindPatientIdentifier(mrn, salt1);
      const blinded2 = await blindPatientIdentifier(mrn, salt2);
      const blinded1Again = await blindPatientIdentifier(mrn, salt1);

      expect(blinded1).toMatch(/^[0-9a-f]{64}$/);
      expect(blinded1).toBe(blinded1Again);
      expect(blinded1).not.toBe(blinded2);
    });

    it("derives deterministic prescription payload hashes", async () => {
      const hash1 = await computePrescriptionHash(
        "blinded-patient-id",
        oxycodoneNdc,
        "10mg",
        30,
        pharmacyNpi,
        1700000000,
        "nonce123",
      );

      const hash2 = await computePrescriptionHash(
        "blinded-patient-id",
        oxycodoneNdc,
        "10mg",
        30,
        pharmacyNpi,
        1700000000,
        "nonce123",
      );

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("Ephemeral Prescription Authorization Token (EPAT) Lifecycle", () => {
    it("derives an authorized EPAT token for Schedule II controlled substance", async () => {
      const token = await deriveEphemeralPrescriptionToken(
        doctorSecretHex,
        fullDeaScheduleBitmask,
        oxycodoneNdc,
        "MRN-839201",
        "10 mg",
        30,
        pharmacyNpi,
      );

      expect(token.epatId).toContain("epat-");
      expect(token.schedule).toBe("SCHEDULE_II");
      expect(token.scheduleBit).toBe(SCHEDULE_BITS.SCHEDULE_II);
      expect(token.genericName).toContain("Oxycodone");
      expect(token.prescriptionNullifier).toMatch(/^[0-9a-f]{64}$/);
      expect(token.signature).toMatch(/^[0-9a-f]{64}$/);
      expect(token.expiresAt).toBeGreaterThan(token.issuedAt);
    });

    it("throws error if prescriber lacks authority for the requested schedule", async () => {
      // Prescriber with only Schedule IV & V authority trying to prescribe Schedule II Oxycodone
      const limitedMask = SCHEDULE_BITS.SCHEDULE_IV | SCHEDULE_BITS.SCHEDULE_V;

      await expect(
        deriveEphemeralPrescriptionToken(
          doctorSecretHex,
          limitedMask,
          oxycodoneNdc,
          "MRN-839201",
          "10 mg",
          30,
          pharmacyNpi,
        ),
      ).rejects.toThrow(/does not authorize SCHEDULE_II/);
    });

    it("validates EPAT token at pharmacy dispense terminal", async () => {
      const token = await deriveEphemeralPrescriptionToken(
        doctorSecretHex,
        fullDeaScheduleBitmask,
        oxycodoneNdc,
        "MRN-839201",
        "10 mg",
        30,
        pharmacyNpi,
      );

      const usedTokens = new Set<string>();
      const result = await verifyEphemeralPrescriptionToken(token, fullDeaScheduleBitmask, usedTokens);

      expect(result.valid).toBe(true);
      expect(result.reason).toContain("Dispense approved");
    });

    it("prevents double-dispensing by rejecting consumed prescription nullifiers", async () => {
      const token = await deriveEphemeralPrescriptionToken(
        doctorSecretHex,
        fullDeaScheduleBitmask,
        suboxoneNdc,
        "MRN-839201",
        "8 mg / 2 mg",
        14,
        pharmacyNpi,
      );

      const usedTokens = new Set<string>();

      // First dispense: approved
      const firstDispense = await verifyEphemeralPrescriptionToken(token, fullDeaScheduleBitmask, usedTokens);
      expect(firstDispense.valid).toBe(true);

      // Record nullifier on-chain
      usedTokens.add(token.prescriptionNullifier.toLowerCase());

      // Second dispense attempt: rejected
      const secondDispense = await verifyEphemeralPrescriptionToken(token, fullDeaScheduleBitmask, usedTokens);
      expect(secondDispense.valid).toBe(false);
      expect(secondDispense.reason).toContain("already been dispensed");
    });

    it("rejects expired prescription authorization tokens", async () => {
      const now = Math.floor(Date.now() / 1000);
      const token = await deriveEphemeralPrescriptionToken(
        doctorSecretHex,
        fullDeaScheduleBitmask,
        xanaxNdc,
        "MRN-839201",
        "0.5 mg",
        30,
        pharmacyNpi,
        "00".repeat(32),
        now - 86400 * 10, // 10 days ago (expired)
      );

      const result = await verifyEphemeralPrescriptionToken(
        token,
        fullDeaScheduleBitmask,
        new Set(),
        now,
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("expired");
    });
  });

  describe("HL7 FHIR R4 MedicationRequest Integration", () => {
    it("maps EPAT token to standard FHIR MedicationRequest with DEA EPCS extensions", async () => {
      const token = await deriveEphemeralPrescriptionToken(
        doctorSecretHex,
        fullDeaScheduleBitmask,
        oxycodoneNdc,
        "MRN-839201",
        "10 mg",
        30,
        pharmacyNpi,
      );

      const fhirMed = mapToFhirMedicationRequest(token, "Dr. Sarah Lin MD");

      expect(fhirMed.resourceType).toBe("MedicationRequest");
      expect(fhirMed.status).toBe("active");
      expect(fhirMed.intent).toBe("order");
      expect(fhirMed.medicationCodeableConcept.coding[0].code).toBe(oxycodoneNdc);
      expect(fhirMed.medicationCodeableConcept.text).toContain("Oxycodone");
      expect(fhirMed.subject.reference).toContain("Patient/");
      expect(fhirMed.dispenseRequest?.numberOfRepeatsAllowed).toBe(0); // Schedule II = 0 refills

      const scheduleExt = fhirMed.extension?.find(
        (e) => e.url === "https://aquas.health/fhir/StructureDefinition/dea-schedule-authorized",
      );
      expect(scheduleExt?.valueString).toBe("SCHEDULE_II");

      const nullifierExt = fhirMed.extension?.find(
        (e) => e.url === "https://aquas.health/fhir/StructureDefinition/prescription-nullifier",
      );
      expect(nullifierExt?.valueString).toBe(token.prescriptionNullifier);
    });
  });
});
