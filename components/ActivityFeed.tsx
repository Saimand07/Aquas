import { PlusCircle, XCircle, CheckCircle2, Shield, ExternalLink, Activity } from "lucide-react";
import type { NetworkActivityEvent } from "@/lib/network-analytics";
import { shortId } from "@/lib/license-registry";

interface ActivityFeedProps {
  events: NetworkActivityEvent[];
}

export default function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <div style={{ border: "1px solid var(--line)", background: "var(--paper-raised)", padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Activity size={16} color="var(--seal-brass)" />
          <span className="eyebrow" style={{ margin: 0 }}>Real-Time Telemetry</span>
        </div>
        <small style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--muted)" }}>
          Streaming Ledger Events
        </small>
      </div>

      <h3 style={{ margin: "0 0 16px", fontFamily: "var(--font-serif)", fontSize: "20px", letterSpacing: "-0.02em" }}>
        On-Chain Activity Feed
      </h3>

      {events.length === 0 ? (
        <div style={{ padding: "32px", textAlign: "center", color: "var(--muted)", fontSize: "12px", border: "1px dashed var(--line)" }}>
          No recent on-chain events indexed for this contract.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "420px", overflowY: "auto" }}>
          {events.map((ev) => {
            const isIssuance = ev.type === "ISSUANCE";
            const isRevocation = ev.type === "REVOCATION";
            const isVerification = ev.type === "VERIFICATION";

            return (
              <div
                key={ev.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "12px 14px",
                  background: "var(--parchment)",
                  border: "1px solid var(--line)",
                  transition: "border-color 150ms ease",
                }}
              >
                <div style={{ marginTop: "2px" }}>
                  {isIssuance && <PlusCircle size={16} color="var(--verified-mint)" />}
                  {isRevocation && <XCircle size={16} color="var(--alert-rust)" />}
                  {isVerification && <CheckCircle2 size={16} color="var(--seal-brass)" />}
                  {!isIssuance && !isRevocation && !isVerification && <Shield size={16} color="var(--ink)" />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                    <strong style={{ fontSize: "12px", color: "var(--ink)" }}>{ev.title}</strong>
                    <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {ev.timeAgo}
                    </span>
                  </div>

                  <p style={{ margin: "3px 0 6px", fontSize: "11px", color: "var(--muted)", lineHeight: 1.4 }}>
                    {ev.description}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "10px", fontFamily: "var(--font-mono)" }}>
                    {ev.credentialId && (
                      <span style={{ color: "var(--line-graphite)" }}>
                        ID: {shortId(ev.credentialId)}
                      </span>
                    )}
                    {ev.blockExplorerUrl && (
                      <a
                        href={ev.blockExplorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: "var(--seal-brass)", textDecoration: "underline" }}
                      >
                        Midnight Explorer <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
