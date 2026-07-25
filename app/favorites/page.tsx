"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase, type Listing } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";
import { useFavorites } from "@/components/FavoritesProvider";
import ListingCard from "@/components/ListingCard";

export default function FavoritesPage() {
  const { lang, t } = useLanguage();
  const { favorites } = useFavorites();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;

    async function fetchFavorites() {
      const ids = [...favorites];
      if (ids.length === 0) {
        setListings([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("listings")
        .select("*")
        .in("id", ids)
        .eq("status", "approved")
        .gt("expires_at", new Date().toISOString());

      if (cancelled) return;
      setListings(data ?? []);
      setLoading(false);
    }

    fetchFavorites();
    return () => {
      cancelled = true;
    };
  }, [hydrated, favorites]);

  async function handleFlag(
    e: React.MouseEvent<HTMLButtonElement>,
    id: string
  ) {
    e.preventDefault();
    e.stopPropagation();
    setFlaggedIds((prev) => new Set(prev).add(id));
    const { error } = await supabase.rpc("flag_listing", { listing_id: id });
    if (error) {
      setFlaggedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        &larr; {t("backToListings")}
      </Link>

      <h1 className="text-xl font-semibold mt-4 mb-6">{t("favorites")}</h1>

      {(!hydrated || loading) && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("loadingListings")}
        </p>
      )}

      {hydrated && !loading && listings.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("noFavoritesYet")}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            lang={lang}
            t={t}
            flagged={flaggedIds.has(listing.id)}
            onFlag={handleFlag}
          />
        ))}
      </div>
    </div>
  );
}
