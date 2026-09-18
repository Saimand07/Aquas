"use client";

import { useState, useMemo } from "react";
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  Search,
  ShieldCheck,
  Building2,
  Radio,
  ExternalLink,
} from "lucide-react";
import {
  IMLC_JURISDICTIONS,
  evaluateIMLCReciprocity,
  isIMLCMember,
  type IMLCJurisdiction,
} from "@/lib/imlc-federation";

// 8x12 US Cartogram Grid Coordinates
interface StateGridPosition {
  code: string;
  row: number;
  col: number;
}

const US_CARTOGRAM_POSITIONS: StateGridPosition[] = [
  // Row 0
  { code: "AK", row: 0, col: 0 },
  { code: "ME", row: 0, col: 11 },
  // Row 1
  { code: "WA", row: 1, col: 2 },
  { code: "ID", row: 1, col: 3 },
  { code: "MT", row: 1, col: 4 },
  { code: "ND", row: 1, col: 5 },
  { code: "MN", row: 1, col: 6 },
  { code: "IL", row: 1, col: 7 },
  { code: "WI", row: 1, col: 8 },
  { code: "MI", row: 1, col: 9 },
  { code: "NY", row: 1, col: 10 },
  { code: "VT", row: 1, col: 11 },
  // Row 2
  { code: "OR", row: 2, col: 2 },
  { code: "NV", row: 2, col: 3 },
  { code: "WY", row: 2, col: 4 },
  { code: "SD", row: 2, col: 5 },
  { code: "IA", row: 2, col: 6 },
  { code: "IN", row: 2, col: 7 },
  { code: "OH", row: 2, col: 8 },
  { code: "PA", row: 2, col: 9 },
  { code: "NJ", row: 2, col: 10 },
  { code: "NH", row: 2, col: 11 },
  // Row 3
  { code: "CA", row: 3, col: 2 },
  { code: "UT", row: 3, col: 3 },
  { code: "CO", row: 3, col: 4 },
  { code: "NE", row: 3, col: 5 },
  { code: "MO", row: 3, col: 6 },
  { code: "KY", row: 3, col: 7 },
  { code: "WV", row: 3, col: 8 },
  { code: "VA", row: 3, col: 9 },
  { code: "MD", row: 3, col: 10 },
  { code: "MA", row: 3, col: 11 },
  // Row 4
  { code: "AZ", row: 4, col: 3 },
  { code: "NM", row: 4, col: 4 },
  { code: "KS", row: 4, col: 5 },
  { code: "AR", row: 4, col: 6 },
  { code: "TN", row: 4, col: 7 },
  { code: "NC", row: 4, col: 8 },
  { code: "SC", row: 4, col: 9 },
  { code: "DE", row: 4, col: 10 },
  { code: "CT", row: 4, col: 11 },
  // Row 5
  { code: "OK", row: 5, col: 5 },
  { code: "LA", row: 5, col: 6 },
  { code: "MS", row: 5, col: 7 },
  { code: "AL", row: 5, col: 8 },
  { code: "GA", row: 5, col: 9 },
  { code: "DC", row: 5, col: 10 },
  { code: "RI", row: 5, col: 11 },
  // Row 6
  { code: "HI", row: 6, col: 0 },
  { code: "TX", row: 6, col: 5 },
  { code: "FL", row: 6, col: 9 },
  // Row 7
  { code: "GU", row: 7, col: 0 },
];

interface IMLCReciprocityMapProps {
  homeState: string;
  selectedTargetState: string;
  onSelectTargetState: (stateCode: string) => void;
  className?: string;
}

