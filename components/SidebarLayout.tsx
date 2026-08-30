"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Activity,
  Database,
  Smartphone,
  Rocket,
  ShieldCheck,
  Unplug,
  WalletCards,
  CircleAlert
} from "lucide-react";
import { useMidnightWallet } from "@/hooks/use-midnight-wallet";
import { shortId } from "@/lib/license-registry";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { label: "Command Center", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Batch Verifier", icon: ClipboardList, href: "/batch" },
  { label: "ZK Explorer", icon: Activity, href: "/explorer" },
  { label: "EHR Gateway", icon: Database, href: "/ehr" },
  { label: "Physician Pass", icon: Smartphone, href: "/pass" },
  { label: "Sovereign Deploy", icon: Rocket, href: "/deploy" },
];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const wallet = useMidnightWallet();
  const connectedLabel = wallet.connected ? shortId(wallet.address ?? "connected") : "Connect 1AM";
  const liveMode = Boolean(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim());
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Luma-style Auth Protection:
  // If wallet is not connected, redirect to /auth/signin
  useEffect(() => {
    // Adding a slight delay to allow wallet init to complete
    const timer = setTimeout(() => {
      if (!wallet.connected && !wallet.connecting) {
        router.push("/auth/signin");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [wallet.connected, wallet.connecting, router]);

  if (!mounted || (!wallet.connected && !wallet.connecting)) {
    return null; // Don't render dashboard if not authenticated or not mounted
  }

  return (
    <div className="relative min-h-screen bg-[#03040a] text-white flex overflow-hidden font-sans" style={{ colorScheme: "dark" }}>
      
      {/* Background Orbs */}
      <div className="fixed -top-32 left-1/3 w-[650px] h-[650px] bg-gradient-to-br from-[#b08d57]/10 via-[#3fa96b]/5 to-transparent rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed -bottom-20 right-1/4 w-[550px] h-[550px] bg-gradient-to-tl from-[#101010]/20 via-[#b08d57]/10 to-transparent rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Sidebar */}
      <div className="relative w-64 bg-black/60 backdrop-blur-2xl border-r border-white/10 flex flex-col z-40">
        <div className="h-20 flex items-center gap-3 px-6 border-b border-white/10">
          <ShieldCheck className="w-6 h-6" style={{ color: "var(--verified-mint)" }} />
          <span className="font-bold tracking-[0.15em] text-lg text-white">AQUAS</span>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                  ${isActive 
                    ? "bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" 
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"}
                `}
                style={isActive ? { borderLeft: "2px solid var(--seal-brass)" } : {}}
              >
                <Icon className={`w-4 h-4 transition-colors ${isActive ? "" : "text-zinc-500 group-hover:text-zinc-300"}`} style={isActive ? { color: "var(--seal-brass)" } : {}} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between group hover:border-white/20 transition-all cursor-pointer">
            <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0 text-xs font-mono font-bold" style={{ color: "var(--seal-brass)" }}>
                A
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-zinc-200 truncate group-hover:text-white transition-colors">Admin Session</div>
                <div className="text-[11px] text-zinc-500 truncate font-mono">Verified Node</div>
              </div>
            </div>
            <button 
              onClick={() => { wallet.disconnect(); router.push('/auth/signin'); }}
              className="p-1.5 text-zinc-400 hover:text-white transition-colors ml-1"
              title="Sign Out"
            >
              <Unplug className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 bg-[#0a0a0a]/90 backdrop-blur-md">
        {/* Top Header */}
        <header className="h-20 bg-black/40 backdrop-blur-2xl border-b border-white/10 flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-medium text-white/90">
              {NAV_ITEMS.find(i => i.href === pathname)?.label || "Dashboard"}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {wallet.error && <div className="text-xs text-red-400 flex items-center gap-1"><CircleAlert size={12}/>{wallet.error}</div>}
            
            <div className="flex items-center gap-1.5 bg-black/50 border border-white/10 rounded-xl p-1 text-xs">
              <span className="text-[10px] text-zinc-400 uppercase font-mono px-2">Net:</span>
              <span className="px-3 py-1 rounded-lg font-mono text-xs bg-white/10 text-white font-semibold">
                {liveMode ? "PREPROD" : "SANDBOX"}
              </span>
            </div>

            <button 
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-xs font-mono text-white/80"
              onClick={wallet.connected ? wallet.disconnect : wallet.connect}
              disabled={wallet.connecting}
            >
              {wallet.connected ? <Unplug size={14} /> : <WalletCards size={14} />}
              {wallet.connecting ? "Connecting…" : connectedLabel}
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto w-full relative p-8">
          {/* The children components (our existing pages) will render here.
              We apply a wrapper that enforces Luma's clean transparent styling over our existing styles. */}
          <div className="dashboard-content-wrapper h-full">
            {children}
          </div>
        </main>
      </div>
      
      {/* Global overrides to hide existing topbars when inside dashboard layout */}
      <style dangerouslySetInnerHTML={{__html: `
        .dashboard-content-wrapper .app-shell,
        .dashboard-content-wrapper .deploy-shell {
          min-height: auto !important;
          background: transparent !important;
          padding: 0 !important;
        }
        .dashboard-content-wrapper .topbar,
        .dashboard-content-wrapper .deploy-nav {
          display: none !important;
        }
        .dashboard-content-wrapper main {
          padding: 0 !important;
        }
      `}} />
    </div>
  );
}
