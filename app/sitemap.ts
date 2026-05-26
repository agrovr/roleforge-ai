import type { MetadataRoute } from "next";

import { getConfiguredSiteOrigin } from "./lib/siteUrl";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getConfiguredSiteOrigin();
  const lastModified = new Date();

  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/templates`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
