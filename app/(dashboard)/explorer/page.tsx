"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Activity,
  RefreshCw,
  Award,
  Users,
  Zap,
  Globe2,
  CircleAlert
} from "lucide-react";
import { useMidnightWallet } from "@/hooks/use-midnight-wallet";
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

export default function ExplorerPage() {
  const wallet = useMidnightWallet();
  const liveMode = Boolean(CONTRACT_ADDRESS);
  const [registry, setRegistry] = useState<OnChainRegistry | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

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
    <div className="w-full max-w-7xl mx-auto space-y-8 font-sans pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3fa96b]/10 border border-[#3fa96b]/20 text-xs font-mono text-[#3fa96b] mb-2 font-semibold">
            <Activity size={14} />
            <span>REAL-TIME TELEMETRY</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Network Explorer &amp; Analytics
          </h1>
          <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
            Live on-chain metrics, smart contract state commits, and network analytics for the Aquas Sovereign Registry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchRegistryState()}
            disabled={loading}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.15)"
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-mono flex items-center gap-2 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-[#b08d57]" : ""} />
            <span>{loading ? "Syncing…" : "Refresh"}</span>
          </button>
          {lastUpdated && (
            <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline-block">
              Synced: {lastUpdated}
            </span>
          )}
        </div>
      </div>

      {errorNotice && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-mono">
          <CircleAlert size={16} />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <NetworkMetricsCard
          label="Active Physicians"
          value={kpis.activePhysicians}
          subValue={`${kpis.networkIntegrityScore}% Active & In Good Standing`}
          icon={<Users size={18} />}
          badge="ZK PROVEN"
        />
        <NetworkMetricsCard
          label="Registered Boards"
          value={kpis.trustedBoards}
          subValue="Consensus-Governed Authorities"
          icon={<Award size={18} />}
        />
        <NetworkMetricsCard
          label="Total Proof Validations"
          value={kpis.totalVerifications}
          subValue="Zero PII Leaked across network"
          icon={<Zap size={18} />}
        />
        <NetworkMetricsCard
          label="Ledger Network"
          value={liveMode ? "Preview" : "Sandbox"}
          subValue="Shielded Proof Settlement"
          icon={<Globe2 size={18} />}
          badge="ONLINE"
        />
      </div>

      {/* Analytics & Radar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7">
          <ExpirationRadar buckets={expirationBuckets} />
        </div>
        <div className="lg:col-span-5">
          <ActivityFeed events={activityEvents} />
        </div>
      </div>
    </div>
  );
}
