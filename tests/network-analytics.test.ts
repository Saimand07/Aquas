import { describe, expect, it } from "vitest";
import {
  calculateNetworkKPIs,
  computeExpirationBuckets,
  formatTimeAgo,
  generateActivityFeed,
} from "../lib/network-analytics";
import type { OnChainRegistry } from "../lib/midnight-read";

describe("Network Analytics & Telemetry Calculator", () => {
  const mockRegistry: OnChainRegistry = {
    boardCount: 4,
    issuanceCount: 100,
    activeLicenseCount: 95,
    revocationCount: 5,
    verificationCount: 420,
    records: [
      {
        credentialId: "e0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70",
        exists: true,
        revoked: false,
        valid: true,
        issuedAt: 1700000000,
        expiresAt: 1700000000 + 86400 * 15, // 15 days (critical)
        issuer: "d72f60d3f297dc84078e19677b60e88759f9982a3ea3dbf87a387814cda034ad",
      },
      {
        credentialId: "d5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74",
        exists: true,
        revoked: false,
        valid: true,
        issuedAt: 1700000000,
        expiresAt: 1700000000 + 86400 * 45, // 45 days (warning)
        issuer: "d72f60d3f297dc84078e19677b60e88759f9982a3ea3dbf87a387814cda034ad",
      },
      {
        credentialId: "063d2925b9428dd77e829933b9a41dc7b8c7ae8a702e15c16d56fcc0ae8e5889",
        exists: true,
        revoked: false,
        valid: true,
        issuedAt: 1700000000,
        expiresAt: 1700000000 + 86400 * 75, // 75 days (upcoming)
        issuer: "d72f60d3f297dc84078e19677b60e88759f9982a3ea3dbf87a387814cda034ad",
      },
      {
        credentialId: "dac35704d1124c5c7bd884e97376040b40b37c02ccfe544da8bc1029e01debde",
        exists: true,
        revoked: false,
        valid: true,
        issuedAt: 1700000000,
        expiresAt: 1700000000 + 86400 * 180, // 180 days (healthy)
        issuer: "d72f60d3f297dc84078e19677b60e88759f9982a3ea3dbf87a387814cda034ad",
      },
      {
        credentialId: "1234567890123456789012345678901234567890123456789012345678901234",
        exists: true,
        revoked: true,
        valid: false,
        issuedAt: 1700000000,
        expiresAt: 1700000000 + 86400 * 200,
        issuer: "d72f60d3f297dc84078e19677b60e88759f9982a3ea3dbf87a387814cda034ad",
      },
    ],
  };

  it("calculates network KPIs accurately from ledger state", () => {
    const kpis = calculateNetworkKPIs(mockRegistry);
    expect(kpis.totalIssued).toBe(100);
    expect(kpis.activePhysicians).toBe(95);
    expect(kpis.revokedLicenses).toBe(5);
    expect(kpis.trustedBoards).toBe(4);
    expect(kpis.totalVerifications).toBe(420);
    expect(kpis.revocationRate).toBe(5); // 5%
    expect(kpis.networkIntegrityScore).toBe(95); // 95%
  });

  it("handles null registry state safely with defaults", () => {
    const kpis = calculateNetworkKPIs(null);
    expect(kpis.totalIssued).toBe(0);
    expect(kpis.activePhysicians).toBe(0);
    expect(kpis.networkIntegrityScore).toBe(100);
  });

  it("computes expiration horizon buckets correctly", () => {
    const baseNow = 1700000000;
    const buckets = computeExpirationBuckets(mockRegistry.records, baseNow);

    const critical = buckets.find((b) => b.id === "critical");
    const warning = buckets.find((b) => b.id === "warning");
    const upcoming = buckets.find((b) => b.id === "upcoming");
    const healthy = buckets.find((b) => b.id === "healthy");

    expect(critical?.count).toBe(1);
    expect(warning?.count).toBe(1);
    expect(upcoming?.count).toBe(1);
    expect(healthy?.count).toBe(1);
  });

  it("formats relative time strings properly", () => {
    const now = 100000;
    expect(formatTimeAgo(now - 30, now)).toBe("30s ago");
    expect(formatTimeAgo(now - 120, now)).toBe("2m ago");
    expect(formatTimeAgo(now - 7200, now)).toBe("2h ago");
    expect(formatTimeAgo(now - 86400 * 3, now)).toBe("3d ago");
  });

  it("generates structured event feed items", () => {
    const events = generateActivityFeed(mockRegistry.records, "0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74");
    expect(events.length).toBe(5);
    const revEvent = events.find((e) => e.type === "REVOCATION");
    const issEvent = events.find((e) => e.type === "ISSUANCE");

    expect(revEvent).toBeDefined();
    expect(revEvent?.title).toContain("Revoked");
    expect(issEvent).toBeDefined();
    expect(issEvent?.title).toContain("Issued");
    expect(issEvent?.blockExplorerUrl).toContain("0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74");
  });
});
