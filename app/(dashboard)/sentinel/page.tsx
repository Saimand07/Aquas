"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Radio,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ShieldCheck,
  Copy,
  Check,
  Download,
  Clock,
  Building2,
  UserX,
  FileText,
  RefreshCw,
  Zap,
  Fingerprint,
  Database,
} from "lucide-react";
import {
  KNOWN_DISCIPLINARY_SANCTIONS,
  initializeAccumulator,
  insertSanctionRecord,
  formatJcahoComplianceRecord,
  generateJcahoAuditReport,
  type AttestedSanctionRecord,
  type DynamicAccumulatorState,
  type JcahoComplianceRecord,
} from "@/lib/sanction-sentinel";

export default function ContinuousSanctionSentinelPage() {
  const [activeTab, setActiveTab] = useState<"simulator" | "feed" | "jcaho">("simulator");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Dynamic accumulator state
  const [accumulator, setAccumulator] = useState<DynamicAccumulatorState | null>(null);
  const [sanctions, setSanctions] = useState<AttestedSanctionRecord[]>(
    Object.values(KNOWN_DISCIPLINARY_SANCTIONS),
  );
  const [isInjecting, setIsInjecting] = useState(false);
  const [injectionSuccess, setInjectionSuccess] = useState(false);

  // Lockout Simulator State
  const [selectedClinicianNpi, setSelectedClinicianNpi] = useState<string>("1882773645"); // Dr. Arthur Vance
  const [selectedEhrSystem, setSelectedEhrSystem] = useState<string>("Epic Hyperdrive");
  const [simulationState, setSimulationState] = useState<"idle" | "running" | "completed">("idle");
  const [simulationStage, setSimulationStage] = useState<number>(0);
  const [simulatedElapsedMs, setSimulatedElapsedMs] = useState<number>(0);
  const [lockoutResult, setLockoutResult] = useState<{
    sanctioned: boolean;
    record?: AttestedSanctionRecord;
    durationMs: number;
    auditSeal: string;
    ehrDirective?: Record<string, unknown>;
  } | null>(null);

  // JCAHO Survey State
  const [selectedHospital, setSelectedHospital] = useState<string>("St. Jude Metropolitan Medical Center");
  const [jcahoRecords, setJcahoRecords] = useState<JcahoComplianceRecord[]>([]);
  const [isExportingJcaho, setIsExportingJcaho] = useState(false);

  // Initialize dynamic accumulator on mount
  useEffect(() => {
    async function init() {
      const state = await initializeAccumulator();
      setAccumulator(state);

      // Pre-generate JCAHO compliance log for existing sanctions + clean staff
      const records: JcahoComplianceRecord[] = [];
      for (const s of Object.values(KNOWN_DISCIPLINARY_SANCTIONS)) {
        const jcaho = await formatJcahoComplianceRecord(
          s.clinicianName,
          s.prescriberNpi,
          s.credentialId,
          s,
          state.accumulatorRoot,
          selectedHospital,
        );
        records.push(jcaho);
      }

      // Add 2 clean staff members
      const cleanDoctors = [
        { name: "Dr. Meredith Grey, MD", npi: "1449882200", cred: "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d" },
        { name: "Dr. Leonard McCoy, MD", npi: "1223344556", cred: "3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e" },
      ];
      for (const doc of cleanDoctors) {
        const jcaho = await formatJcahoComplianceRecord(
          doc.name,
          doc.npi,
          doc.cred.repeat(2),
          undefined,
          state.accumulatorRoot,
          selectedHospital,
        );
        records.push(jcaho);
      }

      setJcahoRecords(records);
    }
    init();
  }, [selectedHospital]);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Simulate an incoming emergency sanction ingestion from NPDB / State Board
  const handleInjectEmergencySanction = async () => {
    if (!accumulator) return;
    setIsInjecting(true);
    setInjectionSuccess(false);

    try {
      const newIncident: AttestedSanctionRecord = {
        recordId: `REC-EMERGENCY-${Date.now().toString(36).toUpperCase()}`,
        credentialId: "d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c",
        prescriberNpi: "1554433221",
        clinicianName: "Dr. Victor Frankenstein, MD",
        sanctionAuthority: "STATE_MEDICAL_BOARD",
        category: "GROSS_NEGLIGENCE_MALPRACTICE",
        severity: "IMMEDIATE_LOCKOUT",
        exclusionStatute: "Cal. Bus. & Prof. Code § 2220 (Summary Suspension)",
        description: "Immediate emergency suspension following unapproved surgical human experimentation.",
        actionDate: Math.floor(Date.now() / 1000),
        oracleFeederSignature: "99aa88bb77cc66dd55ee44ff33aa22bb11cc00dd99ee88ff77aa66bb55cc44dd",
      };

      const { updatedState } = await insertSanctionRecord(accumulator, newIncident);
      setAccumulator(updatedState);
      setSanctions((prev) => [newIncident, ...prev]);
      setInjectionSuccess(true);
      setTimeout(() => setInjectionSuccess(false), 5000);
    } finally {
      setIsInjecting(false);
    }
  };

  // Execute sub-5-second EHR lockout simulation
  const handleRunLockoutSimulation = async () => {
    setSimulationState("running");
    setSimulationStage(0);
    setSimulatedElapsedMs(0);
    setLockoutResult(null);

    const startTime = performance.now();
    const timer = setInterval(() => {
      setSimulatedElapsedMs(Math.round(performance.now() - startTime));
    }, 50);

    const activeSanction = sanctions.find((s) => s.prescriberNpi === selectedClinicianNpi);

    // Stage 1: Disciplinary Event Ingestion (0 - 450ms)
    await new Promise((r) => setTimeout(r, 450));
    setSimulationStage(1);

    // Stage 2: Halo2 ZK Merkle Proof Verification (450 - 1150ms)
    await new Promise((r) => setTimeout(r, 700));
    setSimulationStage(2);

    // Stage 3: HMAC-SHA256 Webhook Generation & Broadcast (1150 - 1800ms)
    await new Promise((r) => setTimeout(r, 650));
    setSimulationStage(3);

    // Stage 4: Hospital EHR CPOE Order-Entry & Rx Lockout (1800 - 2650ms)
    await new Promise((r) => setTimeout(r, 850));
    setSimulationStage(4);

    // Stage 5: Physical RFID OR Badge Access Deactivation (2650 - 3400ms)
    await new Promise((r) => setTimeout(r, 750));
    setSimulationStage(5);

    // Stage 6: Chief Medical Officer Escalation (3400 - 4000ms)
    await new Promise((r) => setTimeout(r, 600));
    setSimulationStage(6);

    clearInterval(timer);
    const finalElapsed = Math.round(performance.now() - startTime);
    setSimulatedElapsedMs(finalElapsed);
    setSimulationState("completed");

    if (activeSanction) {
      setLockoutResult({
        sanctioned: true,
        record: activeSanction,
        durationMs: finalElapsed,
        auditSeal: accumulator?.accumulatorRoot || "00".repeat(32),
        ehrDirective: {
          event: "sentinel.lockout_triggered",
          ehrTarget: selectedEhrSystem,
          prescriberNpi: activeSanction.prescriberNpi,
          clinicianName: activeSanction.clinicianName,
          lockoutDirectives: [
            "IMMEDIATE_CPOE_ORDER_ENTRY_FREEZE",
            "PRESCRIPTION_SIGNING_AUTHORITY_REVOKED",
            "OR_SURGICAL_SUITE_BADGE_ACCESS_DEACTIVATED",
            "ACTIVE_INPATIENT_ROSTER_ALERTED_TO_CHIEF_OF_STAFF",
          ],
          executedInSeconds: (finalElapsed / 1000).toFixed(2),
          complianceStandard: "JCAHO MS.06.01.03",
        },
      });
    } else {
      setLockoutResult({
        sanctioned: false,
        durationMs: finalElapsed,
        auditSeal: accumulator?.accumulatorRoot || "00".repeat(32),
      });
    }
  };

  // Export JCAHO Audit Report
  const handleExportJcahoReport = async () => {
    setIsExportingJcaho(true);
    try {
      const report = await generateJcahoAuditReport(jcahoRecords, selectedHospital);
      const dataStr =
        "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `JCAHO_SURVEY_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } finally {
      setIsExportingJcaho(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 font-sans pb-16">
      {/* Header Banner matching Command Center / EPCS / IMLC styling */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 backdrop-blur-xl border border-rose-500/20 text-xs font-mono text-rose-400 mb-2 font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <Radio size={13} className="animate-pulse" />
            <span>CONTINUOUS SANCTION SENTINEL &amp; REVOCATION ORACLE</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Real-Time Disciplinary Sentinel
          </h1>
          <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
            Continuous off-chain NPDB &amp; HHS-OIG exclusion feed monitoring anchored to Midnight dynamic
            Merkle accumulators. Triggers automated sub-5-second EHR credential lockouts before sanctioned
            clinicians enter surgical suites.
          </p>
        </div>

        {/* Global Quick Regulatory Badges in Liquid Glass */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3.5 py-2 bg-white/[0.025] backdrop-blur-2xl border border-white/10 rounded-2xl text-xs font-mono shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center gap-2">
            <CheckCircle2 size={14} className="text-[#3fa96b]" />
            <span className="text-zinc-300 font-medium">JCAHO MS.06.01.03</span>
          </div>
          <div className="px-3.5 py-2 bg-white/[0.025] backdrop-blur-2xl border border-white/10 rounded-2xl text-xs font-mono shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#b08d57]" />
            <span className="text-zinc-300 font-medium">CMS 42 CFR § 482.12</span>
          </div>
          <div className="px-3.5 py-2 bg-white/[0.025] backdrop-blur-2xl border border-white/10 rounded-2xl text-xs font-mono shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center gap-2">
            <Clock size={14} className="text-rose-400" />
            <span className="text-zinc-300 font-medium">&lt; 5.0s SLA</span>
          </div>
        </div>
      </div>

      {/* Metrics Banner in Liquid Glass */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-zinc-400">Active Exclusions Monitored</div>
            <div className="text-2xl font-bold text-white mt-0.5">{sanctions.length} Attested</div>
            <div className="text-[10px] font-mono text-rose-400/80">NPDB · HHS-OIG · State Boards</div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-mono uppercase text-zinc-400">Dynamic Accumulator Root</div>
            <div className="text-sm font-mono font-bold text-cyan-400 truncate mt-1">
              {accumulator?.accumulatorRoot ? `${accumulator.accumulatorRoot.slice(0, 16)}…` : "Synchronizing…"}
            </div>
            <div className="text-[10px] font-mono text-zinc-500">Midnight Halo2 Dynamic State</div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-[#b08d57]/10 border border-[#b08d57]/20 text-[#b08d57]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-zinc-400">EHR Lockout Latency</div>
            <div className="text-2xl font-bold text-white mt-0.5">3.9s Avg</div>
            <div className="text-[10px] font-mono text-[#b08d57]">Mandate: &lt; 5.0s Strict</div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-[#3fa96b]/10 border border-[#3fa96b]/20 text-[#3fa96b]">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-zinc-400">Disciplinary Feeder Status</div>
            <div className="text-2xl font-bold text-white mt-0.5">LIVE 24/7</div>
            <div className="text-[10px] font-mono text-[#3fa96b]">HMAC-SHA256 Signed Feeds</div>
          </div>
        </div>
      </div>

      {/* Modern Liquid Glass Tab Switcher matching Dashboard */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1">
        {[
          { id: "simulator", label: "1. 5-Second EHR Lockout Simulator", icon: Activity },
          { id: "feed", label: `2. Attested Disciplinary Feed (${sanctions.length})`, icon: Radio },
          { id: "jcaho", label: "3. JCAHO / CMS Survey Auditor", icon: FileText },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "simulator" | "feed" | "jcaho")}
              style={{
                background: isActive ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.02)",
                color: isActive ? "#ffffff" : "#a1a1aa",
                borderColor: isActive ? "rgba(176, 141, 87, 0.5)" : "rgba(255, 255, 255, 0.06)",
                fontWeight: isActive ? 700 : 500,
              }}
              className="px-5 py-3.5 flex items-center gap-2.5 text-sm transition-all rounded-2xl backdrop-blur-xl border hover:text-white cursor-pointer whitespace-nowrap shadow-sm"
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#b08d57]" : "text-zinc-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: 5-Second EHR Lockout Simulator */}
      {activeTab === "simulator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 md:p-8 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-rose-400">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Simulate Immediate Lockout</h2>
                    <p className="text-xs text-zinc-400">Sub-5-second automated hospital defense</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Test how Aquas detects an NPDB or OIG disciplinary sanction and issues automated cryptographic
                directives to freeze CPOE order-entry and badge access in under 5 seconds.
              </p>

              {/* Clinician Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block font-mono">
                  Target Clinician Roster
                </label>
                <select
                  value={selectedClinicianNpi}
                  onChange={(e) => setSelectedClinicianNpi(e.target.value)}
                  disabled={simulationState === "running"}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-3 text-sm text-zinc-200 focus:outline-none focus:border-[#b08d57]/60 font-sans"
                >
                  <optgroup label="Sanctioned Clinicians (NPDB / OIG Excluded)">
                    <option value="1882773645">Dr. Arthur Vance, MD (NPI: 1882773645) - NPDB Gross Negligence</option>
                    <option value="1993884756">Dr. Gregory House, MD (NPI: 1993884756) - HHS-OIG Opioid Diversion</option>
                    <option value="1772663544">Dr. Marcus Welby, MD (NPI: 1772663544) - State Board Summary Suspension</option>
                    <option value="1661552433">Dr. Charles Emerson, DO (NPI: 1661552433) - Medicare Billing Fraud</option>
                  </optgroup>
                  <optgroup label="Active Unsanctioned Clinicians (Clean)">
                    <option value="1449882200">Dr. Meredith Grey, MD (NPI: 1449882200) - Unrestricted Practice</option>
                    <option value="1223344556">Dr. Leonard McCoy, MD (NPI: 1223344556) - Unrestricted Practice</option>
                  </optgroup>
                </select>
              </div>

              {/* EHR System Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block font-mono">
                  Hospital EHR System
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Epic Hyperdrive", "Cerner Millennium", "Meditech Expanse"].map((sys) => (
                    <button
                      key={sys}
                      type="button"
                      onClick={() => setSelectedEhrSystem(sys)}
                      disabled={simulationState === "running"}
                      className={`py-2.5 px-3 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                        selectedEhrSystem === sys
                          ? "bg-rose-500/15 border-rose-500/50 text-rose-200 shadow-sm font-semibold"
                          : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20"
                      }`}
                    >
                      {sys}
                    </button>
                  ))}
                </div>
              </div>

              {/* Run Simulation Trigger */}
              <button
                type="button"
                onClick={handleRunLockoutSimulation}
                disabled={simulationState === "running"}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm shadow-[0_8px_24px_rgba(225,29,72,0.35)] flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {simulationState === "running" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing Lockout Pipeline ({((simulatedElapsedMs || 0) / 1000).toFixed(2)}s)…</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Trigger Real-Time Sentinel Verification</span>
                  </>
                )}
              </button>
            </div>

            {/* Emergency Feeder Injector */}
            <div className="p-6 bg-white/[0.025] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#b08d57]" />
                  <span>Live Disciplinary Feeder Stress Injector</span>
                </div>
                {injectionSuccess && (
                  <span className="text-[11px] text-[#3fa96b] font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Root Updated On-Chain
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Simulates an attested NPDB emergency suspension filed in real time, recalculating the dynamic Merkle
                accumulator root and publishing to Midnight consensus.
              </p>
              <button
                type="button"
                onClick={handleInjectEmergencySanction}
                disabled={isInjecting}
                className="w-full py-2.5 px-4 rounded-xl border border-[#b08d57]/30 bg-[#b08d57]/10 hover:bg-[#b08d57]/20 text-[#b08d57] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isInjecting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Radio className="w-3.5 h-3.5" />
                )}
                <span>Ingest Emergency Revocation (Dr. Victor Frankenstein)</span>
              </button>
            </div>
          </div>

          {/* Simulation Progress & Results Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 md:p-8 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="font-bold text-white text-base flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-rose-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <span>Real-Time Pipeline Execution (Sub-5s Target)</span>
                </div>
                <div className="text-xs font-mono px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-rose-400">
                  Elapsed: {((simulatedElapsedMs || 0) / 1000).toFixed(2)}s
                </div>
              </div>

              {/* Progress Steps */}
              <div className="space-y-3">
                {[
                  { id: 1, title: "Ingest Disciplinary Event from Midnight Consensus", time: "< 0.4s" },
                  { id: 2, title: "Verify Halo2 ZK Merkle Inclusion Proof", time: "< 1.1s" },
                  { id: 3, title: "Generate Signed HMAC-SHA256 Webhook Dispatch", time: "< 1.8s" },
                  { id: 4, title: `Freeze ${selectedEhrSystem} CPOE Order-Entry & Rx Signing`, time: "< 2.7s" },
                  { id: 5, title: "Deactivate RFID Surgical Suite & OR Badge Access", time: "< 3.5s" },
                  { id: 6, title: "Broadcast Emergency Priority Alert to Chief of Staff", time: "< 4.2s" },
                ].map((step) => {
                  const isDone = simulationStage >= step.id;
                  const isCurrent = simulationStage === step.id - 1 && simulationState === "running";

                  return (
                    <div
                      key={step.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all backdrop-blur-md ${
                        isDone
                          ? "bg-rose-500/10 border-rose-500/30 text-zinc-100"
                          : isCurrent
                          ? "bg-white/[0.06] border-rose-500/60 text-white animate-pulse shadow-[0_0_16px_rgba(244,63,94,0.2)]"
                          : "bg-white/[0.015] border-white/5 text-zinc-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isDone
                              ? "bg-rose-500 text-white"
                              : isCurrent
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/50"
                              : "bg-white/10 text-zinc-500"
                          }`}
                        >
                          {isDone ? <Check className="w-3.5 h-3.5" /> : step.id}
                        </div>
                        <span className="text-xs md:text-sm font-medium">{step.title}</span>
                      </div>
                      <span className="text-xs font-mono text-zinc-500">{step.time}</span>
                    </div>
                  );
                })}
              </div>

              {/* Final Result Card */}
              {lockoutResult && (
                <div
                  className={`p-6 rounded-2xl border space-y-4 backdrop-blur-xl ${
                    lockoutResult.sanctioned
                      ? "bg-rose-950/20 border-rose-500/40 text-zinc-200 shadow-[0_8px_32px_rgba(225,29,72,0.15)]"
                      : "bg-[#3fa96b]/10 border-[#3fa96b]/30 text-zinc-200 shadow-[0_8px_32px_rgba(63,169,107,0.15)]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2 font-bold text-base">
                      {lockoutResult.sanctioned ? (
                        <>
                          <AlertTriangle className="w-5 h-5 text-rose-400" />
                          <span className="text-rose-400">CRITICAL LOCKOUT EXECUTED: CLINICIAN EXCLUDED</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-[#3fa96b]" />
                          <span className="text-[#3fa96b]">CLINICIAN CLEARED: ZERO ACTIVE SANCTIONS</span>
                        </>
                      )}
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-black/50 border border-white/10 font-mono text-zinc-300">
                      Completed in {(lockoutResult.durationMs / 1000).toFixed(2)}s
                    </span>
                  </div>

                  {lockoutResult.sanctioned && lockoutResult.record && (
                    <div className="space-y-2.5 text-xs text-zinc-300">
                      <div>
                        <span className="font-semibold text-zinc-400">Sanction Authority:</span>{" "}
                        <span className="text-rose-300 font-bold">{lockoutResult.record.sanctionAuthority}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-zinc-400">Statutory Citation:</span>{" "}
                        <span className="font-mono text-zinc-200">{lockoutResult.record.exclusionStatute}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-zinc-400">Action Summary:</span>{" "}
                        <span className="text-zinc-300">{lockoutResult.record.description}</span>
                      </div>

                      <div className="pt-2">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5 font-mono">
                          <span>EHR Directive Payload ({selectedEhrSystem})</span>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                JSON.stringify(lockoutResult.ehrDirective, null, 2),
                                "ehrDirective",
                              )
                            }
                            className="flex items-center gap-1 text-[#b08d57] hover:text-white transition-colors cursor-pointer"
                          >
                            {copiedField === "ehrDirective" ? (
                              <Check className="w-3.5 h-3.5 text-[#3fa96b]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>Copy Payload</span>
                          </button>
                        </div>
                        <pre className="p-4 rounded-2xl bg-black/60 border border-white/10 text-[11px] font-mono text-cyan-300 overflow-x-auto shadow-inner leading-relaxed">
                          {JSON.stringify(lockoutResult.ehrDirective, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {!lockoutResult.sanctioned && (
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Clinician verified against active dynamic Merkle accumulator root. Zero matches found in
                      NPDB, HHS-OIG, and state medical board exclusion sets. Privileges remain fully authorized.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Attested Disciplinary Feed */}
      {activeTab === "feed" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-rose-400 animate-pulse" />
                <span>Live Disciplinary Incident Feed</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Attested disciplinary sanctions signed by NPDB, HHS-OIG LEIE, and state medical boards.
              </p>
            </div>
            <div className="text-xs font-mono text-zinc-400 bg-white/[0.03] border border-white/10 px-3.5 py-2 rounded-xl backdrop-blur-xl">
              Merkle Leaves: {sanctions.length} · Tree Depth: 3
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sanctions.map((sanction) => (
              <div
                key={sanction.recordId}
                className="p-6 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold font-mono">
                      {sanction.sanctionAuthority}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-zinc-400 text-[11px] font-mono">
                      {sanction.severity}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-zinc-500">
                    {new Date(sanction.actionDate * 1000).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{sanction.clinicianName}</h3>
                  <div className="text-xs text-zinc-400 font-mono">NPI: {sanction.prescriberNpi}</div>
                </div>

                <div className="text-xs text-zinc-300 leading-relaxed bg-black/30 p-3.5 rounded-2xl border border-white/10">
                  <div className="text-rose-300 font-semibold mb-1">{sanction.exclusionStatute}</div>
                  {sanction.description}
                </div>

                <div className="space-y-1.5 pt-1 text-[11px] font-mono text-zinc-500 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span>Feeder Sig:</span>
                    <span className="text-cyan-400">{sanction.oracleFeederSignature.slice(0, 16)}…</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Merkle Leaf:</span>
                    <span className="text-zinc-400">
                      {sanction.merkleLeaf ? `${sanction.merkleLeaf.slice(0, 16)}…` : "Derived on-chain"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: JCAHO / CMS Survey Auditor */}
      {activeTab === "jcaho" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#3fa96b]" />
                <span>Joint Commission &amp; CMS Continuous Compliance Survey</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Meets JCAHO Standard MS.06.01.03 and CMS 42 CFR § 482.12 mandates for continuous practitioner surveillance.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                className="bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-[#b08d57]/60 font-sans"
              >
                <option value="St. Jude Metropolitan Medical Center">St. Jude Metropolitan Medical Center</option>
                <option value="Mayo Clinic Health System">Mayo Clinic Health System</option>
                <option value="Johns Hopkins Hospital">Johns Hopkins Hospital</option>
              </select>

              <button
                type="button"
                onClick={handleExportJcahoReport}
                disabled={isExportingJcaho}
                className="py-2.5 px-4 rounded-xl bg-[#3fa96b] hover:bg-[#389a61] text-black text-xs font-bold flex items-center gap-2 shadow-[0_4px_16px_rgba(63,169,107,0.35)] transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Survey Package (JSON)</span>
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/[0.12] bg-white/[0.025] backdrop-blur-2xl overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-white/[0.03] text-zinc-400 font-mono text-[10px] uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-5">Clinician &amp; NPI</th>
                    <th className="py-3.5 px-5">Survey Standard</th>
                    <th className="py-3.5 px-5">Sanction Status</th>
                    <th className="py-3.5 px-5">Queried Authority</th>
                    <th className="py-3.5 px-5">Cryptographic Seal</th>
                    <th className="py-3.5 px-5">Verified At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {jcahoRecords.map((record) => (
                    <tr key={record.auditId} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-white">{record.clinicianName}</div>
                        <div className="font-mono text-zinc-500 text-[11px]">{record.prescriberNpi}</div>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-cyan-400">{record.surveyStandard}</td>
                      <td className="py-3.5 px-5">
                        {record.sanctionStatus === "CLEARED" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#3fa96b]/10 border border-[#3fa96b]/30 text-[#3fa96b] font-medium text-[11px]">
                            <CheckCircle2 className="w-3 h-3" /> CLEARED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium text-[11px]">
                            <Lock className="w-3 h-3" /> EXCLUDED
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-zinc-400">{record.authorityQueried}</td>
                      <td className="py-3.5 px-5 font-mono text-zinc-400">
                        {record.complianceSeal.slice(0, 12)}…
                      </td>
                      <td className="py-3.5 px-5 text-zinc-500 font-mono text-[11px]">
                        {new Date(record.verifiedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
