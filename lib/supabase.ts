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
  amenities: string[];
  parking_spaces: number | null;
  utilities_included: string[];
  lease_term: string;
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

export const AMENITIES = [
  { key: "parking", label: "Parking" },
  { key: "gated", label: "Gated" },
  { key: "washer", label: "Washer" },
  { key: "dryer", label: "Dryer" },
  { key: "wifi", label: "Wifi" },
  { key: "ac", label: "A/C" },
  { key: "hot_water", label: "Hot water" },
  { key: "pool", label: "Pool" },
] as const;

export const UTILITIES = [
  { key: "electricity", label: "Electricity" },
  { key: "water", label: "Water" },
  { key: "wifi", label: "Wifi/Internet" },
] as const;

export const LEASE_TERMS = [
  { value: "3mo", label: "3 months" },
  { value: "6mo", label: "6 months" },
  { value: "12mo", label: "12 months" },
  { value: "flexible", label: "Flexible" },
] as const;

export function whatsAppLink(contact: string) {
  const trimmed = contact.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const host = new URL(trimmed).hostname.toLowerCase();
      if (
        host === "wa.me" ||
        host.endsWith(".wa.me") ||
        host === "whatsapp.com" ||
        host.endsWith(".whatsapp.com")
      ) {
        return trimmed;
      }
    } catch {
      // malformed URL — fall through to digit extraction
    }
  } else if (/^(wa\.me|whatsapp\.com)\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  const digits = trimmed.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

export function whatsAppSelfSendLink(contact: string, message: string) {
  const digits = contact.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
