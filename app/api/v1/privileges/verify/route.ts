import {
  CPT_SURGICAL_CATALOG,
  ACCREDITED_SURGICAL_FACILITIES,
  verifySurgicalPrivilegeProof,
  mapToFhirClinicalImpression,
  sha256Hex,
  type SurgicalPrivilegeProof,
} from "../../../../../lib/surgical-privileges";

// In-memory consumed challenge nullifiers registry for demonstration server
const consumedNullifiersRegistry = new Set<string>();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cptParam = searchParams.get("cpt")?.trim();

    if (cptParam) {
      const cptConfig = CPT_SURGICAL_CATALOG[cptParam];
      if (!cptConfig) {
        return Response.json(
          {
            error: `CPT Code '${cptParam}' not found in surgical catalog.`,
            availableCodes: Object.keys(CPT_SURGICAL_CATALOG),
          },
          { status: 404 },
        );
      }

      return Response.json({
        success: true,
        cptCode: cptConfig.cptCode,
        procedureName: cptConfig.procedureName,
        specialty: cptConfig.specialty,
        category: cptConfig.category,
        min12MonthVolume: cptConfig.min12MonthVolume,
        maxAdverseRatePercent: cptConfig.maxAdverseRatePercent,
        requiresJcahoAccreditedFacility: cptConfig.requiresJcahoAccreditedFacility,
        description: cptConfig.description,
        accreditedFacilities: Object.values(ACCREDITED_SURGICAL_FACILITIES).map((f) => ({
          hospitalId: f.hospitalId,
          name: f.name,
          jcahoNumber: f.jcahoNumber,
        })),
        timestamp: new Date().toISOString(),
      });
    }

    // Global Surgical Privileging Catalog & Standards
    return Response.json({
      success: true,
      service: "Aquas Confidential Surgical Privileging & Case-Volume Attestation Engine",
      standards: "HIPAA-Safe Zero-Knowledge Clinical Competency (Midnight Blockchain)",
      cptCatalog: Object.values(CPT_SURGICAL_CATALOG).map((cpt) => ({
        cptCode: cpt.cptCode,
        procedureName: cpt.procedureName,
        specialty: cpt.specialty,
        min12MonthVolume: cpt.min12MonthVolume,
        maxAdverseRatePercent: cpt.maxAdverseRatePercent,
      })),
      accreditedFacilities: Object.values(ACCREDITED_SURGICAL_FACILITIES).map((f) => ({
        hospitalId: f.hospitalId,
        name: f.name,
        jcahoNumber: f.jcahoNumber,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return Response.json(
      { error: (error as Error).message || "Failed to query surgical privileging standards." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const proof: SurgicalPrivilegeProof = body.proof;
    const committeeId = body.committeeId?.trim() || "HOSP-CREDENTIALS-COMMITTEE-MAIN";

    if (!proof || !proof.challengeNullifier || !proof.cptCode) {
      return Response.json(
        {
          error: "Invalid payload. Expected 'proof' object with challengeNullifier and cptCode.",
        },
        { status: 400 },
      );
    }

    // Combine local registry with passed nullifiers
    const usedSet = new Set<string>(consumedNullifiersRegistry);
    if (Array.isArray(body.consumedNullifiers)) {
      body.consumedNullifiers.forEach((n: string) => usedSet.add(String(n).toLowerCase()));
    }

    const verification = await verifySurgicalPrivilegeProof(proof, usedSet);

    if (!verification.valid) {
      return Response.json(
        {
          success: false,
          valid: false,
          privilegeStatus: "PRIVILEGE_DENIED",
          reason: verification.reason,
          timestamp: new Date().toISOString(),
        },
        { status: 422 },
      );
    }

    // Mark nullifier consumed in server registry
    consumedNullifiersRegistry.add(proof.challengeNullifier.toLowerCase());

    const fhirImpression = mapToFhirClinicalImpression(proof);
    const committeeApprovalSeed = `committee:approval:v1:${committeeId}:${proof.cptCode}:${proof.challengeNullifier}:${Date.now()}`;
    const committeeApprovalSeal = await sha256Hex(committeeApprovalSeed);

    return Response.json({
      success: true,
      valid: true,
      privilegeStatus: "PRIVILEGE_GRANTED",
      cptCode: proof.cptCode,
      procedureName: proof.procedureName,
      specialty: proof.specialty,
      totalProceduresAttested: proof.totalProceduresAttested,
      adverseRateProvenPercent: proof.adverseRateProvenPercent,
      challengeNullifier: proof.challengeNullifier,
      nullifierConsumed: true,
      committeeId,
      committeeApprovalSeal,
      fhirClinicalImpression: fhirImpression,
      complianceNote:
        "Surgeon clinical competence mathematically proven in zero knowledge under HIPAA Safe Harbor protocols.",
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return Response.json(
      { error: (error as Error).message || "Failed to verify surgical privilege proof." },
      { status: 500 },
    );
  }
}
