import { describe, expect, it } from "vitest";
import { GET, POST } from "../app/api/v1/epcs/verify/route";
import { deriveEphemeralPrescriptionToken } from "../lib/epcs-engine";

describe("Confidential EPCS Verification REST API (/api/v1/epcs/verify)", () => {
  const doctorSecretHex = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";
  const validNdc = "00054-0168-13"; // Schedule II Oxycodone
  const fullAuthorityMask = 0x0f; // Schedules II, III, IV, V

  describe("GET /api/v1/epcs/verify", () => {
    it("returns 400 when 'ndc' query parameter is omitted", async () => {
      const req = new Request("https://aquas.health/api/v1/epcs/verify");
      const res = await GET(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("Missing required query parameter 'ndc'");
      expect(Array.isArray(data.availableSubstances)).toBe(true);
    });

    it("returns 404 when requested NDC is unknown", async () => {
      const req = new Request("https://aquas.health/api/v1/epcs/verify?ndc=99999-9999-99");
      const res = await GET(req);
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data.error).toContain("not found in controlled substances catalog");
    });

    it("returns substance regulatory details and prescriber authority check", async () => {
      const req = new Request(`https://aquas.health/api/v1/epcs/verify?ndc=${validNdc}&prescriberMask=${fullAuthorityMask}`);
      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.ndc).toBe(validNdc);
      expect(data.genericName).toBe("Oxycodone Hydrochloride");
      expect(data.schedule).toBe("SCHEDULE_II");
      expect(data.maxRefillsAllowed).toBe(0);
      expect(data.requiresStrictIdentityCheck).toBe(true);
      expect(data.prescriberAuthorized).toBe(true);
      expect(data.complianceNote).toContain("21 CFR § 1306.12");
    });

    it("flags unauthorized prescriber when bitmask excludes Schedule II", async () => {
      // Bitmask 0x0C (Schedules IV & V only)
      const req = new Request(`https://aquas.health/api/v1/epcs/verify?ndc=${validNdc}&prescriberMask=12`);
      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.prescriberAuthorized).toBe(false);
    });
  });

  describe("POST /api/v1/epcs/verify", () => {
    it("returns 400 when body is missing valid token object", async () => {
      const req = new Request("https://aquas.health/api/v1/epcs/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("Invalid payload");
    });

    it("approves valid EPAT token and returns FHIR R4 MedicationRequest", async () => {
      const token = await deriveEphemeralPrescriptionToken(
        doctorSecretHex,
        fullAuthorityMask,
        validNdc,
        "MRN-API-TEST-01",
        "10 mg",
        30,
        "1992883710",
      );

      const req = new Request("https://aquas.health/api/v1/epcs/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          authorizedScheduleBitmask: fullAuthorityMask,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.valid).toBe(true);
      expect(data.dispenseApproved).toBe(true);
      expect(data.schedule).toBe("SCHEDULE_II");
      expect(data.fhir).toBeDefined();
      expect(data.fhir.resourceType).toBe("MedicationRequest");
    });

    it("enforces double-dispense prevention when token nullifier was already used", async () => {
      const token = await deriveEphemeralPrescriptionToken(
        doctorSecretHex,
        fullAuthorityMask,
        validNdc,
        "MRN-API-TEST-DOUBLE-DISPENSE",
        "10 mg",
        20,
        "1992883710",
      );

      // First dispense request
      const req1 = new Request("https://aquas.health/api/v1/epcs/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          authorizedScheduleBitmask: fullAuthorityMask,
        }),
      });

      const res1 = await POST(req1);
      const data1 = await res1.json();
      expect(data1.valid).toBe(true);

      // Second dispense attempt with the exact same token nullifier
      const req2 = new Request("https://aquas.health/api/v1/epcs/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          authorizedScheduleBitmask: fullAuthorityMask,
          usedNullifiers: [token.prescriptionNullifier],
        }),
      });

      const res2 = await POST(req2);
      expect(res2.status).toBe(200);

      const data2 = await res2.json();
      expect(data2.valid).toBe(false);
      expect(data2.dispenseApproved).toBe(false);
      expect(data2.reason).toContain("already been dispensed");
    });
  });
});
