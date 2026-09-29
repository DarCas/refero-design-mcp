/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/** `refero_search_styles` — free-text search over locally indexed styles. */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { scoreStyle, tokenize } from '../../core/scoring.js'
import {
    defaultLimit,
    errorText,
    formatSearchResults,
    summaryToScorable,
    text,
    type ToolDeps,
    type ToolText,
} from './shared.js'

const DEFAULT_EXPAND = 25
const DEFAULT_LIMIT = 5

export function registerSearchStyles(server: McpServer, deps: ToolDeps, expandIndex: ExpandIndex): void {
    server.registerTool(
        'refero_search_styles',
        {
            title: 'Search Refero styles',
            description:
                'Find design styles on styles.refero.design by free text. Matches style names, north-star statements, colours, fonts and URLs on word boundaries. The local index grows on demand, so results improve as more styles are indexed.',
            inputSchema: {
                query: z.string().min(1).describe('Free-text query, e.g. "minimal ecommerce" or "brutalist mono".'),
                limit: z.number().int().positive().max(50).optional().describe(`Maximum results (default ${DEFAULT_LIMIT}).`),
                expand: z
                    .number()
                    .int()
                    .min(0)
                    .max(500)
                    .optional()
                    .describe(`Pull this many uncached styles into the local index first (default ${DEFAULT_EXPAND}, capped by REFERO_MAX_FETCHES).`),
            },
        },
        async ({query, limit, expand}: {
            query: string;
            limit?: number;
            expand?: number
        }): Promise<ToolText> => {
            try {
                const expanded = await expandIndex(deps.store, expand ?? DEFAULT_EXPAND)
                const published = ( await deps.store.sitemap() ).length
                const summaries = await deps.store.cachedSummaries()
                const terms = tokenize(query)

                const ranked = summaries
                    .map(style => {
                        const scored = scoreStyle(summaryToScorable(style), terms)
                        return {style, score: scored.score, matchedTerms: scored.matchedTerms}
                    })
                    .filter(entry => entry.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, defaultLimit(limit, DEFAULT_LIMIT))

                return text(formatSearchResults(ranked, {
                    searched: summaries.length,
                    published,
                    expanded,
                }))
            } catch (error) {
                return errorText(( error as Error ).message, 'Check network connectivity to styles.refero.design.')
            }
        },
    )
}

/** Pull uncached styles into the local index. Shared by search and match. */
export type ExpandIndex = (store: ToolDeps['store'], count: number) => Promise<number>;
