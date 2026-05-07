import { useState } from "react";
import { clearAllContacts } from "../services/storage";

const SESSION_KEY   = "re:api-key";
const SKILLS_KEY    = "re:skills-override";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: Props) {
  // Initialise from sessionStorage; never expose env-var key
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
    localStorage.removeItem(SKILLS_KEY);
    setSkillsDone(true);
    setTimeout(() => setSkillsDone(false), 3000);
  };

  return (
    <>
      {/* Backdrop — only rendered when open so it never intercepts clicks */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 z-50 bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col transform transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="font-semibold text-gray-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
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
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              API Key
            </h3>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                import.meta.env.VITE_ANTHROPIC_KEY
                  ? "Using VITE_ANTHROPIC_KEY env var"
                  : "sk-ant-..."
              }
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleSaveKey}
              className="w-full py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {keySaved ? "✓ Saved" : "Update key"}
            </button>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Stored in{" "}
              <code className="font-mono text-[11px]">sessionStorage</code>{" "}
              — clears automatically when the tab is closed.
            </p>
          </section>

          <hr className="border-gray-100 dark:border-gray-700" />

          {/* ── Skills ──────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Skills Profile
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Clears the saved custom skills JSON. The Optimizer will reload{" "}
              <code className="font-mono text-[11px]">/skills.json</code> the next time
              you open that tab.
            </p>
            <button
              onClick={handleResetSkills}
              className="w-full py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {skillsDone ? "✓ Reset — switch tabs to apply" : "Reset skills to default"}
            </button>
          </section>

          <hr className="border-gray-100 dark:border-gray-700" />

          {/* ── Tracker data ────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Tracker Data
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Permanently deletes all saved contacts from{" "}
              <code className="font-mono text-[11px]">localStorage</code>.
            </p>

            {clearStep === "done" && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ All contacts cleared.
              </p>
            )}

            <button
              onClick={handleClear}
              className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                clearStep === "confirm"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              }`}
            >
              {clearStep === "confirm" ? "Tap again to confirm" : "Clear all tracker data"}
            </button>

            {clearStep === "confirm" && (
              <button
                onClick={() => setClearStep("idle")}
                className="w-full py-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
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
