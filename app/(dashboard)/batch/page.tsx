"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Unplug,
  WalletCards,
  CircleAlert,
  Building2,
  RefreshCw,
} from "lucide-react";
import { useMidnightWallet } from "@/hooks/use-midnight-wallet";
import { shortId } from "@/lib/license-registry";
import BatchRosterUploader from "@/components/BatchRosterUploader";
import BatchResultsTable from "@/components/BatchResultsTable";
import {
  executeBatchVerification,
  type BatchDoctorEntry,
  type BatchVerificationResult,
  type BatchProgress,
} from "@/lib/batch-verifier";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ?? "";

function BrandSeal() {
  return (
    <span className="brand-seal" aria-hidden="true">
      <i />
      <b />
    </span>
  );
}

export default function BatchVerificationPage() {
  const wallet = useMidnightWallet();
  const liveMode = Boolean(CONTRACT_ADDRESS);
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [results, setResults] = useState<BatchVerificationResult[] | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const connectedLabel = wallet.connected ? shortId(wallet.address ?? "connected") : "Connect 1AM";

  const handleRunBatch = async (entries: BatchDoctorEntry[]) => {
    setIsVerifying(true);
    setErrorNotice(null);
    setProgress({ total: entries.length, completed: 0, currentEntry: null, percent: 0 });

    try {
      const verifications = await executeBatchVerification(
        entries,
        5,
        wallet.indexerUri ?? undefined,
        wallet.indexerWsUri ?? undefined,
        (p) => setProgress(p),
      );
      setResults(verifications);
    } catch (err) {
      setErrorNotice(err instanceof Error ? err.message : "Batch verification encountered an issue.");
    } finally {
      setIsVerifying(false);
      setProgress(null);
    }
  };

  const handleReset = () => {
    setResults(null);
    setProgress(null);
    setErrorNotice(null);
  };

  return (
    <main className="app-shell">
      {/* Universal Topbar Header */}
      <header className="topbar">
        <Link href="/" className="brand">
          <BrandSeal />
          <span>Aquas</span>
          <small>MEDICAL REGISTRY</small>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/">Home</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/batch" className="active">Batch Verifier</Link>
          <Link href="/explorer">Explorer</Link>
          <Link href="/ehr">EHR Gateway</Link>
          <Link href="/pass">Physician Pass</Link>
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

      {errorNotice && (
        <div className="global-message error">
          <CircleAlert size={15} />
          {errorNotice}
        </div>
      )}

      {/* Main Container */}
      <section className="verify-workspace" style={{ maxWidth: "1280px", margin: "0 auto", padding: "48px 24px 80px" }}>
        {/* Page Hero */}
        <div style={{ marginBottom: "36px", borderBottom: "1px solid var(--line)", paddingBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <Building2 size={16} color="var(--seal-brass)" />
            <span className="eyebrow" style={{ margin: 0 }}>Enterprise Hospital Credentialing</span>
          </div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 4vw, 48px)", letterSpacing: "-0.04em", lineHeight: 1.1 }}>
            Multi-Doctor Batch Verification
          </h1>
          <p style={{ margin: "10px 0 0", color: "var(--muted)", maxWidth: "640px", fontSize: "15px", lineHeight: 1.6 }}>
            Verify whole hospital physician rosters in parallel against Midnight zero-knowledge state. Generate audit-ready compliance certificates for Joint Commission (JCAHO) and CMS reviews.
          </p>
        </div>

        {/* Progress Bar Display */}
        {isVerifying && progress && (
          <div style={{ marginBottom: "28px", padding: "20px", border: "1px solid var(--line)", background: "var(--paper-raised)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <RefreshCw size={16} className="animate-spin" color="var(--seal-brass)" />
                <strong style={{ fontSize: "13px", fontFamily: "var(--font-mono)" }}>
                  Verifying {progress.completed} of {progress.total} Credentials…
                </strong>
              </div>
              <span style={{ fontSize: "13px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                {progress.percent}%
              </span>
            </div>
            <div style={{ width: "100%", height: "8px", background: "var(--line)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${progress.percent}%`,
                  height: "100%",
                  background: "var(--seal-brass)",
                  transition: "width 150ms ease",
                }}
              />
            </div>
            {progress.currentEntry && (
              <small style={{ display: "block", marginTop: "8px", color: "var(--muted)", fontSize: "11px" }}>
                Checking: {progress.currentEntry}
              </small>
            )}
          </div>
        )}

        {/* Dynamic Workflow: Uploader or Results */}
        {!results ? (
          <BatchRosterUploader onRosterParsed={handleRunBatch} isVerifying={isVerifying} />
        ) : (
          <BatchResultsTable results={results} onReset={handleReset} />
        )}
      </section>
    </main>
  );
}
