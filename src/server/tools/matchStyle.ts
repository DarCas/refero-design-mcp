/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/** `refero_match_style` — rank styles against a prose design brief. */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { tokenize } from '../../core/scoring.js'
import {
    defaultLimit,
    describeExpand,
    errorText,
    formatSummaryLine,
    rankSummaries,
    text,
    TOOL_ANNOTATIONS,
    type ToolDeps,
    type ToolText,
} from './shared.js'
import type { ExpandIndex } from './searchStyles.js'

const DEFAULT_EXPAND = 50
const DEFAULT_LIMIT = 3
/** Must match the `limit` maximum in the schema below. */
const MAX_LIMIT = 20

export function registerMatchStyle(server: McpServer, deps: ToolDeps, expandIndex: ExpandIndex): void {
    server.registerTool(
        'refero_match_style',
        {
            description: 'Given a design brief in prose, return the styles that best match it, each with the terms that triggered the match and a short rationale. Use this when the request is qualitative ("I need a dense, data-heavy dashboard") rather than a specific name.',
            inputSchema: {
                brief: z.string()
                    .min(1)
                    .describe('The design brief, or a description of the interface you are building.'),
                expand: z
                    .number()
                    .int()
                    .min(0)
                    .max(500)
                    .optional()
                    .describe(`Pull this many uncached styles into the local index first (default ${DEFAULT_EXPAND}).`),
                limit: z.number()
                    .int()
                    .positive()
                    .max(20)
                    .optional()
                    .describe(`Maximum matches (default ${DEFAULT_LIMIT}).`),
            },
            title: 'Match a brief to Refero styles',
            annotations: TOOL_ANNOTATIONS,
        },
        async ({brief, expand, limit}: {
            brief: string
            expand?: number
            limit?: number
        }): Promise<ToolText> => {
            try {
                const expansion = await expandIndex(deps.store, expand ?? DEFAULT_EXPAND)
                const published = ( await deps.store.sitemap() ).length
                const summaries = await deps.store.cachedSummaries()
                const terms = tokenize(brief)

                if (terms.length === 0) {
                    return errorText(
                        'The brief contained no searchable words.',
                        'Use concrete descriptive words such as "editorial", "dense", "playful".',
                    )
                }

                const ranked = rankSummaries(summaries, terms, defaultLimit(limit, DEFAULT_LIMIT, MAX_LIMIT))

                if (ranked.length === 0) {
                    return text([
                        'No style matched the brief.',
                        '',
                        `Searched ${summaries.length} of ${published} published styles.`,
                        ...describeExpand(expansion),
                        '',
                        'Try broader wording, or pass a larger `expand` to widen the pool.',
                    ].join('\n'))
                }

                const lines: string[] = [
                    `Best matches for the brief, from ${summaries.length} of ${published} published styles indexed locally.`,
                    '',
                ]

                ranked.forEach((entry, index) => {
                    lines.push(`## ${index + 1}. ${entry.style.siteName} (score ${entry.score})`)
                    lines.push(formatSummaryLine(entry.style))

                    if (entry.matchedTerms.length > 0) {
                        lines.push(
                            '',
                            `Matched on: ${entry.matchedTerms.join(', ')}.`,
                        )
                    }

                    if (entry.style.northStar) lines.push(
                        '',
                        `> ${entry.style.northStar}`,
                    )

                    lines.push('')
                })

                lines.push(
                    ...describeExpand(expansion),

                    '',
                    'Run `refero_get_design_md` on the strongest id to get the usable system.',
                )

                return text(lines.join('\n'))
            } catch (error) {
                return errorText(( error as Error ).message)
            }
        },
    )
}
