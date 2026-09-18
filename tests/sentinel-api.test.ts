import { describe, expect, it } from "vitest";
import { GET, POST } from "../app/api/v1/sentinel/sync/route";
import { verifyMerkleProof } from "../lib/sanction-sentinel";

describe("Continuous Sanction Sentinel REST API (/api/v1/sentinel/sync)", () => {
  const sanctionedNpi = "1882773645"; // Dr. Arthur Vance (NPDB Gross Negligence)
  const nonSanctionedNpi = "1234567890"; // Clean clinician

  describe("GET /api/v1/sentinel/sync", () => {
    it("returns global sentinel status with accumulator root and incident catalog", async () => {
      const req = new Request("https://aquas.health/api/v1/sentinel/sync");
      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.accumulatorRoot).toMatch(/^[0-9a-f]{64}$/);
      expect(data.leafCount).toBeGreaterThan(0);
      expect(data.standard).toContain("JCAHO MS.06.01.03");
      expect(Array.isArray(data.activeIncidents)).toBe(true);
      expect(data.authorityDistribution).toBeDefined();
    });

    it("evaluates a sanctioned clinician and provides valid Merkle proof", async () => {
      const req = new Request(`https://aquas.health/api/v1/sentinel/sync?npi=${sanctionedNpi}`);
      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.sanctionStatus).toBe("EXCLUDED_SANCTIONED");
      expect(data.lockoutRequired).toBe(true);
      expect(data.sanction.clinicianName).toBe("Dr. Arthur Vance, MD");
      expect(data.sanction.sanctionAuthority).toBe("NPDB");
      expect(data.jcahoComplianceRecord.surveyStandard).toBe("JCAHO MS.06.01.03");

      const proofValid = await verifyMerkleProof(data.merkleProof);
      expect(proofValid).toBe(true);
    });

    it("evaluates a non-sanctioned clinician and provides CLEARED compliance record", async () => {
      const req = new Request(`https://aquas.health/api/v1/sentinel/sync?npi=${nonSanctionedNpi}`);
      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.sanctionStatus).toBe("CLEARED");
      expect(data.lockoutRequired).toBe(false);
      expect(data.jcahoComplianceRecord.sanctionStatus).toBe("CLEARED");
      expect(data.jcahoComplianceRecord.complianceSeal).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("POST /api/v1/sentinel/sync", () => {
    it("returns 400 when 'prescriberNpi' is missing from request body", async () => {
      const req = new Request("https://aquas.health/api/v1/sentinel/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institution: "Metro Health" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("Missing required field 'prescriberNpi'");
    });

    it("triggers EHR lockout directives and signed webhook dispatch for sanctioned clinician", async () => {
      const oigNpi = "1993884756"; // Dr. Gregory House (HHS-OIG Opioid Diversion)
      const req = new Request("https://aquas.health/api/v1/sentinel/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriberNpi: oigNpi,
          institution: "St. Jude Metropolitan Medical Center",
          webhookSecret: "super-secret-key-32b-length-abc12",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.sanctionStatus).toBe("EXCLUDED_SANCTIONED");
      expect(data.lockoutRequired).toBe(true);
      expect(data.lockoutDirectives.targetEhrSystems).toContain("Epic Hyperdrive");
      expect(data.lockoutDirectives.lockoutDeadlineSeconds).toBe(5);
      expect(data.webhookDispatch.eventType).toBe("sentinel.lockout_triggered");
      expect(data.webhookDispatch.signature).toContain("v1=");
    });

    it("returns CLEARED status with zero lockout directives for non-sanctioned clinician", async () => {
      const req = new Request("https://aquas.health/api/v1/sentinel/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriberNpi: "1449882200",
          clinicianName: "Dr. Meredith Grey, MD",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.sanctionStatus).toBe("CLEARED");
      expect(data.lockoutRequired).toBe(false);
      expect(data.lockoutDirectives).toBeUndefined();
      expect(data.jcahoComplianceRecord.sanctionStatus).toBe("CLEARED");
    });
  });
});
