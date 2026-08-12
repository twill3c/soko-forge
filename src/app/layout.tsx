import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "soko-forge — 倉庫番を遊ぶ・解く・作る",
  description:
    "倉庫番のプレイ・ソルバー・レベル生成器。生成レベルはソルバー検証済み。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        {children}
        <Footer />
      </body>
    </html>
  );
}
