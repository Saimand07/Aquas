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
    <div style={{ border: "1px solid var(--line)", background: "var(--paper-raised)", padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <span className="eyebrow">Predictive Risk Monitoring</span>
          <h3 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "20px", letterSpacing: "-0.02em" }}>
            Credential Expiration Radar
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--muted)" }}>
            Categorizes active physician credentials by renewal horizons to prevent healthcare compliance lapses.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted)" }}>
          <span>Total Monitored:</span>
          <strong style={{ color: "var(--ink)" }}>{totalActive} Active</strong>
        </div>
      </div>

      {/* Visual Multi-Segment Bar */}
      <div style={{ display: "flex", width: "100%", height: "12px", background: "var(--line)", marginBottom: "20px", overflow: "hidden" }}>
        {buckets.map((b) => {
          const widthPercent = totalActive > 0 ? (b.count / totalActive) * 100 : 25;
          return (
            <div
              key={b.id}
              style={{
                width: `${widthPercent}%`,
                height: "100%",
                background: b.colorVar,
                transition: "width 300ms ease",
              }}
              title={`${b.label}: ${b.count}`}
            />
          );
        })}
      </div>

      {/* Bucket Selector Pills */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", marginBottom: "20px" }}>
        {buckets.map((b) => {
          const isSelected = selectedBucket === b.id;
          return (
            <button
              key={b.id}
              onClick={() => setSelectedBucket(b.id)}
              style={{
                padding: "12px 14px",
                border: "1px solid " + (isSelected ? "var(--ink)" : "var(--line)"),
                background: isSelected ? "var(--parchment)" : "transparent",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                transition: "all 150ms ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>
                  {b.label.split(" ")[0]}
                </span>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: b.colorVar,
                  }}
                />
              </div>
              <strong style={{ fontSize: "20px", fontFamily: "var(--font-serif)", color: b.colorVar }}>
                {b.count}
              </strong>
              <small style={{ fontSize: "10px", color: "var(--muted)" }}>
                {b.label}
              </small>
            </button>
          );
        })}
      </div>

      {/* Selected Bucket Details Table */}
      <div style={{ border: "1px solid var(--line)", background: "var(--parchment)", padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
            {activeBucket?.label} ({activeBucket?.records.length} Licenses)
          </span>
          <small style={{ fontSize: "10px", color: "var(--muted)" }}>
            Requires Board Renewal Action
          </small>
        </div>

        {activeBucket?.records.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)", fontSize: "12px" }}>
            No credentials currently falling into the {activeBucket.label} category.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
            {activeBucket?.records.map((rec) => {
              const expires = rec.expiresAt
                ? new Date(rec.expiresAt * 1000).toISOString().slice(0, 10)
                : "—";

              return (
                <div
                  key={rec.credentialId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "var(--paper-raised)",
                    border: "1px solid var(--line)",
                    fontSize: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 600 }}>
                      {shortId(rec.credentialId)}
                    </span>
                    <button
                      onClick={() => handleCopy(rec.credentialId)}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: copiedId === rec.credentialId ? "var(--verified-mint)" : "var(--muted)" }}
                      title="Copy Credential ID"
                    >
                      {copiedId === rec.credentialId ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "11px" }}>
                    <span style={{ color: "var(--muted)" }}>
                      Board: {rec.issuer ? shortId(rec.issuer) : "Committed"}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: activeBucket.colorVar }}>
                      Expires: {expires}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
