import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "期程排程",
  description: "管理排程與與會人員",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
