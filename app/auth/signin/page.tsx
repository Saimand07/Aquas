"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Loader2,
  AlertCircle,
  Sparkles,
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Zap
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { type MidnightNetwork, getNetworkConfig } from "@/lib/midnight-browser";

export default function SignInPage() {
  const router = useRouter();
  const {
    isAuthenticated,
    currentNetwork,
    switchNetwork,
    connectWallet,
    signInCredentials,
    signInSandbox,
    isConnecting,
    error: authError
  } = useAuth();

  const [authMode, setAuthMode] = useState<"wallet" | "credentials">("wallet");
  const [selectedNetwork, setSelectedNetwork] = useState<MidnightNetwork>(currentNetwork || "preview");
  const [email, setEmail] = useState("admin@ny-medicalboard.gov");
  const [password, setPassword] = useState("aquas2026");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleNetworkSelect = (net: MidnightNetwork) => {
    setSelectedNetwork(net);
    switchNetwork(net);
    setLocalError(null);
  };

  const handleWalletConnect = async () => {
    setLocalError(null);
    const success = await connectWallet(selectedNetwork);
    if (success) {
      router.push("/dashboard");
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const success = await signInCredentials(email.trim(), password);
    if (success) {
      router.push("/dashboard");
    }
  };

  const handleSandboxAccess = () => {
    setLocalError(null);
    signInSandbox();
    router.push("/dashboard");
  };

  const displayError = localError || authError;
  const netConfig = getNetworkConfig(selectedNetwork);

  return (
    <div className="relative min-h-screen bg-[#03040a] text-white flex overflow-hidden justify-center items-center p-6 selection:bg-[#b08d57] selection:text-black font-sans">
      {/* Ambient Glowing Light Orbs */}
      <div className="fixed -top-32 left-1/4 w-[650px] h-[650px] bg-gradient-to-br from-[#b08d57]/15 via-[#3fa96b]/10 to-transparent rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed -bottom-20 right-1/4 w-[550px] h-[550px] bg-gradient-to-tl from-[#101010]/30 via-[#b08d57]/10 to-transparent rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Centered Connect Form */}
      <div className="w-full max-w-md z-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full"
        >
          {/* Logo Header */}
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/15 flex items-center justify-center mb-3 shadow-2xl backdrop-blur-xl">
              <ShieldCheck className="w-8 h-8 text-[#3fa96b]" />
            </div>
            <h1 className="text-2xl font-bold tracking-[0.2em] text-white uppercase">
              <span className="text-[#b08d57]">/</span> AQUAS
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-1">Zero-Knowledge Medical Licensure Gateway</p>
          </div>

          {/* Form Card */}
          <div className="bg-black/60 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl space-y-6">
            {/* Network Selector Pill in Sign-in */}
            <div className="space-y-1.5 font-mono text-xs">
              <span className="text-[10px] uppercase text-zinc-400 font-bold tracking-wider block">
                Select Midnight Network
              </span>
              <div className="grid grid-cols-2 gap-2 p-1 bg-white/[0.03] rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => handleNetworkSelect("preview")}
                  style={{
                    background: selectedNetwork === "preview" ? "#b08d57" : "transparent",
                    color: selectedNetwork === "preview" ? "#000000" : "#a1a1aa",
                    fontWeight: selectedNetwork === "preview" ? 700 : 500
                  }}
                  className="py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs"
                >
                  <span>⚡ Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNetworkSelect("preprod")}
                  style={{
                    background: selectedNetwork === "preprod" ? "#3fa96b" : "transparent",
                    color: selectedNetwork === "preprod" ? "#000000" : "#a1a1aa",
                    fontWeight: selectedNetwork === "preprod" ? 700 : 500
                  }}
                  className="py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs"
                >
                  <span>🛡️ Preprod</span>
                </button>
              </div>
            </div>

            {/* Auth Mode Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/10 font-mono text-xs">
              <button
                type="button"
                onClick={() => { setAuthMode("wallet"); setLocalError(null); }}
                style={{
                  background: authMode === "wallet" ? "rgba(255, 255, 255, 0.1)" : "transparent",
                  color: authMode === "wallet" ? "#ffffff" : "#a1a1aa",
                  fontWeight: authMode === "wallet" ? 700 : 500
                }}
                className="py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>1AM Wallet</span>
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("credentials"); setLocalError(null); }}
                style={{
                  background: authMode === "credentials" ? "rgba(255, 255, 255, 0.1)" : "transparent",
                  color: authMode === "credentials" ? "#ffffff" : "#a1a1aa",
                  fontWeight: authMode === "credentials" ? 700 : 500
                }}
                className="py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Credentials</span>
              </button>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {displayError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-400 text-xs flex items-center gap-2 font-mono bg-red-500/10 border border-red-500/20 p-3 rounded-xl"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{displayError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Wallet Mode Form */}
            {authMode === "wallet" && (
              <div className="space-y-5">
                <div className="text-center">
                  <h2 className="text-base font-bold text-white">Midnight Shielded Access</h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Connect your cryptographic physician identity via 1AM Browser Extension.
                  </p>
                </div>

                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 font-mono text-xs space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-400">Target Ledger:</span>
                    <span className="text-[#3fa96b] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3fa96b] inline-block animate-pulse" />
                      {netConfig.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-400">Prover Core:</span>
                    <span className="text-zinc-200">1AM Proofstation + Zero Gas</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-400">Explorer:</span>
                    <span className="text-zinc-400 truncate max-w-[200px]">{netConfig.explorerBaseUrl}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleWalletConnect}
                  disabled={isConnecting}
                  style={{
                    background: "#ffffff",
                    color: "#000000",
                    fontWeight: 700
                  }}
                  className="w-full py-4 rounded-2xl flex justify-center items-center gap-2 text-sm shadow-xl hover:bg-[#b08d57] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Connecting 1AM on {netConfig.badge}...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-black fill-current" />
                      <span>Connect 1AM Wallet ({netConfig.badge})</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Credentials Mode Form */}
            {authMode === "credentials" && (
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                <div className="text-center mb-2">
                  <h2 className="text-base font-bold text-white">Medical Board Access</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Sign in with your state licensing board or hospital credential.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block">Board Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#b08d57]/50 transition-colors"
                      placeholder="admin@medicalboard.gov"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block">Authority Key / Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-[#b08d57]/50 transition-colors"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isConnecting}
                  style={{
                    background: "#ffffff",
                    color: "#000000",
                    fontWeight: 700
                  }}
                  className="w-full py-4 rounded-2xl flex justify-center items-center gap-2 text-sm shadow-xl hover:bg-[#b08d57] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Authenticating Authority...</span>
                    </>
                  ) : (
                    <>
                      <span>Authorize Session ({netConfig.badge})</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Sandbox Quick Access */}
            <div className="pt-2 border-t border-white/10 text-center">
              <button
                type="button"
                onClick={handleSandboxAccess}
                className="text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Zap size={12} className="text-[#b08d57]" />
                <span>Explore Sandbox ({netConfig.badge})</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
