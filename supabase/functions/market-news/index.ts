import { handleNews, type CacheEntry, type NewsKind } from "./handler.ts";

const cache = new Map<NewsKind, CacheEntry>();

Deno.serve((req: Request) => handleNews(req, { fetch, cache }));