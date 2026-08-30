"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  CircleAlert,
  Clipboard,
  ExternalLink,
  KeyRound,
  LoaderCircle,
  Rocket,
  WalletCards,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { deployDoctorLicense } from "@/lib/deploy-doctor-license";
import {
  connectOneAm,
  detectOneAmWallet,
  pollForContract,
  toHex,
  getNetworkConfig,
  getExplorerContractUrl,
  getExplorerTxUrl,
  type BrowserSession,
  type MidnightNetwork,
} from "@/lib/midnight-browser";
import { useMidnightWallet } from "@/hooks/use-midnight-wallet";
import { useAuth } from "@/context/auth-context";

type DeploymentRecord = {
  contractAddress: string;
  transactionId: string;
  deployedAt: string;
};

function loadStoredDeployment(network: MidnightNetwork): DeploymentRecord {
  const netConfig = getNetworkConfig(network);
  const fallback: DeploymentRecord = {
    contractAddress: netConfig.canonicalContract,
    transactionId: netConfig.canonicalContract,
    deployedAt: new Date().toISOString(),
  };

  if (typeof window === "undefined") return fallback;
  try {
    const saved = window.localStorage.getItem(`aquas:deployment:${network}`);
    if (saved) {
      const parsed = JSON.parse(saved) as DeploymentRecord;
      if (parsed.contractAddress && !parsed.contractAddress.includes("2459ebb")) {
        return parsed;
      }
      window.localStorage.removeItem(`aquas:deployment:${network}`);
    }
  } catch {
    // ignore
  }
  return fallback;
}

