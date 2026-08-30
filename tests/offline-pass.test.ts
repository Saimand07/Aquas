import { describe, expect, it } from "vitest";
import {
  generateOfflinePhysicianPass,
  serializeOfflinePassForQr,
  deserializeOfflinePassFromQr,
  verifyOfflinePass,
  computeTimeStepNonce,
} from "../lib/offline-pass";

describe("Mobile Physician Pass & Offline Challenge Protocol", () => {
  const credentialId = "e0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70";
  const doctorSecretHex = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";
  const boardKeyHex = "d72f60d3f297dc84078e19677b60e88759f9982a3ea3dbf87a387814cda034ad";

  it("computes 30-second rotating TOTP time-step nonces", async () => {
    const t1 = 1700000010;
    const t2 = 1700000020; // Same 30s window (30 * 56666667 = 1700000010)
    const t3 = 1700000045; // Next 30s window

    const nonce1 = await computeTimeStepNonce(doctorSecretHex, t1);
    const nonce2 = await computeTimeStepNonce(doctorSecretHex, t2);
    const nonce3 = await computeTimeStepNonce(doctorSecretHex, t3);

    expect(nonce1).toBe(nonce2);
    expect(nonce1).not.toBe(nonce3);
    expect(nonce1.length).toBe(16);
  });

  it("generates and verifies a signed offline physician pass", async () => {
    const now = Math.floor(Date.now() / 1000);
    const pass = await generateOfflinePhysicianPass(
      credentialId,
      "Dr. Sarah Jenkins MD",
      "NY-294817-MD",
      "1948201938",
      "New York State Medical Board",
      boardKeyHex,
      "Interventional Cardiology",
      doctorSecretHex,
      {
        deaSchedule: "SCHEDULE_II_V",
        cmeVerified: true,
        cleanRecord: true,
        expiresAt: now + 86400 * 180,
      },
    );

    expect(pass.doctorName).toBe("Dr. Sarah Jenkins MD");
    expect(pass.signature).toMatch(/^[0-9a-f]{64}$/);

    const verification = await verifyOfflinePass(pass, doctorSecretHex, now);
    expect(verification.valid).toBe(true);
    expect(verification.status).toBe("VALID_OFFLINE");
  });

  it("serializes and deserializes offline pass to and from QR strings losslessly", async () => {
    const pass = await generateOfflinePhysicianPass(
      credentialId,
      "Dr. Marcus Vance MD",
      "CA-987654-MD",
      "1029384756",
      "Medical Board of California",
      boardKeyHex,
      "Pediatric Surgery",
      doctorSecretHex,
    );

    const qrString = serializeOfflinePassForQr(pass);
    expect(qrString.startsWith("aquas:pass:v1:")).toBe(true);

    const deserialized = deserializeOfflinePassFromQr(qrString);
    expect(deserialized).not.toBeNull();
    expect(deserialized?.credentialId).toBe(credentialId);
    expect(deserialized?.doctorName).toBe("Dr. Marcus Vance MD");
    expect(deserialized?.signature).toBe(pass.signature);
  });

  it("detects tampered pass data and rejects with TAMPERED_SIGNATURE", async () => {
    const now = Math.floor(Date.now() / 1000);
    const pass = await generateOfflinePhysicianPass(
      credentialId,
      "Dr. Original Doctor MD",
      "FL-123456",
      "1948201938",
      "Florida Board of Medicine",
      boardKeyHex,
      "Internal Medicine",
      doctorSecretHex,
    );

    // Maliciously alter doctor name
    const tamperedPass = {
      ...pass,
      doctorName: "Dr. Malicious Impostor MD",
    };

    const verification = await verifyOfflinePass(tamperedPass, doctorSecretHex, now);
    expect(verification.valid).toBe(false);
    expect(verification.status).toBe("TAMPERED_SIGNATURE");
  });

  it("rejects expired physician passes with EXPIRED status", async () => {
    const now = Math.floor(Date.now() / 1000);
    const pass = await generateOfflinePhysicianPass(
      credentialId,
      "Dr. Sarah Jenkins MD",
      "NY-294817-MD",
      "1948201938",
      "New York State Medical Board",
      boardKeyHex,
      "Cardiology",
      doctorSecretHex,
      {
        expiresAt: now - 86400 * 5, // Expired 5 days ago
      },
    );

    const verification = await verifyOfflinePass(pass, doctorSecretHex, now);
    expect(verification.valid).toBe(false);
    expect(verification.status).toBe("EXPIRED");
  });
});
