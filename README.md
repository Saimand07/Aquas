<div align="center">
  <img src="https://github.com/user-attachments/assets/b15d3ef3-4949-4b57-9729-5325f03e2c52" alt="Aquas Landing Page" width="100%">
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

> Live Application: [https://license-seal-sigma.vercel.app/](https://license-seal-sigma.vercel.app/)
> 
> Product Architecture & Submission: [Read Proposals & Technical Specification (proposals.md)](./proposals.md)

---

## Initial Product Idea

Aquas is a decentralized, privacy-preserving medical license registry and credential verification protocol built on the Midnight Privacy Blockchain. By leveraging Zero-Knowledge (ZK) SNARK circuits written in Midnight's native Compact language, Aquas empowers physicians to mathematically prove valid, unrevoked state licensure, specialty board credentials, and DEA authority to hospitals and healthcare employers in under one second without ever disclosing Personally Identifiable Information (PII), home addresses, social security numbers, or raw registry records on a public ledger.

---

## The Real-World Problem

In traditional healthcare systems, **medical licensing and physician credentialing** are broken, antiquated, and rife with severe privacy vulnerabilities:

1. **The Physician Privacy Dilemma:** Whenever a doctor joins a hospital, relocates across state lines, or takes on locum tenens work, they must repeatedly transmit sensitive Personally Identifiable Information (PII, SSN, background checks, license history, and private identifiers). This data is stored in vulnerable, centralized hospital databases that are prime targets for cyberattacks and identity theft.
2. **The Verification Bottleneck:** State Medical Boards, hospital credentialing committees, and compliance officers spend weeks or months manually exchanging phone calls, paper forms, and unverified emails to validate credentials causing critical physician onboarding delays and hospital staffing shortages.
3. **The Public Blockchain Exposure Risk:** Standard public blockchains (like Ethereum or Solana) are fundamentally unsuited for healthcare compliance. Publishing medical licensing records on public ledgers exposes physician work histories, disciplinary inquiries, and sensitive institutional affiliations to competitors, data brokers, and public surveillance, directly violating HIPAA and global data protection standards.

---

## The Solution: Aquas

**Aquas** delivers a mathematical guarantee:
> *"A physician can prove to any hospital or regulatory board that they possess an active, valid, unrevoked medical license issued by an authorized medical board without revealing their underlying private identification or witness secrets."*

### Why Midnight?
Public blockchains leak sensitive healthcare relationships and physician metadata. Private consortium chains lack universal trust, public verifiability, and interoperability.
**Midnight** provides the optimal dual-state architecture: it enables public settlement and cryptographic integrity on an immutable ledger while executing confidential logic in client-side zero-knowledge proofs via native **Compact** smart contracts.

---

## Public State vs. Private Witness Architecture

Aquas utilizes Midnight's dual-state paradigm to strictly separate publicly verifiable commitments from confidential physician identity secrets:

| Dimension | Public Ledger State (On-Chain) | Private Witness State (Client / 1AM) |
| :--- | :--- | :--- |
| **Data Scope** | Cryptographic commitments & verification roots | Physician PII, SSN, DEA numbers, private keys |
| **Storage Location** | Midnight Preview shielded ledger state | Local browser memory (`aquasPrivateState`) & 1AM wallet |
| **Visibility** | Publicly inspectable on Midnight Indexer / Explorer | Never leaves the physician's local prover runtime |
| **Medical Boards** | Board public keys (`bytes<32>`), Merkle roots, status flags | Board authorization secrets, master signing keys |
| **License Records** | `licenseCommitment`, expiration timestamp, revoked flag | Doctor's legal name, license number, specialty hash, salt |
| **ZK Verification** | `proveValidLicense` circuit verification output | Witness evaluation proving validity against on-chain root |
| **Compliance** | HIPAA Safe Harbor compliant (Zero PII on-chain) | Full primary source verification fidelity |

```text
+-------------------------------------------------------------+
|                 PHYSICIAN CLIENT PROVER                     |
|  [Private Witness]                                          |
|   - Full Legal Name (Private)                               |
|   - SSN / State License ID (Private)                        |
|   - DEA Schedule Privileges (Private)                       |
|   - Ephemeral Salt & Nonce (Private)                        |
+------------------------------+------------------------------+
                               |  Generates Compact ZK Proof
                               v
+-------------------------------------------------------------+
|                 MIDNIGHT SHIELDED LEDGER                    |
|  [Public State]                                             |
|   - Board Merkle Commitment Root: 0x8a92...f01e             |
|   - License Hash Commitment:      0xd5e2...9b74             |
|   - Revocation Status:            ACTIVE                    |
|   - Expiration Timestamp:         2028-12-31                |
|   - Verification Counter:         Total Validations + 1     |
+-------------------------------------------------------------+
```

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

## Compilation & Deployment Verification Proofs

### Screenshot: Successful Compile Output (Circuits Listed)
*Compact compiler compiling `contracts/doctor_license.compact` into managed ZKIR circuits (`createBoard`, `createLicense`, `updateBoard`, `updateLicense`, `deleteBoard`, `deleteLicense`, `proveValidLicense`) and prover/verifier keys:*

<img src="https://github.com/user-attachments/assets/76a27a0d-6e6d-4a37-9c7f-858564c53528" alt="Compile Output and CI Proving Tests" width="100%" />

### Screenshot: Contract Deployed with Address Shown
*Live deployment on Midnight Preview Testnet with verified contract address:*

<img src="https://github.com/user-attachments/assets/b69efc33-8355-44a0-b3c5-2900fe20b995" alt="Contract Deployed With Address" width="100%" />

---

## Verified On-Chain Transactions & Contracts

Aquas is fully integrated with the Midnight Network. It generates real zero-knowledge proofs and settles them on-chain with complete privacy guarantees.

> **Network & Testnet Details:**
> - **Primary Verified Deployment:** Midnight Preview Testnet
> - **Contract Address:** [`0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74`](https://preview.midnightexplorer.com/contracts/0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74)
> - **Wallet Integration:** [1AM Browser Extension](https://1am.xyz) configured for Midnight Preview.
> - **Live Explorer:** View transactions, contract state, and proofs live on the [Midnight Explorer](https://preview.midnightexplorer.com/contracts/0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74).

---

## System Architecture & Project Structure

### Tech Stack
* **Blockchain Network:** Midnight Network (Preview Testnet)
* **Smart Contracts:** Compact (Midnight's native ZK language)
* **Web3 Integration:** `@midnight-ntwrk/compact-runtime`, `@midnight-ntwrk/dapp-connector-api`, `@midnight-ntwrk/midnight-js-contracts`, `1AM Wallet`
* **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Framer Motion, Lucide React, QRCode React
* **ZK & Proving Pipeline:** Midnight Prover Server, WASM Proving Runtime, Compact JS Compiler
* **Testing:** Vitest Test Suite (9 Test Suites, 44 Automated Unit & ZK Prover Tests)

### Comprehensive Project Structure
```text
Aquas/
|-- app/                                    # Next.js App Router
|   |-- (dashboard)/                        # Protected Sidebar App Routes
|   |   |-- dashboard/page.tsx              # Command Center & Live ZK Verification
|   |   |-- batch/page.tsx                  # Multi-Doctor Batch Verification
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
|   |-- deploy-doctor-license.ts            # Deployment helpers & private state initialization
|   |-- doctor-license-client.ts            # Client-side transaction & circuit builder
|   |-- midnight-browser.ts                 # 1AM wallet provider, ZK proof submission & balancing
|   `-- midnight-read.ts                    # Indexer query engine for live on-chain state
|-- public/                                 # Static Assets & Prover Artifacts
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
