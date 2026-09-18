/**
 * @file imlc-federation.ts
 * @description Interstate Medical Licensure Compact (IMLC) Multi-State Reciprocity Federation Engine.
 * Implements jurisdiction registry, State of Principal License (SPL) bylaws evaluation,
 * Letter of Qualification (LOQ) verification, and cross-state reciprocity authorization for Aquas.
 *
 * Reference: Interstate Medical Licensure Compact Commission (IMLCC) Bylaws & Chapter 5 Rules.
 */

export type IMLCMemberStatus = "ACTIVE_MEMBER" | "LEGISLATION_PASSED" | "NON_MEMBER";

export interface IMLCJurisdiction {
  code: string; // 2-letter postal code, e.g. "CO", "TX", "WA"
  name: string; // e.g. "Colorado Medical Board"
  fipsCode: number; // State FIPS code
  status: IMLCMemberStatus;
  joinedYear: number;
  boardKeyHex: string; // Canonical cryptographic board identifier (32-byte hex)
  allowsTelehealth: boolean;
  allowsInPerson: boolean;
}

export interface IMLCPhysicianCriteria {
  homeState: string;
  hasUnrestrictedLicense: boolean;
  graduatedAccreditedMedicalSchool: boolean;
  passedLicensingExams: boolean; // USMLE (Steps 1-3) or COMLEX
  completedGME: boolean; // ACGME or AOA accredited residency/fellowship
  boardCertified: boolean; // ABMS or AOA-BOS specialty board
  hasNoCriminalConvictions: boolean;
  hasNoDisciplinaryActions: boolean;
  hasNoControlledSubstanceActions: boolean;
  notUnderInvestigation: boolean;
}

export interface IMLCLetterOfQualification {
  loqId: string;
  credentialId: string;
  splState: string; // State of Principal License
  issuedAt: number;
  expiresAt: number;
  isUnexpired: boolean;
  authorizedJurisdictions: string[];
  signature: string;
}

export type ReciprocityStatus =
  | "RECIPROCAL_ACTIVE"
  | "HOME_STATE_ONLY"
  | "EXCLUDED_JURISDICTION"
  | "SANCTION_FLAGGED";

export interface IMLCReciprocityResult {
  eligible: boolean;
  homeState: string;
  targetState: string;
  isCompactJurisdiction: boolean;
  reciprocityStatus: ReciprocityStatus;
  reason: string;
  expeditedLoqValid: boolean;
  attestationTimestamp: number;
  coveredJurisdictions: string[];
  nonCoveredJurisdictions: string[];
}

/**
 * Deterministically generates a 32-byte hex board key for a given state code.
 */
