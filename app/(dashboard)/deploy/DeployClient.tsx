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

const DEPLOYMENT_STORAGE_KEY = "aquas:deployment:preview";

type DeploymentRecord = {
  contractAddress: string;
  transactionId: string;
  deployedAt: string;
};

export default function DeployClient() {
  const [walletInstalled, setWalletInstalled] = useState<boolean | null>(null);
  const [session, setSession] = useState<BrowserSession | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [status, setStatus] = useState("Waiting for 1AM wallet");
  const [error, setError] = useState("");
  const [deployment, setDeployment] = useState<DeploymentRecord | null>(null);
  const [ownerSecret, setOwnerSecret] = useState("");
  const mounted = useRef(true);

  useEffect(() => {
    const saved = window.localStorage.getItem(DEPLOYMENT_STORAGE_KEY);
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDeployment(JSON.parse(saved) as DeploymentRecord);
      } catch {
        window.localStorage.removeItem(DEPLOYMENT_STORAGE_KEY);
      }
    }
    void detectOneAmWallet().then((wallet) => {
      if (mounted.current) setWalletInstalled(wallet !== null);
    });
    return () => { mounted.current = false; };
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError("");
    setStatus("Opening 1AM on preview…");
    try {
      const connected = await connectOneAmPreview("/zk/doctor_license/");
      if (!mounted.current) return;
      setSession(connected);
      setStatus("1AM connected. Ready to deploy.");
    } catch (reason) {
      if (!mounted.current) return;
      setError(reason instanceof Error ? reason.message : "Wallet connection failed.");
      setStatus("Wallet connection failed");
    } finally {
      if (mounted.current) setConnecting(false);
    }
  }, []);

  const deploy = useCallback(async () => {
    if (!session) return;
    setDeploying(true);
    setError("");
    setOwnerSecret("");
    setStatus("Building deployment transaction in browser…");

    try {
      const secret = crypto.getRandomValues(new Uint8Array(32));
      setStatus("Generating proof through local proof server…");
      const result = await deployDoctorLicense(session, secret);
      if (!mounted.current) return;

      const record: DeploymentRecord = {
        ...result,
        deployedAt: new Date().toISOString(),
      };
      setDeployment(record);
      setOwnerSecret(toHex(secret));
      window.localStorage.setItem(DEPLOYMENT_STORAGE_KEY, JSON.stringify(record));
      setStatus("Transaction submitted. Waiting for preview indexer…");

      try {
        await pollForContract(
          session.config.indexerUri,
          result.contractAddress,
          (attempt) => {
            if (mounted.current) setStatus(`Waiting for preview indexer — attempt ${attempt}`);
          },
        );
        if (mounted.current) setStatus("Contract deployed and indexed on preview.");
      } catch (reason) {
        if (mounted.current) {
          setError(reason instanceof Error ? reason.message : "Indexer confirmation timed out.");
          setStatus("Transaction submitted; indexer confirmation pending.");
        }
      }
    } catch (reason) {
      if (!mounted.current) {
        setError(reason instanceof Error ? reason.message : "Deployment failed.");
        setStatus("Deployment failed");
      }
    } finally {
      if (mounted.current) setDeploying(false);
    }
  }, [session]);

  function copy(value: string) {
    void navigator.clipboard.writeText(value);
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 font-sans pb-16">
      {/* Page Header */}
      <div className="border-b border-white/10 pb-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Deployment Workflow Guide */}
        <div className="lg:col-span-5 p-6 md:p-8 bg-black/50 border border-white/10 rounded-3xl space-y-6">
          <h2 className="text-xl font-bold text-white">Browser Deployment Protocol</h2>
          <p className="text-zinc-400 text-xs font-mono leading-relaxed">
            Direct client-side deployment without intermediary servers. The smart contract and proving keys are compiled into local WASM bytecode.
          </p>

          <ol className="space-y-4 font-mono text-xs">
            <li className={`p-4 rounded-2xl border flex items-start gap-3 ${
              session ? "bg-[#3fa96b]/10 border-[#3fa96b]/30" : "bg-white/[0.02] border-white/10"
            }`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                session ? "bg-[#3fa96b] text-black" : "bg-white/10 text-white"
              }`}>
                {session ? <Check size={14} /> : "1"}
              </span>
              <div>
                <strong className="text-white block">Connect 1AM Wallet</strong>
                <span className="text-zinc-400 text-[11px]">Explicit Midnight preview session</span>
              </div>
            </li>

            <li className={`p-4 rounded-2xl border flex items-start gap-3 ${
              deployment ? "bg-[#3fa96b]/10 border-[#3fa96b]/30" : session ? "bg-white/[0.04] border-[#b08d57]" : "bg-white/[0.02] border-white/10"
            }`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                deployment ? "bg-[#3fa96b] text-black" : "bg-white/10 text-white"
              }`}>
                {deployment ? <Check size={14} /> : "2"}
              </span>
              <div>
                <strong className="text-white block">Approve Deployment</strong>
                <span className="text-zinc-400 text-[11px]">ZK proof and state initialization</span>
              </div>
            </li>

            <li className={`p-4 rounded-2xl border flex items-start gap-3 ${
              deployment ? "bg-[#3fa96b]/10 border-[#3fa96b]/30" : "bg-white/[0.02] border-white/10"
            }`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                deployment ? "bg-[#3fa96b] text-black" : "bg-white/10 text-white"
              }`}>
                {deployment ? <Check size={14} /> : "3"}
              </span>
              <div>
                <strong className="text-white block">Save Contract Address</strong>
                <span className="text-zinc-400 text-[11px]">Public registry on Midnight Indexer</span>
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
                <strong className="block">1AM Wallet Required</strong>
                <p className="text-zinc-400 mt-1">Install the 1AM browser extension, switch to preview network, and reload.</p>
                <a href="https://1am.xyz" target="_blank" rel="noreferrer" className="text-[#b08d57] underline inline-flex items-center gap-1 mt-2">
                  <span>Get 1AM Wallet</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}

          {!session ? (
            <button
              onClick={connect}
              disabled={connecting}
              style={{
                background: "#ffffff",
                color: "#000000",
                fontWeight: 700
              }}
              className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-[#b08d57] transition-colors cursor-pointer disabled:opacity-50"
            >
              {connecting ? <LoaderCircle className="animate-spin text-black" size={18} /> : <WalletCards size={18} />}
              <span>{connecting ? "Connecting 1AM…" : "Connect 1AM Wallet to Deploy"}</span>
            </button>
          ) : (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl flex justify-between items-center">
                <span className="text-zinc-400">Connected Wallet:</span>
                <span className="text-[#3fa96b]">{session.unshieldedAddress}</span>
              </div>

              {!deploying && (
                <button
                  onClick={deploy}
                  style={{
                    background: "#ffffff",
                    color: "#000000",
                    fontWeight: 700
                  }}
                  className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-xl hover:bg-[#b08d57] transition-colors cursor-pointer"
                >
                  <Rocket size={18} className="text-black" />
                  <span>{deployment ? "Deploy Another Contract" : "Deploy Aquas Compact Contract"}</span>
                </button>
              )}

              {deploying && (
                <div className="p-4 bg-[#b08d57]/10 border border-[#b08d57]/30 rounded-2xl flex items-center gap-3 text-[#b08d57]">
                  <LoaderCircle className="animate-spin" size={20} />
                  <div>
                    <strong className="block">Building &amp; Proving on Midnight…</strong>
                    <span className="text-xs text-zinc-300">{status}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-mono">
              <CircleAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          {deployment && (
            <div className="p-6 bg-[#3fa96b]/10 border border-[#3fa96b]/30 rounded-2xl space-y-4 font-mono text-xs">
              <div className="flex items-center gap-2 text-[#3fa96b]">
                <Check size={18} />
                <strong className="text-sm">DEPLOYMENT CONFIRMED ON MIDNIGHT</strong>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Contract Address:</label>
                <div className="p-2.5 bg-black/60 border border-white/10 rounded-lg flex justify-between items-center">
                  <code className="text-[#3fa96b] truncate">{deployment.contractAddress}</code>
                  <button onClick={() => copy(deployment.contractAddress)} className="text-zinc-400 hover:text-white cursor-pointer ml-2">
                    <Clipboard size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Transaction ID:</label>
                <div className="p-2.5 bg-black/60 border border-white/10 rounded-lg flex justify-between items-center">
                  <code className="text-zinc-300 truncate">{deployment.transactionId}</code>
                  <button onClick={() => copy(deployment.transactionId)} className="text-zinc-400 hover:text-white cursor-pointer ml-2">
                    <Clipboard size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {ownerSecret && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2 font-mono text-xs text-amber-400">
              <div className="flex items-center gap-2">
                <KeyRound size={16} />
                <strong>Save Board Master Secret:</strong>
              </div>
              <p className="text-zinc-400 text-[11px]">Required for state board administration. Generated in browser and never sent to servers.</p>
              <div className="p-2 bg-black/60 border border-white/10 rounded-lg flex justify-between items-center">
                <code className="text-[#b08d57] truncate">{ownerSecret}</code>
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
