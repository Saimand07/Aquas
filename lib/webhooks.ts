import { toHex } from "./midnight-browser";

export type WebhookEventType =
  | "license.verified"
  | "license.revoked"
  | "license.renewed"
  | "license.expiring_soon"
  | "registry.board_added";

export interface WebhookEvent<T = Record<string, unknown>> {
  id: string;
  type: WebhookEventType;
  createdAt: number;
  data: T;
  network: "midnight-preview" | "midnight-preprod" | "midnight-mainnet";
}

export interface WebhookSubscription {
  id: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  createdAt: number;
  active: boolean;
  institutionName: string;
}

/**
 * Computes HMAC-SHA256 signature for webhook payload verification.
 */
export async function signWebhookPayload(
  payloadString: string,
  secret: string,
  timestamp: number,
): Promise<string> {
  const encoder = new TextEncoder();
  const signaturePayload = `${timestamp}.${payloadString}`;
  
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signaturePayload));
  const hexSig = toHex(new Uint8Array(signature));
  return `t=${timestamp},v1=${hexSig}`;
}

/**
 * Verifies an incoming webhook header against the raw body and secret.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  try {
    const parts = signatureHeader.split(",");
    const tPart = parts.find((p) => p.startsWith("t="));
    const v1Part = parts.find((p) => p.startsWith("v1="));

    if (!tPart || !v1Part) return false;

    const timestamp = Number(tPart.slice(2));
    const receivedSig = v1Part.slice(3);

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) {
      return false; // Replay attack protection
    }

    const expectedHeader = await signWebhookPayload(rawBody, secret, timestamp);
    const expectedSig = expectedHeader.split(",v1=")[1];

    return receivedSig.toLowerCase() === expectedSig.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Constructs a standardized webhook event payload.
 */
export function createWebhookEvent<T = Record<string, unknown>>(
  type: WebhookEventType,
  data: T,
): WebhookEvent<T> {
  return {
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    createdAt: Math.floor(Date.now() / 1000),
    data,
    network: "midnight-preview",
  };
}

/**
 * Dispatches an event payload to a webhook URL with retries.
 */
export async function dispatchWebhook(
  subscription: WebhookSubscription,
  event: WebhookEvent,
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const payloadString = JSON.stringify(event);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await signWebhookPayload(payloadString, subscription.secret, timestamp);

    const response = await fetch(subscription.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Aquas-Signature": signature,
        "User-Agent": "Aquas-EHR-Webhook-Gateway/1.0",
      },
      body: payloadString,
    });

    return {
      success: response.ok,
      status: response.status,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Webhook network dispatch failed",
    };
  }
}
