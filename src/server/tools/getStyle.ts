/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/** `refero_get_style` — the parsed design system and measured tokens, as JSON. */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { reportStyleError, validateStyleId } from './errors.js'
import { text, TOOL_ANNOTATIONS, type ToolDeps, type ToolText } from './shared.js'

export function registerGetStyle(server: McpServer, deps: ToolDeps): void {
    server.registerTool(
        'refero_get_style',
        {
            description: 'Return the parsed design system plus the measured tokens scraped from the live site (colours, fonts, radii, spacing) as JSON. Prefer `refero_get_design_md` when you want prose to feed into a document.',
            inputSchema: {
                include_measured_tokens: z
                    .boolean()
                    .optional()
                    .describe('Include the raw extracted token measurements (default true).'),
                refresh: z.boolean().optional().describe('Bypass the local cache and refetch (conditional request).'),
                style_id: z.string().describe('Style UUID.'),
            },
            title: 'Get a style as structured data',
            annotations: TOOL_ANNOTATIONS,
        },
        async ({include_measured_tokens, refresh, style_id}: {
            include_measured_tokens?: boolean
            refresh?: boolean
            style_id: string
        }): Promise<ToolText> => {
            const invalid = validateStyleId(style_id)
            if (invalid) return invalid

            try {
                const detail = await deps.store.getStyle(style_id, {
                    force: refresh === true,
                    maxAgeMs: refresh === true ? 0 : undefined,
                })

                // Built by omission rather than by deleting keys, so the cached entry
                // is never mutated: the same object may be reused by another call.
                const payload = include_measured_tokens === false
                    ? {
                        summary: detail.summary,
                        designSystem: detail.designSystem,
                    }
                    : detail

                return text(JSON.stringify(payload, null, 2))
            } catch (error) {
                return reportStyleError(error, style_id)
            }
        },
    )
}