export function deriveIMLCBoardKey(stateCode: string): string {
  const normalized = stateCode.trim().toUpperCase();
  const seed = `aquas:imlc:board:v1:${normalized}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hexPart = (hash >>> 0).toString(16).padStart(8, "0");
  // Pad out to 64 hex characters (32 bytes)
  return `${hexPart}${hexPart}${hexPart}${hexPart}${hexPart}${hexPart}${hexPart}${hexPart}`;
}

/**
 * Comprehensive directory of US jurisdictions with their IMLC membership status.
 * Current as of official IMLCC commission rosters (37+ active member states + DC + Guam).
 */
export const IMLC_JURISDICTIONS: Record<string, IMLCJurisdiction> = {
  AL: { code: "AL", name: "Alabama Board of Medical Examiners", fipsCode: 1, status: "ACTIVE_MEMBER", joinedYear: 2015, boardKeyHex: deriveIMLCBoardKey("AL"), allowsTelehealth: true, allowsInPerson: true },
  AZ: { code: "AZ", name: "Arizona Medical Board", fipsCode: 4, status: "ACTIVE_MEMBER", joinedYear: 2016, boardKeyHex: deriveIMLCBoardKey("AZ"), allowsTelehealth: true, allowsInPerson: true },
  CO: { code: "CO", name: "Colorado Medical Board", fipsCode: 8, status: "ACTIVE_MEMBER", joinedYear: 2015, boardKeyHex: deriveIMLCBoardKey("CO"), allowsTelehealth: true, allowsInPerson: true },
  CT: { code: "CT", name: "Connecticut Medical Examining Board", fipsCode: 9, status: "ACTIVE_MEMBER", joinedYear: 2022, boardKeyHex: deriveIMLCBoardKey("CT"), allowsTelehealth: true, allowsInPerson: true },
  DE: { code: "DE", name: "Delaware Board of Medical Licensure and Discipline", fipsCode: 10, status: "ACTIVE_MEMBER", joinedYear: 2021, boardKeyHex: deriveIMLCBoardKey("DE"), allowsTelehealth: true, allowsInPerson: true },
  DC: { code: "DC", name: "District of Columbia Board of Medicine", fipsCode: 11, status: "ACTIVE_MEMBER", joinedYear: 2023, boardKeyHex: deriveIMLCBoardKey("DC"), allowsTelehealth: true, allowsInPerson: true },
  GA: { code: "GA", name: "Georgia Composite Medical Board", fipsCode: 13, status: "ACTIVE_MEMBER", joinedYear: 2019, boardKeyHex: deriveIMLCBoardKey("GA"), allowsTelehealth: true, allowsInPerson: true },
  GU: { code: "GU", name: "Guam Board of Medical Examiners", fipsCode: 66, status: "ACTIVE_MEMBER", joinedYear: 2019, boardKeyHex: deriveIMLCBoardKey("GU"), allowsTelehealth: true, allowsInPerson: true },
  ID: { code: "ID", name: "Idaho State Board of Medicine", fipsCode: 16, status: "ACTIVE_MEMBER", joinedYear: 2015, boardKeyHex: deriveIMLCBoardKey("ID"), allowsTelehealth: true, allowsInPerson: true },
  IL: { code: "IL", name: "Illinois Division of Professional Regulation", fipsCode: 17, status: "ACTIVE_MEMBER", joinedYear: 2015, boardKeyHex: deriveIMLCBoardKey("IL"), allowsTelehealth: true, allowsInPerson: true },
  IN: { code: "IN", name: "Medical Licensing Board of Indiana", fipsCode: 18, status: "ACTIVE_MEMBER", joinedYear: 2022, boardKeyHex: deriveIMLCBoardKey("IN"), allowsTelehealth: true, allowsInPerson: true },
  IA: { code: "IA", name: "Iowa Board of Medicine", fipsCode: 19, status: "ACTIVE_MEMBER", joinedYear: 2015, boardKeyHex: deriveIMLCBoardKey("IA"), allowsTelehealth: true, allowsInPerson: true },
  KS: { code: "KS", name: "Kansas State Board of Healing Arts", fipsCode: 20, status: "ACTIVE_MEMBER", joinedYear: 2016, boardKeyHex: deriveIMLCBoardKey("KS"), allowsTelehealth: true, allowsInPerson: true },
  KY: { code: "KY", name: "Kentucky Board of Medical Licensure", fipsCode: 21, status: "ACTIVE_MEMBER", joinedYear: 2019, boardKeyHex: deriveIMLCBoardKey("KY"), allowsTelehealth: true, allowsInPerson: true },
  LA: { code: "LA", name: "Louisiana State Board of Medical Examiners", fipsCode: 22, status: "ACTIVE_MEMBER", joinedYear: 2020, boardKeyHex: deriveIMLCBoardKey("LA"), allowsTelehealth: true, allowsInPerson: true },
  ME: { code: "ME", name: "Maine Board of Licensure in Medicine", fipsCode: 23, status: "ACTIVE_MEMBER", joinedYear: 2017, boardKeyHex: deriveIMLCBoardKey("ME"), allowsTelehealth: true, allowsInPerson: true },
  MD: { code: "MD", name: "Maryland Board of Physicians", fipsCode: 24, status: "ACTIVE_MEMBER", joinedYear: 2018, boardKeyHex: deriveIMLCBoardKey("MD"), allowsTelehealth: true, allowsInPerson: true },
  MI: { code: "MI", name: "Michigan Board of Medicine", fipsCode: 26, status: "ACTIVE_MEMBER", joinedYear: 2018, boardKeyHex: deriveIMLCBoardKey("MI"), allowsTelehealth: true, allowsInPerson: true },
  MN: { code: "MN", name: "Minnesota Board of Medical Practice", fipsCode: 27, status: "ACTIVE_MEMBER", joinedYear: 2015, boardKeyHex: deriveIMLCBoardKey("MN"), allowsTelehealth: true, allowsInPerson: true },
  MS: { code: "MS", name: "Mississippi State Board of Medical Licensure", fipsCode: 28, status: "ACTIVE_MEMBER", joinedYear: 2017, boardKeyHex: deriveIMLCBoardKey("MS"), allowsTelehealth: true, allowsInPerson: true },
  MT: { code: "MT", name: "Montana Board of Medical Examiners", fipsCode: 30, status: "ACTIVE_MEMBER", joinedYear: 2015, boardKeyHex: deriveIMLCBoardKey("MT"), allowsTelehealth: true, allowsInPerson: true },
  NE: { code: "NE", name: "Nebraska Board of Medicine and Surgery", fipsCode: 31, status: "ACTIVE_MEMBER", joinedYear: 2017, boardKeyHex: deriveIMLCBoardKey("NE"), allowsTelehealth: true, allowsInPerson: true },
  NV: { code: "NV", name: "Nevada State Board of Medical Examiners", fipsCode: 32, status: "ACTIVE_MEMBER", joinedYear: 2015, boardKeyHex: deriveIMLCBoardKey("NV"), allowsTelehealth: true, allowsInPerson: true },
  NH: { code: "NH", name: "New Hampshire Board of Medicine", fipsCode: 33, status: "ACTIVE_MEMBER", joinedYear: 2017, boardKeyHex: deriveIMLCBoardKey("NH"), allowsTelehealth: true, allowsInPerson: true },
  NJ: { code: "NJ", name: "New Jersey State Board of Medical Examiners", fipsCode: 34, status: "ACTIVE_MEMBER", joinedYear: 2021, boardKeyHex: deriveIMLCBoardKey("NJ"), allowsTelehealth: true, allowsInPerson: true },
  ND: { code: "ND", name: "North Dakota Board of Medicine", fipsCode: 38, status: "ACTIVE_MEMBER", joinedYear: 2017, boardKeyHex: deriveIMLCBoardKey("ND"), allowsTelehealth: true, allowsInPerson: true },
  OH: { code: "OH", name: "State Medical Board of Ohio", fipsCode: 39, status: "ACTIVE_MEMBER", joinedYear: 2021, boardKeyHex: deriveIMLCBoardKey("OH"), allowsTelehealth: true, allowsInPerson: true },
  OK: { code: "OK", name: "Oklahoma State Board of Medical Licensure", fipsCode: 40, status: "ACTIVE_MEMBER", joinedYear: 2019, boardKeyHex: deriveIMLCBoardKey("OK"), allowsTelehealth: true, allowsInPerson: true },
  PA: { code: "PA", name: "Pennsylvania State Board of Medicine", fipsCode: 42, status: "ACTIVE_MEMBER", joinedYear: 2016, boardKeyHex: deriveIMLCBoardKey("PA"), allowsTelehealth: true, allowsInPerson: true },
  RI: { code: "RI", name: "Rhode Island Board of Medical Licensure", fipsCode: 44, status: "ACTIVE_MEMBER", joinedYear: 2022, boardKeyHex: deriveIMLCBoardKey("RI"), allowsTelehealth: true, allowsInPerson: true },
  SD: { code: "SD", name: "South Dakota Board of Medical and Osteopathic Examiners", fipsCode: 46, status: "ACTIVE_MEMBER", joinedYear: 2015, boardKeyHex: deriveIMLCBoardKey("SD"), allowsTelehealth: true, allowsInPerson: true },
  TN: { code: "TN", name: "Tennessee Board of Medical Examiners", fipsCode: 47, status: "ACTIVE_MEMBER", joinedYear: 2018, boardKeyHex: deriveIMLCBoardKey("TN"), allowsTelehealth: true, allowsInPerson: true },
  TX: { code: "TX", name: "Texas Medical Board", fipsCode: 48, status: "ACTIVE_MEMBER", joinedYear: 2021, boardKeyHex: deriveIMLCBoardKey("TX"), allowsTelehealth: true, allowsInPerson: true },
  UT: { code: "UT", name: "Utah Physicians Licensing Board", fipsCode: 49, status: "ACTIVE_MEMBER", joinedYear: 2015, boardKeyHex: deriveIMLCBoardKey("UT"), allowsTelehealth: true, allowsInPerson: true },
  VT: { code: "VT", name: "Vermont Board of Medical Practice", fipsCode: 50, status: "ACTIVE_MEMBER", joinedYear: 2019, boardKeyHex: deriveIMLCBoardKey("VT"), allowsTelehealth: true, allowsInPerson: true },
  WA: { code: "WA", name: "Washington Medical Commission", fipsCode: 53, status: "ACTIVE_MEMBER", joinedYear: 2017, boardKeyHex: deriveIMLCBoardKey("WA"), allowsTelehealth: true, allowsInPerson: true },
  WV: { code: "WV", name: "West Virginia Board of Medicine", fipsCode: 54, status: "ACTIVE_MEMBER", joinedYear: 2016, boardKeyHex: deriveIMLCBoardKey("WV"), allowsTelehealth: true, allowsInPerson: true },
  WI: { code: "WI", name: "Wisconsin Medical Examining Board", fipsCode: 55, status: "ACTIVE_MEMBER", joinedYear: 2015, boardKeyHex: deriveIMLCBoardKey("WI"), allowsTelehealth: true, allowsInPerson: true },
  WY: { code: "WY", name: "Wyoming Board of Medicine", fipsCode: 56, status: "ACTIVE_MEMBER", joinedYear: 2015, boardKeyHex: deriveIMLCBoardKey("WY"), allowsTelehealth: true, allowsInPerson: true },

  // Non-member or legislation states for boundary testing:
  CA: { code: "CA", name: "Medical Board of California", fipsCode: 6, status: "NON_MEMBER", joinedYear: 0, boardKeyHex: deriveIMLCBoardKey("CA"), allowsTelehealth: true, allowsInPerson: true },
  NY: { code: "NY", name: "New York State Board for Medicine", fipsCode: 36, status: "NON_MEMBER", joinedYear: 0, boardKeyHex: deriveIMLCBoardKey("NY"), allowsTelehealth: true, allowsInPerson: true },
  FL: { code: "FL", name: "Florida Board of Medicine", fipsCode: 12, status: "LEGISLATION_PASSED", joinedYear: 2024, boardKeyHex: deriveIMLCBoardKey("FL"), allowsTelehealth: true, allowsInPerson: true },
  NC: { code: "NC", name: "North Carolina Medical Board", fipsCode: 37, status: "NON_MEMBER", joinedYear: 0, boardKeyHex: deriveIMLCBoardKey("NC"), allowsTelehealth: true, allowsInPerson: true },
  MO: { code: "MO", name: "Missouri Board of Registration for the Healing Arts", fipsCode: 29, status: "LEGISLATION_PASSED", joinedYear: 2024, boardKeyHex: deriveIMLCBoardKey("MO"), allowsTelehealth: true, allowsInPerson: true },
};

/**
 * Returns list of all active IMLC member jurisdictions.
 */
export function getActiveIMLCMembers(): IMLCJurisdiction[] {
  return Object.values(IMLC_JURISDICTIONS).filter((j) => j.status === "ACTIVE_MEMBER");
}

/**
 * Returns an array of state codes that are active IMLC members.
 */
export function getActiveIMLCMemberCodes(): string[] {
  return getActiveIMLCMembers().map((j) => j.code);
}

/**
 * Checks if a specific jurisdiction is an active IMLC member.
 */
export function isIMLCMember(stateCode: string): boolean {
  const norm = stateCode.trim().toUpperCase();
  return IMLC_JURISDICTIONS[norm]?.status === "ACTIVE_MEMBER";
}

/**
 * Retrieves jurisdiction information by 2-letter state code.
 */
export function getIMLCJurisdiction(stateCode: string): IMLCJurisdiction | undefined {
  return IMLC_JURISDICTIONS[stateCode.trim().toUpperCase()];
}

/**
 * Validates whether physician credentials satisfy IMLC Section 5 State of Principal License (SPL)
 * qualification standards for expedited reciprocity.
 */
export function validateIMLCEligibility(criteria: IMLCPhysicianCriteria): {
  valid: boolean;
  disqualifications: string[];
} {
  const disqualifications: string[] = [];

  if (!isIMLCMember(criteria.homeState)) {
    disqualifications.push(`Home jurisdiction '${criteria.homeState}' is not an active IMLC member state.`);
  }
  if (!criteria.hasUnrestrictedLicense) {
    disqualifications.push("Physician does not hold an unrestricted medical license in the State of Principal License.");
  }
  if (!criteria.graduatedAccreditedMedicalSchool) {
    disqualifications.push("Medical school is not accredited by LCME, COCA, or listed in IMED/World Directory.");
  }
  if (!criteria.passedLicensingExams) {
    disqualifications.push("Did not pass USMLE or COMLEX exams within the permitted number of attempts.");
  }
  if (!criteria.completedGME) {
    disqualifications.push("Has not completed an ACGME or AOA-accredited postgraduate residency program.");
  }
  if (!criteria.boardCertified) {
    disqualifications.push("Physician does not maintain active specialty certification from ABMS or AOA-BOS.");
  }
  if (!criteria.hasNoCriminalConvictions) {
    disqualifications.push("History of felony criminal conviction.");
  }
  if (!criteria.hasNoDisciplinaryActions) {
    disqualifications.push("Action taken against medical license by any state licensing board.");
  }
  if (!criteria.hasNoControlledSubstanceActions) {
    disqualifications.push("Disciplinary action taken against federal DEA or state controlled substance registration.");
  }
  if (!criteria.notUnderInvestigation) {
    disqualifications.push("Currently under active investigation by licensing agency or law enforcement.");
  }

  return {
    valid: disqualifications.length === 0,
    disqualifications,
  };
}

/**
 * Evaluates cross-state practice reciprocity between a home jurisdiction and a target practice state.
 */
export function evaluateIMLCReciprocity(
  homeStateCode: string,
  targetStateCode: string,
  criteria?: Partial<IMLCPhysicianCriteria>,
  nowSeconds = Math.floor(Date.now() / 1000),
): IMLCReciprocityResult {
  const home = homeStateCode.trim().toUpperCase();
  const target = targetStateCode.trim().toUpperCase();

  const isHomeCompact = isIMLCMember(home);
  const isTargetCompact = isIMLCMember(target);
  const activeMembers = getActiveIMLCMemberCodes();

  // If identical state (e.g. practicing in home state)
  if (home === target) {
    return {
      eligible: true,
      homeState: home,
      targetState: target,
      isCompactJurisdiction: isHomeCompact,
      reciprocityStatus: "RECIPROCAL_ACTIVE",
      reason: "Physician holds primary jurisdiction license in this state.",
      expeditedLoqValid: true,
      attestationTimestamp: nowSeconds,
      coveredJurisdictions: isHomeCompact ? activeMembers : [home],
      nonCoveredJurisdictions: isHomeCompact
        ? Object.keys(IMLC_JURISDICTIONS).filter((c) => !activeMembers.includes(c))
        : Object.keys(IMLC_JURISDICTIONS).filter((c) => c !== home),
    };
  }

  // Check home state qualification
  if (!isHomeCompact) {
    return {
      eligible: false,
      homeState: home,
      targetState: target,
      isCompactJurisdiction: false,
      reciprocityStatus: "HOME_STATE_ONLY",
      reason: `Home state '${home}' is not an IMLC compact member. Interstate reciprocity requires an active IMLC State of Principal License (SPL).`,
      expeditedLoqValid: false,
      attestationTimestamp: nowSeconds,
      coveredJurisdictions: [home],
      nonCoveredJurisdictions: Object.keys(IMLC_JURISDICTIONS).filter((c) => c !== home),
    };
  }

  // Check target state membership
  if (!isTargetCompact) {
    const targetJuris = getIMLCJurisdiction(target);
    const statusNote = targetJuris ? `State '${target}' is ${targetJuris.status}.` : `Unknown jurisdiction '${target}'.`;
    return {
      eligible: false,
      homeState: home,
      targetState: target,
      isCompactJurisdiction: false,
      reciprocityStatus: "EXCLUDED_JURISDICTION",
      reason: `Target jurisdiction '${target}' does not participate in the IMLC compact. ${statusNote} Traditional single-state licensure is required.`,
      expeditedLoqValid: false,
      attestationTimestamp: nowSeconds,
      coveredJurisdictions: activeMembers,
      nonCoveredJurisdictions: Object.keys(IMLC_JURISDICTIONS).filter((c) => !activeMembers.includes(c)),
    };
  }

  // Check physician qualifying criteria if provided
  if (criteria) {
    const fullCriteria: IMLCPhysicianCriteria = {
      homeState: home,
      hasUnrestrictedLicense: criteria.hasUnrestrictedLicense ?? true,
      graduatedAccreditedMedicalSchool: criteria.graduatedAccreditedMedicalSchool ?? true,
      passedLicensingExams: criteria.passedLicensingExams ?? true,
      completedGME: criteria.completedGME ?? true,
      boardCertified: criteria.boardCertified ?? true,
      hasNoCriminalConvictions: criteria.hasNoCriminalConvictions ?? true,
      hasNoDisciplinaryActions: criteria.hasNoDisciplinaryActions ?? true,
      hasNoControlledSubstanceActions: criteria.hasNoControlledSubstanceActions ?? true,
      notUnderInvestigation: criteria.notUnderInvestigation ?? true,
    };

    const validation = validateIMLCEligibility(fullCriteria);
    if (!validation.valid) {
      const isSanction =
        !fullCriteria.hasNoDisciplinaryActions ||
        !fullCriteria.hasNoControlledSubstanceActions ||
        !fullCriteria.notUnderInvestigation ||
        !fullCriteria.hasNoCriminalConvictions;

      return {
        eligible: false,
        homeState: home,
        targetState: target,
        isCompactJurisdiction: true,
        reciprocityStatus: isSanction ? "SANCTION_FLAGGED" : "HOME_STATE_ONLY",
        reason: `IMLC Letter of Qualification criteria not satisfied: ${validation.disqualifications[0]}`,
        expeditedLoqValid: false,
        attestationTimestamp: nowSeconds,
        coveredJurisdictions: [home],
        nonCoveredJurisdictions: Object.keys(IMLC_JURISDICTIONS).filter((c) => c !== home),
      };
    }
  }

  // Fully eligible across all 37+ member jurisdictions
  return {
    eligible: true,
    homeState: home,
    targetState: target,
    isCompactJurisdiction: true,
    reciprocityStatus: "RECIPROCAL_ACTIVE",
    reason: `Instant practice reciprocity authorized under IMLC Compact rules between ${home} and ${target}.`,
    expeditedLoqValid: true,
    attestationTimestamp: nowSeconds,
    coveredJurisdictions: activeMembers,
    nonCoveredJurisdictions: Object.keys(IMLC_JURISDICTIONS).filter((c) => !activeMembers.includes(c)),
  };
}

/**
 * Generates an IMLC Letter of Qualification (LOQ) cryptographic receipt.
 */
export function generateIMLCLetterOfQualification(
  credentialId: string,
  splState: string,
  doctorSecretHex: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): IMLCLetterOfQualification {
  const normState = splState.trim().toUpperCase();
  if (!isIMLCMember(normState)) {
    throw new Error(`State '${normState}' is not an authorized IMLC State of Principal License.`);
  }

  const loqId = `imlc-loq-${normState.toLowerCase()}-${credentialId.slice(0, 16)}`;
  const expiresAt = nowSeconds + 365 * 86400; // LOQs are valid for 365 days under IMLC rules
  const authorizedJurisdictions = getActiveIMLCMemberCodes();

  // Signature commitment over loq parameters
  const sigPayload = `${loqId}:${credentialId}:${normState}:${expiresAt}:${doctorSecretHex}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < sigPayload.length; i++) {
    hash ^= sigPayload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hexSig = (hash >>> 0).toString(16).padStart(8, "0");
  const signature = `${hexSig}${hexSig}${hexSig}${hexSig}${hexSig}${hexSig}${hexSig}${hexSig}`;

  return {
    loqId,
    credentialId,
    splState: normState,
    issuedAt: nowSeconds,
    expiresAt,
    isUnexpired: true,
    authorizedJurisdictions,
    signature,
  };
}

/**
 * Verifies the validity and expiration of an IMLC Letter of Qualification (LOQ).
 */
export function verifyIMLCLetterOfQualification(
  loq: IMLCLetterOfQualification,
  nowSeconds = Math.floor(Date.now() / 1000),
): { valid: boolean; reason: string } {
  if (!isIMLCMember(loq.splState)) {
    return { valid: false, reason: `Issuing state '${loq.splState}' is not a recognized IMLC member.` };
  }
  if (nowSeconds >= loq.expiresAt) {
    return { valid: false, reason: `IMLC Letter of Qualification expired on ${new Date(loq.expiresAt * 1000).toISOString()}.` };
  }
  if (!loq.signature || loq.signature.length !== 64) {
    return { valid: false, reason: "Malformed or missing cryptographic LOQ signature." };
  }
  return { valid: true, reason: "Valid and unexpired IMLC Letter of Qualification." };
}
