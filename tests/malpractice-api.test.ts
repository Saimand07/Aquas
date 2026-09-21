import { describe, expect, it } from "vitest";
import { GET, POST } from "../app/api/v1/insurance/verify/route";
import {
  evaluateUnderwritingClearance,
  type MalpracticePolicy,
  type MalpracticeClaim,
} from "../lib/malpractice-insurance";
import {
  exportInsuranceClearanceToCsv,
  generatePrintableMalpracticeInsuranceCertificate,
} from "../lib/audit-exporter";

describe("Zero-Knowledge Malpractice Insurance REST API (/api/v1/insurance/verify)", () => {
  const doctorSecretHex = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";
  const riskChallenge = "CHALLENGE-HOSP-RISK-REST-TEST-01";
  const now = Math.floor(Date.now() / 1000);

  const mockPolicy: MalpracticePolicy = {
    policyNumber: "POL-MEDPRO-998811",
    carrierId: "CARRIER-MEDPRO-01",
    insuredDoctorNpi: "1948201938",
    policyStatus: "ACTIVE",
    coverageType: "CLAIMS_MADE",
    perClaimLimitUsd: 1_000_000,
    aggregateLimitUsd: 3_000_000,
    hasTailCoverage: true,
    retroactiveDate: now - 5 * 365 * 86400,
    effectiveDate: now - 30 * 86400,
    expirationDate: now + 335 * 86400,
  };

  const mockClaims: MalpracticeClaim[] = [
    {
      claimId: "CLM-DISMISSED-01",
      incidentDate: now - 500 * 86400,
      claimReportedDate: now - 450 * 86400,
      claimDisposition: "DISMISSED_WITH_PREJUDICE",
      indemnityPaidUsd: 0,
      defenseExpenseUsd: 12000,
      allegationCategory: "SURGICAL_COMPLICATION",
    },
    {
      claimId: "CLM-DISMISSED-02",
      incidentDate: now - 200 * 86400,
      claimReportedDate: now - 180 * 86400,
      claimDisposition: "SETTLED_WITHOUT_LIABILITY",
      indemnityPaidUsd: 0,
      defenseExpenseUsd: 6500,
      allegationCategory: "INFORMED_CONSENT",
    },
  ];

  describe("GET /api/v1/insurance/verify", () => {
    it("returns global accredited underwriter catalog and standard requirements", async () => {
      const req = new Request("https://aquas.health/api/v1/insurance/verify");
      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.accreditedCarriers)).toBe(true);
      expect(data.accreditedCarriers.length).toBeGreaterThanOrEqual(5);
      expect(data.standardRequirements.minPerClaimLimitUsd).toBe(1_000_000);
      expect(data.standardRequirements.minAggregateLimitUsd).toBe(3_000_000);
    });

    it("returns specific carrier details for MedPro Group", async () => {
      const req = new Request("https://aquas.health/api/v1/insurance/verify?carrierId=CARRIER-MEDPRO-01");
      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.carrierId).toBe("CARRIER-MEDPRO-01");
      expect(data.name).toContain("Medical Protective");
      expect(data.amBestRating).toContain("A++");
      expect(data.naicCode).toBe("11843");
    });

    it("returns 404 when requested carrier ID is not found", async () => {
      const req = new Request("https://aquas.health/api/v1/insurance/verify?carrierId=CARRIER-UNKNOWN-99");
      const res = await GET(req);
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data.error).toContain("not found in accredited underwriter catalog");
      expect(Array.isArray(data.availableCarriers)).toBe(true);
    });
  });

  describe("POST /api/v1/insurance/verify", () => {
    it("returns 400 when body does not include a valid proof object", async () => {
      const req = new Request("https://aquas.health/api/v1/insurance/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalId: "HOSP-01" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("Expected 'proof' object");
    });

    it("successfully verifies valid underwriting clearance proof and issues FHIR R4 Coverage", async () => {
      const proof = await evaluateUnderwritingClearance(
        mockPolicy,
        mockClaims,
        undefined,
        riskChallenge,
        doctorSecretHex,
        now,
      );

      const req = new Request("https://aquas.health/api/v1/insurance/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof,
          hospitalId: "HOSP-PRESBYTERIAN-RISK",
          doctorNpi: "1948201938",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.valid).toBe(true);
      expect(data.underwritingStatus).toBe("CLEARANCE_GRANTED");
      expect(data.perClaimLimitProven).toBe(1_000_000);
      expect(data.aggregateLimitProven).toBe(3_000_000);
      expect(data.tailCoverageActive).toBe(true);
      expect(data.cleanClaimsSatisfied).toBe(true);
      expect(data.frivolousClaimsShielded).toBe(2);
      expect(data.nullifierConsumed).toBe(true);
      expect(typeof data.hospitalRiskSeal).toBe("string");

      // Verify FHIR R4 Coverage Structure
      const fhir = data.fhirCoverage;
      expect(fhir.resourceType).toBe("Coverage");
      expect(fhir.status).toBe("active");
      expect(fhir.subscriber.identifier.value).toBe("1948201938");
      expect(fhir.payor[0].identifier.value).toBe("CARRIER-MEDPRO-01");
    });

    it("detects and rejects replay attacks on consumed challenge nullifiers", async () => {
      const proof = await evaluateUnderwritingClearance(
        mockPolicy,
        mockClaims,
        undefined,
        "CHALLENGE-REPLAY-ATTACK-01",
        doctorSecretHex,
        now,
      );

      // First submission succeeds
      const req1 = new Request("https://aquas.health/api/v1/insurance/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proof }),
      });
      const res1 = await POST(req1);
      expect(res1.status).toBe(200);

      // Replay of same proof must be rejected with 422
      const req2 = new Request("https://aquas.health/api/v1/insurance/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proof }),
      });
      const res2 = await POST(req2);
      expect(res2.status).toBe(422);

      const data2 = await res2.json();
      expect(data2.valid).toBe(false);
      expect(data2.underwritingStatus).toBe("CLEARANCE_DENIED");
      expect(data2.reason).toContain("anti-replay violation");
    });

    it("rejects proof with tampered audit compliance seal", async () => {
      const proof = await evaluateUnderwritingClearance(
        mockPolicy,
        mockClaims,
        undefined,
        "CHALLENGE-TAMPER-TEST-02",
        doctorSecretHex,
        now,
      );

      // Tamper seal
      const tamperedProof = {
        ...proof,
        auditComplianceSeal: "0000000000000000000000000000000000000000000000000000000000000000",
      };

      const req = new Request("https://aquas.health/api/v1/insurance/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proof: tamperedProof }),
      });

      const res = await POST(req);
      expect(res.status).toBe(422);

      const data = await res.json();
      expect(data.valid).toBe(false);
      expect(data.reason).toContain("invalid or tampered");
    });
  });

  describe("JCAHO / CMS Malpractice Audit Exporter", () => {
    it("exports underwriting clearance proofs to standard CSV format", async () => {
      const proof = await evaluateUnderwritingClearance(
        mockPolicy,
        mockClaims,
        undefined,
        "CHALLENGE-CSV-TEST-03",
        doctorSecretHex,
        now,
      );

      const csv = exportInsuranceClearanceToCsv([proof], {
        institutionName: "Memorial Sloan Kettering - Risk Management",
        auditorId: "Chief Risk Officer Sarah Chen",
      });

      expect(csv).toContain("AQUAS ZERO-KNOWLEDGE MALPRACTICE UNDERWRITING & CLEAN-CLAIMS AUDIT REPORT");
      expect(csv).toContain("Memorial Sloan Kettering - Risk Management");
      expect(csv).toContain("Chief Risk Officer Sarah Chen");
      expect(csv).toContain(proof.proofId);
      expect(csv).toContain("CARRIER-MEDPRO-01");
      expect(csv).toContain("APPROVED");
      expect(csv).toContain("TRUE");
    });

    it("generates printable HTML JCAHO compliance certificate with shielded breakdown", async () => {
      const proof = await evaluateUnderwritingClearance(
        mockPolicy,
        mockClaims,
        undefined,
        "CHALLENGE-PRINT-TEST-04",
        doctorSecretHex,
        now,
      );

      const html = generatePrintableMalpracticeInsuranceCertificate(proof, {
        institutionName: "Cedars-Sinai Medical Center",
        auditorId: "Credentialing Risk Desk",
      });

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("ZERO-KNOWLEDGE MALPRACTICE UNDERWRITING SEAL");
      expect(html).toContain("Cedars-Sinai Medical Center");
      expect(html).toContain("Medical Protective");
      expect(html).toContain("A++ (Superior)");
      expect(html).toContain("$1,000,000");
      expect(html).toContain("$3,000,000");
      expect(html).toContain("2 Withheld (Zero Bias)");
      expect(html).toContain("100% HIPAA SHIELDED");
      expect(html).toContain(proof.challengeNullifier);
      expect(html).toContain(proof.auditComplianceSeal);
    });
  });
});
