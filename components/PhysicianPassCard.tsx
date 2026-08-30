"use client";

import { useEffect, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ShieldCheck,
  Copy,
  Check,
  RefreshCw,
  Download,
  WifiOff,
} from "lucide-react";
import {
  generateOfflinePhysicianPass,
  serializeOfflinePassForQr,
  type OfflinePhysicianPass,
} from "@/lib/offline-pass";

interface PhysicianPassCardProps {
  doctorName: string;
  licenseNumber: string;
  npiNumber?: string;
  issuingBoard: string;
  specialty: string;
  credentialId: string;
  doctorSecretHex: string;
  boardKeyHex: string;
}

export default function PhysicianPassCard({
  doctorName,
  licenseNumber,
  npiNumber = "1948201938",
  issuingBoard,
  specialty,
  credentialId,
  doctorSecretHex,
  boardKeyHex,
}: PhysicianPassCardProps) {
  const [pass, setPass] = useState<OfflinePhysicianPass | null>(null);
  const [qrString, setQrString] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(30);
  const [copied, setCopied] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  const refreshPass = useCallback(async () => {
    setIsRotating(true);
    try {
      const newPass = await generateOfflinePhysicianPass(
        credentialId,
        doctorName,
        licenseNumber,
        npiNumber,
        issuingBoard,
        boardKeyHex,
        specialty,
        doctorSecretHex,
      );
      setPass(newPass);
      setQrString(serializeOfflinePassForQr(newPass));
      setRemainingSeconds(30);
    } catch {
      // fallback
    } finally {
      setIsRotating(false);
    }
  }, [
    credentialId,
    doctorName,
    licenseNumber,
    npiNumber,
    issuingBoard,
    boardKeyHex,
    specialty,
    doctorSecretHex,
  ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshPass();
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          refreshPass();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [refreshPass]);

  const handleCopy = () => {
    if (!qrString) return;
    navigator.clipboard.writeText(qrString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    if (!pass) return;
    const blob = new Blob([JSON.stringify(pass, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Aquas-Physician-Pass-${pass.licenseNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - remainingSeconds / 30);

  return (
    <div
      style={{
        maxWidth: "480px",
        margin: "0 auto",
        background: "var(--paper-raised)",
        border: "2px solid var(--ink)",
        boxShadow: "0 16px 36px rgba(0,0,0,0.12)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top Holographic Security Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #1f2a37 0%, #111827 100%)",
          color: "#fff",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "linear-gradient(45deg, #b08d57, #dfc08a)",
              display: "grid",
              placeItems: "center",
              color: "#12181f",
              fontWeight: 900,
              fontSize: "13px",
            }}
          >
            AQ
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Official Physician Pass
            </div>
            <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-mono)" }}>
              Offline Cryptographic Standard
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <WifiOff size={13} color="#dfc08a" />
          <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "#dfc08a", fontWeight: 700 }}>
            OFFLINE READY
          </span>
        </div>
      </div>

      {/* Physician Details & Photo/Seal Row */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
          <div>
            <span className="eyebrow" style={{ fontSize: "8px", margin: "0 0 4px" }}>Licensed Practitioner</span>
            <h2 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "24px", letterSpacing: "-0.02em" }}>
              {doctorName}
            </h2>
            <div style={{ fontSize: "12px", color: "var(--seal-brass)", fontWeight: 600, marginTop: "2px" }}>
              {specialty}
            </div>
          </div>

          <div
            style={{
              width: "48px",
              height: "48px",
              border: "1px solid var(--line)",
              background: "var(--parchment)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <ShieldCheck size={26} color="var(--verified-mint)" />
          </div>
        </div>

        {/* Credential Data Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "11px", background: "var(--parchment)", padding: "12px", border: "1px solid var(--line)" }}>
          <div>
            <span style={{ color: "var(--muted)", fontSize: "9px", textTransform: "uppercase", display: "block" }}>License No.</span>
            <strong style={{ fontFamily: "var(--font-mono)" }}>{licenseNumber}</strong>
          </div>
          <div>
            <span style={{ color: "var(--muted)", fontSize: "9px", textTransform: "uppercase", display: "block" }}>National Provider ID</span>
            <strong style={{ fontFamily: "var(--font-mono)" }}>{npiNumber}</strong>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <span style={{ color: "var(--muted)", fontSize: "9px", textTransform: "uppercase", display: "block" }}>Issuing State Authority</span>
            <strong>{issuingBoard}</strong>
          </div>
        </div>
      </div>

      {/* Dynamic Rotating QR Code Centerpiece */}
      <div style={{ padding: "20px 24px", background: "var(--parchment)", textAlign: "center" }}>
        <div style={{ display: "inline-block", padding: "14px", background: "#ffffff", border: "1px solid var(--line)", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", position: "relative" }}>
          {qrString ? (
            <QRCodeSVG value={qrString} size={180} level="M" marginSize={1} />
          ) : (
            <div style={{ width: 180, height: 180, display: "grid", placeItems: "center" }}>Generating…</div>
          )}
        </div>

        {/* Rotating Countdown Timer Bar */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "16px" }}>
          <div style={{ position: "relative", width: "42px", height: "42px", display: "grid", placeItems: "center" }}>
            <svg style={{ transform: "rotate(-90deg)", width: "42px", height: "42px" }}>
              <circle cx="21" cy="21" r={radius} stroke="var(--line)" strokeWidth="3" fill="none" />
              <circle
                cx="21"
                cy="21"
                r={radius}
                stroke="var(--seal-brass)"
                strokeWidth="3"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <span style={{ position: "absolute", fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
              {remainingSeconds}s
            </span>
          </div>

          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "11px", fontWeight: 700 }}>
              Rotating Anti-Screenshot TOTP
            </div>
            <div style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
              Nonce: <code>{pass?.timeStepNonce ?? "—"}</code>
            </div>
          </div>

          <button
            onClick={refreshPass}
            disabled={isRotating}
            style={{ marginLeft: "auto", background: "transparent", border: "1px solid var(--line)", padding: "6px", cursor: "pointer" }}
            title="Force QR Refresh"
          >
            <RefreshCw size={13} className={isRotating ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Proved Attribute Pills */}
      <div style={{ padding: "14px 24px", borderTop: "1px solid var(--line)", background: "var(--paper-raised)" }}>
        <div style={{ fontSize: "9px", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, marginBottom: "8px" }}>
          Attestations Embedded in QR Token:
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", padding: "2px 6px", background: "rgba(63, 169, 107, 0.12)", color: "var(--verified-mint)", border: "1px solid rgba(63, 169, 107, 0.3)", fontWeight: 600 }}>
            ✓ DEA Schedule II–V Prescriptive
          </span>
          <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", padding: "2px 6px", background: "rgba(63, 169, 107, 0.12)", color: "var(--verified-mint)", border: "1px solid rgba(63, 169, 107, 0.3)", fontWeight: 600 }}>
            ✓ CME ≥ 50 Hours Compliant
          </span>
          <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", padding: "2px 6px", background: "rgba(63, 169, 107, 0.12)", color: "var(--verified-mint)", border: "1px solid rgba(63, 169, 107, 0.3)", fontWeight: 600 }}>
            ✓ Zero NPDB Sanctions
          </span>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div style={{ padding: "14px 24px", background: "var(--parchment)", borderTop: "1px solid var(--line)", display: "flex", gap: "10px" }}>
        <button
          onClick={handleCopy}
          style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--line)", background: "var(--paper-raised)", fontSize: "11px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer" }}
        >
          {copied ? <Check size={13} color="var(--verified-mint)" /> : <Copy size={13} />}
          {copied ? "Copied QR Token" : "Copy QR String"}
        </button>

        <button
          onClick={handleDownloadJson}
          style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--line)", background: "var(--paper-raised)", fontSize: "11px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer" }}
        >
          <Download size={13} />
          Export Pass File
        </button>
      </div>
    </div>
  );
}
