import type { Metadata, Viewport } from "next";
import { Inter, Spectral, JetBrains_Mono, Amiri, Amiri_Quran } from "next/font/google";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { RouteTransition } from "@/components/layout/RouteTransition";
import { AppProvider } from "@/components/layout/AppProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Display serif for headings. Spectral's moderate stroke contrast sits well
// beside Amiri's Naskh and stays legible at card-heading sizes, which is what
// retired the previous geometric sans here.
const spectral = Spectral({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// Arabic fonts, self-hosted via next/font (build-time download) so there is no
// render-blocking <link> to Google Fonts and no runtime font origin in the CSP.
const amiri = Amiri({
  // Arabic-only: every font-arabic consumer renders pure Arabic (rule and
  // letter names, the bilingual title's Arabic line), so the Latin subset was
  // dead weight.
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

const amiriQuran = Amiri_Quran({
  subsets: ["arabic"],
  weight: "400",
  variable: "--font-quran",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F1E8" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0F1C" },
  ],
};

export const metadata: Metadata = {
  title: "Tajweed Trainer | تجويد القرآن",
  description:
    "Learn Tajweed rules for proper Quran recitation through interactive lessons, color-coded text, and audio examples.",
  applicationName: "Tajweed Trainer",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Tajweed" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('tajweed-trainer-progress'));var c=s&&s.settings||{};var v=['vellum','pearl','night','sepia','mihrab'];var t=v.indexOf(c.theme)>=0?c.theme:(c.darkMode===true?'night':'vellum');document.documentElement.setAttribute('data-theme',t);if(c.language==='ar'){document.documentElement.lang='ar';document.documentElement.dir='rtl'}}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${spectral.variable} ${jetbrainsMono.variable} ${amiri.variable} ${amiriQuran.variable} font-body bg-bg text-text dark:bg-bg-dark dark:text-text-dark antialiased`}
      >
        <AppProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 min-w-0 md:ms-[260px]">
              <Header />
              <main className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6 safe-bottom">
                <RouteTransition>{children}</RouteTransition>
              </main>
            </div>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
