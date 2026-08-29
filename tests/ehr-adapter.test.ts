import { describe, expect, it } from "vitest";
import {
  extractCredentialFromEhrRequest,
  mapToFhirVerificationResult,
  type FhirPractitioner,
} from "../lib/ehr-adapter";
import type { OnChainLicense } from "../lib/midnight-read";

describe("HL7 FHIR Release 4 EHR Adapter", () => {
  const validHexId = "e0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70";

  it("extracts credential ID from standard request string", () => {
    const extracted = extractCredentialFromEhrRequest({ credentialId: `0x${validHexId}` });
    expect(extracted).toBe(validHexId);
  });

  it("extracts credential ID from FHIR Practitioner resource identifier", () => {
    const fhirPractitioner: FhirPractitioner = {
      resourceType: "Practitioner",
      id: "practitioner-12345",
      identifier: [
        { system: "http://hl7.org/fhir/sid/us-npi", value: "1928374650" },
        { system: "https://aquas.health/zk-credentials", value: validHexId },
      ],
      name: [{ family: "Jenkins", given: ["Sarah"], prefix: ["Dr."] }],
    };

    const extracted = extractCredentialFromEhrRequest({ fhirPractitioner });
    expect(extracted).toBe(validHexId);
  });

  it("maps valid on-chain license to FHIR VerificationResult resource", () => {
    const mockLicense: OnChainLicense = {
      exists: true,
      valid: true,
      revoked: false,
      issuedAt: 1700000000,
      expiresAt: 1750000000,
      issuer: "d72f60d3f297dc84078e19677b60e88759f9982a3ea3dbf87a387814cda034ad",
    };

    const fhirResult = mapToFhirVerificationResult(validHexId, mockLicense, {
      specialty: "Interventional Cardiology",
      deaSchedule: "SCHEDULE_II_V",
      cmeThresholdSatisfied: true,
      cleanRecordAttestation: true,
    });

    expect(fhirResult.resourceType).toBe("VerificationResult");
    expect(fhirResult.status).toBe("validated");
    expect(fhirResult.validator?.[0]?.organization?.display).toContain("Midnight Network");
    expect(fhirResult.extension?.some((e) => e.valueString === validHexId)).toBe(true);
    expect(fhirResult.extension?.some((e) => e.valueString === "Interventional Cardiology")).toBe(true);
    expect(fhirResult.extension?.some((e) => e.valueString === "SCHEDULE_II_V")).toBe(true);
  });

  it("maps revoked on-chain license to failed status in FHIR", () => {
    const mockLicense: OnChainLicense = {
      exists: true,
      valid: false,
      revoked: true,
      issuedAt: 1700000000,
      expiresAt: 1750000000,
      issuer: "d72f60d3f297dc84078e19677b60e88759f9982a3ea3dbf87a387814cda034ad",
    };

    const fhirResult = mapToFhirVerificationResult(validHexId, mockLicense);
    expect(fhirResult.status).toBe("val-fail");
  });
});
