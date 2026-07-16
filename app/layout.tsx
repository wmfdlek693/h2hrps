import type { Metadata, Viewport } from "next";
import "@fontsource/jua/korean-400.css";
import "@noonnu/gmarket-sans-medium";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hearts2Hearts RPS 취향표",
  description: "Hearts2Hearts 8명의 방향성 조합 취향을 색으로 표시하고 이미지로 저장하는 팬메이드 도구입니다.",
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
  themeColor: "#8dd1fe",
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
