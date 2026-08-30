import React from "react";

interface NetworkMetricsCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  colorVar?: string;
  badge?: string;
}

export default function NetworkMetricsCard({
  label,
  value,
  subValue,
  icon,
  badge,
}: NetworkMetricsCardProps) {
  return (
    <div className="p-6 bg-white/[0.025] hover:bg-white/[0.04] backdrop-blur-2xl border border-white/[0.12] hover:border-white/[0.22] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_12px_36px_rgba(0,0,0,0.45)] transition-all duration-300 flex flex-col justify-between min-h-[140px] font-sans group">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider">
          {label}
        </span>
        {icon && (
          <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-400 group-hover:text-[#b08d57] group-hover:border-[#b08d57]/30 transition-colors shadow-inner">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2.5">
        <strong className="text-3xl font-bold tracking-tight text-white font-mono">
          {value}
        </strong>
        {badge && (
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#3fa96b]/15 text-[#3fa96b] border border-[#3fa96b]/30 font-bold shadow-sm">
            {badge}
          </span>
        )}
      </div>

      {subValue && (
        <span className="mt-2 text-xs text-zinc-400 font-mono block truncate">
          {subValue}
        </span>
      )}
    </div>
  );
}
