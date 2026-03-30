"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Mail, Phone } from "lucide-react";
import type { SavedClient, Operator } from "@/lib/types";
import { CONTACT_METHODS } from "@/lib/types";
import { toDateInput } from "@/lib/date-utils";
import type { SupabaseClient } from "@supabase/supabase-js";

type Props = {
  filteredClients: SavedClient[];
  statuses: string[];
  operators: Operator[];
  supabase: SupabaseClient;
  onRefresh: () => Promise<void>;
  onSelectClient: (client: SavedClient) => void;
  selectedClientId: string | null;
};

export function BatchContactTool({
  filteredClients,
  statuses,
  operators,
  supabase,
  onRefresh,
  onSelectClient,
  selectedClientId,
}: Props) {
  const today = new Date();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchMethod, setBatchMethod] = useState("chiamata");
  const [batchStatus, setBatchStatus] = useState("unchanged");
  const [batchFollowUp, setBatchFollowUp] = useState(
    toDateInput(new Date(today.getTime() + 1000 * 60 * 60 * 24 * 7))
  );
  const [batchNotes, setBatchNotes] = useState("Contatto registrato da Analytics.");
  const [batchOperator, setBatchOperator] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Auto-detect metodo più frequente
  useEffect(() => {
    if (selectedIds.length === 0) return;
    const selected = filteredClients.filter((c) => selectedIds.includes(c.id));
    if (selected.length === 0) return;
    const freq: Record<string, number> = {};
    selected.forEach((c) => {
      const m = c.last_contact_method || "chiamata";
      freq[m] = (freq[m] || 0) + 1;
    });
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || "chiamata";
    setBatchMethod(top);
  }, [filteredClients, selectedIds]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredClients.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredClients.map((c) => c.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const runBatchContact = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    const nowIso = new Date().toISOString();

    const updates: Record<string, unknown> = {
      last_contact_method: batchMethod,
      last_contact_date: nowIso,
    };
    if (batchStatus !== "unchanged") updates.status = batchStatus;
    if (batchFollowUp) updates.follow_up_date = batchFollowUp;
    if (batchOperator) updates.operator_id = batchOperator;

    const { error: updateError } = await supabase
      .from("saved_clients")
      .update(updates)
      .in("id", selectedIds);

    if (updateError) {
      setSaving(false);
      setToast("Errore aggiornamento: " + updateError.message);
      setTimeout(() => setToast(null), 4000);
      return;
    }

    const historyRows = selectedIds.map((id) => ({
      client_id: id,
      contact_method: batchMethod,
      contact_date: nowIso,
      notes: batchNotes || "Contatto registrato da Analytics.",
      ...(batchOperator ? { operator_id: batchOperator } : {}),
    }));

    const { error: historyError } = await supabase
      .from("contact_history")
      .insert(historyRows);

    if (historyError) {
      setSaving(false);
      setToast("Clienti aggiornati ma errore storico: " + historyError.message);
      setTimeout(() => setToast(null), 4000);
      return;
    }

    await onRefresh();
    setSaving(false);
    setSelectedIds([]);
    setToast(`Contatto registrato su ${selectedIds.length} clienti.`);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm text-white/70 mb-3">Strumento contatto batch</h3>

      {/* Toast */}
      {toast && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-brand-accent/20 border border-brand-accent/30 text-sm text-white animate-fade-in">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 mb-4">
        <select
          value={batchMethod}
          onChange={(e) => setBatchMethod(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
        >
          {CONTACT_METHODS.filter((m) => m !== "nota").map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={batchStatus}
          onChange={(e) => setBatchStatus(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="unchanged">Status invariato</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <input
          type="date"
          value={batchFollowUp}
          onChange={(e) => setBatchFollowUp(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
        />

        {operators.length > 0 && (
          <select
            value={batchOperator}
            onChange={(e) => setBatchOperator(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">Operatore</option>
            {operators.map((op) => <option key={op.id} value={op.id}>{op.name}</option>)}
          </select>
        )}

        <input
          value={batchNotes}
          onChange={(e) => setBatchNotes(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white lg:col-span-2"
          placeholder="Note contatto"
        />
      </div>

      <div className="flex items-center justify-between mb-3 text-sm">
        <label className="flex items-center gap-2 text-white/70">
          <input
            type="checkbox"
            checked={selectedIds.length > 0 && selectedIds.length === filteredClients.length}
            onChange={toggleSelectAll}
            className="rounded border-white/20 bg-black/50"
          />
          Seleziona tutti ({filteredClients.length})
        </label>
        <button
          onClick={runBatchContact}
          disabled={saving || selectedIds.length === 0}
          className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          {saving ? "Salvataggio..." : `Registra contatto (${selectedIds.length})`}
        </button>
      </div>

      <div className="max-h-72 overflow-auto border border-white/10 rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/60 sticky top-0">
            <tr>
              <th className="px-3 py-2 w-10"></th>
              <th className="px-3 py-2 text-left">Cliente</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Contatti</th>
              <th className="px-3 py-2 text-left">Ultimo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredClients.map((c) => (
              <tr
                key={c.id}
                className={
                  "hover:bg-white/[0.06] cursor-pointer transition " +
                  (selectedClientId === c.id ? "bg-brand-accent/10 border-l-4 border-brand-accent" : "")
                }
                onClick={() => onSelectClient(c)}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onChange={(e) => { e.stopPropagation(); toggleSelectOne(c.id); }}
                    className="rounded border-white/20 bg-black/50"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium text-white">{c.business_name || "Cliente"}</div>
                  <div className="text-xs text-white/40">
                    {c.city || "-"} {c.province ? `(${c.province})` : ""}
                  </div>
                </td>
                <td className="px-3 py-2 text-white/70">{c.status || "Da contattare"}</td>
                <td className="px-3 py-2 text-white/70">
                  <div className="flex gap-2">
                    {c.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" />{c.phone}
                      </span>
                    )}
                    {c.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3 h-3" />{c.email}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-white/60">
                  {c.last_contact_date
                    ? new Date(c.last_contact_date).toLocaleDateString("it-IT")
                    : "Mai"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
