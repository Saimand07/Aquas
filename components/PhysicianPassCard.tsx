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
  Smartphone
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
    a.download = `physician-pass-${doctorName.replace(/\s+/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start font-sans">
      {/* Left Card: Doctor Pass View */}
      <div className="lg:col-span-6 p-6 md:p-8 bg-black/50 border border-white/10 rounded-3xl space-y-6 shadow-xl">
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#b08d57]" />
            <h3 className="font-bold text-base text-white">Cryptographic Mobile Pass</h3>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#3fa96b]/15 text-[#3fa96b] border border-[#3fa96b]/30 font-bold">
            30S ROTATION
          </span>
        </div>

        <div className="p-6 bg-gradient-to-br from-zinc-900 via-black to-zinc-950 border border-white/15 rounded-2xl shadow-2xl space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono text-[#b08d57] uppercase font-bold tracking-widest block">
                {issuingBoard}
              </span>
              <h2 className="text-2xl font-bold text-white mt-1">{doctorName}</h2>
              <span className="text-xs font-mono text-zinc-400">{specialty}</span>
            </div>
            <ShieldCheck className="w-8 h-8 text-[#3fa96b]" />
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 font-mono text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-zinc-400">License Number:</span>
              <span className="text-white font-bold">{licenseNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">NPI Number:</span>
              <span className="text-zinc-300">{npiNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">HMAC Challenge:</span>
              <span className="text-[#3fa96b]">{pass?.timeStepNonce ? pass.timeStepNonce.slice(0, 16) + "…" : "Generating…"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={refreshPass}
              disabled={isRotating}
              style={{
                background: "#ffffff",
                color: "#000000",
                fontWeight: 700
              }}
              className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-xs hover:bg-[#b08d57] transition-colors cursor-pointer"
            >
              <RefreshCw size={13} className={isRotating ? "animate-spin text-black" : "text-black"} />
              <span>Rotate Challenge Now</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadJson}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.2)"
              }}
              className="py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Download size={13} />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Card: Rotating QR Code Display */}
      <div className="lg:col-span-6 p-6 md:p-8 bg-black/50 border border-white/10 rounded-3xl space-y-6 shadow-xl flex flex-col items-center text-center">
        <div className="w-full flex justify-between items-center border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-[#3fa96b]" />
            <h3 className="font-bold text-base text-white">Dynamic Field QR Token</h3>
          </div>
          <span className="text-xs font-mono text-[#b08d57] font-bold">
            EXPIRES IN {remainingSeconds}S
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl shadow-2xl my-2">
          <QRCodeSVG value={qrString || "aquas:loading"} size={200} />
        </div>

        <div className="space-y-2 w-full font-mono text-xs">
          <p className="text-zinc-400 text-xs">
            Anti-screenshot 30-second HMAC token for zero-connectivity triage.
          </p>
          <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/10 rounded-xl">
            <code className="text-[11px] text-[#3fa96b] truncate max-w-[260px]">
              {qrString}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="text-zinc-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
            >
              {copied ? <Check size={12} className="text-[#3fa96b]" /> : <Copy size={12} />}
              <span>{copied ? "Copied" : "Copy Token"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
