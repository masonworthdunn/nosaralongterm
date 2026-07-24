"use client";

import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  supabase,
  AREAS,
  BEDROOM_OPTIONS,
  AMENITIES,
  UTILITIES,
  LEASE_TERMS,
  whatsAppSelfSendLink,
} from "@/lib/supabase";

const MAX_PHOTOS = 6;
const MAX_PHOTO_SIZE = 8 * 1024 * 1024; // 8MB

type PendingPhoto = {
  file: File;
  previewUrl: string;
};

export default function SubmitListing() {
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [newListingId, setNewListingId] = useState<string | null>(null);
  const [manageToken, setManageToken] = useState<string | null>(null);
  const [submittedContact, setSubmittedContact] = useState<string | null>(
    null
  );
  const [submittedTitle, setSubmittedTitle] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(
    new Set()
  );
  const [selectedUtilities, setSelectedUtilities] = useState<Set<string>>(
    new Set()
  );
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);

  function toggleAmenity(key: string) {
    setSelectedAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleUtility(key: string) {
    setSelectedUtilities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handlePhotoSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setPhotoError(null);

    const tooBig = files.find((f) => f.size > MAX_PHOTO_SIZE);
    if (tooBig) {
      setPhotoError(`${tooBig.name} is over 8MB — pick a smaller photo.`);
      return;
    }

    setPhotos((prev) => {
      const combined = [...prev, ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))];
      if (combined.length > MAX_PHOTOS) {
        setPhotoError(`Only up to ${MAX_PHOTOS} photos — using the first ${MAX_PHOTOS}.`);
      }
      return combined.slice(0, MAX_PHOTOS);
    });
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setSubmitting(true);
    setError(null);

    let photoUrls: string[] = [];

    if (photos.length > 0) {
      setUploadingPhotos(true);
      for (const photo of photos) {
        const ext = photo.file.name.split(".").pop() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("listing-photos")
          .upload(path, photo.file);

        if (uploadError) {
          setUploadingPhotos(false);
          setSubmitting(false);
          setError(`Couldn't upload a photo: ${uploadError.message}`);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("listing-photos")
          .getPublicUrl(path);

        photoUrls.push(publicUrlData.publicUrl);
      }
      setUploadingPhotos(false);
    }

    const form = new FormData(formEl);
    const hasParking = selectedAmenities.has("parking");

    const { data, error } = await supabase
      .from("listings")
      .insert({
        title: form.get("title") as string,
        price: Number(form.get("price")),
        area: form.get("area") as string,
        bedrooms: form.get("bedrooms") as string,
        furnished: form.get("furnished") === "on",
        pets_ok: form.get("pets_ok") === "on",
        description: (form.get("description") as string) || null,
        contact: form.get("contact") as string,
        amenities: Array.from(selectedAmenities),
        parking_spaces: hasParking
          ? Number(form.get("parking_spaces")) || null
          : null,
        utilities_included: Array.from(selectedUtilities),
        lease_term: form.get("lease_term") as string,
        photo_urls: photoUrls,
        source: "submission",
      })
      .select("id")
      .single();

    if (error) {
      setSubmitting(false);
      setError(error.message);
      return;
    }

    const { data: token } = await supabase.rpc("create_listing_edit_token", {
      p_listing_id: data.id,
    });

    setSubmitting(false);
    setNewListingId(data.id);
    setManageToken(token ?? null);
    setSubmittedContact(form.get("contact") as string);
    setSubmittedTitle(form.get("title") as string);
  }

  function copyManageLink() {
    if (!newListingId || !manageToken) return;
    const url = `${window.location.origin}/listings/${newListingId}?token=${manageToken}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
  }

  if (newListingId) {
    const manageUrl = manageToken
      ? `/listings/${newListingId}?token=${manageToken}`
      : `/listings/${newListingId}`;

    const fullManageUrl = manageToken
      ? `${window.location.origin}${manageUrl}`
      : null;

    const selfSendLink =
      fullManageUrl && submittedContact
        ? whatsAppSelfSendLink(
            submittedContact,
            `Manage link for "${submittedTitle}" on Nosara Long Term Rentals: ${fullManageUrl}`
          )
        : null;

    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-semibold mb-2">Thanks!</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Your listing is live on the site now.
        </p>

        {manageToken && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-medium mb-1">
              Save this link to edit or delete your listing later
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
              There are no accounts on this site, so this link is the only
              way to manage your listing before it expires. Bookmark it or
              copy it somewhere safe.
            </p>
            <button
              type="button"
              onClick={copyManageLink}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {linkCopied ? "Copied!" : "Copy manage link"}
            </button>
            {selfSendLink && (
              <a
                href={selfSendLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-2 w-full rounded-md border border-green-300 dark:border-green-800 text-green-700 dark:text-green-400 px-3 py-2 text-sm font-medium hover:bg-green-50 dark:hover:bg-green-950"
              >
                Send me this link on WhatsApp
              </a>
            )}
          </div>
        )}

        <div className="flex justify-center gap-3">
          <Link
            href={manageUrl}
            className="rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-medium"
          >
            View your listing
          </Link>
          <Link
            href="/"
            className="rounded-full border border-zinc-300 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Back to listings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-1">Submit a listing</h1>
      <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-6">
        Your listing goes live immediately and stays up for 30 days, then
        automatically expires — you can always resubmit.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            name="title"
            required
            placeholder="2br casita near Guiones beach"
            className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 rounded-md px-3 py-2 text-sm"
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
            className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Area</label>
            <select
              name="area"
              required
              defaultValue=""
              className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 rounded-md px-3 py-2 text-sm"
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
              className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 rounded-md px-3 py-2 text-sm"
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
            Lease term
          </label>
          <select
            name="lease_term"
            required
            defaultValue="flexible"
            className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 rounded-md px-3 py-2 text-sm"
          >
            {LEASE_TERMS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Amenities — check anything that applies. The more info you give,
            the fewer questions renters will need to ask.
          </label>
          <div className="grid grid-cols-2 gap-2">
            {AMENITIES.map((a) => (
              <label key={a.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedAmenities.has(a.key)}
                  onChange={() => toggleAmenity(a.key)}
                />
                {a.label}
              </label>
            ))}
          </div>
          {selectedAmenities.has("parking") && (
            <div className="mt-3">
              <label className="block text-sm font-medium mb-1">
                Parking spaces
              </label>
              <input
                name="parking_spaces"
                type="number"
                min={1}
                defaultValue={1}
                className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 rounded-md px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Utilities included in rent — check any that are covered
          </label>
          <div className="grid grid-cols-2 gap-2">
            {UTILITIES.map((u) => (
              <label key={u.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedUtilities.has(u.key)}
                  onChange={() => toggleUtility(u.key)}
                />
                {u.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Photos (up to {MAX_PHOTOS})
          </label>
          {photos.length > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto">
              {photos.map((photo, i) => (
                <div key={i} className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl}
                    alt={`Selected photo ${i + 1}`}
                    className="w-16 h-16 rounded-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label="Remove photo"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-900 text-white text-xs flex items-center justify-center"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
          {photos.length < MAX_PHOTOS && (
            <label className="inline-flex items-center justify-center rounded-full border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Add photos
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </label>
          )}
          {photoError && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{photoError}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Description (optional)
          </label>
          <textarea
            name="description"
            rows={3}
            className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 rounded-md px-3 py-2 text-sm"
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
            className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 rounded-md px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {uploadingPhotos
            ? "Uploading photos..."
            : submitting
              ? "Submitting..."
              : "Submit listing"}
        </button>
      </form>
    </div>
  );
}
