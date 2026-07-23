"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  supabase,
  type Listing,
  AREAS,
  BEDROOM_OPTIONS,
  AMENITIES,
  UTILITIES,
  timeAgo,
} from "@/lib/supabase";

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [maxPrice, setMaxPrice] = useState(2000);
  const [bedrooms, setBedrooms] = useState<string>("Any");
  const [area, setArea] = useState<string>("Any");
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
  }, [listings, search, maxPrice, bedrooms, area, amenityFilters, utilityFilters]);

  const activeFilterCount = amenityFilters.size + utilityFilters.size;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-wrap gap-4 mb-8 p-4 bg-white border border-zinc-200 rounded-xl">
        <div className="w-full">
          <label className="block text-xs text-zinc-500 mb-1">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by keyword, e.g. pool, casita, quiet"
            className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-zinc-500 mb-1">
            Max price / month (USD)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={200}
              max={3000}
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
          <label className="block text-xs text-zinc-500 mb-1">Bedrooms</label>
          <select
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            className="w-full border border-zinc-300 rounded-md px-2 py-2 text-sm"
          >
            <option>Any</option>
            {BEDROOM_OPTIONS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="min-w-[180px]">
          <label className="block text-xs text-zinc-500 mb-1">Area</label>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full border border-zinc-300 rounded-md px-2 py-2 text-sm"
          >
            <option>Any</option>
            {AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>

        <div className="w-full">
          <button
            type="button"
            onClick={() => setShowMoreFilters((prev) => !prev)}
            className="text-xs text-zinc-500 underline hover:text-zinc-900"
          >
            {showMoreFilters ? "Hide" : "More filters"}
            {activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}
          </button>

          {showMoreFilters && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
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
                  {a.label}
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
                  {u.label} included
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-zinc-400 mb-4">
        Listings automatically expire after 30 days. See something off? Flag
        it — flagged listings get reviewed and removed if needed.
      </p>

      {loading && <p className="text-sm text-zinc-500">Loading listings...</p>}
      {error && (
        <p className="text-sm text-red-600">
          Couldn&apos;t load listings: {error}
        </p>
      )}
      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-zinc-500">
          No listings match those filters yet.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((listing) => (
          <Link
            key={listing.id}
            href={`/listings/${listing.id}`}
            className="relative bg-white border border-zinc-200 rounded-xl overflow-hidden hover:border-zinc-300 hover:bg-zinc-50"
          >
            <button
              onClick={(e) => handleFlag(e, listing.id)}
              disabled={flaggedIds.has(listing.id)}
              title={
                flaggedIds.has(listing.id)
                  ? "Reported"
                  : "Report as suspicious"
              }
              aria-label="Report as suspicious"
              className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-zinc-400 hover:text-red-600 disabled:text-red-500 disabled:hover:text-red-500"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>

            {listing.photo_urls?.length > 0 && (
              <div className="flex gap-0.5 p-2 pb-0">
                {listing.photo_urls.slice(0, 6).map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={url}
                    alt={listing.title}
                    className="w-14 h-14 rounded-md object-cover shrink-0"
                  />
                ))}
              </div>
            )}
            <div className="p-4">
              <div className="flex justify-between items-baseline gap-4">
                <span className="font-medium">{listing.title}</span>
                <span className="font-medium whitespace-nowrap">
                  ${listing.price.toLocaleString()}/mo
                </span>
              </div>
              <div className="text-sm text-zinc-500 mt-1">
                {listing.area} &middot; {listing.bedrooms} bd
                {listing.furnished ? " · furnished" : ""}
                {listing.pets_ok ? " · pets ok" : ""}
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                {timeAgo(listing.created_at)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
