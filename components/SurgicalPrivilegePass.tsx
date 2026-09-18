"use client";

import { useState, useMemo } from "react";
import {
  Award,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Sparkles,
  Copy,
  Check,
  Download,
  Building2,
  Activity,
  FileCheck2,
  RefreshCw,
} from "lucide-react";
import {
  CPT_SURGICAL_CATALOG,
  evaluateCaseVolumePrivilege,
  mapToFhirClinicalImpression,
  type SurgicalPrivilegeProof,
  type BlindedProcedureAttestation,
} from "@/lib/surgical-privileges";

const DEMO_BASE_TIMESTAMP = 1773800000; // Fixed reference timestamp to preserve pure render

interface SurgicalPrivilegePassProps {
  doctorSecretHex?: string;
  doctorName?: string;
  npiNumber?: string;
  specialty?: string;
}

export default function SurgicalPrivilegePass({
  doctorSecretHex = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
  doctorName = "Dr. Sarah Jenkins, MD",
  npiNumber = "1948201938",
  specialty = "Cardiothoracic Surgery",
}: SurgicalPrivilegePassProps) {
  const [selectedCpt, setSelectedCpt] = useState<string>("33533"); // CABG Single Arterial
  const [committeeChallenge, setCommitteeChallenge] = useState<string>(
    "CHALLENGE-MT-SINAI-SURGERY-2026",
  );
  const targetHospital = "Mount Sinai Hospital Center - Department of Surgery";

  const [isGenerating, setIsGenerating] = useState(false);
  const [proof, setProof] = useState<SurgicalPrivilegeProof | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const currentCpt = CPT_SURGICAL_CATALOG[selectedCpt] || CPT_SURGICAL_CATALOG["33533"];

  // Mock surgeon's private operative log for the selected procedure
  const mockOperativeLog = useMemo(() => {
    const procs: BlindedProcedureAttestation[] = [];
    const now = DEMO_BASE_TIMESTAMP;
    // Generate qualifying volume for the current procedure (e.g. 54 procedures for CABG)
    const count = currentCpt.min12MonthVolume + 4;
    const hospitals = ["HOSP-MAYO-001", "HOSP-CLEV-002", "HOSP-MT-SINAI-005"];

    for (let i = 0; i < count; i++) {
      const salt = (i + 1).toString(16).padStart(64, "0");
      const time = now - (count - i) * 5 * 86400; // spread over past months
      const hospitalId = hospitals[i % hospitals.length];

      // Simulated blinded procedure record
      const attestation: BlindedProcedureAttestation = {
        attestationId: `ATT-${selectedCpt}-${(i + 1).toString().padStart(3, "0")}`,
        cptCode: selectedCpt,
        outcome: "OPTIMAL_OUTCOME", // 0% complications in primary demo
        hospitalId,
        timestamp: time,
        saltHex: salt,
        procedureCommitment: "a1b2c3d4e5f6".repeat(5) + i.toString().padStart(4, "0"),
        hospitalSignature: "998877665544".repeat(5) + i.toString().padStart(4, "0"),
      };
      procs.push(attestation);
    }
    return procs;
  }, [selectedCpt, currentCpt]);

  const handleGenerateProof = async () => {
    setIsGenerating(true);
    setProof(null);

    try {
      // Simulate real-time Halo2 proving latency
      await new Promise((resolve) => setTimeout(resolve, 320));

      const generatedProof = await evaluateCaseVolumePrivilege(
        mockOperativeLog,
        selectedCpt,
        committeeChallenge,
        doctorSecretHex,
      );
      setProof(generatedProof);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadFhir = () => {
    if (!proof) return;
    const fhir = mapToFhirClinicalImpression(proof);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fhir, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `FHIR_PRIVILEGE_${proof.cptCode}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="w-full space-y-8 font-sans">
      {/* Header Profile Card */}
      <div className="p-6 md:p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] via-amber-500/[0.03] to-transparent relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-400 font-semibold">
              <Award className="w-3.5 h-3.5" />
              <span>HIPAA-SAFE CLINICAL PRIVILEGING PASS</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {doctorName}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 font-mono">
              <span>NPI: {npiNumber}</span>
              <span>•</span>
              <span className="text-amber-300">{specialty}</span>
              <span>•</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> State License Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-black/40 border border-white/10 text-xs font-mono">
            <Building2 className="w-8 h-8 text-amber-400 shrink-0" />
            <div>
              <div className="text-zinc-500 text-[11px]">Evaluating Institution</div>
              <div className="text-white font-semibold">{targetHospital}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Privileging Prover Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Controls: Selection & Log Overview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl border border-white/10 bg-white/[0.02] space-y-5">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <FileCheck2 className="w-5 h-5 text-amber-400" />
              Surgical Privilege Configuration
            </div>

            {/* CPT Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                Requested Surgical Privilege (CPT Code)
              </label>
              <select
                value={selectedCpt}
                onChange={(e) => setSelectedCpt(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white focus:outline-none focus:border-amber-500 font-mono cursor-pointer"
              >
                {Object.values(CPT_SURGICAL_CATALOG).map((cpt) => (
                  <option key={cpt.cptCode} value={cpt.cptCode} className="bg-zinc-950 text-white">
                    CPT {cpt.cptCode}: {cpt.procedureName}
                  </option>
                ))}
              </select>
            </div>

            {/* Requirement Summary Card */}
            <div className="p-4 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 space-y-2 text-xs">
              <div className="font-semibold text-amber-300">Hospital Bylaw Privileging Thresholds:</div>
              <div className="grid grid-cols-2 gap-2 text-zinc-300 font-mono pt-1">
                <div>
                  <span className="text-zinc-500">12-Mo Volume:</span>{" "}
                  <span className="text-white font-bold">≥ {currentCpt.min12MonthVolume} cases</span>
                </div>
                <div>
                  <span className="text-zinc-500">Max Adverse Rate:</span>{" "}
                  <span className="text-white font-bold">≤ {currentCpt.maxAdverseRatePercent}%</span>
                </div>
              </div>
              <div className="text-[11px] text-zinc-400 pt-1">
                {currentCpt.description}
              </div>
            </div>

            {/* Committee Challenge Input */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                Credentialing Committee Nonce / Challenge
              </label>
              <input
                type="text"
                value={committeeChallenge}
                onChange={(e) => setCommitteeChallenge(e.target.value)}
                placeholder="e.g. CHALLENGE-MT-SINAI-SURGERY-2026"
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-zinc-500">
                Single-use challenge generated by hospital credentials office. Prevents proof re-use.
              </p>
            </div>

            {/* Surgeon's Local Wallet Log Stats */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs font-mono">
              <div className="text-zinc-400 flex items-center justify-between">
                <span>Private Wallet Operative Log:</span>
                <span className="text-emerald-400 font-bold">{mockOperativeLog.length} Cases Attested</span>
              </div>
              <div className="text-zinc-400 flex items-center justify-between">
                <span>Rolling Period:</span>
                <span className="text-white">Past 365 Days</span>
              </div>
              <div className="text-zinc-400 flex items-center justify-between">
                <span>JCAHO Accreditation:</span>
                <span className="text-emerald-400">100% Certified Facilities</span>
              </div>
            </div>

            {/* Prover Action */}
            <button
              onClick={handleGenerateProof}
              disabled={isGenerating}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-black font-bold text-sm shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  Generating Zero-Knowledge Proof (Halo2)...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-black" />
                  Generate ZK Case-Volume Proof
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Proof Output & Educational Privacy Inspector */}
        <div className="lg:col-span-7 space-y-6">
          {/* Zero-Knowledge Privacy Architecture Comparison */}
          <div className="p-6 rounded-3xl border border-white/10 bg-white/[0.02] space-y-6">
            <div className="flex items-center justify-between">
              <div className="font-bold text-white text-base flex items-center gap-2">
                <Lock className="w-5 h-5 text-cyan-400" />
                HIPAA-Safe Cryptographic Architecture
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Midnight Halo2 ZK-SNARK
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Disclosed Column */}
              <div className="p-4 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/20 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 font-mono">
                  <Eye className="w-4 h-4" />
                  DISCLOSED TO COMMITTEE
                </div>
                <ul className="space-y-2 text-xs text-zinc-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Clinical Privilege Granted: YES</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Volume Threshold Met (≥ {currentCpt.min12MonthVolume} Cases)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Adverse Event Ceiling Met (≤ {currentCpt.maxAdverseRatePercent}%)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>JCAHO Operating Facility Mandate</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Single-Use Challenge Nullifier</span>
                  </li>
                </ul>
              </div>

              {/* Shielded Column */}
              <div className="p-4 rounded-2xl bg-rose-500/[0.04] border border-rose-500/20 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-400 font-mono">
                  <EyeOff className="w-4 h-4" />
                  SHIELDED (ZERO DISCLOSURE)
                </div>
                <ul className="space-y-2 text-xs text-zinc-300">
                  <li className="flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Patient Names &amp; MRNs: 0 Disclosed</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Specific Surgery Dates: 0 Disclosed</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Raw Operative Notes: 0 Disclosed</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Hospital Volume Breakdowns: Shielded</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Complication Case Details: Shielded</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Generated Proof Card */}
            {proof && (
              <div className="p-5 rounded-2xl bg-black/60 border border-amber-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    SURGICAL PRIVILEGE VERIFIED &amp; GRANTED
                  </div>
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-white/5 border border-white/10 text-amber-300">
                    Proof ID: {proof.proofId.slice(0, 16)}...
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-zinc-500 text-[11px]">Procedures Proven</div>
                    <div className="text-white font-bold mt-0.5">{proof.totalProceduresAttested} Cases</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-zinc-500 text-[11px]">Threshold Volume</div>
                    <div className="text-emerald-400 font-bold mt-0.5">≥ {proof.requiredVolumeThreshold}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-zinc-500 text-[11px]">Adverse Rate</div>
                    <div className="text-emerald-400 font-bold mt-0.5">{proof.adverseRateProvenPercent}%</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-zinc-500 text-[11px]">Safety Ceiling</div>
                    <div className="text-white font-bold mt-0.5">≤ {proof.maxAllowableAdverseRatePercent}%</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Challenge Nullifier:</span>
                    <span className="text-cyan-400">{proof.challengeNullifier.slice(0, 18)}...</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Audit Compliance Seal:</span>
                    <span className="text-amber-300">{proof.auditComplianceSeal.slice(0, 18)}...</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(proof, null, 2), "proofJson")}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white font-mono font-medium flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer"
                  >
                    {copiedField === "proofJson" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    Copy Proof JSON
                  </button>

                  <button
                    onClick={handleDownloadFhir}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-xs text-amber-300 font-mono font-medium flex items-center justify-center gap-2 border border-amber-500/30 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export FHIR R4 JSON
                  </button>
                </div>
              </div>
            )}

            {!proof && (
              <div className="p-6 rounded-2xl border border-dashed border-white/10 text-center space-y-2">
                <Activity className="w-8 h-8 text-zinc-600 mx-auto" />
                <div className="text-xs text-zinc-400">
                  Select a CPT procedure code and click <strong>Generate ZK Case-Volume Proof</strong> to prove
                  clinical competency to the hospital committee in zero knowledge.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
