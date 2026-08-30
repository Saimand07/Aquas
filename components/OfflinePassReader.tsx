"use client";

import { useState } from "react";
import {
  XCircle,
  Scan,
  WifiOff,
  CheckCircle2
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
    <div className="p-6 md:p-8 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all duration-300 space-y-6 font-sans">
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <WifiOff size={18} className="text-[#3fa96b]" />
          <div>
            <h3 className="font-bold text-base text-white">Offline Field Scanner</h3>
            <p className="text-xs text-zinc-400 font-mono">Verify without internet or external connections</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#b08d57]/15 text-[#b08d57] border border-[#b08d57]/30 font-bold">
          ZERO-NETWORK REQUIRED
        </span>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-mono uppercase text-zinc-400 block">
            Offline QR Token String
          </label>
          <textarea
            rows={3}
            value={inputQrString}
            onChange={(e) => setInputQrString(e.target.value)}
            placeholder="Paste or scan offline QR token string (aquas:pass:v1:...)"
            className="w-full p-4 bg-white/[0.03] border border-white/15 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-[#b08d57]"
          />
        </div>

        <button
          type="submit"
          disabled={isVerifying || !inputQrString.trim()}
          style={{
            background: "#ffffff",
            color: "#000000",
            fontWeight: 700
          }}
          className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs shadow-xl hover:bg-[#b08d57] transition-colors cursor-pointer disabled:opacity-50"
        >
          <Scan size={14} className="text-black" />
          <span>{isVerifying ? "Verifying Cryptographic HMAC Locally…" : "Verify Offline Pass"}</span>
        </button>
      </form>

      {/* Verification Result Display */}
      {result && (
        <div className={`p-6 rounded-2xl border font-mono text-xs space-y-4 ${
          result.valid
            ? "bg-[#3fa96b]/10 border-[#3fa96b]/30"
            : "bg-red-500/10 border-red-500/30"
        }`}>
          <div className="flex items-center gap-3">
            {result.valid ? (
              <CheckCircle2 size={24} className="text-[#3fa96b]" />
            ) : (
              <XCircle size={24} className="text-red-400" />
            )}
            <div>
              <strong className={`text-sm font-bold uppercase tracking-wider block ${
                result.valid ? "text-[#3fa96b]" : "text-red-400"
              }`}>
                {result.valid ? "OFFLINE PASS CRYPTOGRAPHICALLY VALID" : "INVALID / EXPIRED OFFLINE PASS"}
              </strong>
              <span className="text-[11px] text-zinc-300">Status: {result.status}</span>
            </div>
          </div>

          {result.valid && result.pass && (
            <div className="bg-black/50 border border-white/10 rounded-xl p-4 space-y-2 text-zinc-300">
              <div className="flex justify-between">
                <span className="text-zinc-500">Physician Name:</span>
                <span className="text-white font-bold">{result.pass.doctorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">License Number:</span>
                <span className="text-white">{result.pass.licenseNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Issuing Board:</span>
                <span className="text-zinc-200">{result.pass.issuingBoard}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Anti-Replay Verification:</span>
                <span className="text-[#3fa96b] font-bold">Passed (HMAC Verified)</span>
              </div>
            </div>
          )}

          {result.errorMessage && (
            <p className="text-xs text-red-400">{result.errorMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}
