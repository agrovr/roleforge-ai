import type { MetadataRoute } from "next";

import { getConfiguredSiteOrigin } from "./lib/siteUrl";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getConfiguredSiteOrigin();

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
