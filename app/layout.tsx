import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "PulseBoard",
  description: "Corporate operational management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-indigo-500/30">
        {children}
        <Toaster theme="light" position="bottom-right" closeButton richColors />
      </body>
    </html>
  );
}
