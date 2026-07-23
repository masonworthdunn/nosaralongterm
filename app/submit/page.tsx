"use client";

import { useState, type FormEvent } from "react";
import { supabase, AREAS, BEDROOM_OPTIONS } from "@/lib/supabase";

export default function SubmitListing() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    const { error } = await supabase.from("listings").insert({
      title: form.get("title") as string,
      price: Number(form.get("price")),
      area: form.get("area") as string,
      bedrooms: form.get("bedrooms") as string,
      furnished: form.get("furnished") === "on",
      pets_ok: form.get("pets_ok") === "on",
      description: (form.get("description") as string) || null,
      contact: form.get("contact") as string,
      source: "submission",
    });

    setSubmitting(false);

    if (error) {
      setError(error.message);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-semibold mb-2">Thanks!</h1>
        <p className="text-zinc-600">
          Your listing is live on the site now.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-6">Submit a listing</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            name="title"
            required
            placeholder="2br casita near Guiones beach"
            className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Price / month (USD)
          </label>
          <input
            name="price"
            type="number"
            min={0}
            required
            className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Area</label>
            <select
              name="area"
              required
              defaultValue=""
              className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Select an area
              </option>
              {AREAS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Bedrooms</label>
            <select
              name="bedrooms"
              required
              defaultValue=""
              className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Select
              </option>
              {BEDROOM_OPTIONS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="furnished" />
            Furnished
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="pets_ok" />
            Pets ok
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Description (optional)
          </label>
          <textarea
            name="description"
            rows={3}
            className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Contact (WhatsApp number or link)
          </label>
          <input
            name="contact"
            required
            placeholder="+506 8888 8888"
            className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-full bg-zinc-900 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit listing"}
        </button>
      </form>
    </div>
  );
}
