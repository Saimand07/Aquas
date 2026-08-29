# 🌊 Aquas: Production-Grade Engineering Master Plan

This document details the architectural roadmap, technical specifications, and implementation steps to evolve **Aquas** from an MVP into an enterprise-grade Zero-Knowledge healthcare credentialing platform on the **Midnight Network**.

Every feature is designed to build incrementally without breaking existing smart contracts, TypeScript compilation, or UI workflows.

---

## 🧭 Roadmap Overview & Feature Sequence

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   AQUAS PRODUCTION ROADMAP                                        │
├───────────────────┬───────────────────────────────────┬───────────────────────────────────────────┤
│ Phase & Feature   │ Scope & Core Deliverables         │ Dependencies & Risk Mitigation            │
├───────────────────┼───────────────────────────────────┼───────────────────────────────────────────┤
│ Phase 1: Batch    │ • Multi-Doctor Roster Verifier    │ • Zero contract changes needed            │
│ Verification &    │ • CSV / JSON Import & Parse       │ • Sub-second indexer batch queries        │
│ Compliance Export │ • JCAHO/Audit Report PDF & CSV    │ • Standalone UI & client module           │
├───────────────────┼───────────────────────────────────┼───────────────────────────────────────────┤
│ Phase 2: Live ZK  │ • Real-time Telemetry Dashboard   │ • Direct chain indexer queries            │
│ Network Explorer  │ • Aggregate Credential Analytics  │ • Pure SVG / lightweight data visualizer  │
│ & Health Radar    │ • Expiration & Revocation Alerts  │ • No heavyweight charting dependencies    │
├───────────────────┼───────────────────────────────────┼───────────────────────────────────────────┤
│ Phase 3: Fine-    │ • Specialty & DEA ZK Circuits     │ • Compact contract schema update          │
│ Grained Selective │ • CME Hour Threshold Gate (≥50h)  │ • WASM proving key regeneration           │
│ Disclosure        │ • Multi-Attribute ZK Proof UI     │ • Backward compatibility with v1 records  │
├───────────────────┼───────────────────────────────────┼───────────────────────────────────────────┤
│ Phase 4: Hospital │ • REST API (/api/v1/verify)       │ • Next.js App Router route handlers       │
│ EHR API & Webhook │ • Daily Cron Staff Re-Verifier    │ • HMAC Webhook signing & retry queue      │
│ Gateway           │ • Developer Sandbox & API Keys    │ • In-memory / edge rate limiting          │
├───────────────────┼───────────────────────────────────┼───────────────────────────────────────────┤
│ Phase 5: Mobile   │ • Time-Bound Challenge QR Codes   │ • Client-side dynamic QR generation       │
│ Physician Pass &  │ • Camera Scanner Component        │ • Camera API with canvas fallback         │
│ Offline Challenge │ • Apple/Google Wallet Pass Export │ • Standard PKPass & JWT structures        │
├───────────────────┼───────────────────────────────────┼───────────────────────────────────────────┤
│ Phase 6: Multi-   │ • Interstate Reciprocity Rules    │ • Federated multi-board trust sets        │
│ State Compact     │ • Cross-State Validation Pipeline │ • Compact cross-issuer validation         │
│ (IMLC) Federation │ • Universal Telehealth Badge      │ • Comprehensive multi-board test suite    │
└───────────────────┴───────────────────────────────────┴───────────────────────────────────────────┘
```

---

## 📋 Detailed Feature Specifications

---

### Phase 1: Hospital Multi-Doctor Batch Verification & Regulatory Audit Exporter

#### 1.1 Objective & Business Impact
Hospital credentialing committees and locum tenens staffing firms need to verify 50+ doctors simultaneously before shift assignments or regulatory audits. Phase 1 provides instant parallel verification and formal PDF/CSV compliance certificates for Joint Commission (JCAHO) and CMS audits.

#### 1.2 Files Created & Modified
* `[NEW]` `app/batch/page.tsx` — Full-page roster batch verification interface.
* `[NEW]` `components/BatchRosterUploader.tsx` — Drag-and-drop CSV/JSON parser with real-time format validation.
* `[NEW]` `components/BatchResultsTable.tsx` — Sortable, filterable result table with status badges and individual proof drilldowns.
* `[NEW]` `lib/batch-verifier.ts` — High-concurrency indexer query dispatcher with rate limiting and exponential backoff.
* `[NEW]` `lib/audit-exporter.ts` — Generates cryptographically timestamped JCAHO-compliant audit reports (CSV and printable PDF formats).
* `[NEW]` `tests/batch-verifier.test.ts` — Unit tests for batch parsing, concurrent indexer resolution, and export formatting.
* `[MODIFY]` `app/layout.tsx` — Add top-nav navigation link to "Batch Verifier".

#### 1.3 Data Models & Interfaces
```typescript
export interface BatchDoctorEntry {
  id: string; // Row identifier
  credentialId: string; // 64-character hex ID
  doctorName?: string; // Optional local alias (not stored on chain)
  npiNumber?: string; // Optional NPI for hospital records
  department?: string; // Internal hospital department
}

