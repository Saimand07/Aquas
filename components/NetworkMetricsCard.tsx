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
  colorVar = "var(--ink)",
  badge,
}: NetworkMetricsCardProps) {
  return (
    <div
      style={{
        padding: "20px",
        border: "1px solid var(--line)",
        background: "var(--paper-raised)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "120px",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <span
          style={{
            fontSize: "9px",
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            color: "var(--muted)",
            letterSpacing: "0.12em",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        {icon && <div style={{ color: "var(--line-graphite)" }}>{icon}</div>}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
        <strong
          style={{
            fontSize: "30px",
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: colorVar,
            lineHeight: 1,
          }}
        >
          {value}
        </strong>
        {badge && (
          <span
            style={{
              fontSize: "9px",
              fontFamily: "var(--font-mono)",
              padding: "2px 6px",
              background: "rgba(63, 169, 107, 0.15)",
              color: "var(--verified-mint)",
              border: "1px solid rgba(63, 169, 107, 0.3)",
              fontWeight: 700,
            }}
          >
            {badge}
          </span>
        )}
      </div>

      {subValue && (
        <small style={{ marginTop: "8px", fontSize: "11px", color: "var(--muted)", display: "block" }}>
          {subValue}
        </small>
      )}
    </div>
  );
}
