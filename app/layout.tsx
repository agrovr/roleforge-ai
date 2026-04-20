import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PointerEffects } from "./components/PointerEffects";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Resume Tailor",
  description: "AI-powered resume optimization for ATS and job matching.",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PointerEffects />
        {children}
      </body>
    </html>
  );
}
