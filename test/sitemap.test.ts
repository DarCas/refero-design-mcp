/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import { describe, expect, it } from 'vitest'
import { parseStylesSitemap } from '../src/sources/sitemap.js'

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://styles.refero.design/style/a73148b9-449b-42cd-9f38-86ef694f500e</loc><lastmod>2026-09-20T21:33:16Z</lastmod></url>
  <url><loc>https://styles.refero.design/style/40be36d7-7fe6-4451-9f2d-7ceccfd43be8</loc><lastmod>2026-09-19T10:00:00Z</lastmod></url>
  <url><loc>https://styles.refero.design/</loc><lastmod>2026-09-01T00:00:00Z</lastmod></url>
</urlset>`

describe('parseStylesSitemap', () => {
    it('extracts style ids and their lastmod', () => {
        const entries = parseStylesSitemap(SITEMAP)
        expect(entries).toHaveLength(2)
        expect(entries[ 0 ]?.id).toBe('a73148b9-449b-42cd-9f38-86ef694f500e')
        expect(entries[ 0 ]?.lastmod).toBe('2026-09-20T21:33:16Z')
    })

    it('ignores non-style urls', () => {
        expect(parseStylesSitemap(SITEMAP).some(entry => entry.id === '')).toBe(false)
    })

    it('handles a trailing slash', () => {
        const xml = '<url><loc>https://styles.refero.design/style/a73148b9-449b-42cd-9f38-86ef694f500e/</loc></url>'
        expect(parseStylesSitemap(xml)).toHaveLength(1)
    })

    it('returns an empty list for a non-sitemap document', () => {
        expect(parseStylesSitemap('<html>not a sitemap</html>')).toEqual([])
    })

    it('is not confused by a nested sitemap index', () => {
        const index = `<sitemapindex><sitemap><loc>https://styles.refero.design/sitemaps/styles.xml</loc></sitemap></sitemapindex>`
        expect(parseStylesSitemap(index)).toEqual([])
    })

    it('does not shift lastmod onto the wrong style when one url omits it', () => {
        // Pairing two flat lists by index meant a single <url> without a <lastmod>
        // moved every later timestamp onto the wrong style.
        const xml = `<urlset>
  <url><loc>https://styles.refero.design/style/11111111-1111-4111-8111-111111111111</loc></url>
  <url><loc>https://styles.refero.design/style/22222222-2222-4222-8222-222222222222</loc><lastmod>2026-09-19T10:00:00Z</lastmod></url>
</urlset>`

        const entries = parseStylesSitemap(xml)
        expect(entries[ 0 ]?.lastmod).toBeUndefined()
        expect(entries[ 1 ]?.lastmod).toBe('2026-09-19T10:00:00Z')
    })

    it('keeps a lastmod that follows a non-style url', () => {
        const xml = `<urlset>
  <url><loc>https://styles.refero.design/</loc><lastmod>2026-09-01T00:00:00Z</lastmod></url>
  <url><loc>https://styles.refero.design/style/33333333-3333-4333-8333-333333333333</loc><lastmod>2026-09-20T21:33:16Z</lastmod></url>
</urlset>`

        const entries = parseStylesSitemap(xml)
        expect(entries).toHaveLength(1)
        expect(entries[ 0 ]?.id).toBe('33333333-3333-4333-8333-333333333333')
        expect(entries[ 0 ]?.lastmod).toBe('2026-09-20T21:33:16Z')
    })
})
