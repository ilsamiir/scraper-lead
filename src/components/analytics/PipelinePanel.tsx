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
        <h3 className="text-sm text-white/70 mb-3">Pipeline per stato</h3>
        <div className="space-y-2">
          {Object.entries(byStatus).map(([status, value]) => (
            <div key={status} className="flex items-center gap-2">
              <span className="text-xs text-white/40 w-36 truncate">{status}</span>
              <div className="h-2 rounded-full bg-white/10 flex-1 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-cyan-400"
                  style={{ width: `${(value / maxStatus) * 100}%` }}
                />
              </div>
              <span className="text-xs text-white/60 w-7 text-right">{value}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 mt-4 pt-3">
          <div className="text-xs text-white/50 mb-2">Canali contatto</div>
          <div className="flex flex-wrap gap-2 text-xs">
            {CONTACT_METHODS.map((method) => (
              <span
                key={method}
                className="px-2 py-1 rounded-full border border-white/15 bg-white/5 text-white/75"
              >
                {method}: {byMethod[method] || 0}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Funnel conversione con drop-off */}
      <div className="glass-panel p-4">
        <h3 className="text-sm text-white/70 mb-3">Funnel conversione</h3>
        <div className="space-y-3">
          {funnelWithDrop.map((stage, i) => (
            <div key={stage.name}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-white/60">{stage.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{stage.value}</span>
                  {i > 0 && stage.dropOff > 0 && (
                    <span className="text-red-300/70 text-[10px]">-{stage.dropOff}%</span>
                  )}
                </div>
              </div>
              <div className="h-3 rounded-full bg-white/10 overflow-hidden">
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
