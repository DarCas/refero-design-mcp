import { describe, expect, it } from 'vitest'
import { mapWithConcurrency } from '../src/core/concurrency.js'

const tick = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

describe('mapWithConcurrency', () => {
  it('returns 0 for an empty batch', async () => {
    expect(await mapWithConcurrency([], 4, () => undefined)).toBe(0)
  })

  it('processes every item', async () => {
    const seen: number[] = []
    const count = await mapWithConcurrency([1, 2, 3, 4, 5], 2, item => {
      seen.push(item)
    })
    expect(count).toBe(5)
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('never exceeds the requested width', async () => {
    let active = 0
    let peak = 0

    await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 3, async () => {
      active += 1
      peak = Math.max(peak, active)
      await tick(5)
      active -= 1
    })

    expect(peak).toBeLessThanOrEqual(3)
  })

  it('keeps going when one item throws', async () => {
    const done: number[] = []
    const count = await mapWithConcurrency([1, 2, 3], 2, item => {
      if (item === 2) throw new Error('boom')
      done.push(item)
    })
    expect(done.sort()).toEqual([1, 3])
    expect(count).toBe(3)
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
