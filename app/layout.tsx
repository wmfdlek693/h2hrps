import type { Metadata, Viewport } from "next";
import "@fontsource/jua/korean-400.css";
import "@noonnu/gmarket-sans-medium";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://peppi-h2hrps.vercel.app"),

  title: "Hearts2Hearts RPS 취향표",
  description:
    "Hearts2Hearts 8명의 방향성 조합 취향을 색으로 표시하고 이미지로 저장하는 팬메이드 도구입니다.",

  openGraph: {
    title: "Hearts2Hearts RPS 취향표",
    description:
      "Hearts2Hearts 8명의 방향성 조합 취향을 색으로 표시하고 이미지로 저장하는 팬메이드 도구입니다.",
    url: "https://peppi-h2hrps.vercel.app",
    siteName: "Hearts2Hearts RPS 취향표",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Hearts2Hearts RPS 취향표",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Hearts2Hearts RPS 취향표",
    description:
      "Hearts2Hearts 8명의 방향성 조합 취향을 색으로 표시하고 이미지로 저장하는 팬메이드 도구입니다.",
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
