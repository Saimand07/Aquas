"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Shield,
  Activity,
  Hexagon,
  EyeOff,
  Globe,
  Terminal,
  Lock,
  Server,
  FileCheck2,
  Smartphone,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  Loader2,
  ChevronRight,
  Cpu,
  Key,
  Database
} from "lucide-react";
import { useAuth } from "@/context/auth-context";

// Modern Frosted Glass Navbar
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        scrolled
          ? "h-16 bg-[rgba(10,10,10,0.92)] backdrop-blur-2xl border-white/[0.08]"
          : "h-20 bg-[rgba(10,10,10,0.65)] backdrop-blur-xl border-transparent"
      }`}
    >
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12 h-full flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-3 group cursor-pointer">
          <ShieldCheck className="w-7 h-7 text-[#3fa96b] transition-transform duration-300 group-hover:scale-110" />
          <span className="font-mono text-sm tracking-[0.2em] font-bold text-white uppercase">
            <span className="text-[#b08d57]">/</span> AQUAS
          </span>
        </Link>

        {/* Center: Links (Desktop) */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: "Live ZK Engine", href: "#zk-engine" },
            { label: "Capabilities", href: "#capabilities" },
            { label: "Architecture", href: "#architecture" },
            { label: "Developers", href: "/ehr" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-white/70 hover:text-white transition-colors duration-200"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs font-mono text-white/70">
            <span className="w-2 h-2 rounded-full bg-[#3fa96b] animate-pulse" />
            <span>MIDNIGHT PREVIEW</span>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                style={{
                  background: "#ffffff",
                  color: "#000000",
                  fontWeight: 700
                }}
                className="h-9 px-5 flex items-center justify-center gap-1.5 text-xs rounded-lg hover:bg-[#b08d57] transition-colors shadow-lg cursor-pointer"
              >
                <span>Console</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => {
                  signOut();
                  router.refresh();
                }}
                style={{
                  color: "#a1a1aa",
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.1)"
                }}
                className="h-9 px-3 text-xs rounded-lg hover:text-white hover:border-white/30 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/auth/signin"
              style={{
                background: "#ffffff",
                color: "#000000",
                fontWeight: 700
              }}
              className="h-9 px-5 flex items-center justify-center gap-2 text-xs rounded-lg hover:bg-[#b08d57] transition-colors shadow-lg cursor-pointer"
            >
              Launch App
            </Link>
          )}
        </div>
      </div>
    </motion.nav>
  );
}

export default function LandingPage() {
  const containerRef = useRef(null);
  const router = useRouter();
  const { signInSandbox, isAuthenticated } = useAuth();
  const [demoState, setDemoState] = useState<"idle" | "proving" | "verified">("idle");

  const runDemoProof = async () => {
    setDemoState("proving");
    await new Promise((resolve) => setTimeout(resolve, 850));
    setDemoState("verified");
  };

  const handleInstantSandbox = () => {
    signInSandbox();
    router.push("/dashboard");
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0a] text-white selection:bg-[#b08d57] selection:text-black font-sans overflow-hidden">
      <Navbar />

      {/* 1. HERO SECTION (Clean & Uncompressed) */}
      <section className="relative min-h-[90vh] flex flex-col pt-36 pb-24 px-6 lg:px-12 max-w-[1400px] mx-auto justify-center text-center items-center">
        {/* Background glow for hero */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-gradient-to-br from-[#b08d57]/15 via-[#3fa96b]/10 to-transparent blur-[150px] rounded-full pointer-events-none z-0" />

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-8 relative z-10 max-w-4xl mx-auto"
        >
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/15 text-xs font-mono text-[#b08d57] shadow-lg">
            <Sparkles size={14} className="text-[#b08d57]" />
            <span className="font-semibold tracking-wider">MIDNIGHT PRIVACY BLOCKCHAIN · ZERO-KNOWLEDGE LEDGER</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05]">
            Zero-Knowledge<br />
            <span className="text-white/60">Medical Registry,</span><br />
            for Sovereign Healthcare.
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl text-white/60 max-w-2xl font-light leading-relaxed">
            Verify physician medical licenses, DEA rights, and specialty board credentials in under 1 second without exposing personal doctor files or PII to the public ledger.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href={isAuthenticated ? "/dashboard" : "/auth/signin"}
              style={{
                background: "#ffffff",
                color: "#000000",
                fontWeight: 700
              }}
              className="h-14 px-9 flex items-center justify-center gap-3 text-base rounded-2xl hover:bg-[#b08d57] transition-all transform hover:-translate-y-0.5 shadow-2xl cursor-pointer"
            >
              <span>Launch Platform</span>
              <ArrowRight className="w-5 h-5 text-black" />
            </Link>

            <button
              type="button"
              onClick={handleInstantSandbox}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                fontWeight: 600
              }}
              className="h-14 px-8 flex items-center justify-center gap-2.5 text-base rounded-2xl hover:bg-white/10 hover:border-white/40 transition-all cursor-pointer"
            >
              <Zap className="w-5 h-5 text-[#3fa96b]" />
              <span>Interactive Demo Sandbox</span>
            </button>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-3 pt-6">
            {[
              { icon: Shield, text: "Compact ZK Circuits" },
              { icon: Hexagon, text: "Consensus-Enforced" },
              { icon: EyeOff, text: "HIPAA Safe Harbor" },
              { icon: Activity, text: "< 1s Verification" }
            ].map((chip, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 text-xs font-mono text-[#3fa96b]"
              >
                <chip.icon className="w-4 h-4" />
                <span>{chip.text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Live Activity Ribbon */}
        <div className="w-full mt-24 border-t border-white/[0.08] bg-[#0a0a0a]/90 backdrop-blur-md overflow-hidden py-4">
          <motion.div 
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            className="flex whitespace-nowrap gap-12 px-6"
          >
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-8 text-xs font-mono text-zinc-400">
                <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#b08d57]" /> TX_C92F PROVEN</span>
                <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#3fa96b]" /> STATE_SYNC_OK</span>
                <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-white/30" /> HOSPITAL_BATCH VERIFIED</span>
                <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#3fa96b]" /> FHIR_R4_EMIT</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 2. DEDICATED LIVE ZK VERIFICATION ENGINE SHOWCASE */}
      <section id="zk-engine" className="py-32 px-6 max-w-7xl mx-auto border-t border-white/[0.08]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#3fa96b]/10 border border-[#3fa96b]/20 text-xs font-mono text-[#3fa96b] mb-4">
            <Cpu className="w-4 h-4" />
            <span>INTERACTIVE SIMULATOR</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Live Zero-Knowledge Verification Engine
          </h2>
          <p className="text-zinc-400 text-lg">
            Experience client-side WASM proving on Midnight&apos;s Compact shielded ledger without leaking private identity witnesses.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Simulator Card (Left / Center) */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 md:p-10 bg-black/60 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl relative overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={24} className="text-[#3fa96b]" />
                  <div>
                    <strong className="text-base font-semibold tracking-wide block text-white">Live ZK Verification Engine</strong>
                    <span className="text-xs text-zinc-400 font-mono">Proofstation WASM Runtime</span>
                  </div>
                </div>
                <span className="text-xs font-mono px-3 py-1 bg-[#3fa96b]/15 text-[#3fa96b] border border-[#3fa96b]/30 rounded-lg font-bold">
                  ACTIVE
                </span>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 mb-6 font-mono text-xs space-y-3.5">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Target Commitment:</span>
                  <span className="text-zinc-200 font-bold bg-white/5 px-2.5 py-1 rounded">0xd5e2dc450d37260f…9b74</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Issuing Authority:</span>
                  <span className="text-white font-medium">New York State Medical Board</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Prover Architecture:</span>
                  <span className="text-[#b08d57] font-semibold">Compact Shielded Ledger (Midnight)</span>
                </div>
              </div>

              {demoState === "idle" && (
                <button
                  type="button"
                  onClick={runDemoProof}
                  style={{
                    background: "#ffffff",
                    color: "#000000",
                    fontWeight: 700
                  }}
                  className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-xl hover:bg-[#b08d57] transition-all cursor-pointer"
                >
                  <Zap size={16} className="text-black" />
                  <span>Execute Zero-Knowledge Proof Check</span>
                </button>
              )}

              {demoState === "proving" && (
                <div className="w-full py-4 bg-white/[0.04] border border-white/15 rounded-xl flex items-center justify-center gap-3 text-[#b08d57] font-mono text-sm font-semibold">
                  <Loader2 size={18} className="animate-spin text-[#b08d57]" />
                  <span>Computing cryptographic proof in local WASM runtime…</span>
                </div>
              )}

              {demoState === "verified" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="w-full p-6 bg-[#3fa96b]/10 border border-[#3fa96b]/30 rounded-2xl"
                >
                  <div className="flex items-center gap-2.5 text-[#3fa96b] mb-4">
                    <CheckCircle2 size={22} />
                    <strong className="text-sm font-bold tracking-wide">PRIMARY SOURCE VERIFIED · ZERO PII EXPOSED</strong>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    {["✓ Active State Licensure", "✓ DEA Schedule II-V Rights", "✓ CME ≥50h Completed", "✓ Clean NPDB Record"].map(t => (
                      <div key={t} className="px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-zinc-200">
                        {t}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDemoState("idle")}
                    className="mt-4 text-xs text-zinc-400 hover:text-white underline decoration-white/20 transition-colors cursor-pointer"
                  >
                    Reset Proof Simulator
                  </button>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Explanatory Architecture Cards (Right) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <Key className="w-5 h-5 text-[#b08d57]" />
                <h3 className="font-bold text-white text-base">1. Local Witness Secrecy</h3>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Doctor credentials, private keys, and SSN remain strictly in the local browser. The witness never touches any external server.
              </p>
            </div>

            <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <Cpu className="w-5 h-5 text-[#3fa96b]" />
                <h3 className="font-bold text-white text-base">2. WASM Circuit Execution</h3>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Compact ZK circuits evaluate validity, expiry dates, and authority signatures locally, producing an unforgeable SNARK proof.
              </p>
            </div>

            <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <Database className="w-5 h-5 text-[#b08d57]" />
                <h3 className="font-bold text-white text-base">3. Consensus Settlement</h3>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Midnight nodes verify the ZK proof on-chain against public authority commitments, guaranteeing instant settlement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CAPABILITIES GRID */}
      <section id="capabilities" className="py-32 px-6 max-w-7xl mx-auto border-t border-white/[0.08]">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-center">Enterprise ZK Capabilities</h2>
        <p className="text-lg text-white/50 max-w-3xl mx-auto text-center mb-20">
          Aquas natively integrates Midnight&apos;s core ZK capabilities into a unified hospital credentialing infrastructure.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { title: "Hospital Batch Verifier", subtitle: "Instant Compliance", icon: FileCheck2, desc: "Upload hundreds of physician records simultaneously. Verify on-chain status in parallel and export audit-ready regulatory compliance packages (CSV/JSON/PDF).", href: "/batch" },
            { title: "HL7® FHIR® R4 Gateway", subtitle: "Native EHR Integration", icon: Server, desc: "Direct plug-and-play integration for Epic Systems, Cerner, and Meditech. Returns compliant VerificationResult resources.", href: "/ehr" },
            { title: "Live ZK Explorer", subtitle: "Real-time Telemetry", icon: Activity, desc: "Real-time network telemetry, smart contract state commits, on-chain block indexes, and early radar warnings for expirations.", href: "/explorer" },
            { title: "Mobile Physician Pass", subtitle: "Offline Verification", icon: Smartphone, desc: "Carry a cryptographically signed mobile pass with 30-second rotating anti-screenshot challenges for underground surgical bunkers.", href: "/pass" }
          ].map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="p-8 bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-3xl hover:bg-white/[0.05] hover:border-white/20 transition-all flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white/[0.05] border border-white/10 rounded-2xl">
                    <feat.icon className="w-6 h-6 text-[#b08d57]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">{feat.title}</h3>
                    <p className="text-xs text-white/40 font-mono">{feat.subtitle}</p>
                  </div>
                </div>
                <p className="text-white/60 leading-relaxed text-sm">{feat.desc}</p>
              </div>

              <Link
                href={feat.href}
                className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#3fa96b] hover:text-white transition-colors pt-2"
              >
                <span>Launch {feat.title}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 4. THE PROBLEM */}
      <section id="architecture" className="py-32 px-6 max-w-7xl mx-auto border-t border-white/[0.08]">
        <div className="flex flex-col gap-6 mb-20 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">The Bottleneck in Medical Credentialing</h2>
          <p className="text-lg text-white/50 max-w-3xl mx-auto">
            Hospital compliance networks rely on manual, centralized verification databases that leak physician PII and take up to 90 days to process.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-10 border border-white/[0.08] bg-white/[0.02] rounded-3xl flex flex-col gap-6"
          >
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <Lock className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-2xl font-bold">The Privacy Deficit</h3>
            <p className="text-white/60 leading-relaxed">
              Standard credentialing exposes full names, SSNs, and home addresses across hundreds of disconnected hospital databases, creating massive targets for identity theft.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="p-10 border border-white/[0.08] bg-white/[0.02] rounded-3xl flex flex-col gap-6"
          >
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
              <Globe className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-2xl font-bold">The Multi-State Friction</h3>
            <p className="text-white/60 leading-relaxed">
              Cross-state practice (IMLC) requires redundant verification. Each state maintains siloed registries, delaying critical care deployments by months.
            </p>
          </motion.div>
        </div>
      </section>

      {/* 5. FINAL CTA */}
      <section className="py-32 px-6 text-center border-t border-white/[0.08] bg-[#050505] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#3fa96b]/[0.03] blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-8">Give your doctors privacy.</h2>
          <p className="text-zinc-400 max-w-xl text-base mb-10">
            Start verifying credentials with sub-second zero-knowledge proof checks on the Midnight Privacy Blockchain.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/auth/signin"
              style={{
                background: "#ffffff",
                color: "#000000",
                fontWeight: 700
              }}
              className="h-14 px-9 flex items-center justify-center text-base rounded-2xl hover:bg-[#b08d57] transition-all shadow-xl cursor-pointer"
            >
              Launch Enterprise Platform
            </Link>

            <Link
              href="/ehr"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.15)"
              }}
              className="h-14 px-8 flex items-center justify-center text-base rounded-2xl hover:bg-white/10 transition-colors gap-2 cursor-pointer font-medium"
            >
              <Terminal className="w-5 h-5" />
              <span>EHR Developer Docs</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="px-6 py-12 border-t border-white/[0.08] bg-black">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <Link href="/" className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-white" />
              <span className="font-mono text-sm tracking-[0.2em] font-bold text-white uppercase">
                AQUAS
              </span>
            </Link>
            
            <div className="flex flex-wrap gap-x-8 gap-y-4 items-center">
              <a href="https://github.com/Saimand07/Aquas" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 hover:text-white transition-colors">GitHub Repository</a>
              <a href="https://preview.midnightexplorer.com" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 hover:text-white transition-colors">Midnight Explorer</a>
              <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-8 border-t border-white/[0.08] text-xs text-zinc-500 font-mono">
            <div>© {new Date().getFullYear()} Aquas Medical Registry. Built on Midnight.</div>
            <div className="flex items-center gap-2 border border-white/10 px-3 py-1.5 rounded-lg bg-white/[0.02]">
              <Globe className="w-3 h-3 text-[#3fa96b]" />
              <span>Preview Testnet Active</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
