"use client";

import { Phone, Mail } from "lucide-react";
import type { SavedClient } from "@/lib/types";

type Props = {
  client: SavedClient;
  onClose: () => void;
};

export function ClientDetail({ client, onClose }: Props) {
  const rows: Array<{ label: string; value: React.ReactNode }> = [
    {
      label: "Telefono",
      value: client.phone ? (
        <span className="inline-flex items-center gap-1"><Phone className="w-4 h-4" />{client.phone}</span>
      ) : null,
    },
    {
      label: "Email",
      value: client.email ? (
        <span className="inline-flex items-center gap-1"><Mail className="w-4 h-4" />{client.email}</span>
      ) : null,
    },
    {
      label: "Città",
      value: `${client.city || "-"} ${client.province ? `(${client.province})` : ""}`,
    },
    { label: "Settore", value: client.sector },
    { label: "Fatturato stim.", value: client.estimated_revenue },
    { label: "Status", value: client.status },
    {
      label: "Ultimo contatto",
      value: client.last_contact_date
        ? new Date(client.last_contact_date).toLocaleDateString("it-IT")
        : null,
    },
    {
      label: "Valore conversione",
      value: client.converted_value
        ? `€${client.converted_value.toLocaleString("it-IT")}`
        : null,
    },
    { label: "Note", value: client.notes },
  ];

  return (
    <div className="glass-panel p-6 max-w-lg mx-auto border border-brand-accent/40 shadow-lg animate-fade-in">
      <div className="flex justify-between items-center mb-2">
        <div className="text-lg font-semibold text-brand-accent">
          {client.business_name || "Cliente"}
        </div>
        <button
          onClick={onClose}
          className="text-xs text-white/50 hover:text-white/80 px-2 py-1 rounded"
        >
          Chiudi
        </button>
      </div>
      <table className="w-full text-sm text-white/80">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="py-1 pr-2 text-white/60">{row.label}</td>
              <td className="py-1">
                {row.value || <span className="text-white/30">-</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
