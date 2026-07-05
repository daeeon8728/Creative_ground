import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "내 보드 — Fragments",
};

export default function BoardsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      {children}
    </div>
  );
}
