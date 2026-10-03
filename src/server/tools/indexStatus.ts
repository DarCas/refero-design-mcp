/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/** `refero_index_status` — honest reporting of local index coverage. */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { errorText, text, TOOL_ANNOTATIONS, type ToolDeps, type ToolText } from './@shared.js'

export function registerIndexStatus(server: McpServer, deps: ToolDeps): void {
    server.registerTool(
        'refero_index_status',
        {
            description: 'Report how many published styles exist and how many are indexed locally. Call this before concluding that a style does not exist: a miss usually means it has not been indexed yet.',
            inputSchema: {},
            title: 'Refero index coverage',
            annotations: TOOL_ANNOTATIONS,
        },
        async (): Promise<ToolText> => {
            try {
                const stats = await deps.store.indexStats()
                const percent = stats.coverageRatio * 100

                return text(
                    [
                        `Refero index status (server version ${deps.version})`,
                        '',
                        `- Published styles: ${stats.published}`,
                        `- Indexed locally: ${stats.cached}`,
                        // Below 1% the rounded figure reads as a flat zero and hides that
                        // anything was indexed at all.
                        `- Coverage: ${percent < 1 && stats.cached > 0 ? `<1% (${stats.cached} styles)` : `${Math.round(percent)}%`}`,
                        `- Sitemap last read: ${stats.lastIndexedAt ?? 'never'}`,
                        '',
                        'Search and match results reflect local coverage only. Raise `expand` on those tools to index more styles.',
                    ].join('\n'),
                )
            } catch (error) {
                return errorText(( error as Error ).message, 'The sitemap could not be read; the server may be offline.')
            }
        },
    )
}
