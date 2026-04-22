import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrustScan",
  description: "AI-powered fake review detection",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans bg-[#080d1a] text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
