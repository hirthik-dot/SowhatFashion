import type { Metadata } from "next";
import "./globals.css";
import OfflineBanner from "@/components/shared/OfflineBanner";

export const metadata: Metadata = {
  title: "Sowaat POS",
  description: "Billing system for Sowaat Mens Wear",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
