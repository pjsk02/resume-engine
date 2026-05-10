import { useState, useEffect } from "react";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";
import { callLLM } from "../services/llm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SingleATS {
  score: number;
  matched: string[];
  missing: string[];
}
interface ATSResult {
  before: SingleATS;
  after: SingleATS;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fenced ? fenced[1].trim() : raw.trim());
}

async function downloadDocx(text: string) {
  const paragraphs = text.split("\n").map((line) => {
    const runs = line.split(/(\*\*[^*]+\*\*)/g).map((part) =>
      part.startsWith("**") && part.endsWith("**")
        ? new TextRun({ text: part.slice(2, -2), bold: true })
        : new TextRun({ text: part })
    );
    return new Paragraph({ children: runs });
  });
  const doc = new Document({ sections: [{ children: paragraphs }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: "resume.docx" });
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
    if (y + lineH > pageH) { doc.addPage(); y = margin; }
    doc.text(line, margin, y);
    y += lineH;
  }
  doc.save("resume.pdf");
}

// Splits the model output into resume body, strategist's notes, and embedded ATS scores.
// ResumeSkill.md instructs the model to open PART B with a ```ats ... ``` JSON block.
function splitOutput(raw: string): { resume: string; notes: string; ats: ATSResult | null } {
  const divider = raw.search(/strategist'?s?\s+(?:brief|notes?)/i);
  if (divider === -1) return { resume: raw.trim(), notes: "", ats: null };

  const resume = raw
    .slice(0, divider)
    .replace(/^PART\s+A[\s\S]{0,60}?\n/im, "")
    .trim();

  let notesRaw = raw.slice(divider).trim();
  let ats: ATSResult | null = null;

  const atsFence = notesRaw.match(/```ats\s*([\s\S]*?)```/);
  if (atsFence) {
    try {
      ats = JSON.parse(atsFence[1].trim()) as ATSResult;
    } catch { /* leave ats null */ }
    notesRaw = notesRaw.replace(/```ats[\s\S]*?```/, "").trim();
  }

  return { resume, notes: notesRaw, ats };
}

function renderBold(text: string) {
  return text.split("\n").map((line, li) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={li} className="block">
        {parts.map((part, pi) =>
          part.startsWith("**") && part.endsWith("**")
            ? <strong key={pi} className="font-bold text-white">{part.slice(2, -2)}</strong>
            : <span key={pi}>{part}</span>
        )}
      </span>
    );
  });
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function ResumeSkeleton() {
  const widths = ["100%", "100%", "85%", "100%", "60%", "100%", "92%", "100%", "78%", "100%", "100%", "68%", "100%", "55%"];
  return (
    <div className="animate-pulse space-y-2 py-1">
      {widths.map((w, i) => (
        <div key={i} className="h-3 bg-white/10 rounded" style={{ width: w }} />
      ))}
    </div>
  );
}

function ATSSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-14 w-28 bg-white/10 rounded-lg" />
      <div className="space-y-2">
        <div className="h-3 w-16 bg-white/10 rounded" />
        <div className="flex flex-wrap gap-1.5">
          {[72, 88, 60, 96, 80].map((w) => (
            <div key={w} className="h-5 bg-white/10 rounded-full" style={{ width: w }} />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-14 bg-white/10 rounded" />
        <div className="flex flex-wrap gap-1.5">
          {[68, 84, 76, 58].map((w) => (
            <div key={w} className="h-5 bg-white/10 rounded-full" style={{ width: w }} />
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
        <div key={i} className="h-8 bg-white/10 rounded-full" style={{ width: w }} />
      ))}
    </div>
  );
}

// ─── Shared textarea classes ──────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-white/10 bg-black/40 " +
  "text-white placeholder:text-white/30 p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500";

const STORAGE_KEY = "re:system-prompt-override";

// ─── Main component ───────────────────────────────────────────────────────────

export default function Optimizer() {
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [optimizedResume, setOptimizedResume] = useState<string | null>(null);
  const [strategistNotes, setStrategistNotes] = useState<string>("");
  const [ats, setAts] = useState<ATSResult | null>(null);
  const [verbs, setVerbs] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Restore any saved custom system prompt
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { setCustomPrompt(saved); setIsCustom(true); }

    // Load the default system prompt from public/
    fetch("/ResumeSkill.md")
      .then((r) => r.text())
      .then((text) => setDefaultPrompt(text))
      .catch(() => {});
  }, []);

  const systemPrompt = isCustom ? customPrompt : defaultPrompt;

  const handleOptimize = async () => {
    if (!jd.trim() || !resume.trim()) return;
    setLoading(true);
    setRan(true);
    setError(null);
    setOptimizedResume(null);
    setStrategistNotes("");
    setAts(null);
    setVerbs(null);

    try {
      // Single parallel dispatch: rewrite (with embedded ATS in PART B) + verbs
      const [rawOutput, verbsRaw] = await Promise.all([
        callLLM(
          `JOB DESCRIPTION:\n${jd}\n\nRESUME:\n${resume}`,
          systemPrompt || undefined,
        ),
        callLLM(
          `JOB DESCRIPTION:\n${jd}`,
          "Extract the 10 most impactful action verbs from this JD. " +
          "Return ONLY a JSON array of strings, no explanation: [verb1, verb2, ...]",
          300,
        ),
      ]);

      const { resume: resumeText, notes, ats: embeddedAts } = splitOutput(rawOutput);
      setOptimizedResume(resumeText);
      setStrategistNotes(notes);
      setAts(embeddedAts);

      try { setVerbs(extractJson(verbsRaw) as string[]); }
      catch { setVerbs([]); }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!optimizedResume) return;
    await navigator.clipboard.writeText(optimizedResume);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyRich = async () => {
    if (!optimizedResume) return;
    const html = optimizedResume
      .split("\n")
      .map((line) => {
        const withBold = line.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        return `<p>${withBold}</p>`;
      })
      .join("");
    const plain = optimizedResume.replace(/\*\*/g, "");
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html":  new Blob([html],  { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      }),
    ]);
  };

  const handleSaveAll = async () => {
    if (!optimizedResume) return;
    const boldRuns = (line: string) =>
      line.split(/(\*\*[^*]+\*\*)/g).map((part) =>
        part.startsWith("**") && part.endsWith("**")
          ? new TextRun({ text: part.slice(2, -2), bold: true })
          : new TextRun({ text: part })
      );

    const children = [
      new Paragraph({ heading: "Heading1", children: [new TextRun("OPTIMIZED RESUME")] }),
      ...optimizedResume.split("\n").map((line) => new Paragraph({ children: boldRuns(line) })),
    ];

    if (strategistNotes) {
      children.push(
        new Paragraph({ heading: "Heading1", children: [new TextRun("STRATEGIST'S NOTES")] }),
        ...strategistNotes.split("\n").map((line) => new Paragraph({ children: [new TextRun(line)] })),
      );
    }

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: "optimized-resume-full.docx" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const scoreColor = (score: number) =>
    score >= 80 ? "text-emerald-400"
    : score >= 60 ? "text-amber-400"
    : "text-red-400";

  return (
    <div className="space-y-6">

      {/* ── Input row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-white/60">Job Description</label>
          <textarea value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the job description here…" rows={13} className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-white/60">Resume</label>
          <textarea value={resume} onChange={(e) => setResume(e.target.value)} placeholder="Paste your resume as plain text here…" rows={13} className={inputCls} />
        </div>
      </div>

      {/* ── System prompt panel ───────────────────────────────────────────── */}
      <div className="rounded-lg border border-white/10 overflow-hidden">
        <button
          onClick={() => setPanelOpen((p) => !p)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/5 text-sm font-medium text-white/70 hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span>System prompt</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isCustom ? "bg-indigo-500/20 text-indigo-300" : "bg-white/10 text-white/40"
            }`}>
              {isCustom ? "custom" : "default"}
            </span>
          </div>
          <svg className={`w-4 h-4 text-white/40 transition-transform duration-200 ${panelOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {panelOpen && (
          <div className="border-t border-white/10 px-4 py-4 bg-black/20 space-y-3">
            <p className="text-xs text-white/40">
              Loaded from{" "}
              <code className="font-mono bg-white/10 px-1 py-0.5 rounded text-[11px] text-white/60">
                ResumeSkill.md
              </code>
              . Edit to customize the AI's rewriting strategy for this session.
            </p>
            <textarea
              value={isCustom ? customPrompt : defaultPrompt}
              onChange={(e) => {
                setCustomPrompt(e.target.value);
                setIsCustom(true);
                localStorage.setItem(STORAGE_KEY, e.target.value);
              }}
              rows={14}
              spellCheck={false}
              className="w-full rounded-lg border border-white/10 bg-black/40 text-white/80 placeholder:text-white/30 p-3 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {isCustom && (
              <button
                onClick={() => {
                  setIsCustom(false);
                  setCustomPrompt("");
                  localStorage.removeItem(STORAGE_KEY);
                }}
                className="text-xs text-white/40 hover:text-white/70 underline underline-offset-2 transition-colors"
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
        ) : "Optimize Resume"}
      </button>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Result cards ──────────────────────────────────────────────────── */}
      {ran && (
        <div className="space-y-4">

          {/* Card 1 — Optimized Resume */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
            <h3 className="font-semibold text-white mb-4">Optimized Resume</h3>
            {loading ? (
              <ResumeSkeleton />
            ) : optimizedResume !== null ? (
              <div className="space-y-3">
                <div className="w-full rounded-lg border border-white/10 bg-black/50 text-white/80 p-3 text-sm font-mono leading-relaxed min-h-80 max-h-[36rem] overflow-y-auto whitespace-pre-wrap">
                  {renderBold(optimizedResume)}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleCopy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-colors">
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                  <button onClick={handleCopyRich} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-colors">
                    Copy (with bold)
                  </button>
                  <button onClick={() => downloadDocx(optimizedResume)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-colors">
                    Download DOCX
                  </button>
                  <button onClick={() => downloadPdf(optimizedResume)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-colors">
                    Download PDF
                  </button>
                  <button onClick={handleSaveAll} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-colors">
                    Save Full Output
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Card 2 — Strategist's Notes (only shown when present) */}
          {!loading && strategistNotes && (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-sm p-5">
              <h3 className="font-semibold text-indigo-300 mb-3 text-sm uppercase tracking-wide">
                Strategist's Notes
              </h3>
              <pre className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed font-[inherit]">
                {strategistNotes}
              </pre>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Card 3 — ATS Score */}
            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
              <h3 className="font-semibold text-white mb-4">ATS Score</h3>
              {loading ? (
                <ATSSkeleton />
              ) : ats !== null ? (
                <div className="space-y-4">

                  {/* Score numbers */}
                  <div className="flex items-end justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">Before</p>
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-bold tabular-nums leading-none text-white/40">{ats.before.score}</span>
                        <span className="text-white/20 text-sm mb-0.5">/ 100</span>
                      </div>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">After</p>
                      <div className="flex items-end justify-end gap-1">
                        <span className={`text-4xl font-bold tabular-nums leading-none ${scoreColor(ats.after.score)}`}>{ats.after.score}</span>
                        <span className="text-white/20 text-sm mb-0.5">/ 100</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bars */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-white/30 transition-all" style={{ width: `${ats.before.score}%` }} />
                    </div>
                    <svg className="w-4 h-4 text-white/20 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          ats.after.score >= 80 ? "bg-emerald-400" : ats.after.score >= 60 ? "bg-amber-400" : "bg-red-400"
                        }`}
                        style={{ width: `${ats.after.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Delta badge */}
                  {ats.after.score > ats.before.score ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
                      +{ats.after.score - ats.before.score} improvement
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/30 text-xs font-medium">
                      No change
                    </span>
                  )}

                  {/* Matched keywords */}
                  {ats.after.matched.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Matched</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ats.after.matched.map((kw) => (
                          <span key={kw} className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Still missing keywords */}
                  {ats.after.missing.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Still Missing</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ats.after.missing.map((kw) => (
                          <span key={kw} className="px-2 py-0.5 text-xs rounded-full bg-red-500/15 text-red-300 border border-red-500/20">{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : null}
            </div>

            {/* Card 4 — Power Verbs */}
            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
              <h3 className="font-semibold text-white mb-4">Power Verbs</h3>
              {loading ? (
                <VerbsSkeleton />
              ) : verbs !== null ? (
                <div className="flex flex-wrap gap-2">
                  {verbs.map((verb) => (
                    <span key={verb} className="px-3 py-1.5 text-sm font-medium rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">{verb}</span>
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
