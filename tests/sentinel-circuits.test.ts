import { describe, expect, it } from "vitest";
import {
  initializeAccumulator,
  insertSanctionRecord,
  generateMerkleProof,
  verifyMerkleProof,
  type AttestedSanctionRecord,
} from "../lib/sanction-sentinel";
import {
  enrollOracleFeederOnChain,
  publishSanctionRootOnChain,
  publishSanctionRootByOwnerOnChain,
  removeOracleFeederOnChain,
} from "../lib/doctor-license-client";

describe("Midnight Compact Sanction Sentinel Circuits & Oracle Feeder State Machine", () => {

  describe("Continuous Disciplinary Root Updates & Merkle Inclusion Verification", () => {
    it("computes new Merkle root upon disciplinary sanction filing and validates proof", async () => {
      const initialAccumulator = await initializeAccumulator();
      const initialRoot = initialAccumulator.accumulatorRoot;

      const incident: AttestedSanctionRecord = {
        recordId: "REC-SENTINEL-ORACLE-01",
        credentialId: "a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890",
        prescriberNpi: "1992881100",
        clinicianName: "Dr. Harold Shipman, MD",
        sanctionAuthority: "NPDB",
        category: "PATIENT_ABUSE_NEGLECT",
        severity: "IMMEDIATE_LOCKOUT",
        exclusionStatute: "42 U.S.C. § 1320a-7(a)(1)",
        description: "Emergency revocation following patient harm investigation.",
        actionDate: Math.floor(Date.now() / 1000),
        oracleFeederSignature: "99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa",
      };

      const { updatedState, proof } = await insertSanctionRecord(initialAccumulator, incident);

      expect(updatedState.accumulatorRoot).not.toBe(initialRoot);
      expect(updatedState.accumulatorRoot).toMatch(/^[0-9a-f]{64}$/);
      expect(proof.root).toBe(updatedState.accumulatorRoot);

      const isValid = await verifyMerkleProof(proof);
      expect(isValid).toBe(true);
    });

    it("verifies that existing non-sanctioned credentials have zero inclusion in the sanction tree", async () => {
      const accumulator = await initializeAccumulator();
      const nonSanctionedLeaf = "ff".repeat(32);

      // Attempting to forge a proof for a non-existent leaf
      const fakeProof = {
        leaf: nonSanctionedLeaf,
        root: accumulator.accumulatorRoot,
        steps: (await generateMerkleProof(accumulator.leaves, 0)).steps,
      };

      const isIncluded = await verifyMerkleProof(fakeProof);
      expect(isIncluded).toBe(false);
    });
  });

  describe("Midnight Compact Client SDK Oracle Feeder Wrappers", () => {
    it("exports properly typed circuit invocation wrappers for oracle feeder management", () => {
      expect(typeof enrollOracleFeederOnChain).toBe("function");
      expect(typeof publishSanctionRootOnChain).toBe("function");
      expect(typeof publishSanctionRootByOwnerOnChain).toBe("function");
      expect(typeof removeOracleFeederOnChain).toBe("function");
    });
  });
});
