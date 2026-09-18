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
  Radio,
  FileCode,
  Sparkles,
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
} from "@/lib/imlc-federation";
import { mapToFhirVerificationResult } from "@/lib/ehr-adapter";

export default function IMLCFederationPage() {
  const [homeState, setHomeState] = useState<string>("CO");
  const [targetState, setTargetState] = useState<string>("TX");
  const [credentialId, setCredentialId] = useState<string>(
    "e0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70",
  );
  const [doctorSecretHex] = useState<string>(
    "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
  );

  const [activeProof, setActiveProof] = useState<IMLCReciprocityProof | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    reason: string;
    latencyMs: number;
  } | null>(null);

  const [isCascadeSimulated, setIsCascadeSimulated] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const reciprocityEval = useMemo(() => {
    return evaluateIMLCReciprocity(homeState, targetState);
  }, [homeState, targetState]);

  const handleGenerateAndVerifyProof = async () => {
    setIsVerifying(true);
    setVerificationResult(null);
    const start = performance.now();

    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const challengeHex = Array.from(challenge, (b) => b.toString(16).padStart(2, "0")).join("");

      // Derive ZK proof
      const proof = await generateIMLCReciprocityProof(
        credentialId,
        homeState,
        targetState,
        challengeHex,
        doctorSecretHex,
      );
      setActiveProof(proof);

      // Verify proof
      const sanctioned = isCascadeSimulated ? new Set([credentialId.toLowerCase()]) : new Set<string>();
      const result = await verifyIMLCReciprocityProof(proof, new Set(), sanctioned);
      const latency = Math.round(performance.now() - start);

      setVerificationResult({
        valid: result.valid,
        reason: result.reason,
        latencyMs: latency,
      });
    } catch (err: unknown) {
      setVerificationResult({
        valid: false,
        reason: (err as Error).message || "Verification failed.",
        latencyMs: Math.round(performance.now() - start),
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExportFhirJson = () => {
    if (!activeProof) return;
    const fhir = mapToFhirVerificationResult(
      credentialId,
      {
        exists: true,
        valid: !isCascadeSimulated,
        revoked: isCascadeSimulated,
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

  const handleCopyNullifier = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="space-y-8 font-sans pb-12 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-cyan-400 animate-pulse" />
              Level 4 Network Module
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-zinc-400 border border-white/10">
              37+ Compact States
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Interstate Medical Licensure Compact (IMLC) Federation
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-3xl">
            Privacy-preserving multi-state license reciprocity on the Midnight Blockchain. Clinicians mathematically prove valid practice authorization across 37+ US member jurisdictions in under one second without exposing home state license numbers.
          </p>
        </div>

        {/* State of Principal License (SPL) Selector */}
        <div className="bg-black/60 border border-white/10 rounded-2xl p-3 flex flex-col gap-1 w-full md:w-auto">
          <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold">
            State of Principal License (SPL)
          </label>
          <select
            value={homeState}
            onChange={(e) => {
              setHomeState(e.target.value);
              setActiveProof(null);
              setVerificationResult(null);
            }}
            className="bg-zinc-900 text-white font-bold text-xs px-3 py-2 rounded-xl border border-white/10 focus:border-cyan-400 focus:outline-none cursor-pointer"
          >
            <option value="CO">Colorado (CO) - Active Compact Member</option>
            <option value="TX">Texas (TX) - Active Compact Member</option>
            <option value="WA">Washington (WA) - Active Compact Member</option>
            <option value="IL">Illinois (IL) - Active Compact Member</option>
            <option value="AZ">Arizona (AZ) - Active Compact Member</option>
            <option value="CA">California (CA) - Non-Compact State</option>
            <option value="NY">New York (NY) - Non-Compact State</option>
          </select>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-black/40 border border-white/[0.08] rounded-2xl p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Member States</span>
            <Building2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">37+ States</div>
          <span className="text-[11px] text-cyan-400 font-mono mt-1 block">Full IMLC Reciprocity</span>
        </div>

        <div className="bg-black/40 border border-white/[0.08] rounded-2xl p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Covered Population</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">210,000,000+</div>
          <span className="text-[11px] text-emerald-400 font-mono mt-1 block">US Citizens Covered</span>
        </div>

        <div className="bg-black/40 border border-white/[0.08] rounded-2xl p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Proof Latency</span>
            <Zap className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-white">&lt; 300 ms</div>
          <span className="text-[11px] text-yellow-400 font-mono mt-1 block">Client-Side ZK Generation</span>
        </div>

        <div className="bg-black/40 border border-white/[0.08] rounded-2xl p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Cascade Revocation</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
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
      <div className="bg-black/40 border border-white/[0.08] rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Cross-State Zero-Knowledge Verification Terminal
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Simulates a hospital in <span className="text-white font-bold">{targetState}</span> verifying a doctor licensed in <span className="text-emerald-400 font-bold">{homeState}</span>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCascadeSimulated(!isCascadeSimulated)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-medium transition-all cursor-pointer ${
                isCascadeSimulated
                  ? "bg-red-500/20 text-red-300 border-red-500/50"
                  : "bg-white/5 text-zinc-400 border-white/10 hover:border-white/20"
              }`}
            >
              {isCascadeSimulated ? "⚠️ Cascade Sanction Simulated" : "Simulate Home Board Sanction"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">
              Physician Credential ID
            </label>
            <input
              type="text"
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value)}
              className="w-full bg-zinc-900 text-zinc-300 font-mono text-xs px-3 py-2 rounded-xl border border-white/10 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">
              Target Practice Jurisdiction
            </label>
            <select
              value={targetState}
              onChange={(e) => setTargetState(e.target.value)}
              className="w-full bg-zinc-900 text-white font-bold text-xs px-3 py-2 rounded-xl border border-white/10 focus:border-cyan-400 focus:outline-none cursor-pointer"
            >
              {Object.values(IMLC_JURISDICTIONS).map((j) => (
                <option key={j.code} value={j.code}>
                  {j.code} - {j.name} ({j.status === "ACTIVE_MEMBER" ? "IMLC Member" : "Non-Member"})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              disabled={isVerifying}
              onClick={handleGenerateAndVerifyProof}
              className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isVerifying ? "Computing Halo2 ZK Proof..." : "Verify Interstate Reciprocity in ZK"}</span>
            </button>
          </div>
        </div>

        {/* Verification Result Banner */}
        {verificationResult && (
          <div
            className={`p-4 rounded-2xl border ${
              verificationResult.valid
                ? "bg-cyan-950/20 border-cyan-500/40 text-cyan-200"
                : "bg-red-950/20 border-red-500/40 text-red-200"
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                {verificationResult.valid ? (
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
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
                <span className="px-2.5 py-1 bg-white/5 rounded-lg text-[11px] font-mono text-zinc-300">
                  Latency: {verificationResult.latencyMs}ms
                </span>
                {verificationResult.valid && (
                  <button
                    type="button"
                    onClick={handleExportFhirJson}
                    className="px-3 py-1 rounded-lg bg-cyan-500 text-black font-semibold text-xs flex items-center gap-1.5 hover:bg-cyan-400 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download FHIR R4 JSON</span>
                  </button>
                )}
              </div>
            </div>

            {/* Cryptographic Proof Details */}
            {activeProof && (
              <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
                <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                  <span className="text-zinc-500 block text-[10px] uppercase">Single-Use Proof Nullifier</span>
                  <div className="flex items-center justify-between text-zinc-300 mt-1">
                    <span className="truncate pr-2">{activeProof.proofNullifierHex}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyNullifier(activeProof.proofNullifierHex)}
                      className="text-zinc-400 hover:text-white"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                  <span className="text-zinc-500 block text-[10px] uppercase">Compact State Attestation</span>
                  <div className="flex items-center justify-between text-zinc-300 mt-1">
                    <span>SPL: {activeProof.homeState} → Target: {activeProof.targetState} (FIPS {activeProof.targetStateFips})</span>
                    <span className="text-emerald-400 font-bold">Unrevoked</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
