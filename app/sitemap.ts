import type { MetadataRoute } from "next";

import { LOCALE_ROUTES } from "@/lib/locale";
import { getSiteUrl } from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  return Object.values(LOCALE_ROUTES).flatMap((localeRoute) =>
    [localeRoute.path, `${localeRoute.path}/trends`, `${localeRoute.path}/store-value`].map((path) => ({
      url: getSiteUrl(path),
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: path.endsWith("/trends") || path.endsWith("/store-value") ? 0.8 : 1
    }))
  );
}
