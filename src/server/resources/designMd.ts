/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * MCP resources.
 *
 * A resource gives clients that prefer resource reads the same content a tool
 * call would return, at a stable URI — for a document with a natural identity,
 * it spares the caller a tool call.
 */

import { ResourceTemplate, type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { config } from '../../config.js'
import { buildDesignMd } from '../../core/designMd.js'
import type { Store } from '../../index/store.js'
import { isStyleId, SECTIONS } from '../../types.js'

/**
 * How many concrete resources to advertise. The catalogue holds over a
 * thousand styles; a preview of what is already indexed keeps the listing small.
 */
const LIST_LIMIT = 50

export function registerResources(server: McpServer, store: Store): void {
    server.registerResource(
        'design-md',
        new ResourceTemplate('refero://style/{style_id}/design.md', {
            // Without enumeration the URI is readable but undiscoverable,
            // and a client that lists resources never learns it exists.
            list: async () => {
                const summaries = await store.cachedSummaries()

                return {
                    resources: summaries.slice(0, LIST_LIMIT)
                        .map(summary => ( {
                            description: `${summary.colorScheme} · ${summary.fonts.slice(0, 2).join(', ') || 'no fonts listed'}`,
                            mimeType: 'text/markdown',
                            name: `${summary.siteName} design.md`,
                            uri: `refero://style/${summary.id}/design.md`,
                        } )),
                }
            },
        }),
        {
            description: `Full design.md for a style. Available sections: ${SECTIONS.join(', ')}.`,
            mimeType: 'text/markdown',
            title: 'Design system document',
        },
        async (uri: URL) => {
            // Client-supplied, and it becomes a cache path key downstream, so it is
            // validated before it goes near the filesystem.
            const styleId = uri.pathname.replace(/^\/+/, '').split('/')[ 0 ] ?? ''
            if (!isStyleId(styleId)) {
                throw new Error(`Invalid style id in resource URI: ${uri.href}`)
            }

            const detail = await store.getStyle(styleId)

            return {
                contents: [{
                    mimeType: 'text/markdown',
                    text: buildDesignMd(detail, {}, config.maxResponseChars),
                    uri: uri.href,
                }],
            }
        },
    )
}
