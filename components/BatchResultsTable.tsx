"use client";

import { useState, useMemo } from "react";
import {
  Check,
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
    <div className="space-y-6 font-sans">
      {/* Top Header & Export CTAs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#3fa96b] font-bold block">
            Verification Complete
          </span>
          <h2 className="text-xl font-bold text-white mt-0.5">
            Roster Audit Certificate
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            {stats.total} physician credentials verified on Midnight Preview Testnet.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.15)"
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-mono flex items-center gap-1.5 hover:bg-white/10 transition-colors cursor-pointer"
            onClick={handleExportCsv}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            style={{
              background: "#ffffff",
              color: "#000000",
              fontWeight: 700
            }}
            className="px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg hover:bg-[#b08d57] transition-colors cursor-pointer"
            onClick={handlePrintCertificate}
          >
            <Printer size={14} className="text-black" />
            <span>Print JCAHO Certificate</span>
          </button>
          <button
            type="button"
            style={{
              background: "transparent",
              color: "#a1a1aa",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-mono hover:text-white hover:border-white/30 transition-colors cursor-pointer"
            onClick={onReset}
          >
            New Batch
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 font-mono">
        <div className="p-4 bg-black/50 border border-white/10 rounded-2xl">
          <span className="text-[10px] text-zinc-400 uppercase block">Compliance Rate</span>
          <strong className="text-2xl text-[#3fa96b] font-bold block mt-1">{stats.complianceRate}%</strong>
          <span className="text-[10px] text-zinc-500">{stats.active} of {stats.total} Active</span>
        </div>

        <div className="p-4 bg-black/50 border border-white/10 rounded-2xl">
          <span className="text-[10px] text-zinc-400 uppercase block">Active &amp; Verified</span>
          <strong className="text-2xl text-white font-bold block mt-1">{stats.active}</strong>
          <span className="text-[10px] text-zinc-500">Shielded Commitments</span>
        </div>

        <div className="p-4 bg-black/50 border border-white/10 rounded-2xl">
          <span className="text-[10px] text-zinc-400 uppercase block">Expired</span>
          <strong className={`text-2xl font-bold block mt-1 ${stats.expired > 0 ? "text-amber-400" : "text-zinc-400"}`}>
            {stats.expired}
          </strong>
          <span className="text-[10px] text-zinc-500">Requires Renewal</span>
        </div>

        <div className="p-4 bg-black/50 border border-white/10 rounded-2xl">
          <span className="text-[10px] text-zinc-400 uppercase block">Revoked</span>
          <strong className={`text-2xl font-bold block mt-1 ${stats.revoked > 0 ? "text-red-400" : "text-zinc-400"}`}>
            {stats.revoked}
          </strong>
          <span className="text-[10px] text-zinc-500">Board Sanctioned</span>
        </div>

        <div className="p-4 bg-black/50 border border-white/10 rounded-2xl">
          <span className="text-[10px] text-zinc-400 uppercase block">Avg ZK Latency</span>
          <strong className="text-2xl text-[#b08d57] font-bold block mt-1">{stats.avgLatency}ms</strong>
          <span className="text-[10px] text-zinc-500">Sub-second Indexer</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 bg-black/50 border border-white/10 rounded-2xl flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
          <Search size={16} className="text-zinc-400" />
          <input
            type="text"
            placeholder="Filter by name, NPI, department, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-xs font-mono text-white placeholder:text-zinc-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-xs font-mono text-zinc-400 hover:text-white cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {(["ALL", "ACTIVE", "EXPIRED", "REVOKED", "NOT_FOUND"] as FilterStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                background: statusFilter === st ? "#b08d57" : "rgba(255, 255, 255, 0.03)",
                color: statusFilter === st ? "#000000" : "#a1a1aa",
                fontWeight: statusFilter === st ? 700 : 500
              }}
              className="px-2.5 py-1 rounded-lg text-[10px] font-mono transition-colors cursor-pointer"
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Results Table */}
      <div className="p-6 bg-black/50 border border-white/10 rounded-3xl overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-white/10 text-zinc-400 text-[11px]">
              <th className="pb-3">Physician</th>
              <th className="pb-3">NPI Number</th>
              <th className="pb-3">Department</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Latency</th>
              <th className="pb-3 text-right">Commitment ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredResults.map((r) => (
              <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3 text-white font-bold">{r.doctorName}</td>
                <td className="py-3 text-zinc-400">{r.npiNumber}</td>
                <td className="py-3 text-zinc-300">{r.department}</td>
                <td className="py-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    r.status === "ACTIVE"
                      ? "bg-[#3fa96b]/15 text-[#3fa96b]"
                      : r.status === "EXPIRED"
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-red-500/15 text-red-400"
                  }`}>
                    {r.status}
                  </span>
                </td>
                <td className="py-3 text-zinc-400">{r.latencyMs}ms</td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => handleCopy(r.credentialId, r.credentialId)}
                    className="inline-flex items-center gap-1 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <span>{shortId(r.credentialId)}</span>
                    {copiedId === r.credentialId ? <Check size={12} className="text-[#3fa96b]" /> : <Copy size={12} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