export interface BatchVerificationResult {
  entry: BatchDoctorEntry;
  status: "ACTIVE" | "EXPIRED" | "REVOKED" | "NOT_FOUND" | "ERROR";
  issuerBoard: string;
  issuedAt: number | null;
  expiresAt: number | null;
  blockTimestamp: string;
  verificationLatencyMs: number;
  errorDetail?: string;
}

export interface BatchAuditReport {
  hospitalName: string;
  auditorWallet: string;
  generatedAt: string;
  totalChecked: number;
  totalValid: number;
  totalRevoked: number;
  totalExpired: number;
  totalNotFound: number;
  records: BatchVerificationResult[];
}
```

#### 1.4 Step-by-Step Implementation Steps
1. Create `lib/batch-verifier.ts` with batch chunking (processes 10 concurrent requests to prevent indexer throttling).
2. Create `lib/audit-exporter.ts` supporting standard CSV format and styled printable HTML/PDF output.
3. Build `components/BatchRosterUploader.tsx` supporting copy-paste text and `.csv` / `.json` file uploads with template download.
4. Build `components/BatchResultsTable.tsx` with instant search, status filtering, and one-click export.
5. Create `app/batch/page.tsx` assembling the batch workspace.
6. Write comprehensive tests in `tests/batch-verifier.test.ts` testing happy path, malformed IDs, network timeouts, and mixed statuses.

#### 1.5 Safety & Zero-Error Checkpoints
* All user-uploaded names remain 100% client-side; only raw 64-char `credentialId` strings touch the indexer.
* Strict hex validation (`/^[0-9a-fA-F]{64}$/`) rejects invalid lines without breaking the batch run.
* Exponential backoff with retry limit ($3\times$) handles transient indexer connectivity dips smoothly.

---

### Phase 2: Real-Time Network Analytics & Live ZK Explorer Dashboard

#### 2.1 Objective & Business Impact
Provide hospital administrators, regulatory auditors, and state medical boards with full visibility into network health, aggregate issuance/revocation counts, average proof verification latencies, and upcoming license expiration radars.

#### 2.2 Files Created & Modified
* `[NEW]` `app/explorer/page.tsx` — Real-time telemetry dashboard.
* `[NEW]` `components/NetworkMetricsCard.tsx` — Reusable KPI stat card with percentage change and status indicators.
* `[NEW]` `components/ActivityFeed.tsx` — Live streaming feed of on-chain verification and issuance events.
* `[NEW]` `components/ExpirationRadar.tsx` — Visual alert tracker for credentials expiring in 30, 60, and 90 days.
* `[NEW]` `lib/network-analytics.ts` — Query engine calculating on-chain aggregate stats from Midnight indexer and ledger.
* `[NEW]` `tests/network-analytics.test.ts` — Unit tests for metric calculations, state parsing, and trend analysis.
* `[MODIFY]` `app/layout.tsx` — Add navigation link to "Explorer".

#### 2.3 Key Metrics Tracked
* **Active Licensed Physicians:** Total active credentials on the Midnight ledger.
* **Issuing Medical Boards:** Count of active verified state boards (`trustedBoards`).
* **Total Verifications Executed:** Aggregate zero-knowledge proofs processed (`verificationCount`).
* **Revocation Integrity Rate:** Percentage of non-revoked vs revoked credentials across all epochs.
* **Average Verification Latency:** Sub-second indexer response time benchmark (target $<300\text{ms}$).

#### 2.4 Implementation Sequence
1. Implement `lib/network-analytics.ts` to decode ledger counters (`issuanceCount`, `activeLicenseCount`, `revocationCount`, `boardCount`, `verificationCount`).
2. Build responsive metric cards in `components/NetworkMetricsCard.tsx`.
3. Create `components/ExpirationRadar.tsx` utilizing local license registries to compute risk categories (Active, Expiring Soon, Expired).
4. Create `app/explorer/page.tsx` with auto-refresh capability (every 30 seconds).
5. Add automated unit test suite `tests/network-analytics.test.ts`.

---

### Phase 3: Fine-Grained Selective Disclosure (Specialty & CME Circuits)

#### 3.1 Objective & Business Impact
Allow physicians to prove sub-specialties (e.g. *Cardiology, Surgery*), active DEA Schedule II prescribing authorization, and Continuing Medical Education compliance ($\ge 50\text{ CME hours}$) in zero-knowledge without revealing personal transcripts or raw DEA registration numbers.

#### 3.2 Files Created & Modified
* `[MODIFY]` `contracts/doctor_license.compact` — Add specialty commitment hash circuits and CME threshold verification logic.
* `[MODIFY]` `lib/deploy-doctor-license.ts` — Update witness definitions to include encrypted specialty and CME commitments.
* `[MODIFY]` `lib/doctor-license-client.ts` — Update client proving methods for multi-attribute selective disclosure.
* `[NEW]` `components/SelectiveDisclosureModal.tsx` — Interactive UI letting doctors toggle which attributes to prove to a verifier.
* `[NEW]` `tests/specialty-circuits.test.ts` — Cryptographic tests for specialty commitments and CME threshold circuits.
* `[MODIFY]` `scripts/compile-contract.sh` — Ensure automated compilation of updated Compact circuits.

#### 3.3 Compact Circuit Additions
```compact
// Specialty commitment hashing
circuit specialtyCommitment(specialtyCode: Uint<16>, salt: Bytes<32>): Bytes<32> {
  return persistentHash<Vector<3, Bytes<32>>>([
    pad(32, "license:specialty:v1"),
    pad(32, specialtyCode),
    salt
  ]);
}

