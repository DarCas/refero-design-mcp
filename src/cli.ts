#!/usr/bin/env node

/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Entry point: serve the MCP protocol over stdio.
 *
 * Nothing may be written to stdout here — it carries JSON-RPC frames. The
 * `http` module logs to stderr for exactly this reason.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { log } from './http.js'
import { createServer } from './server/index.js'

async function main(): Promise<void> {
    const server = createServer()
    const transport = new StdioServerTransport()

    const shutdown = (signal: NodeJS.Signals): void => {
        log(`received ${signal}, shutting down`)
        void server.close().finally(() => process.exit(0))
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)

    await server.connect(transport)
    log('ready on stdio')
}

main().catch((error: unknown) => {
    process.stderr.write(`[refero-design-mcp] fatal: ${String(error)}\n`)
    process.exit(1)
})
