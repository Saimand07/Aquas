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

> ?? **Live Application:** [https://license-seal-sigma.vercel.app/](https://license-seal-sigma.vercel.app/)
> 
> ?? **Product Architecture & Submission:** [Read Proposals & Technical Specification (proposals.md)](./proposals.md)

---

## ?? The Real-World Problem

In traditional healthcare systems, **medical licensing and physician credentialing** are broken, antiquated, and rife with severe privacy vulnerabilities:

1. **The Physician Privacy Dilemma:** Whenever a doctor joins a hospital, relocates across state lines, or takes on locum tenens work, they must repeatedly transmit sensitive Personally Identifiable Information (PII, SSN, background checks, license history, and private identifiers). This data is stored in vulnerable, centralized hospital databases that are prime targets for cyberattacks and identity theft.
2. **The Verification Bottleneck:** State Medical Boards, hospital credentialing committees, and compliance officers spend weeks or months manually exchanging phone calls, paper forms, and unverified emails to validate credentials—causing critical physician onboarding delays and hospital staffing shortages.
3. **The Public Blockchain Exposure Risk:** Standard public blockchains (like Ethereum or Solana) are fundamentally unsuited for healthcare compliance. Publishing medical licensing records on public ledgers exposes physician work histories, disciplinary inquiries, and sensitive institutional affiliations to competitors, data brokers, and public surveillance, directly violating HIPAA and global data protection standards.

Today, hospitals either rely on slow, centralized third-party clearinghouses or insecure manual verification channels.

---

## ?? The Solution: Aquas

**Aquas** is a decentralized, privacy-preserving doctor-license registry and credential verification protocol built on the **Midnight Privacy Blockchain**. It secures medical credentialing using **Zero-Knowledge (ZK) Proofs**.

Instead of requiring physicians to surrender their raw personal files or exposing credential details on a public ledger, Aquas delivers a mathematical guarantee:
> *"A physician can prove to any hospital or regulatory board that they possess an active, valid, unrevoked medical license issued by an authorized medical board—without revealing their underlying private identification or witness secrets."*

### Why Midnight?
Public blockchains leak sensitive healthcare relationships and physician metadata. Private consortium chains lack universal trust, public verifiability, and interoperability.
**Midnight** provides the optimal dual-state architecture: it enables public settlement and cryptographic integrity on an immutable ledger while executing confidential logic in client-side zero-knowledge proofs via native **Compact** smart contracts.

---

## ?? Core Production Features & Capabilities

Aquas is built as an enterprise-grade medical credentialing platform featuring 4 flagship capabilities:

### 1. ?? Sovereign Doctor Credentialing & Local Witness Privacy
Physicians maintain total ownership over their private credential materials directly within their local client environment.
* **Zero Server-Side Storage:** Doctor private keys, identity commitments, and witness secrets remain exclusively in the browser (`aquasPrivateState`) and the connected **1AM wallet**.
* **Challenge-Bound ZK Proofs:** Generate short-lived, challenge-specific proof URIs (`aquas://verify/...`) for instant hospital checks that cannot be replayed or forged by third parties.
* **Selective Disclosure:** Prove compliance with state licensing standards, active status, and expiry thresholds without exposing personal identifiers or historical registry logs.

---

### 2. ??? Medical Board Governance & Lifecycle Management
State licensing boards and medical authorities manage credential lifecycles directly on-chain with zero-knowledge authorization.
* **On-Chain Authority Controls:** Authorized medical boards issue, renew, and revoke credentials through privacy-preserving smart contract circuits.
* **Dynamic Board Registry:** Support for multi-jurisdiction licensing boards (`createBoard`, `updateBoard`, `deleteBoard`) with cryptographic board secret verification.
* **Instant Revocation Broadcasting:** When a license is revoked or suspended by a board, state changes are instantly reflected on the indexer without revealing private doctor identity mappings.

---

### 3. ? Native Midnight Compact ZK Circuits (`contracts/doctor_license.compact`)
Aquas smart contracts are written in Midnight’s purpose-built Compact language, enforcing strict cryptographic rules at the consensus layer:
* `createBoard`: Registers a state medical board with cryptographic authorization commitments.
* `createLicense`: Issues a new doctor license bound to an encrypted board identifier and private witness state.
* `updateLicense` & `deleteLicense`: Seamlessly rotates credential state or revokes licensing status on-chain.
* `proveValidLicense`: Executes zero-knowledge verification circuits proving validity and non-revocation against the Midnight ledger state.

---

### 4. ?? Instant Hospital Verification & Live Indexer Integration
Hospitals and credentialing agencies verify physician credentials in sub-second time without needing access to private databases.
* **Direct Chain Verification:** Queries live indexer state from Midnight Preview testnet—eliminating reliance on simulated, mocked, or cached sandbox data.
* **Cryptographic Verification Receipts:** Generates an immutable proof receipt validating status, issuing board authority, expiration timestamp, and verification block height.
* **Automated WASM Proving:** Local proving pipeline powered by `@midnight-ntwrk/compact-runtime` and compiled ZK circuits.

---

## ?? Comprehensive Platform Gallery & Screenshots

Here is the complete showcase of all components of the Aquas platform:

### 1. App Home & Doctor Credential Portal
*View active credentials, generate challenge-bound ZK verification proofs, and verify status.*
<img src="https://github.com/user-attachments/assets/b15d3ef3-4949-4b57-9729-5325f03e2c52" alt="App Home" width="100%" />

### 2. Smart Contract Deployment Flow
*Deploy the Aquas Compact zero-knowledge contract directly to the Midnight Preview testnet via 1AM wallet.*
<img src="https://github.com/user-attachments/assets/b69efc33-8355-44a0-b3c5-2900fe20b995" alt="Deploy Flow" width="100%" />

### 3. Board Registry & Credential Issuance
*State medical boards manage credentials, register new licenses, and maintain privacy-preserving registry state.*
<img src="https://github.com/user-attachments/assets/677f1d19-a328-4014-bf0d-3c32d3703fe3" alt="Registry View" width="100%" />

### 4. Continuous Integration & Automated ZK Testing
*Automated GitHub Actions CI pipeline executing end-to-end contract compilation, typechecking, and proving tests.*
<img src="https://github.com/user-attachments/assets/76a27a0d-6e6d-4a37-9c7f-858564c53528" alt="CI Workflow" width="100%" />

---

## ?? Verified On-Chain Transactions & Contracts

Aquas is fully integrated with the Midnight Network. It generates real zero-knowledge proofs and settles them on-chain with complete privacy guarantees.

> [!NOTE]
> **Network & Testnet Details:**
> - **Primary Verified Deployment:** Midnight Preview Testnet
> - **Contract Address:** [`0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74`](https://preview.midnightexplorer.com/contracts/0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74)
> - **Wallet Integration:** [1AM Browser Extension](https://1am.xyz) configured for Midnight Preview.
> - **Live Explorer:** View transactions, contract state, and proofs live on the [Midnight Explorer](https://preview.midnightexplorer.com/contracts/0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74).

### Real On-Chain Contract Verification (Preview)
* **Contract Address:** `0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74`
* **Network:** `Midnight Preview`
* **Status:** `ACTIVE / VERIFIED` (Compact ZK Verified)
<img src="https://github.com/user-attachments/assets/677f1d19-a328-4014-bf0d-3c32d3703fe3" alt="Contract Verification" width="100%" />

---

## ?? System Architecture & Project Structure

### Tech Stack
* **Blockchain Network:** Midnight Network (Preview Testnet)
* **Smart Contracts:** Compact (Midnight's native ZK language)
* **Web3 Integration:** `@midnight-ntwrk/compact-runtime`, `@midnight-ntwrk/dapp-connector-api`, `@midnight-ntwrk/midnight-js-contracts`, `1AM Wallet`
* **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide React, QRCode React
* **ZK & Proving Pipeline:** Midnight Prover Server, WASM Proving Runtime, Compact JS Compiler
* **Testing:** Vitest Test Suite (Contract & Application Unit Tests)

### Comprehensive Project Structure
```text
Aquas/
+-- app/                                    # Next.js App Router
¦   +-- api/                                # Backend normalization endpoints
¦   ¦   +-- license/route.ts                # Normalizes chain reads behind trusted endpoints
¦   +-- deploy/                             # In-App contract deployment flow
¦   ¦   +-- DeployClient.tsx                # Client-side deployment manager
¦   ¦   +-- page.tsx                        # Deploy page wrapper
¦   +-- favicon.ico                         # Favicon
¦   +-- globals.css                         # Tailwind CSS v4 design system
¦   +-- layout.tsx                          # Root layout & theme configuration
¦   +-- page.tsx                            # Core application: Home, Doctor Portal & Registry
+-- contracts/                              # Midnight Zero-Knowledge Smart Contracts
¦   +-- doctor_license.compact              # Core Compact contract (Board & License circuits)
¦   +-- managed/                            # Compiled contract artifacts
¦       +-- doctor_license/                 # Generated TypeScript & WASM contract bindings
¦           +-- contract/                   # Contract index & definitions
¦           +-- keys/                       # ZK proving & verification keys
+-- hooks/                                  # Custom React Hooks
¦   +-- use-midnight-wallet.ts              # 1AM wallet connection state, network & balance hook
+-- lib/                                    # Utilities, Cryptography & Blockchain Clients
¦   +-- deploy-doctor-license.ts            # Deployment helpers & private state initialization
¦   +-- doctor-license-client.ts            # Client-side transaction & circuit builder
¦   +-- midnight-browser.ts                 # 1AM wallet provider, ZK proof submission & balancing
¦   +-- midnight-read.ts                    # Indexer query engine for live on-chain state
+-- public/                                 # Static Assets & Prover Artifacts
¦   +-- zk/doctor_license/                  # Compiled ZK proving keys (*.zkir) for browser proving
+-- scripts/                                # Build & Automation Scripts
¦   +-- compile-contract.sh                 # Compact contract compilation script
¦   +-- sync-contract-assets.sh             # Proof asset synchronization script
+-- tests/                                  # Automated Test Suite
¦   +-- doctor-license.test.ts              # Contract logic & state validation tests
+-- proposals.md                            # Comprehensive product architecture & submission details
+-- package.json                            # Dependencies, scripts & project manifest
+-- tsconfig.json                           # TypeScript configuration
+-- next.config.ts                          # Next.js Webpack & WASM build configuration
```

---

## ?? Run Locally

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
# Run automated tests
npm test

# Run TypeScript type check
npm run typecheck

# Run ESLint validation
npm run lint

# Production build (compiles, syncs assets, and builds Next.js)
npm run build
```

---

## ?? License

Distributed under the MIT License. See `LICENSE` for more information.
