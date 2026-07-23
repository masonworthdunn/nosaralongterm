"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase, type Listing, AREAS, BEDROOM_OPTIONS } from "@/lib/supabase";

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [maxPrice, setMaxPrice] = useState(2000);
  const [bedrooms, setBedrooms] = useState<string>("Any");
  const [area, setArea] = useState<string>("Any");

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
      if (query) {
        const haystack = `${listing.title} ${listing.description ?? ""} ${listing.area}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [listings, search, maxPrice, bedrooms, area]);

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
      </div>

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
            className="bg-white border border-zinc-200 rounded-xl p-3 flex items-center gap-4 hover:border-zinc-300 hover:bg-zinc-50"
          >
            <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-zinc-100">
              {listing.photo_urls?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listing.photo_urls[0]}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline gap-4">
                <span className="font-medium truncate">{listing.title}</span>
                <span className="font-medium whitespace-nowrap">
                  ${listing.price.toLocaleString()}/mo
                </span>
              </div>
              <div className="text-sm text-zinc-500 mt-1">
                {listing.area} &middot; {listing.bedrooms} bd
                {listing.furnished ? " · furnished" : ""}
                {listing.pets_ok ? " · pets ok" : ""}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
