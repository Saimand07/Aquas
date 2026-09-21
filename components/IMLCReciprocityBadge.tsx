"use client";

import { Globe, AlertTriangle, XCircle } from "lucide-react";
import type { ReciprocityStatus } from "@/lib/imlc-federation";

interface IMLCReciprocityBadgeProps {
  status: ReciprocityStatus;
  coveredCount?: number;
  homeState?: string;
  targetState?: string;
  className?: string;
}

export default function IMLCReciprocityBadge({
  status,
  coveredCount = 37,
  homeState,
  targetState,
  className = "",
}: IMLCReciprocityBadgeProps) {
  switch (status) {
    case "RECIPROCAL_ACTIVE":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#06b6d4]/10 text-[#22d3ee] border border-[#06b6d4]/30 shadow-[0_0_12px_rgba(6,182,212,0.15)] ${className}`}
          title={homeState && targetState ? `Active IMLC reciprocity between ${homeState} and ${targetState}` : "IMLC Multi-State Reciprocal Practice Active"}
        >
          <Globe className="w-3 h-3 text-[#22d3ee] animate-pulse" />
          <span>IMLC Active</span>
          <span className="text-[10px] px-1 py-0.2 bg-[#06b6d4]/20 rounded text-[#67e8f9] font-mono">
            {coveredCount}+ States
          </span>
        </span>
      );

    case "HOME_STATE_ONLY":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30 ${className}`}
          title="Single-state practice only. Home state is not an IMLC compact member."
        >
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span>Home State Only</span>
        </span>
      );

    case "EXCLUDED_JURISDICTION":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700 ${className}`}
          title="Target state does not participate in IMLC compact."
        >
          <XCircle className="w-3 h-3 text-zinc-400" />
          <span>Non-Compact State</span>
        </span>
      );

    case "SANCTION_FLAGGED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30 ${className}`}
          title="Ineligible for IMLC reciprocity due to disciplinary or sanction flag."
        >
          <AlertTriangle className="w-3 h-3 text-red-400" />
          <span>Compact Sanctioned</span>
        </span>
      );

    default:
      return null;
  }
}
