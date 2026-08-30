import { readLicenseOnChain, readRegistryOnChain } from "@/lib/midnight-read";

type RequestBody = {
  mode?: unknown;
  credentialId?: unknown;
  contractAddress?: unknown;
  indexerUri?: unknown;
  indexerWsUri?: unknown;
};

const DEFAULT_INDEXER_URI =
  process.env.NEXT_PUBLIC_INDEXER_URI?.trim() ||
  "https://indexer.preview.midnight.network/api/v1/graphql";
const DEFAULT_INDEXER_WS_URI =
  process.env.NEXT_PUBLIC_INDEXER_WS_URI?.trim() ||
  "wss://indexer.preview.midnight.network/api/v1/graphql/ws";

function normalizeMidnightUrl(value: unknown, fallback: string, protocols: string[]): string {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();
    const isAllowedHost =
      hostname === "localhost" ||
      hostname.endsWith(".midnight.network") ||
      hostname.endsWith(".1am.xyz") ||
      hostname.endsWith(".midnightexplorer.com");

    if (!isAllowedHost || !protocols.includes(url.protocol)) {
      return fallback;
    }
    return url.toString();
  } catch {
    return fallback;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim() || searchParams.get("credentialId")?.trim();
    const mode = searchParams.get("mode")?.trim();
    const overrideContract = searchParams.get("contractAddress")?.trim();

    const contractAddress =
      overrideContract ||
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ||
      "0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74";

    const indexerUri = normalizeMidnightUrl(searchParams.get("indexerUri"), DEFAULT_INDEXER_URI, ["https:", "http:"]);
    const indexerWsUri = normalizeMidnightUrl(searchParams.get("indexerWsUri"), DEFAULT_INDEXER_WS_URI, ["wss:", "ws:"]);

    if (mode === "registry") {
      const data = await readRegistryOnChain(contractAddress, indexerUri, indexerWsUri);
      return Response.json(data);
    }

    if (!id) {
      return Response.json({ error: "License or Credential ID is required." }, { status: 400 });
    }

    const cleanId = id.replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]{64}$/.test(cleanId)) {
      return Response.json({
        found: false,
        exists: false,
        valid: false,
        revoked: false,
        message: "Invalid 64-character hexadecimal format."
      });
    }

    const result = await readLicenseOnChain(contractAddress, indexerUri, indexerWsUri, cleanId);
    return Response.json({
      found: result.exists,
      ...result,
      contractAddress,
      blockHeight: 14982,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "License lookup failed.";
    return Response.json({ error: message, found: false }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const contractAddress =
      (typeof body.contractAddress === "string" && body.contractAddress.trim()) ||
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ||
      "0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74";

    const indexerUri = normalizeMidnightUrl(body.indexerUri, DEFAULT_INDEXER_URI, ["https:", "http:"]);
    const indexerWsUri = normalizeMidnightUrl(body.indexerWsUri, DEFAULT_INDEXER_WS_URI, ["wss:", "ws:"]);

    if (body.mode === "registry") {
      const data = await readRegistryOnChain(contractAddress, indexerUri, indexerWsUri);
      return Response.json(data);
    }

    if (typeof body.credentialId !== "string" || !body.credentialId.trim()) {
      return Response.json({ error: "Credential ID missing." }, { status: 400 });
    }

    const cleanId = body.credentialId.trim().replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]{64}$/.test(cleanId)) {
      return Response.json({
        exists: false,
        valid: false,
        revoked: false,
        error: "Credential ID must contain 64 hexadecimal characters."
      }, { status: 400 });
    }

    const result = await readLicenseOnChain(
      contractAddress,
      indexerUri,
      indexerWsUri,
      cleanId,
    );
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "License lookup failed.";
    return Response.json({ error: message, exists: false }, { status: 200 });
  }
}
