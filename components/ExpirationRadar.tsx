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
    <div className="p-6 md:p-8 bg-black/50 border border-white/10 rounded-3xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#b08d57] font-bold block">
            Predictive Risk Monitoring
          </span>
          <h3 className="text-xl font-bold text-white mt-0.5">
            Credential Expiration Radar
          </h3>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Categorizes active physician credentials by renewal horizons to prevent compliance lapses.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
          <span>Monitored:</span>
          <strong className="text-white font-bold">{totalActive} Active</strong>
        </div>
      </div>

      {/* Visual Multi-Segment Bar */}
      <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden flex">
        {buckets.map((b) => {
          const widthPercent = totalActive > 0 ? (b.count / totalActive) * 100 : 25;
          return (
            <div
              key={b.id}
              style={{
                width: `${widthPercent}%`,
                background: b.colorVar,
              }}
              className="h-full transition-all duration-300"
              title={`${b.label}: ${b.count}`}
            />
          );
        })}
      </div>

      {/* Bucket Selector Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {buckets.map((b) => {
          const isSelected = selectedBucket === b.id;
          return (
            <button
              key={b.id}
              onClick={() => setSelectedBucket(b.id)}
              style={{
                background: isSelected ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.02)",
                borderColor: isSelected ? "#b08d57" : "rgba(255, 255, 255, 0.1)"
              }}
              className="p-4 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer"
            >
              <div className="flex justify-between items-center text-[10px] font-mono uppercase text-zinc-400">
                <span>{b.label.split(" ")[0]}</span>
                <span
                  style={{ background: b.colorVar }}
                  className="w-2 h-2 rounded-full inline-block"
                />
              </div>
              <strong className="text-2xl font-bold font-mono text-white mt-1">
                {b.count}
              </strong>
              <span className="text-[11px] text-zinc-500 font-mono truncate">
                {b.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Bucket Records List */}
      {activeBucket && (
        <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3 font-mono text-xs">
          <div className="flex justify-between items-center text-zinc-400 pb-2 border-b border-white/10">
            <span className="font-bold text-white">{activeBucket.label} ({activeBucket.records.length})</span>
            <span className="text-[11px] text-zinc-500">Requires Board Action</span>
          </div>

          {activeBucket.records.length === 0 ? (
            <div className="py-4 text-center text-zinc-500">
              No physician credentials fall within this horizon.
            </div>
          ) : (
            <div className="divide-y divide-white/5 max-h-52 overflow-y-auto">
              {activeBucket.records.map((r, i) => (
                <div key={i} className="py-2.5 flex justify-between items-center">
                  <div>
                    <strong className="text-white block font-sans text-xs">
                      Physician #{shortId(r.credentialId)}
                    </strong>
                    <span className="text-[10px] text-zinc-500">
                      Expires: {r.expiresAt ? new Date(Number(r.expiresAt) * 1000).toLocaleDateString() : "Never"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(r.credentialId)}
                    className="flex items-center gap-1 text-zinc-400 hover:text-white cursor-pointer text-[11px]"
                  >
                    <span>{shortId(r.credentialId)}</span>
                    {copiedId === r.credentialId ? <Check size={12} className="text-[#3fa96b]" /> : <Copy size={12} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
