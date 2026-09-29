/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/** `refero_get_design_md` — render a style as a sectioned design.md document. */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { buildDesignMd } from '../../core/designMd.js'
import { sectionSchema, SECTIONS, type Section } from '../../types.js'
import { reportStyleError } from './errors.js'
import { charBudget, text, type ToolDeps, type ToolText } from './shared.js'

export function registerGetDesignMd(server: McpServer, deps: ToolDeps): void {
    server.registerTool(
        'refero_get_design_md',
        {
            description:
                'Render a style as a design.md document. The `sections` argument is honoured: request only the sections you need to stay within budget. Without it you get the whole document, truncated on a structural boundary.',
            inputSchema: {
                style_id: z.string().describe('Style UUID, e.g. "a73148b9-449b-42cd-9f38-86ef694f500e".'),
                sections: z
                    .array(sectionSchema)
                    .optional()
                    .describe(`Which sections to include, in any order: ${SECTIONS.join(', ')}. Omit for everything.`),
                refresh: z.boolean().optional().describe('Bypass the local cache and refetch (conditional request).'),
            },
            title: 'Get design.md for a style',
        },
        async ({style_id, sections, refresh}: {
            refresh?: boolean;
            sections?: string[];
            style_id: string
        }): Promise<ToolText> => {
            try {
                const detail = await deps.store.getStyle(style_id, {
                    force: refresh === true,
                    maxAgeMs: refresh === true ? 0 : undefined,
                })
                return text(buildDesignMd(detail, {sections: sections as Section[] | undefined}, charBudget()))
            } catch (error) {
                return reportStyleError(error, style_id)
            }
        },
    )
}
