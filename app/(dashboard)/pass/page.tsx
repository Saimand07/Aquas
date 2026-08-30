"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Unplug,
  WalletCards,
  CircleAlert,
  QrCode,
  Scan,
  Smartphone,
  WifiOff,
} from "lucide-react";
import { useMidnightWallet } from "@/hooks/use-midnight-wallet";
import { shortId } from "@/lib/license-registry";
import PhysicianPassCard from "@/components/PhysicianPassCard";
import OfflinePassReader from "@/components/OfflinePassReader";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ?? "";

// Sample Doctor Credential Data
const SAMPLE_PHYSICIAN = {
  doctorName: "Dr. Sarah Jenkins MD",
  licenseNumber: "NY-294817-MD",
  npiNumber: "1948201938",
  issuingBoard: "New York State Medical Board",
  specialty: "Interventional Cardiology",
  credentialId: "e0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70",
  doctorSecretHex: "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
  boardKeyHex: "d72f60d3f297dc84078e19677b60e88759f9982a3ea3dbf87a387814cda034ad",
};

function BrandSeal() {
  return (
    <span className="brand-seal" aria-hidden="true">
      <i />
      <b />
    </span>
  );
}

export default function PhysicianPassPage() {
  const wallet = useMidnightWallet();
  const liveMode = Boolean(CONTRACT_ADDRESS);
  const connectedLabel = wallet.connected ? shortId(wallet.address ?? "connected") : "Connect 1AM";
  const [activeTab, setActiveTab] = useState<"pass" | "reader">("pass");

  return (
    <main className="app-shell">
      {/* Top Navigation */}
      <header className="topbar">
        <Link href="/" className="brand">
          <BrandSeal />
          <span>Aquas</span>
          <small>MEDICAL REGISTRY</small>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/">Home</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/batch">Batch Verifier</Link>
          <Link href="/explorer">Explorer</Link>
          <Link href="/ehr">EHR Gateway</Link>
          <Link href="/pass" className="active">Physician Pass</Link>
          <Link href="/deploy">Deploy</Link>
        </nav>
        <div className="network-controls">
          <span className="network-label">
            <i />
            {liveMode ? (wallet.connected ? "PREVIEW · LIVE" : "PREVIEW · OFFLINE") : "SANDBOX"}
          </span>
          <button
            className="wallet-button"
            onClick={wallet.connected ? wallet.disconnect : wallet.connect}
            disabled={wallet.connecting}
          >
            {wallet.connected ? <Unplug size={14} /> : <WalletCards size={14} />}
            {wallet.connecting ? "Connecting…" : connectedLabel}
          </button>
        </div>
      </header>

      {wallet.error && (
        <div className="global-message error">
          <CircleAlert size={15} />
          {wallet.error}
        </div>
      )}

      <section className="verify-workspace" style={{ maxWidth: "1280px", margin: "0 auto", padding: "48px 24px 80px" }}>
        {/* Header Hero */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "32px",
            borderBottom: "1px solid var(--line)",
            paddingBottom: "24px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Smartphone size={16} color="var(--seal-brass)" />
              <span className="eyebrow" style={{ margin: 0 }}>Offline-First Zero-Knowledge Pass</span>
            </div>
            <h1 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-0.04em", lineHeight: 1.1 }}>
              Mobile Physician Pass
            </h1>
            <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: "14px" }}>
              Cryptographically signed digital credential badge with 30-second rotating anti-replay TOTP tokens for offline hospital verification.
            </p>
          </div>

          {/* Mode Switcher */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setActiveTab("pass")}
              className={activeTab === "pass" ? "notary-cta" : "secondary-btn"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                fontSize: "11px",
                cursor: "pointer",
                fontWeight: 600,
                border: "1px solid var(--ink)",
                background: activeTab === "pass" ? "var(--ink)" : "transparent",
                color: activeTab === "pass" ? "var(--parchment)" : "var(--ink)",
              }}
            >
              <QrCode size={13} />
              Physician Badge Mode
            </button>

            <button
              onClick={() => setActiveTab("reader")}
              className={activeTab === "reader" ? "notary-cta" : "secondary-btn"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                fontSize: "11px",
                cursor: "pointer",
                fontWeight: 600,
                border: "1px solid var(--ink)",
                background: activeTab === "reader" ? "var(--ink)" : "transparent",
                color: activeTab === "reader" ? "var(--parchment)" : "var(--ink)",
              }}
            >
              <Scan size={13} />
              Offline Field Scanner
            </button>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === "pass" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "32px", alignItems: "start" }}>
            <PhysicianPassCard
              doctorName={SAMPLE_PHYSICIAN.doctorName}
              licenseNumber={SAMPLE_PHYSICIAN.licenseNumber}
              npiNumber={SAMPLE_PHYSICIAN.npiNumber}
              issuingBoard={SAMPLE_PHYSICIAN.issuingBoard}
              specialty={SAMPLE_PHYSICIAN.specialty}
              credentialId={SAMPLE_PHYSICIAN.credentialId}
              doctorSecretHex={SAMPLE_PHYSICIAN.doctorSecretHex}
              boardKeyHex={SAMPLE_PHYSICIAN.boardKeyHex}
            />

            {/* Offline Protocol Info Card */}
            <div style={{ border: "1px solid var(--line)", background: "var(--paper-raised)", padding: "28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <WifiOff size={18} color="var(--seal-brass)" />
                <h3 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "20px" }}>
                  Offline Challenge-Response Protocol
                </h3>
              </div>

              <p style={{ margin: "0 0 16px", fontSize: "12px", color: "var(--muted)", lineHeight: 1.6 }}>
                The Physician Pass is designed for operational continuity in zero-reception hospital corridors, subterranean trauma bays, and emergency flight transports.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ padding: "12px", background: "var(--parchment)", border: "1px solid var(--line)" }}>
                  <strong style={{ fontSize: "12px", display: "block" }}>1. Rotating Anti-Screenshot TOTP</strong>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Every 30 seconds, a fresh HMAC-SHA256 nonced challenge is computed locally. Screenshots expire in under 2 minutes.
                  </span>
                </div>

                <div style={{ padding: "12px", background: "var(--parchment)", border: "1px solid var(--line)" }}>
                  <strong style={{ fontSize: "12px", display: "block" }}>2. Local Cryptographic Signature</strong>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    The QR code encapsulates a self-contained cryptographic attestation signed with the physician&apos;s private credential key.
                  </span>
                </div>

                <div style={{ padding: "12px", background: "var(--parchment)", border: "1px solid var(--line)" }}>
                  <strong style={{ fontSize: "12px", display: "block" }}>3. Selective Disclosure Badges</strong>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    DEA Prescriptive Authority, CME credit hours, and NPDB clean records are verified without uncovering the doctor&apos;s home address or raw serials.
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: "680px", margin: "0 auto" }}>
            <OfflinePassReader />
          </div>
        )}
      </section>
    </main>
  );
}
