"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  Loader2, 
  AlertCircle, 
  Sparkles, 
  Mail, 
  Lock, 
  ArrowRight, 
  KeyRound, 
  Eye, 
  EyeOff,
  Zap
} from "lucide-react";
import { useMidnightWallet } from "@/hooks/use-midnight-wallet";

export default function SignInPage() {
  const router = useRouter();
  const wallet = useMidnightWallet();

  const [authMode, setAuthMode] = useState<"wallet" | "credentials">("wallet");
  const [email, setEmail] = useState("admin@hospital.org");
  const [password, setPassword] = useState("aquas2026");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated via wallet, redirect to dashboard
  useEffect(() => {
    if (wallet.connected) {
      router.push("/dashboard");
    }
  }, [wallet.connected, router]);

  const handleWalletConnect = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await wallet.connect();
    } catch (err: any) {
      setError(err.message || "Failed to connect 1AM wallet. Ensure 1AM is installed and unlocked.");
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (wallet.error) {
      setError(wallet.error);
      setIsSubmitting(false);
    }
  }, [wallet.error]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    // Simulate authentication
    setTimeout(() => {
      setIsSubmitting(false);
      // For Aquas, true authentication relies on wallet for ZK ops
      setError("Credentials mode is disabled. All operations require a Midnight wallet for Zero-Knowledge proofs.");
    }, 1500);
  };

  return (
    <div className="relative min-h-screen bg-[#03040a] text-white flex overflow-hidden justify-center items-center p-6">
      {/* Background elements */}
      <div className="fixed -top-32 left-1/4 w-[650px] h-[650px] bg-gradient-to-br from-[#b08d57]/20 via-[#3fa96b]/15 to-transparent rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed -bottom-20 right-1/4 w-[550px] h-[550px] bg-gradient-to-tl from-[#101010]/20 via-[#b08d57]/15 to-transparent rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(176,141,87,0.1),rgba(15,15,15,0.4)_55%,rgba(3,4,10,0.85)_100%)]" />

      {/* Centered Connect Form */}
      <div className="w-full max-w-md z-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full"
        >
          {/* Logo Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-2xl border border-white/10" style={{ background: "var(--paper-raised)" }}>
              <ShieldCheck className="w-8 h-8" style={{ color: "var(--verified-mint)" }} />
            </div>
            <h1 className="text-2xl font-bold tracking-[0.2em] text-white">
              <span style={{ color: "var(--seal-brass)" }}>/</span> AQUAS
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-1">Sovereign Medical Credential Registry</p>
          </div>

          {/* Form Card */}
          <div className="p-8 shadow-2xl space-y-6 rounded-2xl border border-white/10" style={{ background: "rgba(10, 10, 10, 0.6)", backdropFilter: "blur(20px)" }}>
            {/* Auth Mode Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-black/60 rounded-xl border border-white/10 font-mono text-xs">
              <button
                type="button"
                onClick={() => { setAuthMode("wallet"); setError(null); }}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  authMode === "wallet" ? "bg-white text-black font-bold shadow-md" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>1AM Wallet</span>
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("credentials"); setError(null); }}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  authMode === "credentials" ? "bg-white text-black font-bold shadow-md" : "text-zinc-400 hover:text-white"
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>EHR Credentials</span>
              </button>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-400 text-xs flex items-center gap-2 font-mono bg-red-500/10 border border-red-500/20 p-3 rounded-xl"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Wallet Mode Form */}
            {authMode === "wallet" && (
              <div className="space-y-5">
                <div className="text-center">
                  <h2 className="text-base font-bold text-white">Zero-Knowledge Verification Engine</h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Connect your cryptographic identity via 1AM Proofstation.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleWalletConnect}
                  disabled={isSubmitting || wallet.connecting}
                  className="w-full py-3.5 rounded-lg flex justify-center items-center gap-2 font-bold text-sm shadow-xl hover:opacity-90 transition-opacity"
                  style={{ background: "var(--seal-brass)", color: "#000" }}
                >
                  {(isSubmitting || wallet.connecting) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Connecting 1AM Wallet...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-black" />
                      <span>Connect with 1AM Wallet</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Credentials Mode Form */}
            {authMode === "credentials" && (
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                <div className="text-center mb-2">
                  <h2 className="text-base font-bold text-white">Hospital Sign In</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Sign in with your hospital EHR administrator credentials.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block">Work Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                      placeholder="admin@hospital.org"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-lg flex justify-center items-center gap-2 font-bold text-sm shadow-xl"
                  style={{ background: "#fff", color: "#000" }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In with EHR</span>
                      <ArrowRight className="w-4 h-4 text-black" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Quick Demo Sandbox Access */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink mx-3 text-[11px] font-mono text-zinc-400 uppercase">Or One-Click Access</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <button
                type="button"
                onClick={() => router.push("/batch")}
                className="w-full py-2.5 rounded-lg border border-white/10 bg-white/5 text-xs font-mono font-medium text-zinc-200 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-3.5 h-3.5" style={{ color: "var(--seal-brass)" }} />
                <span>Launch Hospital Verifier Sandbox</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center space-y-2">
            <div>
              <Link href="/" className="text-xs font-mono text-zinc-400 hover:text-white transition-colors">
                &larr; Back to Aquas Landing
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
