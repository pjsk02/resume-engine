import { useState } from "react";
import { callLLM } from "../services/llm";

// ─── Constants ────────────────────────────────────────────────────────────────

const RECIPIENT_TYPES = ["Recruiter", "Hiring Manager", "Employee", "Custom"] as const;
type RecipientType = (typeof RECIPIENT_TYPES)[number];

const TONES = ["Professional", "Warm", "Concise"] as const;
type Tone = (typeof TONES)[number];

const fieldCls =
  "w-full rounded-lg border border-gray-200 dark:border-gray-700 " +
  "bg-white dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 " +
  "px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function BodySkeleton() {
  const widths = ["100%", "92%", "100%", "78%", "100%", "88%", "65%", "100%", "72%"];
  return (
    <div className="animate-pulse space-y-2">
      {widths.map((w, i) => (
        <div key={i} className="h-3 bg-gray-200 dark:bg-gray-700 rounded" style={{ width: w }} />
      ))}
    </div>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EmailComposer() {
  const [recipientType, setRecipientType] = useState<RecipientType>("Recruiter");
  const [customRecipient, setCustomRecipient] = useState("");
  const [tone, setTone] = useState<Tone>("Professional");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");

  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const effectiveRecipient =
    recipientType === "Custom" ? customRecipient.trim() || "contact" : recipientType;

  const canGenerate =
    company.trim() &&
    role.trim() &&
    (recipientType !== "Custom" || customRecipient.trim());

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setRan(true);
    setError(null);
    setSubject("");
    setBody("");

    const system =
      `Write a cold outreach email to a ${effectiveRecipient} at ${company} ` +
      `about the ${role} role. Tone: ${tone}. Sign off as the user. ` +
      `Output subject line and body separated by '---BODY---'.`;

    try {
      const raw = await callLLM("Generate the email.", system, 1024);
      const sep = raw.indexOf("---BODY---");
      if (sep === -1) {
        setSubject("");
        setBody(raw.trim());
      } else {
        setSubject(
          raw.slice(0, sep).replace(/^subject[:\s]*/i, "").trim(),
        );
        setBody(raw.slice(sep + 10).trim());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* ── Dropdowns row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Recipient type</label>
          <select
            value={recipientType}
            onChange={(e) => setRecipientType(e.target.value as RecipientType)}
            className={fieldCls}
          >
            {RECIPIENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Tone</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            className={fieldCls}
          >
            {TONES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Custom recipient input (shown only when Custom selected) */}
      {recipientType === "Custom" && (
        <div>
          <label className={labelCls}>Custom recipient title</label>
          <input
            type="text"
            value={customRecipient}
            onChange={(e) => setCustomRecipient(e.target.value)}
            placeholder="e.g. VP of Engineering"
            className={fieldCls}
          />
        </div>
      )}

      {/* ── Company + Role row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Company</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Corp"
            className={fieldCls}
          />
        </div>
        <div>
          <label className={labelCls}>Role</label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Senior Software Engineer"
            className={fieldCls}
          />
        </div>
      </div>

      {/* ── Generate button ───────────────────────────────────────────────── */}
      <button
        onClick={handleGenerate}
        disabled={loading || !canGenerate}
        className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
      >
        {loading ? (
          <span className="inline-flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Generating…
          </span>
        ) : (
          "Generate"
        )}
      </button>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {ran && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-5">

          {/* Subject line */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelCls + " mb-0"}>Subject</label>
              {!loading && subject && <CopyButton text={subject} />}
            </div>
            {loading ? (
              <div className="animate-pulse h-9 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            ) : (
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject line will appear here…"
                className={fieldCls}
              />
            )}
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelCls + " mb-0"}>Body</label>
              {!loading && body && <CopyButton text={body} />}
            </div>
            {loading ? (
              <BodySkeleton />
            ) : (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Email body will appear here…"
                rows={12}
                className={fieldCls + " resize-y font-[inherit]"}
              />
            )}
          </div>

        </div>
      )}

    </div>
  );
}
