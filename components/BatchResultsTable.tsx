"use client";

import { useState, useMemo } from "react";
import {
  Check,
  AlertTriangle,
  XCircle,
  Clock,
  Search,
  Download,
  Printer,
  Copy,
} from "lucide-react";
import type { BatchVerificationResult } from "@/lib/batch-verifier";
import { exportResultsToCsv, downloadCsvReport, printAuditCertificate } from "@/lib/audit-exporter";
import { shortId } from "@/lib/license-registry";

interface BatchResultsTableProps {
  results: BatchVerificationResult[];
  onReset: () => void;
}

type FilterStatus = "ALL" | "ACTIVE" | "EXPIRED" | "REVOKED" | "NOT_FOUND" | "ERROR";

export default function BatchResultsTable({ results, onReset }: BatchResultsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const institutionName = "Saint Jude Memorial Healthcare";
  const auditorName = "Hospital Credentialing Committee";

  const stats = useMemo(() => {
    const total = results.length;
    const active = results.filter((r) => r.status === "ACTIVE").length;
    const expired = results.filter((r) => r.status === "EXPIRED").length;
    const revoked = results.filter((r) => r.status === "REVOKED").length;
    const notFound = results.filter((r) => r.status === "NOT_FOUND").length;
    const errors = results.filter((r) => r.status === "ERROR").length;
    const complianceRate = total > 0 ? Math.round((active / total) * 100) : 0;
    const avgLatency =
      total > 0 ? Math.round(results.reduce((acc, r) => acc + r.latencyMs, 0) / total) : 0;

    return { total, active, expired, revoked, notFound, errors, complianceRate, avgLatency };
  }, [results]);

  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      const matchesFilter = statusFilter === "ALL" || r.status === statusFilter;
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        r.doctorName.toLowerCase().includes(term) ||
        r.credentialId.toLowerCase().includes(term) ||
        r.npiNumber.toLowerCase().includes(term) ||
        r.department.toLowerCase().includes(term);

      return matchesFilter && matchesSearch;
    });
  }, [results, statusFilter, searchTerm]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCsv = () => {
    const csv = exportResultsToCsv(results, {
      institutionName,
      auditorId: auditorName,
    });
    downloadCsvReport(csv, `aquas-audit-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handlePrintCertificate = () => {
    printAuditCertificate(results, {
      institutionName,
      auditorId: auditorName,
    });
  };

  return (
    <div className="batch-results-view" style={{ marginTop: "24px" }}>
      {/* Top Header & Export CTAs */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div>
          <span className="eyebrow">Verification Complete</span>
          <h2 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "28px", letterSpacing: "-0.03em" }}>
            Roster Audit Certificate
          </h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "13px" }}>
            {stats.total} physician credentials verified on Midnight Preview Testnet.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondary-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", padding: "8px 14px", border: "1px solid var(--line)", background: "transparent", cursor: "pointer", fontWeight: 600 }}
            onClick={handleExportCsv}
          >
            <Download size={14} />
            Export CSV Audit Log
          </button>
          <button
            type="button"
            className="notary-cta"
            style={{ minHeight: "36px", padding: "0 16px", fontSize: "11px" }}
            onClick={handlePrintCertificate}
          >
            <Printer size={14} />
            Generate JCAHO Audit Certificate
          </button>
          <button
            type="button"
            className="secondary-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", padding: "8px 14px", border: "1px solid var(--line)", background: "transparent", cursor: "pointer" }}
            onClick={onReset}
          >
            New Batch Check
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <div style={{ padding: "16px", border: "1px solid var(--line)", background: "var(--paper-raised)" }}>
          <span style={{ display: "block", fontSize: "9px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.1em" }}>
            Compliance Rate
          </span>
          <strong style={{ fontSize: "24px", fontFamily: "var(--font-serif)", color: "var(--verified-mint)" }}>
            {stats.complianceRate}%
          </strong>
          <small style={{ display: "block", marginTop: "4px", fontSize: "10px", color: "var(--muted)" }}>
            {stats.active} of {stats.total} Active
          </small>
        </div>

        <div style={{ padding: "16px", border: "1px solid var(--line)", background: "var(--paper-raised)" }}>
          <span style={{ display: "block", fontSize: "9px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.1em" }}>
            Active & Verified
          </span>
          <strong style={{ fontSize: "24px", fontFamily: "var(--font-serif)", color: "var(--verified-mint)" }}>
            {stats.active}
          </strong>
          <small style={{ display: "block", marginTop: "4px", fontSize: "10px", color: "var(--muted)" }}>
            On-Chain Sealed
          </small>
        </div>

        <div style={{ padding: "16px", border: "1px solid var(--line)", background: "var(--paper-raised)" }}>
          <span style={{ display: "block", fontSize: "9px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.1em" }}>
            Expired Credentials
          </span>
          <strong style={{ fontSize: "24px", fontFamily: "var(--font-serif)", color: stats.expired > 0 ? "var(--alert-rust)" : "var(--ink)" }}>
            {stats.expired}
          </strong>
          <small style={{ display: "block", marginTop: "4px", fontSize: "10px", color: "var(--muted)" }}>
            Requires Renewal
          </small>
        </div>

        <div style={{ padding: "16px", border: "1px solid var(--line)", background: "var(--paper-raised)" }}>
          <span style={{ display: "block", fontSize: "9px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.1em" }}>
            Revoked Licenses
          </span>
          <strong style={{ fontSize: "24px", fontFamily: "var(--font-serif)", color: stats.revoked > 0 ? "var(--alert-rust)" : "var(--ink)" }}>
            {stats.revoked}
          </strong>
          <small style={{ display: "block", marginTop: "4px", fontSize: "10px", color: "var(--muted)" }}>
            Disciplinary Revocations
          </small>
        </div>

        <div style={{ padding: "16px", border: "1px solid var(--line)", background: "var(--paper-raised)" }}>
          <span style={{ display: "block", fontSize: "9px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.1em" }}>
            Avg ZK Query Latency
          </span>
          <strong style={{ fontSize: "24px", fontFamily: "var(--font-serif)", color: "var(--seal-brass)" }}>
            {stats.avgLatency}ms
          </strong>
          <small style={{ display: "block", marginTop: "4px", fontSize: "10px", color: "var(--muted)" }}>
            Sub-second Indexer Speed
          </small>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          padding: "12px 16px",
          border: "1px solid var(--line)",
          background: "var(--paper-raised)",
          marginBottom: "1px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1", minWidth: "240px" }}>
          <Search size={16} color="var(--line-graphite)" />
          <input
            type="text"
            placeholder="Search by physician name, NPI, department, or credential ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              color: "var(--ink)",
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "11px" }}
            >
              Clear
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {(["ALL", "ACTIVE", "EXPIRED", "REVOKED", "NOT_FOUND"] as FilterStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                border: "1px solid " + (statusFilter === st ? "var(--ink)" : "var(--line)"),
                background: statusFilter === st ? "var(--ink)" : "transparent",
                color: statusFilter === st ? "var(--parchment)" : "var(--muted)",
                padding: "4px 10px",
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              {st === "ALL" ? `All (${results.length})` : st}
            </button>
          ))}
        </div>
      </div>

      {/* Results Table */}
      <div style={{ overflowX: "auto", border: "1px solid var(--line)", background: "var(--parchment)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "var(--paper-raised)", borderBottom: "1px solid var(--line)", fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              <th style={{ padding: "12px 16px" }}>Physician & Department</th>
              <th style={{ padding: "12px 16px" }}>NPI</th>
              <th style={{ padding: "12px 16px" }}>Credential ID</th>
              <th style={{ padding: "12px 16px" }}>State Authority</th>
              <th style={{ padding: "12px 16px" }}>Expiration</th>
              <th style={{ padding: "12px 16px" }}>Status</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Latency</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>
                  No matching credentials found in this roster.
                </td>
              </tr>
            ) : (
              filteredResults.map((row) => {
                const expires = row.expiresAt
                  ? new Date(row.expiresAt * 1000).toISOString().slice(0, 10)
                  : "—";

                return (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: "1px solid var(--line)",
                      transition: "background 100ms ease",
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, color: "var(--ink)" }}>{row.doctorName}</div>
                      <small style={{ color: "var(--muted)", fontSize: "11px" }}>{row.department}</small>
                    </td>

                    <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                      {row.npiNumber}
                    </td>

                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                          {shortId(row.credentialId)}
                        </span>
                        <button
                          onClick={() => handleCopy(row.credentialId, row.id)}
                          title="Copy Full 64-char Credential ID"
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: "2px",
                            color: copiedId === row.id ? "var(--verified-mint)" : "var(--muted)",
                          }}
                        >
                          {copiedId === row.id ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>

                    <td style={{ padding: "12px 16px", fontSize: "11px", color: "var(--muted)" }}>
                      {row.issuerBoard || "—"}
                    </td>

                    <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                      {expires}
                    </td>

                    <td style={{ padding: "12px 16px" }}>
                      {row.status === "ACTIVE" && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            background: "rgba(63, 169, 107, 0.12)",
                            color: "var(--verified-mint)",
                            fontFamily: "var(--font-mono)",
                            fontSize: "10px",
                            fontWeight: 700,
                            border: "1px solid rgba(63, 169, 107, 0.3)",
                          }}
                        >
                          <Check size={12} /> ACTIVE
                        </span>
                      )}

                      {row.status === "EXPIRED" && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            background: "rgba(230, 81, 0, 0.12)",
                            color: "#e65100",
                            fontFamily: "var(--font-mono)",
                            fontSize: "10px",
                            fontWeight: 700,
                            border: "1px solid rgba(230, 81, 0, 0.3)",
                          }}
                        >
                          <Clock size={12} /> EXPIRED
                        </span>
                      )}

                      {row.status === "REVOKED" && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            background: "rgba(181, 72, 42, 0.12)",
                            color: "var(--alert-rust)",
                            fontFamily: "var(--font-mono)",
                            fontSize: "10px",
                            fontWeight: 700,
                            border: "1px solid rgba(181, 72, 42, 0.3)",
                          }}
                        >
                          <XCircle size={12} /> REVOKED
                        </span>
                      )}

                      {row.status === "NOT_FOUND" && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            background: "rgba(74, 80, 88, 0.12)",
                            color: "var(--muted)",
                            fontFamily: "var(--font-mono)",
                            fontSize: "10px",
                            fontWeight: 700,
                            border: "1px solid rgba(74, 80, 88, 0.3)",
                          }}
                        >
                          NOT FOUND
                        </span>
                      )}

                      {row.status === "ERROR" && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            background: "rgba(181, 72, 42, 0.12)",
                            color: "var(--alert-rust)",
                            fontFamily: "var(--font-mono)",
                            fontSize: "10px",
                            fontWeight: 700,
                          }}
                        >
                          <AlertTriangle size={12} /> ERROR
                        </span>
                      )}
                    </td>

                    <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted)" }}>
                      {row.latencyMs}ms
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
