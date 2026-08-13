import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oceans — Hire AI-Trained Remote Talent from Sri Lanka",
  description: "Vetted, AI-fluent remote operators — EAs, marketing, finance & GTM specialists. Matched in 24 hours, placed in 2 weeks. 600+ companies trust Oceans to scale without compromise.",
  keywords: ["Oceans", "Oceans Talent", "remote talent", "Sri Lanka talent", "AI-trained talent", "hire remote", "executive assistant", "GTM engineer", "headhunting"],
  authors: [{ name: "Affan · Buildin Blocks" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Oceans — Hire Top 1% Remote Talent",
    description: "AI-fluent, rigorously vetted talent from Sri Lanka. Matched in 24 hours, placed in 2 weeks. 600+ companies trust Oceans.",
    siteName: "Oceans",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Oceans — Hire Top 1% Remote Talent",
    description: "AI-fluent, rigorously vetted talent from Sri Lanka. Matched in 24 hours, placed in 2 weeks.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
