import { describe, expect, it } from 'vitest'
import { containsTerm, scoreStyle, tokenize } from '../src/core/scoring.js'

const style = {
  id: 'style-1',
  siteName: 'Linear',
  northStar: 'A dark, dense interface for engineers',
  description: 'Precise typography and restrained surfaces',
  url: 'https://linear.app',
  colors: ['#5e6ad2 Indigo', '#f7f8fc Canvas'],
  fonts: ['Inter'],
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
})
