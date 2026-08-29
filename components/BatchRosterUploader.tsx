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
    <div className="batch-uploader-card">
      <div className="uploader-header">
        <div>
          <span className="eyebrow">Roster Ingestion</span>
          <h2 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "24px", letterSpacing: "-0.03em" }}>
            Upload Staff Physician Roster
          </h2>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondary-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", padding: "6px 12px", border: "1px solid var(--line)", background: "transparent", cursor: "pointer" }}
            onClick={handleDownloadTemplate}
          >
            <Download size={13} />
            Download CSV Template
          </button>
          <button
            type="button"
            className="secondary-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", padding: "6px 12px", border: "1px solid var(--line)", background: "transparent", cursor: "pointer" }}
            onClick={loadSampleRoster}
          >
            <FileText size={13} />
            Load Sample Roster
          </button>
        </div>
      </div>

      <div
        className={`dropzone ${dragOver ? "drag-active" : ""}`}
        style={{
          marginTop: "18px",
          border: "2px dashed " + (dragOver ? "var(--ink)" : "var(--line)"),
          padding: "36px 20px",
          textAlign: "center",
          background: dragOver ? "var(--paper-raised)" : "transparent",
          cursor: "pointer",
          transition: "all 150ms ease",
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.json,.txt"
          style={{ display: "none" }}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <Upload size={28} color="var(--line-graphite)" />
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
            Drag & drop roster file here, or <span style={{ textDecoration: "underline", color: "var(--seal-brass)" }}>browse files</span>
          </p>
          <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)" }}>
            Accepts CSV, TSV, JSON, or multiline text
          </p>
        </div>
      </div>

      <div style={{ marginTop: "18px" }}>
        <label style={{ display: "block", marginBottom: "6px", fontSize: "10px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.08em" }}>
          Or Paste Raw Credential IDs / CSV Rows Directly
        </label>
        <textarea
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid var(--line)",
            background: "var(--paper-raised)",
            color: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            lineHeight: 1.5,
            resize: "vertical",
            outline: "none",
          }}
          value={rawText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={`credentialId,doctorName,npiNumber,department\ne0c9d5d6d0ce7d5dc8dd4251a8d5ba0b368c42bb653f85b444e1318d93221f70,Dr. Sarah Jenkins MD,1982746192,Cardiology`}
          rows={5}
          spellCheck={false}
        />
      </div>

      {rawText.trim() && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px 16px",
            border: "1px solid var(--line)",
            background: "var(--paper-raised)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 600 }}>
              <CheckCircle2 size={14} color="var(--verified-mint)" />
              {parsedEntries.length} Valid IDs Recognized
            </span>
            {parseErrors.length > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--alert-rust)" }}>
                <AlertTriangle size={14} />
                {parseErrors.length} Lines Ignored
              </span>
            )}
          </div>

          <button
            type="button"
            className="notary-cta"
            style={{ minHeight: "38px", padding: "0 18px", fontSize: "11px" }}
            disabled={parsedEntries.length === 0 || isVerifying}
            onClick={handleStartVerification}
          >
            {isVerifying ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Verifying Roster on Midnight…
              </>
            ) : (
              `Verify ${parsedEntries.length} Credentials on Midnight`
            )}
          </button>
        </div>
      )}

      {parseErrors.length > 0 && (
        <div style={{ marginTop: "10px", fontSize: "11px", color: "var(--alert-rust)", background: "rgba(181, 72, 42, 0.08)", padding: "8px 12px", border: "1px solid rgba(181, 72, 42, 0.2)", maxHeight: "90px", overflowY: "auto" }}>
          <strong>Formatting Warnings:</strong>
          <ul style={{ margin: "4px 0 0", paddingLeft: "18px" }}>
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
