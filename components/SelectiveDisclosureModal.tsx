"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Award,
  Pill,
  GraduationCap,
  FileCheck,
  X,
  Zap,
  Lock,
  Shield,
  EyeOff,
  CheckCircle2,
  Printer,
} from "lucide-react";
import type { SelectiveDisclosureConfig, DoctorAttributes } from "@/lib/selective-disclosure";
import { shortId } from "@/lib/license-registry";
import {
  MALPRACTICE_CARRIERS,
  evaluateUnderwritingClearance,
  type UnderwritingClearanceProof,
  type MalpracticePolicy,
  type MalpracticeClaim,
} from "@/lib/malpractice-insurance";
import { printInsuranceClearanceCertificate } from "@/lib/audit-exporter";

interface SelectiveDisclosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorLabel: string;
  credentialId: string;
  attributes: DoctorAttributes;
  onGenerateProof: (config: SelectiveDisclosureConfig) => void;
  isGenerating: boolean;
  onGenerateInsuranceProof?: (proof: UnderwritingClearanceProof) => void;
}

export default function SelectiveDisclosureModal({
  isOpen,
  onClose,
  doctorLabel,
  credentialId,
  attributes,
  onGenerateProof,
  isGenerating,
  onGenerateInsuranceProof,
}: SelectiveDisclosureModalProps) {
  // Modal Navigation Tab
  const [activeTab, setActiveTab] = useState<"licensure" | "malpractice">("licensure");

  // Licensure selective disclosure options
  const [config, setConfig] = useState<SelectiveDisclosureConfig>({
    includeSpecialty: true,
    includeDeaAuthority: true,
    includeCmeThreshold: true,
    includeCleanRecord: true,
  });

  // Malpractice Underwriting Options
  const [selectedCarrier, setSelectedCarrier] = useState<string>("CARRIER-MEDPRO-01");
  const [policyTier, setPolicyTier] = useState<"standard" | "surgical">("standard");
  const [hasTailCoverage, setHasTailCoverage] = useState<boolean>(true);
  const [requireCleanClaims, setRequireCleanClaims] = useState<boolean>(true);

  // Proving states
  const [isGeneratingInsurance, setIsGeneratingInsurance] = useState<boolean>(false);
  const [insuranceProof, setInsuranceProof] = useState<UnderwritingClearanceProof | null>(null);

  if (!isOpen) return null;

  const toggleOption = (key: keyof SelectiveDisclosureConfig) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerateInsurance = async () => {
    setIsGeneratingInsurance(true);
    setInsuranceProof(null);

    try {
      // Simulate real-time Midnight proving latency
      await new Promise((resolve) => setTimeout(resolve, 380));

      const now = Math.floor(Date.now() / 1000);
      const perClaim = policyTier === "surgical" ? 2_000_000 : 1_000_000;
      const aggregate = policyTier === "surgical" ? 4_000_000 : 3_000_000;

      const mockPolicy: MalpracticePolicy = {
        policyNumber: "POL-MP-984210",
        carrierId: selectedCarrier,
        insuredDoctorNpi: "1948201938",
        policyStatus: "ACTIVE",
        coverageType: "CLAIMS_MADE",
        perClaimLimitUsd: perClaim,
        aggregateLimitUsd: aggregate,
        hasTailCoverage,
        retroactiveDate: now - 5 * 365 * 86400,
        effectiveDate: now - 30 * 86400,
        expirationDate: now + 335 * 86400,
      };

      // Real-world scenario: doctor had 2 frivolous malpractice lawsuits filed against them
      // that were dismissed with prejudice ($0 indemnity paid).
      // Standard paper loss-run reports would prejudice credentialing committees for weeks!
      // In Aquas Midnight ZK, these 2 dismissed lawsuits are 100% shielded and withheld!
      const mockClaims: MalpracticeClaim[] = [
        {
          claimId: "CLM-2023-FRIV-01",
          incidentDate: now - 720 * 86400,
          claimReportedDate: now - 680 * 86400,
          claimDisposition: "DISMISSED_WITH_PREJUDICE",
          indemnityPaidUsd: 0,
          defenseExpenseUsd: 14500,
          allegationCategory: "DIAGNOSTIC_DELAY",
        },
        {
          claimId: "CLM-2024-NONMERIT-02",
          incidentDate: now - 380 * 86400,
          claimReportedDate: now - 350 * 86400,
          claimDisposition: "DISMISSED_WITHOUT_PREJUDICE",
          indemnityPaidUsd: 0,
          defenseExpenseUsd: 8200,
          allegationCategory: "SURGICAL_OUTCOME",
        },
      ];

      const challenge = "HOSP-RISK-COMMITTEE-VERIFY-2026";
      const doctorSecret = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";

      const proof = await evaluateUnderwritingClearance(
        mockPolicy,
        mockClaims,
        {
          minPerClaimLimitUsd: 1_000_000,
          minAggregateLimitUsd: 3_000_000,
          requireTailCoverage: hasTailCoverage,
          maxPaidIndemnityUsd: requireCleanClaims ? 0 : 50_000,
          lookbackYears: 5,
        },
        challenge,
        doctorSecret,
        now,
      );

      setInsuranceProof(proof);
      if (onGenerateInsuranceProof) {
        onGenerateInsuranceProof(proof);
      }
    } finally {
      setIsGeneratingInsurance(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(18, 24, 31, 0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 50,
        display: "grid",
        placeItems: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "580px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--paper-raised)",
          border: "1px solid var(--ink)",
          padding: "26px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "12px",
          }}
        >
          <div>
            <span className="eyebrow" style={{ margin: 0 }}>
              Zero-Knowledge Prover
            </span>
            <h2
              style={{
                margin: "4px 0 0",
                fontFamily: "var(--font-serif)",
                fontSize: "22px",
                letterSpacing: "-0.03em",
              }}
            >
              Selective Disclosure &amp; Underwriting
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--muted)",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <p
          style={{
            margin: "0 0 16px",
            fontSize: "12px",
            color: "var(--muted)",
            lineHeight: 1.45,
          }}
        >
          Mathematically prove clinical licensure, DEA privileges, and confidential malpractice
          underwriting to verifiers without disclosing raw personal records or dismissed lawsuits.
        </p>

        {/* Doctor Info Chip */}
        <div
          style={{
            padding: "8px 12px",
            background: "var(--parchment)",
            border: "1px solid var(--line)",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "11px",
          }}
        >
          <div>
            <strong>{doctorLabel}</strong>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--muted)" }}>
              Credential: {shortId(credentialId)}
            </div>
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              padding: "2px 6px",
              background: "rgba(63, 169, 107, 0.15)",
              color: "var(--verified-mint)",
              fontWeight: 700,
              border: "1px solid rgba(63, 169, 107, 0.3)",
            }}
          >
            ACTIVE LICENSURE
          </span>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px",
            padding: "4px",
            background: "rgba(0,0,0,0.06)",
            border: "1px solid var(--line)",
            marginBottom: "18px",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("licensure")}
            style={{
              padding: "7px 10px",
              border: "none",
              background: activeTab === "licensure" ? "var(--paper-raised)" : "transparent",
              fontWeight: activeTab === "licensure" ? 700 : 500,
              color: activeTab === "licensure" ? "var(--ink)" : "var(--muted)",
              cursor: "pointer",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              boxShadow: activeTab === "licensure" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            <ShieldCheck size={14} color={activeTab === "licensure" ? "var(--verified-mint)" : "inherit"} />
            <span>Licensure &amp; DEA Gates</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("malpractice")}
            style={{
              padding: "7px 10px",
              border: "none",
              background: activeTab === "malpractice" ? "var(--paper-raised)" : "transparent",
              fontWeight: activeTab === "malpractice" ? 700 : 500,
              color: activeTab === "malpractice" ? "var(--ink)" : "var(--muted)",
              cursor: "pointer",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              boxShadow: activeTab === "malpractice" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            <Shield size={14} color={activeTab === "malpractice" ? "var(--seal-brass)" : "inherit"} />
            <span>Malpractice &amp; Clean Claims</span>
          </button>
        </div>

        {/* TAB 1: LICENSURE & DEA GATES */}
        {activeTab === "licensure" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginBottom: "20px" }}>
            {/* Base Licensure (Mandatory) */}
            <div
              style={{
                padding: "10px 12px",
                border: "1px solid var(--line)",
                background: "var(--parchment)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                opacity: 0.9,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldCheck size={15} color="var(--verified-mint)" />
                <div>
                  <strong style={{ fontSize: "11px", display: "block" }}>Active Board Licensure</strong>
                  <small style={{ fontSize: "9.5px", color: "var(--muted)" }}>
                    Proves on-chain license validity and non-revocation (Mandatory ZK Circuit).
                  </small>
                </div>
              </div>
              <Lock size={13} color="var(--muted)" />
            </div>

            {/* Specialty */}
            <div
              onClick={() => toggleOption("includeSpecialty")}
              style={{
                padding: "10px 12px",
                border: "1px solid " + (config.includeSpecialty ? "var(--ink)" : "var(--line)"),
                background: config.includeSpecialty ? "var(--parchment)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Award size={15} color="var(--seal-brass)" />
                <div>
                  <strong style={{ fontSize: "11px", display: "block" }}>
                    Specialty Certification ({attributes.specialty || "General Medicine"})
                  </strong>
                  <small style={{ fontSize: "9.5px", color: "var(--muted)" }}>
                    Disclose verified board sub-specialization without revealing exam transcripts.
                  </small>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.includeSpecialty}
                onChange={() => {}}
                style={{ cursor: "pointer" }}
              />
            </div>

            {/* DEA Schedule II-V Prescriptive Authority */}
            <div
              onClick={() => toggleOption("includeDeaAuthority")}
              style={{
                padding: "10px 12px",
                border: "1px solid " + (config.includeDeaAuthority ? "var(--ink)" : "var(--line)"),
                background: config.includeDeaAuthority ? "var(--parchment)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Pill size={15} color="var(--seal-brass)" />
                <div>
                  <strong style={{ fontSize: "11px", display: "block" }}>
                    DEA Schedule II–V Controlled Substance Authority
                  </strong>
                  <small style={{ fontSize: "9.5px", color: "var(--muted)" }}>
                    Proves prescribing eligibility without exposing raw DEA registration number.
                  </small>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.includeDeaAuthority}
                onChange={() => {}}
                style={{ cursor: "pointer" }}
              />
            </div>

            {/* CME Threshold */}
            <div
              onClick={() => toggleOption("includeCmeThreshold")}
              style={{
                padding: "10px 12px",
                border: "1px solid " + (config.includeCmeThreshold ? "var(--ink)" : "var(--line)"),
                background: config.includeCmeThreshold ? "var(--parchment)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <GraduationCap size={15} color="var(--seal-brass)" />
                <div>
                  <strong style={{ fontSize: "11px", display: "block" }}>
                    CME Compliance Gate (≥ 50 Credit Hours)
                  </strong>
                  <small style={{ fontSize: "9.5px", color: "var(--muted)" }}>
                    Proves doctor completed ≥50 CME hours without revealing course names or grades.
                  </small>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.includeCmeThreshold}
                onChange={() => {}}
                style={{ cursor: "pointer" }}
              />
            </div>

            {/* Clean Disciplinary Record */}
            <div
              onClick={() => toggleOption("includeCleanRecord")}
              style={{
                padding: "10px 12px",
                border: "1px solid " + (config.includeCleanRecord ? "var(--ink)" : "var(--line)"),
                background: config.includeCleanRecord ? "var(--parchment)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileCheck size={15} color="var(--seal-brass)" />
                <div>
                  <strong style={{ fontSize: "11px", display: "block" }}>
                    NPDB Clean Record Attestation
                  </strong>
                  <small style={{ fontSize: "9.5px", color: "var(--muted)" }}>
                    Proves zero active disciplinary actions or malpractice sanctions.
                  </small>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.includeCleanRecord}
                onChange={() => {}}
                style={{ cursor: "pointer" }}
              />
            </div>
          </div>
        )}

        {/* TAB 2: MALPRACTICE & CLEAN CLAIMS (ZERO BIAS) */}
        {activeTab === "malpractice" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            {/* Carrier Selection */}
            <div>
              <label style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                Accredited Underwriting Carrier
              </label>
              <select
                value={selectedCarrier}
                onChange={(e) => setSelectedCarrier(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "11px",
                  background: "var(--parchment)",
                  border: "1px solid var(--line)",
                  fontFamily: "inherit",
                }}
              >
                {Object.values(MALPRACTICE_CARRIERS).map((c) => (
                  <option key={c.carrierId} value={c.carrierId}>
                    {c.name} · AM Best: {c.amBestRating}
                  </option>
                ))}
              </select>
            </div>

            {/* Policy Limits & Tail Endorsement Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div
                onClick={() => setPolicyTier("standard")}
                style={{
                  padding: "8px 10px",
                  border: "1px solid " + (policyTier === "standard" ? "var(--ink)" : "var(--line)"),
                  background: policyTier === "standard" ? "var(--parchment)" : "transparent",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700 }}>$1M / $3M Limits</div>
                <div style={{ fontSize: "9.5px", color: "var(--muted)" }}>Standard Hospital Minimum</div>
              </div>
              <div
                onClick={() => setPolicyTier("surgical")}
                style={{
                  padding: "8px 10px",
                  border: "1px solid " + (policyTier === "surgical" ? "var(--ink)" : "var(--line)"),
                  background: policyTier === "surgical" ? "var(--parchment)" : "transparent",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700 }}>$2M / $4M Limits</div>
                <div style={{ fontSize: "9.5px", color: "var(--muted)" }}>Surgical &amp; High-Risk Tier</div>
              </div>
            </div>

            {/* Tail Coverage & 5-Year Clean Claims Toggles */}
            <div
              onClick={() => setHasTailCoverage(!hasTailCoverage)}
              style={{
                padding: "9px 12px",
                border: "1px solid " + (hasTailCoverage ? "var(--ink)" : "var(--line)"),
                background: hasTailCoverage ? "var(--parchment)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <div>
                <strong style={{ fontSize: "11px", display: "block" }}>Active Tail Coverage (ERE)</strong>
                <small style={{ fontSize: "9.5px", color: "var(--muted)" }}>
                  Extended reporting endorsement protecting prior retroactive acts.
                </small>
              </div>
              <input type="checkbox" checked={hasTailCoverage} onChange={() => {}} />
            </div>

            <div
              onClick={() => setRequireCleanClaims(!requireCleanClaims)}
              style={{
                padding: "9px 12px",
                border: "1px solid " + (requireCleanClaims ? "var(--ink)" : "var(--line)"),
                background: requireCleanClaims ? "var(--parchment)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <div>
                <strong style={{ fontSize: "11px", display: "block" }}>5-Year Clean Claims History</strong>
                <small style={{ fontSize: "9.5px", color: "var(--muted)" }}>
                  Proves ≤ $0 paid indemnity payouts over past 5 years.
                </small>
              </div>
              <input type="checkbox" checked={requireCleanClaims} onChange={() => {}} />
            </div>

            {/* SIDE-BY-SIDE PRIVACY INSPECTOR */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                padding: "10px",
                background: "rgba(0,0,0,0.03)",
                border: "1px solid var(--line)",
                fontSize: "10px",
              }}
            >
              {/* Disclosed */}
              <div>
                <div style={{ fontWeight: 700, color: "var(--verified-mint)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <CheckCircle2 size={12} />
                  <span>PROVEN TO HOSPITAL</span>
                </div>
                <div style={{ color: "var(--muted)", lineHeight: 1.4 }}>
                  • Active Policy Limits (${policyTier === "surgical" ? "2M/4M" : "1M/3M"})<br />
                  • {hasTailCoverage ? "Tail Coverage Endorsement" : "No Tail Coverage"}<br />
                  • 5-Yr Zero-Indemnity Clean Record<br />
                  • Single-Use ZK Nullifier
                </div>
              </div>

              {/* Shielded */}
              <div>
                <div style={{ fontWeight: 700, color: "var(--seal-brass)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <EyeOff size={12} />
                  <span>100% SHIELDED (ZERO BIAS)</span>
                </div>
                <div style={{ color: "var(--muted)", lineHeight: 1.4 }}>
                  • 2 Dismissed Lawsuits Withheld<br />
                  • Carrier Defense Legal Bills Redacted<br />
                  • Non-Meritorious Claims Hidden<br />
                  • 0 Exposure to Paper Loss Runs
                </div>
              </div>
            </div>

            {/* Success Certificate Preview if proof exists */}
            {insuranceProof && (
              <div
                style={{
                  padding: "10px 12px",
                  background: "rgba(63, 169, 107, 0.08)",
                  border: "1px solid rgba(63, 169, 107, 0.3)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--verified-mint)" }}>
                    ✓ Underwriting Clearance Approved
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--muted)" }}>
                    Nullifier: {insuranceProof.challengeNullifier.slice(0, 16)}…
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => printInsuranceClearanceCertificate(insuranceProof)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--line)",
                    padding: "4px 8px",
                    cursor: "pointer",
                    fontSize: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Printer size={12} />
                  <span>Print JCAHO Seal</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 1AM Prover Banner */}
        <div
          style={{
            padding: "8px 12px",
            border: "1px solid rgba(176, 141, 87, 0.4)",
            background: "rgba(176, 141, 87, 0.08)",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "10.5px",
          }}
        >
          <Zap size={14} color="var(--seal-brass)" />
          <div>
            <strong>1AM Proofstation Enabled</strong>
            <div style={{ color: "var(--muted)", fontSize: "9.5px" }}>
              Zero-knowledge proof generated and signed via Midnight Halo2 circuits with zero gas fees.
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button
            type="button"
            className="secondary-btn"
            style={{
              padding: "7px 14px",
              border: "1px solid var(--line)",
              background: "transparent",
              cursor: "pointer",
              fontSize: "11px",
            }}
            onClick={onClose}
            disabled={isGenerating || isGeneratingInsurance}
          >
            Cancel
          </button>

          {activeTab === "licensure" ? (
            <button
              type="button"
              className="notary-cta"
              style={{ minHeight: "36px", padding: "0 18px", fontSize: "11px" }}
              onClick={() => onGenerateProof(config)}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating ZK Proof via 1AM…" : "Generate Proof & Sign"}
            </button>
          ) : (
            <button
              type="button"
              className="notary-cta"
              style={{ minHeight: "36px", padding: "0 18px", fontSize: "11px" }}
              onClick={handleGenerateInsurance}
              disabled={isGeneratingInsurance}
            >
              {isGeneratingInsurance
                ? "Generating Underwriting Proof…"
                : insuranceProof
                ? "Re-Generate Clearance Proof"
                : "Generate Underwriting Proof"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
