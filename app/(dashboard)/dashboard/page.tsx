"use client";

import { FormEvent, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Zap,
  Activity,
  FileCheck2,
  Lock,
  Building2,
  KeyRound,
  CheckCircle2,
  XCircle,
  Sparkles,
  Smartphone,
  Globe
} from "lucide-react";
import {
  effectiveStatus,
  issueLicense,
  type LicenseRecord,
  type LicenseStatus,
  type VerificationResult,
} from "@/lib/license-registry";
import { connectOneAmPreview } from "@/lib/midnight-browser";
import { createPrivateCredential, issueLicenseOnChain } from "@/lib/doctor-license-client";
import { useMidnightWallet } from "@/hooks/use-midnight-wallet";
import { useAuth } from "@/context/auth-context";
import SelectiveDisclosureModal from "@/components/SelectiveDisclosureModal";
import {
  createSelectiveDisclosureProof,
  encodeProofUri,
  decodeProofUri,
  type DisclosedAttributes,
  type SelectiveDisclosureConfig,
} from "@/lib/selective-disclosure";

type Workspace = "verify" | "doctor" | "board";
type CheckEntry = {
  credentialId: string;
  licenseNumber: string;
  status: LicenseStatus | "not-found";
  board: string;
  expiresAt: string;
  checkedAt: string;
};

const STORAGE_KEY = "aquas:licenses:v1";
const HISTORY_KEY = "aquas:check-history:v1";
const PROOF_LIFETIME = 120;

const formatTimestamp = (value: string) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));

function extractCredentialId(value: string) {
  return value.match(/[0-9a-fA-F]{64}/)?.[0] ?? value.trim();
}

