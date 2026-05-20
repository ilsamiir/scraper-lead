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
    "text-slate-700 dark:text-brand-muted border-slate-300 dark:border-brand-border bg-slate-100 dark:bg-brand-surface";

  return (
    <span className={`text-xs px-2 py-1 rounded-full border ${color}`}>
      Score {score}
    </span>
  );
}

export function ScoringPanel({ topPriority, onSelectClient, selectedClientId }: Props) {
  return (
    <div className="glass-panel p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm text-brand-text">
        <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-300" /> Lead scoring - Priorità web agency
      </h3>
      <p className="mb-3 text-xs text-brand-muted">
        Score basato su: opportunità digitale, settore, recency, engagement, dati contatto.
      </p>
      <div className="space-y-2">
        {topPriority.map(({ client, score }) => {
          const breakdown = scoreClient(client, 0, new Date());
          return (
            <div
              key={client.id}
              className={
                "flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition " +
                (selectedClientId === client.id
                  ? "border-brand-accent bg-brand-accent/12 shadow-[0_0_0_1px_rgba(196,181,253,0.16)]"
                  : "border-brand-border bg-brand-surface hover:bg-brand-background/70 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]")
              }
              onClick={() => onSelectClient(client)}
            >
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium text-brand-text">
                  {client.business_name || "Cliente"}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-brand-muted">
                  <span>{client.city || "-"} {client.province ? `(${client.province})` : ""}</span>
                  {client.sector && (
                    <span className="rounded border border-brand-border bg-brand-background px-1.5 py-0.5 text-brand-text">
                      {client.sector}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-brand-muted">
                  {breakdown.opportunity > 15 && <span className="text-amber-700 dark:text-amber-300">Opp. digitale alta</span>}
                  {breakdown.sectorFit >= 15 && <span className="text-emerald-700 dark:text-emerald-300">Settore target</span>}
                  {breakdown.recency >= 20 && <span className="text-red-700 dark:text-red-300">Da ricontattare</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <div className="flex gap-1">
                  {client.phone && <Phone className="w-3 h-3 text-brand-muted" />}
                  {client.email && <Mail className="w-3 h-3 text-brand-muted" />}
                </div>
                <ScoreBadge score={score} />
              </div>
            </div>
          );
        })}
        {topPriority.length === 0 && (
          <div className="py-4 text-center text-xs text-brand-muted">Nessun lead nel segmento filtrato</div>
        )}
      </div>
    </div>
  );
}
