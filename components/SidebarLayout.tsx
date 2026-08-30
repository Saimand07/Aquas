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
  CircleAlert,
  UserCheck,
  Globe
} from "lucide-react";
import { shortId } from "@/lib/license-registry";
import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { FluidParticlesBackground } from "@/components/ui/fluid-particles-background";

const NAV_ITEMS = [
  { label: "Command Center", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Batch Verifier", icon: ClipboardList, href: "/batch" },
  { label: "ZK Explorer", icon: Activity, href: "/explorer" },
  { label: "EHR Gateway", icon: Database, href: "/ehr" },
  { label: "Physician Pass", icon: Smartphone, href: "/pass" },
  { label: "Sovereign Deploy", icon: Rocket, href: "/deploy" },
];

const emptySubscribe = () => () => {};

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    isAuthenticated,
    user,
    walletAddress,
    authType,
    signOut,
    error: authError
  } = useAuth();

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // If not authenticated, redirect to /auth/signin
  useEffect(() => {
    if (isMounted && !isAuthenticated) {
      router.replace("/auth/signin");
    }
  }, [isMounted, isAuthenticated, router]);

  if (!isMounted || !isAuthenticated) {
    return null; // Don't flash dashboard if unauthenticated
  }

  const userInitial = user?.name ? user.name.charAt(0) : "A";
  const userDisplayName = user?.name || "Dr. Sarah Lin, MD";
  const userSubtitle = user?.role || (authType === "wallet" ? "1AM Verified Node" : "Authorized Session");
  const connectedAddressLabel = walletAddress ? shortId(walletAddress) : "Sandbox Mode";

  return (
    <FluidParticlesBackground className="relative min-h-screen bg-[#070707] text-white flex overflow-hidden font-sans">
      <div className="relative z-10 flex w-full min-h-screen">
        {/* Ambient Specular Glass Glows */}
        <div className="fixed -top-32 left-1/3 w-[650px] h-[650px] bg-gradient-to-br from-[#b08d57]/10 via-[#3fa96b]/5 to-transparent rounded-full blur-[160px] pointer-events-none z-0" />
        <div className="fixed -bottom-20 right-1/4 w-[550px] h-[550px] bg-gradient-to-tl from-[#101010]/20 via-[#b08d57]/08 to-transparent rounded-full blur-[160px] pointer-events-none z-0" />

        {/* Liquid Glass Sidebar */}
        <aside className="relative w-64 bg-black/45 backdrop-blur-3xl border-r border-white/[0.12] shadow-[inset_-1px_0_1px_rgba(255,255,255,0.08),0_12px_40px_rgba(0,0,0,0.6)] flex flex-col z-40">
          <Link href="/" className="h-20 flex items-center gap-3 px-6 border-b border-white/[0.1] group cursor-pointer">
            <div className="p-1.5 rounded-xl bg-white/[0.04] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] group-hover:border-[#b08d57]/40 transition-all">
              <ShieldCheck className="w-6 h-6 text-[#3fa96b]" />
            </div>
            <span className="font-mono text-sm tracking-[0.2em] font-bold text-white uppercase">
              <span className="text-[#b08d57]">/</span> AQUAS
            </span>
          </Link>

          <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-medium transition-all group
                    ${isActive 
                      ? "bg-white/[0.08] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_16px_rgba(0,0,0,0.4)] border border-white/15" 
                      : "text-zinc-400 hover:bg-white/[0.03] hover:text-white hover:border-white/5 border border-transparent"}
                  `}
                >
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-[#b08d57]" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                  <span className="truncate font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Profile Card in Liquid Glass */}
          <div className="p-4 border-t border-white/[0.1]">
            <div className="p-3 bg-white/[0.025] backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center justify-between group hover:border-white/20 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
              <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0 text-xs font-mono font-bold text-[#b08d57]">
                  {userInitial}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-zinc-200 truncate group-hover:text-white transition-colors">{userDisplayName}</div>
                  <div className="text-[10px] text-zinc-500 truncate font-mono">{userSubtitle}</div>
                </div>
              </div>
              <button 
                onClick={() => {
                  signOut();
                  router.push('/');
                }}
                className="p-1.5 text-zinc-400 hover:text-red-400 transition-colors ml-1 cursor-pointer"
                title="Sign Out"
              >
                <Unplug className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area in Liquid Glass Frame */}
        <div className="relative z-10 flex-1 flex flex-col min-w-0 bg-transparent">
          {/* Top Header in Frosted Glass */}
          <header className="h-20 bg-black/35 backdrop-blur-2xl border-b border-white/[0.1] flex items-center justify-between px-8 sticky top-0 z-30 shadow-[inset_0_-1px_1px_rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-bold text-white tracking-tight">
                {NAV_ITEMS.find(i => i.href === pathname)?.label || "Dashboard"}
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              {authError && <div className="text-xs text-red-400 flex items-center gap-1"><CircleAlert size={12}/>{authError}</div>}
              
              <a
                href={`https://preview.midnightexplorer.com/contract/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74"}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "rgba(63, 169, 107, 0.12)",
                  color: "#3fa96b",
                  border: "1px solid rgba(63, 169, 107, 0.3)",
                  fontWeight: 600
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono hover:bg-[#3fa96b]/20 transition-colors cursor-pointer shadow-sm"
                title="Verify Smart Contract on Midnight Preview Explorer"
              >
                <Globe size={13} />
                <span>Explorer Contract ↗</span>
              </a>

              <div className="flex items-center gap-1.5 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl p-1 text-xs shadow-inner">
                <span className="text-[10px] text-zinc-400 uppercase font-mono px-2">Mode:</span>
                <span className="px-3 py-1 rounded-lg font-mono text-xs bg-white/10 text-white font-semibold uppercase">
                  {authType || "PREVIEW"}
                </span>
              </div>

              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl text-xs font-mono text-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
                <UserCheck size={14} className="text-[#3fa96b]" />
                <span className="truncate max-w-[140px]">{connectedAddressLabel}</span>
              </div>

              <button
                onClick={() => {
                  signOut();
                  router.push('/');
                }}
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#f87171",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  fontWeight: 600
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 hover:bg-red-500/20 transition-colors cursor-pointer"
                title="Disconnect Wallet and End Session"
              >
                <Unplug size={13} />
                <span>Disconnect</span>
              </button>
            </div>
          </header>

          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto w-full relative p-6 md:p-8">
            <div className="dashboard-content-wrapper h-full max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>
        </div>
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
    </FluidParticlesBackground>
  );
}
