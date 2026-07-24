"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  const other = lang === "en" ? "es" : "en";

  return (
    <button
      onClick={() => setLang(other)}
      aria-label={lang === "en" ? "Switch to Spanish" : "Cambiar a inglés"}
      title={lang === "en" ? "Switch to Spanish" : "Cambiar a inglés"}
      className="w-9 h-9 shrink-0 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      {other.toUpperCase()}
    </button>
  );
}
