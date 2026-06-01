import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login"],
        disallow: [
          "/proyectos/",
          "/admin/",
          "/api/",
          "/*/",
        ],
      },
    ],
    sitemap: "https://kreo-crm.site/sitemap.xml",
    host: "https://kreo-crm.site",
  };
}
