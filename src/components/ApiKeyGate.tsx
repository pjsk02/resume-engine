import { useState, type ReactNode } from "react";

const SESSION_KEY = "re:api-key";

function hasKey(): boolean {
  return !!(import.meta.env.VITE_ANTHROPIC_KEY || sessionStorage.getItem(SESSION_KEY));
}

export default function ApiKeyGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(hasKey);
  const [draft, setDraft]       = useState("");
  const [error, setError]       = useState("");

  if (unlocked) return <>{children}</>;

  const handleSave = () => {
    const key = draft.trim();
    if (!key) { setError("Key cannot be empty."); return; }
    if (!key.startsWith("sk-ant-")) { setError("Key should start with sk-ant-"); return; }
    sessionStorage.setItem(SESSION_KEY, key);
    setUnlocked(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-5">

        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Anthropic API key required
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your key is stored in{" "}
            <code className="font-mono text-[11px] bg-gray-100 dark:bg-gray-700 px-1 rounded">
              sessionStorage
            </code>{" "}
            only — never persisted to disk or sent anywhere except directly to Anthropic.
          </p>
        </div>

        <div className="space-y-1.5">
          <input
            type="password"
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="sk-ant-..."
            autoFocus
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <button
          onClick={handleSave}
          className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors"
        >
          Save and continue
        </button>

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          Or set{" "}
          <code className="font-mono text-[11px]">VITE_ANTHROPIC_KEY</code>{" "}
          in a <code className="font-mono text-[11px]">.env</code> file to skip this prompt.
        </p>

      </div>
    </div>
  );
}
