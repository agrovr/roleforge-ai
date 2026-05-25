import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://roleforgeai.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/templates"],
        disallow: ["/api/", "/app", "/auth/", "/settings"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
