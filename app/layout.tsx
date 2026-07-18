import type { Metadata, Viewport } from "next";
import "@fontsource/jua/korean-400.css";
import "@noonnu/gmarket-sans-medium";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://peppi-h2hrps.vercel.app"),

  title: "핱페스 취향표",
  description: "핱페스 취향표를 자동 생성해주는 도구입니다.",

  openGraph: {
    title: "핱페스 취향표",
    description: "핱페스 취향표를 자동 생성해주는 도구입니다.",
    url: "https://peppi-h2hrps.vercel.app",
    siteName: "핱페스 취향표",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "핱페스 취향표",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "핱페스 취향표",
    description: "핱페스 취향표를 자동 생성해주는 도구입니다.",
    images: ["/twitter-image.png"],
  },

  other: {
    "codex-preview": "development",
  },

  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
