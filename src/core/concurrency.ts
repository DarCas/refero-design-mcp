/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Bounded-concurrency helper.
 *
 * Fetching a batch of style pages one at a time is polite but slow — each page
 * is a few hundred KB. This runs at most `limit` requests at a time and never
 * rejects the batch: a single failed style must not abort the sweep.
 */

/**
 * The worker may be synchronous; it is invoked inside an async function so a
 * rejection is captured and the rest of the batch still runs.
 */
export type BatchWorker<T> = (item: T, index: number) => void | Promise<void>;

export async function mapWithConcurrency<T>(
    items: readonly T[],
    limit: number,
    worker: BatchWorker<T>,
): Promise<number> {
    if (items.length === 0) return 0

    const width = Math.max(1, Math.min(limit, items.length))
    let cursor = 0
    let completed = 0

    const run = async (): Promise<void> => {
        for (; ;) {
            const index = cursor
            cursor += 1
            if (index >= items.length) return
            try {
                await worker(items[ index ] as T, index)
            } catch {
                // Swallowed on purpose: the caller counts successes, and one broken
                // style should not discard the work already done.
            }
            completed += 1
        }
    }

    await Promise.all(Array.from({length: width}, run))
    return completed
}
