import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NextReach",
  description: "Landing page chatbot and lead admin MVP for NextReach.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
