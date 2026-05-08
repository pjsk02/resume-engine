import { useState, type ReactNode } from "react";

const SESSION_KEY = "re:api-key";

function hasKey(): boolean {
  return !!(import.meta.env.VITE_OPENROUTER_KEY || sessionStorage.getItem(SESSION_KEY));
}

export default function ApiKeyGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(hasKey);
  const [draft, setDraft]       = useState("");
  const [error, setError]       = useState("");

  if (unlocked) return <>{children}</>;

  const handleSave = () => {
    const key = draft.trim();
    if (!key) { setError("Key cannot be empty."); return; }
    if (!key.startsWith("sk-or-")) { setError("Key should start with sk-or-"); return; }
    sessionStorage.setItem(SESSION_KEY, key);
    setUnlocked(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-5">

        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold text-white">
            OpenRouter API key required
          </h2>
          <p className="text-sm text-white/50">
            Free key from{" "}
            <span className="text-white/70">openrouter.ai</span>. Stored in{" "}
            <code className="font-mono text-[11px] bg-white/10 text-white/60 px-1 rounded">
              sessionStorage
            </code>{" "}
            only — never persisted to disk.
          </p>
        </div>

        <div className="space-y-1.5">
          <input
            type="password"
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="sk-or-..."
            autoFocus
            className="w-full rounded-lg border border-white/10 bg-black/40 text-white placeholder:text-white/30 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <button
          onClick={handleSave}
          className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors"
        >
          Save and continue
        </button>

        <p className="text-xs text-white/30 text-center">
          Or set{" "}
          <code className="font-mono text-[11px]">VITE_OPENROUTER_KEY</code>{" "}
          in a <code className="font-mono text-[11px]">.env</code> file to skip this prompt.
        </p>

      </div>
    </div>
  );
}
