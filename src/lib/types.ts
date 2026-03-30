export type Operator = {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
  active?: boolean;
  created_at?: string | null;
};

export type SavedClient = {
  id: string;
  business_name?: string | null;
  keyword?: string | null;
  city?: string | null;
  province?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  status?: string | null;
  follow_up_date?: string | null;
  last_contact_method?: string | null;
  last_contact_date?: string | null;
  created_at?: string | null;
  notes?: string | null;
  sector?: string | null;
  estimated_revenue?: string | null;
  employee_count?: string | null;
  has_website?: boolean;
  digital_score?: number;
  operator_id?: string | null;
  converted_value?: number | null;
  converted_at?: string | null;
};

export type ContactHistoryRow = {
  id: string;
  client_id: string;
  contact_method: string;
  contact_date: string;
  notes?: string | null;
  operator_id?: string | null;
};

export type DatePreset = "1d" | "7d" | "1m" | "3m" | "12m" | "max" | "custom";

export const CONTACT_METHODS = ["chiamata", "email", "messaggio", "nota"] as const;

export const STATUS_VALUES = [
  "Da contattare",
  "In lavorazione",
  "Da richiamare",
  "Convertiti",
] as const;

// Settori rilevanti per web agency (alta priorità)
export const HIGH_VALUE_SECTORS = [
  "ristorazione",
  "hotel",
  "ecommerce",
  "immobiliare",
  "studio professionale",
  "clinica",
  "palestra",
  "beauty",
  "artigiano",
  "negozio",
] as const;
