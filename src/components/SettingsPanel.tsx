import { useState } from "react";
import { clearAllContacts } from "../services/storage";

const SESSION_KEY       = "re:api-key";
const SYSTEM_PROMPT_KEY = "re:system-prompt-override";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: Props) {
  const [apiKey,    setApiKey]    = useState(() => sessionStorage.getItem(SESSION_KEY) ?? "");
  const [keySaved,  setKeySaved]  = useState(false);

  const [clearStep, setClearStep] = useState<"idle" | "confirm" | "done">("idle");
  const [skillsDone, setSkillsDone] = useState(false);

  const handleSaveKey = () => {
    const trimmed = apiKey.trim();
    if (trimmed) sessionStorage.setItem(SESSION_KEY, trimmed);
    else         sessionStorage.removeItem(SESSION_KEY);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const handleClear = () => {
    if (clearStep === "idle")    { setClearStep("confirm"); return; }
    if (clearStep === "confirm") {
      clearAllContacts();
      setClearStep("done");
      setTimeout(() => setClearStep("idle"), 3000);
    }
  };

  const handleResetSkills = () => {
    localStorage.removeItem(SYSTEM_PROMPT_KEY);
    setSkillsDone(true);
    setTimeout(() => setSkillsDone(false), 3000);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-80 z-50 bg-gray-950/90 border-l border-white/10 backdrop-blur-md flex flex-col shadow-2xl transform transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <h2 className="font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
            aria-label="Close settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* ── API Key ─────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wide">
              API Key
            </h3>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                import.meta.env.VITE_ANTHROPIC_KEY
                  ? "Using VITE_ANTHROPIC_KEY (Anthropic)"
                  : import.meta.env.VITE_OPENROUTER_KEY
                  ? "Using VITE_OPENROUTER_KEY (OpenRouter)"
                  : "sk-ant-… or sk-or-…"
              }
              className="w-full rounded-lg border border-white/10 bg-black/40 text-white placeholder:text-white/30 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleSaveKey}
              className="w-full py-2 rounded-lg border border-white/10 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              {keySaved ? "✓ Saved" : "Update key"}
            </button>
            <p className="text-xs text-white/30">
              Accepts{" "}
              <code className="font-mono text-[11px]">sk-ant-…</code> (Anthropic) or{" "}
              <code className="font-mono text-[11px]">sk-or-…</code> (OpenRouter).
              Stored in <code className="font-mono text-[11px]">sessionStorage</code>{" "}
              — clears when the tab closes.
            </p>
          </section>

          <hr className="border-white/10" />

          {/* ── Skills ──────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wide">
              System Prompt
            </h3>
            <p className="text-xs text-white/40">
              Clears any custom system prompt. The Optimizer will reload{" "}
              <code className="font-mono text-[11px]">ResumeSkill.md</code> the next
              time you open that tab.
            </p>
            <button
              onClick={handleResetSkills}
              className="w-full py-2 rounded-lg border border-white/10 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              {skillsDone ? "✓ Reset — switch tabs to apply" : "Reset to default prompt"}
            </button>
          </section>

          <hr className="border-white/10" />

          {/* ── Tracker data ────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wide">
              Tracker Data
            </h3>
            <p className="text-xs text-white/40">
              Permanently deletes all saved contacts from{" "}
              <code className="font-mono text-[11px]">localStorage</code>.
            </p>

            {clearStep === "done" && (
              <p className="text-xs text-emerald-400 font-medium">
                ✓ All contacts cleared.
              </p>
            )}

            <button
              onClick={handleClear}
              className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                clearStep === "confirm"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "border border-red-500/30 text-red-400 hover:bg-red-500/10"
              }`}
            >
              {clearStep === "confirm" ? "Tap again to confirm" : "Clear all tracker data"}
            </button>

            {clearStep === "confirm" && (
              <button
                onClick={() => setClearStep("idle")}
                className="w-full py-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                Cancel
              </button>
            )}
          </section>

        </div>
      </div>
    </>
  );
}
