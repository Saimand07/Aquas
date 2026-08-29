"use client";

import Link from "next/link";
import {
  Unplug,
  WalletCards,
  CircleAlert,
  Server,
  Building2,
  Lock,
  Layers,
} from "lucide-react";
import { useMidnightWallet } from "@/hooks/use-midnight-wallet";
import { shortId } from "@/lib/license-registry";
import EhrIntegrationPanel from "@/components/EhrIntegrationPanel";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ?? "";

function BrandSeal() {
  return (
    <span className="brand-seal" aria-hidden="true">
      <i />
      <b />
    </span>
  );
}

export default function EhrGatewayPage() {
  const wallet = useMidnightWallet();
  const liveMode = Boolean(CONTRACT_ADDRESS);
  const connectedLabel = wallet.connected ? shortId(wallet.address ?? "connected") : "Connect 1AM";

  return (
    <main className="app-shell">
      {/* Topbar Navigation */}
      <header className="topbar">
        <Link href="/" className="brand">
          <BrandSeal />
          <span>Aquas</span>
          <small>MEDICAL REGISTRY</small>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/">Verify</Link>
          <Link href="/batch">Batch Verifier</Link>
          <Link href="/explorer">Explorer</Link>
          <Link href="/ehr" className="active">EHR Gateway</Link>
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
        {/* Hero Header */}
        <div
          style={{
            marginBottom: "32px",
            borderBottom: "1px solid var(--line)",
            paddingBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Server size={16} color="var(--seal-brass)" />
            <span className="eyebrow" style={{ margin: 0 }}>Enterprise Hospital Architecture</span>
          </div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-0.04em", lineHeight: 1.1 }}>
            EHR REST API & Webhooks Gateway
          </h1>
          <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: "14px", maxWidth: "800px" }}>
            Automate primary source verification for <strong>Epic Systems</strong>, <strong>Cerner</strong>, and <strong>Meditech</strong> with HL7 FHIR Release 4 standard endpoints and real-time cryptographic revocation webhooks.
          </p>
        </div>

        {/* Integration Feature Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div style={{ padding: "18px", border: "1px solid var(--line)", background: "var(--paper-raised)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Layers size={16} color="var(--seal-brass)" />
              <strong style={{ fontSize: "13px" }}>HL7® FHIR® R4 Native</strong>
            </div>
            <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)", lineHeight: 1.5 }}>
              Returns standardized <code>VerificationResult</code> resources ready for direct ingestion into hospital credentialing modules.
            </p>
          </div>

          <div style={{ padding: "18px", border: "1px solid var(--line)", background: "var(--paper-raised)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Lock size={16} color="var(--verified-mint)" />
              <strong style={{ fontSize: "13px" }}>Zero-Knowledge Privacy</strong>
            </div>
            <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)", lineHeight: 1.5 }}>
              Executes cryptographic verification against the Midnight ledger without centralizing or collecting raw physician records.
            </p>
          </div>

          <div style={{ padding: "18px", border: "1px solid var(--line)", background: "var(--paper-raised)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Building2 size={16} color="var(--seal-brass)" />
              <strong style={{ fontSize: "13px" }}>Real-Time Revocation Webhooks</strong>
            </div>
            <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)", lineHeight: 1.5 }}>
              Instant HMAC-signed callbacks when a state medical board commits a revocation on-chain, preventing unauthorized clinical shifts.
            </p>
          </div>
        </div>

        {/* Integration Panel */}
        <EhrIntegrationPanel />
      </section>
    </main>
  );
}
