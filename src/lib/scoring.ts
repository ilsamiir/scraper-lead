import { SavedClient, HIGH_VALUE_SECTORS } from "./types";

export type ScoreBreakdown = {
  total: number;
  contactData: number;
  engagement: number;
  recency: number;
  opportunity: number;
  sectorFit: number;
  statusPenalty: number;
};

/**
 * Lead scoring intelligente per web agency.
 *
 * Pesi:
 *   - Dati contatto disponibili (email/phone/website)     max 15
 *   - Engagement (storico interazioni)                     max 15
 *   - Recency (tempo dall'ultimo contatto)                 max 25
 *   - Opportunità digitale (no website / digital_score basso) max 25
 *   - Settore target web agency                            max 20
 *   - Penalità status "Convertiti"                         -20
 */
export function scoreClient(
  client: SavedClient,
  historyCount: number,
  today: Date
): ScoreBreakdown {
  // --- 1. Dati contatto (max 15) ---
  let contactData = 0;
  if (client.email) contactData += 6;
  if (client.phone) contactData += 5;
  if (client.keyword) contactData += 4;

  // --- 2. Engagement (max 15) ---
  let engagement = 0;
  if (historyCount >= 5) engagement = 15;
  else if (historyCount >= 3) engagement = 12;
  else if (historyCount >= 1) engagement = 6;

  // --- 3. Recency - più tempo senza contatto = più urgente (max 25) ---
  let recency = 0;
  const lc = client.last_contact_date ? new Date(client.last_contact_date) : null;
  if (!lc) {
    recency = 25; // Mai contattato = massima priorità
  } else {
    const hours = (today.getTime() - lc.getTime()) / (1000 * 60 * 60);
    if (hours > 168) recency = 25;      // >7 giorni
    else if (hours > 96) recency = 20;  // >4 giorni
    else if (hours > 48) recency = 12;  // >2 giorni
    else if (hours > 24) recency = 6;   // >1 giorno
  }

  // --- 4. Opportunità digitale (max 25) ---
  // Lead senza website o con basso digital_score = grande opportunità per web agency
  let opportunity = 0;
  if (!client.website && !client.has_website) {
    opportunity = 25; // Nessun sito = massima opportunità
  } else if ((client.digital_score ?? 0) <= 30) {
    opportunity = 18; // Presenza digitale debole
  } else if ((client.digital_score ?? 0) <= 60) {
    opportunity = 10; // Presenza digitale media
  }

  // Revenue come boost: aziende con fatturato più alto = più valore
  if (client.estimated_revenue) {
    const rev = client.estimated_revenue.toLowerCase();
    if (rev.includes("1m") || rev.includes("milion") || rev.includes(">500k")) {
      opportunity = Math.min(25, opportunity + 5);
    }
  }

  // --- 5. Settore target (max 20) ---
  let sectorFit = 0;
  if (client.sector) {
    const sectorLower = client.sector.toLowerCase();
    const isHighValue = HIGH_VALUE_SECTORS.some((s) => sectorLower.includes(s));
    if (isHighValue) sectorFit = 20;
    else sectorFit = 8; // Settore non primario ma comunque valido
  } else if (client.keyword) {
    // Fallback: inferisci dal keyword di ricerca
    const kwLower = client.keyword.toLowerCase();
    const isHighValue = HIGH_VALUE_SECTORS.some((s) => kwLower.includes(s));
    if (isHighValue) sectorFit = 15;
  }

  // --- 6. Penalità status ---
  let statusPenalty = 0;
  const status = (client.status || "").toLowerCase();
  if (status === "convertiti") statusPenalty = -20;

  const raw = contactData + engagement + recency + opportunity + sectorFit + statusPenalty;
  const total = Math.max(0, Math.min(100, raw));

  return {
    total,
    contactData,
    engagement,
    recency,
    opportunity,
    sectorFit,
    statusPenalty,
  };
}

/** Versione semplificata che ritorna solo il punteggio totale */
export function scoreClientTotal(
  client: SavedClient,
  historyCount: number,
  today: Date
): number {
  return scoreClient(client, historyCount, today).total;
}
