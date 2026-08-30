"use client";

import { useState } from "react";
import {
  ShieldCheck,
  XCircle,
  Scan,
  WifiOff,
} from "lucide-react";
import {
  deserializeOfflinePassFromQr,
  verifyOfflinePass,
  type OfflineVerificationResult,
} from "@/lib/offline-pass";

export default function OfflinePassReader() {
  const [inputQrString, setInputQrString] = useState("");
  const [result, setResult] = useState<OfflineVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQrString.trim()) return;

    setIsVerifying(true);
    try {
      const pass = deserializeOfflinePassFromQr(inputQrString.trim());
      if (!pass) {
        setResult({
          valid: false,
          status: "MALFORMED_PASS",
          errorMessage: "Unrecognized QR code payload format. Expected 'aquas:pass:v1:...'",
          verifiedAt: Math.floor(Date.now() / 1000),
        });
        return;
      }

      const res = await verifyOfflinePass(pass);
      setResult(res);
    } catch (err) {
      setResult({
        valid: false,
        status: "MALFORMED_PASS",
        errorMessage: err instanceof Error ? err.message : "Verification error",
        verifiedAt: Math.floor(Date.now() / 1000),
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={{ border: "1px solid var(--line)", background: "var(--paper-raised)", padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <WifiOff size={16} color="var(--seal-brass)" />
          <span className="eyebrow" style={{ margin: 0 }}>Offline Field Verifier</span>
        </div>
        <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", padding: "2px 6px", background: "rgba(176, 141, 87, 0.15)", color: "var(--seal-brass)", fontWeight: 700 }}>
          ZERO-NETWORK REQUIRED
        </span>
      </div>

      <h3 style={{ margin: "0 0 8px", fontFamily: "var(--font-serif)", fontSize: "20px" }}>
        Scan Physician Offline Pass
      </h3>
      <p style={{ margin: "0 0 20px", fontSize: "12px", color: "var(--muted)" }}>
        Hospital security and triage staff can verify physician credentials locally during internet outages, field operations, or within shielded radiological suites.
      </p>

      <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
        <textarea
          rows={3}
          value={inputQrString}
          onChange={(e) => setInputQrString(e.target.value)}
          placeholder="Paste or scan offline QR token string (aquas:pass:v1:...)"
          style={{ width: "100%", padding: "10px", background: "var(--parchment)", border: "1px solid var(--line)", fontFamily: "var(--font-mono)", fontSize: "11px", resize: "vertical" }}
        />

        <button
          type="submit"
          disabled={isVerifying || !inputQrString.trim()}
          className="notary-cta"
          style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", minHeight: "40px" }}
        >
          <Scan size={14} />
          {isVerifying ? "Verifying Cryptographic Pass Locally…" : "Verify Offline Pass"}
        </button>
      </form>

      {/* Verification Result Display */}
      {result && (
        <div
          style={{
            border: "1px solid " + (result.valid ? "var(--verified-mint)" : "var(--alert-rust)"),
            background: "var(--parchment)",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {result.valid ? (
                <ShieldCheck size={22} color="var(--verified-mint)" />
              ) : (
                <XCircle size={22} color="var(--alert-rust)" />
              )}
              <h4 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "18px", color: result.valid ? "var(--verified-mint)" : "var(--alert-rust)" }}>
                {result.valid ? "OFFLINE VERIFIED · ACTIVE LICENSURE" : "VERIFICATION FAILED"}
              </h4>
            </div>

            <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
              Verified: {new Date(result.verifiedAt * 1000).toLocaleTimeString()}
            </span>
          </div>

          {result.errorMessage && (
            <p style={{ margin: "0 0 14px", fontSize: "12px", color: "var(--alert-rust)", fontWeight: 600 }}>
              {result.errorMessage}
            </p>
          )}

          {result.pass && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", background: "var(--paper-raised)", padding: "12px", border: "1px solid var(--line)", fontSize: "11px" }}>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: "9px", textTransform: "uppercase", display: "block" }}>Physician Name</span>
                  <strong style={{ fontSize: "13px" }}>{result.pass.doctorName}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: "9px", textTransform: "uppercase", display: "block" }}>Specialty</span>
                  <strong style={{ color: "var(--seal-brass)" }}>{result.pass.specialty}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: "9px", textTransform: "uppercase", display: "block" }}>License No.</span>
                  <strong style={{ fontFamily: "var(--font-mono)" }}>{result.pass.licenseNumber}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: "9px", textTransform: "uppercase", display: "block" }}>NPI Number</span>
                  <strong style={{ fontFamily: "var(--font-mono)" }}>{result.pass.npiNumber}</strong>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "var(--muted)", fontSize: "9px", textTransform: "uppercase", display: "block" }}>Issuing State Board Authority</span>
                  <strong>{result.pass.issuingBoard}</strong>
                </div>
              </div>

              {/* Verified Offline Attribute Chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {result.pass.deaSchedule && (
                  <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", padding: "3px 7px", background: "rgba(63, 169, 107, 0.12)", color: "var(--verified-mint)", border: "1px solid rgba(63, 169, 107, 0.3)", fontWeight: 600 }}>
                    ✓ DEA: {result.pass.deaSchedule.replace(/_/g, " ")}
                  </span>
                )}
                {result.pass.cmeVerified && (
                  <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", padding: "3px 7px", background: "rgba(63, 169, 107, 0.12)", color: "var(--verified-mint)", border: "1px solid rgba(63, 169, 107, 0.3)", fontWeight: 600 }}>
                    ✓ CME ≥50h Compliant
                  </span>
                )}
                {result.pass.cleanRecord && (
                  <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", padding: "3px 7px", background: "rgba(63, 169, 107, 0.12)", color: "var(--verified-mint)", border: "1px solid rgba(63, 169, 107, 0.3)", fontWeight: 600 }}>
                    ✓ Zero Disciplinary Sanctions
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
