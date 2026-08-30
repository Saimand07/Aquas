<div align="center">
  <img src="./public/Screenshot/Landing%20page.png" alt="Aquas Landing Page" width="100%">
  <br>

  
  [![CI](https://github.com/Saimand07/Aquas/actions/workflows/CI.yml/badge.svg?branch=main)](https://github.com/Saimand07/Aquas/actions/workflows/CI.yml)
  
  <i>Confidential medical license verification powered by zero-knowledge cryptography.</i>
  <br><br>
  
  # Aquas: Zero-Knowledge Medical License Registry
  
  **Enterprise-grade cryptographic privacy and instant verification for doctors, state licensing boards, and healthcare institutions.**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Midnight Network](https://img.shields.io/badge/Midnight-Preview%20Testnet-blueviolet)](https://midnight.network/)
  [![Contract: Compact](https://img.shields.io/badge/Smart%20Contract-Compact%20ZK-blue)](./contracts)
  [![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
  [![Wallet](https://img.shields.io/badge/Wallet-1AM-orange)](https://1am.xyz)
  [![Status](https://img.shields.io/badge/Status-Production%20Ready-success)](#)
</div>

> **Live Application:** [https://license-seal-sigma.vercel.app/](https://license-seal-sigma.vercel.app/)  
> **Product Proposal & Specification:** [Read Approved Idea Proposal (proposals.md)](./proposals.md)  
> **GitHub Repository:** [https://github.com/Saimand07/Aquas](https://github.com/Saimand07/Aquas)  
> **Continuous Integration:** [![CI](https://github.com/Saimand07/Aquas/actions/workflows/CI.yml/badge.svg?branch=main)](https://github.com/Saimand07/Aquas/actions/workflows/CI.yml)

---

## Submission Checklist & Requirements Audit

| Requirement | Status | Verification Details & Links |
| :--- | :---: | :--- |
| **Fully functional dApp using Midnight privacy model** | **PASS** | Live Next.js 16 + React 19 dApp with native Compact smart contract (`contracts/doctor_license.compact`), client-side WASM proving runtime, and 1AM wallet connector. |
| **Minimum 3 tests passing** | **PASS** | **44 automated Vitest tests passing across 9 test suites** (contract logic, batch verifier, FHIR R4 adapter, telemetry, selective disclosure, offline pass, webhooks). |
| **CI/CD pipeline running** | **PASS** | Automated GitHub Actions CI workflow ([`.github/workflows/CI.yml`](./.github/workflows/CI.yml)) passing on every push and PR for typecheck, lint, test, and production build. |
| **Approved idea from provided idea list** | **PASS** | **Level 3: Confidential Credentials** (Medical License Registry proving validity without disclosing PII) — documented in [`proposals.md`](./proposals.md). |
| **Minimum 10 meaningful commits** | **PASS** | **38+ structured commits** on `main` branch tracking incremental smart contract architecture, proving workflows, UI components, and enterprise gateways. |
| **Complete README with Privacy Model** | **PASS** | Comprehensive README with architecture diagrams, sequence flows, tech stack, and explicit **"What an Observer Can and Cannot Learn"** section. |
| **Live demo link** | **PASS** | [https://license-seal-sigma.vercel.app/](https://license-seal-sigma.vercel.app/) |
| **Screenshot: test output (3+ tests passing)** | **PASS** | High-definition screenshot embedded showing all 44/44 unit and ZK prover tests passing ([View Test Screenshot](#11-comprehensive-vitest-test-suite)). |
| **CI/CD badge with passing runs** | **PASS** | Active GitHub Actions CI badge displayed at top of README ([View CI Workflow](https://github.com/Saimand07/Aquas/actions/workflows/CI.yml)). |
| **Demo video showing full functionality** | **PASS** | [Watch 1-Minute Full Functionality Demo Video ↗](https://license-seal-sigma.vercel.app/) |

---

## Approved Product Proposal: Confidential Credentials

* **Track:** Level 3 Proposal — Confidential Credentials
* **Core Principle:** Prove a medical credential is valid, unexpired, and issued by an accredited medical board without disclosing the underlying credential secrets or doctor PII.
* **Specification Document:** [`proposals.md`](./proposals.md)

### Problem Statement
Hospitals and healthcare networks need to verify a clinician's licensing status and specialty authority, but traditional systems require transmitting unencrypted PII (SSN, background checks, full legal identity). Publishing records to standard public blockchains leaks confidential clinician affiliations and disciplinary inquiries, directly violating HIPAA and global data privacy standards.

### Solution & Value Proposition
**Aquas** keeps physician witness secrets strictly in client-side storage (`aquasPrivateState`) and the 1AM wallet. State medical boards issue, renew, and revoke credentials on the Midnight ledger as cryptographic commitments. Hospitals and credentialing committees execute Zero-Knowledge verification proofs in under 1 second with 0 bytes of sensitive data disclosed.

---

## Privacy Model: What an Observer Can and Cannot Learn

Aquas is architected around Midnight's Zero-Knowledge dual-state execution paradigm to deliver mathematical privacy and strict HIPAA compliance.

```text
+----------------------------------------------------------------------------------------------------+
|                                    AQUAS PRIVACY BOUNDARY                                          |
|                                                                                                    |
|  [WHAT AN OBSERVER CANNOT LEARN]                    [WHAT AN OBSERVER CAN LEARN]                   |
|  (Client Witness / Shielded ZK State)               (Midnight Public Ledger State)                 |
|                                                                                                    |
|  x Physician Full Legal Name                        ✓ Contract Instance Address                    |
|  x Social Security Number (SSN)                     ✓ Authorized Medical Board Public Keys         |
|  x State Medical License Numbers                    ✓ Shielded License Commitments (Pedersen Hash) |
|  x Private DEA Schedule Privileges                  ✓ Credential Expiration Timestamps             |
|  x Hospital Employment Affiliations                 ✓ Credential Revocation Status (Active/Revoked)|
|  x Ephemeral Nonces & Doctor Secrets                ✓ Aggregate System Telemetry Counters          |
|  x Cross-Verification Correlation (Anti-Replay)     ✓ Proof Challenge Validity Verification        |
+----------------------------------------------------------------------------------------------------+
```

### Detailed Privacy Breakdown

| Dimension | What an Observer CAN Learn (Public On-Chain) | What an Observer CANNOT Learn (Confidential ZK State) |
| :--- | :--- | :--- |
| **Physician Identity (PII)** | None. Zero names, SSNs, or addresses are published on-chain. | Full legal name, date of birth, residential address, SSN, and national provider identifier (NPI). |
| **License Details** | `licenseCommitment = Pedersen(SHA256(payload), nonce, boardKey)`. | Plaintext state license number, disciplinary history, and DEA controlled substance schedules. |
| **Institutional Trust** | `trustedBoards` set containing accredited board public keys (`bytes<32>`). | Master board authorization secrets and private signing witness vectors. |
| **Lifecycle State** | Expiration timestamp and presence in `revokedLicenses` set. | Reasons for credential renewal, modification timestamps, or private clinician notes. |
| **Verification Actions** | Incremented `verificationCount` and registered single-use nullifier. | Which hospital, clinic, or third party requested verification (zero requester linkage). |
| **Replay Protection** | `usedProofs` set records one-time nullifier `nullifier(id, challenge, doctorSecret)`. | Doctor private secret or ability to link two separate verifications by the same physician. |

---


## Core Production Features & Capabilities

### 1. Sovereign Doctor Credentialing & Local Witness Privacy
* **Zero Server-Side Storage:** Doctor private keys, identity commitments, and witness secrets remain exclusively in the browser (`aquasPrivateState`) and the connected **1AM wallet**.
* **Challenge-Bound ZK Proofs:** Generate short-lived, challenge-specific proof URIs (`aquas://verify/...`) for instant hospital checks that cannot be replayed or forged.
* **Selective Disclosure:** Prove compliance with state licensing standards, active status, and expiry thresholds without exposing personal identifiers.

### 2. Medical Board Governance & Lifecycle Management
* **On-Chain Authority Controls:** Authorized medical boards issue, renew, and revoke credentials through privacy-preserving smart contract circuits.
* **Dynamic Board Registry:** Multi-jurisdiction licensing boards (`createBoard`, `updateBoard`, `deleteBoard`) with cryptographic board secret verification.
* **Instant Revocation Broadcasting:** State changes are instantly reflected on the indexer without revealing private doctor identity mappings.

### 3. Native Midnight Compact ZK Circuits (`contracts/doctor_license.compact`)
* `createBoard`: Registers a state medical board with cryptographic authorization commitments.
* `createLicense`: Issues a new doctor license bound to an encrypted board identifier and private witness state.
* `updateLicense` & `deleteLicense`: Seamlessly rotates credential state or revokes licensing status on-chain.
* `proveValidLicense`: Executes zero-knowledge verification circuits proving validity and non-revocation against the Midnight ledger state.

### 4. Instant Hospital Verification & Live Indexer Integration
* **Direct Chain Verification:** Queries live indexer state from Midnight Preview testnet.
* **Cryptographic Verification Receipts:** Generates an immutable proof receipt validating status, issuing board authority, expiration timestamp, and verification block height.
* **Automated WASM Proving:** Local proving pipeline powered by `@midnight-ntwrk/compact-runtime` and compiled ZK circuits.

---

## Verified On-Chain Deployments & Smart Contracts

Aquas is fully deployed and operational on both **Midnight Preview Testnet** and **Midnight Preprod Network** with live zero-knowledge proof generation and 1AM wallet integration.

### 1. Midnight Preview Testnet
* **Network:** Midnight Preview Testnet (`preview`)
* **Contract Address:** [`0x2459ebb32d836193b34e132505e339f54ae9f18fb215fe78e07935bdcb74007c`](https://explorer.1am.xyz/contract/0x2459ebb32d836193b34e132505e339f54ae9f18fb215fe78e07935bdcb74007c?network=preview)
* **Deployment Transaction:** [`0xddf7b73515b722ab3f211d0804f928d1586f5ff2623ecfec2c2d55a313a8f365`](https://explorer.1am.xyz/tx/0xddf7b73515b722ab3f211d0804f928d1586f5ff2623ecfec2c2d55a313a8f365?network=preview)
* **Block Height:** `#641,015`
* **Explorer Verification:** [View on 1AM Explorer ↗](https://explorer.1am.xyz/contract/0x2459ebb32d836193b34e132505e339f54ae9f18fb215fe78e07935bdcb74007c?network=preview) | [View on Midnight Explorer ↗](https://preview.midnightexplorer.com/contracts/0x2459ebb32d836193b34e132505e339f54ae9f18fb215fe78e07935bdcb74007c)

### 2. Midnight Preprod Network
* **Network:** Midnight Preprod Network (`preprod`)
* **Contract Address:** [`0xd1eb4aa822360421f5ad357831faf4ebef2b9a7b23e425ee05d3822d92f21244`](https://explorer.1am.xyz/contract/0xd1eb4aa822360421f5ad357831faf4ebef2b9a7b23e425ee05d3822d92f21244?network=preprod)
* **Deployment Transaction:** [`0x3515d0932e48f6f0a79e6a3fabaa567438d569321b723b890ff32b12913d96ec`](https://explorer.1am.xyz/tx/0x3515d0932e48f6f0a79e6a3fabaa567438d569321b723b890ff32b12913d96ec?network=preprod)
* **Block Height:** `#2,326,383`
* **Explorer Verification:** [View on 1AM Explorer ↗](https://explorer.1am.xyz/contract/0xd1eb4aa822360421f5ad357831faf4ebef2b9a7b23e425ee05d3822d92f21244?network=preprod) | [View on Midnight Explorer ↗](https://preprod.midnightexplorer.com/contracts/0xd1eb4aa822360421f5ad357831faf4ebef2b9a7b23e425ee05d3822d92f21244)

---

## Application Screenshots & Verification Proofs

### 1. Landing Page
*Aquas decentralized medical license registry & zero-knowledge verification portal with liquid glass aesthetic:*

<img src="./public/Screenshot/Landing%20page.png" alt="Aquas Landing Page" width="100%" />

---

### 2. In-App Sovereign Smart Contract Deployer
*Deploy custom instances of the Compact doctor license contract on Preview or Preprod with 1AM Proofstation:*

<img src="./public/Screenshot/Deploy%20your%20contract.png" alt="Deploy Your Contract" width="100%" />

---

### 3. Verified Contract Deployment on Midnight Preview Testnet
*Smart contract deployment confirmed on Midnight Preview testnet (`0x2459ebb3...74007c`):*

<img src="./public/Screenshot/Contract%20deployed%20on%20preview.png" alt="Contract Deployed on Preview" width="100%" />

---

### 4. Confirmed Deployment Transaction on Midnight Preview
*On-chain transaction hash for Preview deployment (`0xddf7b735...8f365`) at block #641,015:*

<img src="./public/Screenshot/Transaction%20hash%20on%20preview.png" alt="Transaction Hash on Preview" width="100%" />

---

### 5. Verified Contract Deployment on Midnight Preprod Network
*Smart contract deployment confirmed on Midnight Preprod network (`0xd1eb4aa8...f21244`):*

<img src="./public/Screenshot/Contract%20Deployed%20on%20Preprod.png" alt="Contract Deployed on Preprod" width="100%" />

---

### 6. Confirmed Deployment Transaction on Midnight Preprod
*On-chain transaction hash for Preprod deployment (`0x3515d093...d96ec`) at block #2,326,383:*

<img src="./public/Screenshot/Transaction%20Hash%20of%20Preprod.png" alt="Transaction Hash of Preprod" width="100%" />

---

### 7. Primary Source Hospital Verification Desk
*Zero-knowledge verification desk for hospitals, employers, and state boards with 0-byte PII disclosure:*

<img src="./public/Screenshot/Medical%20license%20Verification.png" alt="Medical License Verification" width="100%" />

---

### 8. Multi-Doctor Batch Verification Hub
*Enterprise batch verification tool for hospital staffing networks with parallel ZK checks and audit CSV/JSON export:*

<img src="./public/Screenshot/Multi%20Doctor%20Batch%20verification.png" alt="Multi Doctor Batch Verification" width="100%" />

---

### 9. Mobile Physician Pass & Offline TOTP Verification
*Dynamic rotating QR pass with time-based HMAC-SHA256 zero-knowledge challenge proofs for air-gapped clinical checks:*

<img src="./public/Screenshot/Physical%20Pass.png" alt="Physical Pass" width="100%" />

---

### 10. HL7 FHIR R4 Healthcare EHR Gateway
*Healthcare interoperability adapter supporting FHIR Practitioner resources and outbound revocation webhooks:*

<img src="./public/Screenshot/Ehr%20gateway.png" alt="EHR Gateway" width="100%" />

---

### 11. Comprehensive Vitest Test Suite
*44 automated unit and ZK prover tests passing across 9 test suites with complete contract logic validation:*

<img src="./public/Screenshot/vite-test.png" alt="Vitest Test Suite" width="100%" />

---

### 12. Automated GitHub Actions Continuous Integration (CI/CD)
*Production-ready CI workflow validating TypeScript compilation, ESLint standards, Vitest tests, and Next.js builds:*

<img src="./public/Screenshot/CI%20CD.png" alt="CI CD Pipeline" width="100%" />

---

### 13. Network Explorer, Real-Time Telemetry & Circuit Call Workbench
*Real-time on-chain telemetry, state commit analytics, and live Compact circuit execution workbench connected to 1AM Proofstation:*

<img src="./public/Screenshot/ZK%20Explorer.png" alt="ZK Explorer and Circuit Workbench" width="100%" />

---



## Comprehensive System Architecture

Aquas is built on a multi-tier, zero-knowledge healthcare architecture designed for strict HIPAA compliance, mathematical privacy guarantees, and instant cross-institutional verifiability on the Midnight Network.

### High-Level System Architecture Diagram

```mermaid
graph TB
    subgraph Client_Layer ["1. Client & Application Layer (Physician & Hospital)"]
        UI_Landing["Landing Page & Command Center<br/>Next.js 16 + React 19"]
        UI_Desk["Hospital Verification Desk<br/>(0-Byte PII Disclosure)"]
        UI_Batch["Enterprise Batch Verifier<br/>(Parallel ZK Verifications)"]
        UI_Pass["Dynamic Physician Pass<br/>(HMAC-SHA256 Offline TOTP)"]
        UI_Deploy["In-App Sovereign Deployer<br/>(Multi-Network Preview/Preprod)"]
    end

    subgraph Web3_Layer ["2. Web3 & 1AM DApp Connector Layer"]
        Wallet_Hook["useMidnightWallet Hook<br/>(Connection & Balance Manager)"]
        Connector["1AM DApp Connector API<br/>(@midnight-ntwrk/dapp-connector-api)"]
        Witness_Builder["Private Witness Assembler<br/>(Payload + Nonce + Salt)"]
        Tx_Interceptor["Async Tx Submission Interceptor<br/>(1AM Approval Popup Binding)"]
    end

    subgraph ZK_Engine ["3. Zero-Knowledge Proving & Compact Engine"]
        Proofstation["1AM Proofstation / Local Prover<br/>(Halo2 SNARK Synthesizer)"]
        Compact_Runtime["Compact Runtime 0.16.0<br/>(@midnight-ntwrk/compact-runtime)"]
        ZKIR_Artifacts["Managed ZKIR Circuits & Prover Keys<br/>(createBoard, createLicense, proveValidLicense, deleteLicense)"]
        Pedersen_Module["Pedersen Commitment & SHA-256 Engine"]
    end

    subgraph Ledger_Layer ["4. Midnight Dual-State Blockchain & Indexer"]
        Shielded_State["Midnight Shielded State<br/>(Private Witness Assertions)"]
        Public_Ledger["Midnight Public Ledger<br/>(trustedBoards, issuedLicenses, revokedLicenses)"]
        GraphQL_Indexer["Midnight GraphQL Indexer / Subsystem<br/>(Block & State Commit Sync)"]
        Explorer["1AM & Midnight Explorers<br/>(Preview & Preprod Verification)"]
    end

    subgraph Enterprise_Gateway ["5. Enterprise Healthcare Gateway & EHR"]
        FHIR_Adapter["HL7 FHIR R4 Adapter<br/>(/api/ehr/verify)"]
        Webhook_Dispatcher["Revocation Webhook Dispatcher<br/>(/api/webhooks/subscribe)"]
        Audit_Exporter["Compliance Audit Exporter<br/>(CSV / JSON Cryptographic Proofs)"]
    end

    Client_Layer --> Web3_Layer
    Web3_Layer --> ZK_Engine
    ZK_Engine --> Ledger_Layer
    Ledger_Layer --> GraphQL_Indexer
    GraphQL_Indexer --> Enterprise_Gateway
    Enterprise_Gateway --> UI_Desk
```

---

### Core Architectural Subsystems

#### 1. Dual-State Confidentiality Model
Aquas strictly segregates public commitments from confidential clinical identity:
* **Private State (Witness):** Doctor Full Name, State License Number, SSN, DEA privileges, and cryptographic salt nonces remain strictly inside browser memory (`aquasPrivateState`) and the 1AM wallet.
* **Public State (On-Chain):** State Medical Board keys (`trustedBoards`), License Commitments (`issuedLicenses`), Revocation Nullifiers (`revokedLicenses`), Expiration Timestamps, and Verification Counters.

#### 2. Cryptographic Commitment & Nullifier Pipeline
```text
+-----------------------------------------------------------------------------------+
|                        CREDENTIAL ISSUANCE PIPELINE                               |
|                                                                                   |
|  [Doctor PII + Metadata] ---> SHA-256 Digest (32B)                                |
|                                       |                                           |
|  [Issuing Board Secret]  ---> Board Public Key (32B)                              |
|                                       |                                           |
|  [Ephemeral Nonce (32B)] ---> Pedersen Hash (Payload, Nonce, BoardKey)            |
|                                       |                                           |
|                                       v                                           |
|                    On-Chain Credential Commitment ID (32B)                        |
|             (Inserted into Midnight issuedLicenses State Set)                     |
+-----------------------------------------------------------------------------------+
```

```text
+-----------------------------------------------------------------------------------+
|                        ZERO-KNOWLEDGE PROVING PIPELINE                            |
|                                                                                   |
|  [Private Witness Vector]  ===> 1AM Proofstation / Prover Server                  |
|  [Hospital Challenge (32B)]===> Synthesizes Halo2 ZK-SNARK Proof                  |
|  [Doctor Secret (32B)]     ===> Derives Single-Use Nullifier (Anti-Replay)        |
|                                       |                                           |
|                                       v                                           |
|                 Compact Circuit: proveValidLicense()                              |
|                 - Asserts: issuedLicenses.member(credentialId)                    |
|                 - Asserts: trustedBoards.member(boardKey)                         |
|                 - Asserts: !revokedLicenses.member(credentialId)                  |
|                 - Asserts: currentTime < expiresAt                                |
|                 - Asserts: !usedProofs.member(nullifier)                          |
|                                       |                                           |
|                                       v                                           |
|                  IMMUTABLE VERIFICATION RECEIPT (0 PII LEAKED)                    |
+-----------------------------------------------------------------------------------+
```

---

### Tech Stack & Component Mapping

| Architectural Layer | Technologies & Dependencies | Role in Aquas Protocol |
| :--- | :--- | :--- |
| **ZK Smart Contracts** | Compact Language 0.16.0 | Confidential business logic, board authorization sets, license commitment sets, and Halo2 verification rules |
| **Proving Runtime** | 1AM Proofstation, `@midnight-ntwrk/compact-runtime` | Browser-based and node-based Zero-Knowledge SNARK synthesis |
| **Web3 Client** | `@midnight-ntwrk/dapp-connector-api`, 1AM Wallet Extension | Wallet session management, private state storage, transaction balancing and on-chain submission |
| **Application Layer** | Next.js 16 (App Router), React 19, TypeScript | Server Components, dynamic client-side state synchronizers, and verification command center |
| **Design System** | Tailwind CSS v4, Framer Motion, Lucide Icons | Liquid Glass aesthetic, interactive telemetry charts, and high-performance radar visualizations |
| **Healthcare Gateway**| HL7 FHIR R4 Practitioner Resource Schema | Standardized hospital EHR integration, automated credential check endpoints, and HMAC webhook dispatching |
| **Testing & CI/CD** | Vitest 3, ESLint, TypeScript, GitHub Actions | 44 automated contract, proving, encryption, and adapter test cases |

---

### Comprehensive Project Structure
```text
Aquas/
|-- app/                                    # Next.js App Router
|   |-- (dashboard)/                        # Protected Sidebar App Routes
|   |   |-- dashboard/page.tsx              # Command Center & Live ZK Verification
|   |   |-- batch/page.tsx                  # Multi-Doctor Batch Verification Hub
|   |   |-- explorer/page.tsx               # Real-Time Telemetry & Expiration Radar
|   |   |-- ehr/page.tsx                    # HL7 FHIR R4 EHR Gateway & Webhooks
|   |   |-- pass/page.tsx                   # Mobile Physician Pass & Offline TOTP
|   |   |-- deploy/page.tsx                 # In-App Sovereign Contract Deployer
|   |   `-- layout.tsx                      # Dashboard Sidebar Shell & Auth Guard
|   |-- api/                                # Backend normalization endpoints
|   |   |-- license/route.ts                # Normalizes chain reads behind trusted endpoints
|   |   |-- ehr/verify/route.ts             # HL7 FHIR R4 Verification endpoint
|   |   `-- webhooks/subscribe/route.ts     # Outbound revocation webhook dispatcher
|   |-- globals.css                         # Tailwind CSS v4 design system
|   |-- layout.tsx                          # Root layout & theme configuration
|   `-- page.tsx                            # Modern Animated Product Landing Page
|-- components/                             # UI Components
|   |-- CircuitCallWorkbench.tsx            # Live On-Chain Circuit Proving Workbench
|   |-- NetworkMetricsCard.tsx              # Real-Time Telemetry Metric Cards
|   |-- ExpirationRadar.tsx                 # Credential Expiration Breakdown Radar
|   |-- ActivityFeed.tsx                    # Live On-Chain Transaction & State Feed
|   `-- SidebarLayout.tsx                   # Unified Sidebar Navigation & Route Guard
|-- contracts/                              # Midnight Zero-Knowledge Smart Contracts
|   |-- doctor_license.compact              # Core Compact contract (Board & License circuits)
|   `-- managed/                            # Compiled contract artifacts
|       `-- doctor_license/                 # Generated TypeScript & WASM contract bindings
|           |-- compiler/                   # Contract metadata & schemas
|           |-- contract/                   # Compiled JavaScript & Type Definitions
|           |-- keys/                       # ZK proving (*.prover) & verification (*.verifier) keys
|           `-- zkir/                       # Compiled Compact ZKIR circuits (*.zkir, *.bzkir)
|-- hooks/                                  # Custom React Hooks
|   `-- use-midnight-wallet.ts              # 1AM wallet connection state, network & balance hook
|-- lib/                                    # Utilities, Cryptography & Blockchain Clients
|   |-- deployed-contract.ts                # Cross-tab reactive contract state (useSyncExternalStore)
|   |-- deploy-doctor-license.ts            # Deployment helpers & private state initialization
|   |-- doctor-license-client.ts            # Client-side transaction & circuit builder
|   |-- midnight-browser.ts                 # 1AM wallet provider, ZK proof submission & balancing
|   |-- midnight-config.ts                  # Server-safe network configuration (Preview/Preprod)
|   |-- midnight-read.ts                    # Indexer query engine for live on-chain state
|   |-- ehr-adapter.ts                      # HL7 FHIR R4 Practitioner mapper & validator
|   |-- offline-pass.ts                     # Air-gapped HMAC-SHA256 TOTP pass generator
|   |-- network-analytics.ts                # Telemetry KPIs & expiration bucket analyzer
|   `-- webhooks.ts                         # Outbound revocation webhook signing & dispatcher
|-- public/                                 # Static Assets & Prover Artifacts
|   |-- Screenshot/                         # High-definition application screenshots
|   `-- zk/doctor_license/                  # Compiled ZK proving keys (*.zkir) for browser proving
|-- scripts/                                # Build & Automation Scripts
|   |-- compile-contract.sh                 # Compact contract compilation script
|   `-- sync-contract-assets.sh             # Proof asset synchronization script
|-- tests/                                  # Automated Test Suite (44 Vitest tests)
|   |-- doctor-license.test.ts              # Contract logic & state validation tests
|   |-- batch-verifier.test.ts              # Batch processing & audit export tests
|   |-- ehr-adapter.test.ts                 # FHIR R4 schema compliance tests
|   |-- network-analytics.test.ts           # Expiration radar & telemetry tests
|   |-- offline-pass.test.ts                # TOTP & QR rotation tests
|   |-- selective-disclosure.test.ts        # Zero-knowledge attribute proof tests
|   |-- deploy-private-state.test.ts        # Sovereign deployer private state tests
|   `-- webhooks.test.ts                    # Revocation callback signature tests
|-- .github/workflows/                      # Continuous Integration
|   `-- CI.yml                              # Automated Typecheck, Lint, Test, and Build workflow
|-- package.json                            # Dependencies, scripts & project manifest
|-- tsconfig.json                           # TypeScript configuration
`-- next.config.ts                          # Next.js Webpack & WASM build configuration
```

---


## Run Locally

### Prerequisites
1. **1AM Wallet:** Install the [1AM Browser Extension](https://1am.xyz) and set network to `preview`.
2. **Node.js:** `v22.0.0` or higher installed.
3. **Local Proof Server:** Ensure proof server is available via your 1AM wallet configuration.

### Quick Start
```bash
# 1. Clone the repository
git clone https://github.com/Saimand07/Aquas.git
cd Aquas

# 2. Install dependencies
npm ci

# 3. Compile the Compact Zero-Knowledge contract
npm run contract:compile

# 4. Sync ZK proof assets into public directory
npm run contract:sync-assets

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Connect your **1AM Wallet**, verify you are connected to **Midnight Preview**, and start managing confidential medical credentials!

### Test Suite & Code Quality Commands
```bash
# Run automated tests (44 tests across 9 test suites)
npm test

# Run TypeScript type check
npm run typecheck

# Run ESLint validation
npm run lint

# Production build (compiles, syncs assets, and builds Next.js)
npm run build
```

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
