import { useState, useEffect, useRef } from "react";
import { callLLM, callLLMWithDocument } from "../services/llm";
import { saveContact } from "../services/storage";

// ─── Types ────────────────────────────────────────────────────────────────────

const CHAR_OPTIONS = [100, 200, 300, "Auto"] as const;
type CharOption = (typeof CHAR_OPTIONS)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // strip data URL prefix
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// ─── Shared classes ───────────────────────────────────────────────────────────

const fieldCls =
  "w-full rounded-lg border border-gray-200 dark:border-gray-700 " +
  "bg-white dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 " +
  "px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConnectionRequest() {
  const [file, setFile] = useState<File | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [profileSummary, setProfileSummary] = useState<string | null>(null);

  const [charOption, setCharOption] = useState<CharOption>(200);
  const [recipientName, setRecipientName] = useState("");
  const [recipientCompany, setRecipientCompany] = useState("");

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-summarize whenever a new file is selected
  useEffect(() => {
    if (!file) return;
    let cancelled = false;

    (async () => {
      setSummarizing(true);
      setSummaryError(null);
      setProfileSummary(null);
      setMessage(null);
      setSaved(false);
      try {
        const base64 = await readAsBase64(file);
        const summary = await callLLMWithDocument(
          "This is a LinkedIn profile PDF. Summarise the person's current role, company, and key background in 3 sentences.",
          base64,
          undefined,
          512,
        );
        if (!cancelled) setProfileSummary(summary);
      } catch (err) {
        if (!cancelled)
          setSummaryError(err instanceof Error ? err.message : "Could not analyse PDF.");
      } finally {
        if (!cancelled) setSummarizing(false);
      }
    })();

    return () => { cancelled = true; };
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleGenerate = async () => {
    if (!profileSummary) return;
    setGenerating(true);
    setGenError(null);
    setMessage(null);
    setSaved(false);

    const charInstruction =
      charOption === "Auto"
        ? "Choose an appropriate length."
        : `Max ${charOption} characters.`;

    try {
      const msg = await callLLM(
        `Write a LinkedIn connection request message to ${profileSummary} ` +
          `${charInstruction} Make it personal and specific. Output only the message text.`,
        undefined,
        512,
      );
      setMessage(msg.trim());
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!message) return;
    await navigator.clipboard.writeText(message);
  };

  const handleSave = () => {
    if (!message) return;
    setSaveError(null);
    try {
      saveContact({
        name: recipientName.trim() || "Unknown",
        company: recipientCompany.trim() || "Unknown",
        role: "",
        message,
        notes: "",
        thread: [],
        status: "connection_sent",
      });
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save contact.");
    }
  };

  const charCount = message?.length ?? 0;
  const charLimit = charOption !== "Auto" ? charOption : null;
  const overLimit = charLimit !== null && charCount > charLimit;

  return (
    <div className="space-y-5">

      {/* ── PDF upload ────────────────────────────────────────────────────── */}
      <div>
        <label className={labelCls}>LinkedIn profile PDF</label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={[
            "w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition-colors cursor-pointer",
            file
              ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20"
              : "border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-800/40",
          ].join(" ")}
        >
          <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          {file ? (
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{file.name}</span>
          ) : (
            <span className="text-sm text-gray-500 dark:text-gray-400">Click to upload PDF</span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* ── Profile summary ───────────────────────────────────────────────── */}
      {(summarizing || summaryError || profileSummary) && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
          <p className={labelCls + " mb-2"}>Profile summary</p>
          {summarizing ? (
            <div className="animate-pulse space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
            </div>
          ) : summaryError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{summaryError}</p>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{profileSummary}</p>
          )}
        </div>
      )}

      {/* ── Options (only shown after summary ready) ──────────────────────── */}
      {profileSummary && (
        <>
          {/* Character count selector */}
          <div>
            <label className={labelCls}>Message length</label>
            <div className="flex gap-1.5">
              {CHAR_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setCharOption(opt)}
                  className={[
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    charOption === opt
                      ? "bg-indigo-600 text-white"
                      : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50",
                  ].join(" ")}
                >
                  {opt === "Auto" ? "Auto" : `${opt}`}
                </button>
              ))}
            </div>
          </div>

          {/* Name + company for tracker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Recipient name</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Jane Smith"
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>Recipient company</label>
              <input
                type="text"
                value={recipientCompany}
                onChange={(e) => setRecipientCompany(e.target.value)}
                placeholder="Acme Corp"
                className={fieldCls}
              />
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
          >
            {generating ? (
              <span className="inline-flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Generating…
              </span>
            ) : (
              "Generate message"
            )}
          </button>

          {genError && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {genError}
            </div>
          )}
        </>
      )}

      {/* ── Generated message card ────────────────────────────────────────── */}
      {message !== null && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className={labelCls + " mb-0"}>Connection message</p>
            <span className={`text-xs tabular-nums ${overLimit ? "text-red-500 font-semibold" : "text-gray-400 dark:text-gray-500"}`}>
              {charCount}{charLimit ? ` / ${charLimit}` : ""} chars
            </span>
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className={fieldCls + " resize-y"}
          />

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Copy
            </button>
            <button
              onClick={handleSave}
              disabled={saved}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white transition-colors"
            >
              {saved ? "✓ Saved to tracker" : "Save to tracker"}
            </button>
          </div>

          {saveError && (
            <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
          )}
        </div>
      )}

    </div>
  );
}
