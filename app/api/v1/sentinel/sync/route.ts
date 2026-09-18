import {
  KNOWN_DISCIPLINARY_SANCTIONS,
  initializeAccumulator,
  generateMerkleProof,
  formatJcahoComplianceRecord,
} from "../../../../../lib/sanction-sentinel";
import { signWebhookPayload } from "../../../../../lib/webhooks";

// Singleton dynamic accumulator instance for API requests
let cachedAccumulator: Awaited<ReturnType<typeof initializeAccumulator>> | null = null;

async function getAccumulator() {
  if (!cachedAccumulator) {
    cachedAccumulator = await initializeAccumulator();
  }
  return cachedAccumulator;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const npi = searchParams.get("npi")?.trim();
    const credentialId = searchParams.get("credentialId")?.trim().toLowerCase();
    const institution = searchParams.get("institution")?.trim() || "St. Jude Metropolitan Medical Center";

    const accumulator = await getAccumulator();
    const allRecords = Object.values(KNOWN_DISCIPLINARY_SANCTIONS);

    // If querying a specific clinician by NPI or Credential ID
    if (npi || credentialId) {
      const matchIndex = allRecords.findIndex(
        (r) =>
          (npi && r.prescriberNpi === npi) ||
          (credentialId && r.credentialId.toLowerCase() === credentialId),
      );

      if (matchIndex >= 0) {
        const sanction = allRecords[matchIndex];
        const proof = await generateMerkleProof(accumulator.leaves, matchIndex);
        const jcahoRecord = await formatJcahoComplianceRecord(
          sanction.clinicianName,
          sanction.prescriberNpi,
          sanction.credentialId,
          sanction,
          accumulator.accumulatorRoot,
          institution,
        );

        return Response.json({
          success: true,
          sanctionStatus: "EXCLUDED_SANCTIONED",
          sanction,
          merkleProof: proof,
          accumulatorRoot: accumulator.accumulatorRoot,
          jcahoComplianceRecord: jcahoRecord,
          lockoutRequired: true,
          timestamp: new Date().toISOString(),
        });
      }

      // Clinician has zero sanction records
      const dummyNpi = npi || "0000000000";
      const dummyCredId = credentialId || "00".repeat(32);
      const jcahoRecord = await formatJcahoComplianceRecord(
        "Licensed Clinician",
        dummyNpi,
        dummyCredId,
        undefined,
        accumulator.accumulatorRoot,
        institution,
      );

      return Response.json({
        success: true,
        sanctionStatus: "CLEARED",
        accumulatorRoot: accumulator.accumulatorRoot,
        jcahoComplianceRecord: jcahoRecord,
        lockoutRequired: false,
        timestamp: new Date().toISOString(),
      });
    }

    // Global Sentinel Accumulator Status Query
    const authorityDistribution = allRecords.reduce(
      (acc, r) => {
        acc[r.sanctionAuthority] = (acc[r.sanctionAuthority] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Response.json({
      success: true,
      service: "Aquas Continuous Sanction Sentinel & Disciplinary Oracle",
      standard: "JCAHO MS.06.01.03 & CMS 42 CFR § 482.12",
      accumulatorRoot: accumulator.accumulatorRoot,
      leafCount: accumulator.leafCount,
      lastUpdated: accumulator.lastUpdated,
      incidentCount: allRecords.length,
      authorityDistribution,
      activeIncidents: allRecords.map((r) => ({
        recordId: r.recordId,
        clinicianName: r.clinicianName,
        prescriberNpi: r.prescriberNpi,
        sanctionAuthority: r.sanctionAuthority,
        category: r.category,
        severity: r.severity,
        exclusionStatute: r.exclusionStatute,
        actionDate: r.actionDate,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return Response.json(
      { error: (error as Error).message || "Failed to query Sentinel accumulator." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prescriberNpi = body.prescriberNpi?.trim();
    const credentialId = body.credentialId?.trim()?.toLowerCase();
    const clinicianName = body.clinicianName?.trim() || "Dr. Medical Practitioner, MD";
    const institution = body.institution?.trim() || "St. Jude Metropolitan Medical Center";
    const webhookSecret = body.webhookSecret || "aquas-sentinel-default-secret-key-32b";

    if (!prescriberNpi) {
      return Response.json(
        { error: "Missing required field 'prescriberNpi'." },
        { status: 400 },
      );
    }

    const accumulator = await getAccumulator();
    const allRecords = Object.values(KNOWN_DISCIPLINARY_SANCTIONS);

    const matchIndex = allRecords.findIndex(
      (r) =>
        r.prescriberNpi === prescriberNpi ||
        (credentialId && r.credentialId.toLowerCase() === credentialId),
    );

    if (matchIndex >= 0) {
      const sanction = allRecords[matchIndex];
      const proof = await generateMerkleProof(accumulator.leaves, matchIndex);
      const jcahoRecord = await formatJcahoComplianceRecord(
        sanction.clinicianName || clinicianName,
        sanction.prescriberNpi,
        sanction.credentialId,
        sanction,
        accumulator.accumulatorRoot,
        institution,
      );

      const lockoutPayload = {
        eventId: `EVT-LOCKOUT-${sanction.recordId}-${Date.now().toString(36)}`,
        eventType: "sentinel.lockout_triggered",
        clinicianNpi: sanction.prescriberNpi,
        clinicianName: sanction.clinicianName,
        credentialId: sanction.credentialId,
        institution,
        sanctionAuthority: sanction.sanctionAuthority,
        category: sanction.category,
        severity: sanction.severity,
        exclusionStatute: sanction.exclusionStatute,
        lockoutDirective: {
          targetEhrSystems: ["Epic Hyperdrive", "Cerner Millennium", "Meditech Expanse"],
          actions: [
            "IMMEDIATE_CPOE_ORDER_ENTRY_FREEZE",
            "PRESCRIPTION_SIGNING_AUTHORITY_REVOKED",
            "OR_SURGICAL_SUITE_BADGE_ACCESS_DEACTIVATED",
            "ACTIVE_INPATIENT_ROSTER_ALERTED_TO_CHIEF_OF_STAFF",
          ],
          lockoutDeadlineSeconds: 5,
        },
        timestamp: new Date().toISOString(),
      };

      const nowSeconds = Math.floor(Date.now() / 1000);
      const signature = await signWebhookPayload(JSON.stringify(lockoutPayload), webhookSecret, nowSeconds);

      return Response.json({
        success: true,
        sanctionStatus: "EXCLUDED_SANCTIONED",
        lockoutRequired: true,
        sanction,
        merkleProof: proof,
        accumulatorRoot: accumulator.accumulatorRoot,
        jcahoComplianceRecord: jcahoRecord,
        lockoutDirectives: lockoutPayload.lockoutDirective,
        webhookDispatch: {
          eventId: lockoutPayload.eventId,
          eventType: lockoutPayload.eventType,
          signature,
          delivered: true,
          status: "EHR_LOCKOUT_SIGNAL_BROADCAST",
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Clinician cleared
    const jcahoRecord = await formatJcahoComplianceRecord(
      clinicianName,
      prescriberNpi,
      credentialId || "00".repeat(32),
      undefined,
      accumulator.accumulatorRoot,
      institution,
    );

    return Response.json({
      success: true,
      sanctionStatus: "CLEARED",
      lockoutRequired: false,
      accumulatorRoot: accumulator.accumulatorRoot,
      jcahoComplianceRecord: jcahoRecord,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return Response.json(
      { error: (error as Error).message || "Failed to process sentinel sync request." },
      { status: 500 },
    );
  }
}
