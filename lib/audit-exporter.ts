import type { BatchVerificationResult } from "./batch-verifier";

export interface AuditReportMeta {
  institutionName?: string;
  auditorId?: string;
  reportTitle?: string;
  notes?: string;
}

/**
 * Converts batch verification results into a standardized CSV string.
 */
export function exportResultsToCsv(
  results: BatchVerificationResult[],
  meta: AuditReportMeta = {},
): string {
  const timestamp = new Date().toISOString();
  const institution = meta.institutionName || "General Healthcare Facility";
  const auditor = meta.auditorId || "Authorized Credentialing Desk";

  const lines: string[] = [
    `# AQUAS ZERO-KNOWLEDGE MEDICAL CREDENTIAL AUDIT REPORT`,
    `# Institution: "${institution.replace(/"/g, '""')}"`,
    `# Auditor / Operator: "${auditor.replace(/"/g, '""')}"`,
    `# Audit Timestamp: "${timestamp}"`,
    `# Network: "Midnight Preview Testnet"`,
    `# Total Audited: ${results.length}`,
    `# Active: ${results.filter((r) => r.status === "ACTIVE").length} | Expired: ${results.filter((r) => r.status === "EXPIRED").length} | Revoked: ${results.filter((r) => r.status === "REVOKED").length} | Not Found: ${results.filter((r) => r.status === "NOT_FOUND").length} | Errors: ${results.filter((r) => r.status === "ERROR").length}`,
    ``,
    `RowID,DoctorName,NPINumber,Department,Status,Valid,CredentialID,IssuerBoard,IssuedAt,ExpiresAt,LatencyMs,CheckedAt,ErrorMessage`,
  ];

  results.forEach((r) => {
    const issuedDate = r.issuedAt ? new Date(r.issuedAt * 1000).toISOString().slice(0, 10) : "—";
    const expireDate = r.expiresAt ? new Date(r.expiresAt * 1000).toISOString().slice(0, 10) : "—";
    const row = [
      `"${r.id}"`,
      `"${(r.doctorName || "").replace(/"/g, '""')}"`,
      `"${(r.npiNumber || "").replace(/"/g, '""')}"`,
      `"${(r.department || "").replace(/"/g, '""')}"`,
      `"${r.status}"`,
      r.valid ? "TRUE" : "FALSE",
      `"${r.credentialId}"`,
      `"${(r.issuerBoard || "").replace(/"/g, '""')}"`,
      `"${issuedDate}"`,
      `"${expireDate}"`,
      r.latencyMs,
      `"${r.checkedAt}"`,
      `"${(r.errorMessage || "").replace(/"/g, '""')}"`,
    ];
    lines.push(row.join(","));
  });

  return lines.join("\r\n");
}

/**
 * Triggers a browser download of the generated CSV file.
 */
export function downloadCsvReport(csvContent: string, filename = "aquas-credential-audit-report.csv"): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an HTML document styled for professional printing or PDF export (Joint Commission JCAHO / CMS Audit Report).
 */
