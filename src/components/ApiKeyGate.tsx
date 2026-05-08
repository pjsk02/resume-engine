import { useState, type ReactNode } from "react";

const SESSION_KEY = "re:api-key";

function hasKey(): boolean {
  return !!(
    import.meta.env.VITE_ANTHROPIC_KEY  ||
    import.meta.env.VITE_OPENROUTER_KEY ||
    sessionStorage.getItem(SESSION_KEY)
  );
}

function activeProvider(): "anthropic" | "openrouter" | null {
  if (import.meta.env.VITE_ANTHROPIC_KEY)  return "anthropic";
  if (import.meta.env.VITE_OPENROUTER_KEY) return "openrouter";
  return null;
}

export default function ApiKeyGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(hasKey);
  const [draft, setDraft]       = useState("");
  const [error, setError]       = useState("");

  if (unlocked) return <>{children}</>;

  const handleSave = () => {
    const key = draft.trim();
    if (!key) { setError("Key cannot be empty."); return; }
    if (!key.startsWith("sk-ant-") && !key.startsWith("sk-or-")) {
      setError("Key must start with sk-ant- (Anthropic) or sk-or- (OpenRouter).");
      return;
    }
    sessionStorage.setItem(SESSION_KEY, key);
    setUnlocked(true);
  };

  const provider = activeProvider();

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-5">

        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold text-white">API key required</h2>
          <p className="text-sm text-white/50">
            Paste an{" "}
            <span className="text-white/70">Anthropic</span>{" "}
            (<code className="font-mono text-[11px] bg-white/10 text-white/60 px-1 rounded">sk-ant-…</code>)
            {" "}or{" "}
            <span className="text-white/70">OpenRouter</span>{" "}
            (<code className="font-mono text-[11px] bg-white/10 text-white/60 px-1 rounded">sk-or-…</code>)
            {" "}key. Stored in{" "}
            <code className="font-mono text-[11px] bg-white/10 text-white/60 px-1 rounded">sessionStorage</code>
            {" "}only — cleared when the tab closes.
          </p>
        </div>

        <div className="space-y-1.5">
          <input
            type="password"
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="sk-ant-… or sk-or-…"
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
          <code className="font-mono text-[11px]">VITE_ANTHROPIC_KEY</code>
          {" "}or{" "}
          <code className="font-mono text-[11px]">VITE_OPENROUTER_KEY</code>
          {" "}in <code className="font-mono text-[11px]">.env</code> to skip this prompt.
          {provider && (
            <span className="block mt-1 text-white/20">
              Active env var: {provider === "anthropic" ? "VITE_ANTHROPIC_KEY" : "VITE_OPENROUTER_KEY"}
            </span>
          )}
        </p>

      </div>
    </div>
  );
}
