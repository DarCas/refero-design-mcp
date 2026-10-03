/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/** `refero_search_styles` — free-text search over locally indexed styles. */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { tokenize } from '../../core/scoring.js'
import {
    defaultLimit,
    errorText,
    formatSearchResults,
    rankSummaries,
    text,
    TOOL_ANNOTATIONS,
    type ExpandReport,
    type ToolDeps,
    type ToolText,
} from './shared.js'

const DEFAULT_EXPAND = 25
const DEFAULT_LIMIT = 5
/** Must match the `limit` maximum in the schema below. */
const MAX_LIMIT = 50

export function registerSearchStyles(server: McpServer, deps: ToolDeps, expandIndex: ExpandIndex): void {
    server.registerTool(
        'refero_search_styles',
        {
            description: 'Find design styles on styles.refero.design by free text. Matches style names, north-star statements, colours, fonts and URLs on word boundaries. The local index grows on demand, so results improve as more styles are indexed.',
            inputSchema: {
                expand: z.number()
                    .int()
                    .min(0)
                    .max(500)
                    .optional()
                    .describe(`Pull this many uncached styles into the local index first (default ${DEFAULT_EXPAND}, capped by REFERO_MAX_FETCHES).`),
                limit: z.number()
                    .int()
                    .positive()
                    .max(50)
                    .optional()
                    .describe(`Maximum results (default ${DEFAULT_LIMIT}).`),
                query: z.string()
                    .min(1)
                    .describe('Free-text query, e.g. "minimal ecommerce" or "brutalist mono".'),
            },
            title: 'Search Refero styles',
            annotations: TOOL_ANNOTATIONS,
        },
        async ({limit, expand, query}: {
            expand?: number
            limit?: number
            query: string
        }): Promise<ToolText> => {
            try {
                const expansion = await expandIndex(deps.store, expand ?? DEFAULT_EXPAND)
                const published = ( await deps.store.sitemap() ).length
                const summaries = await deps.store.cachedSummaries()

                const ranked = rankSummaries(
                    summaries,
                    tokenize(query),
                    defaultLimit(limit, DEFAULT_LIMIT, MAX_LIMIT),
                )

                return text(formatSearchResults(ranked, {
                    expand: expansion,
                    published,
                    searched: summaries.length,
                }))
            } catch (error) {
                return errorText(( error as Error ).message, 'Check network connectivity to styles.refero.design.')
            }
        },
    )
}

/** Pull uncached styles into the local index. Shared by search and match. */
export type ExpandIndex = (store: ToolDeps['store'], count: number) => Promise<ExpandReport>
