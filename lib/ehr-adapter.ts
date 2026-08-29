import type { OnChainLicense } from "./midnight-read";
import type { DisclosedAttributes } from "./selective-disclosure";

export interface FhirPractitioner {
  resourceType: "Practitioner";
  id?: string;
  identifier?: Array<{
    system?: string;
    value: string;
    use?: "official" | "usual" | "secondary";
  }>;
  name?: Array<{
    family?: string;
    given?: string[];
    text?: string;
    prefix?: string[];
  }>;
  qualification?: Array<{
    identifier?: Array<{ value: string }>;
    code?: {
      coding?: Array<{
        system?: string;
        code?: string;
        display?: string;
      }>;
      text?: string;
    };
    issuer?: { display?: string };
    period?: {
      start?: string;
      end?: string;
    };
  }>;
}

export interface FhirVerificationResult {
  resourceType: "VerificationResult";
  id: string;
  status: "attested" | "validated" | "in-process" | "req-reval" | "val-fail";
  statusDate: string;
  targetLocation?: string[];
  need?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  };
  validationType?: {
    coding?: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  };
  validationProcess?: Array<{
    coding?: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  attestation?: {
    who?: { display: string };
    onBehalfOf?: { display: string };
    communicationMethod?: { text: string };
    date?: string;
  };
  validator?: Array<{
    organization?: { display: string };
    identityCertificate?: string;
  }>;
  extension?: Array<{
    url: string;
    valueString?: string;
    valueBoolean?: boolean;
    valueInteger?: number;
  }>;
}

export interface EhrVerificationRequest {
  credentialId?: string;
  npi?: string;
  doctorName?: string;
  fhirPractitioner?: FhirPractitioner;
}

/**
 * Extracts credential ID from either a standard request or FHIR Practitioner resource.
 */
export function extractCredentialFromEhrRequest(request: EhrVerificationRequest): string | null {
  if (request.credentialId) {
    const raw = request.credentialId.trim().replace(/^0x/, "").toLowerCase();
    if (/^[0-9a-f]{64}$/.test(raw)) return raw;
  }

  if (request.fhirPractitioner?.identifier) {
    for (const ident of request.fhirPractitioner.identifier) {
      if (ident.value) {
        const raw = ident.value.trim().replace(/^0x/, "").toLowerCase();
        if (/^[0-9a-f]{64}$/.test(raw)) return raw;
      }
    }
  }

  return null;
}

/**
 * Maps on-chain license verification result to standard HL7 FHIR Release 4 VerificationResult resource.
 */
export function mapToFhirVerificationResult(
  credentialId: string,
  onChainLicense: OnChainLicense | null,
  disclosedAttributes?: DisclosedAttributes | null,
  now = new Date(),
): FhirVerificationResult {
  const isAttested = onChainLicense?.valid === true;
  const isRevoked = onChainLicense?.revoked === true;
  const isExpired = onChainLicense?.exists === true && !onChainLicense.valid && !onChainLicense.revoked;

  const fhirStatus: FhirVerificationResult["status"] = isAttested
    ? "validated"
    : isRevoked || isExpired
    ? "val-fail"
    : "in-process";

  const expiresIso = onChainLicense?.expiresAt
    ? new Date(onChainLicense.expiresAt * 1000).toISOString()
    : undefined;

  const extensions: FhirVerificationResult["extension"] = [
    {
      url: "https://aquas.health/fhir/StructureDefinition/zk-credential-id",
      valueString: credentialId,
    },
    {
      url: "https://aquas.health/fhir/StructureDefinition/midnight-settlement-layer",
      valueString: "Midnight Network Preview Testnet",
    },
    {
      url: "https://aquas.health/fhir/StructureDefinition/zero-knowledge-proven",
      valueBoolean: true,
    },
  ];

  if (disclosedAttributes?.specialty) {
    extensions.push({
      url: "https://aquas.health/fhir/StructureDefinition/specialty-certification",
      valueString: disclosedAttributes.specialty,
    });
  }

  if (disclosedAttributes?.deaSchedule) {
    extensions.push({
      url: "https://aquas.health/fhir/StructureDefinition/dea-schedule-authorized",
      valueString: disclosedAttributes.deaSchedule,
    });
  }

  if (disclosedAttributes?.cmeThresholdSatisfied !== undefined) {
    extensions.push({
      url: "https://aquas.health/fhir/StructureDefinition/cme-compliance-gate",
      valueBoolean: disclosedAttributes.cmeThresholdSatisfied,
    });
  }

  if (disclosedAttributes?.cleanRecordAttestation !== undefined) {
    extensions.push({
      url: "https://aquas.health/fhir/StructureDefinition/npdb-clean-record",
      valueBoolean: disclosedAttributes.cleanRecordAttestation,
    });
  }

  return {
    resourceType: "VerificationResult",
    id: `aq-vr-${credentialId.slice(0, 12)}`,
    status: fhirStatus,
    statusDate: now.toISOString(),
    validationType: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/verificationresult-validation-type",
          code: "primary",
          display: "Primary Source Verification (Zero-Knowledge Compact Proof)",
        },
      ],
    },
    validationProcess: [
      {
        coding: [
          {
            system: "https://aquas.health/codesystem/verification-methods",
            code: "zk-snark-compact-ledger",
            display: "Midnight Zero-Knowledge State Transition Proof",
          },
        ],
      },
    ],
    attestation: {
      who: { display: "Aquas Zero-Knowledge Medical Registry" },
      onBehalfOf: { display: onChainLicense?.issuer ?? "State Medical Licensing Authority" },
      communicationMethod: { text: "On-Chain Compact Cryptographic Attestation" },
      date: expiresIso,
    },
    validator: [
      {
        organization: { display: "Midnight Network Decentralized Trust Framework" },
        identityCertificate: credentialId,
      },
    ],
    extension: extensions,
  };
}
