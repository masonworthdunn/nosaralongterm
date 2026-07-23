import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Listing = {
  id: string;
  title: string;
  price: number;
  area: string;
  bedrooms: string;
  furnished: boolean;
  pets_ok: boolean;
  description: string | null;
  contact: string;
  photo_urls: string[];
  status: "pending" | "approved" | "rejected";
  source: string;
  flagged: boolean;
  created_at: string;
  expires_at: string;
};

export const AREAS = [
  "K Section",
  "Guiones",
  "NoGu (North Guiones)",
  "Playa Pelada",
  "Nosara Centro",
  "Barco Quebrado",
  "Las Huacas",
  "Garza",
  "Santa Marta",
  "Rio Montaña",
  "Arenales",
  "Santa Teresita",
  "San Pedro",
  "Los Angeles",
  "Esperanza",
  "Delicias",
  "D Section",
  "L Section",
  "Other",
] as const;

export const BEDROOM_OPTIONS = ["Studio", "1", "2", "3+"] as const;

export function whatsAppLink(contact: string) {
  const trimmed = contact.trim();

  if (/^https?:\/\//i.test(trimmed) || /wa\.me|whatsapp\.com/i.test(trimmed)) {
    return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  }

  const digits = trimmed.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}
