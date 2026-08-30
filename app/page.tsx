"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  Server,
  FileCheck2,
  Activity,
  Smartphone,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Zap,
  Globe,
} from "lucide-react";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ?? "";

function BrandSeal() {
  return (
    <span className="brand-seal" aria-hidden="true">
      <i />
      <b />
    </span>
  );
}

export default function LandingPage() {
  const liveMode = Boolean(CONTRACT_ADDRESS);
  const [demoState, setDemoState] = useState<"idle" | "proving" | "verified">("idle");

  const runDemoProof = async () => {
    setDemoState("proving");
    await new Promise((resolve) => setTimeout(resolve, 800));
    setDemoState("verified");
  };

  return (
    <main className="app-shell">
      {/* Topbar Navigation */}
      <header className="topbar">
        <Link href="/" className="brand">
          <BrandSeal />
          <span>Aquas</span>
          <small>MEDICAL REGISTRY</small>
        </Link>
        <nav aria-label="Primary navigation" style={{ flex: 1, display: "flex", justifyContent: "flex-end", marginRight: "16px" }}>
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--seal-brass)",
              background: "transparent",
              border: "1px solid var(--seal-brass)",
              borderRadius: "4px",
              textDecoration: "none",
              transition: "all 0.2s ease"
            }}
            className="hover-bg-brass"
          >
            Launch App
          </Link>
        </nav>
        <div className="network-controls">
          <span className="network-label">
            <i />
            {liveMode ? "PREVIEW · LIVE" : "SANDBOX"}
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ maxWidth: "1280px", margin: "0 auto", padding: "64px 24px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "48px", alignItems: "center" }}>
          {/* Left Column: Headline & Action */}
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "4px 10px", background: "rgba(176, 141, 87, 0.12)", border: "1px solid rgba(176, 141, 87, 0.3)", marginBottom: "20px" }}>
              <Sparkles size={13} color="var(--seal-brass)" />
              <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--seal-brass)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Midnight Network Preview · Zero-Knowledge Licensure
              </span>
            </div>

            <h1 style={{ margin: "0 0 16px", fontFamily: "var(--font-serif)", fontSize: "clamp(36px, 4.5vw, 56px)", letterSpacing: "-0.04em", lineHeight: 1.05 }}>
              The Zero-Knowledge Medical Registry for Sovereign Healthcare.
            </h1>

            <p style={{ margin: "0 0 32px", fontSize: "15px", color: "var(--muted)", lineHeight: 1.6, maxWidth: "560px" }}>
              Instantly verify physician medical credentials across hospitals, EHR systems, and state compacts without centralizing or exposing private practitioner data.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", marginBottom: "32px" }}>
              <Link
                href="/dashboard"
                className="notary-cta"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 24px", fontSize: "13px", textDecoration: "none" }}
              >
                Launch App <ArrowRight size={15} />
              </Link>
              <Link
                href="/batch"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 20px", border: "1px solid var(--line)", background: "var(--paper-raised)", fontSize: "13px", color: "var(--ink)", textDecoration: "none", fontWeight: 600 }}
              >
                Hospital Batch Verifier
              </Link>
            </div>

            {/* Micro stats banner */}
            <div style={{ display: "flex", gap: "24px", borderTop: "1px solid var(--line)", paddingTop: "20px" }}>
              <div>
                <strong style={{ display: "block", fontSize: "20px", fontFamily: "var(--font-serif)" }}>&lt; 0.8s</strong>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>ZK Verification Latency</span>
              </div>
              <div>
                <strong style={{ display: "block", fontSize: "20px", fontFamily: "var(--font-serif)" }}>100%</strong>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>Private & Zero Data Leakage</span>
              </div>
              <div>
                <strong style={{ display: "block", fontSize: "20px", fontFamily: "var(--font-serif)" }}>FHIR R4</strong>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>Native EHR Standard</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Live Proof Simulator */}
          <div style={{ border: "1px solid var(--line)", background: "var(--paper-raised)", padding: "28px", boxShadow: "0 20px 48px rgba(0,0,0,0.08)", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid var(--line)", paddingBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldCheck size={18} color="var(--verified-mint)" />
                <strong style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Live ZK Verification Engine</strong>
              </div>
              <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", padding: "2px 6px", background: "rgba(63, 169, 107, 0.12)", color: "var(--verified-mint)", border: "1px solid rgba(63, 169, 107, 0.3)", fontWeight: 700 }}>
                1AM PROOFSTATION ACTIVE
              </span>
            </div>

            {/* Credential Commitment Mock */}
            <div style={{ background: "var(--parchment)", border: "1px solid var(--line)", padding: "16px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "8px" }}>
                <span style={{ color: "var(--muted)" }}>Target Credential Commitment:</span>
                <code>e0c9d5…1f70</code>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "8px" }}>
                <span style={{ color: "var(--muted)" }}>Issuing State Authority:</span>
                <strong>New York State Medical Board</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                <span style={{ color: "var(--muted)" }}>Prover Architecture:</span>
                <strong>Compact Shielded Ledger (Midnight)</strong>
              </div>
            </div>

            {/* Interactive Trigger */}
            {demoState === "idle" && (
              <button
                onClick={runDemoProof}
                className="notary-cta"
                style={{ width: "100%", padding: "12px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
              >
                <Zap size={14} /> Execute Zero-Knowledge Proof Check
              </button>
            )}

            {demoState === "proving" && (
              <div style={{ textAlign: "center", padding: "12px", background: "var(--parchment)", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--seal-brass)" }}>
                  Computing cryptographic proof on 1AM Proofstation…
                </div>
              </div>
            )}

            {demoState === "verified" && (
              <div style={{ background: "rgba(63, 169, 107, 0.08)", border: "1px solid var(--verified-mint)", padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--verified-mint)", marginBottom: "10px" }}>
                  <CheckCircle2 size={18} />
                  <strong style={{ fontSize: "13px" }}>PRIMARY SOURCE VERIFIED · ZERO PII DISCLOSED</strong>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", fontSize: "10px", fontFamily: "var(--font-mono)" }}>
                  <span style={{ padding: "2px 6px", background: "#fff", border: "1px solid var(--line)" }}>✓ Active Licensure</span>
                  <span style={{ padding: "2px 6px", background: "#fff", border: "1px solid var(--line)" }}>✓ DEA Schedule II-V</span>
                  <span style={{ padding: "2px 6px", background: "#fff", border: "1px solid var(--line)" }}>✓ CME ≥50h</span>
                  <span style={{ padding: "2px 6px", background: "#fff", border: "1px solid var(--line)" }}>✓ Clean NPDB Record</span>
                </div>
                <button
                  onClick={() => setDemoState("idle")}
                  style={{ marginTop: "12px", background: "transparent", border: "none", color: "var(--muted)", fontSize: "11px", textDecoration: "underline", cursor: "pointer" }}
                >
                  Reset Demo
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section style={{ background: "var(--paper-raised)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "80px 24px" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 48px" }}>
            <span className="eyebrow">Enterprise Capabilities</span>
            <h2 style={{ margin: "8px 0 12px", fontFamily: "var(--font-serif)", fontSize: "36px", letterSpacing: "-0.03em" }}>
              Built for Modern Health Systems & Regulators
            </h2>
            <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0 }}>
              Replace 90-day paper credentialing backlogs with automated, cryptographic trust pipelines.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
            {/* Card 1: Batch Verifier */}
            <div style={{ background: "var(--parchment)", border: "1px solid var(--line)", padding: "28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ width: "40px", height: "40px", background: "var(--paper-raised)", border: "1px solid var(--line)", display: "grid", placeItems: "center", marginBottom: "16px" }}>
                  <FileCheck2 size={20} color="var(--seal-brass)" />
                </div>
                <h3 style={{ margin: "0 0 8px", fontFamily: "var(--font-serif)", fontSize: "20px" }}>
                  Hospital Multi-Doctor Batch Verifier
                </h3>
                <p style={{ margin: "0 0 20px", fontSize: "12px", color: "var(--muted)", lineHeight: 1.6 }}>
                  Upload hundreds of physician records simultaneously. Verify on-chain status in parallel and export audit-ready regulatory compliance packages (CSV/JSON/PDF).
                </p>
              </div>
              <Link href="/batch" style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                Open Batch Verifier <ChevronRight size={14} />
              </Link>
            </div>

            {/* Card 2: ZK Explorer */}
            <div style={{ background: "var(--parchment)", border: "1px solid var(--line)", padding: "28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ width: "40px", height: "40px", background: "var(--paper-raised)", border: "1px solid var(--line)", display: "grid", placeItems: "center", marginBottom: "16px" }}>
                  <Activity size={20} color="var(--verified-mint)" />
                </div>
                <h3 style={{ margin: "0 0 8px", fontFamily: "var(--font-serif)", fontSize: "20px" }}>
                  Live ZK Explorer & Expiration Radar
                </h3>
                <p style={{ margin: "0 0 20px", fontSize: "12px", color: "var(--muted)", lineHeight: 1.6 }}>
                  Real-time network telemetry, smart contract state commits, on-chain block indexes, and early radar warnings for credentials expiring within 30, 60, or 120 days.
                </p>
              </div>
              <Link href="/explorer" style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                Launch ZK Explorer <ChevronRight size={14} />
              </Link>
            </div>

            {/* Card 3: EHR Gateway */}
            <div style={{ background: "var(--parchment)", border: "1px solid var(--line)", padding: "28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ width: "40px", height: "40px", background: "var(--paper-raised)", border: "1px solid var(--line)", display: "grid", placeItems: "center", marginBottom: "16px" }}>
                  <Server size={20} color="var(--seal-brass)" />
                </div>
                <h3 style={{ margin: "0 0 8px", fontFamily: "var(--font-serif)", fontSize: "20px" }}>
                  HL7® FHIR® R4 REST API & Webhooks
                </h3>
                <p style={{ margin: "0 0 20px", fontSize: "12px", color: "var(--muted)", lineHeight: 1.6 }}>
                  Direct plug-and-play integration for Epic Systems, Cerner, and Meditech. Returns compliant VerificationResult resources and signs real-time revocation callbacks.
                </p>
              </div>
              <Link href="/ehr" style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                Integrate EHR Gateway <ChevronRight size={14} />
              </Link>
            </div>

            {/* Card 4: Mobile Physician Pass */}
            <div style={{ background: "var(--parchment)", border: "1px solid var(--line)", padding: "28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ width: "40px", height: "40px", background: "var(--paper-raised)", border: "1px solid var(--line)", display: "grid", placeItems: "center", marginBottom: "16px" }}>
                  <Smartphone size={20} color="var(--verified-mint)" />
                </div>
                <h3 style={{ margin: "0 0 8px", fontFamily: "var(--font-serif)", fontSize: "20px" }}>
                  Mobile Physician Pass & Offline TOTP
                </h3>
                <p style={{ margin: "0 0 20px", fontSize: "12px", color: "var(--muted)", lineHeight: 1.6 }}>
                  Carry a cryptographically signed mobile pass with 30-second rotating anti-screenshot challenges for underground surgical bunkers and internet-free triage zones.
                </p>
              </div>
              <Link href="/pass" style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                View Physician Pass <ChevronRight size={14} />
              </Link>
            </div>

            {/* Card 5: Selective Disclosure */}
            <div style={{ background: "var(--parchment)", border: "1px solid var(--line)", padding: "28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ width: "40px", height: "40px", background: "var(--paper-raised)", border: "1px solid var(--line)", display: "grid", placeItems: "center", marginBottom: "16px" }}>
                  <Lock size={20} color="var(--seal-brass)" />
                </div>
                <h3 style={{ margin: "0 0 8px", fontFamily: "var(--font-serif)", fontSize: "20px" }}>
                  Zero-Knowledge Selective Disclosure
                </h3>
                <p style={{ margin: "0 0 20px", fontSize: "12px", color: "var(--muted)", lineHeight: 1.6 }}>
                  Prove DEA prescriptive rights, specialty boards, and clean malpractice records without exposing home addresses, social security numbers, or full identity records.
                </p>
              </div>
              <Link href="/dashboard" style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                Explore Proofs <ChevronRight size={14} />
              </Link>
            </div>

            {/* Card 6: Smart Contract Deployer */}
            <div style={{ background: "var(--parchment)", border: "1px solid var(--line)", padding: "28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ width: "40px", height: "40px", background: "var(--paper-raised)", border: "1px solid var(--line)", display: "grid", placeItems: "center", marginBottom: "16px" }}>
                  <Globe size={20} color="var(--verified-mint)" />
                </div>
                <h3 style={{ margin: "0 0 8px", fontFamily: "var(--font-serif)", fontSize: "20px" }}>
                  Smart Contract Sovereign Deployment
                </h3>
                <p style={{ margin: "0 0 20px", fontSize: "12px", color: "var(--muted)", lineHeight: 1.6 }}>
                  Deploy custom state registry instances directly to the Midnight testnet preview with complete owner secrets and initial board commitments.
                </p>
              </div>
              <Link href="/deploy" style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                Deploy Registry <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Regulatory & Security Compliance */}
      <section style={{ maxWidth: "1280px", margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "32px", alignItems: "center" }}>
          <div>
            <span className="eyebrow">Compliance & Security</span>
            <h2 style={{ margin: "8px 0 16px", fontFamily: "var(--font-serif)", fontSize: "32px", letterSpacing: "-0.03em" }}>
              Audited for Healthcare Regulatory Frameworks
            </h2>
            <p style={{ fontSize: "14px", color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
              Aquas is designed from the ground up to satisfy stringent hospital accreditation standards while guaranteeing total cryptographic privacy.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ padding: "16px", background: "var(--paper-raised)", border: "1px solid var(--line)" }}>
              <strong style={{ fontSize: "13px", display: "block", marginBottom: "4px" }}>The Joint Commission (JCAHO)</strong>
              <small style={{ fontSize: "11px", color: "var(--muted)" }}>Complies with direct Primary Source Verification standards.</small>
            </div>
            <div style={{ padding: "16px", background: "var(--paper-raised)", border: "1px solid var(--line)" }}>
              <strong style={{ fontSize: "13px", display: "block", marginBottom: "4px" }}>HIPAA Safe Harbor</strong>
              <small style={{ fontSize: "11px", color: "var(--muted)" }}>Zero Protected Health Information (PHI) stored on ledger.</small>
            </div>
            <div style={{ padding: "16px", background: "var(--paper-raised)", border: "1px solid var(--line)" }}>
              <strong style={{ fontSize: "13px", display: "block", marginBottom: "4px" }}>HL7® FHIR® R4</strong>
              <small style={{ fontSize: "11px", color: "var(--muted)" }}>Standardized practitioner verification interchange.</small>
            </div>
            <div style={{ padding: "16px", background: "var(--paper-raised)", border: "1px solid var(--line)" }}>
              <strong style={{ fontSize: "13px", display: "block", marginBottom: "4px" }}>CMS & Medicare</strong>
              <small style={{ fontSize: "11px", color: "var(--muted)" }}>Continuous exclusion & sanctions tracking via webhooks.</small>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Callout */}
      <section style={{ background: "linear-gradient(135deg, #1f2a37 0%, #111827 100%)", color: "#ffffff", padding: "64px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <h2 style={{ margin: "0 0 16px", fontFamily: "var(--font-serif)", fontSize: "36px", letterSpacing: "-0.03em" }}>
            Ready to modernise your medical credentialing pipeline?
          </h2>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", margin: "0 0 28px", lineHeight: 1.6 }}>
            Connect your 1AM wallet or start querying on-chain medical licenses with sub-second zero-knowledge proof verification.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
            <Link
              href="/dashboard"
              className="notary-cta"
              style={{ padding: "12px 28px", fontSize: "13px", textDecoration: "none" }}
            >
              Open Dashboard Console
            </Link>
            <Link
              href="/ehr"
              style={{ padding: "12px 24px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "13px", textDecoration: "none", fontWeight: 600 }}
            >
              EHR Developer Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--line)", background: "var(--parchment)", padding: "32px 24px", fontSize: "11px", color: "var(--muted)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <BrandSeal />
            <span><strong>Aquas Medical Registry</strong> · Midnight Preview Network</span>
          </div>

          <div style={{ display: "flex", gap: "20px" }}>
            <a href="https://github.com/Saimand07/Aquas" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
              GitHub Repository
            </a>
            <a href="https://preview.midnightexplorer.com" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
              Midnight Explorer
            </a>
            <Link href="/dashboard" style={{ color: "inherit", textDecoration: "none" }}>
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
