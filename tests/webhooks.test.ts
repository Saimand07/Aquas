import { describe, expect, it } from "vitest";
import {
  signWebhookPayload,
  verifyWebhookSignature,
  createWebhookEvent,
} from "../lib/webhooks";

describe("Outbound Webhooks Gateway & HMAC Security", () => {
  const secret = "whsec_super_secret_signing_key_2026";
  const rawBody = JSON.stringify({
    event: "license.revoked",
    credentialId: "e0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70",
    reason: "Board disciplinary order #2026-44",
  });

  it("signs webhook payloads with verifiable HMAC-SHA256 headers", async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signatureHeader = await signWebhookPayload(rawBody, secret, timestamp);

    expect(signatureHeader).toContain(`t=${timestamp}`);
    expect(signatureHeader).toContain(",v1=");

    const isValid = await verifyWebhookSignature(rawBody, signatureHeader, secret);
    expect(isValid).toBe(true);
  });

  it("rejects tampered webhook payloads", async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signatureHeader = await signWebhookPayload(rawBody, secret, timestamp);

    const tamperedBody = JSON.stringify({
      event: "license.verified", // Tampered event
      credentialId: "e0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70",
    });

    const isValid = await verifyWebhookSignature(tamperedBody, signatureHeader, secret);
    expect(isValid).toBe(false);
  });

  it("rejects expired or replayed webhook requests", async () => {
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
    const signatureHeader = await signWebhookPayload(rawBody, secret, expiredTimestamp);

    const isValid = await verifyWebhookSignature(rawBody, signatureHeader, secret, 300); // 5 min tolerance
    expect(isValid).toBe(false);
  });

  it("creates structured webhook event payloads", () => {
    const evt = createWebhookEvent("license.renewed", {
      credentialId: "e0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70",
      expiresAt: 1800000000,
    });

    expect(evt.id).toMatch(/^evt_/);
    expect(evt.type).toBe("license.renewed");
    expect(evt.network).toBe("midnight-preview");
    expect(evt.data.expiresAt).toBe(1800000000);
  });
});
