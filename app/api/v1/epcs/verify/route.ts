import {
  CONTROLLED_SUBSTANCES_CATALOG,
  getControlledSubstanceByNdc,
  checkPrescriberScheduleAuthority,
  verifyEphemeralPrescriptionToken,
  type EphemeralPrescriptionToken,
} from "../../../../../lib/epcs-engine";
import { mapToFhirMedicationRequest } from "../../../../../lib/ehr-adapter";

// In-memory dispensed nullifier registry for API server demo
const dispensedNullifiersRegistry = new Set<string>();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ndc = searchParams.get("ndc")?.trim();
    const prescriberMaskParam = searchParams.get("prescriberMask");
    const nullifier = searchParams.get("nullifier")?.trim().toLowerCase();

    if (!ndc) {
      return Response.json(
        {
          error: "Missing required query parameter 'ndc'",
          availableSubstances: Object.values(CONTROLLED_SUBSTANCES_CATALOG).map((s) => ({
            ndc: s.ndc,
            genericName: s.genericName,
            schedule: s.schedule,
          })),
        },
        { status: 400 },
      );
    }

    const substance = getControlledSubstanceByNdc(ndc);
    if (!substance) {
      return Response.json(
        { error: `Medication NDC '${ndc}' not found in controlled substances catalog.` },
        { status: 404 },
      );
    }

    const mask = prescriberMaskParam ? parseInt(prescriberMaskParam, 10) : 0x0f; // Default: full authority
    const authorized = checkPrescriberScheduleAuthority(mask, substance.scheduleBit);

    let isNullifierDispensed = false;
    if (nullifier) {
      isNullifierDispensed = dispensedNullifiersRegistry.has(nullifier);
    }

    return Response.json({
      success: true,
      ndc: substance.ndc,
      genericName: substance.genericName,
      brandName: substance.brandName,
      schedule: substance.schedule,
      scheduleBit: substance.scheduleBit,
      standardDose: substance.standardDose,
      dosageForm: substance.dosageForm,
      maxRefillsAllowed: substance.maxRefillsAllowed,
      requiresStrictIdentityCheck: substance.requiresStrictIdentityCheck,
      prescriberAuthorized: authorized,
      isNullifierDispensed,
      complianceNote:
        substance.schedule === "SCHEDULE_II"
          ? "21 CFR § 1306.12 strictly prohibits refills for Schedule II controlled substances."
          : "21 CFR § 1306.22 permits up to 5 refills within 6 months for Schedules III and IV.",
      timestamp: new Date().toISOString(),
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
    const token: EphemeralPrescriptionToken = body.token;
    const authorizedMask =
      typeof body.authorizedScheduleBitmask === "number"
        ? body.authorizedScheduleBitmask
        : 0x0f;

    if (!token || !token.prescriptionNullifier || !token.scheduleBit) {
      return Response.json(
        { error: "Invalid payload. Expected 'token' object with prescriptionNullifier and scheduleBit." },
        { status: 400 },
      );
    }

    // Combine locally passed usedNullifiers with server in-memory registry
    const usedSet = new Set<string>(dispensedNullifiersRegistry);
    if (Array.isArray(body.usedNullifiers)) {
      body.usedNullifiers.forEach((n: string) => usedSet.add(String(n).toLowerCase()));
    }

    const verification = await verifyEphemeralPrescriptionToken(token, authorizedMask, usedSet);

    let fhir = null;
    if (verification.valid) {
      // Record nullifier upon approved dispense to prevent replay
      dispensedNullifiersRegistry.add(token.prescriptionNullifier.toLowerCase());
      fhir = mapToFhirMedicationRequest(token);
    }

    return Response.json({
      success: true,
      valid: verification.valid,
      dispenseApproved: verification.valid,
      reason: verification.reason,
      schedule: token.schedule,
      genericName: token.genericName,
      prescriptionNullifier: token.prescriptionNullifier,
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
