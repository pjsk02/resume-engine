import { useState, useEffect } from "react";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";
import { callLLM } from "../services/llm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ATSResult {
  score: number;
  matched: string[];
  missing: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fenced ? fenced[1].trim() : raw.trim());
}

async function downloadDocx(text: string) {
  const paragraphs = text
    .split("\n")
    .map((line) => new Paragraph({ children: [new TextRun(line)] }));
  const doc = new Document({ sections: [{ children: paragraphs }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: "resume.docx",
  });
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPdf(text: string) {
  const doc = new jsPDF();
  const margin = 15;
  const lineH = 6;
  const pageH = doc.internal.pageSize.height - margin;
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(text, 180) as string[];
  let y = margin;
  for (const line of lines) {
    if (y + lineH > pageH) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineH;
  }
  doc.save("resume.pdf");
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function ResumeSkeleton() {
  const widths = ["100%", "100%", "85%", "100%", "60%", "100%", "92%", "100%", "78%", "100%", "100%", "68%", "100%", "55%"];
  return (
    <div className="animate-pulse space-y-2 py-1">
      {widths.map((w, i) => (
        <div key={i} className="h-3 bg-gray-200 dark:bg-gray-700 rounded" style={{ width: w }} />
      ))}
    </div>
  );
}

function ATSSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-14 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="space-y-2">
        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="flex flex-wrap gap-1.5">
          {[72, 88, 60, 96, 80].map((w) => (
            <div key={w} className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full" style={{ width: w }} />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-14 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="flex flex-wrap gap-1.5">
          {[68, 84, 76, 58].map((w) => (
            <div key={w} className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full" style={{ width: w }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function VerbsSkeleton() {
  return (
    <div className="animate-pulse flex flex-wrap gap-2">
      {[72, 88, 64, 80, 76, 68, 90, 74, 62, 84].map((w, i) => (
        <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full" style={{ width: w }} />
      ))}
    </div>
  );
}

// ─── Shared textarea classes ──────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 " +
  "text-gray-900 dark:text-gray-100 p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500";

// ─── Main component ───────────────────────────────────────────────────────────

export default function Optimizer() {
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const [defaultSkills, setDefaultSkills] = useState("");
  const [customSkills, setCustomSkills] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [optimized, setOptimized] = useState<string | null>(null);
  const [ats, setAts] = useState<ATSResult | null>(null);
  const [verbs, setVerbs] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/skills.json")
      .then((r) => r.json())
      .then((data) => setDefaultSkills(JSON.stringify(data, null, 2)))
      .catch(() => {});
  }, []);

  const skillsText = isCustom ? customSkills : defaultSkills;

  const handleOptimize = async () => {
    if (!jd.trim() || !resume.trim()) return;
    setLoading(true);
    setRan(true);
    setError(null);
    setOptimized(null);
    setAts(null);
    setVerbs(null);

    const SYSTEM =
      "You are a professional resume coach. Given a job description, a resume, and optional skill preferences, " +
      "rewrite the resume to maximise ATS match while preserving the candidate's authentic voice. " +
      "Output ONLY the full rewritten resume text — no commentary.";

    try {
      const [optimizedText, atsRaw, verbsRaw] = await Promise.all([
        callLLM(
          `JOB DESCRIPTION:\n${jd}\n\nRESUME:\n${resume}\n\nSKILL PREFERENCES:\n${skillsText}`,
          SYSTEM,
        ),
        callLLM(
          `Score this resume against this JD from 0-100 for ATS compatibility. ` +
          `Return JSON: {"score": number, "matched": string[], "missing": string[]}\n\n` +
          `JOB DESCRIPTION:\n${jd}\n\nRESUME:\n${resume}`,
          undefined,
          1024,
        ),
        callLLM(
          `Extract the 10 most impactful action verbs from this JD. Return a JSON array of strings only.\n\n` +
          `JOB DESCRIPTION:\n${jd}`,
          undefined,
          256,
        ),
      ]);

      setOptimized(optimizedText);

      try {
        setAts(extractJson(atsRaw) as ATSResult);
      } catch {
        setAts({ score: 0, matched: [], missing: ["Could not parse ATS response"] });
      }

      try {
        setVerbs(extractJson(verbsRaw) as string[]);
      } catch {
        setVerbs([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!optimized) return;
    await navigator.clipboard.writeText(optimized);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scoreColor =
    !ats ? "text-gray-400"
    : ats.score >= 80 ? "text-emerald-500"
    : ats.score >= 60 ? "text-amber-500"
    : "text-red-500";

  return (
    <div className="space-y-6">

      {/* ── Input row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Job Description
          </label>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the job description here…"
            rows={13}
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Resume
          </label>
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste your resume as plain text here…"
            rows={13}
            className={inputCls}
          />
        </div>
      </div>

      {/* ── Skills preferences panel ──────────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => setPanelOpen((p) => !p)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span>Skills preferences</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                isCustom
                  ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              }`}
            >
              {isCustom ? "using custom" : "using default"}
            </span>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${panelOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {panelOpen && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4 bg-gray-50 dark:bg-gray-900/50 space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Auto-loaded from{" "}
              <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-[11px]">
                /skills.json
              </code>
              . Edit or paste your own JSON to override.
            </p>
            <textarea
              value={isCustom ? customSkills : defaultSkills}
              onChange={(e) => {
                setCustomSkills(e.target.value);
                setIsCustom(true);
              }}
              rows={9}
              spellCheck={false}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-3 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {isCustom && (
              <button
                onClick={() => { setIsCustom(false); setCustomSkills(""); }}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline underline-offset-2 transition-colors"
              >
                Reset to default
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Optimize button ───────────────────────────────────────────────── */}
      <button
        onClick={handleOptimize}
        disabled={loading || !jd.trim() || !resume.trim()}
        className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm tracking-wide transition-colors"
      >
        {loading ? (
          <span className="inline-flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Optimizing…
          </span>
        ) : (
          "Optimize Resume"
        )}
      </button>

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ── Result cards (visible as soon as Optimize is pressed) ─────────── */}
      {ran && (
        <div className="space-y-4">

          {/* Card 1 — Optimized Resume */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Optimized Resume</h3>
            {loading ? (
              <ResumeSkeleton />
            ) : optimized !== null ? (
              <div className="space-y-3">
                <textarea
                  readOnly
                  value={optimized}
                  rows={18}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 text-sm font-mono resize-y focus:outline-none"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                  <button
                    onClick={() => downloadDocx(optimized)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Download DOCX
                  </button>
                  <button
                    onClick={() => downloadPdf(optimized)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Card 2 — ATS Score */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">ATS Score</h3>
              {loading ? (
                <ATSSkeleton />
              ) : ats !== null ? (
                <div className="space-y-4">
                  <div className="flex items-end gap-1.5">
                    <span className={`text-6xl font-bold tabular-nums leading-none ${scoreColor}`}>
                      {ats.score}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500 text-sm mb-1">/ 100</span>
                  </div>

                  {ats.matched.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                        Matched
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {ats.matched.map((kw) => (
                          <span
                            key={kw}
                            className="px-2 py-0.5 text-xs rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {ats.missing.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">
                        Missing
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {ats.missing.map((kw) => (
                          <span
                            key={kw}
                            className="px-2 py-0.5 text-xs rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Card 3 — Power Verbs */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Power Verbs</h3>
              {loading ? (
                <VerbsSkeleton />
              ) : verbs !== null ? (
                <div className="flex flex-wrap gap-2">
                  {verbs.map((verb) => (
                    <span
                      key={verb}
                      className="px-3 py-1.5 text-sm font-medium rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800"
                    >
                      {verb}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
