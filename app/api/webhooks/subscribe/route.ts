import { NextRequest, NextResponse } from "next/server";
import type { WebhookSubscription, WebhookEventType } from "@/lib/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory / process store for demo subscriptions
const subscriptions: WebhookSubscription[] = [
  {
    id: "sub_demo_hospital_epic_01",
    institutionName: "Saint Jude Memorial Healthcare",
    url: "https://epic-gateway.stjudehealth.org/api/webhooks/credentials",
    secret: "whsec_stjude_demo_secret_2026",
    events: ["license.revoked", "license.renewed", "license.expiring_soon"],
    createdAt: Math.floor(Date.now() / 1000) - 86400 * 5,
    active: true,
  },
];

export async function GET() {
  return NextResponse.json({
    subscriptions: subscriptions.map((s) => ({
      id: s.id,
      institutionName: s.institutionName,
      url: s.url,
      events: s.events,
      createdAt: s.createdAt,
      active: s.active,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const url = String(body.url || "").trim();
    const institutionName = String(body.institutionName || "Hospital Healthcare Network").trim();
    const events = (body.events as WebhookEventType[]) || [
      "license.verified",
      "license.revoked",
      "license.renewed",
    ];

    if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
      return NextResponse.json(
        { error: "Invalid URL", message: "A valid HTTP/HTTPS webhook target URL is required." },
        { status: 400 },
      );
    }

    const secret = `whsec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    const newSub: WebhookSubscription = {
      id: `sub_${Date.now().toString(36)}`,
      institutionName,
      url,
      secret,
      events,
      createdAt: Math.floor(Date.now() / 1000),
      active: true,
    };

    subscriptions.push(newSub);

    return NextResponse.json(
      {
        message: "Webhook subscription registered successfully.",
        subscription: {
          id: newSub.id,
          institutionName: newSub.institutionName,
          url: newSub.url,
          events: newSub.events,
          secret: newSub.secret, // Disclosed once upon creation
          createdAt: newSub.createdAt,
          active: newSub.active,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Subscription Error", message: err instanceof Error ? err.message : "Failed to register" },
      { status: 500 },
    );
  }
}
