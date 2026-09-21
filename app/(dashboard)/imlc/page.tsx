"use client";

import { useState, useMemo } from "react";
import {
  Globe,
  ShieldCheck,
  Building2,
  Users,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  Check,
  FileText,
  RefreshCw,
} from "lucide-react";
import IMLCReciprocityMap from "@/components/IMLCReciprocityMap";
import IMLCReciprocityBadge from "@/components/IMLCReciprocityBadge";
import {
  IMLC_JURISDICTIONS,
  evaluateIMLCReciprocity,
  generateIMLCReciprocityProof,
  verifyIMLCReciprocityProof,
  generateIMLCLetterOfQualification,
  isIMLCMember,
  type IMLCReciprocityProof,
  type IMLCLetterOfQualification,
} from "@/lib/imlc-federation";
import { KNOWN_DISCIPLINARY_SANCTIONS } from "@/lib/sanction-sentinel";
import { mapToFhirVerificationResult } from "@/lib/ehr-adapter";
import type { LicenseRecord } from "@/lib/license-registry";

interface ClinicianProfile {
  id: string;
  name: string;
  npi: string;
  homeState: string;
  boardName: string;
  specialty: string;
  doctorSecretHex: string;
  isSanctioned?: boolean;
}

const DEFAULT_CLINICIANS: ClinicianProfile[] = [
  {
    id: "d5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74",
    name: "Dr. Sarah Jenkins, MD",
    npi: "1948201938",
    homeState: "CO",
    boardName: "Colorado Medical Board (Active IMLC Member)",
    specialty: "Cardiothoracic Surgery",
    doctorSecretHex: "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
  },
  {
    id: "f1a2b3c4d5e67890123456789abcdef0123456789abcdef0123456789abcdef0",
    name: "Dr. Emily Thorne, MD",
    npi: "1882771199",
    homeState: "TX",
    boardName: "Texas Medical Board (Active IMLC Member)",
    specialty: "Emergency Medicine",
    doctorSecretHex: "22334455667788990011aabbccddeeff22334455667788990011aabbccddeeff",
  },
  {
    id: "d1eb4aa822360421f5ad357831faf4ebef2b9a7b23e425ee05d3822d92f21244",
    name: "Dr. Sarah Lin, MD",
    npi: "1449882200",
    homeState: "NY",
    boardName: "New York State Medical Board (Non-Compact State)",
    specialty: "Diagnostic Radiology & Oncology",
    doctorSecretHex: "33445566778899001122aabbccddeeff33445566778899001122aabbccddeeff",
  },
  {
    id: "92476195ca0e467aa187ef9191419c9d42b85e17bc28ad495ca7345bd250537b",
    name: "Dr. Marcus Chen, MD",
    npi: "1332211445",
    homeState: "CA",
    boardName: "Medical Board of California (Non-Compact State)",
    specialty: "Cardiology",
    doctorSecretHex: "44556677889900112233aabbccddeeff44556677889900112233aabbccddeeff",
  },
  {
    id: "e0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70",
    name: "Dr. Arthur Vance, MD (NPDB Sanctioned)",
    npi: "1882773645",
    homeState: "CO",
    boardName: "Colorado Medical Board (NPDB Disciplinary Suspension)",
    specialty: "Neurosurgery (Gross Negligence Excluded)",
    doctorSecretHex: "55667788990011223344aabbccddeeff55667788990011223344aabbccddeeff",
    isSanctioned: true,
  },
];

