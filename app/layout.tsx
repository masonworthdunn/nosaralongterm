import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nosara Long Term Rentals",
  description: "Long term rental listings in Nosara, Costa Rica",
};

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
            <Link href="/" className="font-semibold text-lg">
              Nosara Long Term Rentals
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/submit"
                className="text-sm font-medium rounded-full border border-zinc-300 dark:border-zinc-700 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Submit a listing
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <a
              href="mailto:wdjcr4@gmail.com?subject=Nosara%20Long%20Term%20Rentals%20feedback"
              className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 underline"
            >
              Questions or suggestions? Contact the admin
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
