"use client";

import { useState } from "react";
import {
  Building2,
  RefreshCw,
  CircleAlert
} from "lucide-react";
import { useMidnightWallet } from "@/hooks/use-midnight-wallet";
import BatchRosterUploader from "@/components/BatchRosterUploader";
import BatchResultsTable from "@/components/BatchResultsTable";
import {
  executeBatchVerification,
  type BatchDoctorEntry,
  type BatchVerificationResult,
  type BatchProgress,
} from "@/lib/batch-verifier";

export default function BatchVerificationPage() {
  const wallet = useMidnightWallet();
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [results, setResults] = useState<BatchVerificationResult[] | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const handleRunBatch = async (entries: BatchDoctorEntry[]) => {
    setIsVerifying(true);
    setErrorNotice(null);
    setProgress({ total: entries.length, completed: 0, currentEntry: null, percent: 0 });

    try {
      const verifications = await executeBatchVerification(
        entries,
        5,
        wallet.indexerUri ?? undefined,
        wallet.indexerWsUri ?? undefined,
        (p) => setProgress(p),
      );
      setResults(verifications);
    } catch (err) {
      setErrorNotice(err instanceof Error ? err.message : "Batch verification encountered an issue.");
    } finally {
      setIsVerifying(false);
      setProgress(null);
    }
  };

  const handleReset = () => {
    setResults(null);
    setProgress(null);
    setErrorNotice(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 font-sans pb-16">
      {/* Page Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b08d57]/10 border border-[#b08d57]/20 text-xs font-mono text-[#b08d57] mb-2 font-semibold">
          <Building2 size={14} />
          <span>ENTERPRISE HOSPITAL CREDENTIALING</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
          Multi-Doctor Batch Verification
        </h1>
        <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
          Verify entire hospital physician rosters in parallel against Midnight zero-knowledge state. Generate audit-ready compliance certificates for Joint Commission (JCAHO) and CMS reviews.
        </p>
      </div>

      {errorNotice && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-mono">
          <CircleAlert size={16} />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Progress Bar Display */}
      {isVerifying && progress && (
        <div className="p-6 bg-black/50 border border-white/10 rounded-3xl space-y-3 font-mono">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2 text-white">
              <RefreshCw size={14} className="animate-spin text-[#b08d57]" />
              <span>Verifying {progress.completed} of {progress.total} Credentials…</span>
            </div>
            <span className="text-[#3fa96b] font-bold">{progress.percent}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#3fa96b] transition-all duration-200"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          {progress.currentEntry && (
            <span className="text-[11px] text-zinc-500 block truncate">
              Checking: {progress.currentEntry}
            </span>
          )}
        </div>
      )}

      {/* Dynamic Workflow: Uploader or Results */}
      {!results ? (
        <BatchRosterUploader onRosterParsed={handleRunBatch} isVerifying={isVerifying} />
      ) : (
        <BatchResultsTable results={results} onReset={handleReset} />
      )}
    </div>
  );
}
