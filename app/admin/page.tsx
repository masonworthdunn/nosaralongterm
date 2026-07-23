"use client";

import { useState, type FormEvent } from "react";
import type { Listing } from "@/lib/supabase";

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
            className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-zinc-900 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Checking..." : "Log in"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-6">
        All listings ({listings.length})
      </h1>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="flex flex-col gap-3">
        {listings.map((listing) => (
          <div
            key={listing.id}
            className="bg-white border border-zinc-200 rounded-xl p-4 flex justify-between items-start gap-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{listing.title}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                  {listing.status}
                </span>
              </div>
              <div className="text-sm text-zinc-500 mt-1">
                ${listing.price.toLocaleString()}/mo &middot; {listing.area} &middot;{" "}
                {listing.bedrooms} bd
              </div>
              <div className="text-sm text-zinc-500 mt-1">
                Contact: {listing.contact}
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                Submitted {new Date(listing.created_at).toLocaleDateString()} &middot;
                Expires {new Date(listing.expires_at).toLocaleDateString()}
              </div>
            </div>
            <button
              onClick={() => handleDelete(listing.id)}
              className="text-sm text-red-600 border border-red-200 rounded-full px-3 py-1.5 hover:bg-red-50 whitespace-nowrap"
            >
              Delete
            </button>
          </div>
        ))}
        {listings.length === 0 && (
          <p className="text-sm text-zinc-500">No listings yet.</p>
        )}
      </div>
    </div>
  );
}
