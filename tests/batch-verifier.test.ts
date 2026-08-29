import { describe, expect, it } from "vitest";
import {
  cleanCredentialId,
  isValidCredentialId,
  parseRosterInput,
  generateSampleCsvTemplate,
} from "../lib/batch-verifier";
import {
  exportResultsToCsv,
  generatePrintableHtmlCertificate,
} from "../lib/audit-exporter";

describe("Batch Verifier Utilities", () => {
  const validHexId1 = "e0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70";
  const validHexId2 = "0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74";
  const invalidHexId = "12345notvalidhex67890";

  it("cleans and validates 64-character hexadecimal IDs", () => {
    expect(isValidCredentialId(validHexId1)).toBe(true);
    expect(isValidCredentialId(validHexId2)).toBe(true);
    expect(cleanCredentialId(validHexId2)).toBe("d5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74");
    expect(isValidCredentialId(invalidHexId)).toBe(false);
  });

  it("parses multiline raw hexadecimal IDs", () => {
    const input = `${validHexId1}\n${validHexId2}\n${invalidHexId}`;
    const { entries, errors } = parseRosterInput(input);

    expect(entries.length).toBe(2);
    expect(entries[0].credentialId).toBe(validHexId1);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("not a valid 64-character hex ID");
  });

  it("parses CSV with standard headers", () => {
    const csv = `credentialId,doctorName,npiNumber,department\n${validHexId1},Dr. Sarah Jenkins MD,1982746192,Cardiology\n${validHexId2},Dr. Marcus Chen MD,1029384756,Emergency Medicine`;
    const { entries, errors } = parseRosterInput(csv);

    expect(errors.length).toBe(0);
    expect(entries.length).toBe(2);
    expect(entries[0].doctorName).toBe("Dr. Sarah Jenkins MD");
    expect(entries[0].npiNumber).toBe("1982746192");
    expect(entries[0].department).toBe("Cardiology");
  });

  it("parses JSON formatted roster", () => {
    const json = JSON.stringify([
      { credentialId: validHexId1, name: "Dr. Elena Rostova", dept: "Neurology" },
      { id: validHexId2, doctorName: "Dr. James Thornton", department: "Anesthesiology" },
    ]);
    const { entries, errors } = parseRosterInput(json);

    expect(errors.length).toBe(0);
    expect(entries.length).toBe(2);
    expect(entries[0].doctorName).toBe("Dr. Elena Rostova");
    expect(entries[1].department).toBe("Anesthesiology");
  });

  it("generates sample CSV template", () => {
    const template = generateSampleCsvTemplate();
    expect(template).toContain("credentialId,doctorName,npiNumber,department");
    const { entries } = parseRosterInput(template);
    expect(entries.length).toBeGreaterThanOrEqual(3);
  });
});

describe("Audit Exporter Engine", () => {
  const mockResults = [
    {
      id: "row-1",
      credentialId: "e0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70",
      doctorName: "Dr. Sarah Jenkins MD",
      npiNumber: "1982746192",
      department: "Cardiology",
      status: "ACTIVE" as const,
      issuerBoard: "Board Texas",
      issuedAt: 1700000000,
      expiresAt: 1900000000,
      valid: true,
      checkedAt: "2026-08-29T18:00:00.000Z",
      latencyMs: 120,
    },
    {
      id: "row-2",
      credentialId: "d5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74",
      doctorName: "Dr. Marcus Chen MD",
      npiNumber: "1029384756",
      department: "Emergency",
      status: "EXPIRED" as const,
      issuerBoard: "Board California",
      issuedAt: 1600000000,
      expiresAt: 1650000000,
      valid: false,
      checkedAt: "2026-08-29T18:00:00.000Z",
      latencyMs: 95,
    },
  ];

  it("exports verification results to standardized CSV", () => {
    const csv = exportResultsToCsv(mockResults, {
      institutionName: "General City Hospital",
      auditorId: "Dr. Chief Medical Officer",
    });

    expect(csv).toContain("AQUAS ZERO-KNOWLEDGE MEDICAL CREDENTIAL AUDIT REPORT");
    expect(csv).toContain("General City Hospital");
    expect(csv).toContain("Dr. Sarah Jenkins MD");
    expect(csv).toContain("ACTIVE");
    expect(csv).toContain("EXPIRED");
  });

  it("generates printable HTML JCAHO audit certificate", () => {
    const html = generatePrintableHtmlCertificate(mockResults, {
      institutionName: "St. Jude Healthcare",
    });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Aquas · Medical License Registry");
    expect(html).toContain("St. Jude Healthcare");
    expect(html).toContain("Dr. Sarah Jenkins MD");
    expect(html).toContain("ZERO-KNOWLEDGE AUDIT CERTIFICATE");
  });
});
