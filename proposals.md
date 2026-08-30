# Level 3 Product Proposal & Technical Specification: Confidential Credentials

---

## Executive Summary

* **Track:** Level 3 Proposal — Confidential Credentials
* **Selected Idea:** *Confidential Credentials — Prove a credential is valid without disclosing it.*
* **Product Name:** **Aquas** (Privacy-Preserving Physician & Medical License Registry on Midnight)
* **Live Application:** [https://license-seal-sigma.vercel.app/](https://license-seal-sigma.vercel.app/)
* **Demo Video:** [https://youtu.be/WOtCmrVp94g](https://youtu.be/WOtCmrVp94g)
* **GitHub Repository:** [https://github.com/Saimand07/Aquas](https://github.com/Saimand07/Aquas)
* **Target Network:** Midnight Network (Preview Testnet & Preprod Network)
* **Smart Contract Language:** Compact 0.16.0 (Midnight Native Zero-Knowledge Language)

---

## 1. Problem Statement & Healthcare Dilemma

In traditional healthcare infrastructure, **medical licensing, physician credentialing, and hospital privilege verification** are plagued by critical structural flaws:

1. **Severe Privacy Leaks & Identity Theft:**
   - When a physician applies to a hospital, relocates across jurisdictions, or provides emergency locum tenens coverage, they must transmit unencrypted, sensitive Personally Identifiable Information (PII) including Social Security Numbers (SSN), full legal names, dates of birth, DEA Schedule authorizations, and residential addresses.
   - Centralized hospital databases frequently suffer data breaches, exposing clinician credentials to identity theft and unauthorized surveillance.

2. **The Multi-Week Verification Bottleneck:**
   - Hospital credentialing committees, State Medical Boards, and compliance officers spend weeks or months manually exchanging phone calls, faxes, paper affidavits, and unverified emails to establish primary source verification. This creates severe staffing shortages in critical care units.

3. **Public Blockchains Violate HIPAA:**
   - Standard transparent blockchains (e.g., Ethereum, Solana, Polygon) are legally unusable for healthcare credentials. Publishing medical licensing records on public ledgers permanently exposes physician employment histories, disciplinary inquiries, and hospital affiliations to competitors and data brokers, violating HIPAA Safe Harbor and GDPR regulations.

---

## 2. The Solution: Aquas Protocol

**Aquas** delivers a privacy-preserving medical credentialing network built natively on the **Midnight Privacy Blockchain**.

Using Zero-Knowledge SNARK circuits written in **Compact**, Aquas allows physicians to mathematically prove to any hospital or employer that they hold an active, valid, unrevoked state medical license issued by an authorized medical board—**in under one second with 0 bytes of PII disclosed on-chain**.

```text
+----------------------------------------------------------------------------------------------------+
|                                      THE AQUAS GUARANTEE                                           |
|                                                                                                    |
|   "A physician can mathematically prove possession of an active, unexpired, unrevoked license      |
|    issued by an accredited state medical board without revealing their name, SSN, license number,  |
|    or witness secrets to either the verifier or the public blockchain."                            |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Privacy Architecture: What is Private vs. What is Public

Aquas utilizes Midnight's **dual-state execution model** to strictly segregate sensitive private witnesses from public ledger commitments.

```text
+----------------------------------------------------------------------------------------------------+
|                                    AQUAS PRIVACY BOUNDARY                                          |
|                                                                                                    |
|  [PRIVATE WITNESS STATE - CLIENT / 1AM]             [PUBLIC LEDGER STATE - MIDNIGHT ON-CHAIN]      |
|                                                                                                    |
|  x Physician Full Legal Name                        ✓ Contract Instance Address                    |
|  x Social Security Number (SSN)                     ✓ Accredited Medical Board Public Keys         |
|  x State Medical License Number                     ✓ Shielded License Commitments (Pedersen Hash) |
|  x DEA Schedule Privileges (I-V)                    ✓ Credential Expiration Timestamps             |
|  x Private Ephemeral Salt Nonce                     ✓ Revocation Status Set                        |
|  x Doctor Master Secret                             ✓ Aggregate Telemetry Verification Counters    |
|  x Board Master Authorization Secret                ✓ Single-Use Anti-Replay Nullifier Set         |
|  x Hospital Verification Linkage (0 Linkage)        ✓ On-Chain Proof Verification Result           |
+----------------------------------------------------------------------------------------------------+
```

### Detailed Data Boundary Matrix

| Dimension | Public Ledger State (On-Chain) | Private Witness State (Client / 1AM Wallet) |
| :--- | :--- | :--- |
| **Data Scope** | Cryptographic commitments, state sets, and expiration bounds | Full legal PII, license numbers, DEA privileges, and witness salts |
| **Storage Location** | Midnight Preview/Preprod shielded ledger consensus | Client browser local storage (`aquasPrivateState`) & 1AM wallet |
| **Network Visibility** | Publicly verifiable on 1AM Explorer and Midnight Explorer | Never transmitted across network; evaluated entirely inside WASM/prover |
| **Medical Boards** | Public key identifier (`bytes<32>`) in `trustedBoards` set | Master board authorization secret used to sign credentials |
| **License Records** | `licenseCommitment` (Pedersen hash) in `issuedLicenses` set | Doctor's legal name, state license number, specialty hash, salt nonce |
| **ZK Circuit** | Verification result of `proveValidLicense` circuit | Halo2 ZK-SNARK witness execution in 1AM Proofstation |
| **Compliance** | HIPAA Safe Harbor & GDPR compliant (Zero PII stored) | Full primary source verification fidelity |

---

## 4. Cryptographic Commitment & Proving Pipeline

### 4.1 Credential Issuance Pipeline (`createLicense`)
When an accredited State Medical Board issues a credential:
1. **Metadata Digest:** The doctor's confidential metadata (Name, SSN, State License ID, DEA tier) is hashed into a 32-byte SHA-256 digest: `payload = SHA256(PII_metadata)`.
2. **Board Key Derivation:** The medical board's public key is derived from its signing authority secret: `boardKey = derivePublicKey(boardSecret)`.
3. **Salted Pedersen Commitment:** A cryptographically secure 32-byte ephemeral nonce is generated, and a Pedersen hash commitment is computed:
   $$\text{Credential ID} = \text{PedersenHash}(\text{payload}, \text{nonce}, \text{boardKey})$$
4. **On-Chain Registration:** The board submits `createLicense(newId, issuedAt, expiresAt)`. Only the 32-byte `newId` and timestamps are written to the `issuedLicenses` and `licenseExpiries` ledger sets.

### 4.2 Zero-Knowledge Proving Pipeline (`proveValidLicense`)
When a hospital requests verification:
1. **Challenge Issuance:** The hospital presents an ephemeral 32-byte verification challenge.
2. **Witness Assembly:** The physician's browser loads the private witness vector:
   $$\mathcal{W} = \{\text{payload}, \text{nonce}, \text{boardKey}, \text{doctorSecret}\}$$
3. **Halo2 SNARK Generation:** The 1AM Proofstation generates a Zero-Knowledge proof verifying:
   - $\text{PedersenHash}(\text{payload}, \text{nonce}, \text{boardKey}) == \text{credentialId}$
   - $\text{trustedBoards.member}(\text{boardKey}) == \text{true}$
   - $\text{issuedLicenses.member}(\text{credentialId}) == \text{true}$
   - $\text{revokedLicenses.member}(\text{credentialId}) == \text{false}$
   - $\text{currentTime} < \text{expiresAt}$
   - $\text{usedProofs.member}(\text{nullifier}) == \text{false}$
4. **Anti-Replay Nullification:** A single-use nullifier is derived:
   $$\text{nullifier} = \text{PedersenHash}(\text{credentialId}, \text{challenge}, \text{doctorSecret})$$
   The nullifier is inserted into `usedProofs` on-chain, preventing replay attacks while preserving doctor anonymity.

---

## 5. Smart Contract Circuit Specification (`doctor_license.compact`)

The Aquas smart contract is written in Compact 0.16.0 and implements five core circuits:

```compact
export circuit createBoard(newBoardKey: Bytes<32>, authorization: Bytes<32>): Void
export circuit updateBoard(boardKey: Bytes<32>, newStatus: Uint<8>): Void
export circuit createLicense(newId: Bytes<32>, issuedAt: Uint<64>, expiresAt: Uint<64>): Void
export circuit updateLicense(licenseId: Bytes<32>, newExpiresAt: Uint<64>): Void
export circuit deleteLicense(licenseId: Bytes<32>): Void
export circuit proveValidLicense(credentialId: Bytes<32>, currentTime: Uint<64>, challenge: Bytes<32>): Bytes<32>
```

---

## 6. Enterprise Healthcare Ecosystem Features

1. **Hospital Verification Desk (`/dashboard`):**
   - Instant 1-click verification of clinician credentials with 0-byte PII disclosure.
2. **Multi-Doctor Batch Verification Hub (`/batch`):**
   - Parallel multi-credential validation engine designed for hospital staffing networks with CSV/JSON compliance audit export.
3. **HL7 FHIR R4 Healthcare EHR Gateway (`/ehr` & `/api/ehr/verify`):**
   - Standardized FHIR Practitioner resource adapter mapping on-chain ZK proofs directly to hospital electronic health record systems (Epic, Cerner, AthenaHealth).
4. **Air-Gapped Mobile Physician Pass & Offline TOTP (`/pass`):**
   - Dynamic rotating QR code pass using HMAC-SHA256 time-based challenges for air-gapped clinical check-in without continuous internet connectivity.
5. **Real-Time Network Telemetry & Expiration Radar (`/explorer`):**
   - Live on-chain metrics, smart contract state commits, and automated expiration radar alerts.
6. **In-App Sovereign Deployer (`/deploy`):**
   - Multi-network contract deployer enabling medical boards to deploy sovereign instances across Preview and Preprod networks.

---

## 7. Verified On-Chain Deployments

### Midnight Preview Testnet
* **Contract Address:** `0x2459ebb32d836193b34e132505e339f54ae9f18fb215fe78e07935bdcb74007c`
* **Deployment Transaction:** `0xddf7b73515b722ab3f211d0804f928d1586f5ff2623ecfec2c2d55a313a8f365`
* **Block Height:** `#641,015`
* **Explorer Link:** [Verify Preview Contract on 1AM Explorer](https://explorer.1am.xyz/contract/2459ebb32d836193b34e132505e339f54ae9f18fb215fe78e07935bdcb74007c?network=preview)

### Midnight Preprod Network
* **Contract Address:** `0xd1eb4aa822360421f5ad357831faf4ebef2b9a7b23e425ee05d3822d92f21244`
* **Deployment Transaction:** `0x3515d0932e48f6f0a79e6a3fabaa567438d569321b723b890ff32b12913d96ec`
* **Block Height:** `#2,326,383`
* **Explorer Link:** [Verify Preprod Contract on 1AM Explorer](https://explorer.1am.xyz/contract/d1eb4aa822360421f5ad357831faf4ebef2b9a7b23e425ee05d3822d92f21244?network=preprod)

---

## 8. MVP Scope & Success Criteria Audit

| Success Metric | Target Requirement | Delivered Result | Status |
| :--- | :--- | :--- | :---: |
| **Compact Contract Deployment** | Deployed on Midnight Preview network | Deployed and verified on both **Preview** and **Preprod** networks | **PASS** |
| **Credential Lifecycle Circuits** | Issue, verify, renew, and revoke credentials | All 5 Compact circuits operational via 1AM Proofstation | **PASS** |
| **Privacy Preservation** | 0 bytes PII disclosed on-chain | Dual-state architecture: PII kept in browser, commitments on-chain | **PASS** |
| **Automated Testing Suite** | Minimum 3 tests passing | **44 automated Vitest tests passing across 9 test suites** | **PASS** |
| **CI/CD Automation** | Workflow with passing runs | Automated GitHub Actions CI workflow covering lint, typecheck, test, build | **PASS** |
| **Documentation & Demo** | README, privacy model, and demo links | Comprehensive README, architecture diagrams, and 1-minute video demo | **PASS** |
| **Commit History** | Minimum 10 meaningful commits | **39+ granular commits** on `main` branch | **PASS** |

