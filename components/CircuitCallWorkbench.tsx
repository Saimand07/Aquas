"use client";

import { useState } from "react";
import {
  Zap,
  Terminal,
  LoaderCircle,
  ExternalLink,
  Code2,
  Play,
  RotateCcw,
  Award,
  FileCheck2,
  Trash2,
  AlertTriangle,
  Server,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { useMidnightWallet } from "@/hooks/use-midnight-wallet";
import { useAuth } from "@/context/auth-context";
import {
  createPrivateCredential,
  deriveBoardIdentity,
  issueLicenseOnChain,
  revokeLicenseOnChain,
  proveLicenseOnChain,
  registerBoardOnChain
} from "@/lib/doctor-license-client";
import {
  connectOneAm,
  toHex,
  getNetworkConfig,
  getExplorerTxUrl
} from "@/lib/midnight-browser";
import { useActiveContract, getStoredDeployment } from "@/lib/deployed-contract";


type CircuitType = "proveValidLicense" | "createLicense" | "createBoard" | "deleteLicense";

const SAMPLE_BOARD_SECRET = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";
const SAMPLE_OWNER_SECRET = "223344556677889900aabbccddeeff11223344556677889900aabbccddeeff11";
// NOTE: This is NOT a credential ID — this is the contract address. The actual credential ID is
// computed from (boardSecret, doctorMetadata) inside createPrivateCredential(). 
// We do NOT show a sample credential ID here because it must match the board secret + metadata.
const SAMPLE_CREDENTIAL_ID = "";

export default function CircuitCallWorkbench() {
  const wallet = useMidnightWallet();
  const { authType, currentNetwork, isAuthenticated } = useAuth();
  const netConfig = getNetworkConfig(currentNetwork);
  const activeContract = useActiveContract(currentNetwork);

  const [selectedCircuit, setSelectedCircuit] = useState<CircuitType>("createBoard");
  const [executing, setExecuting] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    "Midnight Compact Circuit Runtime 0.16.0 initialized.",
    `Prover: 1AM Proofstation (${netConfig.indexerUri})`,
    `Target Ledger: ${netConfig.name}`,
    `Lifecycle: 1. createBoard -> 2. createLicense -> 3. proveValidLicense.`,
  ]);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form inputs
  // credentialId starts empty — it is COMPUTED from boardSecret+metadata. User must generate it or paste a real one.
  const [credentialId, setCredentialId] = useState(SAMPLE_CREDENTIAL_ID);
  const [boardSecret, setBoardSecret] = useState(SAMPLE_BOARD_SECRET);
  const [ownerSecret, setOwnerSecret] = useState(() => {
    return getStoredDeployment(currentNetwork)?.ownerSecret || SAMPLE_OWNER_SECRET;
  });
  // Stored private credential for the proveValidLicense circuit (generated alongside credentialId)

  const [storedPrivateCredential, setStoredPrivateCredential] = useState<import("@/lib/doctor-license-client").PrivateCredential | null>(null);

  const isWalletConnected = Boolean(wallet.connected || (isAuthenticated && authType === "wallet"));

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${msg}`]);
  };

  // Generate a fresh credential commitment from the current boardSecret and sample doctor metadata
  const handleGenerateCredential = async () => {
    try {
      setErrorMsg(null);
      const cleanSecret = boardSecret.trim().replace(/^0x/i, "");
      if (cleanSecret.length !== 64) {
        setErrorMsg("Board Secret must be exactly 64 hex characters (32 bytes).");
        return;
      }
      const { credentialId: newId, privateCredential } = await createPrivateCredential(cleanSecret, {
        doctorName: "Dr. Sarah Lin, MD",
        licenseNumber: "NYS-84920",
        board: "New York Medical Board",
      });
      setCredentialId(newId);
      setStoredPrivateCredential(privateCredential);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Generated credential commitment: ${newId}`,
        `[${new Date().toLocaleTimeString()}] Private credential stored in-session. Ready to prove.`,
      ]);
      toast.success("Credential ID Generated", {
        description: `Commitment: ${newId.slice(0, 20)}…`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    }
  };

  const handleExecuteCircuit = async () => {
    setExecuting(true);
    setTxHash(null);
    setErrorMsg(null);
    setLogs([`Initiating live circuit call: ${selectedCircuit} on ${netConfig.name}...`]);

    const contractAddress = activeContract;


    if (!isWalletConnected) {
      addLog("[ERROR] 1AM Wallet is not connected.");
      addLog(`Please connect your 1AM wallet in the topbar to sign on-chain transactions via 1AM Proofstation on ${netConfig.name}.`);
      setErrorMsg(`1AM Wallet connection required on ${netConfig.name}. Please connect your wallet in the navigation header.`);
      toast.error("1AM Wallet Required", {
        description: `Please connect your 1AM wallet on ${netConfig.name} in the top navigation header.`,
      });
      setExecuting(false);
      return;
    }

    try {
      addLog(`Target Contract: ${contractAddress}`);
      addLog(`Step 1/4: Connecting to 1AM Prover Provider on ${netConfig.badge} & Loading Proving Keys…`);

      const sess = wallet.session || await connectOneAm(currentNetwork, "/zk/doctor_license/");
      addLog(`Connected to 1AM wallet: ${sess.unshieldedAddress.slice(0, 16)}…`);
      addLog("Step 2/4: Assembling private witness vector…");

      let tx: string;

      if (selectedCircuit === "proveValidLicense") {
        addLog("Evaluating witness: { credentialPayload, credentialNonce, boardKey, doctorSecret }");
        addLog("Step 3/4: Requesting 1AM Proofstation to compute Halo2 SNARK proof…");

        // CRITICAL: The credentialId MUST be the commitment derived from this exact privateCredential.
        // Using a mismatched credentialId causes: "failed assert: private credential does not match ID"
        let privateCredential = storedPrivateCredential;
        let resolvedCredentialId = credentialId.replace(/^0x/i, "");

        if (!privateCredential || !resolvedCredentialId) {
          // Auto-generate matching credential + commitment from the board secret
          addLog("Auto-generating credential commitment from boardSecret + doctor metadata…");
          const generated = await createPrivateCredential(boardSecret.replace(/^0x/i, ""), {
            doctorName: "Dr. Sarah Lin, MD",
            licenseNumber: "NYS-84920",
            board: "New York Medical Board",
          });
          privateCredential = generated.privateCredential;
          resolvedCredentialId = generated.credentialId.replace(/^0x/i, "");
          setCredentialId(generated.credentialId);
          setStoredPrivateCredential(generated.privateCredential);
          addLog(`Credential commitment: ${generated.credentialId}`);
        }

        const challenge = crypto.getRandomValues(new Uint8Array(32));
        addLog(`Using commitment ID: ${resolvedCredentialId.slice(0, 16)}…`);
        addLog(`Step 4/4: Synthesizing ZK proof & requesting 1AM authorization…`);
        addLog(`👉 Please approve the transaction in your 1AM wallet popup to submit on-chain…`);

        tx = await proveLicenseOnChain(
          sess,
          contractAddress,
          privateCredential,
          resolvedCredentialId,
          challenge
        );

        setTxHash(tx);
        addLog(`✓ Circuit Execution Confirmed on ${netConfig.badge}!`);
        addLog(`Transaction Hash: ${tx}`);
        toast.success(`Zero-Knowledge Proof Verified On ${netConfig.badge}!`, {
          description: `Transaction: ${tx.slice(0, 18)}…`,
          action: {
            label: "View on Explorer ↗",
            onClick: () => window.open(getExplorerTxUrl(tx, currentNetwork), "_blank"),
          },
        });
      } else if (selectedCircuit === "createLicense") {
        addLog("Generating SHA-256 + Pedersen license commitment…");
        const { credentialId: newId } = await createPrivateCredential(boardSecret, {
          doctorName: "Dr. Marcus Chen, MD",
          licenseNumber: "MD-CA-99201",
          board: "California Medical Board",
        });
        addLog(`Computed on-chain commitment ID: ${newId}`);
        addLog("Step 3/4: Synthesizing ZK proof via 1AM Proofstation…");

        const now = BigInt(Math.floor(Date.now() / 1000));
        const expiry = now + BigInt(86400 * 365 * 3);
        addLog(`Step 4/4: Requesting 1AM authorization & submitting state transition…`);
        addLog(`👉 Please approve the transaction in your 1AM wallet popup…`);

        tx = await issueLicenseOnChain(sess, contractAddress, boardSecret, newId, now, expiry);
        setTxHash(tx);
        addLog(`✓ createLicense Confirmed on ${netConfig.badge}!`);
        addLog(`Transaction Hash: ${tx}`);
        toast.success(`Medical License Committed to ${netConfig.badge} Ledger!`, {
          description: `Transaction: ${tx.slice(0, 18)}…`,
          action: {
            label: "View on Explorer ↗",
            onClick: () => window.open(getExplorerTxUrl(tx, currentNetwork), "_blank"),
          },
        });
      } else if (selectedCircuit === "createBoard") {
        addLog("Deriving Board Public Key & Authorization Vector…");
        const { key } = deriveBoardIdentity(boardSecret);
        addLog(`Board Public Key: ${toHex(key)}`);
        addLog("Step 3/4: Synthesizing Board Authorization proof via 1AM Proofstation…");
        addLog("Step 4/4: Requesting 1AM authorization & transmitting state update…");
        addLog(`👉 Please approve the transaction in your 1AM wallet popup…`);

        tx = await registerBoardOnChain(sess, contractAddress, ownerSecret, boardSecret);
        setTxHash(tx);
        addLog(`✓ createBoard Confirmed on ${netConfig.badge}!`);
        addLog(`Transaction Hash: ${tx}`);
        toast.success(`State Medical Board Registered on ${netConfig.badge}!`, {
          description: `Transaction: ${tx.slice(0, 18)}…`,
          action: {
            label: "View on Explorer ↗",
            onClick: () => window.open(getExplorerTxUrl(tx, currentNetwork), "_blank"),
          },
        });
      } else if (selectedCircuit === "deleteLicense") {
        addLog(`Preparing license revocation for: ${credentialId}`);
        addLog("Step 3/4: Proving board signing authority via 1AM Proofstation…");
        addLog("Step 4/4: Requesting 1AM authorization to move credential to revoked set…");
        addLog(`👉 Please approve the transaction in your 1AM wallet popup…`);

        tx = await revokeLicenseOnChain(sess, contractAddress, boardSecret, credentialId.replace(/^0x/, ""));
        setTxHash(tx);
        addLog(`✓ deleteLicense Confirmed on ${netConfig.badge}!`);
        addLog(`Transaction Hash: ${tx}`);
        toast.success(`License Nullified on ${netConfig.badge}!`, {
          description: `Transaction: ${tx.slice(0, 18)}…`,
          action: {
            label: "View on Explorer ↗",
            onClick: () => window.open(getExplorerTxUrl(tx, currentNetwork), "_blank"),
          },
        });
      }
    } catch (err) {
      let msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("issuing board is no longer trusted") || msg.includes("board is not trusted") || msg.includes("board not found")) {
        msg = "Medical Board not registered on this contract yet. Please execute Step 1 (createBoard) first to register the board authority, then Step 2 (createLicense) before proving.";
      } else if (msg.includes("license not found")) {
        msg = "License credential ID not found on-chain. Please execute Step 2 (createLicense) first to commit the license to the ledger.";
      } else if (msg.includes("license revoked")) {
        msg = "This license has been revoked on-chain and can no longer be proven.";
      }
      setErrorMsg(msg);
      addLog(`[ERROR] 1AM Proofstation / ${netConfig.badge} Ledger Notice: ${msg}`);
      toast.error(`Circuit Action Required`, { description: msg, duration: 8000 });
    } finally {
      setExecuting(false);
    }
  };

  const explorerTxUrl = txHash ? getExplorerTxUrl(txHash, currentNetwork) : "";

  return (
    <div className="p-6 md:p-8 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b08d57]/10 border border-[#b08d57]/20 text-xs font-mono text-[#b08d57] mb-2 font-semibold">
            <Code2 size={14} />
            <span>COMPACT 0.16.0 LIVE RUNTIME ({netConfig.badge})</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Execute On-Chain Compact Circuits
          </h2>
          <p className="text-zinc-400 text-xs font-mono mt-1 flex items-center gap-2">
            <Server size={12} className={currentNetwork === "preprod" ? "text-[#3fa96b]" : "text-[#b08d57]"} />
            <span>Connected to 1AM Proofstation ({netConfig.name} - Zero Gas Fees)</span>
          </p>
        </div>

        <button
          onClick={() => {
            setLogs([`Console cleared. Select a circuit to execute on ${netConfig.name}.`]);
            setTxHash(null);
            setErrorMsg(null);
          }}
          className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
          title="Clear Console"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Circuit Selector Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[
          {
            id: "createBoard",
            step: "STEP 1",
            label: "createBoard",
            icon: Award,
            desc: "Register Authority",
          },
          {
            id: "createLicense",
            step: "STEP 2",
            label: "createLicense",
            icon: FileCheck2,
            desc: "Issue Credential",
          },
          {
            id: "proveValidLicense",
            step: "STEP 3",
            label: "proveValidLicense",
            icon: Zap,
            desc: "Zero-Knowledge Prover",
          },
          {
            id: "deleteLicense",
            step: "STEP 4",
            label: "deleteLicense",
            icon: Trash2,
            desc: "Revoke Nullifier",
          },
        ].map((c) => {
          const Icon = c.icon;
          const isSelected = selectedCircuit === c.id;
          return (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCircuit(c.id as CircuitType);
                setTxHash(null);
                setErrorMsg(null);
              }}
              style={{
                background: isSelected ? "rgba(176, 141, 87, 0.15)" : "rgba(255, 255, 255, 0.02)",
                borderColor: isSelected ? "rgba(176, 141, 87, 0.5)" : "rgba(255, 255, 255, 0.08)",
              }}
              className="p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer hover:border-white/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon size={16} className={isSelected ? "text-[#b08d57]" : "text-zinc-400"} />
                  <span className={`text-xs font-mono font-bold truncate ${isSelected ? "text-white" : "text-zinc-300"}`}>
                    {c.label}
                  </span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">{c.step}</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono truncate">{c.desc}</span>
            </button>
          );
        })}
      </div>


      {/* Circuit Parameters Form & Execution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Parameters Input */}
        <div className="lg:col-span-6 space-y-4 bg-white/[0.02] border border-white/10 rounded-2xl p-5 font-mono text-xs">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">
              Parameters ({netConfig.badge})
            </span>
            <span className="text-[#3fa96b] text-[10px] flex items-center gap-1">
              <CheckCircle2 size={11} />
              <span>1AM Proofstation Ready</span>
            </span>
          </div>

          {selectedCircuit === "proveValidLicense" && (
            <>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-zinc-400 text-[11px]">Board Secret (Private Witness):</label>
                </div>
                <input
                  type="text"
                  value={boardSecret}
                  onChange={(e) => { setBoardSecret(e.target.value); setStoredPrivateCredential(null); setCredentialId(""); }}
                  className="w-full p-2.5 bg-black/60 border border-white/10 rounded-lg text-zinc-400 font-mono text-xs focus:outline-none focus:border-[#b08d57]"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-zinc-400 text-[11px]">Credential Commitment ID (Hex):</label>
                  <button
                    onClick={handleGenerateCredential}
                    className="text-[10px] px-2 py-1 rounded-lg bg-[#b08d57]/15 border border-[#b08d57]/30 text-[#b08d57] hover:bg-[#b08d57]/30 transition-colors cursor-pointer font-bold"
                    title="Compute the credential commitment ID from the Board Secret above"
                  >
                    ⚡ Generate from Secret
                  </button>
                </div>
                {!credentialId && (
                  <p className="text-amber-400/70 text-[10px] font-mono">
                    ⚠ No commitment ID. Click &quot;Generate from Secret&quot; above or paste a real credential ID.
                  </p>
                )}
                <input
                  type="text"
                  value={credentialId}
                  onChange={(e) => { setCredentialId(e.target.value); setStoredPrivateCredential(null); }}
                  placeholder="Click 'Generate from Secret' to compute the commitment ID…"
                  className="w-full p-2.5 bg-black/60 border border-white/10 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#b08d57] placeholder:text-zinc-600"
                />
                {storedPrivateCredential && (
                  <p className="text-[#3fa96b] text-[10px] font-mono">
                    ✓ Private credential stored in-session. Commitment matches. Ready to prove.
                  </p>
                )}
              </div>
            </>
          )}


          {selectedCircuit === "createLicense" && (
            <>
              <div className="space-y-1">
                <label className="text-zinc-400 text-[11px]">Issuing Board Secret Key:</label>
                <input
                  type="text"
                  value={boardSecret}
                  onChange={(e) => setBoardSecret(e.target.value)}
                  className="w-full p-2.5 bg-black/60 border border-white/10 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#b08d57]"
                />
              </div>
              <p className="text-zinc-500 text-[11px]">
                Calculates H(metadata, nonce, boardKey) and commits to {netConfig.badge} public state.
              </p>
            </>
          )}

          {selectedCircuit === "createBoard" && (
            <>
              <div className="space-y-1">
                <label className="text-zinc-400 text-[11px]">Registry Owner Secret:</label>
                <input
                  type="text"
                  value={ownerSecret}
                  onChange={(e) => setOwnerSecret(e.target.value)}
                  className="w-full p-2.5 bg-black/60 border border-white/10 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#b08d57]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400 text-[11px]">New Board Secret:</label>
                <input
                  type="text"
                  value={boardSecret}
                  onChange={(e) => setBoardSecret(e.target.value)}
                  className="w-full p-2.5 bg-black/60 border border-white/10 rounded-lg text-zinc-300 font-mono text-xs focus:outline-none focus:border-[#b08d57]"
                />
              </div>
            </>
          )}

          {selectedCircuit === "deleteLicense" && (
            <>
              <div className="space-y-1">
                <label className="text-zinc-400 text-[11px]">Target Credential ID to Revoke:</label>
                <input
                  type="text"
                  value={credentialId}
                  onChange={(e) => setCredentialId(e.target.value)}
                  className="w-full p-2.5 bg-black/60 border border-white/10 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#b08d57]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400 text-[11px]">Authorized Board Secret:</label>
                <input
                  type="text"
                  value={boardSecret}
                  onChange={(e) => setBoardSecret(e.target.value)}
                  className="w-full p-2.5 bg-black/60 border border-white/10 rounded-lg text-zinc-400 font-mono text-xs focus:outline-none focus:border-[#b08d57]"
                />
              </div>
            </>
          )}

          <button
            onClick={handleExecuteCircuit}
            disabled={executing}
            style={{
              background: "#ffffff",
              color: "#000000",
              fontWeight: 700,
            }}
            className="w-full mt-3 py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-xl hover:bg-[#b08d57] transition-colors cursor-pointer disabled:opacity-50"
          >
            {executing ? (
              <>
                <LoaderCircle className="animate-spin text-black" size={16} />
                <span>1AM Proofstation Generating ZK-SNARK…</span>
              </>
            ) : (
              <>
                <Play size={16} className="text-black fill-current" />
                <span>⚡ Execute Live On-Chain Circuit ({selectedCircuit})</span>
              </>
            )}
          </button>
        </div>

        {/* Live Terminal Output Console */}
        <div className="lg:col-span-6 bg-black/90 border border-white/10 rounded-2xl p-4 font-mono text-xs space-y-3 flex flex-col justify-between min-h-[260px]">
          <div>
            <div className="flex items-center gap-2 text-zinc-400 border-b border-white/10 pb-2 mb-3">
              <Terminal size={14} className={currentNetwork === "preprod" ? "text-[#3fa96b]" : "text-[#b08d57]"} />
              <span className="font-bold text-[11px] text-zinc-300">
                1AM Proofstation Terminal ({netConfig.badge})
              </span>
            </div>

            <div className="space-y-1.5 max-h-[170px] overflow-y-auto text-[11px]">
              {logs.map((l, i) => (
                <div key={i} className={l.startsWith("✓") ? "text-[#3fa96b] font-bold" : l.startsWith("[ERROR]") ? "text-red-400 font-bold" : "text-zinc-300"}>
                  {l}
                </div>
              ))}
            </div>
          </div>

          {txHash && (
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-[#3fa96b]/10 p-2.5 rounded-xl border border-[#3fa96b]/20">
              <span className="text-[#3fa96b] text-[11px] font-bold truncate">Settlement TX: {txHash}</span>
              <a
                href={explorerTxUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "#3fa96b",
                  color: "#000000",
                  fontWeight: 700,
                }}
                className="px-2.5 py-1 rounded text-[10px] flex items-center gap-1 hover:bg-white transition-colors cursor-pointer"
              >
                <span>Verify on Explorer ({netConfig.badge})</span>
                <ExternalLink size={10} />
              </a>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
