"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function SiteFooter() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <a
          href="mailto:wdjcr4@gmail.com?subject=Nosara%20Long%20Term%20Rentals%20feedback"
          className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 underline"
        >
          {t("contactAdmin")}
        </a>
      </div>
    </footer>
  );
}
