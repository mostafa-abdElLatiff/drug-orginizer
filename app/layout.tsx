import type { Metadata, Viewport } from "next";
import { Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";

const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "أدويتي",
  description: "قائمة أدوية بابا",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${notoSansArabic.variable} h-full`}>
      <body className="min-h-full flex flex-col font-arabic antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
