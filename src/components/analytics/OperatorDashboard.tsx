"use client";

import { Users, Phone, Mail, MessageSquare, TrendingUp } from "lucide-react";
import type { Operator } from "@/lib/types";

type OperatorStat = {
  operator: Operator;
  totalActivities: number;
  totalClients: number;
  convertiti: number;
  conversionRate: number;
  byMethod: Record<string, number>;
  totalValue: number;
};

type Props = {
  operatorStats: OperatorStat[];
};

const METHOD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  chiamata: Phone,
  email: Mail,
  messaggio: MessageSquare,
};

export function OperatorDashboard({ operatorStats }: Props) {
  if (operatorStats.length === 0) {
    return (
      <div className="glass-panel p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm text-brand-text">
          <Users className="w-4 h-4 text-brand-accent" /> Dashboard operatori
        </h3>
        <p className="py-6 text-center text-xs text-brand-muted">
          Nessun operatore configurato. Aggiungi operatori nella tabella &quot;operators&quot; per abilitare le statistiche individuali.
        </p>
      </div>
    );
  }

  const maxActivities = Math.max(1, ...operatorStats.map((s) => s.totalActivities));

  return (
    <div className="glass-panel p-4">
      <h3 className="mb-4 flex items-center gap-2 text-sm text-brand-text">
        <Users className="w-4 h-4 text-brand-accent" /> Dashboard operatori
      </h3>

      <div className="space-y-4">
        {operatorStats.map((stat) => (
          <div
            key={stat.operator.id}
            className="rounded-xl border border-brand-border bg-brand-surface p-4 dark:bg-[color:color-mix(in_srgb,var(--brand-surface)_94%,white_6%)]"
          >
            {/* Header operatore */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-medium text-brand-text">{stat.operator.name}</div>
                <div className="text-xs text-brand-muted">{stat.operator.role || "Operatore"}</div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-brand-muted">{stat.totalClients} clienti</span>
                <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                  <TrendingUp className="w-3 h-3" />
                  {stat.conversionRate}%
                </span>
                {stat.totalValue > 0 && (
                  <span className="text-emerald-700/80 dark:text-emerald-300/70">
                    €{stat.totalValue.toLocaleString("it-IT")}
                  </span>
                )}
              </div>
            </div>

            {/* Barra attività */}
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-background dark:bg-[#0F1220]">
                <div
                  className="h-2 rounded-full bg-brand-accent transition-all"
                  style={{ width: `${(stat.totalActivities / maxActivities) * 100}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs text-brand-text">
                {stat.totalActivities}
              </span>
            </div>

            {/* Breakdown per metodo */}
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(stat.byMethod)
                .filter(([, count]) => count > 0)
                .map(([method, count]) => {
                  const Icon = METHOD_ICONS[method];
                  return (
                    <span
                      key={method}
                      className="inline-flex items-center gap-1 rounded-full border border-brand-border bg-brand-surface px-2 py-1 font-medium text-brand-text"
                    >
                      {Icon && <Icon className="w-3 h-3" />}
                      {method}: {count}
                    </span>
                  );
                })}
              {stat.convertiti > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300">
                  Convertiti: {stat.convertiti}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
