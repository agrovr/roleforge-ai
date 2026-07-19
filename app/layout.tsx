import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AccountMenuBehavior } from "./components/AccountMenuBehavior";
import { SitePolish } from "./components/SitePolish";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://roleforgeai.vercel.app"),
  applicationName: "RoleForge AI",
  title: {
    default: "RoleForge AI",
    template: "%s | RoleForge AI",
  },
  description:
    "AI-assisted resume tailoring for focused applications, with protected saved projects, role targeting, review notes, and clean exports.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "RoleForge AI",
    description:
      "Upload a resume, target a role, review AI-assisted guidance, and export a cleaner draft from a protected workspace.",
    url: "/",
    siteName: "RoleForge AI",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "RoleForge AI",
    description:
      "AI-assisted resume tailoring for focused applications, saved projects, and cleaner exports.",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  weight: "variable",
  style: "normal",
  display: "swap",
  variable: "--font-fraunces",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=new URLSearchParams(location.search).get("theme");var s=localStorage.getItem("roleforge-theme");var t=p==="dark"||p==="light"?p:s;if(t!=="dark"&&t!=="light"){t="light"}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){}})();`,
          }}
        />
        <SitePolish />
        {children}
        <AccountMenuBehavior />
        <Analytics />
      </body>
    </html>
  );
}
