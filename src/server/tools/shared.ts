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

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { config } from '../../config.js'
import type { Store } from '../../index/store.js'
import type { StyleSummary } from '../../types.js'

/** Tool handlers return the SDK's own result type, so no adapter is needed. */
export type ToolText = CallToolResult;

/** Everything a tool needs from the wider application. */
export interface ToolDeps {
    store: Store;
    version: string;
}

export function text(body: string): ToolText {
    return {content: [{type: 'text', text: body}]}
}

/**
 * Report a failure as text rather than throwing.
 *
 * A tool that throws surfaces to the model as a protocol error with no
 * guidance; a tool that returns an error string can say what to do next.
 */
export function errorText(message: string, hint?: string): ToolText {
    const body = hint ? `Error: ${message}\n\nHint: ${hint}` : `Error: ${message}`
    return text(body)
}

/** Clamp a caller-supplied limit into a sane range. */
export function defaultLimit(input: number | undefined, fallback: number): number {
    if (input === undefined || !Number.isFinite(input) || input <= 0) return fallback
    return Math.min(Math.floor(input), 50)
}

export function charBudget(): number {
    return config.maxResponseChars
}

export interface ScorableStyle {
    id: string;
    siteName: string;
    northStar: string;
    description?: string;
    url?: string;
    colors?: string[];
    fonts?: string[];
}

/**
 * Reduce a summary to the fields the scorer looks at. Search and match both
 * run off cached summaries, so this is the common entry point: scoring never
 * needs the full design system, and fetching one per candidate would cost
 * 300 KB per result.
 */
export function summaryToScorable(summary: StyleSummary): ScorableStyle {
    return {
        id: summary.id,
        siteName: summary.siteName,
        northStar: summary.northStar,
        description: summary.description,
        url: summary.url,
        colors: summary.colors.map(color => `${color.name} ${color.hex}`),
        fonts: summary.fonts,
    }
}

export function formatSummaryLine(summary: StyleSummary): string {
    const fonts = summary.fonts.length > 0 ? summary.fonts.slice(0, 2).join(', ') : 'no fonts listed'
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
    style: StyleSummary;
    score: number;
    matchedTerms: string[];
}

export interface Coverage {
    searched: number;
    published: number;
    expanded: number;
}

export function formatSearchResults(ranked: RankedSummary[], meta: Coverage): string {
    if (ranked.length === 0) {
        return [
            'No styles matched.',
            '',
            `Searched ${meta.searched} locally indexed styles out of ${meta.published} published.`,
            '',
            'The index grows on demand. Call the tool again, or pass a larger `expand` to pull more styles in.',
        ].join('\n')
    }

    const lines: string[] = []
    lines.push(
        `Found ${ranked.length} matching style(s), from ${meta.searched} searched of ${meta.published} published.`,
    )
    if (meta.expanded > 0) lines.push(`Indexed ${meta.expanded} additional styles on this call.`)
    lines.push('')

    ranked.forEach((entry, index) => {
        lines.push(`### ${index + 1}. ${entry.style.siteName} (score ${entry.score})`)
        lines.push(formatSummaryLine(entry.style))
        if (entry.matchedTerms.length > 0) lines.push(`  matched: ${entry.matchedTerms.join(', ')}`)
        lines.push('')
    })

    lines.push('Get the full design system with `refero_get_design_md` using the style id.')
    return lines.join('\n')
}
