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
  CircleAlert,
  Loader2
} from "lucide-react";
import { useMidnightWallet } from "@/hooks/use-midnight-wallet";

// A simple modern Navbar for the Landing Page
function Navbar({ onLaunch }: { onLaunch: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const wallet = useMidnightWallet();

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
          ? "h-16 bg-[rgba(10,10,10,0.85)] backdrop-blur-2xl border-white/[0.06]"
          : "h-20 bg-[rgba(10,10,10,0.65)] backdrop-blur-xl border-transparent"
      }`}
    >
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12 h-full flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <ShieldCheck className="w-6 h-6 text-[#3fa96b] transition-colors duration-300" />
          <span className="font-mono text-sm tracking-[0.2em] font-bold text-white uppercase">
            <span className="text-[#b08d57]">/</span> AQUAS
          </span>
        </Link>

        {/* Center: Links (Desktop) */}
        <div className="hidden md:flex items-center gap-8">
          {["Product", "Use Cases", "Developers", "Pricing", "Docs"].map((label) => (
            <Link
              key={label}
              href={`#${label.toLowerCase().replace(" ", "-")}`}
              className="text-sm font-medium text-white/70 hover:text-white transition-colors duration-200"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-xs font-mono text-white/70">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3fa96b]" /> PREPROD ACTIVE
          </div>
          <button
            onClick={onLaunch}
            disabled={wallet.connecting}
            className="h-9 px-5 flex items-center justify-center gap-2 text-sm font-medium bg-white text-black rounded hover:bg-[#b08d57] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {wallet.connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Launch App
          </button>
        </div>
      </div>
    </motion.nav>
  );
}

