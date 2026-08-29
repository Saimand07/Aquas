"use client";

import { useState } from "react";
import {
  Code2,
  Send,
  Copy,
  Check,
  ShieldCheck,
  Plus,
} from "lucide-react";

const SAMPLE_CREDENTIAL = "e0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70";

export default function EhrIntegrationPanel() {
  const [activeTab, setActiveTab] = useState<"api" | "fhir" | "webhooks">("api");
  const [format, setFormat] = useState<"json" | "fhir">("json");
  const [credentialId, setCredentialId] = useState(SAMPLE_CREDENTIAL);
  const [apiKey, setApiKey] = useState("aq_live_hospital_secret_key_demo");
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
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Tab Navigation */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--line)", gap: "16px" }}>
        <button
          onClick={() => setActiveTab("api")}
          style={{
            padding: "10px 16px",
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "api" ? "2px solid var(--ink)" : "2px solid transparent",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            color: activeTab === "api" ? "var(--ink)" : "var(--muted)",
          }}
        >
          REST API Explorer
        </button>
        <button
          onClick={() => setActiveTab("fhir")}
          style={{
            padding: "10px 16px",
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "fhir" ? "2px solid var(--ink)" : "2px solid transparent",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            color: activeTab === "fhir" ? "var(--ink)" : "var(--muted)",
          }}
        >
          HL7® FHIR® R4 Practitioner Adapter
        </button>
        <button
          onClick={() => setActiveTab("webhooks")}
          style={{
            padding: "10px 16px",
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "webhooks" ? "2px solid var(--ink)" : "2px solid transparent",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            color: activeTab === "webhooks" ? "var(--ink)" : "var(--muted)",
          }}
        >
          Outbound Webhooks Gateway
        </button>
      </div>

      {/* Tab 1: REST API Explorer */}
      {activeTab === "api" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "24px" }}>
          <div style={{ border: "1px solid var(--line)", background: "var(--paper-raised)", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span className="eyebrow" style={{ margin: 0 }}>Endpoint Definition</span>
              <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", padding: "2px 6px", background: "rgba(63, 169, 107, 0.15)", color: "var(--verified-mint)", fontWeight: 700 }}>
                POST /api/ehr/verify
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>
                Bearer API Key
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", marginTop: "4px", background: "var(--parchment)", border: "1px solid var(--line)", fontFamily: "var(--font-mono)", fontSize: "12px" }}
                />
              </label>

              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>
                Credential ID or Proof URI
                <input
                  type="text"
                  value={credentialId}
                  onChange={(e) => setCredentialId(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", marginTop: "4px", background: "var(--parchment)", border: "1px solid var(--line)", fontFamily: "var(--font-mono)", fontSize: "12px" }}
                />
              </label>

              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>
                  Response Format:
                </span>
                <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="format"
                    checked={format === "json"}
                    onChange={() => setFormat("json")}
                  />
                  Standard JSON
                </label>
                <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="format"
                    checked={format === "fhir"}
                    onChange={() => setFormat("fhir")}
                  />
                  HL7 FHIR R4 JSON
                </label>
              </div>
            </div>

            {/* cURL Display */}
            <div style={{ position: "relative", background: "var(--parchment)", border: "1px solid var(--line)", padding: "14px", marginBottom: "16px" }}>
              <button
                onClick={copyCurl}
                style={{ position: "absolute", top: "10px", right: "10px", background: "transparent", border: "none", cursor: "pointer", color: copied ? "var(--verified-mint)" : "var(--muted)" }}
                title="Copy cURL"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <pre style={{ margin: 0, fontSize: "11px", fontFamily: "var(--font-mono)", overflowX: "auto", whiteSpace: "pre-wrap" }}>
                {curlCommand}
              </pre>
            </div>

            <button
              onClick={handleTestApi}
              disabled={isLoading}
              className="notary-cta"
              style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", minHeight: "42px" }}
            >
              <Send size={14} />
              {isLoading ? "Executing Zero-Knowledge Query…" : "Send Test Verification Request"}
            </button>
          </div>

          {/* Response Inspector */}
          <div style={{ border: "1px solid var(--line)", background: "var(--paper-raised)", padding: "24px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span className="eyebrow" style={{ margin: 0 }}>Live Gateway Response</span>
              <small style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                Settlement: Midnight Preview
              </small>
            </div>

            <div style={{ flex: 1, background: "var(--parchment)", border: "1px solid var(--line)", padding: "14px", overflowY: "auto", maxHeight: "400px" }}>
              {responseOutput ? (
                <pre style={{ margin: 0, fontSize: "11px", fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap" }}>
                  {responseOutput}
                </pre>
              ) : (
                <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: "12px" }}>
                  <Code2 size={24} style={{ marginBottom: "8px", opacity: 0.5 }} />
                  Click &quot;Send Test Verification Request&quot; to inspect live response payload.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: HL7 FHIR R4 Specs */}
      {activeTab === "fhir" && (
        <div style={{ border: "1px solid var(--line)", background: "var(--paper-raised)", padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <ShieldCheck size={20} color="var(--seal-brass)" />
            <h3 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "22px" }}>
              HL7® FHIR® Release 4 Conformance
            </h3>
          </div>
          <p style={{ margin: "0 0 20px", fontSize: "13px", color: "var(--muted)", lineHeight: 1.6 }}>
            Aquas implements the standard HL7 FHIR Release 4 <code>VerificationResult</code> profile. Hospital EHR systems like <strong>Epic Systems (Chantilly / Hyperspace)</strong> and <strong>Oracle Health / Cerner Millennium</strong> can ingest Aquas responses directly without custom translation middleware.
          </p>

          <div style={{ background: "var(--parchment)", border: "1px solid var(--line)", padding: "16px" }}>
            <span className="eyebrow" style={{ fontSize: "9px" }}>Example FHIR VerificationResult Output</span>
            <pre style={{ margin: "8px 0 0", fontSize: "11px", fontFamily: "var(--font-mono)", overflowX: "auto" }}>
{`{
  "resourceType": "VerificationResult",
  "id": "aq-vr-e0c9d5d6d0ce",
  "status": "validated",
  "statusDate": "2026-08-30T00:00:00.000Z",
  "validationType": {
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/verificationresult-validation-type",
      "code": "primary",
      "display": "Primary Source Verification (Zero-Knowledge Compact Proof)"
    }]
  },
  "extension": [
    {
      "url": "https://aquas.health/fhir/StructureDefinition/zk-credential-id",
      "valueString": "e0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70"
    },
    {
      "url": "https://aquas.health/fhir/StructureDefinition/zero-knowledge-proven",
      "valueBoolean": true
    }
  ]
}`}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 3: Outbound Webhooks */}
      {activeTab === "webhooks" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "24px" }}>
          <div style={{ border: "1px solid var(--line)", background: "var(--paper-raised)", padding: "24px" }}>
            <span className="eyebrow" style={{ margin: 0 }}>Webhook Subscriptions</span>
            <h3 style={{ margin: "4px 0 16px", fontFamily: "var(--font-serif)", fontSize: "20px" }}>
              Register Regulatory Event Webhook
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: "12px", color: "var(--muted)" }}>
              Receive instant cryptographically signed push notifications whenever any monitored physician credential is renewed or revoked on the Midnight ledger.
            </p>

            <form onSubmit={handleRegisterWebhook} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>
                Healthcare Institution Name
                <input
                  type="text"
                  value={webhookHospital}
                  onChange={(e) => setWebhookHospital(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", marginTop: "4px", background: "var(--parchment)", border: "1px solid var(--line)", fontFamily: "var(--font-mono)", fontSize: "12px" }}
                />
              </label>

              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>
                Target Webhook HTTPS URL
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", marginTop: "4px", background: "var(--parchment)", border: "1px solid var(--line)", fontFamily: "var(--font-mono)", fontSize: "12px" }}
                />
              </label>

              <button
                type="submit"
                className="notary-cta"
                style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", minHeight: "40px", marginTop: "8px" }}
              >
                <Plus size={14} />
                Register Webhook Endpoint
              </button>
            </form>

            {registeredWebhook && (
              <div style={{ marginTop: "20px", padding: "14px", background: "var(--parchment)", border: "1px solid var(--verified-mint)" }}>
                <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--verified-mint)", fontWeight: 700 }}>
                  ✓ WEBHOOK REGISTERED
                </span>
                <div style={{ fontSize: "11px", marginTop: "6px" }}>
                  <strong>Subscription ID:</strong> <code>{registeredWebhook.id}</code>
                </div>
                <div style={{ fontSize: "11px", marginTop: "4px" }}>
                  <strong>HMAC Secret:</strong> <code>{registeredWebhook.secret}</code>
                </div>
                <small style={{ color: "var(--muted)", fontSize: "10px", display: "block", marginTop: "6px" }}>
                  Save your HMAC secret securely. It is used to verify the <code>X-Aquas-Signature</code> header.
                </small>
              </div>
            )}
          </div>

          <div style={{ border: "1px solid var(--line)", background: "var(--paper-raised)", padding: "24px" }}>
            <span className="eyebrow" style={{ margin: 0 }}>Security Protocol</span>
            <h3 style={{ margin: "4px 0 16px", fontFamily: "var(--font-serif)", fontSize: "20px" }}>
              HMAC Signature Verification
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "12px", color: "var(--muted)", lineHeight: 1.5 }}>
              All webhook payloads are delivered with an <code>X-Aquas-Signature</code> header containing timestamp and cryptographic HMAC-SHA256 signature to prevent tampering and replay attacks.
            </p>

            <div style={{ background: "var(--parchment)", border: "1px solid var(--line)", padding: "14px" }}>
              <pre style={{ margin: 0, fontSize: "11px", fontFamily: "var(--font-mono)", overflowX: "auto" }}>
{`// Node.js Verification Example:
import crypto from "crypto";

function verifyAquasWebhook(rawBody, signatureHeader, secret) {
  const [tPart, v1Part] = signatureHeader.split(",");
  const timestamp = tPart.split("=")[1];
  const signature = v1Part.split("=")[1];

  const payload = timestamp + "." + rawBody;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return signature === expected;
}`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
