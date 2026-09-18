"use client";

import { useState } from "react";
import {
  X,
  Pill,
  ShieldCheck,
  Lock,
  FileCheck2,
  AlertTriangle,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  CONTROLLED_SUBSTANCES_CATALOG,
  SCHEDULE_BITS,
  type DEASchedule,
  type ControlledSubstance,
  type EphemeralPrescriptionToken,
  deriveEphemeralPrescriptionToken,
  checkPrescriberScheduleAuthority,
} from "@/lib/epcs-engine";
import { mapToFhirMedicationRequest } from "@/lib/ehr-adapter";

export interface PrescriptionSignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrescriptionSigned?: (token: EphemeralPrescriptionToken) => void;
  prescriberScheduleBitmask?: number;
  doctorSecretHex?: string;
}

const PHARMACIES = [
  { npi: "1992883710", name: "CVS Pharmacy #4021 (Denver, CO)" },
  { npi: "1883772619", name: "Walgreens #1102 (Seattle, WA)" },
  { npi: "1772661528", name: "Epic Willow Outpatient Pharmacy (Austin, TX)" },
  { npi: "1661550437", name: "Kaiser Permanente Central Pharmacy (San Jose, CA)" },
];

export default function PrescriptionSignerModal({
  isOpen,
  onClose,
  onPrescriptionSigned,
  prescriberScheduleBitmask = SCHEDULE_BITS.SCHEDULE_II |
    SCHEDULE_BITS.SCHEDULE_III |
    SCHEDULE_BITS.SCHEDULE_IV |
    SCHEDULE_BITS.SCHEDULE_V,
  doctorSecretHex = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
}: PrescriptionSignerModalProps) {
  const [selectedNdc, setSelectedNdc] = useState<string>("00054-0168-13"); // Oxycodone 10mg
  const [patientMrn, setPatientMrn] = useState<string>("MRN-88204-EPCS");
  const [quantity, setQuantity] = useState<number>(30);
  const [customDosage, setCustomDosage] = useState<string>("");
  const [pharmacyNpi, setPharmacyNpi] = useState<string>(PHARMACIES[0].npi);

  const [isSigning, setIsSigning] = useState(false);
  const [signedToken, setSignedToken] = useState<EphemeralPrescriptionToken | null>(null);
  const [signingError, setSigningError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedFhir, setCopiedFhir] = useState(false);

  if (!isOpen) return null;

  const currentMed: ControlledSubstance =
    CONTROLLED_SUBSTANCES_CATALOG[selectedNdc] || Object.values(CONTROLLED_SUBSTANCES_CATALOG)[0];

  const hasScheduleAuthority = checkPrescriberScheduleAuthority(
    prescriberScheduleBitmask,
    currentMed.scheduleBit,
  );

  const handleSignPrescription = async () => {
    setIsSigning(true);
    setSigningError(null);
    setSignedToken(null);

    try {
      const dosageToUse = customDosage.trim() || currentMed.standardDose;
      const token = await deriveEphemeralPrescriptionToken(
        doctorSecretHex,
        prescriberScheduleBitmask,
        currentMed.ndc,
        patientMrn,
        dosageToUse,
        quantity,
        pharmacyNpi,
      );

      setSignedToken(token);
      if (onPrescriptionSigned) {
        onPrescriptionSigned(token);
      }
    } catch (err: unknown) {
      setSigningError((err as Error).message || "Failed to sign prescription token.");
    } finally {
      setIsSigning(false);
    }
  };

  const handleCopyJson = () => {
    if (!signedToken) return;
    navigator.clipboard.writeText(JSON.stringify(signedToken, null, 2));
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleCopyFhir = () => {
    if (!signedToken) return;
    const fhir = mapToFhirMedicationRequest(signedToken);
    navigator.clipboard.writeText(JSON.stringify(fhir, null, 2));
    setCopiedFhir(true);
    setTimeout(() => setCopiedFhir(false), 2000);
  };

  const getScheduleBadge = (schedule: DEASchedule) => {
    switch (schedule) {
      case "SCHEDULE_II":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-500/20 text-red-400 border border-red-500/30">Schedule II (C-II)</span>;
      case "SCHEDULE_III":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">Schedule III (C-III)</span>;
      case "SCHEDULE_IV":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">Schedule IV (C-IV)</span>;
      case "SCHEDULE_V":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">Schedule V (C-V)</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#0d0d0e] border border-white/10 rounded-2xl shadow-2xl p-6 text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 rounded-xl">
              <Pill className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Confidential EPCS Prescription Signer</h2>
              <p className="text-xs text-neutral-400">21 CFR Part 1311 Zero-Knowledge Controlled Substances Signing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prescription Form */}
        <div className="space-y-4 text-sm">
          {/* Medication Selector */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Select Controlled Substance (FDA NDC Catalog)
            </label>
            <select
              value={selectedNdc}
              onChange={(e) => {
                setSelectedNdc(e.target.value);
                setCustomDosage("");
              }}
              className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-neutral-200 focus:outline-none focus:border-emerald-500/50"
            >
              {Object.values(CONTROLLED_SUBSTANCES_CATALOG).map((med) => (
                <option key={med.ndc} value={med.ndc}>
                  {med.genericName} ({med.brandName}) — {med.standardDose} [{med.schedule}]
                </option>
              ))}
            </select>
          </div>

          {/* Medication Details Card */}
          <div className="p-3 bg-neutral-900/60 border border-white/5 rounded-xl flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{currentMed.genericName}</span>
                {getScheduleBadge(currentMed.schedule)}
              </div>
              <p className="text-xs text-neutral-400">
                NDC: <span className="font-mono text-neutral-300">{currentMed.ndc}</span> • Form: {currentMed.dosageForm} • Standard: {currentMed.standardDose}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-neutral-400 block">Prescriber Authority</span>
              {hasScheduleAuthority ? (
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Authorized
                </span>
              ) : (
                <span className="text-xs font-medium text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Lacks Schedule Auth
                </span>
              )}
            </div>
          </div>

          {/* Form Fields: Patient MRN & Dosage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Patient Medical Record Number (MRN)
              </label>
              <input
                type="text"
                value={patientMrn}
                onChange={(e) => setPatientMrn(e.target.value)}
                placeholder="e.g. MRN-449102"
                className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-neutral-200 focus:outline-none focus:border-emerald-500/50"
              />
              <span className="text-[11px] text-neutral-500 mt-1 block">
                Cryptographically blinded via random salt before signing
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Dosage & Strength
              </label>
              <input
                type="text"
                value={customDosage || currentMed.standardDose}
                onChange={(e) => setCustomDosage(e.target.value)}
                placeholder={currentMed.standardDose}
                className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-neutral-200 focus:outline-none focus:border-emerald-500/50"
              />
              <span className="text-[11px] text-neutral-500 mt-1 block">
                Default: {currentMed.standardDose}
              </span>
            </div>
          </div>

          {/* Quantity & Pharmacy NPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Quantity (Units/Tablets)
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-neutral-200 focus:outline-none focus:border-emerald-500/50"
              />
              <span className="text-[11px] text-neutral-500 mt-1 block">
                Schedule II: Max 30-day emergency or standard supply
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Fulfilling Pharmacy (NPI)
              </label>
              <select
                value={pharmacyNpi}
                onChange={(e) => setPharmacyNpi(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-neutral-200 focus:outline-none focus:border-emerald-500/50"
              >
                {PHARMACIES.map((p) => (
                  <option key={p.npi} value={p.npi}>
                    {p.name}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-neutral-500 mt-1 block">
                Single-use dispense challenge bound to pharmacy NPI
              </span>
            </div>
          </div>

          {/* Regulatory Warning Banner */}
          {currentMed.schedule === "SCHEDULE_II" ? (
            <div className="p-3 bg-red-950/30 border border-red-800/40 rounded-xl text-xs text-red-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-red-200">21 CFR § 1306.12 Schedule II Restriction: </span>
                Refills are strictly prohibited (0 refills). A new EPAT token is required for every subsequent dispense. Prescriber raw DEA number is shielded with a zero-knowledge EPAT proof.
              </div>
            </div>
          ) : (
            <div className="p-3 bg-neutral-900 border border-white/10 rounded-xl text-xs text-neutral-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-white">21 CFR § 1306.22 Controlled Substance Compliance: </span>
                Up to {currentMed.maxRefillsAllowed} refills permitted within 6 months. Single-use nullifier recorded on the Midnight Blockchain to prevent double-dispensing.
              </div>
            </div>
          )}

          {signingError && (
            <div className="p-3 bg-red-900/30 border border-red-500/40 rounded-xl text-xs text-red-300">
              {signingError}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleSignPrescription}
            disabled={isSigning || !hasScheduleAuthority}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
          >
            {isSigning ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin" />
                Deriving Blinded EPAT Circuit Proof...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Cryptographically Sign Prescription Token (EPAT)
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </div>

        {/* Generated Token Result */}
        {signedToken && (
          <div className="mt-5 p-4 bg-neutral-900/80 border border-emerald-500/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <FileCheck2 className="w-4 h-4" />
                EPAT Token Generated Successfully
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyJson}
                  className="px-2.5 py-1 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy EPAT JSON
                </button>
                <button
                  onClick={handleCopyFhir}
                  className="px-2.5 py-1 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  {copiedFhir ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Export FHIR R4
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-neutral-400">EPAT Identifier:</span>
                <span className="text-emerald-300 font-semibold">{signedToken.epatId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-neutral-400">Blinded Patient ID:</span>
                <span className="text-neutral-300 truncate max-w-[280px]" title={signedToken.blindedPatientId}>
                  {signedToken.blindedPatientId}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-neutral-400">Prescription Nullifier:</span>
                <span className="text-amber-300 truncate max-w-[280px]" title={signedToken.prescriptionNullifier}>
                  {signedToken.prescriptionNullifier}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-neutral-400">ZK Signature:</span>
                <span className="text-neutral-400 truncate max-w-[280px]" title={signedToken.signature}>
                  {signedToken.signature}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">Clearance Status:</span>
                <span className="text-emerald-400 font-sans font-medium">Ready for Sub-300ms Pharmacy Dispense</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
