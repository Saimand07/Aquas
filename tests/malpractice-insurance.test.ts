import { describe, it, expect } from "vitest";
import {
  MALPRACTICE_CARRIERS,
  STANDARD_UNDERWRITING_REQUIREMENTS,
  createBlindedInsuranceCertificate,
  verifyBlindedInsuranceCertificate,
  evaluateUnderwritingClearance,
  verifyUnderwritingClearanceProof,
  mapToFhirCoverage,
  computeUnderwritingChallengeNullifier,
  type MalpracticePolicy,
  type MalpracticeClaim,
} from "../lib/malpractice-insurance";

describe("Zero-Knowledge Malpractice Insurance & Clean-Claims Attestation", () => {
  const DOCTOR_SECRET = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";
  const CARRIER_SECRET = "99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa";
  const SALT = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const CHALLENGE = "RISK-CHALLENGE-MOUNT-SINAI-2026-Q1";
  const NOW = 1775000000; // Reference timestamp

  const validActivePolicy: MalpracticePolicy = {
    policyNumber: "MP-2025-994817",
    carrierId: "CARRIER-MEDPRO-01",
    insuredDoctorNpi: "1948201938",
    policyStatus: "ACTIVE",
    coverageType: "CLAIMS_MADE",
    perClaimLimitUsd: 1_000_000, // $1M
    aggregateLimitUsd: 3_000_000, // $3M
    hasTailCoverage: true,
    retroactiveDate: NOW - 5 * 365 * 86400,
    effectiveDate: NOW - 100 * 86400,
    expirationDate: NOW + 265 * 86400,
  };

  it("should correctly look up accredited malpractice carriers", () => {
    const medpro = MALPRACTICE_CARRIERS["CARRIER-MEDPRO-01"];
    expect(medpro).toBeDefined();
    expect(medpro.name).toContain("Medical Protective");
    expect(medpro.amBestRating).toContain("A++");

    const tdc = MALPRACTICE_CARRIERS["CARRIER-TDC-02"];
    expect(tdc).toBeDefined();
    expect(tdc.name).toContain("The Doctors Company");
  });

  it("should derive deterministic certificate commitment and verify carrier signature", async () => {
    const cert = await createBlindedInsuranceCertificate(
      validActivePolicy,
      DOCTOR_SECRET,
      CARRIER_SECRET,
      SALT,
    );

    expect(cert.certificateId).toContain("CERT-CARRIER-MEDPRO-01");
    expect(cert.certificateCommitment).toHaveLength(64);
    expect(cert.carrierSignature).toHaveLength(64);

    const isValid = await verifyBlindedInsuranceCertificate(cert, CARRIER_SECRET);
    expect(isValid).toBe(true);

    const isWrongSig = await verifyBlindedInsuranceCertificate(cert, "badsecret".padStart(64, "0"));
    expect(isWrongSig).toBe(false);
  });

  it("should approve physician with active $1M/$3M policy, tail coverage, and zero claims", async () => {
    const proof = await evaluateUnderwritingClearance(
      validActivePolicy,
      [], // Clean claims history
      STANDARD_UNDERWRITING_REQUIREMENTS,
      CHALLENGE,
      DOCTOR_SECRET,
      NOW,
    );

    expect(proof.status).toBe("APPROVED");
    expect(proof.policyActive).toBe(true);
    expect(proof.coverageLimitsSatisfied).toBe(true);
    expect(proof.perClaimLimitProven).toBe(1_000_000);
    expect(proof.aggregateLimitProven).toBe(3_000_000);
    expect(proof.tailCoverageActive).toBe(true);
    expect(proof.cleanClaimsSatisfied).toBe(true);
    expect(proof.totalPaidIndemnityInPeriodUsd).toBe(0);
    expect(proof.frivolousClaimsShielded).toBe(0);
    expect(proof.rejectionReasons).toBeUndefined();

    const verification = await verifyUnderwritingClearanceProof(proof);
    expect(verification.valid).toBe(true);
  });

  it("should approve clean claims and shield 100% of dismissed / non-meritorious lawsuits without disclosing them", async () => {
    // Physician with 3 dismissed / frivolous lawsuits in the past 3 years (0 indemnity paid)
    const claimsWithDismissals: MalpracticeClaim[] = [
      {
        claimId: "CLM-2023-001",
        incidentDate: NOW - 700 * 86400,
        claimReportedDate: NOW - 650 * 86400,
        claimDisposition: "DISMISSED_WITH_PREJUDICE",
        indemnityPaidUsd: 0,
        defenseExpenseUsd: 14500,
        allegationCategory: "SURGICAL_OUTCOME",
      },
      {
        claimId: "CLM-2024-002",
        incidentDate: NOW - 400 * 86400,
        claimReportedDate: NOW - 350 * 86400,
        claimDisposition: "DISMISSED_WITHOUT_PREJUDICE",
        indemnityPaidUsd: 0,
        defenseExpenseUsd: 8200,
        allegationCategory: "DIAGNOSTIC_DELAY",
      },
      {
        claimId: "CLM-2025-003",
        incidentDate: NOW - 120 * 86400,
        claimReportedDate: NOW - 100 * 86400,
        claimDisposition: "SETTLED_WITHOUT_LIABILITY",
        indemnityPaidUsd: 0,
        defenseExpenseUsd: 25000,
        allegationCategory: "COMMUNICATION",
      },
    ];

    const proof = await evaluateUnderwritingClearance(
      validActivePolicy,
      claimsWithDismissals,
      STANDARD_UNDERWRITING_REQUIREMENTS,
      CHALLENGE,
      DOCTOR_SECRET,
      NOW,
    );

    expect(proof.status).toBe("APPROVED");
    expect(proof.cleanClaimsSatisfied).toBe(true);
    expect(proof.totalPaidIndemnityInPeriodUsd).toBe(0);
    expect(proof.totalClaimsReviewed).toBe(3);
    // CRITICAL ZK PRIVACY: All 3 frivolous claims were shielded from credentialing committee
    expect(proof.frivolousClaimsShielded).toBe(3);

    const verification = await verifyUnderwritingClearanceProof(proof);
    expect(verification.valid).toBe(true);
  });

  it("should reject policy if per-claim coverage limit is below threshold ($500k vs $1M required)", async () => {
    const lowLimitPolicy: MalpracticePolicy = {
      ...validActivePolicy,
      perClaimLimitUsd: 500_000, // Insufficient limit
    };

    const proof = await evaluateUnderwritingClearance(
      lowLimitPolicy,
      [],
      STANDARD_UNDERWRITING_REQUIREMENTS,
      CHALLENGE,
      DOCTOR_SECRET,
      NOW,
    );

    expect(proof.status).toBe("REJECTED");
    expect(proof.coverageLimitsSatisfied).toBe(false);
    expect(proof.rejectionReasons).toBeDefined();
    expect(proof.rejectionReasons![0]).toContain("Policy limits ($500,000 / $3,000,000) do not meet required minimums");

    const verification = await verifyUnderwritingClearanceProof(proof);
    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain("rejected");
  });

  it("should reject policy if aggregate coverage limit is below threshold ($2M vs $3M required)", async () => {
    const lowAggregatePolicy: MalpracticePolicy = {
      ...validActivePolicy,
      aggregateLimitUsd: 2_000_000, // Insufficient limit
    };

    const proof = await evaluateUnderwritingClearance(
      lowAggregatePolicy,
      [],
      STANDARD_UNDERWRITING_REQUIREMENTS,
      CHALLENGE,
      DOCTOR_SECRET,
      NOW,
    );

    expect(proof.status).toBe("REJECTED");
    expect(proof.coverageLimitsSatisfied).toBe(false);
  });

  it("should reject claims-made policy without tail coverage when tail coverage is required", async () => {
    const noTailPolicy: MalpracticePolicy = {
      ...validActivePolicy,
      hasTailCoverage: false,
    };

    const proof = await evaluateUnderwritingClearance(
      noTailPolicy,
      [],
      STANDARD_UNDERWRITING_REQUIREMENTS,
      CHALLENGE,
      DOCTOR_SECRET,
      NOW,
    );

    expect(proof.status).toBe("REJECTED");
    expect(proof.tailCoverageActive).toBe(false);
    expect(proof.rejectionReasons?.some((r) => r.includes("Tail Coverage"))).toBe(true);
  });

  it("should reject clearance if total paid indemnity in 5-year lookback exceeds threshold", async () => {
    const claimsWithPaidSettlement: MalpracticeClaim[] = [
      {
        claimId: "CLM-2024-PAID",
        incidentDate: NOW - 300 * 86400,
        claimReportedDate: NOW - 250 * 86400,
        claimDisposition: "PAID_INDEMNITY_JUDGMENT",
        indemnityPaidUsd: 250_000, // Significant payout
        defenseExpenseUsd: 40_000,
        allegationCategory: "INTRAOPERATIVE_INJURY",
      },
    ];

    const proof = await evaluateUnderwritingClearance(
      validActivePolicy,
      claimsWithPaidSettlement,
      STANDARD_UNDERWRITING_REQUIREMENTS, // max allowed = $0
      CHALLENGE,
      DOCTOR_SECRET,
      NOW,
    );

    expect(proof.status).toBe("REJECTED");
    expect(proof.cleanClaimsSatisfied).toBe(false);
    expect(proof.totalPaidIndemnityInPeriodUsd).toBe(250_000);
    expect(proof.rejectionReasons?.some((r) => r.includes("Paid indemnity claims"))).toBe(true);
  });

  it("should ignore paid indemnity that occurred outside the 5-year lookback window (e.g. 7 years ago)", async () => {
    const oldPaidClaim: MalpracticeClaim[] = [
      {
        claimId: "CLM-OLD-PAID",
        incidentDate: NOW - 8 * 365 * 86400,
        claimReportedDate: NOW - 7 * 365 * 86400, // 7 years ago
        claimDisposition: "PAID_INDEMNITY_JUDGMENT",
        indemnityPaidUsd: 150_000,
        defenseExpenseUsd: 30_000,
        allegationCategory: "ANESTHESIA_EVENT",
      },
    ];

    const proof = await evaluateUnderwritingClearance(
      validActivePolicy,
      oldPaidClaim,
      STANDARD_UNDERWRITING_REQUIREMENTS,
      CHALLENGE,
      DOCTOR_SECRET,
      NOW,
    );

    expect(proof.status).toBe("APPROVED");
    expect(proof.cleanClaimsSatisfied).toBe(true);
    expect(proof.totalPaidIndemnityInPeriodUsd).toBe(0);
    expect(proof.totalClaimsReviewed).toBe(0); // Expired from 5-year lookback
  });

  it("should reject policy that has lapsed or is expired", async () => {
    const expiredPolicy: MalpracticePolicy = {
      ...validActivePolicy,
      policyStatus: "EXPIRED",
      expirationDate: NOW - 10 * 86400, // Expired 10 days ago
    };

    const proof = await evaluateUnderwritingClearance(
      expiredPolicy,
      [],
      STANDARD_UNDERWRITING_REQUIREMENTS,
      CHALLENGE,
      DOCTOR_SECRET,
      NOW,
    );

    expect(proof.status).toBe("REJECTED");
    expect(proof.policyActive).toBe(false);
    expect(proof.rejectionReasons?.some((r) => r.includes("lapsed/expired"))).toBe(true);
  });

  it("should generate deterministic challenge nullifier binding doctor secret and risk manager challenge", async () => {
    const nullifier1 = await computeUnderwritingChallengeNullifier(
      DOCTOR_SECRET,
      CHALLENGE,
      validActivePolicy.policyNumber,
      5,
    );

    const nullifier2 = await computeUnderwritingChallengeNullifier(
      DOCTOR_SECRET,
      CHALLENGE,
      validActivePolicy.policyNumber,
      5,
    );

    const differentChallengeNullifier = await computeUnderwritingChallengeNullifier(
      DOCTOR_SECRET,
      "CHALLENGE-MAYO-CLINIC-2026",
      validActivePolicy.policyNumber,
      5,
    );

    expect(nullifier1).toBe(nullifier2);
    expect(nullifier1).not.toBe(differentChallengeNullifier);
  });

  it("should verify valid underwriting clearance proof and detect tampered compliance seal", async () => {
    const proof = await evaluateUnderwritingClearance(
      validActivePolicy,
      [],
      STANDARD_UNDERWRITING_REQUIREMENTS,
      CHALLENGE,
      DOCTOR_SECRET,
      NOW,
    );

    const validCheck = await verifyUnderwritingClearanceProof(proof);
    expect(validCheck.valid).toBe(true);

    const tamperedProof = {
      ...proof,
      auditComplianceSeal: "0011223344556677".repeat(4),
    };
    const tamperedCheck = await verifyUnderwritingClearanceProof(tamperedProof);
    expect(tamperedCheck.valid).toBe(false);
    expect(tamperedCheck.reason).toContain("invalid or tampered");
  });

  it("should detect and reject replayed challenge nullifiers", async () => {
    const proof = await evaluateUnderwritingClearance(
      validActivePolicy,
      [],
      STANDARD_UNDERWRITING_REQUIREMENTS,
      CHALLENGE,
      DOCTOR_SECRET,
      NOW,
    );

    const consumedNullifiers = new Set<string>([proof.challengeNullifier]);
    const replayCheck = await verifyUnderwritingClearanceProof(proof, consumedNullifiers);
    expect(replayCheck.valid).toBe(false);
    expect(replayCheck.reason).toContain("anti-replay violation");
  });

  it("should generate compliant HL7 FHIR R4 Coverage resource with ZK underwriting extensions", async () => {
    const proof = await evaluateUnderwritingClearance(
      validActivePolicy,
      [],
      STANDARD_UNDERWRITING_REQUIREMENTS,
      CHALLENGE,
      DOCTOR_SECRET,
      NOW,
    );

    const fhir = mapToFhirCoverage(proof, "1948201938");
    expect(fhir.resourceType).toBe("Coverage");
    expect(fhir.status).toBe("active");
    expect(fhir.subscriber.identifier.value).toBe("1948201938");
    expect(fhir.payor[0].identifier.value).toBe("CARRIER-MEDPRO-01");
    expect(fhir.class[0].value).toBe(validActivePolicy.policyNumber);

    const sealExt = fhir.extension.find(
      (e) => e.url === "https://aquas.health/fhir/StructureDefinition/zk-underwriting-seal",
    );
    expect(sealExt).toBeDefined();
    expect(sealExt?.valueString).toBe(proof.auditComplianceSeal);

    const nullifierExt = fhir.extension.find(
      (e) => e.url === "https://aquas.health/fhir/StructureDefinition/zk-challenge-nullifier",
    );
    expect(nullifierExt).toBeDefined();
    expect(nullifierExt?.valueString).toBe(proof.challengeNullifier);
  });
});
