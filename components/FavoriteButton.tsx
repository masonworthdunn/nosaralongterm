"use client";

import { useFavorites } from "@/components/FavoritesProvider";

export default function FavoriteButton({
  listingId,
  className,
  labels,
}: {
  listingId: string;
  className?: string;
  labels: { add: string; remove: string };
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(listingId);
  const colorClasses = favorited
    ? "text-red-500"
    : "text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400";

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(listingId);
      }}
      aria-label={favorited ? labels.remove : labels.add}
      title={favorited ? labels.remove : labels.add}
      className={`${className} ${colorClasses}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill={favorited ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.6z" />
      </svg>
    </button>
  );
}