// ZK Circuit: Prove doctor meets minimum CME hours threshold without revealing exact count
circuit proveCMEThreshold(
  cmeHoursWitness: Uint<16>,
  minRequiredHours: Uint<16>
): [] {
  assert(cmeHoursWitness >= minRequiredHours, "insufficient CME credit hours");
}
```

#### 3.4 Implementation Sequence
1. Update `contracts/doctor_license.compact` with new optional attribute commitment circuits.
2. Compile and test contract with `scripts/compile-contract.sh`.
3. Synchronize proving keys using `scripts/sync-contract-assets.sh`.
4. Update `lib/doctor-license-client.ts` with helper functions: `proveSpecialtyOnChain`, `proveCMECredentials`.
5. Build `components/SelectiveDisclosureModal.tsx` with preview proof breakdown.
6. Verify 100% test pass in `tests/specialty-circuits.test.ts`.

---

### Phase 4: Enterprise Hospital EHR REST API & Webhooks Gateway (`@aquas/sdk`)

#### 4.1 Objective & Business Impact
Provide healthcare IT teams, Electronic Health Record (EHR) platforms (Epic, Cerner), and telehealth applications (Teladoc) with standard REST APIs and automated webhook triggers for instant daily staff re-verification and immediate revocation alerts.

#### 4.2 Files Created & Modified
* `[NEW]` `app/api/v1/verify/route.ts` — REST API endpoint for single and batch credential verification.
* `[NEW]` `app/api/v1/roster/route.ts` — Automated hospital roster batch verification endpoint.
* `[NEW]` `app/api/v1/webhooks/route.ts` — Webhook management and event dispatch registration.
* `[NEW]` `lib/api-auth.ts` — API key validation, rate-limiting, and header authorization.
* `[NEW]` `lib/webhook-dispatcher.ts` — HMAC-SHA256 signed event delivery engine with exponential retry.
* `[NEW]` `app/developer/page.tsx` — Interactive Developer Hub with API documentation, key generator, and live interactive cURL/TS playground.
* `[NEW]` `tests/api-gateway.test.ts` — Integration tests for REST endpoints, rate limiting, and webhook signatures.

#### 4.3 REST API Endpoints Specification
* `GET /api/v1/verify?id=<credentialId>`:
  ```json
  {
    "success": true,
    "credentialId": "e0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70",
    "status": "ACTIVE",
    "issuer": "0xd72f60d3f297dc84078e19677b60e88759f9982a3ea3dbf87a387814cda034ad",
    "expiresAt": 1893456000,
    "isExpired": false,
    "proofVerified": true,
    "timestamp": "2026-08-29T18:00:00.000Z"
  }
  ```
* `POST /api/v1/roster`: Accepts array of credential IDs, returns normalized verification array.
* `POST /api/v1/webhooks`: Registers a hospital webhook endpoint for `license.revoked` or `license.renewed` events.

#### 4.4 Implementation Sequence
1. Implement `lib/api-auth.ts` for bearer token and API key validation.
2. Build route handlers for `/api/v1/verify` and `/api/v1/roster`.
3. Implement `lib/webhook-dispatcher.ts` with HMAC signature headers (`X-Aquas-Signature`).
4. Build `app/developer/page.tsx` displaying interactive cURL, TypeScript, and Python code snippets.
5. Add automated route testing in `tests/api-gateway.test.ts`.

---

### Phase 5: Mobile Physician Pass & Offline QR Challenge Protocol

#### 5.1 Objective & Business Impact
Provide doctors with a portable, offline-capable digital credential pass (Apple Wallet / Google Wallet compatible) and time-bound challenge QR codes for emergency response clinics, hospital badging, and locum tenens check-ins.

#### 5.2 Files Created & Modified
* `[NEW]` `components/DynamicQRPass.tsx` — Dynamic, 60-second self-destructing QR code generator with visual countdown.
* `[NEW]` `components/MobileCameraScanner.tsx` — Camera-based QR code scanner with auto-detect and validation sound.
* `[NEW]` `lib/qr-challenge.ts` — Cryptographic challenge generator binding timestamps, nonce, and doctor identity commitment.
* `[NEW]` `app/pass/page.tsx` — Mobile-first digital wallet pass generator and preview screen.
* `[NEW]` `tests/qr-pass.test.ts` — Unit tests for challenge creation, signature verification, and expiration enforcement.

#### 5.3 Technical Workflow
1. Doctor opens Aquas Mobile Pass.
2. App generates a short-lived challenge payload: `aquas://verify/{credentialId}?t={timestamp}&c={nonce}&sig={signature}`.
3. QR code regenerates automatically every 60 seconds to prevent replay attacks.
4. Hospital intake tablet scans QR code using `MobileCameraScanner` and validates the signature and live Midnight ledger state instantly.

