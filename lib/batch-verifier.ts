import { shortId } from "./license-registry";

export interface BatchDoctorEntry {
  id: string; // Unique row ID
  credentialId: string; // 64-character hexadecimal credential ID
  doctorName?: string; // Optional physician label (client-side only)
  npiNumber?: string; // Optional NPI identifier (client-side only)
  department?: string; // Optional hospital department / specialty
}

export type BatchItemStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "NOT_FOUND" | "ERROR";

export interface BatchVerificationResult {
  id: string;
  credentialId: string;
  doctorName: string;
  npiNumber: string;
  department: string;
  status: BatchItemStatus;
  issuerBoard: string | null;
  issuedAt: number | null;
  expiresAt: number | null;
  valid: boolean;
  checkedAt: string;
  latencyMs: number;
  errorMessage?: string;
}

export interface BatchProgress {
  total: number;
  completed: number;
  currentEntry: string | null;
  percent: number;
}

export function cleanCredentialId(raw: string): string {
  const trimmed = raw.trim().replace(/^0x/i, "");
  const match = trimmed.match(/[0-9a-fA-F]{64}/);
  return match ? match[0].toLowerCase() : trimmed.toLowerCase();
}

export function isValidCredentialId(id: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(cleanCredentialId(id));
}

/**
 * Parses raw text input (CSV, TSV, JSON, or multiline IDs) into structured BatchDoctorEntry items.
 */
