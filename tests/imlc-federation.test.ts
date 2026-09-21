import { describe, expect, it } from "vitest";
import {
  deriveIMLCBoardKey,
  evaluateIMLCReciprocity,
  generateIMLCLetterOfQualification,
  getActiveIMLCMembers,
  getIMLCJurisdiction,
  isIMLCMember,
  validateIMLCEligibility,
  verifyIMLCLetterOfQualification,
  type IMLCPhysicianCriteria,
} from "../lib/imlc-federation";
import { mapToFhirVerificationResult } from "../lib/ehr-adapter";
import type { OnChainLicense } from "../lib/midnight-read";

describe("Interstate Medical Licensure Compact (IMLC) Federation Engine", () => {
  const credentialId = "e0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70";
  const doctorSecretHex = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";

  const defaultQualifyingCriteria: IMLCPhysicianCriteria = {
    homeState: "CO",
    hasUnrestrictedLicense: true,
    graduatedAccreditedMedicalSchool: true,
    passedLicensingExams: true,
    completedGME: true,
    boardCertified: true,
    hasNoCriminalConvictions: true,
    hasNoDisciplinaryActions: true,
    hasNoControlledSubstanceActions: true,
    notUnderInvestigation: true,
  };

  describe("IMLC Jurisdiction Directory & Board Identities", () => {
    it("contains at least 37 active member states plus territories", () => {
      const activeMembers = getActiveIMLCMembers();
      expect(activeMembers.length).toBeGreaterThanOrEqual(37);
    });

    it("correctly identifies active compact members and non-members", () => {
      expect(isIMLCMember("CO")).toBe(true);
      expect(isIMLCMember("TX")).toBe(true);
      expect(isIMLCMember("WA")).toBe(true);
      expect(isIMLCMember("IL")).toBe(true);
      expect(isIMLCMember("AZ")).toBe(true);

      // Known non-compact or pending states
      expect(isIMLCMember("CA")).toBe(false);
      expect(isIMLCMember("NY")).toBe(false);
      expect(isIMLCMember("NC")).toBe(false);
    });

    it("derives deterministic 32-byte hexadecimal board keys", () => {
      const keyCO1 = deriveIMLCBoardKey("CO");
      const keyCO2 = deriveIMLCBoardKey("co");
      const keyTX = deriveIMLCBoardKey("TX");

      expect(keyCO1).toBe(keyCO2);
      expect(keyCO1).toMatch(/^[0-9a-f]{64}$/);
      expect(keyCO1).not.toBe(keyTX);
    });

    it("retrieves jurisdiction metadata correctly", () => {
      const juris = getIMLCJurisdiction("WA");
      expect(juris).toBeDefined();
      expect(juris?.name).toContain("Washington");
      expect(juris?.status).toBe("ACTIVE_MEMBER");
      expect(juris?.allowsTelehealth).toBe(true);
    });
  });

  describe("IMLC Section 5 State of Principal License (SPL) Qualification", () => {
    it("approves fully compliant physician credentials", () => {
      const validation = validateIMLCEligibility(defaultQualifyingCriteria);
      expect(validation.valid).toBe(true);
      expect(validation.disqualifications).toHaveLength(0);
    });

    it("rejects non-compact home states", () => {
      const validation = validateIMLCEligibility({
        ...defaultQualifyingCriteria,
        homeState: "NY",
      });
      expect(validation.valid).toBe(false);
      expect(validation.disqualifications[0]).toContain("not an active IMLC member");
    });

    it("rejects physicians lacking ABMS/AOA board certification", () => {
      const validation = validateIMLCEligibility({
        ...defaultQualifyingCriteria,
        boardCertified: false,
      });
      expect(validation.valid).toBe(false);
      expect(validation.disqualifications[0]).toContain("specialty certification");
    });

    it("flags disciplinary actions as disqualifying", () => {
      const validation = validateIMLCEligibility({
        ...defaultQualifyingCriteria,
        hasNoDisciplinaryActions: false,
      });
      expect(validation.valid).toBe(false);
      expect(validation.disqualifications[0]).toContain("Action taken against medical license");
    });
  });

  describe("Cross-State Reciprocity Matrix & Practice Authorization", () => {
    it("authorizes reciprocal practice between two active IMLC member states (CO -> TX)", () => {
      const result = evaluateIMLCReciprocity("CO", "TX", defaultQualifyingCriteria);

      expect(result.eligible).toBe(true);
      expect(result.reciprocityStatus).toBe("RECIPROCAL_ACTIVE");
      expect(result.isCompactJurisdiction).toBe(true);
      expect(result.expeditedLoqValid).toBe(true);
      expect(result.coveredJurisdictions).toContain("TX");
      expect(result.coveredJurisdictions).toContain("WA");
      expect(result.coveredJurisdictions.length).toBeGreaterThanOrEqual(37);
      expect(result.nonCoveredJurisdictions).toContain("CA");
      expect(result.nonCoveredJurisdictions).toContain("NY");
    });

    it("authorizes practice within home jurisdiction (CO -> CO)", () => {
      const result = evaluateIMLCReciprocity("CO", "CO");
      expect(result.eligible).toBe(true);
      expect(result.reciprocityStatus).toBe("RECIPROCAL_ACTIVE");
      expect(result.reason).toContain("primary jurisdiction");
    });

    it("restricts non-member home states to single-state practice (NY -> CO)", () => {
      const result = evaluateIMLCReciprocity("NY", "CO");
      expect(result.eligible).toBe(false);
      expect(result.reciprocityStatus).toBe("HOME_STATE_ONLY");
      expect(result.reason).toContain("not an IMLC compact member");
      expect(result.coveredJurisdictions).toEqual(["NY"]);
    });

    it("identifies target state as excluded when not in compact (CO -> NY)", () => {
      const result = evaluateIMLCReciprocity("CO", "NY");
      expect(result.eligible).toBe(false);
      expect(result.reciprocityStatus).toBe("EXCLUDED_JURISDICTION");
      expect(result.reason).toContain("does not participate in the IMLC compact");
    });

    it("flags sanctions when physician has disciplinary history", () => {
      const result = evaluateIMLCReciprocity("CO", "TX", {
        hasNoDisciplinaryActions: false,
      });
      expect(result.eligible).toBe(false);
      expect(result.reciprocityStatus).toBe("SANCTION_FLAGGED");
      expect(result.reason).toContain("criteria not satisfied");
    });
  });

  describe("Letter of Qualification (LOQ) Issuance & Verification", () => {
    it("generates a valid signed Letter of Qualification for an SPL state", () => {
      const now = Math.floor(Date.now() / 1000);
      const loq = generateIMLCLetterOfQualification(credentialId, "CO", doctorSecretHex, now);

      expect(loq.splState).toBe("CO");
      expect(loq.loqId).toContain("imlc-loq-co");
      expect(loq.signature).toMatch(/^[0-9a-f]{64}$/);
      expect(loq.authorizedJurisdictions.length).toBeGreaterThanOrEqual(37);

      const verification = verifyIMLCLetterOfQualification(loq, now);
      expect(verification.valid).toBe(true);
    });

    it("rejects an expired Letter of Qualification", () => {
      const now = Math.floor(Date.now() / 1000);
      const loq = generateIMLCLetterOfQualification(credentialId, "CO", doctorSecretHex, now);

      // Verify at a future time beyond 365 days
      const futureTime = now + 400 * 86400;
      const verification = verifyIMLCLetterOfQualification(loq, futureTime);

      expect(verification.valid).toBe(false);
      expect(verification.reason).toContain("expired");
    });

    it("throws an error if attempting to issue LOQ from non-member state", () => {
      expect(() => {
        generateIMLCLetterOfQualification(credentialId, "CA", doctorSecretHex);
      }).toThrow(/not an authorized IMLC State of Principal License/);
    });
  });

  describe("HL7 FHIR R4 Multi-Jurisdiction Interoperability", () => {
    const mockLicense: OnChainLicense = {
      exists: true,
      valid: true,
      revoked: false,
      issuedAt: 1700000000,
      expiresAt: 1750000000,
      issuer: deriveIMLCBoardKey("CO"),
    };

    it("enriches FHIR VerificationResult with IMLC reciprocity extensions and target locations", () => {
      const imlcResult = evaluateIMLCReciprocity("CO", "TX", defaultQualifyingCriteria);

      const fhirResult = mapToFhirVerificationResult(
        credentialId,
        mockLicense,
        null,
        new Date(),
        imlcResult,
      );

      expect(fhirResult.resourceType).toBe("VerificationResult");
      expect(fhirResult.status).toBe("validated");

      // Verify target locations populated
      expect(fhirResult.targetLocation).toBeDefined();
      expect(fhirResult.targetLocation).toContain("Location/US-TX");
      expect(fhirResult.targetLocation).toContain("Location/US-CO");

      // Verify extensions
      const statusExt = fhirResult.extension?.find(
        (e) => e.url === "https://aquas.health/fhir/StructureDefinition/imlc-reciprocity-status",
      );
      expect(statusExt?.valueString).toBe("RECIPROCAL_ACTIVE");

      const homeExt = fhirResult.extension?.find(
        (e) => e.url === "https://aquas.health/fhir/StructureDefinition/imlc-home-jurisdiction",
      );
      expect(homeExt?.valueString).toBe("CO");

      const countExt = fhirResult.extension?.find(
        (e) => e.url === "https://aquas.health/fhir/StructureDefinition/imlc-authorized-jurisdictions-count",
      );
      expect(countExt?.valueInteger).toBeGreaterThanOrEqual(37);
    });
  });
});
