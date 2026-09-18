import { describe, expect, it } from "vitest";
import { GET, POST } from "../app/api/v1/privileges/verify/route";
import {
  createBlindedProcedureAttestation,
  evaluateCaseVolumePrivilege,
  type BlindedProcedureAttestation,
} from "../lib/surgical-privileges";

describe("Confidential Surgical Privileging REST API (/api/v1/privileges/verify)", () => {
  const doctorSecretHex = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";
  const hospitalSecretHex = "99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa";
  const committeeChallenge = "CHALLENGE-HOSP-REST-TEST-01";

  // Helper to generate mock operative log
  async function createTestOperativeLog(
    cptCode: string,
    count: number,
    adverseCount = 0,
  ): Promise<BlindedProcedureAttestation[]> {
    const procs: BlindedProcedureAttestation[] = [];
    const now = Math.floor(Date.now() / 1000);

    for (let i = 0; i < count; i++) {
      const outcome = i < adverseCount ? "MAJOR_ADVERSE_EVENT" : "OPTIMAL_OUTCOME";
      const salt = (i + 1).toString(16).padStart(64, "0");
      const att = await createBlindedProcedureAttestation(
        cptCode,
        outcome,
        "HOSP-MAYO-001",
        now - 1000,
        salt,
        hospitalSecretHex,
      );
      procs.push(att);
    }
    return procs;
  }

  describe("GET /api/v1/privileges/verify", () => {
    it("returns global surgical privileging catalog and accredited facilities", async () => {
      const req = new Request("https://aquas.health/api/v1/privileges/verify");
      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.cptCatalog)).toBe(true);
      expect(data.cptCatalog.length).toBeGreaterThanOrEqual(6);
      expect(Array.isArray(data.accreditedFacilities)).toBe(true);
    });

    it("returns specific procedure standards for CPT 33533 (CABG)", async () => {
      const req = new Request("https://aquas.health/api/v1/privileges/verify?cpt=33533");
      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.cptCode).toBe("33533");
      expect(data.procedureName).toContain("Coronary Artery Bypass");
      expect(data.min12MonthVolume).toBe(50);
      expect(data.maxAdverseRatePercent).toBe(1.5);
      expect(data.requiresJcahoAccreditedFacility).toBe(true);
    });

    it("returns 404 when requested CPT code is not in surgical catalog", async () => {
      const req = new Request("https://aquas.health/api/v1/privileges/verify?cpt=99999");
      const res = await GET(req);
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data.error).toContain("not found in surgical catalog");
    });
  });

  describe("POST /api/v1/privileges/verify", () => {
    it("returns 400 when body does not include a valid proof object", async () => {
      const req = new Request("https://aquas.health/api/v1/privileges/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ committeeId: "HOSP-01" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("Expected 'proof' object");
    });

    it("successfully verifies valid surgical privilege proof and issues FHIR ClinicalImpression", async () => {
      const log = await createTestOperativeLog("33533", 52, 0);
      const proof = await evaluateCaseVolumePrivilege(log, "33533", committeeChallenge, doctorSecretHex);

      const req = new Request("https://aquas.health/api/v1/privileges/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof,
          committeeId: "HOSP-MT-SINAI-CREDENTIALS",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.valid).toBe(true);
      expect(data.privilegeStatus).toBe("PRIVILEGE_GRANTED");
      expect(data.cptCode).toBe("33533");
      expect(data.totalProceduresAttested).toBe(52);
      expect(data.adverseRateProvenPercent).toBe(0);
      expect(data.nullifierConsumed).toBe(true);
      expect(data.committeeApprovalSeal).toMatch(/^[0-9a-f]{64}$/);
      expect(data.fhirClinicalImpression.resourceType).toBe("ClinicalImpression");
    });

    it("rejects proof that failed competency thresholds (volume < 50)", async () => {
      const log = await createTestOperativeLog("33533", 25, 0); // only 25 procedures
      const proof = await evaluateCaseVolumePrivilege(log, "33533", "CHALLENGE-UNDER-VOLUME", doctorSecretHex);

      const req = new Request("https://aquas.health/api/v1/privileges/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proof }),
      });
      const res = await POST(req);
      expect(res.status).toBe(422);

      const data = await res.json();
      expect(data.valid).toBe(false);
      expect(data.privilegeStatus).toBe("PRIVILEGE_DENIED");
      expect(data.reason).toContain("threshold not satisfied");
    });

    it("prevents double-submission and replay attacks using consumed challenge nullifiers", async () => {
      const log = await createTestOperativeLog("33533", 55, 0);
      const proof = await evaluateCaseVolumePrivilege(log, "33533", "CHALLENGE-REPLAY-TEST", doctorSecretHex);

      // Register nullifier in consumed list
      const req = new Request("https://aquas.health/api/v1/privileges/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof,
          consumedNullifiers: [proof.challengeNullifier],
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(422);

      const data = await res.json();
      expect(data.valid).toBe(false);
      expect(data.reason).toContain("replay attack prevented");
    });
  });
});
