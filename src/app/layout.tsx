import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { DarkModeProvider } from "@/components/layout/DarkModeProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Tajweed Trainer | تجويد القرآن",
  description:
    "Learn Tajweed rules for proper Quran recitation through interactive lessons, color-coded text, and audio examples.",
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
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('tajweed-trainer-progress'));if(s&&s.settings&&s.settings.darkMode)document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} font-body bg-bg text-text dark:bg-bg-dark dark:text-text-dark antialiased`}
      >
        <DarkModeProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 md:ml-[260px]">
              <Header />
              <main className="max-w-4xl mx-auto px-4 py-6 pb-20 md:pb-6">
                {children}
              </main>
            </div>
          </div>
        </DarkModeProvider>
      </body>
    </html>
  );
}
