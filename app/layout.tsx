import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RVITM Placement Desk · Class of 2027",
  description: "Track RVITM 2027 student selections, placement rates, and branch-wise progress.",
  other: {
    "codex-preview": "development",
  },
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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
