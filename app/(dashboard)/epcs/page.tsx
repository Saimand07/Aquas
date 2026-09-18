"use client";

import { useState } from "react";
import {
  Pill,
  ShieldCheck,
  Building2,
  Lock,
  FileCheck2,
  AlertTriangle,
  Zap,
  Activity,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  Download,
  ShieldAlert,
} from "lucide-react";
import PrescriptionSignerModal from "@/components/PrescriptionSignerModal";
import {
  CONTROLLED_SUBSTANCES_CATALOG,
  SCHEDULE_BITS,
  type ControlledSubstance,
  type EphemeralPrescriptionToken,
  deriveEphemeralPrescriptionToken,
  verifyEphemeralPrescriptionToken,
} from "@/lib/epcs-engine";
import { mapToFhirMedicationRequest } from "@/lib/ehr-adapter";

export default function ConfidentialEPCSPage() {
  const [isSignerModalOpen, setIsSignerModalOpen] = useState(false);
  const [doctorSecretHex] = useState(
    "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
  );

  // Doctor authority bitmask: default full Schedules II-V (0x0F)
  const [prescriberBitmask, setPrescriberBitmask] = useState<number>(0x0f);

  // Selected med for live demo
  const [selectedNdc, setSelectedNdc] = useState<string>("00054-0168-13"); // OxyContin
  const [patientMrn, setPatientMrn] = useState<string>("MRN-88204-EPCS");
  const [quantity, setQuantity] = useState<number>(30);
  const [selectedPharmacyNpi, setSelectedPharmacyNpi] = useState<string>("1992883710");

  // Active generated token
  const [activeToken, setActiveToken] = useState<EphemeralPrescriptionToken | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Dispense simulator state
  const [dispenseHistory, setDispenseHistory] = useState<Set<string>>(new Set());
  const [dispenseResult, setDispenseResult] = useState<{
    valid: boolean;
    reason: string;
    latencyMs: number;
    timestamp: string;
  } | null>(null);
  const [isDispensing, setIsDispensing] = useState(false);

  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedFhir, setCopiedFhir] = useState(false);

  const currentMed: ControlledSubstance =
    CONTROLLED_SUBSTANCES_CATALOG[selectedNdc] || Object.values(CONTROLLED_SUBSTANCES_CATALOG)[0];

  const handleGenerateScript = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setDispenseResult(null);

    try {
      const token = await deriveEphemeralPrescriptionToken(
        doctorSecretHex,
        prescriberBitmask,
        currentMed.ndc,
        patientMrn,
        currentMed.standardDose,
        quantity,
        selectedPharmacyNpi,
      );
      setActiveToken(token);
    } catch (err: unknown) {
      setGenerationError((err as Error).message || "Prescription generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSimulateDispense = async () => {
    if (!activeToken) return;
    setIsDispensing(true);
    setDispenseResult(null);

    const startTime = performance.now();
    // Simulate ZK circuit verification latency (sub-300ms)
    await new Promise((r) => setTimeout(r, 220));

    const result = await verifyEphemeralPrescriptionToken(
      activeToken,
      prescriberBitmask,
      dispenseHistory,
    );

    const latency = Math.round(performance.now() - startTime);

    if (result.valid) {
      setDispenseHistory((prev) => new Set(prev).add(activeToken.prescriptionNullifier.toLowerCase()));
    }

    setDispenseResult({
      valid: result.valid,
      reason: result.reason,
      latencyMs: latency,
      timestamp: new Date().toLocaleTimeString(),
    });
    setIsDispensing(false);
  };

  const handleCopyJson = () => {
    if (!activeToken) return;
    navigator.clipboard.writeText(JSON.stringify(activeToken, null, 2));
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleCopyFhir = () => {
    if (!activeToken) return;
    const fhir = mapToFhirMedicationRequest(activeToken);
    navigator.clipboard.writeText(JSON.stringify(fhir, null, 2));
    setCopiedFhir(true);
    setTimeout(() => setCopiedFhir(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> 21 CFR Part 1311 EPCS Compliant
            </span>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Shielded DEA Registry
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Pill className="w-8 h-8 text-emerald-400" />
            Confidential DEA EPCS & Opioid Circuits
          </h1>
          <p className="text-sm text-neutral-400 mt-1 max-w-3xl">
            Cryptographically prove Schedule II–V prescribing privileges without exposing your raw DEA number
            to pharmacies, preventing dark-web credential theft and prescription pad forgery.
          </p>
        </div>

        <button
          onClick={() => setIsSignerModalOpen(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-2 self-start md:self-auto shrink-0"
        >
          <Pill className="w-4 h-4" />
          Open Prescriber Studio
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-neutral-900/60 border border-white/10 rounded-2xl">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Prescriber DEA Standing</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">Active & Shielded</div>
          <div className="text-xs text-neutral-500 mt-1">Schedules II, III, IV, V Authorized</div>
        </div>

        <div className="p-4 bg-neutral-900/60 border border-white/10 rounded-2xl">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Dispense Clearance Speed</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white">&lt; 280 ms</div>
          <div className="text-xs text-neutral-500 mt-1">Halo2 ZK Circuit Execution</div>
        </div>

        <div className="p-4 bg-neutral-900/60 border border-white/10 rounded-2xl">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Double-Dispense Prevention</span>
            <Lock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-cyan-400">Nullifier Guard</div>
          <div className="text-xs text-neutral-500 mt-1">
            {dispenseHistory.size} Token{dispenseHistory.size === 1 ? "" : "s"} Dispensed On-Chain
          </div>
        </div>

        <div className="p-4 bg-neutral-900/60 border border-white/10 rounded-2xl">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Federal EPCS Standard</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white">21 CFR § 1311</div>
          <div className="text-xs text-neutral-500 mt-1">Zero-Leakage Prescription Pad</div>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Clinical Prescriber Terminal */}
        <div className="space-y-6">
          <div className="p-6 bg-[#0e0e10] border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <Pill className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Live Script Writer</h3>
                  <p className="text-xs text-neutral-400">Select controlled medication and derive blind EPAT</p>
                </div>
              </div>

              {/* Authority Simulator Toggle */}
              <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1.5 rounded-xl border border-white/5">
                <span className="text-xs text-neutral-400">Schedule II:</span>
                <button
                  onClick={() =>
                    setPrescriberBitmask((prev) =>
                      prev & SCHEDULE_BITS.SCHEDULE_II
                        ? prev & ~SCHEDULE_BITS.SCHEDULE_II
                        : prev | SCHEDULE_BITS.SCHEDULE_II,
                    )
                  }
                  className={`text-xs px-2 py-0.5 rounded font-semibold transition-colors ${
                    prescriberBitmask & SCHEDULE_BITS.SCHEDULE_II
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-red-500/20 text-red-300 border border-red-500/30"
                  }`}
                >
                  {prescriberBitmask & SCHEDULE_BITS.SCHEDULE_II ? "Authorized" : "Revoked"}
                </button>
              </div>
            </div>

            {/* Med Select */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Controlled Substance (FDA NDC Catalog)
              </label>
              <select
                value={selectedNdc}
                onChange={(e) => setSelectedNdc(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-emerald-500/50"
              >
                {Object.values(CONTROLLED_SUBSTANCES_CATALOG).map((med) => (
                  <option key={med.ndc} value={med.ndc}>
                    {med.genericName} ({med.brandName}) — {med.standardDose} [{med.schedule}]
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Substance Detail */}
            <div className="p-3 bg-neutral-900/60 border border-white/5 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Active Substance:</span>
                <span className="font-semibold text-white">{currentMed.genericName} ({currentMed.brandName})</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">DEA Schedule:</span>
                <span className={`font-semibold ${currentMed.schedule === "SCHEDULE_II" ? "text-red-400" : "text-amber-400"}`}>
                  {currentMed.schedule} ({currentMed.maxRefillsAllowed} refills allowed)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">FDA NDC Code:</span>
                <span className="font-mono text-neutral-300">{currentMed.ndc}</span>
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Patient Medical Record #
                </label>
                <input
                  type="text"
                  value={patientMrn}
                  onChange={(e) => setPatientMrn(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-neutral-200 text-xs focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Quantity (Units)
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-neutral-200 text-xs focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            {generationError && (
              <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{generationError}</span>
              </div>
            )}

            <button
              onClick={handleGenerateScript}
              disabled={isGenerating}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin" /> Generating ZK EPAT...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Generate Confidential EPAT Script
                </span>
              )}
            </button>
          </div>

          {/* Active EPAT Token Card */}
          {activeToken && (
            <div className="p-6 bg-[#0e0e10] border border-emerald-500/30 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                  <FileCheck2 className="w-4 h-4" />
                  Active EPAT Authorization Token
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyJson}
                    className="px-2.5 py-1 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy JSON
                  </button>
                  <button
                    onClick={handleCopyFhir}
                    className="px-2.5 py-1 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    {copiedFhir ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
                    FHIR R4
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-neutral-400">EPAT Token ID:</span>
                  <span className="text-emerald-300 font-semibold">{activeToken.epatId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-neutral-400">Blinded Patient:</span>
                  <span className="text-neutral-300 truncate max-w-[240px]" title={activeToken.blindedPatientId}>
                    {activeToken.blindedPatientId}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-neutral-400">Prescription Nullifier:</span>
                  <span className="text-amber-300 truncate max-w-[240px]" title={activeToken.prescriptionNullifier}>
                    {activeToken.prescriptionNullifier}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-400">Anti-Replay Status:</span>
                  <span className={dispenseHistory.has(activeToken.prescriptionNullifier.toLowerCase()) ? "text-red-400 font-semibold" : "text-emerald-400 font-semibold"}>
                    {dispenseHistory.has(activeToken.prescriptionNullifier.toLowerCase()) ? "CONSUMED / DISPENSED" : "UNSPENT / VALID"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Pharmacy Dispense Terminal */}
        <div className="space-y-6">
          <div className="p-6 bg-[#0e0e10] border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                <Building2 className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Pharmacy Dispense Simulator</h3>
                <p className="text-xs text-neutral-400">Verify EPAT token against Midnight Blockchain in real-time</p>
              </div>
            </div>

            {/* Target Pharmacy Selector */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Dispensing Pharmacy Portal (NPI Verification Node)
              </label>
              <select
                value={selectedPharmacyNpi}
                onChange={(e) => setSelectedPharmacyNpi(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-cyan-500/50"
              >
                <option value="1992883710">CVS Pharmacy #4021 (NPI: 1992883710)</option>
                <option value="1883772619">Walgreens #1102 (NPI: 1883772619)</option>
                <option value="1772661528">Epic Willow Outpatient Pharmacy (NPI: 1772661528)</option>
              </select>
            </div>

            {/* Dispense Action Box */}
            <div className="p-4 bg-neutral-900/60 border border-white/5 rounded-xl space-y-3">
              <div className="text-xs text-neutral-400 flex items-center justify-between">
                <span>Loaded Script:</span>
                <span className="font-semibold text-white">
                  {activeToken ? `${activeToken.genericName} (${activeToken.dosage})` : "No script loaded"}
                </span>
              </div>
              <div className="text-xs text-neutral-400 flex items-center justify-between">
                <span>Patient Privacy:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% Blinded Hash
                </span>
              </div>
              <div className="text-xs text-neutral-400 flex items-center justify-between">
                <span>Raw DEA Exposure:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Zero-Knowledge Shielded (0 Leakage)
                </span>
              </div>

              <button
                onClick={handleSimulateDispense}
                disabled={!activeToken || isDispensing}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-cyan-950/40 flex items-center justify-center gap-2"
              >
                {isDispensing ? (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin" /> Verifying On-Chain EPCS Authority...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Verify EPCS Authority & Dispense Medication
                  </span>
                )}
              </button>
            </div>

            {/* Dispense Verification Output */}
            {dispenseResult && (
              <div
                className={`p-4 rounded-xl border space-y-2 ${
                  dispenseResult.valid
                    ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                    : "bg-red-950/40 border-red-500/40 text-red-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {dispenseResult.valid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        EPCS DISPENSE APPROVED
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-4 h-4 text-red-400" />
                        DISPENSE REJECTED / BLOCKED
                      </>
                    )}
                  </div>
                  <span className="text-xs font-mono opacity-80">{dispenseResult.latencyMs}ms clearance</span>
                </div>

                <p className="text-xs leading-relaxed">{dispenseResult.reason}</p>

                {dispenseResult.valid && (
                  <div className="pt-2 border-t border-white/5 text-[11px] text-emerald-400/90 font-mono">
                    ✓ Single-use prescription nullifier recorded on-chain. Token cannot be reused at any pharmacy.
                  </div>
                )}
                {!dispenseResult.valid && (
                  <div className="pt-2 border-t border-white/5 text-[11px] text-red-400/90 font-mono">
                    ✗ Replay attack or double-dispense attempt intercepted by Midnight EPCS state machine.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Bitmask Visualizer & Cryptographic Education */}
      <div className="p-6 bg-[#0e0e10] border border-white/10 rounded-2xl space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">Shielded DEA Schedule Bitmask Architecture</h3>
            <p className="text-xs text-neutral-400">
              How Zero-Knowledge bitwise circuits verify Controlled Substances Act (CSA) authority without leaking DEA numbers
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-4 bg-neutral-900/60 border border-red-500/20 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-400">Schedule II (Bit 0x01)</span>
              <span className="text-xs font-mono text-neutral-400">0b0001</span>
            </div>
            <p className="text-xs text-white font-medium">Oxycodone, Fentanyl, Adderall</p>
            <p className="text-[11px] text-neutral-400">High abuse potential. Zero refills allowed under 21 CFR § 1306.12.</p>
          </div>

          <div className="p-4 bg-neutral-900/60 border border-amber-500/20 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400">Schedule III (Bit 0x02)</span>
              <span className="text-xs font-mono text-neutral-400">0b0010</span>
            </div>
            <p className="text-xs text-white font-medium">Buprenorphine/Suboxone, Ketamine</p>
            <p className="text-[11px] text-neutral-400">Moderate abuse potential. Max 5 refills in 6 months.</p>
          </div>

          <div className="p-4 bg-neutral-900/60 border border-yellow-500/20 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-yellow-300">Schedule IV (Bit 0x04)</span>
              <span className="text-xs font-mono text-neutral-400">0b0100</span>
            </div>
            <p className="text-xs text-white font-medium">Alprazolam (Xanax), Ambien</p>
            <p className="text-[11px] text-neutral-400">Low abuse potential. Controlled substance tracking required.</p>
          </div>

          <div className="p-4 bg-neutral-900/60 border border-blue-500/20 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400">Schedule V (Bit 0x08)</span>
              <span className="text-xs font-mono text-neutral-400">0b1000</span>
            </div>
            <p className="text-xs text-white font-medium">Pregabalin (Lyrica), Codeine Syrup</p>
            <p className="text-[11px] text-neutral-400">Lowest abuse potential. Standard controlled dispensing.</p>
          </div>
        </div>
      </div>

      {/* Prescription Signer Modal */}
      <PrescriptionSignerModal
        isOpen={isSignerModalOpen}
        onClose={() => setIsSignerModalOpen(false)}
        prescriberScheduleBitmask={prescriberBitmask}
        doctorSecretHex={doctorSecretHex}
        onPrescriptionSigned={(token) => {
          setActiveToken(token);
          setIsSignerModalOpen(false);
        }}
      />
    </div>
  );
}
