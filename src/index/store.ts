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
 *   - cached entries are revalidated with conditional GETs using the `ETag`
 *     and `Last-Modified` the origin returned, so a repeat call usually costs a
 *     304. The sitemap's `lastmod` is display metadata only: it never drives a
 *     request, so a misparsed one cannot cause a wrong conditional fetch.
 *
 * `indexStats()` reports coverage honestly rather than pretending the local
 * cache is the whole catalogue.
 */

import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
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

function detailHash(id: string): string {
    // Guards against a malformed id ever escaping the cache directory.
    return createHash('sha256')
        .update(id)
        .digest('hex')
        .slice(0, 32)
}

function detailFile(id: string): string {
    return `${detailHash(id)}.json`
}

async function readEnvelope(path: string): Promise<CacheEnvelope | null> {
    try {
        const parsed: unknown = JSON.parse(await readFile(path, 'utf8'))
        const envelope = parsed as Partial<CacheEnvelope>

        if (!envelope.detail) return null

        const result = styleDetailSchema.safeParse(envelope.detail)
        if (!result.success) return null

        return {
            detail: result.data,
            etag: typeof envelope.etag === 'string' ? envelope.etag : null,
            lastModified: typeof envelope.lastModified === 'string' ? envelope.lastModified : null,
        }
    } catch {
        return null
    }
}

export class Store {
    private sitemapPromise: Promise<SitemapEntry[]> | null = null
    private sitemapFetchedAt = 0
    private inFlight = new Map<string, Promise<StyleDetail>>()

    /**
     * Cached summaries by id, and — in `absent` — the ids known *not* to be
     * cached. Both directions are required: uncached styles outnumber cached
     * ones by two orders of magnitude, so memoising hits alone still re-reads
     * the whole catalogue on every coverage question.
     */
    private summaries = new Map<string, StyleSummary>()

    private absent = new Set<string>()

    /** All published style ids, from the sitemap. */
    async sitemap(): Promise<SitemapEntry[]> {
        if (!this.sitemapPromise) {
            this.sitemapPromise = this.loadSitemap()

            return this.sitemapPromise
        }

        if (Date.now() - this.sitemapFetchedAt <= SITEMAP_CACHE_TTL_MS) return this.sitemapPromise

        // Refresh in the background while the stale list is still served, at
        // most one refresh in flight: parallel tool calls would otherwise each
        // start their own fetch of an unchanged sitemap.
        this.refreshPromise ??= this.loadSitemap()
            .then(() => undefined)
            .catch(() => undefined)
            .finally(() => {
                this.refreshPromise = null
            })

        return this.sitemapPromise
    }

    private refreshPromise: Promise<void> | null = null

    private lastmodMap = new Map<string, string>()

    private async loadSitemap(): Promise<SitemapEntry[]> {
        const {body} = await get(config.stylesSitemapUrl)
        const entries = parseStylesSitemap(body)

        this.lastmodMap = new Map(
            entries.filter((entry): entry is SitemapEntry & {
                lastmod: string
            } => entry.lastmod !== undefined)
                .map(entry => [
                    entry.id,
                    entry.lastmod,
                ]),
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
        force?: boolean
        maxAgeMs?: number
    } = {}): Promise<StyleDetail> {
        const pending = this.inFlight.get(id)
        if (pending) return pending

        const request = this.loadStyle(id, options)
            .finally(() => this.inFlight.delete(id))

        this.inFlight.set(id, request)

        return request
    }