export default function LandingPage() {
  const containerRef = useRef(null);
  const router = useRouter();
  const wallet = useMidnightWallet();
  const [isLaunching, setIsLaunching] = useState(false);
  const [demoState, setDemoState] = useState<"idle" | "proving" | "verified">("idle");

  useEffect(() => {
    if (isLaunching && wallet.connected) {
      router.push("/dashboard");
    }
  }, [isLaunching, wallet.connected, router]);

  const handleLaunchApp = async () => {
    if (wallet.connected) {
      router.push("/dashboard");
    } else {
      setIsLaunching(true);
      try {
        await wallet.connect();
      } catch {
        setIsLaunching(false);
      }
    }
  };

  const runDemoProof = async () => {
    setDemoState("proving");
    await new Promise((resolve) => setTimeout(resolve, 800));
    setDemoState("verified");
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0a] text-white selection:bg-[#b08d57] selection:text-black font-sans overflow-hidden">
      <Navbar onLaunch={handleLaunchApp} />
      
      {wallet.error && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-xl text-sm font-mono shadow-2xl backdrop-blur-xl">
          <CircleAlert size={16} />
          {wallet.error}
        </div>
      )}

      {/* 1. HERO: What are we? */}
      <section className="relative min-h-screen flex flex-col pt-32 pb-20 px-6 lg:px-12 max-w-[1600px] mx-auto">
        {/* Background glow for hero */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-br from-[#b08d57]/10 via-[#3fa96b]/5 to-transparent blur-[120px] rounded-full pointer-events-none z-0" />

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-8"
          >
            <div className="flex flex-col gap-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-xs font-mono text-[#b08d57] w-fit">
                <Sparkles size={12} /> MIDNIGHT NETWORK PREVIEW
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05]">
                Zero-Knowledge<br />
                <span className="text-white/60">Medical Registry,</span><br />
                for Sovereign Healthcare.
              </h1>
              <p className="text-lg md:text-xl text-white/50 max-w-xl font-light leading-relaxed">
                Aquas enables hospitals, EHRs, and state boards to instantly verify physician credentials without exposing personal identifiable information (PII) to the public ledger.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button 
                onClick={handleLaunchApp} 
                disabled={wallet.connecting}
                className="h-12 px-8 flex items-center justify-center gap-2 bg-white text-black font-medium rounded hover:bg-[#b08d57] transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {wallet.connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Launch Platform"}
                {!wallet.connecting && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
              </button>
              <Link href="/dashboard" className="h-12 px-8 flex items-center justify-center gap-2 bg-[rgba(20,20,20,0.8)] border border-white/[0.1] text-white font-medium rounded hover:bg-white/[0.05] transition-colors">
                Explore Dashboard
              </Link>
            </div>

            <div className="flex flex-wrap gap-4 mt-8">
              {[
                { icon: Shield, text: "Built on Midnight Blockchain" },
                { icon: Hexagon, text: "Consensus-Enforced" },
                { icon: EyeOff, text: "HIPAA Safe Harbor" }
              ].map((chip, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + (idx * 0.1) }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(10,10,10,0.65)] backdrop-blur-xl border border-white/[0.06] text-xs font-medium text-[#3fa96b]"
                >
                  <chip.icon className="w-3.5 h-3.5" />
                  {chip.text}
                </motion.div>
              ))}
            </div>
          </motion.div>

          <div className="relative h-[50vh] lg:h-[600px] w-full z-10 flex items-center justify-center">
            {/* Interactive Live Proof Simulator (Modernized) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="w-full max-w-md p-8 bg-[rgba(12,12,12,0.6)] backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={20} className="text-[#3fa96b]" />
                  <strong className="text-sm font-medium tracking-wide">Live ZK Verification Engine</strong>
                </div>
                <span className="text-[10px] font-mono px-2 py-1 bg-[#3fa96b]/10 text-[#3fa96b] border border-[#3fa96b]/20 rounded-md font-bold">
                  1AM ACTIVE
                </span>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-xl p-5 mb-6 font-mono text-xs space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/40">Target Commitment:</span>
                  <span className="text-white/80">e0c9d5…1f70</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Issuing Authority:</span>
                  <span className="text-white/80">NYS Medical Board</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Prover Arch:</span>
                  <span className="text-white/80">Compact Shielded</span>
                </div>
              </div>

              {demoState === "idle" && (
                <button
                  onClick={runDemoProof}
                  className="w-full py-3.5 bg-white text-black font-semibold rounded-xl hover:bg-[#b08d57] transition-colors flex items-center justify-center gap-2"
                >
                  <Zap size={16} /> Execute Zero-Knowledge Proof Check
                </button>
              )}

              {demoState === "proving" && (
                <div className="w-full py-3.5 bg-black/40 border border-white/10 rounded-xl flex items-center justify-center gap-3 text-[#b08d57] font-medium text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  Computing cryptographic proof...
                </div>
              )}

              {demoState === "verified" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="w-full p-5 bg-[#3fa96b]/10 border border-[#3fa96b]/30 rounded-xl"
                >
                  <div className="flex items-center gap-2 text-[#3fa96b] mb-4">
                    <CheckCircle2 size={20} />
                    <strong className="text-sm">PRIMARY SOURCE VERIFIED</strong>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                    {["✓ Active Licensure", "✓ DEA Schedule II-V", "✓ CME ≥50h", "✓ Clean NPDB Record"].map(t => (
                      <span key={t} className="px-2 py-1 bg-black/40 border border-white/10 rounded-md text-white/70">{t}</span>
                    ))}
                  </div>
                  <button
                    onClick={() => setDemoState("idle")}
                    className="mt-4 text-xs text-white/40 hover:text-white underline decoration-white/20 transition-colors"
                  >
                    Reset Simulator
                  </button>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Live activity ribbon */}
        <div className="absolute bottom-0 left-0 right-0 h-12 border-t border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-md overflow-hidden flex items-center">
          <motion.div 
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="flex whitespace-nowrap gap-12 px-6"
          >
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-8 text-xs font-mono text-white/40">
                <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#b08d57]" /> TX_C92F PROVEN</span>
                <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#3fa96b]" /> STATE_SYNC_OK</span>
                <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-white/20" /> HOSPITAL_REQ VERIFIED</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 2. THE PROBLEM */}
      <section className="py-32 px-6 max-w-7xl mx-auto border-t border-white/[0.06]">
        <div className="flex flex-col gap-6 mb-20 text-center">
          <h2 className="text-3xl md:text-5xl font-medium tracking-tight">The Bottleneck in Medical Credentialing</h2>
          <p className="text-lg text-white/50 max-w-3xl mx-auto">
            Hospital compliance networks rely on manual, centralized verification databases that leak physician PII and take up to 90 days to process.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-10 border border-white/[0.06] bg-[rgba(15,15,15,0.4)] rounded-2xl flex flex-col gap-6"
          >
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <Lock className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-2xl font-medium">The Privacy Deficit</h3>
            <p className="text-white/60 leading-relaxed">
              Standard credentialing exposes full names, SSNs, and home addresses across hundreds of disconnected hospital databases, creating massive targets for identity theft.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="p-10 border border-white/[0.06] bg-[rgba(15,15,15,0.4)] rounded-2xl flex flex-col gap-6"
          >
            <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
              <Globe className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-2xl font-medium">The Multi-State Friction</h3>
            <p className="text-white/60 leading-relaxed">
              Cross-state practice (IMLC) requires redundant verification. Each state maintains siloed registries, delaying critical care deployments by months.
            </p>
          </motion.div>
        </div>
      </section>

      {/* 3. KEY CAPABILITIES */}
      <section className="py-32 px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-medium tracking-tight mb-6 text-center">Enterprise ZK Capabilities</h2>
        <p className="text-lg text-white/50 max-w-3xl mx-auto text-center mb-20">
          Aquas natively integrates Midnight&apos;s core ZK capabilities into a unified hospital credentialing infrastructure.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { title: "Hospital Batch Verifier", subtitle: "Instant Compliance", icon: FileCheck2, desc: "Upload hundreds of physician records simultaneously. Verify on-chain status in parallel and export audit-ready regulatory compliance packages (CSV/JSON/PDF)." },
            { title: "HL7® FHIR® R4 Gateway", subtitle: "Native EHR Integration", icon: Server, desc: "Direct plug-and-play integration for Epic Systems, Cerner, and Meditech. Returns compliant VerificationResult resources." },
            { title: "Live ZK Explorer", subtitle: "Real-time Telemetry", icon: Activity, desc: "Real-time network telemetry, smart contract state commits, on-chain block indexes, and early radar warnings for expirations." },
            { title: "Mobile Physician Pass", subtitle: "Offline Verification", icon: Smartphone, desc: "Carry a cryptographically signed mobile pass with 30-second rotating anti-screenshot challenges for underground surgical bunkers." }
          ].map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="p-8 bg-[rgba(12,12,12,0.7)] backdrop-blur-xl border border-white/[0.06] rounded-xl hover:bg-[rgba(15,15,15,0.9)] hover:border-white/[0.1] transition-all flex flex-col gap-4"
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-white/[0.03] rounded-lg">
                  <feat.icon className="w-6 h-6 text-[#b08d57]" />
                </div>
                <div>
                  <h3 className="font-medium text-lg text-white/90">{feat.title}</h3>
                  <p className="text-sm text-white/40 font-mono">{feat.subtitle}</p>
                </div>
              </div>
              <p className="text-white/60 leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 4. FINAL CTA */}
      <section className="py-32 px-6 text-center border-t border-white/[0.06] bg-[rgba(5,5,5,1)] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#3fa96b]/[0.02] blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
          <h2 className="text-4xl md:text-6xl font-medium tracking-tight mb-10">Give your doctors privacy.</h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button 
              onClick={handleLaunchApp}
              disabled={wallet.connecting}
              className="h-12 px-8 flex items-center justify-center bg-white text-black font-medium rounded hover:bg-[#b08d57] transition-colors disabled:opacity-50"
            >
              {wallet.connecting ? "Connecting..." : "Launch Enterprise Platform"}
            </button>
            <Link href="/ehr" className="h-12 px-8 flex items-center justify-center border border-white/[0.1] text-white font-medium rounded hover:bg-white/[0.05] transition-colors gap-2">
              <Terminal className="w-4 h-4" /> EHR Developer Docs
            </Link>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="px-6 py-12 border-t border-white/[0.06] bg-black">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <Link href="/" className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-white" />
              <span className="font-mono text-sm tracking-[0.2em] font-bold text-white uppercase">
                AQUAS
              </span>
            </Link>
            
            <div className="flex flex-wrap gap-x-8 gap-y-4 items-center">
              <a href="https://github.com/Saimand07/Aquas" target="_blank" rel="noopener noreferrer" className="text-sm text-white/50 hover:text-white transition-colors">GitHub Repository</a>
              <a href="https://preview.midnightexplorer.com" target="_blank" rel="noopener noreferrer" className="text-sm text-white/50 hover:text-white transition-colors">Midnight Explorer</a>
              <Link href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">Dashboard</Link>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-8 border-t border-white/[0.06] text-xs text-white/30">
            <div>© {new Date().getFullYear()} Aquas Medical Registry. All rights reserved.</div>
            <div className="flex items-center gap-2 border border-white/[0.1] px-3 py-1.5 rounded bg-white/[0.02]">
              <Globe className="w-3 h-3" />
              Built on Midnight
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
