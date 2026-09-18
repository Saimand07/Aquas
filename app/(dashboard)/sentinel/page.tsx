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
  Sparkles,
  Clock,
  Building2,
  UserX,
  FileText,
  RefreshCw,
  Zap,
  Fingerprint,
  Flame,
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
  const [activeTab, setActiveTab] = useState<"feed" | "simulator" | "jcaho">("simulator");
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

    // Stage 1: Disciplinary Event Ingestion (0 - 400ms)
    await new Promise((r) => setTimeout(r, 450));
    setSimulationStage(1);

    // Stage 2: Halo2 ZK Merkle Proof Verification (400 - 1100ms)
    await new Promise((r) => setTimeout(r, 700));
    setSimulationStage(2);

    // Stage 3: HMAC-SHA256 Webhook Generation & Broadcast (1100 - 1800ms)
    await new Promise((r) => setTimeout(r, 650));
    setSimulationStage(3);

    // Stage 4: Hospital EHR CPOE Order-Entry & Rx Lockout (1800 - 2700ms)
    await new Promise((r) => setTimeout(r, 850));
    setSimulationStage(4);

    // Stage 5: Physical RFID OR Badge Access Deactivation (2700 - 3600ms)
    await new Promise((r) => setTimeout(r, 750));
    setSimulationStage(5);

    // Stage 6: Chief Medical Officer Escalation (3600 - 4200ms)
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
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-rose-950/20 to-slate-900 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
              Continuous Sanction Sentinel & Revocation Oracle
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Real-Time Disciplinary Sentinel
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-2xl leading-relaxed">
              Continuous off-chain NPDB &amp; HHS-OIG exclusion feed monitoring anchored to Midnight
              dynamic Merkle accumulators. Triggers automated sub-5-second EHR credential lockouts before
              sanctioned clinicians enter the OR.
            </p>
          </div>

          {/* Quick Regulatory Badge */}
          <div className="flex flex-col gap-2 p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2 font-medium text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              JCAHO Standard MS.06.01.03 Compliant
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              CMS 42 CFR § 482.12 Continuous Audit
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Zap className="w-4 h-4 text-amber-400" />
              Sub-5-Second Epic/Cerner Lockout
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">Active Exclusions Monitored</div>
            <div className="text-2xl font-bold text-white mt-0.5">{sanctions.length} Attested</div>
            <div className="text-[11px] text-rose-400/80">NPDB + HHS-OIG + Medical Boards</div>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-400">Dynamic Accumulator Root</div>
            <div className="text-sm font-mono font-bold text-cyan-400 truncate mt-1">
              {accumulator?.accumulatorRoot ? `${accumulator.accumulatorRoot.slice(0, 16)}...` : "Synchronizing..."}
            </div>
            <div className="text-[11px] text-slate-500">Midnight Halo2 Dynamic State</div>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">EHR Lockout Latency</div>
            <div className="text-2xl font-bold text-white mt-0.5">3.9s Avg</div>
            <div className="text-[11px] text-amber-400">Mandate: &lt; 5.0s Strict</div>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">Disciplinary Feeder Status</div>
            <div className="text-2xl font-bold text-white mt-0.5">LIVE 24/7</div>
            <div className="text-[11px] text-emerald-400">HMAC-SHA256 Signed Feeds</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab("simulator")}
          className={`pb-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "simulator"
              ? "border-rose-500 text-rose-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Zap className="w-4 h-4" />
          5-Second EHR Lockout Simulator
        </button>

        <button
          onClick={() => setActiveTab("feed")}
          className={`pb-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "feed"
              ? "border-rose-500 text-rose-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Radio className="w-4 h-4" />
          Attested Disciplinary Feed ({sanctions.length})
        </button>

        <button
          onClick={() => setActiveTab("jcaho")}
          className={`pb-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "jcaho"
              ? "border-rose-500 text-rose-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          JCAHO / CMS Survey Auditor
        </button>
      </div>

      {/* TAB 1: 5-Second EHR Lockout Simulator */}
      {activeTab === "simulator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-5">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                Simulate Immediate EHR Lockout
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Test how Aquas detects an NPDB or OIG disciplinary sanction and issues automated cryptographic
                directives to freeze CPOE order-entry and badge access in under 5 seconds.
              </p>

              {/* Clinician Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Target Clinician Roster
                </label>
                <select
                  value={selectedClinicianNpi}
                  onChange={(e) => setSelectedClinicianNpi(e.target.value)}
                  disabled={simulationState === "running"}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500"
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
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Hospital EHR System
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Epic Hyperdrive", "Cerner Millennium", "Meditech Expanse"].map((sys) => (
                    <button
                      key={sys}
                      onClick={() => setSelectedEhrSystem(sys)}
                      disabled={simulationState === "running"}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                        selectedEhrSystem === sys
                          ? "bg-rose-500/10 border-rose-500/50 text-rose-300"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {sys}
                    </button>
                  ))}
                </div>
              </div>

              {/* Run Simulation Trigger */}
              <button
                onClick={handleRunLockoutSimulation}
                disabled={simulationState === "running"}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {simulationState === "running" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Executing Lockout Pipeline ({((simulatedElapsedMs || 0) / 1000).toFixed(2)}s)...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Trigger Real-Time Sentinel Verification
                  </>
                )}
              </button>
            </div>

            {/* Emergency Feeder Injector */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Live Feeder Stress Injector
                </div>
                {injectionSuccess && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Root Updated On-Chain
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Simulates an attested NPDB emergency suspension filed right now, publishing a new Merkle
                accumulator root to Midnight consensus.
              </p>
              <button
                onClick={handleInjectEmergencySanction}
                disabled={isInjecting}
                className="w-full py-2.5 px-3 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                {isInjecting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Ingest Emergency Revocation (Dr. Victor Frankenstein)
              </button>
            </div>
          </div>

          {/* Simulation Progress & Results Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-6">
              <div className="flex items-center justify-between">
                <div className="font-bold text-white text-base flex items-center gap-2">
                  <Activity className="w-5 h-5 text-rose-400" />
                  Real-Time Pipeline Execution (Sub-5s Target)
                </div>
                <div className="text-xs font-mono px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-rose-400">
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
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        isDone
                          ? "bg-rose-950/20 border-rose-500/40 text-slate-100"
                          : isCurrent
                          ? "bg-slate-800/60 border-rose-500/60 text-slate-200 animate-pulse"
                          : "bg-slate-950/40 border-slate-800/60 text-slate-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isDone
                              ? "bg-rose-500 text-white"
                              : isCurrent
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/50"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          {isDone ? <Check className="w-3.5 h-3.5" /> : step.id}
                        </div>
                        <span className="text-xs md:text-sm font-medium">{step.title}</span>
                      </div>
                      <span className="text-xs font-mono text-slate-500">{step.time}</span>
                    </div>
                  );
                })}
              </div>

              {/* Final Result Card */}
              {lockoutResult && (
                <div
                  className={`p-5 rounded-xl border space-y-4 ${
                    lockoutResult.sanctioned
                      ? "bg-rose-950/30 border-rose-500 text-slate-200"
                      : "bg-emerald-950/30 border-emerald-500 text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-base">
                      {lockoutResult.sanctioned ? (
                        <>
                          <AlertTriangle className="w-5 h-5 text-rose-400" />
                          <span className="text-rose-400">CRITICAL LOCKOUT EXECUTED: CLINICIAN EXCLUDED</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span className="text-emerald-400">CLINICIAN CLEARED: ZERO ACTIVE SANCTIONS</span>
                        </>
                      )}
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded bg-slate-950 border border-slate-800 font-mono">
                      Completed in {(lockoutResult.durationMs / 1000).toFixed(2)}s
                    </span>
                  </div>

                  {lockoutResult.sanctioned && lockoutResult.record && (
                    <div className="space-y-2 text-xs text-slate-300">
                      <div>
                        <span className="font-semibold text-slate-400">Sanction Authority:</span>{" "}
                        <span className="text-rose-300 font-bold">{lockoutResult.record.sanctionAuthority}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-400">Statutory Citation:</span>{" "}
                        <span className="font-mono text-slate-200">{lockoutResult.record.exclusionStatute}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-400">Action Summary:</span>{" "}
                        <span>{lockoutResult.record.description}</span>
                      </div>

                      <div className="pt-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span>EHR Directive Payload ({selectedEhrSystem})</span>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                JSON.stringify(lockoutResult.ehrDirective, null, 2),
                                "ehrDirective",
                              )
                            }
                            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                          >
                            {copiedField === "ehrDirective" ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            Copy Payload
                          </button>
                        </div>
                        <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto">
                          {JSON.stringify(lockoutResult.ehrDirective, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {!lockoutResult.sanctioned && (
                    <p className="text-xs text-slate-400">
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
                Live Disciplinary Incident Feed
              </h2>
              <p className="text-xs text-slate-400">
                Attested disciplinary sanctions signed by NPDB, HHS-OIG LEIE, and state medical boards.
              </p>
            </div>
            <div className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
              Merkle Leaves: {sanctions.length} | Tree Depth: 3
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sanctions.map((sanction) => (
              <div
                key={sanction.recordId}
                className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-all space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold">
                      {sanction.sanctionAuthority}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[11px] font-mono">
                      {sanction.severity}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {new Date(sanction.actionDate * 1000).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{sanction.clinicianName}</h3>
                  <div className="text-xs text-slate-400 font-mono">NPI: {sanction.prescriberNpi}</div>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <div className="text-rose-300 font-semibold mb-1">{sanction.exclusionStatute}</div>
                  {sanction.description}
                </div>

                <div className="space-y-1.5 pt-1 text-[11px] font-mono text-slate-500">
                  <div className="flex items-center justify-between">
                    <span>Feeder Sig:</span>
                    <span className="text-cyan-400">{sanction.oracleFeederSignature.slice(0, 16)}...</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Merkle Leaf:</span>
                    <span className="text-slate-400">
                      {sanction.merkleLeaf ? `${sanction.merkleLeaf.slice(0, 16)}...` : "Derived on-chain"}
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
                <Building2 className="w-5 h-5 text-emerald-400" />
                Joint Commission &amp; CMS Continuous Compliance Survey
              </h2>
              <p className="text-xs text-slate-400">
                Meets JCAHO Standard MS.06.01.03 and CMS 42 CFR § 482.12 mandates for continuous practitioner surveillance.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
              >
                <option value="St. Jude Metropolitan Medical Center">St. Jude Metropolitan Medical Center</option>
                <option value="Mayo Clinic Health System">Mayo Clinic Health System</option>
                <option value="Johns Hopkins Hospital">Johns Hopkins Hospital</option>
              </select>

              <button
                onClick={handleExportJcahoReport}
                disabled={isExportingJcaho}
                className="py-2 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Export Survey Package (JSON)
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Clinician &amp; NPI</th>
                    <th className="py-3 px-4">Survey Standard</th>
                    <th className="py-3 px-4">Sanction Status</th>
                    <th className="py-3 px-4">Queried Authority</th>
                    <th className="py-3 px-4">Cryptographic Seal</th>
                    <th className="py-3 px-4">Verified At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {jcahoRecords.map((record) => (
                    <tr key={record.auditId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{record.clinicianName}</div>
                        <div className="font-mono text-slate-500">{record.prescriberNpi}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-cyan-400">{record.surveyStandard}</td>
                      <td className="py-3 px-4">
                        {record.sanctionStatus === "CLEARED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium text-[11px]">
                            <CheckCircle2 className="w-3 h-3" /> CLEARED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium text-[11px]">
                            <Lock className="w-3 h-3" /> EXCLUDED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{record.authorityQueried}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {record.complianceSeal.slice(0, 12)}...
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
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
