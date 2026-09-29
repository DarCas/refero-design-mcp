/**
 * Sitemap reader.
 *
 * `sitemaps/styles.xml` is the published, crawl-sanctioned index of every
 * style page. It is the only enumeration source we use — it needs no
 * JavaScript rendering and no access to the disallowed `/api/` tree.
 */

import { get, log } from '../http.js'
import { sitemapEntrySchema, type SitemapEntry } from '../types.js'

const locRe = /<loc>\s*([^<]+?)\s*<\/loc>/g
const lastmodRe = /<lastmod>\s*([^<]+?)\s*<\/lastmod>/g
const stylePathRe = /\/style\/([0-9a-fA-F-]{36})\/?$/

function collect(xml: string, pattern: RegExp): string[] {
  pattern.lastIndex = 0
  const out: string[] = []
  let match: RegExpExecArray | null
  while ((match = pattern.exec(xml)) !== null) out.push(match[1] as string)
  return out
}

export function parseStylesSitemap(xml: string): SitemapEntry[] {
  const locs = collect(xml, locRe)
  const lastmods = collect(xml, lastmodRe)

  const entries: SitemapEntry[] = []

  for (const [index, loc] of locs.entries()) {
    const id = stylePathRe.exec(loc)?.[1]
    if (!id) continue

    // `lastmod` elements are in document order, so index alignment is valid
    // as long as every <loc> has a sibling <lastmod>. Guard with the schema
    // either way rather than trusting positional pairing blindly.
    const lastmod = lastmods[index]
    const parsed = sitemapEntrySchema.safeParse(lastmod ? { id, lastmod } : { id })
    if (parsed.success) entries.push(parsed.data)
  }

  return entries
}

/** Fetch and parse the style sitemap. */
export async function fetchStylesSitemap(url: string): Promise<SitemapEntry[]> {
  log(`fetching sitemap: ${url}`)
  const { body } = await get(url)
  const entries = parseStylesSitemap(body)
  log(`sitemap yielded ${entries.length} styles`)
  return entries
}
