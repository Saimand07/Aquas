"use client";

import {
  Server,
  Building2,
  Lock,
  Layers,
} from "lucide-react";
import EhrIntegrationPanel from "@/components/EhrIntegrationPanel";

export default function EhrGatewayPage() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 font-sans pb-16">
      {/* Page Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b08d57]/10 border border-[#b08d57]/20 text-xs font-mono text-[#b08d57] mb-2 font-semibold">
          <Server size={14} />
          <span>ENTERPRISE HOSPITAL ARCHITECTURE</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
          EHR REST API &amp; Webhooks Gateway
        </h1>
        <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
          Automate primary source verification for <strong>Epic Systems</strong>, <strong>Cerner</strong>, and <strong>Meditech</strong> with HL7 FHIR Release 4 standard endpoints and real-time cryptographic revocation webhooks.
        </p>
      </div>

      {/* Integration Feature Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-black/50 border border-white/10 rounded-2xl flex items-start gap-3">
          <Layers className="w-5 h-5 text-[#b08d57] mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-white">HL7 FHIR R4 Bundle</h3>
            <p className="text-xs text-zinc-400 mt-1">Native verification result resources for Epic and Cerner ingestion.</p>
          </div>
        </div>

        <div className="p-5 bg-black/50 border border-white/10 rounded-2xl flex items-start gap-3">
          <Lock className="w-5 h-5 text-[#3fa96b] mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-white">Zero PII Ingestion</h3>
            <p className="text-xs text-zinc-400 mt-1">Verify without storing sensitive physician SSN or personal background data.</p>
          </div>
        </div>

        <div className="p-5 bg-black/50 border border-white/10 rounded-2xl flex items-start gap-3">
          <Building2 className="w-5 h-5 text-[#b08d57] mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-white">Signed Webhooks</h3>
            <p className="text-xs text-zinc-400 mt-1">Instant push notifications upon state board disciplinary license suspensions.</p>
          </div>
        </div>
      </div>

      {/* Interactive Integration Sandbox */}
      <EhrIntegrationPanel />
    </div>
  );
}