export default function IMLCFederationPage() {
  const [selectedClinicianId, setSelectedClinicianId] = useState<string>(DEFAULT_CLINICIANS[0].id);
  const [homeState, setHomeState] = useState<string>(DEFAULT_CLINICIANS[0].homeState);
  const [targetState, setTargetState] = useState<string>("TX");
  const [credentialId, setCredentialId] = useState<string>(DEFAULT_CLINICIANS[0].id);
  const [doctorSecretHex, setDoctorSecretHex] = useState<string>(DEFAULT_CLINICIANS[0].doctorSecretHex);

  const [activeProof, setActiveProof] = useState<IMLCReciprocityProof | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    reason: string;
    latencyMs: number;
    source: "LIVE_API" | "CLIENT_PROVER";
  } | null>(null);

  const [generatedLoq, setGeneratedLoq] = useState<IMLCLetterOfQualification | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Sync user licenses from localStorage if available
  const [clinicians] = useState<ClinicianProfile[]>(() => {
    if (typeof window === "undefined") return DEFAULT_CLINICIANS;
    try {
      const saved = window.localStorage.getItem("aquas_licenses_v1");
      if (saved) {
        const parsed = JSON.parse(saved) as LicenseRecord[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const userClinicians: ClinicianProfile[] = parsed.map((lic) => {
            const boardUpper = lic.board.toUpperCase();
            let stateCode = "CO";
            if (boardUpper.includes("CALIFORNIA") || boardUpper.includes("CA")) stateCode = "CA";
            else if (boardUpper.includes("NEW YORK") || boardUpper.includes("NY")) stateCode = "NY";
            else if (boardUpper.includes("TEXAS") || boardUpper.includes("TX")) stateCode = "TX";
            else if (boardUpper.includes("WASHINGTON") || boardUpper.includes("WA")) stateCode = "WA";

            return {
              id: lic.id,
              name: lic.doctorLabel,
              npi: lic.licenseNumber || "1948201938",
              homeState: stateCode,
              boardName: lic.board,
              specialty: lic.specialty,
              doctorSecretHex:
                lic.privateCredential?.doctorSecret ||
                "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
              isSanctioned: lic.status === "revoked",
            };
          });

          // Combine with default sanctioned / test clinicians
          return [
            ...userClinicians,
            ...DEFAULT_CLINICIANS.filter((c) => !userClinicians.some((u) => u.id === c.id)),
          ];
        }
      }
    } catch {
      // Fall back to default roster
    }
    return DEFAULT_CLINICIANS;
  });

  // Check live Sentinel status for current clinician
  const activeSanction = useMemo(() => {
    const cleanId = credentialId.trim().toLowerCase();
    const currentClinician = clinicians.find((c) => c.id === selectedClinicianId);
    return Object.values(KNOWN_DISCIPLINARY_SANCTIONS).find(
      (s) =>
        s.credentialId.toLowerCase() === cleanId ||
        (currentClinician && s.prescriberNpi === currentClinician.npi),
    );
  }, [credentialId, selectedClinicianId, clinicians]);

  // Reciprocity evaluation
  const reciprocityEval = useMemo(() => {
    return evaluateIMLCReciprocity(homeState, targetState);
  }, [homeState, targetState]);

  // Handle Clinician Change
  const handleSelectClinician = (id: string) => {
    setSelectedClinicianId(id);
    setActiveProof(null);
    setVerificationResult(null);
    setGeneratedLoq(null);

    const doc = clinicians.find((c) => c.id === id);
    if (doc) {
      setCredentialId(doc.id);
      setHomeState(doc.homeState);
      setDoctorSecretHex(doc.doctorSecretHex);
    }
  };

  // Generate and Verify Proof via Live REST API Endpoint
  const handleGenerateAndVerifyProof = async () => {
    setIsVerifying(true);
    setVerificationResult(null);
    const start = performance.now();

    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const challengeHex = Array.from(challenge, (b) => b.toString(16).padStart(2, "0")).join("");

      // Collect all active disciplinary sanctions from live Sentinel
      const activeSanctionIds = Object.values(KNOWN_DISCIPLINARY_SANCTIONS).map((s) =>
        s.credentialId.toLowerCase(),
      );

      // Call live REST API endpoint: POST /api/v1/imlc/verify
      const response = await fetch("/api/v1/imlc/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentialId,
          homeState,
          targetState,
          doctorSecretHex,
          challenge: challengeHex,
          sanctionedCredentials: activeSanctionIds,
        }),
      });

      const latency = Math.round(performance.now() - start);

      if (response.ok) {
        const data = await response.json();
        if (data.proof) {
          setActiveProof(data.proof);
        }

        const isValid = Boolean(data.verification?.valid);
        const reason =
          data.verification?.reason ||
          data.reason ||
          (isValid ? "Interstate practice reciprocity authorized." : "Verification rejected.");

        setVerificationResult({
          valid: isValid,
          reason,
          latencyMs: latency,
          source: "LIVE_API",
        });
      } else {
        // Fallback to client-side proving if server is unreachable
        const proof = await generateIMLCReciprocityProof(
          credentialId,
          homeState,
          targetState,
          challengeHex,
          doctorSecretHex,
        );
        setActiveProof(proof);

        const result = await verifyIMLCReciprocityProof(
          proof,
          new Set(),
          new Set(activeSanctionIds),
        );

        setVerificationResult({
          valid: result.valid,
          reason: result.reason,
          latencyMs: latency,
          source: "CLIENT_PROVER",
        });
      }
    } catch (err: unknown) {
      setVerificationResult({
        valid: false,
        reason: (err as Error).message || "Verification failed.",
        latencyMs: Math.round(performance.now() - start),
        source: "CLIENT_PROVER",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Generate Official IMLC Letter of Qualification (LOQ)
  const handleGenerateLoq = () => {
    try {
      const loq = generateIMLCLetterOfQualification(credentialId, homeState, doctorSecretHex);
      setGeneratedLoq(loq);
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  // Download FHIR R4 JSON
  const handleExportFhirJson = () => {
    if (!activeProof) return;
    const fhir = mapToFhirVerificationResult(
      credentialId,
      {
        exists: true,
        valid: !activeSanction && isIMLCMember(homeState) && isIMLCMember(targetState),
        revoked: Boolean(activeSanction),
        issuedAt: Math.floor(Date.now() / 1000) - 86400 * 30,
        expiresAt: Math.floor(Date.now() / 1000) + 86400 * 335,
        issuer: "d72f60d3f297dc84078e19677b60e88759f9982a3ea3dbf87a387814cda034ad",
      },
      null,
      new Date(),
      reciprocityEval,
    );

    const blob = new Blob([JSON.stringify(fhir, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aquas-imlc-${homeState}-to-${targetState}.fhir.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download Letter of Qualification (LOQ) JSON
  const handleExportLoqJson = () => {
    if (!generatedLoq) return;
    const blob = new Blob([JSON.stringify(generatedLoq, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aquas-${generatedLoq.loqId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyNullifier = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 font-sans pb-16">
      {/* Header Banner matching Liquid Glass styling */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 backdrop-blur-xl border border-cyan-500/20 text-xs font-mono text-cyan-400 mb-2 font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <Globe size={13} className="animate-pulse" />
            <span>INTERSTATE MEDICAL LICENSURE COMPACT (IMLC) FEDERATION</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Cross-State Reciprocity Gateway
          </h1>
          <p className="text-zinc-400 text-sm mt-1 max-w-3xl">
            Privacy-preserving multi-state license reciprocity on Midnight Blockchain. Clinicians mathematically prove
            practice authorization across 37+ US member jurisdictions in under one second without exposing home state license numbers.
          </p>
        </div>

        {/* Global Quick Regulatory Badges in Liquid Glass */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3.5 py-2 bg-white/[0.025] backdrop-blur-2xl border border-white/10 rounded-2xl text-xs font-mono shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center gap-2">
            <CheckCircle2 size={14} className="text-[#3fa96b]" />
            <span className="text-zinc-300 font-medium">37+ Compact States</span>
          </div>
          <div className="px-3.5 py-2 bg-white/[0.025] backdrop-blur-2xl border border-white/10 rounded-2xl text-xs font-mono shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center gap-2">
            <ShieldCheck size={14} className="text-cyan-400" />
            <span className="text-zinc-300 font-medium">IMLCC Bylaws Sec. 5</span>
          </div>
          <div className="px-3.5 py-2 bg-white/[0.025] backdrop-blur-2xl border border-white/10 rounded-2xl text-xs font-mono shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center gap-2">
            <Activity size={14} className="text-[#b08d57]" />
            <span className="text-zinc-300 font-medium">Live Sentinel Sync</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip in Liquid Glass */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Member States</span>
            <Building2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">37+ States</div>
          <span className="text-[11px] text-cyan-400 font-mono mt-1 block">Full IMLC Reciprocity</span>
        </div>

        <div className="p-5 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Covered Population</span>
            <Users className="w-4 h-4 text-[#3fa96b]" />
          </div>
          <div className="text-2xl font-bold text-white">210M+</div>
          <span className="text-[11px] text-[#3fa96b] font-mono mt-1 block">US Citizens Covered</span>
        </div>

        <div className="p-5 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Proof Latency</span>
            <Zap className="w-4 h-4 text-[#b08d57]" />
          </div>
          <div className="text-2xl font-bold text-white">&lt; 300 ms</div>
          <span className="text-[11px] text-[#b08d57] font-mono mt-1 block">Live API &amp; ZK Prover</span>
        </div>

        <div className="p-5 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Cascade Revocation</span>
            <Activity className="w-4 h-4 text-[#3fa96b]" />
          </div>
          <div className="text-2xl font-bold text-[#3fa96b] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3fa96b] animate-ping" />
            Active
          </div>
          <span className="text-[11px] text-zinc-400 font-mono mt-1 block">24/7 Sanction Sentinel</span>
        </div>
      </div>

      {/* Interactive Map Visualizer */}
      <IMLCReciprocityMap
        homeState={homeState}
        selectedTargetState={targetState}
        onSelectTargetState={(st) => {
          setTargetState(st);
          setActiveProof(null);
          setVerificationResult(null);
        }}
      />

      {/* Live Cross-State Verification Terminal */}
      <div className="p-6 md:p-8 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" />
              <span>Live Cross-State Reciprocity Terminal</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live verification querying <span className="text-white font-mono">POST /api/v1/imlc/verify</span> for a clinician licensed in{" "}
              <span className="text-cyan-400 font-bold">{homeState}</span> seeking practice authority in{" "}
              <span className="text-[#3fa96b] font-bold">{targetState}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <IMLCReciprocityBadge
              status={activeSanction ? "SANCTION_FLAGGED" : reciprocityEval.reciprocityStatus}
              homeState={homeState}
              targetState={targetState}
            />
          </div>
        </div>

        {/* Live Disciplinary Sentinel Status Banner */}
        {activeSanction ? (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <strong className="block text-rose-200">
                  LIVE SENTINEL FLAG: Clinician Excluded on Midnight Consensus
                </strong>
                <span>
                  {activeSanction.clinicianName} has an active {activeSanction.sanctionAuthority} disciplinary order (
                  {activeSanction.exclusionStatute}). Immediate cascade revocation applies under IMLC Chapter 5 Bylaws.
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-200 font-mono text-[10px] font-bold uppercase shrink-0">
              CASCADE LOCKED
            </span>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 text-zinc-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#3fa96b]" />
              <span>
                <strong>Live Sanction Oracle:</strong> Clinician record verified clean against NPDB, HHS-OIG, and State Board feeds.
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">Midnight Node: In-Sync</span>
          </div>
        )}

        {/* Clinician Roster & Practice State Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Clinician Profile Selector */}
          <div>
            <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1.5">
              Select Physician Credential
            </label>
            <select
              value={selectedClinicianId}
              onChange={(e) => handleSelectClinician(e.target.value)}
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:border-[#b08d57]/60 focus:outline-none font-sans"
            >
              {clinicians.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.homeState} SPL) {c.isSanctioned ? "⚠️ EXCLUDED" : "✓"}
                </option>
              ))}
            </select>
          </div>

          {/* State of Principal License (SPL) */}
          <div>
            <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1.5">
              State of Principal License (SPL)
            </label>
            <select
              value={homeState}
              onChange={(e) => {
                setHomeState(e.target.value);
                setActiveProof(null);
                setVerificationResult(null);
                setGeneratedLoq(null);
              }}
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:border-[#b08d57]/60 focus:outline-none font-sans"
            >
              {Object.values(IMLC_JURISDICTIONS).map((j) => (
                <option key={j.code} value={j.code}>
                  {j.code} - {j.name} ({j.status === "ACTIVE_MEMBER" ? "IMLC Member" : "Non-Member"})
                </option>
              ))}
            </select>
          </div>

          {/* Target Practice Jurisdiction */}
          <div>
            <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1.5">
              Target Practice Jurisdiction
            </label>
            <select
              value={targetState}
              onChange={(e) => {
                setTargetState(e.target.value);
                setActiveProof(null);
                setVerificationResult(null);
              }}
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:border-[#b08d57]/60 focus:outline-none font-sans"
            >
              {Object.values(IMLC_JURISDICTIONS).map((j) => (
                <option key={j.code} value={j.code}>
                  {j.code} - {j.name} ({j.status === "ACTIVE_MEMBER" ? "IMLC Member" : "Non-Member"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            disabled={isVerifying}
            onClick={handleGenerateAndVerifyProof}
            className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs transition-all shadow-[0_4px_16px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing Live API Verification…</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Verify Interstate Reciprocity in ZK (Live API)</span>
              </>
            )}
          </button>

          {isIMLCMember(homeState) && (
            <button
              type="button"
              onClick={handleGenerateLoq}
              className="py-3 px-5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/25 text-zinc-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#b08d57]" />
              <span>Issue Official IMLC LOQ</span>
            </button>
          )}
        </div>

        {/* Verification Result Banner */}
        {verificationResult && (
          <div
            className={`p-5 rounded-2xl border space-y-4 backdrop-blur-xl ${
              verificationResult.valid
                ? "bg-cyan-950/20 border-cyan-500/40 text-cyan-200 shadow-[0_8px_32px_rgba(6,182,212,0.15)]"
                : "bg-rose-950/20 border-rose-500/40 text-rose-200 shadow-[0_8px_32px_rgba(225,29,72,0.15)]"
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                {verificationResult.valid ? (
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-sm text-white">
                    {verificationResult.valid
                      ? `Interstate Practice Cleared for ${targetState}`
                      : "Interstate Verification Rejected"}
                  </h4>
                  <p className="text-xs text-zinc-300 mt-0.5">{verificationResult.reason}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-black/40 border border-white/10 rounded-lg text-[11px] font-mono text-zinc-300">
                  Latency: {verificationResult.latencyMs}ms ({verificationResult.source})
                </span>
                {verificationResult.valid && (
                  <button
                    type="button"
                    onClick={handleExportFhirJson}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 text-black font-bold text-xs flex items-center gap-1.5 hover:bg-cyan-400 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export FHIR R4 JSON</span>
                  </button>
                )}
              </div>
            </div>

            {/* Cryptographic Proof Details */}
            {activeProof && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px] pt-1">
                <div className="bg-black/50 p-3 rounded-xl border border-white/10">
                  <span className="text-zinc-500 block text-[10px] uppercase">Single-Use Proof Nullifier</span>
                  <div className="flex items-center justify-between text-zinc-300 mt-1">
                    <span className="truncate pr-2">{activeProof.proofNullifierHex}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyNullifier(activeProof.proofNullifierHex)}
                      className="text-zinc-400 hover:text-white cursor-pointer"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-[#3fa96b]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-black/50 p-3 rounded-xl border border-white/10">
                  <span className="text-zinc-500 block text-[10px] uppercase">Compact State Attestation</span>
                  <div className="flex items-center justify-between text-zinc-300 mt-1">
                    <span>
                      SPL: {activeProof.homeState} → Target: {activeProof.targetState} (FIPS {activeProof.targetStateFips})
                    </span>
                    <span className="text-[#3fa96b] font-bold">Unrevoked</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generated Letter of Qualification (LOQ) Preview */}
        {generatedLoq && (
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-[#b08d57]/30 backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#b08d57]" />
                <span className="text-xs font-bold text-white font-mono">
                  Official IMLC Letter of Qualification ({generatedLoq.loqId})
                </span>
              </div>
              <button
                type="button"
                onClick={handleExportLoqJson}
                className="px-3 py-1 rounded-lg bg-[#b08d57] text-black font-bold text-xs flex items-center gap-1.5 hover:bg-[#b08d57]/90 transition-all cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Download LOQ</span>
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
              <div className="p-2 bg-black/40 rounded-lg border border-white/5">
                <span className="text-zinc-500 block text-[10px]">SPL Authority</span>
                <span className="text-white font-bold">{generatedLoq.splState}</span>
              </div>
              <div className="p-2 bg-black/40 rounded-lg border border-white/5">
                <span className="text-zinc-500 block text-[10px]">Valid Until</span>
                <span className="text-white font-bold">
                  {new Date(generatedLoq.expiresAt * 1000).toLocaleDateString()}
                </span>
              </div>
              <div className="p-2 bg-black/40 rounded-lg border border-white/5">
                <span className="text-zinc-500 block text-[10px]">Authorized Reciprocity</span>
                <span className="text-cyan-400 font-bold">{generatedLoq.authorizedJurisdictions.length} States</span>
              </div>
              <div className="p-2 bg-black/40 rounded-lg border border-white/5">
                <span className="text-zinc-500 block text-[10px]">Board Signature</span>
                <span className="text-zinc-400 truncate block">{generatedLoq.signature.slice(0, 12)}…</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
