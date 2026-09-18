import { describe, expect, it, beforeEach } from "vitest";
import {
  KNOWN_DISCIPLINARY_SANCTIONS,
  computeSanctionLeaf,
  computeAccumulatorRoot,
  generateMerkleProof,
  verifyMerkleProof,
  initializeAccumulator,
  insertSanctionRecord,
  formatJcahoComplianceRecord,
  generateJcahoAuditReport,
  type AttestedSanctionRecord,
} from "../lib/sanction-sentinel";
import { createWebhookEvent, verifyWebhookSignature, type WebhookSubscription } from "../lib/webhooks";
import {
  dispatchWebhookWithRetry,
  clearDeadLetterQueue,
  getDeadLetterQueue,
} from "../lib/webhook-dispatcher";

describe("Continuous Sanction Sentinel & NPDB/OIG Dynamic Accumulator Engine", () => {
  beforeEach(() => {
    clearDeadLetterQueue();
  });

  describe("NPDB & HHS-OIG Exclusion Catalog", () => {
    it("indexes verified disciplinary exclusions with federal statutory citations", () => {
      const records = Object.values(KNOWN_DISCIPLINARY_SANCTIONS);
      expect(records.length).toBeGreaterThanOrEqual(4);

      for (const rec of records) {
        expect(rec.recordId).toMatch(/^REC-/);
        expect(rec.prescriberNpi).toMatch(/^\d{10}$/);
        expect(rec.credentialId).toMatch(/^[0-9a-f]{64}$/);
        expect(rec.exclusionStatute.length).toBeGreaterThan(5);
        expect(rec.oracleFeederSignature).toMatch(/^[0-9a-f]{64}$/);
      }
    });

    it("flags immediate lockout severity for patient harm and controlled substance diversion", () => {
      const diversionRec = KNOWN_DISCIPLINARY_SANCTIONS["REC-OIG-2026-114"];
      expect(diversionRec.category).toBe("CONTROLLED_SUBSTANCE_DIVERSION");
      expect(diversionRec.severity).toBe("IMMEDIATE_LOCKOUT");

      const negligenceRec = KNOWN_DISCIPLINARY_SANCTIONS["REC-NPDB-2026-091"];
      expect(negligenceRec.category).toBe("GROSS_NEGLIGENCE_MALPRACTICE");
      expect(negligenceRec.severity).toBe("IMMEDIATE_LOCKOUT");
    });
  });

  describe("Cryptographic Dynamic Merkle Accumulator", () => {
    it("computes deterministic 32-byte hex leaf for an attested sanction record", async () => {
      const rec = KNOWN_DISCIPLINARY_SANCTIONS["REC-NPDB-2026-091"];
      const leaf1 = await computeSanctionLeaf(rec);
      const leaf2 = await computeSanctionLeaf(rec);

      expect(leaf1).toBe(leaf2);
      expect(leaf1).toMatch(/^[0-9a-f]{64}$/);
    });

    it("initializes dynamic accumulator and computes valid root across all initial records", async () => {
      const accumulator = await initializeAccumulator();

      expect(accumulator.leafCount).toBeGreaterThanOrEqual(4);
      expect(accumulator.accumulatorRoot).toMatch(/^[0-9a-f]{64}$/);
      expect(accumulator.leaves.length).toBe(accumulator.leafCount);
    });

    it("generates and cryptographically verifies Merkle inclusion proofs", async () => {
      const accumulator = await initializeAccumulator();
      const targetIndex = 1;
      const proof = await generateMerkleProof(accumulator.leaves, targetIndex);

      expect(proof.leaf).toBe(accumulator.leaves[targetIndex]);
      expect(proof.root).toBe(accumulator.accumulatorRoot);
      expect(proof.steps.length).toBeGreaterThanOrEqual(2);

      const isValid = await verifyMerkleProof(proof);
      expect(isValid).toBe(true);
    });

    it("rejects forged or tampered Merkle proofs", async () => {
      const accumulator = await initializeAccumulator();
      const proof = await generateMerkleProof(accumulator.leaves, 0);

      // Tamper leaf
      const tamperedProof = {
        ...proof,
        leaf: "00".repeat(32),
      };

      const isValid = await verifyMerkleProof(tamperedProof);
      expect(isValid).toBe(false);
    });

    it("dynamically inserts new disciplinary records and updates accumulator root", async () => {
      const initialAccumulator = await initializeAccumulator();
      const initialRoot = initialAccumulator.accumulatorRoot;

      const newSanction: AttestedSanctionRecord = {
        recordId: "REC-SENTINEL-NEW-01",
        credentialId: "556677889900aabbccddeeff11223344556677889900aabbccddeeff11223344",
        prescriberNpi: "1443332211",
        clinicianName: "Dr. Jack Kevorkian, MD",
        sanctionAuthority: "STATE_MEDICAL_BOARD",
        category: "CLINICAL_PRIVILEGE_REVOCATION",
        severity: "IMMEDIATE_LOCKOUT",
        exclusionStatute: "State Board Rule 14-B",
        description: "Permanent emergency revocation of medical licensure.",
        actionDate: Math.floor(Date.now() / 1000),
        oracleFeederSignature: "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899",
      };

      const { updatedState, proof } = await insertSanctionRecord(initialAccumulator, newSanction);

      expect(updatedState.leafCount).toBe(initialAccumulator.leafCount + 1);
      expect(updatedState.accumulatorRoot).not.toBe(initialRoot);
      expect(proof.root).toBe(updatedState.accumulatorRoot);

      const proofValid = await verifyMerkleProof(proof);
      expect(proofValid).toBe(true);
    });
  });

  describe("Joint Commission (JCAHO) & CMS Accreditation Audit Formatter", () => {
    it("formats standard JCAHO MS.06.01.03 audit record for sanctioned clinician", async () => {
      const sanction = KNOWN_DISCIPLINARY_SANCTIONS["REC-OIG-2026-114"];
      const auditRecord = await formatJcahoComplianceRecord(
        sanction.clinicianName,
        sanction.prescriberNpi,
        sanction.credentialId,
        sanction,
        "accumulator_root_hex_1234",
      );

      expect(auditRecord.auditId).toMatch(/^JCAHO-AUDIT-/);
      expect(auditRecord.surveyStandard).toBe("JCAHO MS.06.01.03");
      expect(auditRecord.sanctionStatus).toBe("EXCLUDED_SANCTIONED");
      expect(auditRecord.authorityQueried).toBe("HHS_OIG_LEIE");
      expect(auditRecord.statuteCitation).toContain("42 U.S.C. § 1320a-7");
      expect(auditRecord.complianceSeal).toMatch(/^[0-9a-f]{64}$/);
    });

    it("formats audit record for cleared clinician", async () => {
      const auditRecord = await formatJcahoComplianceRecord(
        "Dr. Sarah Lin, MD",
        "1992883710",
        "e0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70",
        undefined,
      );

      expect(auditRecord.sanctionStatus).toBe("CLEARED");
      expect(auditRecord.statuteCitation).toBeUndefined();
    });

    it("generates comprehensive hospital-wide JCAHO accreditation survey report", async () => {
      const rec1 = await formatJcahoComplianceRecord("Dr. Sarah Lin, MD", "1992883710", "cred-1");
      const rec2 = await formatJcahoComplianceRecord("Dr. James Wilson, MD", "1882773645", "cred-2");
      const rec3 = await formatJcahoComplianceRecord(
        "Dr. Gregory House, MD",
        "1993884756",
        "cred-3",
        KNOWN_DISCIPLINARY_SANCTIONS["REC-OIG-2026-114"],
      );

      const report = await generateJcahoAuditReport([rec1, rec2, rec3]);

      expect(report.reportId).toMatch(/^JCAHO-SURVEY-REPORT-/);
      expect(report.totalCliniciansSurveyed).toBe(3);
      expect(report.clearedCount).toBe(2);
      expect(report.sanctionedCount).toBe(1);
      expect(report.lockoutCompliancePercentage).toBe(66.67);
      expect(report.auditRecords.length).toBe(3);
    });
  });

  describe("Automated Webhook Dispatch Pipeline with Retries & HMAC Security", () => {
    const mockSubscription: WebhookSubscription = {
      id: "sub-epic-ehr-01",
      url: "https://ehr.metrohealth.org/api/webhooks/aquas",
      secret: "whsec_super_secret_epic_ehr_key",
      events: ["license.sanctioned", "sentinel.lockout_triggered"],
      createdAt: Math.floor(Date.now() / 1000),
      active: true,
      institutionName: "MetroHealth System",
    };

    it("dispatches webhook successfully on first attempt with verified HMAC signature", async () => {
      const event = createWebhookEvent("license.sanctioned", {
        credentialId: "e0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70",
        prescriberNpi: "1882773645",
        reason: "NPDB Disciplinary Suspension",
      });

      let capturedSignature = "";
      const mockFetch = async (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        capturedSignature = (init?.headers as Record<string, string>)?.["X-Aquas-Signature"] || "";
        return new Response(JSON.stringify({ received: true }), { status: 200, statusText: "OK" });
      };

      const result = await dispatchWebhookWithRetry(mockSubscription, event, mockFetch as unknown as typeof fetch);

      expect(result.success).toBe(true);
      expect(result.totalAttempts).toBe(1);
      expect(result.deadLettered).toBe(false);
      expect(capturedSignature).toBeDefined();

      const validSig = await verifyWebhookSignature(JSON.stringify(event), capturedSignature, mockSubscription.secret);
      expect(validSig).toBe(true);
    });

    it("automatically retries on transient server error (500) and succeeds", async () => {
      const event = createWebhookEvent("sentinel.lockout_triggered", {
        credentialId: "f1d0e6e7e1df8e6ed9ee5362b9e6cb1c479d53cc764f96c555f2429e04332f81",
        prescriberNpi: "1993884756",
        action: "LOCK_ORDER_ENTRY_IMMEDIATE",
      });

      let attemptsCount = 0;
      const mockFetch = async (): Promise<Response> => {
        attemptsCount++;
        if (attemptsCount === 1) {
          return new Response("EHR Gateway Timeout", { status: 504, statusText: "Gateway Timeout" });
        }
        return new Response(JSON.stringify({ locked: true }), { status: 200, statusText: "OK" });
      };

      const result = await dispatchWebhookWithRetry(
        mockSubscription,
        event,
        mockFetch as unknown as typeof fetch,
        { maxRetries: 3, initialBackoffMs: 10 },
      );

      expect(result.success).toBe(true);
      expect(result.totalAttempts).toBe(2);
      expect(result.deadLettered).toBe(false);
      expect(result.attempts[0].success).toBe(false);
      expect(result.attempts[1].success).toBe(true);
    });

    it("records event in dead-letter queue after max retries are exhausted", async () => {
      const event = createWebhookEvent("license.sanctioned", {
        credentialId: "bad-credential",
      });

      const failingFetch = async (): Promise<Response> => {
        return new Response("Internal EHR Error", { status: 500, statusText: "Server Error" });
      };

      const result = await dispatchWebhookWithRetry(
        mockSubscription,
        event,
        failingFetch as unknown as typeof fetch,
        { maxRetries: 2, initialBackoffMs: 5 },
      );

      expect(result.success).toBe(false);
      expect(result.totalAttempts).toBe(2);
      expect(result.deadLettered).toBe(true);

      const deadLetter = getDeadLetterQueue();
      expect(deadLetter.length).toBe(1);
      expect(deadLetter[0].eventId).toBe(event.id);
    });
  });
});
