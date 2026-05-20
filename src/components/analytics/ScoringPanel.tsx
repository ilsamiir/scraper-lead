"use client";

import { Target, Mail, Phone } from "lucide-react";
import type { SavedClient } from "@/lib/types";
import { scoreClient } from "@/lib/scoring";

type Props = {
  topPriority: Array<{ client: SavedClient; score: number }>;
  onSelectClient: (client: SavedClient) => void;
  selectedClientId: string | null;
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? "text-emerald-700 dark:text-emerald-300 border-emerald-400/30 bg-emerald-400/10" :
    score >= 40 ? "text-amber-700 dark:text-amber-300 border-amber-400/30 bg-amber-400/10" :
    "text-slate-700 dark:text-white/60 border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/5";

  return (
    <span className={`text-xs px-2 py-1 rounded-full border ${color}`}>
      Score {score}
    </span>
  );
}

export function ScoringPanel({ topPriority, onSelectClient, selectedClientId }: Props) {
  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm text-brand-text dark:text-white/70 mb-3 flex items-center gap-2">
        <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-300" /> Lead scoring - Priorità web agency
      </h3>
      <p className="text-xs text-slate-600 dark:text-white/40 mb-3">
        Score basato su: opportunità digitale, settore, recency, engagement, dati contatto.
      </p>
      <div className="space-y-2">
        {topPriority.map(({ client, score }) => {
          const breakdown = scoreClient(client, 0, new Date());
          return (
            <div
              key={client.id}
              className={
                "flex items-center justify-between text-sm border border-white/10 rounded-lg px-3 py-2 bg-white/[0.02] cursor-pointer transition hover:bg-white/[0.05] " +
                "dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] " +
                (selectedClientId === client.id
                  ? "bg-brand-accent/10 border-l-4 border-brand-accent"
                  : "border-brand-border bg-brand-surface hover:bg-brand-background/70")
              }
              onClick={() => onSelectClient(client)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-brand-text dark:text-white truncate">
                  {client.business_name || "Cliente"}
                </div>
                <div className="text-xs text-slate-600 dark:text-white/45 flex items-center gap-2 mt-0.5">
                  <span>{client.city || "-"} {client.province ? `(${client.province})` : ""}</span>
                  {client.sector && (
                    <span className="px-1.5 py-0.5 rounded surface-subtle dark:bg-white/5 border border-brand-border dark:border-white/10">
                      {client.sector}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-600 dark:text-white/35">
                  {breakdown.opportunity > 15 && <span className="text-amber-700 dark:text-amber-300">Opp. digitale alta</span>}
                  {breakdown.sectorFit >= 15 && <span className="text-emerald-700 dark:text-emerald-300">Settore target</span>}
                  {breakdown.recency >= 20 && <span className="text-red-700 dark:text-red-300">Da ricontattare</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <div className="flex gap-1">
                  {client.phone && <Phone className="w-3 h-3 text-brand-muted dark:text-white/30" />}
                  {client.email && <Mail className="w-3 h-3 text-brand-muted dark:text-white/30" />}
                </div>
                <ScoreBadge score={score} />
              </div>
            </div>
          );
        })}
        {topPriority.length === 0 && (
          <div className="text-xs text-brand-muted dark:text-white/40 text-center py-4">Nessun lead nel segmento filtrato</div>
        )}
      </div>
    </div>
  );
}
