import { PlusCircle, XCircle, CheckCircle2, Shield, ExternalLink, Activity } from "lucide-react";
import type { NetworkActivityEvent } from "@/lib/network-analytics";
import { shortId } from "@/lib/license-registry";

interface ActivityFeedProps {
  events: NetworkActivityEvent[];
}

export default function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <div className="p-6 md:p-8 bg-white/[0.025] hover:bg-white/[0.035] backdrop-blur-2xl border border-white/[0.12] rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_48px_rgba(0,0,0,0.5)] transition-all duration-300 space-y-6">
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-[#3fa96b] shadow-inner">
            <Activity size={18} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white tracking-tight">On-Chain Activity Feed</h3>
            <p className="text-xs text-zinc-400 font-mono">Real-time telemetry from Midnight Preview</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#3fa96b]/15 text-[#3fa96b] border border-[#3fa96b]/30 font-bold shadow-sm">
          LIVE STREAM
        </span>
      </div>

      {events.length === 0 ? (
        <div className="py-12 text-center text-zinc-500 font-mono text-xs border border-dashed border-white/10 rounded-2xl bg-black/30">
          No recent on-chain events indexed for this contract.
        </div>
      ) : (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {events.map((ev) => {
            const isIssuance = ev.type === "ISSUANCE";
            const isRevocation = ev.type === "REVOCATION";
            const isVerification = ev.type === "VERIFICATION";

            return (
              <div
                key={ev.id}
                className="p-4 bg-black/40 border border-white/10 rounded-2xl flex items-start gap-3 hover:border-white/20 transition-colors shadow-inner"
              >
                <div className="mt-0.5">
                  {isIssuance && <PlusCircle size={16} className="text-[#3fa96b]" />}
                  {isRevocation && <XCircle size={16} className="text-red-400" />}
                  {isVerification && <CheckCircle2 size={16} className="text-[#b08d57]" />}
                  {!isIssuance && !isRevocation && !isVerification && <Shield size={16} className="text-white" />}
                </div>

                <div className="flex-1 min-w-0 font-mono text-xs">
                  <div className="flex justify-between items-baseline gap-2">
                    <strong className="text-white font-sans text-xs font-semibold">{ev.title}</strong>
                    <span className="text-[10px] text-zinc-500 whitespace-nowrap">{ev.timeAgo}</span>
                  </div>

                  <p className="text-zinc-400 text-[11px] mt-1 line-clamp-2">{ev.description}</p>

                  <div className="flex items-center gap-3 mt-2 text-[10px]">
                    {ev.credentialId && (
                      <span className="text-zinc-500">ID: {shortId(ev.credentialId)}</span>
                    )}
                    {ev.blockExplorerUrl && (
                      <a
                        href={ev.blockExplorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#3fa96b] hover:underline flex items-center gap-1 ml-auto"
                      >
                        <span>Explorer</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
