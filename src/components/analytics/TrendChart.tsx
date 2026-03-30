"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type SeriesPoint = {
  label: string;
  created: number;
  calls: number;
  emails: number;
  total: number;
};

type Props = {
  points: SeriesPoint[];
  totals: {
    inserted: number;
    calls: number;
    emails: number;
    totalContacts: number;
  };
};

const SERIES = [
  { key: "created", name: "Contatti inseriti", color: "#22d3ee", total: "inserted" },
  { key: "calls", name: "Chiamate", color: "#60a5fa", total: "calls" },
  { key: "emails", name: "Email", color: "#e879f9", total: "emails" },
  { key: "total", name: "Totale contatti", color: "#34d399", total: "totalContacts" },
] as const;

function formatDateLabel(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function TrendChart({ points, totals }: Props) {
  const [activeSeries, setActiveSeries] = useState({
    created: true,
    calls: true,
    emails: true,
    total: true,
  });

  const toggle = (key: keyof typeof activeSeries) =>
    setActiveSeries((prev) => ({ ...prev, [key]: !prev[key] }));

  // Limita etichette X a ~15 per leggibilità
  const step = Math.max(1, Math.floor(points.length / 15));
  const data = points.map((p, i) => ({
    ...p,
    displayLabel: i % step === 0 || i === points.length - 1 ? formatDateLabel(p.label) : "",
  }));

  return (
    <div className="glass-panel p-4 md:p-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm text-white/70">Trend operativo</h3>
          <p className="text-xs text-white/45 mt-1">
            Andamento giornaliero di inserimenti e attività contatto.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {SERIES.map((s) => (
            <button
              key={s.key}
              className={`px-2 py-1 rounded-full border flex items-center gap-1 transition-opacity ${
                activeSeries[s.key] ? "opacity-100" : "opacity-40"
              }`}
              style={{
                borderColor: `${s.color}66`,
                backgroundColor: `${s.color}1a`,
                color: s.color,
              }}
              onClick={() => toggle(s.key)}
              type="button"
            >
              {s.name}: {totals[s.total]}
              <span className="ml-1">{activeSeries[s.key] ? "×" : "+"}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="displayLabel"
              tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a2e",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "12px",
              }}
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload;
                return p
                  ? new Date(`${p.label}T00:00:00`).toLocaleDateString("it-IT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                    })
                  : "";
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}
            />
            {SERIES.map((s) =>
              activeSeries[s.key] ? (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={s.key === "total" ? 2.5 : 2}
                  dot={false}
                  activeDot={{ r: 4, fill: s.color }}
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
