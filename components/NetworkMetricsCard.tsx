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
    <div className="p-6 bg-black/50 border border-white/10 rounded-3xl flex flex-col justify-between min-h-[130px] font-sans">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider">
          {label}
        </span>
        {icon && <div className="text-zinc-400">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-2.5">
        <strong className="text-3xl font-bold tracking-tight text-white font-mono">
          {value}
        </strong>
        {badge && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#3fa96b]/15 text-[#3fa96b] border border-[#3fa96b]/30 font-bold">
            {badge}
          </span>
        )}
      </div>

      {subValue && (
        <span className="mt-2 text-xs text-zinc-500 font-mono block">
          {subValue}
        </span>
      )}
    </div>
  );
}
