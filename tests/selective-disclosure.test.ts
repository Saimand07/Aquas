import { describe, expect, it } from "vitest";
import {
  computeAttributePayloadHash,
  createSelectiveDisclosureProof,
  encodeProofUri,
  decodeProofUri,
} from "../lib/selective-disclosure";

describe("Selective Disclosure & Multi-Attribute Cryptography", () => {
  const credentialId = "e0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70";
  const txId = "dac35704d1124c5c7bd884e97376040b40b37c02ccfe544da8bc1029e01debde";
  const doctorSecretHex = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";
  const challengeBytes = new Uint8Array(32).fill(42);

  it("computes deterministic payload hash from attributes", async () => {
    const hash1 = await computeAttributePayloadHash("Dr. Sarah Jenkins MD", "MD-12345", {
      specialty: "Cardiology",
      deaAuthorized: true,
      cmeHours: 60,
      cleanRecord: true,
    });

    const hash2 = await computeAttributePayloadHash("Dr. Sarah Jenkins MD", "MD-12345", {
      specialty: "Cardiology",
      deaAuthorized: true,
      cmeHours: 60,
      cleanRecord: true,
    });

    const hashDiff = await computeAttributePayloadHash("Dr. Sarah Jenkins MD", "MD-12345", {
      specialty: "Neurology",
      deaAuthorized: false,
      cmeHours: 30,
      cleanRecord: false,
    });

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashDiff);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("creates signed selective disclosure proof bundle", async () => {
    const proof = await createSelectiveDisclosureProof(
      credentialId,
      txId,
      challengeBytes,
      doctorSecretHex,
      {
        specialty: "Cardiothoracic Surgery",
        deaAuthorized: true,
        cmeHours: 75,
        cleanRecord: true,
      },
      {
        includeSpecialty: true,
        includeDeaAuthority: true,
        includeCmeThreshold: true,
        includeCleanRecord: true,
      },
    );

    expect(proof.credentialId).toBe(credentialId);
    expect(proof.txId).toBe(txId);
    expect(proof.disclosed.specialty).toBe("Cardiothoracic Surgery");
    expect(proof.disclosed.deaSchedule).toBe("SCHEDULE_II_V");
    expect(proof.disclosed.cmeThresholdSatisfied).toBe(true);
    expect(proof.disclosed.cleanRecordAttestation).toBe(true);
    expect(proof.signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it("encodes and decodes selective disclosure URIs losslessly", async () => {
    const proof = await createSelectiveDisclosureProof(
      credentialId,
      txId,
      challengeBytes,
      doctorSecretHex,
      {
        specialty: "Emergency Medicine",
        deaAuthorized: true,
        cmeHours: 55,
        cleanRecord: true,
      },
      {
        includeSpecialty: true,
        includeDeaAuthority: true,
        includeCmeThreshold: true,
        includeCleanRecord: false,
      },
    );

    const uri = encodeProofUri(proof);
    expect(uri).toContain("aquas://verify/");
    expect(uri).toContain("spec=Emergency+Medicine");
    expect(uri).toContain("dea=SCHEDULE_II_V");
    expect(uri).toContain("cme=50%2B");

    const decoded = decodeProofUri(uri);
    expect(decoded).not.toBeNull();
    expect(decoded?.credentialId).toBe(credentialId);
    expect(decoded?.txId).toBe(txId);
    expect(decoded?.disclosed.specialty).toBe("Emergency Medicine");
    expect(decoded?.disclosed.deaSchedule).toBe("SCHEDULE_II_V");
    expect(decoded?.disclosed.cmeThresholdSatisfied).toBe(true);
    expect(decoded?.disclosed.cleanRecordAttestation).toBeUndefined();
  });
});
