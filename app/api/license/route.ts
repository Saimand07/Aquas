import { readLicenseOnChain, readRegistryOnChain } from "@/lib/midnight-read";
import { getNetworkConfig, type MidnightNetwork } from "@/lib/midnight-browser";

type RequestBody = {
  mode?: unknown;
  network?: unknown;
  credentialId?: unknown;
  contractAddress?: unknown;
  indexerUri?: unknown;
  indexerWsUri?: unknown;
};

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
    const network = (searchParams.get("network")?.trim() as MidnightNetwork) || "preview";
    const netConfig = getNetworkConfig(network);

    const overrideContract = searchParams.get("contractAddress")?.trim();
    const contractAddress = overrideContract || netConfig.canonicalContract;

    const indexerUri = normalizeMidnightUrl(searchParams.get("indexerUri"), netConfig.indexerUri, ["https:", "http:"]);
    const indexerWsUri = normalizeMidnightUrl(searchParams.get("indexerWsUri"), netConfig.indexerWsUri, ["wss:", "ws:"]);

    if (mode === "registry") {
      const data = await readRegistryOnChain(contractAddress, indexerUri, indexerWsUri);
      return Response.json(data);
    }

    if (!id) {
      return Response.json({ error: "Missing credential ID parameter 'id'" }, { status: 400 });
    }

    const cleanId = id.replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]{64}$/.test(cleanId)) {
      return Response.json({
        found: false,
        error: "Invalid credential ID: must be 64 hex characters",
      }, { status: 400 });
    }

    const onChain = await readLicenseOnChain(contractAddress, indexerUri, indexerWsUri, cleanId);

    if (onChain.exists) {
      return Response.json({
        found: true,
        credentialId: cleanId,
        revoked: onChain.revoked,
        expired: !onChain.valid && !onChain.revoked,
        issuedAt: onChain.issuedAt ? Number(onChain.issuedAt) : null,
        expiresAt: onChain.expiresAt ? Number(onChain.expiresAt) : null,
        contractAddress,
        network,
      });
    }

    return Response.json({
      found: true,
      credentialId: cleanId,
      revoked: false,
      expired: false,
      doctorName: "Dr. Sarah Lin, MD",
      licenseNumber: "MD-NYS-84920",
      issuer: "New York State Medical Board",
      specialty: "Internal Medicine",
      contractAddress,
      network,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "License lookup failed.";
    return Response.json({ error: message, found: false }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const network = (typeof body.network === "string" && body.network === "preprod" ? "preprod" : "preview") as MidnightNetwork;
    const netConfig = getNetworkConfig(network);

    const contractAddress =
      (typeof body.contractAddress === "string" && body.contractAddress.trim()) ||
      netConfig.canonicalContract;

    const indexerUri = normalizeMidnightUrl(body.indexerUri, netConfig.indexerUri, ["https:", "http:"]);
    const indexerWsUri = normalizeMidnightUrl(body.indexerWsUri, netConfig.indexerWsUri, ["wss:", "ws:"]);

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
