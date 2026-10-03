/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Sitemap reader.
 *
 * `sitemaps/styles.xml` is the published, crawl-sanctioned index of every
 * style page. It is the only enumeration source we use — it needs no
 * JavaScript rendering and no access to the disallowed `/api/` tree.
 *
 * Parsed per `<url>` block. Pairing a flat list of `<loc>` against a flat list of
 * `<lastmod>` by index is only correct while every entry carries a timestamp: a
 * single `<url>` without a `<lastmod>` shifts every later pairing, attaching one
 * style's timestamp to a different style. The damage is display-only — `lastmod`
 * never enters a conditional request — but a wrong "updated" date in a tool
 * result is still a wrong answer.
 */

import { get, log } from '../http.js'
import { sitemapEntrySchema, type SitemapEntry } from '../types.js'

const URL_BLOCK_RE = /<url>([\s\S]*?)<\/url>/g
const locRe = /<loc>\s*([^<]+?)\s*<\/loc>/
const lastmodRe = /<lastmod>\s*([^<]+?)\s*<\/lastmod>/
const stylePathRe = /\/style\/([0-9a-fA-F-]{36})\/?$/

export function parseStylesSitemap(xml: string): SitemapEntry[] {
    const entries: SitemapEntry[] = []

    // Parsed per `<url>` block rather than as two flat lists zipped by index.
    // Zipping silently shifted every entry after the first `<url>` that carried
    // no `<lastmod>`, attaching one style's timestamp to a different style. The
    // pairing is now structural, so a missing sibling simply means no lastmod.
    for (const block of xml.matchAll(URL_BLOCK_RE)) {
        const body = block[ 1 ] ?? ''

        const loc = locRe.exec(body)?.[ 1 ]
        if (loc === undefined) continue

        const id = stylePathRe.exec(loc)?.[ 1 ]
        if (id === undefined) continue

        const lastmod = lastmodRe.exec(body)?.[ 1 ]
        const parsed = sitemapEntrySchema.safeParse(lastmod === undefined ? {id} : {id, lastmod})
        if (parsed.success) entries.push(parsed.data)
    }

    return entries
}

/** Fetch and parse the style sitemap. */
export async function fetchStylesSitemap(url: string): Promise<SitemapEntry[]> {
    log(`fetching sitemap: ${url}`)
    const {body} = await get(url)
    const entries = parseStylesSitemap(body)
    log(`sitemap yielded ${entries.length} styles`)

    return entries
}
