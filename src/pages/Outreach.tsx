import { useState } from "react";
import EmailComposer from "../components/EmailComposer";
import ConnectionRequest from "../components/ConnectionRequest";

type SubTab = "Email" | "Connection Request";
const TABS: SubTab[] = ["Email", "Connection Request"];

export default function Outreach() {
  const [active, setActive] = useState<SubTab>("Email");

  return (
    <div className="space-y-6">
      {/* Sub-tab bar */}
      <div className="flex border-b border-white/10 gap-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={[
              "pb-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              active === tab
                ? "border-indigo-400 text-indigo-400"
                : "border-transparent text-white/40 hover:text-white/70",
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
