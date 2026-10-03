/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import { describe, expect, it } from 'vitest'
import { containsTerm, scoreStyle, tokenize } from '../src/core/scoring.js'
import { rankSummaries } from '../src/server/tools/shared.js'
import { styleSummarySchema } from '../src/types.js'

const style = {
    colors: ['#5e6ad2 Indigo', '#f7f8fc Canvas'],
    description: 'Precise typography and restrained surfaces',
    fonts: ['Inter'],
    id: 'style-1',
    northStar: 'A dark, dense interface for engineers',
    siteName: 'Linear',
    url: 'https://linear.app',
}

describe('tokenize', () => {
    it('lowercases and drops punctuation', () => {
        expect(tokenize('Minimal, Editorial — Swiss!')).toEqual(['minimal', 'editorial', 'swiss'])
    })

    it('drops single characters', () => {
        expect(tokenize('a big cat')).toEqual(['big', 'cat'])
    })
})

describe('containsTerm', () => {
    it('matches on a word boundary', () => {
        expect(containsTerm('a dark, dense interface', 'dark')).toBe(true)
    })

    it('does not match inside a longer word', () => {
        // Substring matching is the trap here: "ai" would match "chair", and a
        // query for an AI product would surface every style that happens to be
        // about furniture.
        expect(containsTerm('chair', 'ai')).toBe(false)
        expect(containsTerm('A chair', 'ai')).toBe(false)
    })

    it('treats punctuation as a boundary', () => {
        expect(containsTerm('brutalist/mono', 'brutalist')).toBe(true)
        // A trailing word character is not a boundary, so a longer compound
        // word must not match its own prefix.
        expect(containsTerm('brutalistmono', 'brutalist')).toBe(false)
    })
})

describe('scoreStyle', () => {
    it('weights a name match above a description match', () => {
        const byName = scoreStyle(style, ['linear'])
        const byDescription = scoreStyle(style, ['restrained'])
        expect(byName.score).toBeGreaterThan(byDescription.score)
    })

    it('scores zero when nothing matches', () => {
        expect(scoreStyle(style, ['kubernetes']).score).toBe(0)
    })

    it('returns zero for an empty query', () => {
        expect(scoreStyle(style, []).score).toBe(0)
    })

    it('falls back to the mood vocabulary for qualitative terms', () => {
        const scored = scoreStyle(style, ['minimal'])
        expect(scored.score).toBeGreaterThan(0)
        expect(scored.matchedTerms).toContain('minimal')
    })

    it('counts a mood facet once however many of its keywords appear', () => {
        // "clean" and "minimal" are both in the minimal facet, so a query naming
        // both must not score higher than a query naming one.
        const once = scoreStyle(style, ['minimal'])
        const twice = scoreStyle(style, ['minimal', 'clean'])
        expect(twice.score).toBe(once.score)

        // Two terms from different facets still count separately.
        const other = scoreStyle(style, ['minimal', 'bold'])
        expect(other.score).toBe(once.score + 2)
    })

    it('reports which terms actually matched', () => {
        const scored = scoreStyle(style, ['linear', 'inter', 'kubernetes'])
        expect(scored.matchedTerms).toEqual(expect.arrayContaining(['linear', 'inter']))
        expect(scored.matchedTerms).not.toContain('kubernetes')
    })

    it('scores identically through rankSummaries', () => {
        // The tools rank through the shared helper rather than calling the scorer
        // themselves, so the two paths must agree or search and match would rank
        // the same words differently.
        const terms = tokenize('dense dark interface')
        const summary = styleSummarySchema.parse({
            colors: [{name: 'Indigo', hex: '#5e6ad2'}],
            description: style.description,
            fonts: style.fonts,
            id: style.id,
            northStar: style.northStar,
            siteName: style.siteName,
            stylePageUrl: 'https://styles.refero.design/style/00000000-0000-4000-8000-000000000001',
            url: style.url,
        })

        const ranked = rankSummaries([summary], terms, 5)
        expect(ranked).toHaveLength(1)
        expect(ranked[ 0 ]?.score).toBe(scoreStyle(style, terms).score)
    })
})

describe('rankSummaries', () => {
    const make = (id: string, siteName: string) =>
        styleSummarySchema.parse({
            id,
            northStar: 'a quiet interface',
            siteName,
            stylePageUrl: `https://styles.refero.design/style/${id}`,
        })

    it('drops styles that match nothing', () => {
        expect(rankSummaries([make('a', 'Apple')], tokenize('kubernetes'), 5)).toEqual([])
    })

    it('honours the limit and ranks by descending score', () => {
        const summaries = [make('a', 'Kubernetes'), make('b', 'Apple'), make('c', 'Apple')]
        const ranked = rankSummaries(summaries, ['apple'], 2)
        expect(ranked).toHaveLength(2)
        expect(ranked[ 0 ]?.score).toBeGreaterThanOrEqual(ranked[ 1 ]?.score ?? 0)
    })
})
