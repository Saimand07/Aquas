import { NextRequest, NextResponse } from "next/server";
import { readLicenseOnChain } from "@/lib/midnight-read";
import { extractCredentialFromEhrRequest, mapToFhirVerificationResult } from "@/lib/ehr-adapter";
import { decodeProofUri } from "@/lib/selective-disclosure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ?? "";
const EXPECTED_API_KEY = process.env.AQUAS_EHR_API_KEY?.trim() ?? "";

function trustedMidnightUrl(value: unknown, protocols: string[]): string {
  if (typeof value !== "string") throw new Error("Indexer endpoint URL missing.");
  const url = new URL(value);
  const trustedHost =
    url.hostname === "localhost" ||
    url.hostname.endsWith(".midnight.network") ||
    url.hostname.endsWith(".1am.xyz");
  if (!trustedHost || !protocols.includes(url.protocol)) {
    throw new Error("Untrusted indexer endpoint host or protocol.");
  }
  return url.toString();
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authenticate Request
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (EXPECTED_API_KEY && bearerToken !== EXPECTED_API_KEY) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Invalid or missing Bearer API token for Hospital EHR Gateway.",
        },
        { status: 401 },
      );
    }

    // 2. Parse Incoming Payload
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const isFhirInput = body.resourceType === "Practitioner";
    const requestedFormat = (body.format as string) || (isFhirInput ? "fhir" : "json");

    let rawCredential = (body.credentialId as string) || "";
    let disclosed = null;

    if (rawCredential.startsWith("aquas://verify/")) {
      const decoded = decodeProofUri(rawCredential);
      if (decoded) {
        rawCredential = decoded.credentialId;
        disclosed = decoded.disclosed;
      }
    }

    const credentialId = extractCredentialFromEhrRequest({
      credentialId: rawCredential,
      fhirPractitioner: isFhirInput ? (body as unknown as import("@/lib/ehr-adapter").FhirPractitioner) : undefined,
    });

    if (!credentialId) {
      return NextResponse.json(
        {
          error: "Unprocessable Entity",
          message: "Could not extract valid 64-character hexadecimal credential ID from EHR payload.",
        },
        { status: 422 },
      );
    }

    if (!CONTRACT_ADDRESS) {
      return NextResponse.json(
        {
          error: "Configuration Error",
          message: "NEXT_PUBLIC_CONTRACT_ADDRESS is not configured on this server.",
        },
        { status: 500 },
      );
    }

    // 3. Query Midnight On-Chain Ledger
    const rawIndexerUri = (body.indexerUri as string) || process.env.NEXT_PUBLIC_INDEXER_URI || "https://api-preprod.1am.xyz/api/v4/graphql";
    const rawIndexerWsUri = (body.indexerWsUri as string) || process.env.NEXT_PUBLIC_INDEXER_WS_URI || "wss://api-preprod.1am.xyz/api/v4/graphql/ws";

    const indexerUri = trustedMidnightUrl(rawIndexerUri, ["https:", "http:"]);
    const indexerWsUri = trustedMidnightUrl(rawIndexerWsUri, ["wss:", "ws:"]);

    const license = await readLicenseOnChain(CONTRACT_ADDRESS, indexerUri, indexerWsUri, credentialId);
    const latencyMs = Date.now() - startTime;

    const fhirResult = mapToFhirVerificationResult(credentialId, license, disclosed);

    // 4. Return Output in Requested Format
    if (requestedFormat === "fhir") {
      return NextResponse.json(fhirResult, {
        status: 200,
        headers: {
          "Content-Type": "application/fhir+json",
          "X-Aquas-Latency-Ms": String(latencyMs),
          "X-Aquas-Settlement-Layer": "Midnight-Preview",
        },
      });
    }

    return NextResponse.json(
      {
        verified: license?.valid === true,
        status: license?.valid
          ? "ACTIVE_VALID"
          : license?.revoked
          ? "REVOKED"
          : license?.exists
          ? "EXPIRED"
          : "NOT_FOUND",
        credentialId,
        issuerBoard: license?.issuer ?? null,
        issuedAt: license?.issuedAt ?? null,
        expiresAt: license?.expiresAt ?? null,
        disclosedAttributes: disclosed,
        latencyMs,
        fhirVerificationResult: fhirResult,
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Aquas-Latency-Ms": String(latencyMs),
          "X-Aquas-Settlement-Layer": "Midnight-Preview",
        },
      },
    );
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: err instanceof Error ? err.message : "EHR verification query failed",
        latencyMs,
      },
      { status: 500 },
    );
  }
}
