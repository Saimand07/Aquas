/**
 * @file webhook-dispatcher.ts
 * @description Enterprise Webhook Dispatch Pipeline with Automated Exponential Backoff Retries,
 * Dead-Letter Recording, and HMAC-SHA256 Signatures for Aquas Sentinel Lockouts.
 */

import {
  signWebhookPayload,
  type WebhookEvent,
  type WebhookSubscription,
} from "./webhooks";

export interface WebhookAttempt {
  attemptNumber: number;
  timestamp: number;
  latencyMs: number;
  success: boolean;
  statusCode?: number;
  error?: string;
}

export interface WebhookDispatchResult {
  eventId: string;
  subscriptionId: string;
  targetUrl: string;
  success: boolean;
  attempts: WebhookAttempt[];
  totalAttempts: number;
  deliveredAt?: number;
  deadLettered: boolean;
  signature: string;
}

export interface WebhookDispatcherOptions {
  maxRetries?: number;
  initialBackoffMs?: number;
  backoffMultiplier?: number;
  jitterMs?: number;
  timeoutMs?: number;
}

const DEFAULT_OPTIONS: Required<WebhookDispatcherOptions> = {
  maxRetries: 3,
  initialBackoffMs: 50,
  backoffMultiplier: 2,
  jitterMs: 10,
  timeoutMs: 5000,
};

// Global in-memory dead-letter queue for audit inspection
const deadLetterQueue: WebhookDispatchResult[] = [];

/**
 * Dispatches a webhook event with an automated exponential backoff retry pipeline.
 */
export async function dispatchWebhookWithRetry(
  subscription: WebhookSubscription,
  event: WebhookEvent,
  customFetch: typeof fetch = fetch,
  opts: WebhookDispatcherOptions = {},
): Promise<WebhookDispatchResult> {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const payloadString = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await signWebhookPayload(payloadString, subscription.secret, timestamp);

  const attempts: WebhookAttempt[] = [];
  let isSuccess = false;
  let deliveredAt: number | undefined;

  for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
    const startTime = performance.now();
    try {
      const response = await customFetch(subscription.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Aquas-Signature": signature,
          "X-Aquas-Event-Type": event.type,
          "X-Aquas-Event-ID": event.id,
          "X-Aquas-Delivery-Attempt": String(attempt),
          "User-Agent": "Aquas-Continuous-Sentinel-Dispatcher/1.0",
        },
        body: payloadString,
      });

      const latency = Math.round(performance.now() - startTime);

      if (response.ok) {
        attempts.push({
          attemptNumber: attempt,
          timestamp: Math.floor(Date.now() / 1000),
          latencyMs: latency,
          success: true,
          statusCode: response.status,
        });
        isSuccess = true;
        deliveredAt = Math.floor(Date.now() / 1000);
        break;
      } else {
        attempts.push({
          attemptNumber: attempt,
          timestamp: Math.floor(Date.now() / 1000),
          latencyMs: latency,
          success: false,
          statusCode: response.status,
          error: `HTTP ${response.status} ${response.statusText || "Error"}`,
        });

        // Non-retriable client errors (400, 401, 403, 404, etc. except 429)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          break;
        }
      }
    } catch (err: unknown) {
      const latency = Math.round(performance.now() - startTime);
      attempts.push({
        attemptNumber: attempt,
        timestamp: Math.floor(Date.now() / 1000),
        latencyMs: latency,
        success: false,
        error: err instanceof Error ? err.message : "Network error",
      });
    }

    // Exponential backoff with random jitter if more retries remain
    if (attempt < options.maxRetries) {
      const backoff =
        options.initialBackoffMs * Math.pow(options.backoffMultiplier, attempt - 1) +
        Math.floor(Math.random() * options.jitterMs);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  const result: WebhookDispatchResult = {
    eventId: event.id,
    subscriptionId: subscription.id,
    targetUrl: subscription.url,
    success: isSuccess,
    attempts,
    totalAttempts: attempts.length,
    deliveredAt,
    deadLettered: !isSuccess,
    signature,
  };

  if (!isSuccess) {
    deadLetterQueue.push(result);
  }

  return result;
}

/**
 * Returns a copy of the in-memory dead-letter queue.
 */
export function getDeadLetterQueue(): WebhookDispatchResult[] {
  return [...deadLetterQueue];
}

/**
 * Clears the in-memory dead-letter queue.
 */
export function clearDeadLetterQueue(): void {
  deadLetterQueue.length = 0;
}
