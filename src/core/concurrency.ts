/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Bounded-concurrency helper.
 *
 * Runs at most `limit` tasks at a time and never rejects the batch: one failed
 * style must not abort a sweep of the rest.
 */

/**
 * The worker may be synchronous; it is invoked inside an async function so a
 * rejection is captured and the rest of the batch still runs.
 */
export type BatchWorker<T> = (item: T, index: number) => void | Promise<void>

/** What a batch achieved, as opposed to what it attempted. */
export interface BatchOutcome {
    completed: number
    failed: number
}

export async function mapWithConcurrency<T>(
    items: readonly T[],
    limit: number,
    worker: BatchWorker<T>,
): Promise<BatchOutcome> {
    if (items.length === 0) return {
        completed: 0,
        failed: 0,
    }

    const width = Math.max(1, Math.min(limit, items.length))
    let cursor = 0
    let completed = 0
    let failed = 0

    const run = async (): Promise<void> => {
        for (; ;) {
            const index = cursor
            cursor += 1
            if (index >= items.length) return
            try {
                await worker(items[ index ] as T, index)
                completed += 1
            } catch {
                // Counted rather than discarded: the caller reports
                // coverage, and a batch that lost half its styles to
                // failures must not read as a success.
                failed += 1
            }
        }
    }

    await Promise.all(Array.from({length: width}, run))

    return {
        completed,
        failed,
    }
}
