"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Activity,
  RefreshCw,
  Award,
  Users,
  Zap,
  Globe2,
  CircleAlert,
  Globe
} from "lucide-react";
import { useMidnightWallet } from "@/hooks/use-midnight-wallet";
import { useAuth } from "@/context/auth-context";
import type { OnChainRegistry } from "@/lib/midnight-read";
import {
  calculateNetworkKPIs,
  computeExpirationBuckets,
  generateActivityFeed,
} from "@/lib/network-analytics";
import { getNetworkConfig, getExplorerContractUrl } from "@/lib/midnight-browser";
import NetworkMetricsCard from "@/components/NetworkMetricsCard";
import ExpirationRadar from "@/components/ExpirationRadar";
import ActivityFeed from "@/components/ActivityFeed";
import CircuitCallWorkbench from "@/components/CircuitCallWorkbench";

export default function ExplorerPage() {
  const wallet = useMidnightWallet();
  const { currentNetwork } = useAuth();
  const netConfig = getNetworkConfig(currentNetwork);
  const contractAddress = netConfig.canonicalContract;
  const liveMode = Boolean(contractAddress);

  const [registry, setRegistry] = useState<OnChainRegistry | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchRegistryState = useCallback(async () => {
    if (!liveMode) return;
    setLoading(true);
    setErrorNotice(null);

    try {
      const payload: Record<string, unknown> = {
        mode: "registry",
        network: currentNetwork,
        contractAddress,
        indexerUri: wallet.indexerUri || netConfig.indexerUri,
        indexerWsUri: wallet.indexerWsUri || netConfig.indexerWsUri,
      };

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
      setErrorNotice(err instanceof Error ? err.message : `Network indexer error on ${netConfig.name}`);
    } finally {
      setLoading(false);
    }
  }, [liveMode, currentNetwork, contractAddress, wallet.indexerUri, wallet.indexerWsUri, netConfig]);

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
    () => generateActivityFeed(registry?.records ?? [], contractAddress),
    [registry, contractAddress],
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 font-sans pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#3fa96b]/10 backdrop-blur-xl border border-[#3fa96b]/20 text-xs font-mono text-[#3fa96b] mb-2 font-semibold shadow-sm">
            <Activity size={14} />
            <span>REAL-TIME TELEMETRY ({netConfig.badge})</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Network Explorer &amp; Analytics
          </h1>
          <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
            Live on-chain metrics, smart contract state commits, and network analytics for {netConfig.name}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={getExplorerContractUrl(contractAddress, currentNetwork)}
            target="_blank"
            rel="noreferrer"
            style={{
              background: currentNetwork === "preprod" ? "rgba(63, 169, 107, 0.12)" : "rgba(176, 141, 87, 0.12)",
              color: currentNetwork === "preprod" ? "#3fa96b" : "#b08d57",
              border: `1px solid ${currentNetwork === "preprod" ? "rgba(63, 169, 107, 0.3)" : "rgba(176, 141, 87, 0.3)"}`,
              fontWeight: 600
            }}
            className="px-3.5 py-2.5 rounded-xl text-xs font-mono flex items-center gap-1.5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Globe size={13} />
            <span>{netConfig.badge} Explorer ↗</span>
          </a>

          <button
            onClick={() => fetchRegistryState()}
            disabled={loading}
            style={{
              background: "#ffffff",
              color: "#000000",
              fontWeight: 700
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-mono flex items-center gap-2 hover:bg-[#b08d57] transition-all cursor-pointer disabled:opacity-50 shadow-lg"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-black" : "text-black"} />
            <span>{loading ? "Syncing…" : "Refresh"}</span>
          </button>
          {lastUpdated && (
            <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline-block bg-white/[0.03] px-3 py-1.5 rounded-xl border border-white/10">
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
          label="Revoked Licenses"
          value={kpis.revokedLicenses}
          subValue="Public Shielded Nullifier Set"
          icon={<Zap size={18} />}
        />
        <NetworkMetricsCard
          label="Network Integrity"
          value={`${kpis.networkIntegrityScore}%`}
          subValue={`${netConfig.name} Consensus`}
          icon={<Globe2 size={18} />}
          badge="HEALTHY"
        />
      </div>

      {/* Interactive Circuit Execution Workbench */}
      <CircuitCallWorkbench />

      {/* Expiration Radar & Activity Telemetry Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-6">
          <ExpirationRadar buckets={expirationBuckets} />
        </div>
        <div className="lg:col-span-6">
          <ActivityFeed events={activityEvents} />
        </div>
      </div>
    </div>
  );
}
