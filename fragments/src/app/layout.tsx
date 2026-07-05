import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ThemeInit } from "@/components/ThemeInit";

export const metadata: Metadata = {
  title: "Fragments — 나만의 플래닝 보드",
  description:
    "로그인 없이 바로 시작하는 콜라주 플래닝 보드. 이미지와 노트를 자유롭게 배치하고, 가격·체크리스트·링크를 함께 관리하세요.",
  openGraph: {
    title: "Fragments",
    description: "콜라주 + 플래닝 = 진짜 쓰게 되는 보드",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeInit />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
