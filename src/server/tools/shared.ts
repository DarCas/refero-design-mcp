/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Shared plumbing for the tool surface.
 *
 * Types and formatting helpers that more than one tool needs. Kept apart from
 * `index.ts` so individual tool modules can import from here without creating
 * a cycle through the registration barrel.
 */

import type { CallToolResult, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'
import { config } from '../../config.js'
import { scoreStyle } from '../../core/scoring.js'
import type { Store } from '../../index/store.js'
import type { StyleSummary } from '../../types.js'

/** Tool handlers return the SDK's own result type, so no adapter is needed. */
export type ToolText = CallToolResult

/**
 * Behavioural hints, declared on every tool.
 *
 * All six tools are read-only: none mutates the origin, the cache, or anything
 * the caller owns. `openWorldHint` is true throughout because every tool can
 * read `styles.refero.design`, and a warm cache is one miss away from a fetch —
 * none of them is confined to a closed system.
 *
 * Shared rather than repeated so the six declarations cannot drift apart. A tool
 * whose behaviour actually differs should pass its own object, not edit this.
 */
export const TOOL_ANNOTATIONS: ToolAnnotations = {
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
}

export interface ToolDeps {
    store: Store
    version: string
}

export function text(body: string): ToolText {
    return {
        content: [{
            text: body,
            type: 'text',
        }],
    }
}

/**
 * Report a failure as text rather than throwing.
 *
 * A tool that throws surfaces to the model as a protocol error with no
 * guidance; a tool that returns an error string can say what to do next.
 */
export function errorText(message: string, hint?: string): ToolText {
    return text(hint ? `Error: ${message}\n\nHint: ${hint}` : `Error: ${message}`)
}

/**
 * Clamp a caller-supplied limit.
 *
 * `max` must mirror the tool's own `inputSchema` maximum, or the model gets
 * fewer rows than it asked for with nothing in the response to say so.
 */
export function defaultLimit(input: number | undefined, fallback: number, max: number): number {
    if (input === undefined || !Number.isFinite(input) || input <= 0) return fallback

    return Math.min(Math.floor(input), max)
}

export function charBudget(): number {
    return config.maxResponseChars
}

/**
 * Score every summary and return the best `limit`, dropping the misses.
 *
 * Shared by search and match: two rankings that disagree would show the model
 * contradictory answers for the same words. A score of 0 means neither a literal
 * nor a mood-facet hit, so it is dropped rather than ranked last. The sort is
 * stable, keeping equal scores in sitemap order and the output reproducible.
 */
export function rankSummaries(
    summaries: readonly StyleSummary[],
    terms: readonly string[],
    limit: number,
): RankedSummary[] {
    return summaries
        .map(style => {
            const scored = scoreStyle(summaryToScorable(style), terms)

            return {
                matchedTerms: scored.matchedTerms,
                score: scored.score,
                style,
            }
        })
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
}

export interface ScorableStyle {
    colors?: string[]
    description?: string
    fonts?: string[]
    id: string
    northStar: string
    siteName: string
    url?: string
}

/**
 * Reduce a summary to the fields the scorer reads.
 *
 * Scoring never needs the full design system, and fetching one per candidate
 * would cost 300 KB per result.
 */
export function summaryToScorable(summary: StyleSummary): ScorableStyle {
    return {
        colors: summary.colors.map(color => `${color.name} ${color.hex}`),
        description: summary.description,
        fonts: summary.fonts,
        id: summary.id,
        northStar: summary.northStar,
        siteName: summary.siteName,
        url: summary.url,
    }
}

export function formatSummaryLine(summary: StyleSummary): string {
    const fonts = summary.fonts.length > 0
        ? summary.fonts
            .slice(0, 2)
            .join(', ')
        : 'no fonts listed'

    const swatches =
        summary.colors.length > 0
            ? summary.colors
                .slice(0, 6)
                .map(color => color.hex)
                .join(' ')
            : 'no colours listed'

    return [
        `- **${summary.siteName}**`,
        `  id: \`${summary.id}\``,
        `  scheme: ${summary.colorScheme} | fonts: ${fonts}`,
        `  colours: ${swatches}`,
        summary.url ? `  source: ${summary.url}` : '',
        `  page: ${summary.stylePageUrl}`,
    ]
        .filter(line => line !== '')
        .join('\n')
}

export interface RankedSummary {
    matchedTerms: string[]
    score: number
    style: StyleSummary
}

/** What an `expand` actually achieved, as opposed to what it was asked for. */
export interface ExpandReport {
    failed: number
    indexed: number
    requested: number
}

/** Phrased once so every tool reports index growth and failures identically. */
export function describeExpand(report: ExpandReport): string[] {
    const lines: string[] = []

    if (report.indexed > 0) lines.push(`Indexed ${report.indexed} additional styles on this call.`)

    if (report.failed > 0) {
        lines.push(`${report.failed} style(s) could not be fetched and are not indexed; the origin may be rate-limiting.`)
    }

    return lines
}

export interface Coverage {
    expand: ExpandReport
    published: number
    searched: number
}

export function formatSearchResults(ranked: RankedSummary[], meta: Coverage): string {
    if (ranked.length === 0) {
        return [
            'No styles matched.',
            '',
            `Searched ${meta.searched} locally indexed styles out of ${meta.published} published.`,
            ...describeExpand(meta.expand),
            '',
            'The index grows on demand. Call the tool again, or pass a larger `expand` to pull more styles in.',
        ].join('\n')
    }

    const lines: string[] = []
    lines.push(
        `Found ${ranked.length} matching style(s), from ${meta.searched} searched of ${meta.published} published.`,
        ...describeExpand(meta.expand),
        '',
    )

    ranked.forEach((entry, index) => {
        lines.push(
            `### ${index + 1}. ${entry.style.siteName} (score ${entry.score})`,
            formatSummaryLine(entry.style),
        )

        if (entry.matchedTerms.length > 0) lines.push(`  matched: ${entry.matchedTerms.join(', ')}`)

        lines.push('')
    })

    lines.push('Get the full design system with `refero_get_design_md` using the style id.')

    return lines.join('\n')
}
