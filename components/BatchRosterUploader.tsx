"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { Upload, FileText, Download, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import {
  parseRosterInput,
  generateSampleCsvTemplate,
  type BatchDoctorEntry,
} from "@/lib/batch-verifier";

interface BatchRosterUploaderProps {
  onRosterParsed: (entries: BatchDoctorEntry[]) => void;
  isVerifying: boolean;
}

export default function BatchRosterUploader({
  onRosterParsed,
  isVerifying,
}: BatchRosterUploaderProps) {
  const [rawText, setRawText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [parsedEntries, setParsedEntries] = useState<BatchDoctorEntry[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (text: string) => {
    setRawText(text);
    if (!text.trim()) {
      setParsedEntries([]);
      setParseErrors([]);
      return;
    }
    const { entries, errors } = parseRosterInput(text);
    setParsedEntries(entries);
    setParseErrors(errors);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setRawText(content);
        handleTextChange(content);
      }
    };
    reader.readAsText(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => {
    setDragOver(false);
  };

  const handleDownloadTemplate = () => {
    const csv = generateSampleCsvTemplate();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aquas-physician-roster-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadSampleRoster = () => {
    const sample = generateSampleCsvTemplate();
    setRawText(sample);
    handleTextChange(sample);
  };

  const handleStartVerification = () => {
    if (parsedEntries.length > 0) {
      onRosterParsed(parsedEntries);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-black/50 backdrop-blur-xl border border-white/10 rounded-3xl shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#b08d57] font-bold block">
            Roster Ingestion
          </span>
          <h2 className="text-xl font-bold text-white mt-0.5">
            Upload Staff Physician Roster
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              color: "#a1a1aa",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}
            className="px-3 py-2 rounded-xl text-xs font-mono flex items-center gap-1.5 hover:text-white hover:border-white/30 transition-colors cursor-pointer"
            onClick={handleDownloadTemplate}
          >
            <Download size={13} />
            <span>Download CSV Template</span>
          </button>
          <button
            type="button"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              color: "#a1a1aa",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}
            className="px-3 py-2 rounded-xl text-xs font-mono flex items-center gap-1.5 hover:text-white hover:border-white/30 transition-colors cursor-pointer"
            onClick={loadSampleRoster}
          >
            <FileText size={13} />
            <span>Load Sample Roster</span>
          </button>
        </div>
      </div>

      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragOver ? "border-[#b08d57] bg-white/[0.04]" : "border-white/15 bg-white/[0.01] hover:border-white/30 hover:bg-white/[0.02]"
        }`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.json,.txt"
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />
        <div className="flex flex-col items-center gap-2">
          <Upload size={32} className="text-[#b08d57] stroke-1" />
          <p className="text-sm font-semibold text-white">
            Drag &amp; drop roster file here, or <span className="text-[#b08d57] underline">browse files</span>
          </p>
          <p className="text-xs text-zinc-400 font-mono">
            Accepts CSV, TSV, JSON, or multiline text format
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block">
          Or Paste Raw Credential IDs / CSV Rows Directly
        </label>
        <textarea
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            color: "#ffffff",
            borderColor: "rgba(255, 255, 255, 0.15)"
          }}
          className="w-full p-4 rounded-xl border font-mono text-xs focus:outline-none focus:border-[#b08d57] transition-colors"
          value={rawText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={`credentialId,doctorName,npiNumber,department\n0xd5e2dc450d37260f6f43d4b15ab74f48e91dfd81497735506e27c0c3257d9b74,Dr. Sarah Jenkins MD,1982746192,Cardiology`}
          rows={5}
          spellCheck={false}
        />
      </div>

      {rawText.trim() && (
        <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2 font-mono text-xs text-[#3fa96b] font-bold">
              <CheckCircle2 size={16} />
              {parsedEntries.length} Valid Entries Recognized
            </span>
            {parseErrors.length > 0 && (
              <span className="inline-flex items-center gap-2 font-mono text-xs text-amber-400">
                <AlertTriangle size={16} />
                {parseErrors.length} Lines Ignored
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={parsedEntries.length === 0 || isVerifying}
            onClick={handleStartVerification}
            style={{
              background: "#ffffff",
              color: "#000000",
              fontWeight: 700
            }}
            className="px-6 py-3 rounded-xl flex items-center justify-center gap-2 text-xs shadow-xl hover:bg-[#b08d57] transition-colors cursor-pointer disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <RefreshCw size={14} className="animate-spin text-black" />
                <span>Verifying Roster on Midnight…</span>
              </>
            ) : (
              <span>Verify {parsedEntries.length} Credentials on Midnight</span>
            )}
          </button>
        </div>
      )}

      {parseErrors.length > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-400 font-mono space-y-1">
          <strong>Formatting Warnings:</strong>
          <ul className="list-disc pl-5 space-y-0.5">
            {parseErrors.slice(0, 3).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
            {parseErrors.length > 3 && <li>...and {parseErrors.length - 3} more</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
