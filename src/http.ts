/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Minimal HTTP client built on global fetch.
 *
 * Responsibilities kept here so no other module has to think about them:
 * - never writes to stdout (MCP stdio transport owns it)
 * - honours conditional requests so cached pages cost ~304 bytes
 * - retries idempotent failures with exponential backoff + jitter
 * - surfaces `Retry-After` when the server is throttling us
 */

import { config } from './config.js'

export class HttpError extends Error {
    readonly status: number
    readonly retryAfterMs: number | null
    readonly url: string

    constructor(message: string, status: number, url: string, retryAfterMs: number | null) {
        super(message)
        this.name = 'HttpError'
        this.status = status
        this.url = url
        this.retryAfterMs = retryAfterMs
    }
}

export class NotModifiedError extends Error {
    readonly url: string

    constructor(url: string) {
        super(`Not modified: ${url}`)
        this.name = 'NotModifiedError'
        this.url = url
    }
}

export function log(message: string, ...rest: unknown[]): void {
    if (!config.verbose) return
    // stderr only: stdout is the MCP JSON-RPC channel.
    process.stderr.write(`[refero-design-mcp] ${message}\n`)
    for (const item of rest) process.stderr.write(`${String(item)}\n`)
}

function parseRetryAfter(header: string | null): number | null {
    if (!header) return null
    const seconds = Number.parseInt(header, 10)
    if (Number.isFinite(seconds)) return Math.min(Math.max(seconds, 0), 60) * 1000

    const asDate = Date.parse(header)
    if (Number.isFinite(asDate)) {
        return Math.min(Math.max(asDate - Date.now(), 0), 60_000)
    }
    return null
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])
const MAX_ATTEMPTS = 3

function backoffDelay(attempt: number): number {
    const base = 250 * 2 ** ( attempt - 1 )
    const jitter = Math.random() * base * 0.5
    return Math.min(base + jitter, 4_000)
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

export interface GetOptions {
    /** Cached validators, enabling a conditional request. */
    etag?: string | undefined;
    lastModified?: string | undefined;
}

export interface GetResult {
    body: string;
    etag: string | null;
    lastModified: string | null;
}

export async function get(url: string, options: GetOptions = {}): Promise<GetResult> {
    const headers: Record<string, string> = {
        'User-Agent': config.userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en',
    }

    if (options.etag) headers[ 'If-None-Match' ] = options.etag
    if (options.lastModified) headers[ 'If-Modified-Since' ] = options.lastModified

    let lastError: unknown

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
            const response = await fetch(url, {
                headers,
                redirect: 'follow',
                signal: AbortSignal.timeout(config.requestTimeoutMs),
            })

            if (response.status === 304) throw new NotModifiedError(url)

            if (!response.ok) {
                const retryAfterMs = parseRetryAfter(response.headers.get('retry-after'))
                const error = new HttpError(
                    `HTTP ${response.status} ${response.statusText} for ${url}`,
                    response.status,
                    url,
                    retryAfterMs,
                )
                if (!RETRYABLE_STATUS.has(response.status) || attempt === MAX_ATTEMPTS) throw error
                lastError = error
                await sleep(retryAfterMs ?? backoffDelay(attempt))
                continue
            }

            return {
                body: await response.text(),
                etag: response.headers.get('etag'),
                lastModified: response.headers.get('last-modified'),
            }
        } catch (error) {
            if (error instanceof NotModifiedError) throw error
            // A non-retryable HTTP error should not be swallowed into a retry loop.
            if (error instanceof HttpError && !RETRYABLE_STATUS.has(error.status)) throw error
            if (attempt === MAX_ATTEMPTS) throw error
            lastError = error
            await sleep(backoffDelay(attempt))
        }
    }

    throw lastError instanceof Error ? lastError : new Error(`Request failed: ${url}`)
}
