"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Unplug,
  WalletCards,
  CircleAlert,
  Activity,
  RefreshCw,
  ShieldCheck,
  Award,
  Users,
  Zap,
  Globe2,
} from "lucide-react";
import { useMidnightWallet } from "@/hooks/use-midnight-wallet";
import { shortId } from "@/lib/license-registry";
import type { OnChainRegistry } from "@/lib/midnight-read";
import {
  calculateNetworkKPIs,
  computeExpirationBuckets,
  generateActivityFeed,
} from "@/lib/network-analytics";
import NetworkMetricsCard from "@/components/NetworkMetricsCard";
import ExpirationRadar from "@/components/ExpirationRadar";
import ActivityFeed from "@/components/ActivityFeed";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ?? "";

function BrandSeal() {
  return (
    <span className="brand-seal" aria-hidden="true">
      <i />
      <b />
    </span>
  );
}

export default function ExplorerPage() {
  const wallet = useMidnightWallet();
  const liveMode = Boolean(CONTRACT_ADDRESS);
  const [registry, setRegistry] = useState<OnChainRegistry | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const connectedLabel = wallet.connected ? shortId(wallet.address ?? "connected") : "Connect 1AM";

  const fetchRegistryState = useCallback(async () => {
    if (!liveMode) return;
    setLoading(true);
    setErrorNotice(null);

    try {
      const payload: Record<string, unknown> = { mode: "registry" };
      if (wallet.indexerUri) payload.indexerUri = wallet.indexerUri;
      if (wallet.indexerWsUri) payload.indexerWsUri = wallet.indexerWsUri;

      const response = await fetch("/api/license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Failed to read registry state" }));
        throw new Error(String(err.error || "HTTP " + response.status));
      }

      const data = (await response.json()) as OnChainRegistry;
      setRegistry(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setErrorNotice(err instanceof Error ? err.message : "Network indexer error");
    } finally {
      setLoading(false);
    }
  }, [liveMode, wallet.indexerUri, wallet.indexerWsUri]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRegistryState();
    const interval = setInterval(() => {
      fetchRegistryState();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchRegistryState]);

  const kpis = useMemo(() => calculateNetworkKPIs(registry), [registry]);
  const expirationBuckets = useMemo(() => computeExpirationBuckets(registry?.records ?? []), [registry]);
  const activityEvents = useMemo(
    () => generateActivityFeed(registry?.records ?? [], CONTRACT_ADDRESS),
    [registry],
  );

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
          <Link href="/explorer" className="active">Explorer</Link>
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
              <Globe2 size={16} color="var(--seal-brass)" />
              <span className="eyebrow" style={{ margin: 0 }}>Network Telemetry & Zero-Knowledge Analytics</span>
            </div>
            <h1 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-0.04em", lineHeight: 1.1 }}>
              Aquas Registry Explorer
            </h1>
            <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: "14px" }}>
              Live aggregate metrics and cryptographic telemetry from the Midnight Preview Testnet.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {lastUpdated && (
              <small style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted)" }}>
                Updated at {lastUpdated}
              </small>
            )}
            <button
              onClick={fetchRegistryState}
              disabled={loading}
              className="secondary-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                border: "1px solid var(--line)",
                background: "transparent",
                fontSize: "11px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              {loading ? "Syncing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            marginBottom: "28px",
          }}
        >
          <NetworkMetricsCard
            label="Active Physicians"
            value={kpis.activePhysicians.toLocaleString()}
            subValue={`${kpis.totalIssued} Total Issued`}
            icon={<Users size={16} />}
            colorVar="var(--verified-mint)"
            badge="VERIFIED"
          />

          <NetworkMetricsCard
            label="Trusted State Boards"
            value={kpis.trustedBoards}
            subValue="Authorized Licensing Authorities"
            icon={<Award size={16} />}
            colorVar="var(--seal-brass)"
          />

          <NetworkMetricsCard
            label="Total ZK Verifications"
            value={kpis.totalVerifications.toLocaleString()}
            subValue="Zero-Knowledge Proofs Executed"
            icon={<Zap size={16} />}
            colorVar="var(--ink)"
          />

          <NetworkMetricsCard
            label="Revocation Integrity Rate"
            value={`${kpis.networkIntegrityScore}%`}
            subValue={`${kpis.revokedLicenses} Revoked Credentials`}
            icon={<ShieldCheck size={16} />}
            colorVar={kpis.networkIntegrityScore > 90 ? "var(--verified-mint)" : "var(--alert-rust)"}
          />

          <NetworkMetricsCard
            label="Avg Verification Latency"
            value={`${kpis.avgVerificationLatencyMs}ms`}
            subValue="Sub-second Indexer Response"
            icon={<Activity size={16} />}
            colorVar="var(--seal-brass)"
          />
        </div>

        {/* Two Column Grid: Expiration Radar + Activity Feed */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
          <ExpirationRadar buckets={expirationBuckets} />
          <ActivityFeed events={activityEvents} />
        </div>
      </section>
    </main>
  );
}
