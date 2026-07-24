"use client";

import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  supabase,
  type Listing,
  whatsAppLink,
  AMENITIES,
  UTILITIES,
  LEASE_TERMS,
  timeAgo,
} from "@/lib/supabase";

export default function ListingDetail() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const manageToken = searchParams.get("token");
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [flagged, setFlagged] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [renewing, setRenewing] = useState(false);
  const [renewed, setRenewed] = useState(false);

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

  useEffect(() => {
    if (lightboxIndex === null || !listing) return;

    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") {
        setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i));
      }
      if (e.key === "ArrowRight") {
        setLightboxIndex((i) =>
          i !== null && listing && i < listing.photo_urls.length - 1
            ? i + 1
            : i
        );
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [lightboxIndex, listing]);

  async function handleFlag() {
    if (!listing) return;
    setFlagged(true);
    await supabase.rpc("flag_listing", { listing_id: listing.id });
  }

  async function handleRenew() {
    if (!listing || !manageToken) return;

    setRenewing(true);

    const { data: success } = await supabase.rpc("renew_own_listing", {
      p_listing_id: listing.id,
      p_token: manageToken,
    });

    setRenewing(false);

    if (success) {
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30);
      setListing((prev) =>
        prev ? { ...prev, expires_at: newExpiry.toISOString() } : prev
      );
      setRenewed(true);
    }
  }

  async function handleDelete() {
    if (!listing || !manageToken) return;
    if (!confirm("Delete this listing? This can't be undone.")) return;

    setDeleting(true);
    setDeleteError(null);

    const { data: success } = await supabase.rpc("delete_own_listing", {
      p_listing_id: listing.id,
      p_token: manageToken,
    });

    if (success) {
      router.push("/");
    } else {
      setDeleting(false);
      setDeleteError("That manage link is invalid or already used.");
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This listing isn&apos;t available anymore.
        </p>
        <Link
          href="/"
          className="text-sm text-zinc-900 dark:text-zinc-100 underline mt-2 inline-block"
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
  const daysUntilExpiry = Math.ceil(
    (new Date(listing.expires_at).getTime() - Date.now()) / 86400000
  );
  const showRenewalNudge = manageToken && !renewed && daysUntilExpiry <= 5;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
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
              onClick={() => setLightboxIndex(i)}
              className="w-24 h-24 rounded-lg object-cover shrink-0 cursor-zoom-in"
            />
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            aria-label="Close"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white text-xl flex items-center justify-center hover:bg-white/20"
          >
            &times;
          </button>

          {lightboxIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i !== null ? i - 1 : i));
              }}
              aria-label="Previous photo"
              className="absolute left-2 sm:left-4 w-10 h-10 rounded-full bg-white/10 text-white text-2xl flex items-center justify-center hover:bg-white/20"
            >
              &#8249;
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={listing.photo_urls[lightboxIndex]}
            alt={`${listing.title} photo ${lightboxIndex + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
          />

          {lightboxIndex < listing.photo_urls.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i !== null ? i + 1 : i));
              }}
              aria-label="Next photo"
              className="absolute right-2 sm:right-4 w-10 h-10 rounded-full bg-white/10 text-white text-2xl flex items-center justify-center hover:bg-white/20"
            >
              &#8250;
            </button>
          )}

          <div className="absolute bottom-4 text-white/70 text-xs">
            {lightboxIndex + 1} / {listing.photo_urls.length}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-between items-baseline gap-4">
        <h1 className="text-xl font-semibold">{listing.title}</h1>
        <span className="text-xl font-semibold whitespace-nowrap">
          ${listing.price.toLocaleString()}/mo
        </span>
      </div>
      <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
        {listing.area} &middot; {listing.bedrooms} bd
        {listing.furnished ? " · furnished" : ""}
        {listing.pets_ok ? " · pets ok" : ""}
        {leaseTermLabel ? ` · ${leaseTermLabel} lease` : ""}
      </div>
      <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
        {timeAgo(listing.created_at)}
      </div>

      {(checkedAmenities.length > 0 || includedUtilities.length > 0) && (
        <div className="flex flex-wrap gap-2 mt-4">
          {checkedAmenities.map((a) => (
            <span
              key={a.key}
              className="text-xs px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            >
              {a.key === "parking" && listing.parking_spaces
                ? `Parking (${listing.parking_spaces})`
                : a.label}
            </span>
          ))}
          {includedUtilities.map((u) => (
            <span
              key={u.key}
              className="text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
            >
              {u.label} included
            </span>
          ))}
        </div>
      )}

      {listing.description && (
        <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-4 whitespace-pre-line">
          {listing.description}
        </p>
      )}

      {showRenewalNudge && (
        <div className="mt-6 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-900 rounded-xl p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-orange-800 dark:text-orange-200">
            {daysUntilExpiry <= 0
              ? "Your listing expires today."
              : `Your listing expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}.`}
          </p>
          <button
            onClick={handleRenew}
            disabled={renewing}
            className="rounded-full bg-orange-600 text-white px-4 py-2 text-sm font-medium hover:bg-orange-700 disabled:opacity-50 whitespace-nowrap"
          >
            {renewing ? "Renewing..." : "Renew for 30 more days"}
          </button>
        </div>
      )}
      {renewed && (
        <p className="text-sm text-green-700 dark:text-green-400 mt-6">
          Renewed — your listing is good for another 30 days.
        </p>
      )}

      {manageToken && (
        <div className="mt-6 bg-amber-50 dark:bg-amber-950 border border-amber-100 dark:border-amber-900 rounded-xl p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            You have the manage link for this listing.
          </p>
          <div className="flex gap-2">
            <Link
              href={`/listings/${listing.id}/edit?token=${manageToken}`}
              className="rounded-full border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 px-4 py-2 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900 whitespace-nowrap"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-full border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-2 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900 disabled:opacity-50 whitespace-nowrap"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      )}
      {deleteError && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-2">
          {deleteError}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-medium"
          >
            Message on WhatsApp
          </a>
        ) : (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Contact: {listing.contact}
          </span>
        )}

        {flagged ? (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            Reported
          </span>
        ) : (
          <button
            onClick={handleFlag}
            className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 underline"
          >
            Report as suspicious
          </button>
        )}
      </div>
    </div>
  );
}
