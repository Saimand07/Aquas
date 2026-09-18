import { describe, expect, it } from "vitest";
import { GET, POST } from "../app/api/v1/imlc/verify/route";

describe("IMLC Interstate Verification REST API", () => {
  const validCredentialId = "e0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70";
  const doctorSecretHex = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";

  describe("GET /api/v1/imlc/verify", () => {
    it("returns active reciprocity status between member states (CO -> TX)", async () => {
      const request = new Request(`https://aquas.health/api/v1/imlc/verify?credentialId=${validCredentialId}&homeState=CO&targetState=TX`);
      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.eligible).toBe(true);
      expect(data.reciprocityStatus).toBe("RECIPROCAL_ACTIVE");
      expect(data.coveredJurisdictionsCount).toBeGreaterThanOrEqual(37);
      expect(data.fhir).toBeDefined();
      expect(data.fhir.resourceType).toBe("VerificationResult");
    });

    it("returns error for missing credentialId", async () => {
      const request = new Request("https://aquas.health/api/v1/imlc/verify");
      const response = await GET(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain("Missing required parameter");
    });

    it("returns error for malformed credentialId", async () => {
      const request = new Request("https://aquas.health/api/v1/imlc/verify?credentialId=not-a-hex");
      const response = await GET(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain("Invalid credentialId format");
    });
  });

  describe("POST /api/v1/imlc/verify", () => {
    it("processes JSON body and returns generated ZK proof and verification", async () => {
      const request = new Request("https://aquas.health/api/v1/imlc/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentialId: validCredentialId,
          homeState: "CO",
          targetState: "WA",
          doctorSecretHex,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.eligible).toBe(true);
      expect(data.proof).toBeDefined();
      expect(data.proof.proofNullifierHex).toMatch(/^[0-9a-f]{64}$/);
      expect(data.verification.valid).toBe(true);
    });

    it("rejects request with invalid credential format in POST body", async () => {
      const request = new Request("https://aquas.health/api/v1/imlc/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentialId: "short",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
