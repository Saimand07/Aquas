"use client";

import { useState } from "react";
import {
  Smartphone,
  Scan
} from "lucide-react";
import PhysicianPassCard from "@/components/PhysicianPassCard";
import OfflinePassReader from "@/components/OfflinePassReader";

// Sample Doctor Credential Data
const SAMPLE_PHYSICIAN = {
  doctorName: "Dr. Sarah Jenkins MD",
  licenseNumber: "NY-294817-MD",
  npiNumber: "1948201938",
  issuingBoard: "New York State Medical Board",
  specialty: "Interventional Cardiology",
  credentialId: "0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74",
  doctorSecretHex: "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
  boardKeyHex: "d72f60d3f297dc84078e19677b60e88759f9982a3ea3dbf87a387814cda034ad",
};

export default function PhysicianPassPage() {
  const [activeTab, setActiveTab] = useState<"pass" | "reader">("pass");

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 font-sans pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3fa96b]/10 border border-[#3fa96b]/20 text-xs font-mono text-[#3fa96b] mb-2 font-semibold">
            <Smartphone size={14} />
            <span>DISCONNECTED PROVING PROTOCOL</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Mobile Physician Pass &amp; Offline Verifier
          </h1>
          <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
            Offline challenge-response verification for surgical bunkers, radiology suites, and emergency field response units.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 p-1 bg-white/[0.04] border border-white/10 rounded-2xl font-mono text-xs">
          <button
            onClick={() => setActiveTab("pass")}
            style={{
              background: activeTab === "pass" ? "#b08d57" : "transparent",
              color: activeTab === "pass" ? "#000000" : "#a1a1aa",
              fontWeight: activeTab === "pass" ? 700 : 500
            }}
            className="px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Smartphone size={13} />
            <span>Doctor Pass</span>
          </button>
          <button
            onClick={() => setActiveTab("reader")}
            style={{
              background: activeTab === "reader" ? "#b08d57" : "transparent",
              color: activeTab === "reader" ? "#000000" : "#a1a1aa",
              fontWeight: activeTab === "reader" ? 700 : 500
            }}
            className="px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Scan size={13} />
            <span>Scanner Reader</span>
          </button>
        </div>
      </div>

      {activeTab === "pass" ? (
        <PhysicianPassCard {...SAMPLE_PHYSICIAN} />
      ) : (
        <OfflinePassReader />
      )}
    </div>
  );
}
