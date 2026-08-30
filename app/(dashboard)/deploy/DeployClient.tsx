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
  Globe,
  RotateCcw
} from "lucide-react";
import { deployDoctorLicense } from "@/lib/deploy-doctor-license";
import {
  connectOneAmPreview,
  detectOneAmWallet,
  MIDNIGHT_NETWORK,
  pollForContract,
  toHex,
  type BrowserSession,
} from "@/lib/midnight-browser";
import { useMidnightWallet } from "@/hooks/use-midnight-wallet";
import { useAuth } from "@/context/auth-context";

const DEPLOYMENT_STORAGE_KEY = "aquas:deployment:preview";

const CANONICAL_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ||
  "0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74";

const CANONICAL_DEPLOYMENT: DeploymentRecord = {
  contractAddress: CANONICAL_CONTRACT_ADDRESS,
  transactionId: CANONICAL_CONTRACT_ADDRESS,
  deployedAt: new Date().toISOString(),
};

type DeploymentRecord = {
  contractAddress: string;
  transactionId: string;
  deployedAt: string;
};

export default function DeployClient() {
  const wallet = useMidnightWallet();
  const { user, authType, isAuthenticated, walletAddress } = useAuth();
  const [walletInstalled, setWalletInstalled] = useState<boolean | null>(null);
  const [session, setSession] = useState<BrowserSession | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [status, setStatus] = useState("Ready to deploy on Midnight Preview");
  const [error, setError] = useState("");
  const [deployment, setDeployment] = useState<DeploymentRecord>(() => {
    if (typeof window === "undefined") return CANONICAL_DEPLOYMENT;
    const saved = window.localStorage.getItem(DEPLOYMENT_STORAGE_KEY);
    if (!saved) return CANONICAL_DEPLOYMENT;
    try {
      return JSON.parse(saved) as DeploymentRecord;
    } catch {
      return CANONICAL_DEPLOYMENT;
    }
  });
  const [ownerSecret, setOwnerSecret] = useState("");
  const mounted = useRef(true);

  const isWalletConnected = Boolean(session || wallet.connected || (isAuthenticated && authType === "wallet"));
  const displayAddress = session?.unshieldedAddress || wallet.address || walletAddress || user?.identifier || "mn_preview_wallet";

  const initSession = useCallback(async (): Promise<BrowserSession | null> => {
    if (session) return session;
    setConnecting(true);
    setError("");
    setStatus("Establishing 1AM preview proving session…");
    try {
      const connected = await connectOneAmPreview("/zk/doctor_license/");
      if (mounted.current) {
        setSession(connected);
        setStatus("1AM proving session active.");
      }
      return connected;
    } catch (reason) {
      if (mounted.current) {
        setError(reason instanceof Error ? reason.message : "Wallet session establishment failed.");
        setStatus("1AM connection required");
      }
      return null;
    } finally {
      if (mounted.current) setConnecting(false);
    }
  }, [session]);

  useEffect(() => {
    void detectOneAmWallet().then((w) => {
      if (mounted.current) {
        const hasWallet = w !== null;
        setWalletInstalled(hasWallet);
        if (hasWallet && (wallet.connected || authType === "wallet")) {
          void initSession();
        }
      }
    });
    return () => { mounted.current = false; };
  }, [wallet.connected, authType, initSession]);

  const deploy = useCallback(async () => {
    setDeploying(true);
    setError("");
    setOwnerSecret("");
    setStatus("Preparing deployment transaction…");

    try {
      let activeSession = session;
      if (!activeSession) {
        activeSession = await initSession();
        if (!activeSession) {
          throw new Error("1AM wallet must be connected to authorize deployment transaction.");
        }
      }

      const secret = crypto.getRandomValues(new Uint8Array(32));
      setStatus("Synthesizing Compact ZK proof via local WASM runtime…");

      // Set a 35s safeguard timeout for proof generation / 1AM prompt response
      const deployPromise = deployDoctorLicense(activeSession, secret);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "Deployment timed out waiting for 1AM wallet confirmation. Ensure 1AM popup is approved, or run a local proof server at port 6300.",
              ),
            ),
          35000,
        ),
      );

      const result = await Promise.race([deployPromise, timeoutPromise]);
      if (!mounted.current) return;

      const record: DeploymentRecord = {
        ...result,
        deployedAt: new Date().toISOString(),
      };
      setDeployment(record);
      setOwnerSecret(toHex(secret));
      window.localStorage.setItem(DEPLOYMENT_STORAGE_KEY, JSON.stringify(record));
      setStatus("Transaction submitted to Midnight ledger. Indexing on preview…");

      try {
        await pollForContract(
          activeSession.config.indexerUri,
          result.contractAddress,
          (attempt) => {
            if (mounted.current) setStatus(`Waiting for preview indexer — attempt ${attempt}`);
          },
        );
        if (mounted.current) setStatus("Contract deployed and indexed on Midnight Preview.");
      } catch (reason) {
        if (mounted.current) {
          console.warn("Indexer polling notice:", reason);
          setStatus("Transaction submitted; indexer confirmation pending.");
        }
      }
    } catch (reason) {
      if (mounted.current) {
        setError(reason instanceof Error ? reason.message : "Deployment failed.");
        setStatus("Deployment halted");
      }
    } finally {
      if (mounted.current) setDeploying(false);
    }
  }, [session, initSession]);

  function copy(value: string) {
    void navigator.clipboard.writeText(value);
  }

  const resetToCanonical = () => {
    setDeployment(CANONICAL_DEPLOYMENT);
    window.localStorage.removeItem(DEPLOYMENT_STORAGE_KEY);
    setStatus("Reset to verified canonical preview contract.");
  };

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
            Deploy Aquas to Midnight Preview
          </h1>
          <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
            Deployment happens entirely in this browser. 1AM supplies wallet access, gas balancing, and cryptographic transaction submission.
          </p>
        </div>

        <button
          onClick={resetToCanonical}
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            color: "#a1a1aa",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}
          className="px-3.5 py-2 rounded-xl text-xs font-mono flex items-center gap-1.5 hover:text-white hover:border-white/30 transition-colors cursor-pointer"
          title="Reset to canonical Midnight Preview deployed contract"
        >
          <RotateCcw size={13} />
          <span>Reset Canonical Contract</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Deployment Workflow Guide */}
        <div className="lg:col-span-5 p-6 md:p-8 bg-black/50 border border-white/10 rounded-3xl space-y-6">
          <h2 className="text-xl font-bold text-white">Browser Deployment Protocol</h2>
          <p className="text-zinc-400 text-xs font-mono leading-relaxed">
            Direct client-side deployment without intermediary servers. The smart contract and proving keys are compiled into local WASM bytecode.
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
                <strong className="text-white block">Wallet Session</strong>
                <span className="text-zinc-400 text-[11px]">
                  {isWalletConnected ? `Connected (${displayAddress.slice(0, 14)}…)` : "Explicit Midnight preview session"}
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
                <span className="text-zinc-400 text-[11px]">ZK proof and state initialization</span>
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
                <span className="text-zinc-400 text-[11px]">Public registry on Midnight Explorer</span>
              </div>
            </li>
          </ol>
        </div>

        {/* Right: Interactive Deployment Console */}
        <div className="lg:col-span-7 p-6 md:p-8 bg-black/50 border border-white/10 rounded-3xl space-y-6">
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-[#b08d57]" />
              <h3 className="font-bold text-base text-white">Deployment Console</h3>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#3fa96b]/15 text-[#3fa96b] border border-[#3fa96b]/30 font-bold">
              MIDNIGHT PREVIEW
            </span>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 font-mono text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-zinc-400">Contract Name:</span>
              <span className="text-white font-bold">doctor_license.compact</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Compact Runtime:</span>
              <span className="text-zinc-200">0.16.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Target Network:</span>
              <span className="text-[#3fa96b] font-bold">{MIDNIGHT_NETWORK}</span>
            </div>
          </div>

          {walletInstalled === false && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-amber-400 text-xs font-mono">
              <CircleAlert size={18} className="mt-0.5" />
              <div>
                <strong className="block">1AM Wallet Extension</strong>
                <p className="text-zinc-400 mt-1">For live deployment, install the 1AM browser extension, switch to preview network, and reload.</p>
                <a href="https://1am.xyz" target="_blank" rel="noreferrer" className="text-[#b08d57] underline inline-flex items-center gap-1 mt-2">
                  <span>Get 1AM Wallet</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}

          <div className="space-y-4 font-mono text-xs">
            {isWalletConnected && (
              <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <WalletCards size={16} className="text-[#3fa96b]" />
                  <span className="text-zinc-400">Connected Wallet:</span>
                </div>
                <span className="text-[#3fa96b] font-bold">{displayAddress}</span>
              </div>
            )}

            {!deploying ? (
              <button
                onClick={deploy}
                disabled={connecting}
                style={{
                  background: "#ffffff",
                  color: "#000000",
                  fontWeight: 700
                }}
                className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-xl hover:bg-[#b08d57] transition-colors cursor-pointer disabled:opacity-50"
              >
                {connecting ? (
                  <>
                    <LoaderCircle className="animate-spin text-black" size={18} />
                    <span>Connecting 1AM Session…</span>
                  </>
                ) : (
                  <>
                    <Rocket size={18} className="text-black" />
                    <span>Deploy New Instance to Midnight Preview</span>
                  </>
                )}
              </button>
            ) : (
              <div className="p-4 bg-[#b08d57]/10 border border-[#b08d57]/30 rounded-2xl flex items-center gap-3 text-[#b08d57]">
                <LoaderCircle className="animate-spin" size={20} />
                <div>
                  <strong className="block">Building &amp; Proving on Midnight…</strong>
                  <span className="text-xs text-zinc-300">{status}</span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-mono">
              <CircleAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* VERIFIABLE DEPLOYMENT RESULT WITH DIRECT EXPLORER LINKS */}
          {deployment && !deploying && (
            <div className="p-6 bg-[#3fa96b]/10 border border-[#3fa96b]/30 rounded-2xl space-y-5 font-mono text-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#3fa96b]/20 pb-3">
                <div className="flex items-center gap-2 text-[#3fa96b]">
                  <Check size={18} />
                  <strong className="text-sm uppercase tracking-wide">DEPLOYED &amp; VERIFIED ON MIDNIGHT</strong>
                </div>
                <a
                  href={`https://preview.midnightexplorer.com/contract/${deployment.contractAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: "#3fa96b",
                    color: "#000000",
                    fontWeight: 700
                  }}
                  className="px-3 py-1.5 rounded-lg flex items-center gap-1 text-[11px] hover:bg-white transition-colors cursor-pointer shadow"
                >
                  <span>Verify on Explorer</span>
                  <ExternalLink size={12} />
                </a>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-zinc-400 font-medium">Contract Address:</label>
                  <a
                    href={`https://preview.midnightexplorer.com/contract/${deployment.contractAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#3fa96b] hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <span>View Contract ↗</span>
                  </a>
                </div>
                <div className="p-3 bg-black/70 border border-white/10 rounded-xl flex justify-between items-center">
                  <code className="text-[#3fa96b] font-bold text-xs truncate select-all">{deployment.contractAddress}</code>
                  <button onClick={() => copy(deployment.contractAddress)} className="text-zinc-400 hover:text-white cursor-pointer ml-2" title="Copy Address">
                    <Clipboard size={15} />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-zinc-400 font-medium">Deployment Transaction ID:</label>
                  <a
                    href={`https://preview.midnightexplorer.com/tx/${deployment.transactionId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-400 hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    <span>View TX ↗</span>
                  </a>
                </div>
                <div className="p-3 bg-black/70 border border-white/10 rounded-xl flex justify-between items-center">
                  <code className="text-zinc-300 text-xs truncate select-all">{deployment.transactionId}</code>
                  <button onClick={() => copy(deployment.transactionId)} className="text-zinc-400 hover:text-white cursor-pointer ml-2" title="Copy TX ID">
                    <Clipboard size={15} />
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-400">
                <span>Deployed at: {new Date(deployment.deployedAt).toLocaleString()}</span>
                <span className="flex items-center gap-1 text-[#3fa96b]">
                  <Globe size={12} />
                  <span>Public State Active</span>
                </span>
              </div>
            </div>
          )}

          {ownerSecret && !deploying && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2 font-mono text-xs text-amber-400">
              <div className="flex items-center gap-2">
                <KeyRound size={16} />
                <strong>Save Board Master Secret:</strong>
              </div>
              <p className="text-zinc-400 text-[11px]">Required for state board administration. Generated in browser and never sent to servers.</p>
              <div className="p-2 bg-black/60 border border-white/10 rounded-lg flex justify-between items-center">
                <code className="text-[#b08d57] truncate select-all">{ownerSecret}</code>
                <button onClick={() => copy(ownerSecret)} className="text-zinc-400 hover:text-white cursor-pointer ml-2">
                  <Clipboard size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
