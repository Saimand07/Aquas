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
} from "lucide-react";
import type { SelectiveDisclosureConfig, DoctorAttributes } from "@/lib/selective-disclosure";
import { shortId } from "@/lib/license-registry";

interface SelectiveDisclosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorLabel: string;
  credentialId: string;
  attributes: DoctorAttributes;
  onGenerateProof: (config: SelectiveDisclosureConfig) => void;
  isGenerating: boolean;
}

export default function SelectiveDisclosureModal({
  isOpen,
  onClose,
  doctorLabel,
  credentialId,
  attributes,
  onGenerateProof,
  isGenerating,
}: SelectiveDisclosureModalProps) {
  const [config, setConfig] = useState<SelectiveDisclosureConfig>({
    includeSpecialty: true,
    includeDeaAuthority: true,
    includeCmeThreshold: true,
    includeCleanRecord: true,
  });

  if (!isOpen) return null;

  const toggleOption = (key: keyof SelectiveDisclosureConfig) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
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
          maxWidth: "540px",
          background: "var(--paper-raised)",
          border: "1px solid var(--ink)",
          padding: "28px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        }}
      >
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <span className="eyebrow" style={{ margin: 0 }}>Zero-Knowledge Prover</span>
            <h2 style={{ margin: "4px 0 0", fontFamily: "var(--font-serif)", fontSize: "24px", letterSpacing: "-0.03em" }}>
              Selective Disclosure Proof
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)" }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ margin: "0 0 20px", fontSize: "13px", color: "var(--muted)", lineHeight: 1.5 }}>
          Choose which private credentials and attestation thresholds to mathematically prove to the verifier without disclosing your raw personal files or serial numbers.
        </p>

        {/* Doctor Info Chip */}
        <div
          style={{
            padding: "10px 14px",
            background: "var(--parchment)",
            border: "1px solid var(--line)",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12px",
          }}
        >
          <div>
            <strong>{doctorLabel}</strong>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--muted)" }}>
              Credential ID: {shortId(credentialId)}
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

        {/* Selective Disclosure Toggles */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          {/* Base Licensure (Mandatory) */}
          <div
            style={{
              padding: "12px 14px",
              border: "1px solid var(--line)",
              background: "var(--parchment)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: 0.9,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <ShieldCheck size={16} color="var(--verified-mint)" />
              <div>
                <strong style={{ fontSize: "12px", display: "block" }}>Active Board Licensure</strong>
                <small style={{ fontSize: "10px", color: "var(--muted)" }}>
                  Proves on-chain license validity and non-revocation (Mandatory ZK Circuit).
                </small>
              </div>
            </div>
            <Lock size={14} color="var(--muted)" />
          </div>

          {/* Specialty */}
          <div
            onClick={() => toggleOption("includeSpecialty")}
            style={{
              padding: "12px 14px",
              border: "1px solid " + (config.includeSpecialty ? "var(--ink)" : "var(--line)"),
              background: config.includeSpecialty ? "var(--parchment)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Award size={16} color="var(--seal-brass)" />
              <div>
                <strong style={{ fontSize: "12px", display: "block" }}>
                  Specialty Certification ({attributes.specialty || "General Medicine"})
                </strong>
                <small style={{ fontSize: "10px", color: "var(--muted)" }}>
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
              padding: "12px 14px",
              border: "1px solid " + (config.includeDeaAuthority ? "var(--ink)" : "var(--line)"),
              background: config.includeDeaAuthority ? "var(--parchment)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Pill size={16} color="var(--seal-brass)" />
              <div>
                <strong style={{ fontSize: "12px", display: "block" }}>
                  DEA Schedule II–V Controlled Substance Authority
                </strong>
                <small style={{ fontSize: "10px", color: "var(--muted)" }}>
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
              padding: "12px 14px",
              border: "1px solid " + (config.includeCmeThreshold ? "var(--ink)" : "var(--line)"),
              background: config.includeCmeThreshold ? "var(--parchment)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <GraduationCap size={16} color="var(--seal-brass)" />
              <div>
                <strong style={{ fontSize: "12px", display: "block" }}>
                  CME Compliance Gate (≥ 50 Credit Hours)
                </strong>
                <small style={{ fontSize: "10px", color: "var(--muted)" }}>
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
              padding: "12px 14px",
              border: "1px solid " + (config.includeCleanRecord ? "var(--ink)" : "var(--line)"),
              background: config.includeCleanRecord ? "var(--parchment)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <FileCheck size={16} color="var(--seal-brass)" />
              <div>
                <strong style={{ fontSize: "12px", display: "block" }}>
                  NPDB Clean Record Attestation
                </strong>
                <small style={{ fontSize: "10px", color: "var(--muted)" }}>
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

        {/* 1AM Prover Banner */}
        <div
          style={{
            padding: "10px 14px",
            border: "1px solid rgba(176, 141, 87, 0.4)",
            background: "rgba(176, 141, 87, 0.08)",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "11px",
          }}
        >
          <Zap size={15} color="var(--seal-brass)" />
          <div>
            <strong>1AM Proofstation Enabled</strong>
            <div style={{ color: "var(--muted)", fontSize: "10px" }}>
              Zero-knowledge proof will be generated and signed securely via 1AM with zero gas fees.
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: "8px 16px", border: "1px solid var(--line)", background: "transparent", cursor: "pointer", fontSize: "12px" }}
            onClick={onClose}
            disabled={isGenerating}
          >
            Cancel
          </button>
          <button
            type="button"
            className="notary-cta"
            style={{ minHeight: "40px", padding: "0 20px", fontSize: "12px" }}
            onClick={() => onGenerateProof(config)}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating ZK Proof via 1AM…" : "Generate Proof & Sign"}
          </button>
        </div>
      </div>
    </div>
  );
}
