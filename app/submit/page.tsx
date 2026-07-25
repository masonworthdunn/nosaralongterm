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
import { AMENITY_LABELS, UTILITY_LABELS, BEDROOM_LABELS, LEASE_TERM_LABELS, areaLabel } from "@/lib/i18n";
import { useLanguage } from "@/components/LanguageProvider";

const MAX_PHOTOS = 6;
const MAX_PHOTO_SIZE = 8 * 1024 * 1024; // 8MB

type PendingPhoto = {
  file: File;
  previewUrl: string;
};

export default function SubmitListing() {
  const { lang, t } = useLanguage();
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
      setPhotoError(t("photoTooBig", { name: tooBig.name }));
      return;
    }

    setPhotos((prev) => {
      const combined = [...prev, ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))];
      if (combined.length > MAX_PHOTOS) {
        setPhotoError(t("onlyUpToPhotos", { n: MAX_PHOTOS }));
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

    const photoUrls: string[] = [];

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
        <h1 className="text-xl font-semibold mb-2">{t("thanks")}</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          {t("listingLiveNow")}
        </p>

        {manageToken && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-medium mb-1">
              {t("saveThisLink")}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
              {t("noAccountsNote")}
            </p>
            <button
              type="button"
              onClick={copyManageLink}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {linkCopied ? t("copied") : t("copyManageLink")}
            </button>
            {selfSendLink && (
              <a
                href={selfSendLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-2 w-full rounded-md border border-green-300 dark:border-green-800 text-green-700 dark:text-green-400 px-3 py-2 text-sm font-medium hover:bg-green-50 dark:hover:bg-green-950"
              >
                {t("sendOnWhatsApp")}
              </a>
            )}
          </div>
        )}

        <div className="flex justify-center gap-3">
          <Link
            href={manageUrl}
            className="rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-medium"
          >
            {t("viewYourListing")}
          </Link>
          <Link
            href="/"
            className="rounded-full border border-zinc-300 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {t("backToListings")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-1">{t("submitAListing")}</h1>
      <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-6">
        {t("goesLiveNote")}
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t("title")}</label>
          <input
            name="title"
            required
            placeholder={t("titlePlaceholder")}
            className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {t("pricePerMonth")}
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
            <label className="block text-sm font-medium mb-1">{t("area")}</label>
            <select
              name="area"
              required
              defaultValue=""
              className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 rounded-md px-3 py-2 text-sm"
            >
              <option value="" disabled>
                {t("selectAnArea")}
              </option>
              {AREAS.map((a) => (
                <option key={a} value={a}>{areaLabel(a, lang)}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">{t("bedrooms")}</label>
            <select
              name="bedrooms"
              required
              defaultValue=""
              className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 rounded-md px-3 py-2 text-sm"
            >
              <option value="" disabled>
                {t("select")}
              </option>
              {BEDROOM_OPTIONS.map((b) => (
                <option key={b} value={b}>{BEDROOM_LABELS[lang][b]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="furnished" />
            {t("furnishedLabel")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="pets_ok" />
            {t("petsOkLabel")}
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {t("leaseTerm")}
          </label>
          <select
            name="lease_term"
            required
            defaultValue="flexible"
            className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 rounded-md px-3 py-2 text-sm"
          >
            {LEASE_TERMS.map((term) => (
              <option key={term.value} value={term.value}>
                {LEASE_TERM_LABELS[lang][term.value]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            {t("amenitiesLabel")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {AMENITIES.map((a) => (
              <label key={a.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedAmenities.has(a.key)}
                  onChange={() => toggleAmenity(a.key)}
                />
                {AMENITY_LABELS[lang][a.key]}
              </label>
            ))}
          </div>
          {selectedAmenities.has("parking") && (
            <div className="mt-3">
              <label className="block text-sm font-medium mb-1">
                {t("parkingSpaces")}
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
            {t("utilitiesIncludedLabel")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {UTILITIES.map((u) => (
              <label key={u.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedUtilities.has(u.key)}
                  onChange={() => toggleUtility(u.key)}
                />
                {UTILITY_LABELS[lang][u.key]}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {t("photosUpTo", { n: MAX_PHOTOS })}
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
              {t("addPhotos")}
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
            {t("description")}
          </label>
          <textarea
            name="description"
            rows={3}
            className="w-full border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {t("contact")}
          </label>
          <input
            name="contact"
            required
            placeholder={t("contactPlaceholder")}
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
            ? t("uploadingPhotos")
            : submitting
              ? t("submitting")
              : t("submitListing")}
        </button>
      </form>
    </div>
  );
}
