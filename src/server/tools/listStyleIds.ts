/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/** `refero_list_style_ids` — ids straight from the sitemap, no page reads. */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { defaultLimit, errorText, text, type ToolDeps, type ToolText } from './shared.js'

const DEFAULT_LIMIT = 50
/** Must match the `limit` maximum in the schema below. */
const MAX_LIMIT = 200

export function registerListStyleIds(server: McpServer, deps: ToolDeps): void {
    server.registerTool(
        'refero_list_style_ids',
        {
            description: 'Return published style UUIDs and their last-modified timestamps, straight from the public sitemap. Use this to discover ids without reading any style page.',
            inputSchema: {
                limit: z.number().int().positive().max(200).optional().describe(`How many ids to return (default ${DEFAULT_LIMIT}).`),
                offset: z.number().int().min(0).optional().describe('Zero-based index into the published list (default 0).'),
                updated_since: z.string().optional().describe('ISO date; return only styles modified after this date.'),
            },
            title: 'List style ids from the sitemap',
        },
        async ({limit, offset, updated_since}: {
            limit?: number
            offset?: number
            updated_since?: string
        }): Promise<ToolText> => {
            try {
                const entries = await deps.store.sitemap()
                const since = updated_since ? Date.parse(updated_since) : Number.NaN

                // An unparseable date is not an error: it means "no filter", and
                // silently returning nothing would be indistinguishable.
                const filtered = Number.isNaN(since)
                    ? entries
                    : entries.filter(entry => entry.lastmod !== undefined && Date.parse(entry.lastmod) > since)

                const start = offset ?? 0
                const page = filtered.slice(start, start + defaultLimit(limit, DEFAULT_LIMIT, MAX_LIMIT))

                if (page.length === 0) {
                    return text(`No styles matched (${filtered.length} published, ${entries.length} total).`)
                }

                return text([
                    `Showing ${page.length} of ${filtered.length} published styles (offset ${start}).`,
                    '',
                    ...page.map(entry => `- \`${entry.id}\`${entry.lastmod ? ` — updated ${entry.lastmod}` : ''}`),
                ].join('\n'))
            } catch (error) {
                return errorText(( error as Error ).message)
            }
        },
    )
}
