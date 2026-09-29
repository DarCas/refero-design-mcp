/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import { VERSION } from './version.js'

/**
 * Runtime configuration. Everything is overridable via environment so the
 * server can be pointed at a fixture during tests without touching code.
 *
 * Data source policy: we only read paths that robots.txt allows (`Allow: /`,
 * published sitemaps, and `/style/{id}` pages). The `/api/` tree is
 * `Disallow`ed for `User-Agent: *` and is never contacted.
 */

function intEnv(name: string, fallback: number): number {
    const raw = process.env[ name ]
    if (raw === undefined || raw.trim() === '') return fallback
    const parsed = Number.parseInt(raw, 10)
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`Invalid ${name}: expected a non-negative integer, got "${raw}"`)
    }
    return parsed
}

function boolEnv(name: string, fallback: boolean): boolean {
    const raw = process.env[ name ]
    if (raw === undefined || raw.trim() === '') return fallback
    return raw === '1' || raw.toLowerCase() === 'true'
}

const SITE_BASE_URL = ( process.env.REFERO_SITE_URL ?? 'https://styles.refero.design' )
    .replace(/\/+$/, '')

export const config = {
    /** Where the on-disk style cache lives. */
    cacheDir: process.env.REFERO_CACHE_DIR ??
        `${process.env.XDG_CACHE_HOME ??
        `${process.env.HOME}/.cache`}/refero-design-mcp`,

    /** Conditional-GET revalidation window for a cached style page. */
    cacheTtlMs: intEnv('REFERO_CACHE_TTL_MS', 7 * 24 * 60 * 60 * 1000),

    /** How many style pages may be in flight at once. Kept low to stay a polite client. */
    fetchConcurrency: intEnv('REFERO_CONCURRENCY', 4),

    /** Hard ceiling on how many styles a single tool call will pull from the network. */
    maxNetworkFetchesPerCall: intEnv('REFERO_MAX_FETCHES', 25),

    /** Response budget before markdown is truncated. */
    maxResponseChars: intEnv('REFERO_MAX_RESPONSE_CHARS', 40_000),

    requestTimeoutMs: intEnv('REFERO_TIMEOUT_MS', 30_000),

    siteBaseUrl: SITE_BASE_URL,

    /** Published sitemap listing every style page with its lastmod. */
    stylesSitemapUrl: process.env.REFERO_STYLES_SITEMAP ??
        `${SITE_BASE_URL}/sitemaps/styles.xml`,

    /** Identifier sent in User-Agent so the operator can be identified and contacted. */
    userAgent: process.env.REFERO_USER_AGENT
        ?? `refero-design-mcp/${VERSION} (+https://github.com/DarCas/refero-design-mcp; MCP client)`,

    verbose: boolEnv('REFERO_VERBOSE', false),
} as const

export type config = typeof config
