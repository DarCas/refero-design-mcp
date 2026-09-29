/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/** `refero_match_style` — rank styles against a prose design brief. */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { scoreStyle, tokenize } from '../../core/scoring.js'
import {
    defaultLimit,
    errorText,
    formatSummaryLine,
    summaryToScorable,
    text,
    type ToolDeps,
    type ToolText,
} from './shared.js'
import type { ExpandIndex } from './searchStyles.js'

const DEFAULT_EXPAND = 50
const DEFAULT_LIMIT = 3

export function registerMatchStyle(server: McpServer, deps: ToolDeps, expandIndex: ExpandIndex): void {
    server.registerTool(
        'refero_match_style',
        {
            title: 'Match a brief to Refero styles',
            description:
                'Given a design brief in prose, return the styles that best match it, each with the terms that triggered the match and a short rationale. Use this when the request is qualitative ("I need a dense, data-heavy dashboard") rather than a specific name.',
            inputSchema: {
                brief: z.string().min(1).describe('The design brief, or a description of the interface you are building.'),
                limit: z.number().int().positive().max(20).optional().describe(`Maximum matches (default ${DEFAULT_LIMIT}).`),
                expand: z
                    .number()
                    .int()
                    .min(0)
                    .max(500)
                    .optional()
                    .describe(`Pull this many uncached styles into the local index first (default ${DEFAULT_EXPAND}).`),
            },
        },
        async ({brief, limit, expand}: {
            brief: string;
            limit?: number;
            expand?: number
        }): Promise<ToolText> => {
            try {
                const expanded = await expandIndex(deps.store, expand ?? DEFAULT_EXPAND)
                const published = ( await deps.store.sitemap() ).length
                const summaries = await deps.store.cachedSummaries()
                const terms = tokenize(brief)

                if (terms.length === 0) {
                    return errorText(
                        'The brief contained no searchable words.',
                        'Use concrete descriptive words such as "editorial", "dense", "playful".',
                    )
                }

                const ranked = summaries
                    .map(style => {
                        const scored = scoreStyle(summaryToScorable(style), terms)
                        return {style, score: scored.score, matchedTerms: scored.matchedTerms}
                    })
                    .filter(entry => entry.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, defaultLimit(limit, DEFAULT_LIMIT))

                if (ranked.length === 0) {
                    return text(
                        [
                            'No style matched the brief.',
                            '',
                            `Searched ${summaries.length} of ${published} published styles.`,
                            '',
                            'Try broader wording, or pass a larger `expand` to widen the pool.',
                        ].join('\n'),
                    )
                }

                const lines: string[] = [
                    `Best matches for the brief, from ${summaries.length} of ${published} published styles indexed locally.`,
                    '',
                ]

                ranked.forEach((entry, index) => {
                    lines.push(`## ${index + 1}. ${entry.style.siteName} (score ${entry.score})`)
                    lines.push(formatSummaryLine(entry.style))
                    if (entry.matchedTerms.length > 0) {
                        lines.push('', `Matched on: ${entry.matchedTerms.join(', ')}.`)
                    }
                    if (entry.style.northStar) lines.push('', `> ${entry.style.northStar}`)
                    lines.push('')
                })

                if (expanded > 0) lines.push(`Indexed ${expanded} additional styles while matching.`)
                lines.push('', 'Run `refero_get_design_md` on the strongest id to get the usable system.')
                return text(lines.join('\n'))
            } catch (error) {
                return errorText(( error as Error ).message)
            }
        },
    )
}