---

### Phase 6: Interstate Medical Licensure Compact (IMLC) Multi-State Federation

#### 6.1 Objective & Business Impact
Enable cross-state medical license reciprocity so that a license issued by one participating State Medical Board (e.g. California) is cryptographically recognized by hospitals across all 37+ Interstate Medical Licensure Compact (IMLC) member states.

#### 6.2 Files Created & Modified
* `[MODIFY]` `contracts/doctor_license.compact` — Add board federation group membership circuits.
* `[NEW]` `lib/imlc-federation.ts` — Multi-state board mapping, reciprocity matrix, and validation rules.
* `[NEW]` `components/IMLCReciprocityBadge.tsx` — UI badge showing eligible reciprocity states for a given credential.
* `[NEW]` `tests/imlc-federation.test.ts` — Comprehensive tests verifying cross-board recognition and jurisdiction rules.

---

## 🛠️ Implementation & Safety Guardrails

To guarantee zero build errors and continuous deployment stability:

1. **Incremental Compilation Strategy:** Each phase will be implemented and tested independently before moving to the next.
2. **Strict TypeScript Typing:** All shared models and API payloads must have explicit TypeScript types (`noImplicitAny: true`).
3. **No Unused Heavy Dependencies:** Charting, tables, and QR codes will rely on lightweight, zero-vulnerability packages already installed (`qrcode.react`, `lucide-react`, native HTML5 canvas/SVG) to avoid package conflicts.
4. **CI/CD Regression Check:** Every phase must pass `npm run typecheck`, `npm run lint`, and `npm test` cleanly.

---

## 🏁 Execution Order Checklist

- [ ] **Phase 1:** Hospital Multi-Doctor Batch Verification & Regulatory Audit Exporter
- [ ] **Phase 2:** Real-Time Network Analytics & Live ZK Explorer Dashboard
- [ ] **Phase 3:** Fine-Grained Selective Disclosure (Specialty & CME ZK Circuits)
- [ ] **Phase 4:** Enterprise Hospital EHR REST API & Webhooks Gateway
- [ ] **Phase 5:** Mobile Physician Pass & Offline QR Challenge Protocol
- [ ] **Phase 6:** Interstate Medical Licensure Compact (IMLC) Multi-State Federation
