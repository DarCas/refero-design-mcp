/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * MCP resources.
 *
 * A resource gives clients that prefer resource reads the same content a tool
 * call would return, at a stable URI. The design document is the obvious
 * candidate: it is a document with a natural identity, and clients that can
 * attach it to context without spending a tool call are better served.
 */

import { ResourceTemplate, type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { config } from '../../config.js'
import { buildDesignMd } from '../../core/designMd.js'
import type { Store } from '../../index/store.js'
import { SECTIONS } from '../../types.js'

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/**
 * How many concrete resources to advertise. The catalogue holds over a
 * thousand styles; listing all of them would be a large response for no gain,
 * so this stays a preview of what is already indexed.
 */
const LIST_LIMIT = 50

export function registerResources(server: McpServer, store: Store): void {
    server.registerResource(
        'design-md',
        new ResourceTemplate('refero://style/{style_id}/design.md', {
            // Enumeration is the point of a resource. Without this the URI is
            // readable but undiscoverable, and a client that lists resources never
            // learns the document exists.
            list: async () => {
                const summaries = await store.cachedSummaries()
                return {
                    resources: summaries.slice(0, LIST_LIMIT).map(summary => ( {
                        uri: `refero://style/${summary.id}/design.md`,
                        name: `${summary.siteName} design.md`,
                        description: `${summary.colorScheme} · ${summary.fonts.slice(0, 2).join(', ') || 'no fonts listed'}`,
                        mimeType: 'text/markdown',
                    } )),
                }
            },
        }),
        {
            title: 'Design system document',
            description: `Full design.md for a style. Available sections: ${SECTIONS.join(', ')}.`,
            mimeType: 'text/markdown',
        },
        async (uri: URL) => {
            // The template variable is attacker-controlled in the sense that it
            // arrives from the client; it also becomes a cache path key downstream,
            // so it is validated before it goes near the filesystem.
            const styleId = uri.pathname.replace(/^\/+/, '').split('/')[ 0 ] ?? ''
            if (!UUID_RE.test(styleId)) {
                throw new Error(`Invalid style id in resource URI: ${uri.href}`)
            }

            const detail = await store.getStyle(styleId)

            return {
                contents: [
                    {
                        uri: uri.href,
                        mimeType: 'text/markdown',
                        text: buildDesignMd(detail, {}, config.maxResponseChars),
                    },
                ],
            }
        },
    )
}