export function parseRosterInput(rawContent: string): { entries: BatchDoctorEntry[]; errors: string[] } {
  const trimmed = rawContent.trim();
  const errors: string[] = [];
  const entries: BatchDoctorEntry[] = [];

  if (!trimmed) {
    return { entries: [], errors: ["Input content is empty."] };
  }

  // Attempt JSON parsing first
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown[];
      parsed.forEach((item, idx) => {
        if (typeof item === "string") {
          const cleaned = cleanCredentialId(item);
          if (isValidCredentialId(cleaned)) {
            entries.push({
              id: `row-${idx + 1}`,
              credentialId: cleaned,
              doctorName: `Physician #${idx + 1}`,
              npiNumber: "—",
              department: "General",
            });
          } else {
            errors.push(`Row ${idx + 1}: Invalid 64-char hex credential ID ("${item.slice(0, 16)}...")`);
          }
        } else if (typeof item === "object" && item !== null) {
          const obj = item as Record<string, unknown>;
          const rawId = String(obj.credentialId ?? obj.id ?? obj.credential ?? "");
          const cleaned = cleanCredentialId(rawId);
          if (isValidCredentialId(cleaned)) {
            entries.push({
              id: `row-${idx + 1}`,
              credentialId: cleaned,
              doctorName: String(obj.doctorName ?? obj.name ?? obj.doctor ?? `Physician #${idx + 1}`),
              npiNumber: String(obj.npiNumber ?? obj.npi ?? "—"),
              department: String(obj.department ?? obj.dept ?? obj.specialty ?? "General"),
            });
          } else {
            errors.push(`Row ${idx + 1}: Invalid 64-char hex credential ID ("${rawId.slice(0, 16)}...")`);
          }
        }
      });
      return { entries, errors };
    } catch {
      // Fall through to CSV/line parsing if JSON parse fails
    }
  }

  // Line-by-line CSV / Delimited parser
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let isFirstLineHeader = false;

  if (lines.length > 0) {
    const firstLineLower = lines[0].toLowerCase();
    if (
      firstLineLower.includes("credential") ||
      firstLineLower.includes("id") ||
      firstLineLower.includes("doctor") ||
      firstLineLower.includes("name")
    ) {
      isFirstLineHeader = true;
    }
  }

  const dataLines = isFirstLineHeader ? lines.slice(1) : lines;

  dataLines.forEach((line, idx) => {
    const rowNum = isFirstLineHeader ? idx + 2 : idx + 1;
    // Split by comma, tab, or semicolon if not inside quotes
    const delimiter = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
    const parts = line.split(delimiter).map((p) => p.replace(/^["']|["']$/g, "").trim());

    if (parts.length === 1) {
      const cleaned = cleanCredentialId(parts[0]);
      if (isValidCredentialId(cleaned)) {
        entries.push({
          id: `row-${rowNum}`,
          credentialId: cleaned,
          doctorName: `Physician #${rowNum}`,
          npiNumber: "—",
          department: "General Staff",
        });
      } else {
        errors.push(`Line ${rowNum}: "${parts[0].slice(0, 20)}..." is not a valid 64-character hex ID.`);
      }
    } else {
      // Format: [credentialId, doctorName, npiNumber, department] or [doctorName, credentialId, ...]
      let credIndex = parts.findIndex((p) => isValidCredentialId(p));
      if (credIndex === -1) {
        // Check if any part contains a 64-char hex string
        credIndex = parts.findIndex((p) => /[0-9a-fA-F]{64}/.test(cleanCredentialId(p)));
      }

      if (credIndex !== -1) {
        const cleaned = cleanCredentialId(parts[credIndex]);
        const otherParts = parts.filter((_, i) => i !== credIndex);
        entries.push({
          id: `row-${rowNum}`,
          credentialId: cleaned,
          doctorName: otherParts[0] || `Physician #${rowNum}`,
          npiNumber: otherParts[1] || "—",
          department: otherParts[2] || "General Staff",
        });
      } else {
        errors.push(`Line ${rowNum}: No valid 64-character credential ID detected in row.`);
      }
    }
  });

  return { entries, errors };
}

/**
 * Generate a sample CSV template string for hospital credentialing teams.
 */
export function generateSampleCsvTemplate(): string {
  return `credentialId,doctorName,npiNumber,department
e0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70,Dr. Sarah Jenkins MD,1982746192,Cardiology
0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74,Dr. Marcus Chen MD,1029384756,Emergency Medicine
0xd72f60d3f297dc84078e19677b60e88759f9982a3ea3dbf87a387814cda034ad,Dr. Elena Rostova MD,1482910385,Neurology
063d2925b9428dd77e829933b9a41dc7b8c7ae8a702e15c16d56fcc0ae8e5889,Dr. James Thornton DO,1928374650,Anesthesiology`;
}

/**
 * Verify a single credential entry against the server-side license verification endpoint.
 */
export async function verifySingleBatchEntry(
  entry: BatchDoctorEntry,
  indexerUri?: string,
  indexerWsUri?: string,
): Promise<BatchVerificationResult> {
  const startTime = performance.now();
  const checkedAt = new Date().toISOString();

  try {
    const payload: Record<string, unknown> = {
      credentialId: entry.credentialId,
    };
    if (indexerUri) payload.indexerUri = indexerUri;
    if (indexerWsUri) payload.indexerWsUri = indexerWsUri;

    const response = await fetch("/api/license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const elapsed = Math.round(performance.now() - startTime);

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({ error: "Verification server error" }));
      return {
        id: entry.id,
        credentialId: entry.credentialId,
        doctorName: entry.doctorName || `Physician (${shortId(entry.credentialId)})`,
        npiNumber: entry.npiNumber || "—",
        department: entry.department || "General",
        status: "ERROR",
        issuerBoard: null,
        issuedAt: null,
        expiresAt: null,
        valid: false,
        checkedAt,
        latencyMs: elapsed,
        errorMessage: String(errJson.error || "HTTP " + response.status),
      };
    }

    const data = await response.json();

    if (!data.exists) {
      return {
        id: entry.id,
        credentialId: entry.credentialId,
        doctorName: entry.doctorName || `Physician (${shortId(entry.credentialId)})`,
        npiNumber: entry.npiNumber || "—",
        department: entry.department || "General",
        status: "NOT_FOUND",
        issuerBoard: null,
        issuedAt: null,
        expiresAt: null,
        valid: false,
        checkedAt,
        latencyMs: elapsed,
      };
    }

    let status: BatchItemStatus = "ACTIVE";
    if (data.revoked) {
      status = "REVOKED";
    } else if (!data.valid) {
      status = "EXPIRED";
    }

    return {
      id: entry.id,
      credentialId: entry.credentialId,
      doctorName: entry.doctorName || `Physician (${shortId(entry.credentialId)})`,
      npiNumber: entry.npiNumber || "—",
      department: entry.department || "General",
      status,
      issuerBoard: data.issuer ? `Board ${shortId(data.issuer)}` : "Authorized State Board",
      issuedAt: data.issuedAt,
      expiresAt: data.expiresAt,
      valid: Boolean(data.valid),
      checkedAt,
      latencyMs: elapsed,
    };
  } catch (err) {
    const elapsed = Math.round(performance.now() - startTime);
    return {
      id: entry.id,
      credentialId: entry.credentialId,
      doctorName: entry.doctorName || `Physician (${shortId(entry.credentialId)})`,
      npiNumber: entry.npiNumber || "—",
      department: entry.department || "General",
      status: "ERROR",
      issuerBoard: null,
      issuedAt: null,
      expiresAt: null,
      valid: false,
      checkedAt,
      latencyMs: elapsed,
      errorMessage: err instanceof Error ? err.message : "Network failure",
    };
  }
}

/**
 * Executes high-concurrency batch verification with rate-limiting chunks.
 */
export async function executeBatchVerification(
  entries: BatchDoctorEntry[],
  concurrencyLimit = 5,
  indexerUri?: string,
  indexerWsUri?: string,
  onProgress?: (progress: BatchProgress) => void,
): Promise<BatchVerificationResult[]> {
  const results: BatchVerificationResult[] = [];
  let completed = 0;

  for (let i = 0; i < entries.length; i += concurrencyLimit) {
    const chunk = entries.slice(i, i + concurrencyLimit);
    const chunkPromises = chunk.map(async (entry) => {
      const res = await verifySingleBatchEntry(entry, indexerUri, indexerWsUri);
      completed++;
      if (onProgress) {
        onProgress({
          total: entries.length,
          completed,
          currentEntry: entry.doctorName || shortId(entry.credentialId),
          percent: Math.round((completed / entries.length) * 100),
        });
      }
      return res;
    });

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }

  return results;
}
