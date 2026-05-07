import { useState, useEffect, useCallback } from "react";
import { getContacts, updateContact, type Contact, type ThreadEntry } from "../services/storage";
import { callLLM } from "../services/llm";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<Contact["status"], string> = {
  connection_sent:    "Sent",
  replied:            "Replied",
  referral_requested: "Referral",
  interview:          "Interview",
  interviewing:       "Interview",
  "to-reach":         "To Reach",
  reached:            "Reached",
  closed:             "Closed",
};

const STATUS_BADGE: Record<Contact["status"], string> = {
  connection_sent:    "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  replied:            "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  referral_requested: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  interview:          "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  interviewing:       "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  "to-reach":         "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
  reached:            "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  closed:             "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500",
};

// Options shown in the status dropdown — spec-listed order
const STATUS_OPTIONS: Contact["status"][] = [
  "connection_sent",
  "replied",
  "referral_requested",
  "interview",
  "closed",
  "to-reach",
  "reached",
  "interviewing",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function threadTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

// ─── CopyButton ───────────────────────────────────────────────────────────────

function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${className}`}
    >
      {copied ? "✓" : "Copy"}
    </button>
  );
}

// ─── ContactCard ──────────────────────────────────────────────────────────────

function ContactCard({ contact, onUpdate }: { contact: Contact; onUpdate: () => void }) {
  const [expanded, setExpanded]     = useState(false);
  const [localStatus, setLocalStatus] = useState(contact.status);
  const [localNotes, setLocalNotes]   = useState(contact.notes ?? "");
  const [localGoal, setLocalGoal]     = useState(contact.goal ?? "");

  const [generating, setGenerating]   = useState(false);
  const [draft, setDraft]             = useState("");
  const [genError, setGenError]       = useState<string | null>(null);

  // Keep local status in sync if parent reloads (e.g. another card triggers reload)
  useEffect(() => { setLocalStatus(contact.status); }, [contact.status]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as Contact["status"];
    setLocalStatus(next);
    // SUPABASE MIGRATION: replace these calls with Supabase client equivalents
    updateContact(contact.id, { status: next });
    onUpdate();
  };

  const handleNotesBlur = () => {
    // SUPABASE MIGRATION: replace these calls with Supabase client equivalents
    updateContact(contact.id, { notes: localNotes });
  };

  const handleGoalBlur = () => {
    // SUPABASE MIGRATION: replace these calls with Supabase client equivalents
    updateContact(contact.id, { goal: localGoal });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    setDraft("");

    const threadHistory =
      (contact.thread ?? []).length > 0
        ? (contact.thread ?? [])
            .map((e) => `[${e.direction === "sent" ? "You" : "Them"}]: ${e.message}`)
            .join("\n")
        : "(no prior messages)";

    const goalClause = localGoal.trim()
      ? `The goal is ${localGoal}.`
      : "";

    try {
      const result = await callLLM(
        `You are helping someone follow up with a professional contact. ` +
        `Here is the conversation history:\n${threadHistory}\n` +
        `${goalClause} Write a short, natural follow-up message. Output only the message.`,
        undefined,
        512,
      );
      setDraft(result.trim());
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setGenerating(false);
    }
  };

  const handleAddToThread = () => {
    if (!draft.trim()) return;
    const entry: ThreadEntry = {
      id: crypto.randomUUID(),
      message: draft.trim(),
      timestamp: new Date().toISOString(),
      direction: "sent",
    };
    // SUPABASE MIGRATION: replace these calls with Supabase client equivalents
    updateContact(contact.id, {
      thread: [...(contact.thread ?? []), entry],
    });
    setDraft("");
    onUpdate();
  };

  const thread = contact.thread ?? [];

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">

      {/* ── Card header ───────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors select-none"
        onClick={() => setExpanded((p) => !p)}
      >
        {/* Initials avatar */}
        <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-semibold flex-shrink-0">
          {initials(contact.name)}
        </div>

        {/* Name + company */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{contact.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{contact.company || "—"}</p>
        </div>

        {/* Status select — stopPropagation so click doesn't toggle expand */}
        <select
          value={localStatus}
          onChange={handleStatusChange}
          onClick={(e) => e.stopPropagation()}
          className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${STATUS_BADGE[localStatus]}`}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>

        {/* Last updated */}
        <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block w-16 text-right flex-shrink-0">
          {relativeDate(contact.updatedAt)}
        </span>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* ── Expanded body ─────────────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-4 space-y-5">

          {/* Goal */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Goal
            </label>
            <input
              type="text"
              value={localGoal}
              onChange={(e) => setLocalGoal(e.target.value)}
              onBlur={handleGoalBlur}
              placeholder="e.g. referral for SWE role, informational call…"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Original connection message */}
          {contact.message && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Connection message
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap">
                {contact.message}
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Notes
            </label>
            <textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add notes — saved automatically on blur"
              rows={3}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Thread ──────────────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Thread {thread.length > 0 && `(${thread.length})`}
            </p>

            {thread.length === 0 && !generating && !draft && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">No messages yet.</p>
            )}

            {/* Thread entries */}
            {thread.length > 0 && (
              <div className="space-y-3 mb-4">
                {thread.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex gap-2 ${entry.direction === "sent" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[82%] space-y-1">
                      <div
                        className={`rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                          entry.direction === "sent"
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {entry.message}
                      </div>
                      <p className={`text-[11px] text-gray-400 ${entry.direction === "sent" ? "text-right" : ""}`}>
                        {entry.direction === "sent" ? "Sent" : "Received"} · {threadTime(entry.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Generate follow-up */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Generating…
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Generate follow-up
                </>
              )}
            </button>

            {genError && (
              <p className="mt-2 text-xs text-red-500">{genError}</p>
            )}

            {/* Draft message */}
            {draft && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex gap-2">
                  <CopyButton text={draft} />
                  <button
                    onClick={handleAddToThread}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                  >
                    Add to thread
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

// ─── Tracker (default export) ─────────────────────────────────────────────────

export default function Tracker() {
  const [contacts, setContacts] = useState<Contact[]>([]);

  const reload = useCallback(() => {
    // SUPABASE MIGRATION: replace these calls with Supabase client equivalents
    const all = getContacts().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    setContacts(all);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // ── Summary counts ──────────────────────────────────────────────────────────
  const total      = contacts.length;
  const replied    = contacts.filter((c) => c.status === "replied").length;
  const interviews = contacts.filter(
    (c) => c.status === "interview" || c.status === "interviewing",
  ).length;

  return (
    <div className="space-y-5">

      {/* Summary bar */}
      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 shadow-sm">
        <span>
          <span className="font-semibold text-gray-900 dark:text-white">{total}</span>{" "}
          {total === 1 ? "contact" : "contacts"}
        </span>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{replied}</span>{" "}
          replied
        </span>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <span>
          <span className="font-semibold text-amber-500">{interviews}</span>{" "}
          {interviews === 1 ? "interview" : "interviews"}
        </span>
        <button
          onClick={reload}
          title="Refresh"
          className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Contact list */}
      {total === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          <p className="text-sm">No contacts yet.</p>
          <p className="text-xs mt-1">Save one from the <span className="font-medium">Outreach</span> tab.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onUpdate={reload}
            />
          ))}
        </div>
      )}

    </div>
  );
}
