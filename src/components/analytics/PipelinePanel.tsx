"use client";

import { CONTACT_METHODS } from "@/lib/types";

type Props = {
  byStatus: Record<string, number>;
  byMethod: Record<string, number>;
  funnelData: Array<{ name: string; value: number }>;
};

export function PipelinePanel({ byStatus, byMethod, funnelData }: Props) {
  const maxStatus = Math.max(1, ...Object.values(byStatus));

  // Funnel: calcola drop-off %
  const funnelWithDrop = funnelData.map((stage, i) => {
    const prev = i > 0 ? funnelData[i - 1].value : stage.value;
    const dropOff = prev > 0 ? Math.round(((prev - stage.value) / prev) * 100) : 0;
    return { ...stage, dropOff };
  });

  const maxFunnel = Math.max(1, ...funnelData.map((d) => d.value));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Pipeline per stato */}
      <div className="glass-panel p-4">
        <h3 className="mb-3 text-sm text-brand-text">Pipeline per stato</h3>
        <div className="space-y-2">
          {Object.entries(byStatus).map(([status, value]) => (
            <div key={status} className="flex items-center gap-2">
              <span className="w-36 truncate text-xs font-medium text-brand-muted">{status}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-background dark:bg-[#0F1220]">
                <div
                  className="h-2 rounded-full bg-cyan-400"
                  style={{ width: `${(value / maxStatus) * 100}%` }}
                />
              </div>
              <span className="w-7 text-right text-xs text-brand-text">{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-brand-border pt-3">
          <div className="mb-2 text-xs font-medium text-brand-muted">Canali contatto</div>
          <div className="flex flex-wrap gap-2 text-xs">
            {CONTACT_METHODS.map((method) => (
              <span
                key={method}
                className="rounded-full border border-brand-border bg-brand-surface px-2 py-1 font-medium text-brand-text shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
              >
                {method}: {byMethod[method] || 0}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Funnel conversione con drop-off */}
      <div className="glass-panel p-4">
        <h3 className="mb-3 text-sm text-brand-text">Funnel conversione</h3>
        <div className="space-y-3">
          {funnelWithDrop.map((stage, i) => (
            <div key={stage.name}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-brand-muted">{stage.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-brand-text">{stage.value}</span>
                  {i > 0 && stage.dropOff > 0 && (
                    <span className="text-[10px] text-red-500 dark:text-red-300">-{stage.dropOff}%</span>
                  )}
                </div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-brand-background dark:bg-[#0F1220]">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{
                    width: `${(stage.value / maxFunnel) * 100}%`,
                    backgroundColor:
                      stage.name === "Convertiti"
                        ? "#34d399"
                        : stage.name === "Da richiamare"
                        ? "#fbbf24"
                        : stage.name === "In lavorazione"
                        ? "#60a5fa"
                        : "#6b7280",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