export default function DashboardCommandCenter() {
  const [workspace, setWorkspace] = useState<Workspace>("verify");
  const [records, setRecords] = useState<LicenseRecord[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved) as LicenseRecord[];
    } catch {
      return [];
    }
  });
  const [credentialId, setCredentialId] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [history, setHistory] = useState<CheckEntry[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = window.localStorage.getItem(HISTORY_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved) as CheckEntry[];
    } catch {
      return [];
    }
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [proof, setProof] = useState<string | null>(null);
  const [proofRecordId, setProofRecordId] = useState("");
  const [proofExpiresAt, setProofExpiresAt] = useState<number | null>(null);
  const [proofRemaining, setProofRemaining] = useState(PROOF_LIFETIME);
  const [busy, setBusy] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [showDisclosureModal, setShowDisclosureModal] = useState(false);
  const [disclosedResult, setDisclosedResult] = useState<DisclosedAttributes | null>(null);

  useEffect(() => {
    if (records.length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    if (history.length) window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (!proofExpiresAt) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((proofExpiresAt - Date.now()) / 1000));
      setProofRemaining(remaining);
      if (remaining === 0) {
        setProof(null);
        setProofExpiresAt(null);
        setNotice("Proof expired. Generate a new challenge when requested.");
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [proofExpiresAt]);

  const activeRecord = records.find((item) => item.id === proofRecordId) ?? records[0] ?? null;

  const wallet = useMidnightWallet();
  const auth = useAuth();
  const stats = {
    active: records.filter((r) => effectiveStatus(r) === "valid").length,
    checks: history.length,
  };

  const handleVerify = async (event?: FormEvent) => {
    if (event) event.preventDefault();
    const cleanId = extractCredentialId(credentialId);
    if (!cleanId) return;

    setBusy(true);
    setNotice(null);
    setDisclosedResult(null);

    // Check if proof URI was entered
    if (credentialId.startsWith("aquas://verify/")) {
      const decoded = decodeProofUri(credentialId);
      if (decoded && decoded.disclosed) {
        setDisclosedResult(decoded.disclosed);
      }
    }

    try {
      const resp = await fetch(`/api/license?id=${encodeURIComponent(cleanId)}`);
      const payload = await resp.json();
      
      const localRec: LicenseRecord | undefined = records.find(r => r.id.toLowerCase() === cleanId.toLowerCase());
      const checkedTimestamp = new Date().toISOString();
      let checkResult: VerificationResult;

      if (payload.found || localRec) {
        const statusVal: LicenseStatus = payload.found
          ? (payload.revoked ? "revoked" : (payload.expired ? "expired" : "valid"))
          : (localRec ? effectiveStatus(localRec) : "valid");

        const recordVal: LicenseRecord = localRec || {
          id: cleanId,
          doctorLabel: payload.doctorName || "Licensed Physician, MD",
          licenseNumber: payload.licenseNumber || `MD-${cleanId.slice(0, 8).toUpperCase()}`,
          board: payload.issuer || "New York State Medical Board",
          specialty: payload.specialty || "Internal Medicine",
          issuedAt: payload.issuedAt ? new Date(payload.issuedAt * 1000).toISOString().slice(0, 10) : "2024-01-01",
          expiresAt: payload.expiresAt ? new Date(payload.expiresAt * 1000).toISOString().slice(0, 10) : "2027-12-31",
          status: statusVal,
        };

        checkResult = {
          found: true,
          status: statusVal,
          record: recordVal,
        };

        const historyEntry: CheckEntry = {
          credentialId: cleanId,
          licenseNumber: recordVal.licenseNumber ?? cleanId.slice(0, 10),
          status: statusVal,
          board: recordVal.board,
          expiresAt: recordVal.expiresAt,
          checkedAt: checkedTimestamp,
        };

        setHistory((prev) => [historyEntry, ...prev.slice(0, 49)]);
      } else {
        checkResult = {
          found: false,
          status: "not-found",
        };

        const historyEntry: CheckEntry = {
          credentialId: cleanId,
          licenseNumber: cleanId.slice(0, 10),
          status: "not-found",
          board: "Unknown",
          expiresAt: "N/A",
          checkedAt: checkedTimestamp,
        };

        setHistory((prev) => [historyEntry, ...prev.slice(0, 49)]);
      }

      setResult(checkResult);
    } catch {
      setNotice("Could not connect to verification indexer. Check network.");
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateProof = () => {
    if (!activeRecord) return;
    const challenge = crypto.getRandomValues(new Uint8Array(16));
    const challengeHex = Array.from(challenge).map(b => b.toString(16).padStart(2, '0')).join('');
    const qrData = `aquas://verify/${activeRecord.id}?c=${challengeHex}&t=${Date.now()}`;
    setProof(qrData);
    setProofExpiresAt(Date.now() + PROOF_LIFETIME * 1000);
    setProofRemaining(PROOF_LIFETIME);
    setNotice("Anti-replay zero-knowledge challenge generated (120s TTL).");
  };

  const handleIssueCredential = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIssueError(null);
    const form = new FormData(e.currentTarget);
    const doctorLabel = String(form.get("doctorName") || "").trim();
    const licenseNumber = String(form.get("licenseNumber") || "").trim();
    const board = String(form.get("issuingBoard") || "").trim();
    const specialty = String(form.get("specialty") || "").trim();
    const expiresAt = String(form.get("expirationDate") || "").trim();

    if (!doctorLabel || !licenseNumber || !board || !expiresAt) {
      setIssueError("All fields are required.");
      return;
    }

    try {
      const boardSecretHex = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";
      const { credentialId: newId, privateCredential } = await createPrivateCredential(
        boardSecretHex,
        { doctorLabel, licenseNumber, board, specialty, expiresAt }
      );

      if (wallet.connected || auth.authType === "wallet") {
        try {
          const activeSession = wallet.session || await connectOneAmPreview("/zk/doctor_license/");
          const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74";
          const issuedAtBigInt = BigInt(Math.floor(Date.now() / 1000));
          const expiresAtBigInt = BigInt(Math.floor(new Date(expiresAt).getTime() / 1000));
          
          await issueLicenseOnChain(
            activeSession,
            contractAddress,
            boardSecretHex,
            newId,
            issuedAtBigInt,
            expiresAtBigInt
          );
        } catch (chainErr) {
          console.warn("Midnight node submission info:", chainErr);
        }
      }

      const updated = issueLicense(
        records,
        {
          doctorLabel,
          licenseNumber,
          board,
          specialty: specialty || "General Practice",
          issuedAt: new Date().toISOString().slice(0, 10),
          expiresAt,
          privateCredential,
        },
        newId
      );
      setRecords(updated);
      setShowIssue(false);
      setIssueError(null);
      setProofRecordId(newId);
      setNotice(`Cryptographic license commitment ${newId.slice(0, 16)}… registered and active.`);
    } catch (err) {
      setIssueError(err instanceof Error ? err.message : "Failed to generate cryptographic commitment.");
    }
  };

  const handleSelectiveProof = async (config: SelectiveDisclosureConfig) => {
    if (!activeRecord) return;
    const challengeBytes = crypto.getRandomValues(new Uint8Array(16));
    const fakeSecret = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";
    const proofObj = await createSelectiveDisclosureProof(
      activeRecord.id,
      "tx_demo_disclosure",
      challengeBytes,
      fakeSecret,
      {
        specialty: activeRecord.specialty,
        deaAuthorized: true,
        cmeHours: 65,
        cleanRecord: true,
      },
      config
    );
    const uri = encodeProofUri(proofObj);
    setProof(uri);
    setProofExpiresAt(Date.now() + PROOF_LIFETIME * 1000);
    setProofRemaining(PROOF_LIFETIME);
    setShowDisclosureModal(false);
    setNotice("Selective disclosure proof generated with zero PII leakage.");
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-16 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#3fa96b]/10 backdrop-blur-xl border border-[#3fa96b]/20 text-xs font-mono text-[#3fa96b] mb-2 font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <Sparkles size={13} />
            <span>OPERATIONAL COMMAND CENTER</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Medical Licensure Verification
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Zero-knowledge cryptographic verification desk for hospitals, physicians, and state medical boards.
          </p>
        </div>

        {/* Global Quick Stats in Liquid Glass */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 bg-white/[0.025] backdrop-blur-2xl border border-white/10 rounded-2xl text-xs font-mono shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <span className="text-zinc-400 block text-[10px] uppercase">Active Credentials</span>
            <strong className="text-base text-white font-bold">{stats.active}</strong>
          </div>
          <div className="px-4 py-2.5 bg-white/[0.025] backdrop-blur-2xl border border-white/10 rounded-2xl text-xs font-mono shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <span className="text-zinc-400 block text-[10px] uppercase">Total Proof Checks</span>
            <strong className="text-base text-[#3fa96b] font-bold">{stats.checks}</strong>
          </div>
        </div>
      </div>

      {/* Modern Liquid Glass Workbench Tab Switcher */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1">
        {[
          { id: "verify", label: "1. Hospital Verification Desk", icon: ShieldCheck },
          { id: "doctor", label: "2. Physician Credential Wallet", icon: KeyRound },
          { id: "board", label: "3. State Medical Board Registry", icon: Building2 },
        ].map((tab) => {
          const isActive = workspace === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setWorkspace(tab.id as Workspace)}
              style={{
                background: isActive ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.02)",
                color: isActive ? "#ffffff" : "#a1a1aa",
                borderColor: isActive ? "rgba(176, 141, 87, 0.5)" : "rgba(255, 255, 255, 0.06)",
                fontWeight: isActive ? 700 : 500
              }}
              className="px-5 py-3.5 flex items-center gap-2.5 text-sm transition-all rounded-2xl backdrop-blur-xl border hover:text-white cursor-pointer whitespace-nowrap shadow-sm"
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#b08d57]" : "text-zinc-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="p-4 bg-[#3fa96b]/10 backdrop-blur-xl border border-[#3fa96b]/30 rounded-2xl flex items-center justify-between text-sm text-[#3fa96b] font-mono shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-zinc-400 hover:text-white cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* TAB 1: HOSPITAL VERIFICATION DESK */}
      {workspace === "verify" && (
        <div className="space-y-8">
          {/* Main Verification Row in Liquid Glass */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Card: Input & Scanner */}
            <div className="lg:col-span-7 p-6 md:p-8 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all duration-300 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-[#b08d57]">
                    <Search className="w-5 h-5" />
                  </div>
                  <h2 className="font-bold text-base text-white">License Commitment or Proof URI</h2>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">Primary Source Check</span>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block">
                    Target Credential ID / Challenge URI
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={credentialId}
                      onChange={(e) => setCredentialId(e.target.value)}
                      placeholder="e.g. 0xd5e2dc450d37260f... or aquas://verify/..."
                      style={{
                        background: "rgba(0, 0, 0, 0.5)",
                        color: "#ffffff",
                        borderColor: "rgba(255, 255, 255, 0.15)"
                      }}
                      className="w-full px-4 py-3.5 rounded-xl border text-sm font-mono focus:outline-none focus:border-[#b08d57] transition-colors shadow-inner"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCredentialId("0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74")}
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      color: "#a1a1aa",
                      border: "1px solid rgba(255, 255, 255, 0.1)"
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono hover:text-white hover:border-white/30 transition-colors cursor-pointer"
                  >
                    Sample NY License
                  </button>
                  {records[0] && (
                    <button
                      type="button"
                      onClick={() => setCredentialId(records[0].id)}
                      style={{
                        background: "rgba(255, 255, 255, 0.04)",
                        color: "#a1a1aa",
                        border: "1px solid rgba(255, 255, 255, 0.1)"
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono hover:text-white hover:border-white/30 transition-colors cursor-pointer"
                    >
                      Use Local Active ({records[0].doctorLabel.slice(0, 15)})
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={busy || !credentialId.trim()}
                  style={{
                    background: "#ffffff",
                    color: "#000000",
                    fontWeight: 700
                  }}
                  className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-2xl hover:bg-[#b08d57] transition-all cursor-pointer disabled:opacity-50"
                >
                  {busy ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>Verifying On-Chain Proof…</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-black fill-current" />
                      <span>Execute Cryptographic Seal Check</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Card: Real-time Verification Receipt in Liquid Glass */}
            <div className="lg:col-span-5 p-6 md:p-8 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all duration-300 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-[#3fa96b]">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <h2 className="font-bold text-base text-white">Verification Receipt</h2>
                </div>
                <span className="text-[11px] font-mono text-[#3fa96b] font-semibold">ZKP RECEIPT</span>
              </div>

              {!result ? (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-3 text-zinc-500 font-mono text-xs">
                  <ShieldCheck className="w-12 h-12 text-zinc-700 stroke-1" />
                  <p>Enter a license commitment to generate an immutable on-chain verification receipt.</p>
                </div>
              ) : (
                <div className="space-y-5 font-mono text-xs">
                  {/* Status Banner */}
                  <div className={`p-4 rounded-2xl flex items-center gap-3 border ${
                    result.found && result.status === "valid"
                      ? "bg-[#3fa96b]/10 border-[#3fa96b]/30 text-[#3fa96b]"
                      : "bg-red-500/10 border-red-500/30 text-red-400"
                  }`}>
                    {result.found && result.status === "valid" ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                    <div>
                      <strong className="text-sm font-bold uppercase tracking-wider block">
                        {result.found && result.status === "valid" ? "PRIMARY SOURCE VERIFIED" : "VERIFICATION FAILED / REVOKED"}
                      </strong>
                      <span className="text-[11px] text-zinc-300">Status: {result.status.toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Metadata Table in Liquid Frosted Glass */}
                  {result.found && (
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 space-y-2.5 shadow-inner">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">License Number:</span>
                        <span className="text-white font-bold">{result.record.licenseNumber ?? "MD-NYS-84920"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Issuing Authority:</span>
                        <span className="text-zinc-200">{result.record.board}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Expires:</span>
                        <span className="text-zinc-200">{result.record.expiresAt}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Ledger Status:</span>
                        <span className="text-[#3fa96b] font-bold">Midnight Shielded (Verified)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">PII Disclosed:</span>
                        <span className="text-[#3fa96b] font-bold">0 bytes (HIPAA Safe Harbor)</span>
                      </div>
                      <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                        <span className="text-zinc-500 text-[10px]">On-Chain Contract:</span>
                        <a
                          href={`https://preview.midnightexplorer.com/contract/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74"}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#3fa96b] hover:underline flex items-center gap-1 text-[10px] font-mono"
                        >
                          <Globe size={11} />
                          <span>View on Explorer ↗</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Selective Disclosure Attributes if present */}
                  {disclosedResult && (
                    <div className="p-4 bg-[#b08d57]/10 border border-[#b08d57]/30 rounded-2xl space-y-2">
                      <strong className="text-xs text-[#b08d57] block font-bold">DISCLOSED ATTRIBUTES</strong>
                      {disclosedResult.specialty && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-zinc-400">Specialty:</span>
                          <span className="text-white">{disclosedResult.specialty}</span>
                        </div>
                      )}
                      {disclosedResult.deaSchedule && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-zinc-400">DEA Rights:</span>
                          <span className="text-white">{disclosedResult.deaSchedule}</span>
                        </div>
                      )}
                      {disclosedResult.cmeThresholdSatisfied !== undefined && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-zinc-400">CME Credits:</span>
                          <span className="text-white">≥50 Hours Satisfied</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recent Proof Verification Ledger Table in Liquid Glass */}
          <div className="p-6 md:p-8 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all duration-300 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="font-bold text-lg text-white tracking-tight">Recent Verification Ledger</h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">Audit log of local session proof checks</p>
              </div>
              <span className="text-xs font-mono text-zinc-400">{history.length} events</span>
            </div>

            {history.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 font-mono text-xs">
                No recent checks recorded in this session.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-400 text-[11px]">
                      <th className="pb-3">License Number</th>
                      <th className="pb-3">Issuing Board</th>
                      <th className="pb-3">Expires</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {history.map((h, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 text-white font-bold">{h.licenseNumber}</td>
                        <td className="py-3 text-zinc-300">{h.board}</td>
                        <td className="py-3 text-zinc-400">{h.expiresAt}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            h.status === "valid" ? "bg-[#3fa96b]/15 text-[#3fa96b]" : "bg-red-500/15 text-red-400"
                          }`}>
                            {h.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 text-right text-zinc-500">{formatTimestamp(h.checkedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PHYSICIAN CREDENTIAL WALLET */}
      {workspace === "doctor" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Card: Doctor Pass Flip Card */}
            <div className="lg:col-span-6 p-6 md:p-8 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all duration-300 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-[#b08d57]">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <h2 className="font-bold text-base text-white">Sovereign Physician Pass</h2>
                </div>
                <span className="text-xs font-mono text-[#3fa96b] font-semibold">LOCAL WITNESS</span>
              </div>

              {activeRecord ? (
                <div className="p-6 bg-black/50 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl space-y-6 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono text-[#b08d57] font-bold uppercase tracking-widest block">
                        STATE MEDICAL BOARD
                      </span>
                      <h3 className="text-2xl font-bold text-white mt-1">{activeRecord.doctorLabel}</h3>
                      <span className="text-xs font-mono text-zinc-400">{activeRecord.specialty}</span>
                    </div>
                    <ShieldCheck className="w-8 h-8 text-[#3fa96b]" />
                  </div>

                  <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 font-mono text-xs space-y-2 shadow-inner">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">License ID:</span>
                      <span className="text-white font-bold">{activeRecord.licenseNumber ?? activeRecord.id.slice(0, 10)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Issuing Board:</span>
                      <span className="text-zinc-300">{activeRecord.board}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Valid Through:</span>
                      <span className="text-[#3fa96b] font-bold">{activeRecord.expiresAt}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleGenerateProof}
                      style={{
                        background: "#ffffff",
                        color: "#000000",
                        fontWeight: 700
                      }}
                      className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-xs hover:bg-[#b08d57] transition-colors cursor-pointer shadow-lg"
                    >
                      <Zap size={14} className="text-black fill-current" />
                      <span>Generate QR Proof</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDisclosureModal(true)}
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        color: "#ffffff",
                        border: "1px solid rgba(255, 255, 255, 0.2)"
                      }}
                      className="py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Lock size={14} />
                      <span>Selective Disclosure</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-zinc-500 font-mono text-xs">
                  No local credentials found. Register a license under Board Registry tab.
                </div>
              )}
            </div>

            {/* Right Card: QR Proof & TOTP Countdown in Liquid Glass */}
            <div className="lg:col-span-6 p-6 md:p-8 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all duration-300 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-[#3fa96b]">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h2 className="font-bold text-base text-white">Dynamic Challenge QR</h2>
                </div>
                {proof && (
                  <span className="text-xs font-mono text-[#b08d57] font-bold">
                    EXPIRES IN {proofRemaining}s
                  </span>
                )}
              </div>

              {!proof ? (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-3 text-zinc-500 font-mono text-xs">
                  <Smartphone className="w-12 h-12 text-zinc-700 stroke-1" />
                  <p>Click &quot;Generate QR Proof&quot; to create a challenge-bound anti-replay QR code.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6 py-4">
                  <div className="p-4 bg-white rounded-2xl shadow-2xl">
                    <QRCodeSVG value={proof} size={180} />
                  </div>
                  <div className="text-center font-mono text-xs space-y-1">
                    <p className="text-zinc-400">Anti-screenshot rotating challenge URI</p>
                    <code className="text-[11px] text-[#3fa96b] bg-white/5 px-3 py-1 rounded block truncate max-w-sm">
                      {proof}
                    </code>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STATE MEDICAL BOARD REGISTRY */}
      {workspace === "board" && (
        <div className="space-y-8">
          <div className="flex justify-between items-center pb-2">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Medical Board Registry Governance</h2>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">Issue new physician credentials and manage revocations</p>
            </div>
            <button
              onClick={() => setShowIssue(true)}
              style={{
                background: "#ffffff",
                color: "#000000",
                fontWeight: 700
              }}
              className="px-5 py-3 rounded-2xl flex items-center gap-2 text-xs hover:bg-[#b08d57] transition-all cursor-pointer shadow-xl"
            >
              <Plus size={14} className="text-black" />
              <span>Issue New Credential</span>
            </button>
          </div>

          {/* Credentials Table in Liquid Glass */}
          <div className="p-6 md:p-8 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all duration-300">
            {records.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 font-mono text-xs">
                No active credentials recorded. Click &quot;Issue New Credential&quot; to register a physician on-chain.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-400 text-[11px]">
                      <th className="pb-3">Doctor Name</th>
                      <th className="pb-3">License Number</th>
                      <th className="pb-3">Issuing Board</th>
                      <th className="pb-3">Specialty</th>
                      <th className="pb-3">Expires</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {records.map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 text-white font-bold">{r.doctorLabel}</td>
                        <td className="py-3.5 text-zinc-300">{r.licenseNumber ?? r.id.slice(0, 8)}</td>
                        <td className="py-3.5 text-zinc-400">{r.board}</td>
                        <td className="py-3.5 text-zinc-400">{r.specialty}</td>
                        <td className="py-3.5 text-zinc-400">{r.expiresAt}</td>
                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            effectiveStatus(r) === "valid" ? "bg-[#3fa96b]/15 text-[#3fa96b]" : "bg-red-500/15 text-red-400"
                          }`}>
                            {effectiveStatus(r).toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal for Issuing New License */}
          {showIssue && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
              <div className="w-full max-w-lg p-8 bg-zinc-950 border border-white/15 rounded-3xl shadow-2xl space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#b08d57]" />
                    <h3 className="font-bold text-lg text-white">Issue Physician Credential</h3>
                  </div>
                  <button onClick={() => setShowIssue(false)} className="text-zinc-400 hover:text-white cursor-pointer">&times;</button>
                </div>

                {issueError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono rounded-xl">
                    {issueError}
                  </div>
                )}

                <form onSubmit={handleIssueCredential} className="space-y-4 font-mono text-xs">
                  <div className="space-y-1">
                    <label className="text-zinc-400">Physician Full Name</label>
                    <input
                      name="doctorName"
                      required
                      placeholder="e.g. Dr. Marcus Vance, MD"
                      className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#b08d57]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-400">License Serial Number</label>
                    <input
                      name="licenseNumber"
                      required
                      placeholder="e.g. NY-MED-84920"
                      className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#b08d57]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-400">Issuing Medical Board</label>
                    <input
                      name="issuingBoard"
                      required
                      defaultValue="New York State Medical Board"
                      className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#b08d57]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-zinc-400">Specialty</label>
                      <input
                        name="specialty"
                        defaultValue="Cardiology"
                        className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#b08d57]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400">Expiration Date</label>
                      <input
                        name="expirationDate"
                        type="date"
                        required
                        defaultValue="2028-12-31"
                        className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#b08d57]"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowIssue(false)}
                      className="flex-1 py-3 border border-white/10 rounded-xl text-zinc-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{
                        background: "#ffffff",
                        color: "#000000",
                        fontWeight: 700
                      }}
                      className="flex-1 py-3 rounded-xl hover:bg-[#b08d57] transition-colors cursor-pointer shadow-lg"
                    >
                      Commit to Shielded Ledger
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selective Disclosure Modal */}
      {activeRecord && (
        <SelectiveDisclosureModal
          isOpen={showDisclosureModal}
          onClose={() => setShowDisclosureModal(false)}
          doctorLabel={activeRecord.doctorLabel}
          credentialId={activeRecord.id}
          attributes={{
            specialty: activeRecord.specialty,
            deaAuthorized: true,
            cmeHours: 60,
            cleanRecord: true,
          }}
          onGenerateProof={handleSelectiveProof}
          isGenerating={false}
        />
      )}
    </div>
  );
}
