"use client";

import { useState } from "react";
import {
  Send,
  Copy,
  Check,
  Layers,
  Terminal,
  Globe,
  RefreshCw
} from "lucide-react";

const SAMPLE_CREDENTIAL = "0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74";

export default function EhrIntegrationPanel() {
  const [activeTab, setActiveTab] = useState<"api" | "fhir" | "webhooks">("api");
  const [format, setFormat] = useState<"json" | "fhir">("json");
  const [credentialId, setCredentialId] = useState(SAMPLE_CREDENTIAL);
  const [apiKey] = useState("aq_live_hospital_secret_key_demo");
  const [responseOutput, setResponseOutput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Webhook registration state
  const [webhookUrl, setWebhookUrl] = useState("https://hospital-ehr.internal/api/aquas-webhooks");
  const [webhookHospital, setWebhookHospital] = useState("Mount Sinai Hospital Network");
  const [registeredWebhook, setRegisteredWebhook] = useState<{ id: string; secret: string } | null>(null);

  const curlCommand = `curl -X POST https://aquas.health/api/ehr/verify \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "credentialId": "${credentialId}",
    "format": "${format}"
  }'`;

  const handleTestApi = async () => {
    setIsLoading(true);
    setResponseOutput(null);

    try {
      const payload: Record<string, string> = {
        credentialId,
        format,
      };

      const res = await fetch("/api/ehr/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as unknown;
      setResponseOutput(JSON.stringify(data, null, 2));
    } catch (err) {
      setResponseOutput(
        JSON.stringify({ error: err instanceof Error ? err.message : "Network error" }, null, 2),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/webhooks/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          institutionName: webhookHospital,
          events: ["license.verified", "license.revoked", "license.renewed"],
        }),
      });
      const data = (await res.json()) as { subscription?: { id: string; secret: string } };
      if (data.subscription) {
        setRegisteredWebhook({ id: data.subscription.id, secret: data.subscription.secret });
      }
    } catch {
      // ignore
    }
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Tab Navigation */}
      <div className="flex border-b border-white/10 gap-2">
        {[
          { id: "api", label: "1. REST API Endpoint", icon: Terminal },
          { id: "fhir", label: "2. HL7® FHIR® R4 Schema", icon: Layers },
          { id: "webhooks", label: "3. Revocation Webhooks", icon: Globe },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "api" | "fhir" | "webhooks")}
              style={{
                background: isActive ? "rgba(255, 255, 255, 0.08)" : "transparent",
                color: isActive ? "#ffffff" : "#a1a1aa",
                borderBottom: isActive ? "2px solid #b08d57" : "2px solid transparent",
                fontWeight: isActive ? 700 : 500
              }}
              className="px-5 py-3 flex items-center gap-2 text-sm rounded-t-xl hover:text-white transition-all cursor-pointer"
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#b08d57]" : "text-zinc-500"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: REST API */}
      {activeTab === "api" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 p-6 md:p-8 bg-black/50 border border-white/10 rounded-3xl space-y-5">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-bold text-base text-white">Interactive Endpoint Tester</h3>
              <span className="text-[10px] font-mono text-[#3fa96b] bg-[#3fa96b]/10 border border-[#3fa96b]/20 px-2 py-0.5 rounded font-bold">
                POST /api/ehr/verify
              </span>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 block">Credential ID / Hash</label>
                <input
                  type="text"
                  value={credentialId}
                  onChange={(e) => setCredentialId(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#b08d57]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 block">Response Payload Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormat("json")}
                    style={{
                      background: format === "json" ? "#b08d57" : "rgba(255, 255, 255, 0.03)",
                      color: format === "json" ? "#000000" : "#a1a1aa",
                      fontWeight: format === "json" ? 700 : 500
                    }}
                    className="py-2.5 rounded-xl border border-white/10 transition-colors cursor-pointer"
                  >
                    Standard JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat("fhir")}
                    style={{
                      background: format === "fhir" ? "#b08d57" : "rgba(255, 255, 255, 0.03)",
                      color: format === "fhir" ? "#000000" : "#a1a1aa",
                      fontWeight: format === "fhir" ? 700 : 500
                    }}
                    className="py-2.5 rounded-xl border border-white/10 transition-colors cursor-pointer"
                  >
                    HL7 FHIR R4 Bundle
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestApi}
                disabled={isLoading}
                style={{
                  background: "#ffffff",
                  color: "#000000",
                  fontWeight: 700
                }}
                className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-[#b08d57] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin text-black" /> : <Send className="w-4 h-4 text-black" />}
                <span>Execute Verification Request</span>
              </button>
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-center mb-1 text-[11px] font-mono text-zinc-400">
                <span>cURL Snippet:</span>
                <button onClick={copyCurl} className="text-[#b08d57] hover:underline flex items-center gap-1 cursor-pointer">
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre className="p-3 bg-black/60 border border-white/10 rounded-xl text-[10px] font-mono text-zinc-300 overflow-x-auto">
                {curlCommand}
              </pre>
            </div>
          </div>

          <div className="lg:col-span-6 p-6 md:p-8 bg-black/50 border border-white/10 rounded-3xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-bold text-base text-white">Live Response Payload</h3>
              <span className="text-[11px] font-mono text-zinc-500">HTTP 200 OK</span>
            </div>

            {responseOutput ? (
              <pre className="p-4 bg-black/70 border border-white/10 rounded-2xl text-xs font-mono text-[#3fa96b] max-h-[460px] overflow-auto">
                {responseOutput}
              </pre>
            ) : (
              <div className="py-24 text-center text-zinc-500 font-mono text-xs border border-dashed border-white/10 rounded-2xl">
                Click &quot;Execute Verification Request&quot; to inspect the live JSON response payload.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FHIR R4 SCHEMA */}
      {activeTab === "fhir" && (
        <div className="p-6 md:p-8 bg-black/50 border border-white/10 rounded-3xl space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h3 className="font-bold text-xl text-white">HL7® FHIR® R4 Practitioner Schema</h3>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Standardized conformance mapping for Epic Systems, Cerner Millennium, and Meditech Expanse
            </p>
          </div>

          <pre className="p-6 bg-black/70 border border-white/10 rounded-2xl text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
{`{
  "resourceType": "VerificationResult",
  "id": "aquas-vr-e0c9d5d6",
  "target": ["Practitioner/md-nys-84920"],
  "targetLocation": ["http://epic-ehr.internal/fhir/r4/Practitioner/84920"],
  "need": {
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/need",
      "code": "initial",
      "display": "Initial Credentialing"
    }]
  },
  "status": "attested",
  "statusDate": "2026-08-30T09:14:00Z",
  "validationType": {
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/validation-type",
      "code": "primary-source",
      "display": "Primary Source Verification"
    }]
  },
  "validator": [{
    "organization": { "display": "New York State Medical Board" },
    "identityCertificate": "0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74"
  }],
  "attestation": {
    "sourceSignature": "zk-compact-snark-receipt-valid"
  }
}`}
          </pre>
        </div>
      )}

      {/* TAB 3: WEBHOOKS */}
      {activeTab === "webhooks" && (
        <div className="p-6 md:p-8 bg-black/50 border border-white/10 rounded-3xl space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h3 className="font-bold text-xl text-white">Outbound Revocation Webhooks</h3>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Receive real-time signed webhook callbacks whenever a medical board revokes or updates a license on-chain
            </p>
          </div>

          <form onSubmit={handleRegisterWebhook} className="space-y-4 max-w-xl font-mono text-xs">
            <div className="space-y-1">
              <label className="text-zinc-400">Hospital Webhook Receiver URL</label>
              <input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#b08d57]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-zinc-400">Health System Entity Name</label>
              <input
                value={webhookHospital}
                onChange={(e) => setWebhookHospital(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#b08d57]"
              />
            </div>
            <button
              type="submit"
              style={{
                background: "#ffffff",
                color: "#000000",
                fontWeight: 700
              }}
              className="py-3 px-6 rounded-xl hover:bg-[#b08d57] transition-colors cursor-pointer"
            >
              Register Webhook Subscriber
            </button>
          </form>

          {registeredWebhook && (
            <div className="p-4 bg-[#3fa96b]/10 border border-[#3fa96b]/30 rounded-2xl font-mono text-xs space-y-2">
              <strong className="text-[#3fa96b] block">Webhook Subscription Registered:</strong>
              <div>ID: <span className="text-white">{registeredWebhook.id}</span></div>
              <div>HMAC Secret: <span className="text-[#b08d57]">{registeredWebhook.secret}</span></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
