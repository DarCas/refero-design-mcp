/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * MCP server assembly.
 *
 * The one place that knows the whole surface: it names the server, attaches
 * the tools, attaches the resources, and returns the object ready to connect.
 * It holds no logic of its own.
 *
 * Kept out of `cli.ts` because `cli.ts` owns the process's stdio, which can
 * only be taken once. `createServer()` is a pure function, which is what lets
 * the end-to-end test drive a real server in-process over an in-memory
 * transport instead of spawning a process and piping JSON-RPC.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { store } from '../index/store.js'
import { VERSION } from '../version.js'
import { registerResources } from './resources/designMd.js'
import { registerTools } from './tools/index.js'

/** Name of the MCP server on the wire. Short by design: the model reads it. */
const SERVER_NAME = 'refero-design-mcp'

const INSTRUCTIONS = [
    'This server exposes design styles extracted from the public pages of styles.refero.design.',
    '',
    'Typical flow:',
    '1. `refero_index_status` to see how much of the catalogue is indexed locally.',
    '2. `refero_match_style` with a prose brief, or `refero_search_styles` with concrete words.',
    '3. `refero_get_design_md` on the chosen style id, passing `sections` to stay within budget.',
    '',
    'A search that returns nothing usually means the style is not indexed yet, not that it does',
    'not exist. Raise `expand` to widen the pool.',
].join('\n')

export function createServer(): McpServer {
    const server = new McpServer({
        name: SERVER_NAME,
        version: VERSION,
    }, {
        instructions: INSTRUCTIONS,
    })

    registerTools(server, {
        store,
        version: VERSION,
    })
    registerResources(server, store)

    return server
}
