"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import type { ExpirationBucket } from "@/lib/network-analytics";
import { shortId } from "@/lib/license-registry";

interface ExpirationRadarProps {
  buckets: ExpirationBucket[];
}

export default function ExpirationRadar({ buckets }: ExpirationRadarProps) {
  const [selectedBucket, setSelectedBucket] = useState<string | null>("critical");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeBucket = buckets.find((b) => b.id === selectedBucket) || buckets[0];
  const totalActive = buckets.reduce((acc, b) => acc + b.count, 0);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 md:p-8 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all duration-300 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#b08d57] font-bold block">
            Predictive Risk Monitoring
          </span>
          <h3 className="text-xl font-bold text-white mt-0.5 tracking-tight">
            Credential Expiration Radar
          </h3>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Categorizes active physician credentials by renewal horizons to prevent compliance lapses.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 bg-white/[0.03] px-3 py-1.5 rounded-xl border border-white/10 shadow-inner">
          <span>Monitored:</span>
          <strong className="text-white font-bold">{totalActive} Active</strong>
        </div>
      </div>

      {/* Visual Multi-Segment Bar */}
      <div className="w-full h-3.5 bg-black/40 border border-white/10 rounded-full overflow-hidden flex p-0.5 shadow-inner">
        {buckets.map((b) => {
          const widthPercent = totalActive > 0 ? (b.count / totalActive) * 100 : 25;
          return (
            <div
              key={b.id}
              style={{
                width: `${widthPercent}%`,
                background: b.colorVar,
              }}
              className="h-full rounded-full transition-all duration-300"
              title={`${b.label}: ${b.count}`}
            />
          );
        })}
      </div>

      {/* Bucket Selector Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {buckets.map((b) => {
          const isSelected = selectedBucket === b.id;
          return (
            <button
              key={b.id}
              onClick={() => setSelectedBucket(b.id)}
              style={{
                background: isSelected ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.02)",
                borderColor: isSelected ? b.colorVar : "rgba(255, 255, 255, 0.08)",
              }}
              className="p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer hover:border-white/20 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400 font-medium truncate">{b.label.split(" ")[0]}</span>
                <span
                  style={{ background: b.colorVar }}
                  className="w-2 h-2 rounded-full"
                />
              </div>
              <strong className="text-2xl font-bold font-mono text-white mt-1">
                {b.count}
              </strong>
            </button>
          );
        })}
      </div>

      {/* Selected Bucket Details List */}
      <div className="space-y-3 pt-2">
        <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
          <span>{activeBucket?.label} Records:</span>
          <span>{activeBucket?.records.length} Found</span>
        </div>

        {activeBucket?.records.length === 0 ? (
          <div className="p-6 bg-black/40 border border-white/10 rounded-2xl text-center text-xs font-mono text-zinc-500 shadow-inner">
            No credentials currently falling into the {activeBucket.label} horizon.
          </div>
        ) : (
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {activeBucket?.records.map((r) => {
              const expiresDate = r.expiresAt
                ? new Date(r.expiresAt * 1000).toLocaleDateString()
                : "Unknown";
              return (
                <div
                  key={r.credentialId}
                  className="p-3 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between font-mono text-xs hover:border-white/20 transition-colors shadow-inner"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-zinc-300 font-medium truncate">
                      {shortId(r.credentialId)}
                    </span>
                    <button
                      onClick={() => handleCopy(r.credentialId)}
                      className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1"
                      title="Copy Full ID"
                    >
                      {copiedId === r.credentialId ? (
                        <Check size={12} className="text-[#3fa96b]" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>
                  <span className="text-zinc-400 text-[11px] whitespace-nowrap">
                    Expires: {expiresDate}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