export function generatePrintableHtmlCertificate(
  results: BatchVerificationResult[],
  meta: AuditReportMeta = {},
): string {
  const timestamp = new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "long" });
  const institution = meta.institutionName || "Saint Jude Memorial Healthcare System";
  const auditor = meta.auditorId || "Department of Medical Staff Credentialing";
  const activeCount = results.filter((r) => r.status === "ACTIVE").length;
  const expiredCount = results.filter((r) => r.status === "EXPIRED").length;
  const revokedCount = results.filter((r) => r.status === "REVOKED").length;
  const notFoundCount = results.filter((r) => r.status === "NOT_FOUND").length;
  const errorCount = results.filter((r) => r.status === "ERROR").length;
  const complianceRate = results.length > 0 ? Math.round((activeCount / results.length) * 100) : 0;

  const rowsHtml = results
    .map((r, i) => {
      const issued = r.issuedAt ? new Date(r.issuedAt * 1000).toISOString().slice(0, 10) : "—";
      const expires = r.expiresAt ? new Date(r.expiresAt * 1000).toISOString().slice(0, 10) : "—";
      const statusColor =
        r.status === "ACTIVE"
          ? "#2e7d32"
          : r.status === "EXPIRED"
          ? "#e65100"
          : r.status === "REVOKED"
          ? "#c62828"
          : "#616161";

      return `
      <tr style="border-bottom: 1px solid #e0e0e0; font-size: 11px;">
        <td style="padding: 8px 6px; color: #757575;">#${i + 1}</td>
        <td style="padding: 8px 6px; font-weight: 600;">${r.doctorName}</td>
        <td style="padding: 8px 6px; font-family: monospace;">${r.npiNumber}</td>
        <td style="padding: 8px 6px;">${r.department}</td>
        <td style="padding: 8px 6px; font-family: monospace; font-size: 10px; color: #555;">${r.credentialId.slice(0, 8)}…${r.credentialId.slice(-6)}</td>
        <td style="padding: 8px 6px;">${r.issuerBoard || "—"}</td>
        <td style="padding: 8px 6px; font-family: monospace;">${issued}</td>
        <td style="padding: 8px 6px; font-family: monospace;">${expires}</td>
        <td style="padding: 8px 6px; font-weight: 700; color: ${statusColor};">${r.status}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AQUAS Regulatory Compliance & Credential Verification Audit</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 40px; background: #fff; line-height: 1.4; }
    .header { border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .brand { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase; }
    .badge { display: inline-block; background: #1a1a1a; color: #fff; font-size: 9px; padding: 3px 6px; font-family: monospace; font-weight: 600; border-radius: 3px; margin-top: 4px; }
    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; background: #f8f9fa; padding: 16px; border-radius: 6px; border: 1px solid #e9ecef; }
    .meta-item span { display: block; font-size: 10px; color: #6c757d; text-transform: uppercase; font-weight: 600; }
    .meta-item strong { font-size: 15px; color: #212529; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { text-align: left; background: #f1f3f5; padding: 10px 6px; font-size: 10px; text-transform: uppercase; color: #495057; border-bottom: 2px solid #dee2e6; }
    .footer { border-top: 1px solid #e0e0e0; padding-top: 16px; font-size: 10px; color: #868e96; display: flex; justify-content: space-between; align-items: center; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Aquas · Medical License Registry</div>
      <div class="badge">ZERO-KNOWLEDGE AUDIT CERTIFICATE</div>
    </div>
    <div style="text-align: right; font-size: 11px; color: #555;">
      <div><strong>Report ID:</strong> AQ-AUD-${Date.now().toString(36).toUpperCase()}</div>
      <div><strong>Settlement Network:</strong> Midnight Preview Testnet</div>
      <div><strong>Date:</strong> ${timestamp}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item">
      <span>Healthcare Institution</span>
      <strong>${institution}</strong>
    </div>
    <div class="meta-item">
      <span>Total Roster Audited</span>
      <strong>${results.length} Physicians</strong>
    </div>
    <div class="meta-item">
      <span>Active & Compliant</span>
      <strong style="color: #2e7d32;">${activeCount} (${complianceRate}%)</strong>
    </div>
    <div class="meta-item">
      <span>Flagged (Exp/Rev/Missing)</span>
      <strong style="color: #c62828;">${expiredCount + revokedCount + notFoundCount + errorCount}</strong>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Physician Name</th>
        <th>NPI</th>
        <th>Department</th>
        <th>Credential ID</th>
        <th>State Board</th>
        <th>Issued</th>
        <th>Expiry</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="footer">
    <div>
      <strong>Auditor Signature:</strong> ${auditor} · <em>Aquas Zero-Knowledge Cryptographic Proof Protocol</em>
    </div>
    <div>Page 1 of 1 · Verified On-Chain</div>
  </div>
</body>
</html>`;
}

/**
 * Opens a print dialog for the JCAHO / Regulatory compliance certificate.
 */
export function printAuditCertificate(
  results: BatchVerificationResult[],
  meta: AuditReportMeta = {},
): void {
  if (typeof window === "undefined") return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to generate the printable audit certificate.");
    return;
  }
  const html = generatePrintableHtmlCertificate(results, meta);
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
}
