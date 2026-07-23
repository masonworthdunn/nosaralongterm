"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  supabase,
  type Listing,
  AREAS,
  BEDROOM_OPTIONS,
  AMENITIES,
  UTILITIES,
  LEASE_TERMS,
} from "@/lib/supabase";

const MAX_PHOTOS = 6;
const MAX_PHOTO_SIZE = 8 * 1024 * 1024; // 8MB

type PendingPhoto = {
  file: File;
  previewUrl: string;
};

export default function EditListing() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(
    new Set()
  );
  const [selectedUtilities, setSelectedUtilities] = useState<Set<string>>(
    new Set()
  );
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<PendingPhoto[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchListing() {
      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("id", params.id)
        .maybeSingle();

      if (cancelled) return;
      if (data) {
        setListing(data);
        setSelectedAmenities(new Set(data.amenities ?? []));
        setSelectedUtilities(new Set(data.utilities_included ?? []));
        setExistingPhotos(data.photo_urls ?? []);
      }
      setLoading(false);
    }

    fetchListing();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  function toggleAmenity(key: string) {
    setSelectedAmenities((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleUtility(key: string) {
    setSelectedUtilities((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const totalPhotoCount = existingPhotos.length + newPhotos.length;

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

    setNewPhotos((prev) => {
      const combined = [
        ...prev,
        ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
      ];
      const room = MAX_PHOTOS - existingPhotos.length;
      if (combined.length > room) {
        setPhotoError(`Only up to ${MAX_PHOTOS} photos total.`);
      }
      return combined.slice(0, Math.max(room, 0));
    });
  }

  function removeExistingPhoto(index: number) {
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function removeNewPhoto(index: number) {
    setNewPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    if (!listing || !token) return;

    setSubmitting(true);
    setError(null);

    let uploadedUrls: string[] = [];

    if (newPhotos.length > 0) {
      setUploadingPhotos(true);
      for (const photo of newPhotos) {
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

        uploadedUrls.push(publicUrlData.publicUrl);
      }
      setUploadingPhotos(false);
    }

    const form = new FormData(formEl);
    const hasParking = selectedAmenities.has("parking");

    const { data: success, error: rpcError } = await supabase.rpc(
      "update_own_listing",
      {
        p_listing_id: listing.id,
        p_token: token,
        p_title: form.get("title") as string,
        p_price: Number(form.get("price")),
        p_area: form.get("area") as string,
        p_bedrooms: form.get("bedrooms") as string,
        p_furnished: form.get("furnished") === "on",
        p_pets_ok: form.get("pets_ok") === "on",
        p_description: (form.get("description") as string) || null,
        p_contact: form.get("contact") as string,
        p_amenities: Array.from(selectedAmenities),
        p_parking_spaces: hasParking
          ? Number(form.get("parking_spaces")) || null
          : null,
        p_utilities_included: Array.from(selectedUtilities),
        p_lease_term: form.get("lease_term") as string,
        p_photo_urls: [...existingPhotos, ...uploadedUrls],
      }
    );

    setSubmitting(false);

    if (rpcError || !success) {
      setError(
        rpcError?.message ?? "That edit link is invalid or expired."
      );
      return;
    }

    router.push(`/listings/${listing.id}?token=${token}`);
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!listing || !token) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This edit link is invalid or the listing no longer exists.
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

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-6">Edit your listing</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            name="title"
            required
            defaultValue={listing.title}
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
            defaultValue={listing.price}
            className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Area</label>
            <select
              name="area"
              required
              defaultValue={listing.area}
              className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 rounded-md px-3 py-2 text-sm"
            >
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
              defaultValue={listing.bedrooms}
              className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 rounded-md px-3 py-2 text-sm"
            >
              {BEDROOM_OPTIONS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="furnished"
              defaultChecked={listing.furnished}
            />
            Furnished
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="pets_ok"
              defaultChecked={listing.pets_ok}
            />
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
            defaultValue={listing.lease_term}
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
            Amenities
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
                defaultValue={listing.parking_spaces ?? 1}
                className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 rounded-md px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Utilities included in rent
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
          {(existingPhotos.length > 0 || newPhotos.length > 0) && (
            <div className="flex gap-2 mb-2 overflow-x-auto">
              {existingPhotos.map((url, i) => (
                <div key={`existing-${i}`} className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Existing photo ${i + 1}`}
                    className="w-16 h-16 rounded-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingPhoto(i)}
                    aria-label="Remove photo"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-900 text-white text-xs flex items-center justify-center"
                  >
                    &times;
                  </button>
                </div>
              ))}
              {newPhotos.map((photo, i) => (
                <div key={`new-${i}`} className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl}
                    alt={`New photo ${i + 1}`}
                    className="w-16 h-16 rounded-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeNewPhoto(i)}
                    aria-label="Remove photo"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-900 text-white text-xs flex items-center justify-center"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
          {totalPhotoCount < MAX_PHOTOS && (
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
            defaultValue={listing.description ?? ""}
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
            defaultValue={listing.contact}
            className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 rounded-md px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex gap-3 mt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {uploadingPhotos
              ? "Uploading photos..."
              : submitting
                ? "Saving..."
                : "Save changes"}
          </button>
          <Link
            href={`/listings/${listing.id}?token=${token}`}
            className="rounded-full border border-zinc-300 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
