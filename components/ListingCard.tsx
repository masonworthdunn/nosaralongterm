"use client";

import Link from "next/link";
import Image from "next/image";
import type { Listing } from "@/lib/supabase";
import { areaLabel, timeAgoLabel, type Language, type TranslationKey } from "@/lib/i18n";
import FavoriteButton from "@/components/FavoriteButton";

export default function ListingCard({
  listing,
  lang,
  t,
  flagged,
  onFlag,
}: {
  listing: Listing;
  lang: Language;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  flagged: boolean;
  onFlag: (e: React.MouseEvent<HTMLButtonElement>, id: string) => void;
}) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
    >
      <div className="absolute bottom-2 right-2 z-10 flex gap-2">
        <FavoriteButton
          listingId={listing.id}
          labels={{ add: t("addToFavorites"), remove: t("removeFromFavorites") }}
          className="w-7 h-7 rounded-full bg-white/90 dark:bg-zinc-900/90 shadow-sm flex items-center justify-center"
        />
        <button
          onClick={(e) => onFlag(e, listing.id)}
          disabled={flagged}
          title={flagged ? t("reported") : t("reportAsSuspicious")}
          aria-label={t("reportAsSuspicious")}
          className="w-7 h-7 rounded-full bg-white/90 dark:bg-zinc-900/90 shadow-sm flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 disabled:text-red-500 disabled:hover:text-red-500"
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
      </div>

      {listing.photo_urls?.length > 0 && (
        <div className="flex gap-0.5 p-2 pb-0">
          {listing.photo_urls.slice(0, 6).map((url, i) => (
            <Image
              key={i}
              src={url}
              alt={listing.title}
              width={56}
              height={56}
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
        <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          📍 {areaLabel(listing.area, lang)} &middot; {listing.bedrooms} bd
          {listing.furnished ? ` · ${t("furnished")}` : ""}
          {listing.pets_ok ? ` · ${t("petsOk")}` : ""}
        </div>
        <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
          {timeAgoLabel(lang, listing.created_at)}
        </div>
      </div>
    </Link>
  );
}
