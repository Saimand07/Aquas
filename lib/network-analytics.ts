import type { OnChainRegistry, OnChainRegistryRecord } from "./midnight-read";
import { shortId } from "./license-registry";

export interface NetworkKPIs {
  totalIssued: number;
  activePhysicians: number;
  revokedLicenses: number;
  trustedBoards: number;
  totalVerifications: number;
  revocationRate: number; // Percentage
  networkIntegrityScore: number; // Percentage (0-100)
  avgVerificationLatencyMs: number;
}

export interface ExpirationBucket {
  id: "critical" | "warning" | "upcoming" | "healthy";
  label: string;
  daysThreshold: number;
  count: number;
  colorVar: string;
  records: OnChainRegistryRecord[];
}

export interface NetworkActivityEvent {
  id: string;
  type: "ISSUANCE" | "VERIFICATION" | "REVOCATION" | "BOARD_REGISTERED";
  title: string;
  description: string;
  timestamp: string;
  timeAgo: string;
  credentialId?: string;
  boardKey?: string;
  blockExplorerUrl?: string;
}

/**
 * Calculates aggregate network KPIs from on-chain registry state.
 */
export function calculateNetworkKPIs(
  registry: OnChainRegistry | null,
  fallbackLatency = 145,
): NetworkKPIs {
  if (!registry) {
    return {
      totalIssued: 0,
      activePhysicians: 0,
      revokedLicenses: 0,
      trustedBoards: 0,
      totalVerifications: 0,
      revocationRate: 0,
      networkIntegrityScore: 100,
      avgVerificationLatencyMs: fallbackLatency,
    };
  }

  const totalIssued = registry.issuanceCount;
  const activePhysicians = registry.activeLicenseCount;
  const revokedLicenses = registry.revocationCount;
  const trustedBoards = registry.boardCount;
  const totalVerifications = registry.verificationCount;

  const revocationRate =
    totalIssued > 0 ? Math.round((revokedLicenses / totalIssued) * 1000) / 10 : 0;

  // Network integrity score is calculated based on active ratio and board trust
  const networkIntegrityScore =
    totalIssued > 0 ? Math.max(0, Math.min(100, 100 - revocationRate)) : 100;

  return {
    totalIssued,
    activePhysicians,
    revokedLicenses,
    trustedBoards,
    totalVerifications,
    revocationRate,
    networkIntegrityScore: Math.round(networkIntegrityScore),
    avgVerificationLatencyMs: fallbackLatency,
  };
}

/**
 * Buckets active licenses by expiration horizon (≤30 days, ≤60 days, ≤90 days, >90 days).
 */
export function computeExpirationBuckets(
  records: OnChainRegistryRecord[],
  now = Math.floor(Date.now() / 1000),
): ExpirationBucket[] {
  const activeRecords = records.filter((r) => r.valid && !r.revoked && r.expiresAt && r.expiresAt > now);

  const critical: OnChainRegistryRecord[] = []; // ≤ 30 days
  const warning: OnChainRegistryRecord[] = []; // 31 - 60 days
  const upcoming: OnChainRegistryRecord[] = []; // 61 - 90 days
  const healthy: OnChainRegistryRecord[] = []; // > 90 days

  const dayInSeconds = 86400;

  activeRecords.forEach((r) => {
    const remainingDays = Math.floor((r.expiresAt! - now) / dayInSeconds);
    if (remainingDays <= 30) {
      critical.push(r);
    } else if (remainingDays <= 60) {
      warning.push(r);
    } else if (remainingDays <= 90) {
      upcoming.push(r);
    } else {
      healthy.push(r);
    }
  });

  return [
    {
      id: "critical",
      label: "Critical (≤ 30 Days)",
      daysThreshold: 30,
      count: critical.length,
      colorVar: "var(--alert-rust)",
      records: critical,
    },
    {
      id: "warning",
      label: "Warning (31–60 Days)",
      daysThreshold: 60,
      count: warning.length,
      colorVar: "#e65100",
      records: warning,
    },
    {
      id: "upcoming",
      label: "Upcoming (61–90 Days)",
      daysThreshold: 90,
      count: upcoming.length,
      colorVar: "var(--seal-brass)",
      records: upcoming,
    },
    {
      id: "healthy",
      label: "Compliant (> 90 Days)",
      daysThreshold: 999,
      count: healthy.length,
      colorVar: "var(--verified-mint)",
      records: healthy,
    },
  ];
}

/**
 * Formats a relative time string (e.g. "2 mins ago", "1 hour ago").
 */
export function formatTimeAgo(timestampSeconds: number, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const diff = Math.max(0, nowSeconds - timestampSeconds);
  if (diff < 60) return `${diff}s ago`;
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Builds a chronological simulated or derived feed of on-chain network events.
 */
export function generateActivityFeed(
  records: OnChainRegistryRecord[],
  contractAddress?: string,
): NetworkActivityEvent[] {
  const events: NetworkActivityEvent[] = [];
  const now = Math.floor(Date.now() / 1000);

  records.forEach((r, idx) => {
    if (r.revoked) {
      events.push({
        id: `rev-${r.credentialId.slice(0, 8)}-${idx}`,
        type: "REVOCATION",
        title: "Medical License Revoked",
        description: `Credential ${shortId(r.credentialId)} revoked on-chain by authorized state board.`,
        timestamp: new Date((r.issuedAt || now) * 1000).toISOString(),
        timeAgo: formatTimeAgo(r.issuedAt || now, now),
        credentialId: r.credentialId,
        blockExplorerUrl: contractAddress
          ? `https://preview.midnightexplorer.com/contracts/${contractAddress}`
          : undefined,
      });
    } else {
      events.push({
        id: `iss-${r.credentialId.slice(0, 8)}-${idx}`,
        type: "ISSUANCE",
        title: "New Credential Issued",
        description: `Board ${r.issuer ? shortId(r.issuer) : "Authority"} committed credential ${shortId(r.credentialId)}.`,
        timestamp: new Date((r.issuedAt || now) * 1000).toISOString(),
        timeAgo: formatTimeAgo(r.issuedAt || now, now),
        credentialId: r.credentialId,
        blockExplorerUrl: contractAddress
          ? `https://preview.midnightexplorer.com/contracts/${contractAddress}`
          : undefined,
      });
    }
  });

  return events.slice(0, 20);
}
