import {
  evaluateIMLCReciprocity,
  generateIMLCReciprocityProof,
  verifyIMLCReciprocityProof,
  isIMLCMember,
} from "../../../../../lib/imlc-federation";
import { mapToFhirVerificationResult } from "../../../../../lib/ehr-adapter";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const credentialId = searchParams.get("credentialId")?.trim() || searchParams.get("id")?.trim();
    const homeState = (searchParams.get("homeState") || "CO").toUpperCase().trim();
    const targetState = (searchParams.get("targetState") || "TX").toUpperCase().trim();

    if (!credentialId) {
      return Response.json(
        { error: "Missing required parameter 'credentialId'" },
        { status: 400 },
      );
    }

    const cleanId = credentialId.replace(/^0x/i, "").toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(cleanId)) {
      return Response.json(
        { error: "Invalid credentialId format. Expected 64 hexadecimal characters." },
        { status: 400 },
      );
    }

    const reciprocity = evaluateIMLCReciprocity(homeState, targetState);

    const fhir = mapToFhirVerificationResult(
      cleanId,
      {
        exists: true,
        valid: reciprocity.eligible,
        revoked: false,
        issuedAt: Math.floor(Date.now() / 1000) - 86400 * 30,
        expiresAt: Math.floor(Date.now() / 1000) + 86400 * 335,
        issuer: "d72f60d3f297dc84078e19677b60e88759f9982a3ea3dbf87a387814cda034ad",
      },
      null,
      new Date(),
      reciprocity,
    );

    return Response.json({
      success: true,
      credentialId: cleanId,
      homeState,
      targetState,
      eligible: reciprocity.eligible,
      reciprocityStatus: reciprocity.reciprocityStatus,
      reason: reciprocity.reason,
      expeditedLoqValid: reciprocity.expeditedLoqValid,
      coveredJurisdictionsCount: reciprocity.coveredJurisdictions.length,
      coveredJurisdictions: reciprocity.coveredJurisdictions,
      timestamp: new Date().toISOString(),
      fhir,
    });
  } catch (error: unknown) {
    return Response.json(
      { error: (error as Error).message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const credentialId = String(body.credentialId || "").trim().replace(/^0x/i, "").toLowerCase();
    const homeState = String(body.homeState || "CO").toUpperCase().trim();
    const targetState = String(body.targetState || "TX").toUpperCase().trim();
    const challenge = String(body.challenge || "").trim();

    if (!credentialId || !/^[0-9a-f]{64}$/.test(credentialId)) {
      return Response.json(
        { error: "Invalid or missing 'credentialId'. Expected 64 hex characters." },
        { status: 400 },
      );
    }

    const reciprocity = evaluateIMLCReciprocity(homeState, targetState);

    let proof = null;
    let verification = null;

    if (body.doctorSecretHex) {
      const challengeHex = challenge || "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";
      proof = await generateIMLCReciprocityProof(
        credentialId,
        homeState,
        targetState,
        challengeHex,
        body.doctorSecretHex,
      );
      verification = await verifyIMLCReciprocityProof(proof);
    }

    return Response.json({
      success: true,
      credentialId,
      homeState,
      targetState,
      eligible: reciprocity.eligible,
      reciprocityStatus: reciprocity.reciprocityStatus,
      reason: reciprocity.reason,
      coveredJurisdictionsCount: reciprocity.coveredJurisdictions.length,
      proof,
      verification,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return Response.json(
      { error: (error as Error).message || "Invalid JSON request" },
      { status: 500 },
    );
  }
}
