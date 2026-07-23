"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  supabase,
  type Listing,
  whatsAppLink,
  AMENITIES,
  UTILITIES,
  LEASE_TERMS,
} from "@/lib/supabase";

export default function ListingDetail() {
  const params = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [flagged, setFlagged] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchListing() {
      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("id", params.id)
        .eq("status", "approved")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (cancelled) return;
      setListing(data);
      setLoading(false);
    }

    fetchListing();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function handleFlag() {
    if (!listing) return;
    setFlagged(true);
    await supabase.rpc("flag_listing", { listing_id: listing.id });
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-sm text-zinc-500">
          This listing isn&apos;t available anymore.
        </p>
        <Link
          href="/"
          className="text-sm text-zinc-900 underline mt-2 inline-block"
        >
          Back to listings
        </Link>
      </div>
    );
  }

  const link = whatsAppLink(listing.contact);
  const leaseTermLabel = LEASE_TERMS.find(
    (t) => t.value === listing.lease_term
  )?.label;
  const checkedAmenities = AMENITIES.filter((a) =>
    listing.amenities?.includes(a.key)
  );
  const includedUtilities = UTILITIES.filter((u) =>
    listing.utilities_included?.includes(u.key)
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
        &larr; Back to listings
      </Link>

      {listing.photo_urls?.length > 0 && (
        <div className="flex gap-1 mt-4 overflow-x-auto">
          {listing.photo_urls.slice(0, 6).map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt={`${listing.title} photo ${i + 1}`}
              className="w-24 h-24 rounded-lg object-cover shrink-0"
            />
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-between items-baseline gap-4">
        <h1 className="text-xl font-semibold">{listing.title}</h1>
        <span className="text-xl font-semibold whitespace-nowrap">
          ${listing.price.toLocaleString()}/mo
        </span>
      </div>
      <div className="text-sm text-zinc-500 mt-1">
        {listing.area} &middot; {listing.bedrooms} bd
        {listing.furnished ? " · furnished" : ""}
        {listing.pets_ok ? " · pets ok" : ""}
        {leaseTermLabel ? ` · ${leaseTermLabel} lease` : ""}
      </div>

      {(checkedAmenities.length > 0 || includedUtilities.length > 0) && (
        <div className="flex flex-wrap gap-2 mt-4">
          {checkedAmenities.map((a) => (
            <span
              key={a.key}
              className="text-xs px-2 py-1 rounded-full bg-zinc-100 text-zinc-700"
            >
              {a.key === "parking" && listing.parking_spaces
                ? `Parking (${listing.parking_spaces})`
                : a.label}
            </span>
          ))}
          {includedUtilities.map((u) => (
            <span
              key={u.key}
              className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700"
            >
              {u.label} included
            </span>
          ))}
        </div>
      )}

      {listing.description && (
        <p className="text-sm text-zinc-700 mt-4 whitespace-pre-line">
          {listing.description}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-zinc-900 text-white px-5 py-2.5 text-sm font-medium"
          >
            Message on WhatsApp
          </a>
        ) : (
          <span className="text-sm text-zinc-500">
            Contact: {listing.contact}
          </span>
        )}

        {flagged ? (
          <span className="text-xs text-zinc-400">Reported</span>
        ) : (
          <button
            onClick={handleFlag}
            className="text-xs text-zinc-400 hover:text-red-600 underline"
          >
            Report as suspicious
          </button>
        )}
      </div>
    </div>
  );
}