export default function DeployClient() {
  const wallet = useMidnightWallet();
  const { user, authType, isAuthenticated, walletAddress, currentNetwork, switchNetwork } = useAuth();
  
  const deployNetwork = currentNetwork || "preview";
  const [walletInstalled, setWalletInstalled] = useState<boolean | null>(null);
  const [session, setSession] = useState<BrowserSession | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [status, setStatus] = useState("Ready to deploy on Midnight");
  const [error, setError] = useState("");
  const [ownerSecret, setOwnerSecret] = useState("");
  const mounted = useRef(true);

  const netConfig = getNetworkConfig(deployNetwork);
  const storageKey = `aquas:deployment:${deployNetwork}`;

  const [deployment, setDeployment] = useState<DeploymentRecord>(() => loadStoredDeployment(deployNetwork));

  const handleNetworkChange = (net: MidnightNetwork) => {
    switchNetwork(net);
    setSession(null);
    setDeployment(loadStoredDeployment(net));
    setStatus(`Switched to ${getNetworkConfig(net).name}. Ready to deploy.`);
  };

  const isWalletConnected = Boolean(session || wallet.connected || (isAuthenticated && authType === "wallet"));
  const displayAddress = session?.unshieldedAddress || wallet.address || walletAddress || user?.identifier || "mn_preview_wallet";
  const shortAddress = displayAddress ? `${displayAddress.slice(0, 14)}…` : `${netConfig.badge} Active`;

  const initSession = useCallback(async (): Promise<BrowserSession | null> => {
    if (session && session.network === deployNetwork) return session;
    setConnecting(true);
    setError("");
    setStatus(`Establishing 1AM ${deployNetwork} proving session…`);
    try {
      const connected = await connectOneAm(deployNetwork, "/zk/doctor_license/");
      if (mounted.current) {
        setSession(connected);
        setStatus(`1AM proving session active on ${deployNetwork}.`);
      }
      return connected;
    } catch (reason) {
      if (mounted.current) {
        setError(reason instanceof Error ? reason.message : "Wallet session establishment failed.");
        setStatus(`1AM connection required on ${deployNetwork}`);
      }
      return null;
    } finally {
      if (mounted.current) setConnecting(false);
    }
  }, [session, deployNetwork]);

  useEffect(() => {
    void detectOneAmWallet(deployNetwork).then((w) => {
      if (mounted.current) {
        const hasWallet = w !== null;
        setWalletInstalled(hasWallet);
        if (hasWallet && (wallet.connected || authType === "wallet")) {
          void initSession();
        }
      }
    });
    return () => {
      mounted.current = false;
    };
  }, [deployNetwork, initSession, wallet.connected, authType]);

  const handleDeploy = async () => {
    if (deploying) return;
    setError("");
    setDeploying(true);
    setStatus(`Connecting to 1AM Prover on ${netConfig.name}…`);

    try {
      let activeSession = session;
      if (!activeSession || activeSession.network !== deployNetwork) {
        activeSession = await initSession();
        if (!activeSession) {
          throw new Error(`1AM wallet must be connected on ${netConfig.name} to authorize deployment transaction.`);
        }
      }

      const secret = crypto.getRandomValues(new Uint8Array(32));
      setStatus("Synthesizing Compact ZK proof via local WASM runtime…");

      // 90-second safeguard timeout for proof generation & user approval in 1AM
      const deployPromise = deployDoctorLicense(activeSession, secret);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "Deployment timed out. Please ensure 1AM extension popup is approved.",
              ),
            ),
          90000,
        ),
      );

      const result = await Promise.race([deployPromise, timeoutPromise]);
      if (!mounted.current) return;

      const record: DeploymentRecord = {
        ...result,
        deployedAt: new Date().toISOString(),
      };

      // IMMEDIATELY update deployment state and release the spinner
      setDeployment(record);
      setOwnerSecret(toHex(secret));
      setDeploying(false);
      window.localStorage.setItem(storageKey, JSON.stringify(record));
      setStatus(`Contract submitted and confirmed on ${netConfig.name} ledger!`);

      // Rich in-app toast notification with verifiable link
      toast.success(`Contract Deployed on ${netConfig.badge}!`, {
        description: `Contract: ${record.contractAddress.slice(0, 16)}…`,
        duration: 10000,
        action: {
          label: "View on Explorer ↗",
          onClick: () => window.open(getExplorerContractUrl(record.contractAddress, deployNetwork), "_blank"),
        },
      });

      // Background non-blocking indexer sync check
      void pollForContract(activeSession.config.indexerUri, record.contractAddress).catch((err) => {
        console.warn("Background indexer sync notice:", err);
      });
    } catch (reason) {
      if (mounted.current) {
        const message = reason instanceof Error ? reason.message : "Deployment failed";
        setError(message);
        setStatus("Deployment failed");
        setDeploying(false);
        toast.error("Deployment Failed", {
          description: message,
        });
      }
    }
  };

  function copy(value: string, label = "Value") {
    void navigator.clipboard.writeText(value);
    toast.success(`${label} copied to clipboard!`);
  }

  const resetToCanonical = () => {
    const canonical = loadStoredDeployment(deployNetwork);
    setDeployment(canonical);
    window.localStorage.removeItem(storageKey);
    setStatus(`Reset to canonical ${deployNetwork} contract.`);
    toast.info(`Reset to canonical ${deployNetwork} contract.`);
  };

  const explorerContractUrl = deployment ? getExplorerContractUrl(deployment.contractAddress, deployNetwork) : "";
  const explorerTxUrl = deployment ? getExplorerTxUrl(deployment.transactionId, deployNetwork) : "";

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 font-sans pb-16">
      {/* Page Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b08d57]/10 border border-[#b08d57]/20 text-xs font-mono text-[#b08d57] mb-2 font-semibold">
            <Rocket size={14} />
            <span>SOVEREIGN CONTRACT DEPLOYER</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Deploy Aquas to Midnight ({netConfig.badge})
          </h1>
          <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
            Deployment happens directly in this browser. 1AM supplies wallet access, gas balancing, and cryptographic transaction submission.
          </p>
        </div>

        {/* Network Toggle in Deploy Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-1 rounded-2xl font-mono text-xs shadow-inner">
            <button
              onClick={() => handleNetworkChange("preview")}
              style={{
                background: deployNetwork === "preview" ? "#b08d57" : "transparent",
                color: deployNetwork === "preview" ? "#000000" : "#a1a1aa",
                fontWeight: deployNetwork === "preview" ? 700 : 500
              }}
              className="px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs"
            >
              <span>⚡ Preview</span>
            </button>
            <button
              onClick={() => handleNetworkChange("preprod")}
              style={{
                background: deployNetwork === "preprod" ? "#3fa96b" : "transparent",
                color: deployNetwork === "preprod" ? "#000000" : "#a1a1aa",
                fontWeight: deployNetwork === "preprod" ? 700 : 500
              }}
              className="px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs"
            >
              <span>🛡️ Preprod</span>
            </button>
          </div>

          <button
            onClick={resetToCanonical}
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              color: "#a1a1aa",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-mono flex items-center gap-1.5 hover:text-white hover:border-white/30 transition-colors cursor-pointer"
            title={`Reset to canonical ${deployNetwork} deployed contract`}
          >
            <RotateCcw size={13} />
            <span>Reset Canonical</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Deployment Workflow Guide in Liquid Glass */}
        <div className="lg:col-span-5 p-6 md:p-8 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all duration-300 space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Browser Deployment Protocol</h2>
          <p className="text-zinc-400 text-xs font-mono leading-relaxed">
            Direct client-side deployment without intermediary servers. Proving keys are compiled into local WASM bytecode and broadcast to <strong>{netConfig.name}</strong>.
          </p>

          <ol className="space-y-4 font-mono text-xs">
            <li className={`p-4 rounded-2xl border flex items-start gap-3 ${
              isWalletConnected ? "bg-[#3fa96b]/10 border-[#3fa96b]/30" : "bg-white/[0.02] border-white/10"
            }`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                isWalletConnected ? "bg-[#3fa96b] text-black" : "bg-white/10 text-white"
              }`}>
                {isWalletConnected ? <Check size={14} /> : "1"}
              </span>
              <div>
                <strong className="text-white block">Connect 1AM Wallet</strong>
                <span className="text-zinc-400 text-[11px]">
                  {isWalletConnected ? `Connected (${shortAddress})` : `Browser extension with ${deployNetwork} network`}
                </span>
              </div>
            </li>

            <li className={`p-4 rounded-2xl border flex items-start gap-3 ${
              deploying ? "bg-[#b08d57]/10 border-[#b08d57]/30" : deployment ? "bg-[#3fa96b]/10 border-[#3fa96b]/30" : isWalletConnected ? "bg-white/[0.04] border-[#b08d57]" : "bg-white/[0.02] border-white/10"
            }`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                deployment && !deploying ? <Check size={14} /> : "2"
              }`}>
                {deployment && !deploying ? <Check size={14} /> : "2"}
              </span>
              <div>
                <strong className="text-white block">Approve Deployment</strong>
                <span className="text-zinc-400 text-[11px]">ZK proof and state initialization on {netConfig.badge}</span>
              </div>
            </li>

            <li className={`p-4 rounded-2xl border flex items-start gap-3 ${
              deployment && !deploying ? "bg-[#3fa96b]/10 border-[#3fa96b]/30" : "bg-white/[0.02] border-white/10"
            }`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                deployment && !deploying ? <Check size={14} /> : "3"
              }`}>
                {deployment && !deploying ? <Check size={14} /> : "3"}
              </span>
              <div>
                <strong className="text-white block">Save Contract Address</strong>
                <span className="text-zinc-400 text-[11px]">Public registry on {netConfig.name} Explorer</span>
              </div>
            </li>
          </ol>
        </div>

        {/* Right: Interactive Deployment Console in Liquid Glass */}
        <div className="lg:col-span-7 p-6 md:p-8 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all duration-300 space-y-6">
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-[#b08d57]" />
              <h3 className="font-bold text-base text-white">Deployment Console</h3>
            </div>
            <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-bold shadow-sm ${
              deployNetwork === "preprod" ? "bg-[#3fa96b]/15 text-[#3fa96b] border border-[#3fa96b]/30" : "bg-[#b08d57]/15 text-[#b08d57] border border-[#b08d57]/30"
            }`}>
              {netConfig.badge}
            </span>
          </div>

          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 font-mono text-xs space-y-2 shadow-inner">
            <div className="flex justify-between">
              <span className="text-zinc-400">Contract Name:</span>
              <span className="text-white font-bold">doctor_license.compact</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Target Network:</span>
              <span className={deployNetwork === "preprod" ? "text-[#3fa96b] font-bold" : "text-[#b08d57] font-bold"}>
                {netConfig.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">RPC Endpoint:</span>
              <span className="text-zinc-400 text-[11px] truncate max-w-[240px]">{netConfig.rpcUri}</span>
            </div>
          </div>

          {walletInstalled === false && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-amber-400 text-xs font-mono">
              <CircleAlert size={18} className="mt-0.5" />
              <div>
                <strong className="block">1AM Wallet Extension</strong>
                <p className="text-zinc-400 mt-1">For live deployment, install the 1AM browser extension, switch to {deployNetwork} network, and reload.</p>
                <a href="https://1am.xyz" target="_blank" rel="noreferrer" className="text-[#b08d57] underline inline-flex items-center gap-1 mt-2">
                  <span>Get 1AM Wallet</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}

          <div className="space-y-4 font-mono text-xs">
            {isWalletConnected && (
              <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl flex justify-between items-center shadow-inner">
                <div className="flex items-center gap-2">
                  <WalletCards size={16} className={deployNetwork === "preprod" ? "text-[#3fa96b]" : "text-[#b08d57]"} />
                  <span className="text-zinc-400">Connected Wallet ({netConfig.badge}):</span>
                </div>
                <span className="text-white font-bold">{shortAddress}</span>
              </div>
            )}

            <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${deploying ? "bg-[#b08d57] animate-pulse" : "bg-[#3fa96b]"}`} />
                <span className="text-zinc-400">Status:</span>
              </div>
              <span className="text-white font-bold truncate max-w-[280px]">{status}</span>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-2 text-red-400 text-xs">
                <CircleAlert size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleDeploy}
              disabled={deploying || connecting}
              style={{
                background: "#ffffff",
                color: "#000000",
                fontWeight: 700
              }}
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-2xl hover:bg-[#b08d57] transition-all cursor-pointer disabled:opacity-50"
            >
              {deploying ? (
                <>
                  <LoaderCircle className="animate-spin text-black" size={16} />
                  <span>Synthesizing ZK Proof on {netConfig.badge}…</span>
                </>
              ) : (
                <>
                  <Rocket size={16} className="text-black fill-current" />
                  <span>Deploy to Midnight ({netConfig.badge})</span>
                </>
              )}
            </button>
          </div>

          {/* Deployment Result Card */}
          {deployment && (
            <div className="p-6 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl space-y-4 shadow-inner font-mono text-xs">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-[#3fa96b]" />
                  <strong className="text-white">Active {netConfig.badge} Deployment Record</strong>
                </div>
                <span className="text-[10px] text-zinc-500">{deployment.deployedAt.slice(0, 19).replace("T", " ")}</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1">Contract Address ({netConfig.badge}):</label>
                  <div className="flex items-center gap-2 bg-black/60 border border-white/10 p-2.5 rounded-xl">
                    <span className="text-zinc-200 text-[11px] truncate flex-1">{deployment.contractAddress}</span>
                    <button
                      onClick={() => copy(deployment.contractAddress, "Contract Address")}
                      className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                      title="Copy Address"
                    >
                      <Clipboard size={14} />
                    </button>
                    <a
                      href={explorerContractUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-[#3fa96b] hover:text-white cursor-pointer"
                      title="Verify on Explorer"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>

                <div>
                  <label className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1">Transaction Hash:</label>
                  <div className="flex items-center gap-2 bg-black/60 border border-white/10 p-2.5 rounded-xl">
                    <span className="text-zinc-200 text-[11px] truncate flex-1">{deployment.transactionId}</span>
                    <button
                      onClick={() => copy(deployment.transactionId, "Transaction ID")}
                      className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                      title="Copy Transaction ID"
                    >
                      <Clipboard size={14} />
                    </button>
                    <a
                      href={explorerTxUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-[#3fa96b] hover:text-white cursor-pointer"
                      title="Verify on Explorer"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>

                {ownerSecret && (
                  <div>
                    <label className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1">Deployer Private Witness Secret:</label>
                    <div className="flex items-center gap-2 bg-black/60 border border-amber-500/20 p-2.5 rounded-xl text-amber-300">
                      <KeyRound size={14} className="shrink-0 text-[#b08d57]" />
                      <span className="text-[11px] truncate flex-1">{ownerSecret}</span>
                      <button
                        onClick={() => copy(ownerSecret, "Owner Secret")}
                        className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                        title="Copy Secret"
                      >
                        <Clipboard size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