    private async loadStyle(
        id: string,
        options: {
            force?: boolean
            maxAgeMs?: number
        },
    ): Promise<StyleDetail> {
        const path = await this.detailPath(id)
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

            const {
                designSystem,
                raw,
                summary,
            } = extractStyle(response.body, id, url)

            const detail: StyleDetail = {
                cachedAt: new Date().toISOString(),
                designSystem,
                lastmod: this.lastmodMap.get(id),
                raw,
                summary,
            }

            const envelope: CacheEnvelope = {
                detail,
                etag: response.etag,
                lastModified: response.lastModified,
            }

            await writeFile(path, JSON.stringify(envelope), 'utf8')
                .catch(error => {
                    log(`cache write failed for ${id}:`, error)
                })

            // The file now exists, so the one-shot directory listing must know
            // about it even though it was taken before this write.
            void this.diskIndex()
                .then(onDisk => onDisk.add(detailHash(id)))

            this.remember(detail)

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
                }), 'utf8')
                    .catch(() => undefined)

                this.remember(refreshed)

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

    /** Resolve the on-disk path for a style, creating the cache directory once. */
    private cacheDirPromise: Promise<string> | null = null

    private ensureCacheDir(): Promise<string> {
        this.cacheDirPromise ??= mkdir(join(config.cacheDir, 'styles'), {recursive: true})
            .then(() => config.cacheDir)

        return this.cacheDirPromise
    }

    private async detailPath(id: string): Promise<string> {
        const dir = await this.ensureCacheDir()
        return join(dir, 'styles', detailFile(id))
    }

    /**
     * Read a style from cache only; never touches the network.
     *
     * Bypasses the session index: the escape hatch for a caller that needs the
     * full detail. `isCached()` is the cheap question.
     */
    async peek(id: string): Promise<StyleDetail | null> {
        const cached = await readEnvelope(await this.detailPath(id))
        if (cached) this.remember(cached.detail)

        return cached?.detail ?? null
    }

    /** True when the style is already on disk, from memory once determined. */
    async isCached(id: string): Promise<boolean> {
        if (this.summaries.has(id)) return true
        if (this.absent.has(id)) return false

        return ( await this.peek(id) ) !== null
    }

    /** Summaries for every style currently held in the local cache. */
    async cachedSummaries(): Promise<StyleSummary[]> {
        const entries = await this.sitemap()

        await Promise.all(
            entries.map(entry => this.hydrate(entry.id)),
        )

        return entries.map(entry => this.summaries.get(entry.id))
            .filter((summary): summary is StyleSummary => summary !== undefined)
    }

    /** At most one disk read per style per session; the outcome is then remembered. */
    private async hydrate(id: string): Promise<void> {
        if (this.summaries.has(id) || this.absent.has(id)) return

        // One listing answers "is this cached?" for every style; probing a
        // path per style would cost a failing `readFile` per uncached id.
        const onDisk = await this.diskIndex()
        if (!onDisk.has(detailHash(id))) {
            this.absent.add(id)

            return
        }

        const cached = await readEnvelope(await this.detailPath(id))

        if (cached) this.remember(cached.detail)
        else this.absent.add(id)
    }

    /** Hashes of the cache files present on disk. Read once per session. */
    private diskIndexPromise: Promise<Set<string>> | null = null

    private diskIndex(): Promise<Set<string>> {
        this.diskIndexPromise ??= this.ensureCacheDir()
            .then(dir => readdir(join(dir, 'styles')))
            .then((files: string[]) => new Set(
                files.filter((file: string) => file.endsWith('.json'))
                    .map((file: string) => file.slice(0, -'.json'.length)),
            ))
            // A missing directory is an empty cache, not an error.
            .catch(() => new Set<string>())

        return this.diskIndexPromise
    }

    private remember(detail: StyleDetail): void {
        const id = detail.summary.id
        this.summaries.set(id, detail.summary)
        this.absent.delete(id)
    }

    async indexStats(): Promise<{
        cached: number
        coverageRatio: number
        lastIndexedAt: string | null
        published: number
    }> {
        const entries = await this.sitemap()
        const summaries = await this.cachedSummaries()

        return {
            cached: summaries.length,
            coverageRatio: entries.length === 0 ? 0 : summaries.length / entries.length,
            lastIndexedAt: this.sitemapFetchedAt === 0 ? null : new Date(this.sitemapFetchedAt).toISOString(),
            published: entries.length,
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
