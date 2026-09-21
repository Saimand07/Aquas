import { describe, expect, it } from "vitest";
import {
  computeIMLCProofNullifier,
  generateIMLCReciprocityProof,
  verifyIMLCReciprocityProof,
} from "../lib/imlc-federation";
import {
  enrollIMLCBoardOnChain,
  verifyIMLCReciprocityOnChain,
  propagateIMLCRevocationOnChain,
} from "../lib/doctor-license-client";

describe("IMLC Federation Circuits & Cryptographic Reciprocity State Machine", () => {
  const credentialId = "e0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70";
  const doctorSecretHex = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";
  const challengeHex = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";

  describe("IMLC Proof Nullifiers & Anti-Replay Cryptography", () => {
    it("derives deterministic 32-byte hex nullifier for specific credential and challenge", async () => {
      const nullifier1 = await computeIMLCProofNullifier(credentialId, challengeHex, doctorSecretHex);
      const nullifier2 = await computeIMLCProofNullifier(credentialId, challengeHex, doctorSecretHex);

      expect(nullifier1).toBe(nullifier2);
      expect(nullifier1).toMatch(/^[0-9a-f]{64}$/);
    });

    it("derives different nullifiers when challenge changes (anti-correlation across hospitals)", async () => {
      const hospitalAChallenge = "1111111111111111111111111111111111111111111111111111111111111111";
      const hospitalBChallenge = "2222222222222222222222222222222222222222222222222222222222222222";

      const nullifierA = await computeIMLCProofNullifier(credentialId, hospitalAChallenge, doctorSecretHex);
      const nullifierB = await computeIMLCProofNullifier(credentialId, hospitalBChallenge, doctorSecretHex);

      expect(nullifierA).not.toBe(nullifierB);
    });

    it("generates and verifies cross-state reciprocity proof bundle", async () => {
      const proof = await generateIMLCReciprocityProof(
        credentialId,
        "CO",
        "TX",
        challengeHex,
        doctorSecretHex,
      );

      expect(proof.homeState).toBe("CO");
      expect(proof.targetState).toBe("TX");
      expect(proof.targetStateFips).toBe(48); // Texas FIPS
      expect(proof.proofNullifierHex).toMatch(/^[0-9a-f]{64}$/);
      expect(proof.signature).toMatch(/^[0-9a-f]{64}$/);

      const verification = await verifyIMLCReciprocityProof(proof);
      expect(verification.valid).toBe(true);
      expect(verification.reason).toContain("Valid and unrevoked");
    });

    it("rejects replayed reciprocity proofs through consumed nullifier sets", async () => {
      const proof = await generateIMLCReciprocityProof(
        credentialId,
        "CO",
        "WA",
        challengeHex,
        doctorSecretHex,
      );

      const usedNullifiers = new Set<string>();
      const firstCheck = await verifyIMLCReciprocityProof(proof, usedNullifiers);
      expect(firstCheck.valid).toBe(true);

      // Consume nullifier into on-chain state set
      usedNullifiers.add(proof.proofNullifierHex);

      // Second check with consumed nullifier must fail
      const replayCheck = await verifyIMLCReciprocityProof(proof, usedNullifiers);
      expect(replayCheck.valid).toBe(false);
      expect(replayCheck.reason).toContain("Anti-replay protection");
    });

    it("rejects proof if credential has been added to compact sanction set", async () => {
      const proof = await generateIMLCReciprocityProof(
        credentialId,
        "CO",
        "IL",
        challengeHex,
        doctorSecretHex,
      );

      const sanctioned = new Set<string>([credentialId.toLowerCase()]);
      const check = await verifyIMLCReciprocityProof(proof, new Set(), sanctioned);

      expect(check.valid).toBe(false);
      expect(check.reason).toContain("active compact-wide sanction flag");
    });

    it("rejects expired challenge proof timestamp (> 300s)", async () => {
      const now = Math.floor(Date.now() / 1000);
      const proof = await generateIMLCReciprocityProof(
        credentialId,
        "CO",
        "TX",
        challengeHex,
        doctorSecretHex,
        now - 400, // 400 seconds ago
      );

      const check = await verifyIMLCReciprocityProof(proof, new Set(), new Set(), now);
      expect(check.valid).toBe(false);
      expect(check.reason).toContain("timestamp expired");
    });
  });

  describe("Compact Circuit Client SDK Wrappers", () => {
    it("exposes typed circuit invokers for IMLC board enrollment and verification", () => {
      expect(typeof enrollIMLCBoardOnChain).toBe("function");
      expect(typeof verifyIMLCReciprocityOnChain).toBe("function");
      expect(typeof propagateIMLCRevocationOnChain).toBe("function");
    });
  });
});
