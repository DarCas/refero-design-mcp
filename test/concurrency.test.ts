/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import { describe, expect, it } from 'vitest'
import { mapWithConcurrency } from '../src/core/concurrency.js'

const tick = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

describe('mapWithConcurrency', () => {
    it('reports an empty batch', async () => {
        expect(await mapWithConcurrency([], 4, () => undefined)).toEqual({completed: 0, failed: 0})
    })

    it('processes every item', async () => {
        const seen: number[] = []
        const outcome = await mapWithConcurrency([1, 2, 3, 4, 5], 2, item => {
            seen.push(item)
        })
        expect(outcome).toEqual({completed: 5, failed: 0})
        expect(seen.sort()).toEqual([1, 2, 3, 4, 5])
    })

    it('never exceeds the requested width', async () => {
        let active = 0
        let peak = 0

        await mapWithConcurrency(Array.from({length: 20}, (_, i) => i), 3, async () => {
            active += 1
            peak = Math.max(peak, active)
            await tick(5)
            active -= 1
        })

        expect(peak).toBeLessThanOrEqual(3)
    })

    it('keeps going when one item throws', async () => {
        const done: number[] = []
        const outcome = await mapWithConcurrency([1, 2, 3], 2, item => {
            if (item === 2) throw new Error('boom')
            done.push(item)
        })
        expect(done.sort()).toEqual([1, 3])
        // The failure is counted, not silently folded into the total: a caller that
        // reports coverage to the model must not claim a style it failed to index.
        expect(outcome).toEqual({completed: 2, failed: 1})
    })

    it('treats a width below 1 as serial', async () => {
        let active = 0
        let peak = 0
        await mapWithConcurrency([1, 2, 3], 0, async () => {
            active += 1
            peak = Math.max(peak, active)
            await tick(2)
            active -= 1
        })
        expect(peak).toBe(1)
    })
})
