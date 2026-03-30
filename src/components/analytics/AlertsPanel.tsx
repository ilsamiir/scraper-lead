"use client";

import { AlertTriangle } from "lucide-react";

type Props = {
  noRecentContact: number;
  overdueFollowUp: number;
};

export function AlertsPanel({ noRecentContact, overdueFollowUp }: Props) {
  const hasAlerts = noRecentContact > 0 || overdueFollowUp > 0;

  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm text-white/70 mb-3 flex items-center gap-2">
        <AlertTriangle className={`w-4 h-4 ${hasAlerts ? "text-amber-300" : "text-white/30"}`} />
        SLA & Alert
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-white/60">Lead senza contatto recente (&gt;48h)</span>
          <span className={`font-medium ${noRecentContact > 0 ? "text-amber-300" : ""}`}>
            {noRecentContact}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">Follow-up scaduti</span>
          <span className={`font-medium ${overdueFollowUp > 0 ? "text-red-300" : ""}`}>
            {overdueFollowUp}
          </span>
        </div>
      </div>
    </div>
  );
}
