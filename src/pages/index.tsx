import { useState, useRef, useEffect } from "react";
import Optimizer from "../components/Optimizer";
import Outreach from "./Outreach";
import Tracker from "../components/Tracker";
import SettingsPanel from "../components/SettingsPanel";
import { ErrorBoundary } from "../components/ErrorBoundary";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "Optimizer" | "Outreach" | "Tracker";
const TABS: Tab[] = ["Optimizer", "Outreach", "Tracker"];
const TAB_STORE_KEY = "re:active-tab";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IndexPage() {
  const [active, setActive] = useState<Tab>(() => {
    const saved = localStorage.getItem(TAB_STORE_KEY);
    return (TABS as string[]).includes(saved ?? "") ? (saved as Tab) : "Optimizer";
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const navRef = useRef<HTMLElement>(null);

  // Persist active tab so it survives page refresh
  const switchTab = (tab: Tab) => {
    setActive(tab);
    localStorage.setItem(TAB_STORE_KEY, tab);
  };

  // Move focus to the newly active tab button after arrow-key navigation
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const btn = nav.querySelector<HTMLButtonElement>(`[data-tab="${active}"]`);
    btn?.focus();
  }, [active]);

  const handleNavKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const idx = TABS.indexOf(active);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      switchTab(TABS[(idx + 1) % TABS.length]);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      switchTab(TABS[(idx - 1 + TABS.length) % TABS.length]);
    } else if (e.key === "Home") {
      e.preventDefault();
      switchTab(TABS[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      switchTab(TABS[TABS.length - 1]);
    }
  };

  return (
    <>
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14 gap-4">

            <span className="font-semibold text-gray-900 dark:text-white tracking-tight flex-shrink-0">
              resume-engine
            </span>

            {/* Tab nav — roving tabindex + arrow key switching */}
            <nav
              ref={navRef}
              role="tablist"
              aria-label="Main navigation"
              onKeyDown={handleNavKeyDown}
              className="flex gap-1"
            >
              {TABS.map((tab) => (
                <button
                  key={tab}
                  data-tab={tab}
                  role="tab"
                  aria-selected={active === tab}
                  tabIndex={active === tab ? 0 : -1}
                  onClick={() => switchTab(tab)}
                  className={[
                    "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                    active === tab
                      ? "bg-indigo-600 text-white"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
                  ].join(" ")}
                >
                  {tab}
                </button>
              ))}
            </nav>

            {/* Settings icon */}
            <button
              onClick={() => setSettingsOpen((p) => !p)}
              aria-label="Open settings"
              className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

          </div>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 py-8">

        {active === "Optimizer" && (
          <section role="tabpanel" aria-labelledby="tab-Optimizer">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Resume Optimizer
            </h1>
            <ErrorBoundary label="Optimizer crashed — tap Retry to reload">
              <Optimizer />
            </ErrorBoundary>
          </section>
        )}

        {active === "Outreach" && (
          <section role="tabpanel" aria-labelledby="tab-Outreach">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Outreach
            </h1>
            <ErrorBoundary label="Outreach crashed — tap Retry to reload">
              <Outreach />
            </ErrorBoundary>
          </section>
        )}

        {active === "Tracker" && (
          <section role="tabpanel" aria-labelledby="tab-Tracker">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Contact Tracker
            </h1>
            <ErrorBoundary label="Tracker crashed — tap Retry to reload">
              <Tracker />
            </ErrorBoundary>
          </section>
        )}

      </main>
    </>
  );
}
