"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/components/LanguageProvider";

export default function SiteHeader() {
  const { t } = useLanguage();

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-2 sm:gap-3">
        <Link href="/" className="font-semibold text-base sm:text-lg shrink truncate">
          Nosara Long Term Rentals
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Link
            href="/submit"
            className="whitespace-nowrap text-sm font-medium rounded-full border border-zinc-300 dark:border-zinc-700 px-3 sm:px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <span className="sm:hidden">{t("submitShort")}</span>
            <span className="hidden sm:inline">{t("submitAListing")}</span>
          </Link>
          <Link
            href="/favorites"
            aria-label={t("favorites")}
            title={t("favorites")}
            className="w-9 h-9 shrink-0 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.6z" />
            </svg>
          </Link>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
