/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * The tool surface.
 *
 * One module per tool, named after the tool it exposes, registered here in a
 * single readable list. Three properties the model can rely on:
 *   - `refero_index_status` exists so "no such style" can be told apart from
 *     "not indexed yet";
 *   - `refero_get_design_md` honours its `sections` argument;
 *   - search and match share one scorer, and every result states how much of
 *     the catalogue it actually covered.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { config } from '../../config.js'
import { mapWithConcurrency } from '../../core/concurrency.js'
import { log } from '../../http.js'
import type { Store } from '../../index/store.js'
import { registerGetDesignMd } from './getDesignMd.js'
import { registerGetStyle } from './getStyle.js'
import { registerIndexStatus } from './indexStatus.js'
import { registerListStyleIds } from './listStyleIds.js'
import { registerMatchStyle } from './matchStyle.js'
import { registerSearchStyles, type ExpandIndex } from './searchStyles.js'
import type { ToolDeps } from './shared.js'

export type { ToolDeps, ToolText } from './shared.js'

/**
 * Pull uncached styles into the local index.
 *
 * Bounded twice over: `REFERO_MAX_FETCHES` caps how many pages a single call
 * may pull, and `REFERO_CONCURRENCY` caps how many are in flight at once.
 * Without the second cap a large `expand` would open a burst of hundreds of
 * connections, which is neither fast nor courteous.
 */
export const expandIndex: ExpandIndex = async (store: Store, count: number): Promise<number> => {
    const budget = Math.min(count, config.maxNetworkFetchesPerCall)
    if (budget <= 0) return 0

    const entries = await store.sitemap()
    const uncached: string[] = []

    for (const entry of entries) {
        if (uncached.length >= budget) break
        if (( await store.peek(entry.id) ) === null) uncached.push(entry.id)
    }

    if (uncached.length === 0) return 0

    log(`expanding index with ${uncached.length} styles (concurrency ${config.fetchConcurrency})`)

    let indexed = 0
    await mapWithConcurrency(uncached, config.fetchConcurrency, async id => {
        await store.getStyle(id)
        indexed += 1
    })

    return indexed
}

export function registerTools(server: McpServer, deps: ToolDeps): void {
    registerIndexStatus(server, deps)
    registerSearchStyles(server, deps, expandIndex)
    registerMatchStyle(server, deps, expandIndex)
    registerGetDesignMd(server, deps)
    registerGetStyle(server, deps)
    registerListStyleIds(server, deps)
}
