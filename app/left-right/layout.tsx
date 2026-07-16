import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hearts2Hearts 왼른 취향표",
  description: "Hearts2Hearts 8명의 왼른 취향을 게이지와 글로 기록하고 이미지로 저장하는 팬메이드 도구입니다.",
};

export default function LeftRightLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
