"use client";

import { useEffect, useMemo, useState } from "react";
import {
  supabase,
  type Listing,
  AREAS,
  BEDROOM_OPTIONS,
  AMENITIES,
  UTILITIES,
} from "@/lib/supabase";
import {
  AMENITY_LABELS,
  UTILITY_LABELS,
  BEDROOM_LABELS,
  areaLabel,
} from "@/lib/i18n";
import { useLanguage } from "@/components/LanguageProvider";
import ListingCard from "@/components/ListingCard";

export default function Home() {
  const { lang, t } = useLanguage();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [maxPrice, setMaxPrice] = useState(10000);
  const [bedrooms, setBedrooms] = useState<string>("Any");
  const [area, setArea] = useState<string>("Any");
  const [petsOnly, setPetsOnly] = useState(false);
  const [amenityFilters, setAmenityFilters] = useState<Set<string>>(
    new Set()
  );
  const [utilityFilters, setUtilityFilters] = useState<Set<string>>(
    new Set()
  );
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());

  function toggleAmenityFilter(key: string) {
    setAmenityFilters((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleUtilityFilter(key: string) {
    setUtilityFilters((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function handleFlag(
    e: React.MouseEvent<HTMLButtonElement>,
    id: string
  ) {
    e.preventDefault();
    e.stopPropagation();
    setFlaggedIds((prev) => new Set(prev).add(id));
    await supabase.rpc("flag_listing", { listing_id: id });
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchListings() {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "approved")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setError(error.message);
      } else {
        setListings(data ?? []);
      }
      setLoading(false);
    }

    fetchListings();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return listings.filter((listing) => {
      if (listing.price > maxPrice) return false;
      if (bedrooms !== "Any" && listing.bedrooms !== bedrooms) return false;
      if (area !== "Any" && listing.area !== area) return false;
      if (petsOnly && !listing.pets_ok) return false;
      for (const key of amenityFilters) {
        if (!listing.amenities?.includes(key)) return false;
      }
      for (const key of utilityFilters) {
        if (!listing.utilities_included?.includes(key)) return false;
      }
      if (query) {
        const haystack = `${listing.title} ${listing.description ?? ""} ${listing.area}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [listings, search, maxPrice, bedrooms, area, petsOnly, amenityFilters, utilityFilters]);

  const activeFilterCount =
    amenityFilters.size + utilityFilters.size + (petsOnly ? 1 : 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-wrap gap-4 mb-8 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
        <div className="w-full">
          <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">{t("search")}</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            {t("maxPrice")}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={200}
              max={10000}
              step={50}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm font-medium min-w-[64px]">
              ${maxPrice.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="min-w-[140px]">
          <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">{t("bedrooms")}</label>
          <select
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-md px-2 py-2 text-sm"
          >
            <option value="Any">{t("any")}</option>
            {BEDROOM_OPTIONS.map((b) => (
              <option key={b} value={b}>{BEDROOM_LABELS[lang][b]}</option>
            ))}
          </select>
        </div>

        <div className="min-w-[180px]">
          <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">{t("area")}</label>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-md px-2 py-2 text-sm"
          >
            <option value="Any">{t("any")}</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>{areaLabel(a, lang)}</option>
            ))}
          </select>
        </div>

        <div className="w-full">
          <button
            type="button"
            onClick={() => setShowMoreFilters((prev) => !prev)}
            className="text-xs text-zinc-500 dark:text-zinc-400 underline hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {showMoreFilters ? t("hide") : t("moreFilters")}
            {activeFilterCount > 0 ? ` (${activeFilterCount} ${t("active")})` : ""}
          </button>

          {showMoreFilters && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={petsOnly}
                  onChange={(e) => setPetsOnly(e.target.checked)}
                />
                🐾 {t("petsOkLabel")}
              </label>
              {AMENITIES.map((a) => (
                <label
                  key={a.key}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={amenityFilters.has(a.key)}
                    onChange={() => toggleAmenityFilter(a.key)}
                  />
                  {AMENITY_LABELS[lang][a.key]}
                </label>
              ))}
              {UTILITIES.map((u) => (
                <label
                  key={u.key}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={utilityFilters.has(u.key)}
                    onChange={() => toggleUtilityFilter(u.key)}
                  />
                  {UTILITY_LABELS[lang][u.key]} {t("utilitiesIncludedFilter")}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
        {t("expiryNotice")}
      </p>

      {loading && <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("loadingListings")}</p>}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {t("couldntLoadListings")}{error}
        </p>
      )}
      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("noListingsMatch")}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((listing) => (
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
