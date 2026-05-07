import { useState } from "react";
import Background from "../components/Background";
import Optimizer from "../components/Optimizer";
import Outreach from "./Outreach";

type Tab = "Optimizer" | "Outreach" | "Tracker";

const TABS: Tab[] = ["Optimizer", "Outreach", "Tracker"];

export default function IndexPage() {
  const [active, setActive] = useState<Tab>("Optimizer");

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900">
      <Background />
      <div className="relative z-10">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <span className="font-semibold text-gray-900 dark:text-white tracking-tight">
              resume-engine
            </span>
            <nav className="flex gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActive(tab)}
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
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {active === "Optimizer" && (
          <section>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Resume Optimizer
            </h1>
            <Optimizer />
          </section>
        )}

        {active === "Outreach" && (
          <section>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Outreach
            </h1>
            <Outreach />
          </section>
        )}

        {active === "Tracker" && (
          <section>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Contact Tracker
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Keep track of everyone you've reached out to and where things
              stand.
            </p>
          </section>
        )}
      </main>
      </div>
    </div>
  );
}
