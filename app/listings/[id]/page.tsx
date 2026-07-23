"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase, type Listing, whatsAppLink } from "@/lib/supabase";

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
        &larr; Back to listings
      </Link>

      {listing.photo_urls?.length > 0 && (
        <div className="grid grid-cols-3 gap-1 mt-4 rounded-xl overflow-hidden">
          {listing.photo_urls.slice(0, 6).map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt={`${listing.title} photo ${i + 1}`}
              className="w-full aspect-square object-cover"
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
      </div>

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
