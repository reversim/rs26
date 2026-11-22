import type { APIRoute } from "astro";
import { SITE_URL } from "../config/agentResources";

/**
 * NLWeb Schema Map: points at the structured-data feeds on this domain.
 * Advertised by the `schemamap:` directive in public/robots.txt.
 */
export const GET: APIRoute = () => {
  const feeds = [
    {
      loc: `${SITE_URL}/feeds/sessions.jsonl`,
      type: "application/jsonl",
      schema: "https://schema.org/Event",
    },
    {
      loc: `${SITE_URL}/sitemap-index.xml`,
      type: "application/xml",
      schema: "https://schema.org/WebPage",
    },
  ];

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<schemamap xmlns="https://nlweb.ai/schemas/schemamap/1.0">',
    ...feeds.flatMap((feed) => [
      "  <feed>",
      `    <loc>${feed.loc}</loc>`,
      `    <type>${feed.type}</type>`,
      `    <schema>${feed.schema}</schema>`,
      "  </feed>",
    ]),
    "</schemamap>",
  ].join("\n");

  return new Response(`${body}\n`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
