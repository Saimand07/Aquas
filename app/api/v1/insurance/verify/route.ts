import {
  MALPRACTICE_CARRIERS,
  STANDARD_UNDERWRITING_REQUIREMENTS,
  verifyUnderwritingClearanceProof,
  mapToFhirCoverage,
  sha256Hex,
  type UnderwritingClearanceProof,
} from "../../../../../lib/malpractice-insurance";

// In-memory consumed challenge nullifiers registry for demonstration server
const consumedInsuranceNullifiersRegistry = new Set<string>();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const carrierIdParam = searchParams.get("carrierId")?.trim();

    if (carrierIdParam) {
      const carrier = MALPRACTICE_CARRIERS[carrierIdParam];
      if (!carrier) {
        return Response.json(
          {
            error: `Carrier ID '${carrierIdParam}' not found in accredited underwriter catalog.`,
            availableCarriers: Object.keys(MALPRACTICE_CARRIERS),
          },
          { status: 404 },
        );
      }

      return Response.json({
        success: true,
        carrierId: carrier.carrierId,
        name: carrier.name,
        amBestRating: carrier.amBestRating,
        naicCode: carrier.naicCode,
        headquarters: carrier.headquarters,
        publicKeyHex: carrier.publicKeyHex,
        standardRequirements: STANDARD_UNDERWRITING_REQUIREMENTS,
        timestamp: new Date().toISOString(),
      });
    }

    // Global Malpractice Underwriter Catalog & Standards
    return Response.json({
      success: true,
      service: "Aquas Zero-Knowledge Malpractice Liability & Clean-Claims Underwriting Engine",
      standards: "JCAHO / CMS Hospital Credentialing Safe Harbor (Midnight Blockchain)",
      accreditedCarriers: Object.values(MALPRACTICE_CARRIERS).map((c) => ({
        carrierId: c.carrierId,
        name: c.name,
        amBestRating: c.amBestRating,
        naicCode: c.naicCode,
        headquarters: c.headquarters,
      })),
      standardRequirements: STANDARD_UNDERWRITING_REQUIREMENTS,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return Response.json(
      { error: (error as Error).message || "Failed to query malpractice underwriting catalog." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const proof: UnderwritingClearanceProof = body.proof;
    const hospitalId = body.hospitalId?.trim() || "HOSP-RISK-MANAGEMENT-MAIN";
    const doctorNpi = body.doctorNpi?.trim() || "1948201938";

    if (!proof || !proof.challengeNullifier || !proof.policyNumber || !proof.carrierId) {
      return Response.json(
        {
          error:
            "Invalid payload. Expected 'proof' object with challengeNullifier, policyNumber, and carrierId.",
        },
        { status: 400 },
      );
    }

    // Combine local registry with passed nullifiers
    const usedSet = new Set<string>(consumedInsuranceNullifiersRegistry);
    if (Array.isArray(body.consumedNullifiers)) {
      body.consumedNullifiers.forEach((n: string) => usedSet.add(String(n).toLowerCase()));
    }

    const verification = await verifyUnderwritingClearanceProof(proof, usedSet);

    if (!verification.valid) {
      return Response.json(
        {
          success: false,
          valid: false,
          underwritingStatus: "CLEARANCE_DENIED",
          reason: verification.reason,
          timestamp: new Date().toISOString(),
        },
        { status: 422 },
      );
    }

    // Mark nullifier consumed in server registry
    consumedInsuranceNullifiersRegistry.add(proof.challengeNullifier.toLowerCase());

    const fhirCoverage = mapToFhirCoverage(proof, doctorNpi);
    const approvalSeed = `insurance:hospital:approval:v1:${hospitalId}:${proof.policyNumber}:${proof.challengeNullifier}:${Date.now()}`;
    const hospitalRiskSeal = await sha256Hex(approvalSeed);

    return Response.json({
      success: true,
      valid: true,
      underwritingStatus: "CLEARANCE_GRANTED",
      proofId: proof.proofId,
      policyNumber: proof.policyNumber,
      carrierId: proof.carrierId,
      carrierName: proof.carrierName,
      carrierAmBestRating: proof.carrierAmBestRating,
      perClaimLimitProven: proof.perClaimLimitProven,
      aggregateLimitProven: proof.aggregateLimitProven,
      tailCoverageActive: proof.tailCoverageActive,
      cleanClaimsSatisfied: proof.cleanClaimsSatisfied,
      frivolousClaimsShielded: proof.frivolousClaimsShielded,
      totalPaidIndemnityInPeriodUsd: proof.totalPaidIndemnityInPeriodUsd,
      challengeNullifier: proof.challengeNullifier,
      nullifierConsumed: true,
      hospitalId,
      hospitalRiskSeal,
      fhirCoverage,
      complianceNote:
        "Physician malpractice liability insurance and clean-claims history mathematically proven in zero knowledge under JCAHO / CMS credentialing standards.",
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return Response.json(
      { error: (error as Error).message || "Failed to verify malpractice underwriting clearance." },
      { status: 500 },
    );
  }
}
