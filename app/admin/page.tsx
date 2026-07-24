"use client";

import { useMemo, useState, type FormEvent } from "react";
import { whatsAppLink, type Listing } from "@/lib/supabase";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchListings(pw: string) {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/listings", {
      headers: { "x-admin-password": pw },
    });

    if (res.status === 401) {
      setError("Wrong password.");
      setAuthorized(false);
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setError("Something went wrong loading listings.");
      setLoading(false);
      return;
    }

    const { listings } = await res.json();
    setListings(listings);
    setAuthorized(true);
    setLoading(false);
  }

  function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    fetchListings(password);
  }

  const sortedListings = useMemo(() => {
    return [...listings].sort((a, b) => {
      if (a.flagged !== b.flagged) return a.flagged ? -1 : 1;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [listings]);

  const flaggedCount = listings.filter((l) => l.flagged).length;

  const [manageLinks, setManageLinks] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleGetManageLink(id: string) {
    let url = manageLinks[id];

    if (!url) {
      const res = await fetch(`/api/admin/listings/${id}/manage-link`, {
        headers: { "x-admin-password": password },
      });

      if (!res.ok) {
        setError("Couldn't get a manage link for that listing.");
        return;
      }

      const { token } = await res.json();
      url = `${window.location.origin}/listings/${id}?token=${token}`;
      setManageLinks((prev) => ({ ...prev, [id]: url }));
    }

    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this listing? This can't be undone.")) return;

    const res = await fetch(`/api/admin/listings/${id}`, {
      method: "DELETE",
      headers: { "x-admin-password": password },
    });

    if (res.ok) {
      setListings((prev) => prev.filter((l) => l.id !== id));
    } else {
      setError("Couldn't delete that listing.");
    }
  }

  if (!authorized) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16">
        <h1 className="text-xl font-semibold mb-6">Admin</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 rounded-md px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Checking..." : "Log in"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-1">
        All listings ({listings.length})
      </h1>
      {flaggedCount > 0 && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-5">
          {flaggedCount} flagged as suspicious
        </p>
      )}
      {flaggedCount === 0 && <div className="mb-5" />}

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      <div className="flex flex-col gap-3">
        {sortedListings.map((listing) => (
          <div
            key={listing.id}
            className={`bg-white dark:bg-zinc-900 border rounded-xl p-4 flex justify-between items-start gap-4 ${
              listing.flagged ? "border-red-300 dark:border-red-800" : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <div className="flex gap-3">
              <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                {listing.photo_urls?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.photo_urls[0]}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{listing.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {listing.status}
                  </span>
                  {listing.flagged && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                      Flagged
                    </span>
                  )}
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  ${listing.price.toLocaleString()}/mo &middot; {listing.area} &middot;{" "}
                  {listing.bedrooms} bd
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Contact:{" "}
                  {whatsAppLink(listing.contact) ? (
                    <a
                      href={whatsAppLink(listing.contact)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {listing.contact}
                    </a>
                  ) : (
                    listing.contact
                  )}
                </div>
                <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                  Submitted {new Date(listing.created_at).toLocaleDateString()} &middot;
                  Expires {new Date(listing.expires_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <button
                onClick={() => handleGetManageLink(listing.id)}
                className="text-sm text-zinc-600 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 rounded-full px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap"
              >
                {copiedId === listing.id ? "Copied!" : "Copy manage link"}
              </button>
              <button
                onClick={() => handleDelete(listing.id)}
                className="text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-full px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950 whitespace-nowrap"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {listings.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No listings yet.</p>
        )}
      </div>
    </div>
  );
}
