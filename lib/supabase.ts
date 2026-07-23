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
  photo_url: string | null;
  status: "pending" | "approved" | "rejected";
  source: string;
  created_at: string;
  expires_at: string;
};

export const AREAS = [
  "Playa Guiones",
  "Playa Pelada",
  "Bocas de Nosara / Centro",
  "Las Huacas",
  "Garza",
  "Other",
] as const;

export const BEDROOM_OPTIONS = ["Studio", "1", "2", "3+"] as const;
