import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono, Amiri, Amiri_Quran } from "next/font/google";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { AppProvider } from "@/components/layout/AppProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
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
  subsets: ["arabic", "latin"],
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
    { media: "(prefers-color-scheme: light)", color: "#1B5E20" },
    { media: "(prefers-color-scheme: dark)", color: "#0E3712" },
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
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('tajweed-trainer-progress'));if(s&&s.settings){if(s.settings.darkMode)document.documentElement.classList.add('dark');if(s.settings.language==='ar'){document.documentElement.lang='ar';document.documentElement.dir='rtl'}}}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} ${amiri.variable} ${amiriQuran.variable} font-body bg-bg text-text dark:bg-bg-dark dark:text-text-dark antialiased`}
      >
        <AppProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 min-w-0 md:ms-[260px]">
              <Header />
              <main className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6 safe-bottom">
                {children}
              </main>
            </div>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
