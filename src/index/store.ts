/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Local style store.
 *
 * The sitemap lists every published style, but a style page is ~300 KB of
 * HTML. Indexing all 1 300+ of them up front would mean ~400 MB of traffic on
 * a cold start, which is both slow and rude to the origin. So the store grows
 * lazily instead:
 *
 *   - the sitemap is fetched once and cached (it is small, and it tells us
 *     which styles exist without touching them);
 *   - a style's detail is fetched only when something actually asks for it,
 *     then persisted to disk;
 *   - cached entries are revalidated with conditional GETs driven by the
 *     sitemap's `lastmod`, so a repeat call usually costs a 304.
 *
 * `indexStats()` reports coverage honestly rather than pretending the local
 * cache is the whole catalogue.
 */

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { config } from '../config.js'
import { get, HttpError, log, NotModifiedError } from '../http.js'
import { parseStylesSitemap } from '../sources/sitemap.js'
import { ExtractionError, extractStyle } from '../sources/rsc.js'
import {
    styleDetailSchema,
    type SitemapEntry,
    type StyleDetail,
    type StyleSummary,
} from '../types.js'

interface CacheEnvelope {
    etag: string | null;
    lastModified: string | null;
    detail: StyleDetail;
}

const SITEMAP_CACHE_TTL_MS = 6 * 60 * 60 * 1000

async function ensureCacheDir(): Promise<string> {
    const dir = config.cacheDir
    await mkdir(join(dir, 'styles'), {recursive: true})

    return dir
}

function detailPath(cacheDir: string, id: string): string {
    // Guards against a malformed id ever escaping the cache directory.
    const safe = createHash('sha256').update(id).digest('hex').slice(0, 32)
    return join(cacheDir, 'styles', `${safe}.json`)
}

async function readEnvelope(path: string): Promise<CacheEnvelope | null> {
    try {
        const parsed: unknown = JSON.parse(await readFile(path, 'utf8'))
        const envelope = parsed as Partial<CacheEnvelope>
        if (!envelope.detail) return null
        const result = styleDetailSchema.safeParse(envelope.detail)
        if (!result.success) return null
        return {
            etag: typeof envelope.etag === 'string' ? envelope.etag : null,
            lastModified: typeof envelope.lastModified === 'string' ? envelope.lastModified : null,
            detail: result.data,
        }
    } catch {
        return null
    }
}

export class Store {
    private sitemapPromise: Promise<SitemapEntry[]> | null = null
    private sitemapFetchedAt = 0
    private inFlight = new Map<string, Promise<StyleDetail>>()

    /** All published style ids, from the sitemap. */
    async sitemap(force = false): Promise<SitemapEntry[]> {
        const stale = Date.now() - this.sitemapFetchedAt > SITEMAP_CACHE_TTL_MS
        if (!force && this.sitemapPromise && !stale) return this.sitemapPromise
        if (!force && this.sitemapPromise && stale) {
            // Refresh in the background; serve the stale list meanwhile.
            void this.loadSitemap().catch(() => undefined)
            return this.sitemapPromise
        }
        this.sitemapPromise = this.loadSitemap()
        return this.sitemapPromise
    }

    private lastmodMap = new Map<string, string>()

    private async loadSitemap(): Promise<SitemapEntry[]> {
        const {body} = await get(config.stylesSitemapUrl)
        const entries = parseStylesSitemap(body)

        this.lastmodMap = new Map(
            entries
                .filter((entry): entry is SitemapEntry & {
                    lastmod: string
                } => entry.lastmod !== undefined)
                .map(entry => [entry.id, entry.lastmod]),
        )

        this.sitemapFetchedAt = Date.now()
        log(`indexed ${entries.length} style ids from sitemap`)
        return entries
    }

    lastmodFor(id: string): string | undefined {
        return this.lastmodMap.get(id)
    }

    /**
     * Load a style, from cache when possible.
     *
     * `maxAgeMs` of 0 forces a network round trip (still conditional when the
     * cache has validators).
     */
    async getStyle(id: string, options: {
        maxAgeMs?: number;
        force?: boolean
    } = {}): Promise<StyleDetail> {
        const pending = this.inFlight.get(id)
        if (pending) return pending

        const request = this.loadStyle(id, options).finally(() => this.inFlight.delete(id))
        this.inFlight.set(id, request)
        return request
    }

    private async loadStyle(
        id: string,
        options: { maxAgeMs?: number; force?: boolean },
    ): Promise<StyleDetail> {
        const cacheDir = await ensureCacheDir()
        const path = detailPath(cacheDir, id)
        const cached = await readEnvelope(path)

        const maxAgeMs = options.maxAgeMs ?? config.cacheTtlMs
        const age = cached ? Date.now() - Date.parse(cached.detail.cachedAt) : Infinity
        const fresh = cached !== null && age < maxAgeMs && options.force !== true

        if (cached && fresh) return cached.detail

        const url = `${config.siteBaseUrl}/style/${id}`

        try {
            const response = await get(url, {
                etag: cached?.etag ?? undefined,
                lastModified: cached?.lastModified ?? undefined,
            })

            const {summary, designSystem, raw} = extractStyle(response.body, id, url)
            const detail: StyleDetail = {
                summary,
                designSystem,
                raw,
                cachedAt: new Date().toISOString(),
                lastmod: this.lastmodMap.get(id),
            }

            const envelope: CacheEnvelope = {
                etag: response.etag,
                lastModified: response.lastModified,
                detail,
            }
            await writeFile(path, JSON.stringify(envelope), 'utf8').catch(error => {
                log(`cache write failed for ${id}:`, error)
            })

            return detail
        } catch (error) {
            if (error instanceof NotModifiedError && cached) {
                // Revalidated: extend the lifetime without re-parsing anything.
                const refreshed: StyleDetail = {
                    ...cached.detail,
                    cachedAt: new Date().toISOString(),
                }
                await writeFile(path, JSON.stringify({
                    ...cached,
                    detail: refreshed,
                }), 'utf8').catch(() => undefined)
                return refreshed
            }
            if (cached) {
                // A stale answer beats no answer, but say so rather than pretending.
                log(`serving stale cache for ${id}:`, ( error as Error ).message)
                return cached.detail
            }
            throw error
        }
    }

    /** Read a style from cache only; never touches the network. */
    async peek(id: string): Promise<StyleDetail | null> {
        const cacheDir = await ensureCacheDir()
        const cached = await readEnvelope(detailPath(cacheDir, id))
        return cached?.detail ?? null
    }

    /** Summaries for every style currently held in the local cache. */
    async cachedSummaries(): Promise<StyleSummary[]> {
        const entries = await this.sitemap()
        const summaries = await Promise.all(entries.map(entry => this.peek(entry.id)))
        return summaries
            .filter((detail): detail is StyleDetail => detail !== null)
            .map(detail => detail.summary)
    }

    async indexStats(): Promise<{
        published: number;
        cached: number;
        coverageRatio: number;
        lastIndexedAt: string | null;
    }> {
        const entries = await this.sitemap()
        const summaries = await this.cachedSummaries()
        return {
            published: entries.length,
            cached: summaries.length,
            coverageRatio: entries.length === 0 ? 0 : summaries.length / entries.length,
            lastIndexedAt: this.sitemapFetchedAt === 0 ? null : new Date(this.sitemapFetchedAt).toISOString(),
        }
    }

    /** True when the failure is a property of the style, not of our request. */
    static isNotFound(error: unknown): boolean {
        return error instanceof HttpError && error.status === 404
    }

    static isExtractionFailure(error: unknown): boolean {
        return error instanceof ExtractionError
    }
}

export const store = new Store()
