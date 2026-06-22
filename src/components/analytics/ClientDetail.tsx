"use client";

import { useState } from "react";
import { Phone, Mail, Wand2, Send, Check } from "lucide-react";
import type { SavedClient } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";

type Props = {
  client: SavedClient;
  onClose: () => void;
  onRefresh?: () => void;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
};

export function ClientDetail({ client, onClose, onRefresh }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isLoggingCall, setIsLoggingCall] = useState(false);
  const supabase = createClient();

  const handleGenerateEmail = async () => {
    if (!client.email) {
      alert("Nessuna email per questo cliente.");
      return;
    }
    
    setIsGenerating(true);
    setShowEmailForm(true);
    setEmailSubject("");
    setEmailBody("");
    
    try {
      const res = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: client.business_name,
          sector: client.sector,
          address: client.address,
          province: client.province,
          phone: client.phone,
          website: client.website,
          hasWebsite: client.has_website ?? Boolean(client.website),
          digitalScore: client.digital_score,
          notes: client.notes,
          keyword: client.keyword,
          city: client.city,
          status: client.status,
          estimatedRevenue: client.estimated_revenue,
          employeeCount: client.employee_count,
          lastContactMethod: client.last_contact_method,
          lastContactDate: client.last_contact_date,
          followUpDate: client.follow_up_date,
          googleMapsUrl: client.google_maps_url,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore generazione");
      
      setEmailSubject(data.subject);
      setEmailBody(data.body);
    } catch (error: unknown) {
      console.error(error);
      alert(getErrorMessage(error, "Errore durante la generazione dell'email"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!client.email) return;
    setIsSending(true);
    
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          to: client.email,
          subject: emailSubject,
          body: emailBody,
          source: "manual",
        }),
      });
      
      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.error?.message || responseData.error || "Errore invio");
      
      alert("Email inviata con successo!");
      if (onRefresh) onRefresh();
      onClose();
    } catch (error: unknown) {
      console.error(error);
      alert(getErrorMessage(error, "Errore durante l'invio dell'email"));
    } finally {
      setIsSending(false);
    }
  };

  const handleLogCall = async () => {
    setIsLoggingCall(true);
    try {
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("saved_clients")
        .update({
          last_contact_method: "chiamata",
          last_contact_date: now,
          follow_up_date: now.split("T")[0]
        })
        .eq("id", client.id);

      if (updateError) throw updateError;
      
      await supabase.from("contact_history").insert([{
        client_id: client.id,
        contact_method: "chiamata",
        contact_date: now,
        notes: "Chiamata registrata dalla dashboard."
      }]);
      
      alert("Chiamata registrata!");
      if (onRefresh) onRefresh();
      onClose();
    } catch (error: unknown) {
      console.error(error);
      alert("Errore durante la registrazione della chiamata.");
    } finally {
      setIsLoggingCall(false);
    }
  };
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
          className="text-xs text-brand-muted hover:text-brand-text px-2 py-1 rounded hover:bg-brand-background"
        >
          Chiudi
        </button>
      </div>
      <table className="w-full text-sm text-brand-text">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="py-1 pr-2 text-brand-muted">{row.label}</td>
              <td className="py-1">
                {row.value || <span className="text-brand-muted">-</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {!showEmailForm ? (
        <div className="mt-6 flex justify-end gap-3 border-t border-brand-border pt-4">
          {client.phone && (
            <button
              onClick={handleLogCall}
              disabled={isLoggingCall}
              className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-600 transition hover:bg-emerald-500/20 disabled:opacity-50 dark:text-emerald-400"
            >
              {isLoggingCall ? "Registrazione..." : <><Check className="w-4 h-4" /> Registra Chiamata</>}
            </button>
          )}
          {client.email && (
            <button
              onClick={handleGenerateEmail}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-lg bg-brand-accent/10 px-4 py-2 text-sm font-medium text-brand-accent transition hover:bg-brand-accent/20 disabled:opacity-50"
            >
              {isGenerating ? "Generazione AI..." : <><Wand2 className="w-4 h-4" /> Genera Email AI</>}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-6 border-t border-brand-border pt-4 space-y-3">
          <input
            type="text"
            className="w-full rounded-md border border-brand-border bg-brand-surface p-2 text-sm text-brand-text mb-2 outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
            placeholder="Oggetto dell'email"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
          />
          <textarea
            className="w-full rounded-md border border-brand-border bg-brand-surface p-2 text-sm text-brand-text mb-2 min-h-[150px] outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent overflow-auto resize-y"
            placeholder="Corpo dell'email generata con AI..."
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowEmailForm(false)}
              className="px-4 py-2 text-sm text-brand-muted hover:text-brand-text"
            >
              Annulla
            </button>
            <button
              onClick={handleSendEmail}
              disabled={isSending}
              className="flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {isSending ? "Invio..." : <><Send className="w-4 h-4" /> Invia Email</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
