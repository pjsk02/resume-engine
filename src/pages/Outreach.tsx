import { useState } from "react";
import EmailComposer from "../components/EmailComposer";
import ConnectionRequest from "../components/ConnectionRequest";

type SubTab = "Email" | "Connection Request";
const TABS: SubTab[] = ["Email", "Connection Request"];

export default function Outreach() {
  const [active, setActive] = useState<SubTab>("Email");

  return (
    <div className="space-y-6">
      {/* Sub-tab bar — underline style to distinguish from main pill tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 gap-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={[
              "pb-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              active === tab
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
            ].join(" ")}
          >
            {tab}
          </button>
        ))}
      </div>

      {active === "Email" && <EmailComposer />}
      {active === "Connection Request" && <ConnectionRequest />}
    </div>
  );
}