export default function IMLCReciprocityMap({
  homeState,
  selectedTargetState,
  onSelectTargetState,
  className = "",
}: IMLCReciprocityMapProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  const activeStateToInspect = hoveredState || selectedTargetState;
  const inspectedJurisdiction: IMLCJurisdiction | undefined = IMLC_JURISDICTIONS[activeStateToInspect];

  const reciprocityResult = useMemo(() => {
    return evaluateIMLCReciprocity(homeState, activeStateToInspect);
  }, [homeState, activeStateToInspect]);

  const getStateColorClass = (code: string) => {
    const isHome = code === homeState;
    const isSelected = code === selectedTargetState;
    const isTarget = code === activeStateToInspect;
    const juris = IMLC_JURISDICTIONS[code];

    if (isHome) {
      return "bg-emerald-500/20 text-emerald-300 border-emerald-400/70 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-2 ring-emerald-400";
    }

    if (!juris) {
      return "bg-zinc-900/60 text-zinc-500 border-white/5";
    }

    if (juris.status === "ACTIVE_MEMBER") {
      if (isIMLCMember(homeState)) {
        return isSelected
          ? "bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] ring-2 ring-cyan-400"
          : "bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border-cyan-500/30 hover:border-cyan-400/60";
      }
      return "bg-zinc-800/60 text-zinc-300 border-zinc-700/50 hover:border-cyan-500/40";
    }

    if (juris.status === "LEGISLATION_PASSED") {
      return isSelected
        ? "bg-amber-500/30 text-amber-200 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] ring-2 ring-amber-400"
        : "bg-amber-950/30 hover:bg-amber-900/50 text-amber-300 border-amber-500/30";
    }

    // NON_MEMBER
    return isSelected
      ? "bg-zinc-800 text-white border-zinc-500 ring-2 ring-zinc-500"
      : "bg-zinc-900/50 hover:bg-zinc-800/60 text-zinc-500 border-white/5";
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Map Control Bar & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            Interstate Medical Licensure Compact (IMLC) Federation Map
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Click any jurisdiction to evaluate cross-state zero-knowledge practice reciprocity from{" "}
            <span className="text-emerald-400 font-semibold">{homeState}</span>.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-mono flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 border border-emerald-400" />
            <span className="text-zinc-300">Home SPL ({homeState})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500/40 border border-cyan-400" />
            <span className="text-zinc-300">Reciprocal Clear (37+)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/40 border border-amber-400" />
            <span className="text-zinc-300">Legislation Passed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-zinc-800 border border-zinc-700" />
            <span className="text-zinc-500">Non-Member</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* US Cartogram Visualizer */}
        <div className="lg:col-span-8 bg-black/40 border border-white/[0.08] rounded-2xl p-4 sm:p-6 overflow-x-auto">
          <div className="min-w-[580px] grid grid-cols-12 gap-2">
            {Array.from({ length: 8 * 12 }).map((_, idx) => {
              const row = Math.floor(idx / 12);
              const col = idx % 12;
              const pos = US_CARTOGRAM_POSITIONS.find((p) => p.row === row && p.col === col);

              if (!pos) {
                return <div key={`empty-${row}-${col}`} className="h-10 sm:h-12 pointer-events-none" />;
              }

              const isHome = pos.code === homeState;
              const isSelected = pos.code === selectedTargetState;

              return (
                <button
                  key={pos.code}
                  type="button"
                  onClick={() => onSelectTargetState(pos.code)}
                  onMouseEnter={() => setHoveredState(pos.code)}
                  onMouseLeave={() => setHoveredState(null)}
                  className={`relative h-10 sm:h-12 rounded-xl border flex flex-col items-center justify-center font-bold text-xs transition-all duration-200 cursor-pointer select-none ${getStateColorClass(
                    pos.code,
                  )}`}
                >
                  <span>{pos.code}</span>
                  {isHome && (
                    <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 bg-emerald-500 text-black text-[8px] font-black rounded-full uppercase">
                      SPL
                    </span>
                  )}
                  {isSelected && !isHome && (
                    <span className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Jurisdiction Inspector Panel */}
        <div className="lg:col-span-4 bg-black/40 border border-white/[0.08] rounded-2xl p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">
                  Jurisdiction Inspector
                </span>
                <h4 className="text-xl font-bold text-white flex items-center gap-2 mt-0.5">
                  <span>{activeStateToInspect}</span>
                  <span className="text-sm font-normal text-zinc-400">
                    {inspectedJurisdiction?.name?.split(" ")[0] || activeStateToInspect}
                  </span>
                </h4>
              </div>

              {inspectedJurisdiction?.status === "ACTIVE_MEMBER" ? (
                <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono rounded-full font-bold">
                  IMLC Compact
                </span>
              ) : inspectedJurisdiction?.status === "LEGISLATION_PASSED" ? (
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono rounded-full font-bold">
                  Legislation
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] font-mono rounded-full">
                  Non-Member
                </span>
              )}
            </div>

            {/* Regulatory Board Details */}
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 text-zinc-300">
                <Building2 className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                <span>{inspectedJurisdiction?.name || "State Medical Authority"}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400 font-mono text-[11px] pt-1">
                <span>FIPS Code:</span>
                <span className="text-zinc-200 font-semibold">{inspectedJurisdiction?.fipsCode ?? "N/A"}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400 font-mono text-[11px]">
                <span>Telehealth Privileges:</span>
                <span className="text-emerald-400 font-semibold">Authorized</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400 font-mono text-[11px]">
                <span>In-Person Practice:</span>
                <span className="text-emerald-400 font-semibold">Authorized</span>
              </div>
            </div>

            {/* Reciprocity Standing Box */}
            <div
              className={`p-3.5 rounded-xl border text-xs ${
                reciprocityResult.eligible
                  ? "bg-cyan-950/30 border-cyan-500/30 text-cyan-200"
                  : "bg-zinc-900/60 border-white/10 text-zinc-400"
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                {reciprocityResult.eligible ? (
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                )}
                <span>
                  {reciprocityResult.eligible
                    ? "Practice Authorization Cleared"
                    : reciprocityResult.reciprocityStatus === "HOME_STATE_ONLY"
                    ? "Home State Only"
                    : "Non-Compact Jurisdiction"}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-300">{reciprocityResult.reason}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 mt-4">
            <button
              type="button"
              onClick={() => onSelectTargetState(activeStateToInspect)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify Reciprocity for {activeStateToInspect}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
