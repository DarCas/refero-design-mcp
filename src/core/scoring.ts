/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Relevance scoring.
 *
 * One implementation, shared by search and match. A second scorer that disagrees
 * with this one is a bug: a query would then rank differently depending on
 * which tool ran it, and the two tools would disagree in front of the model.
 *
 * Two rules keep the results honest:
 *   - tokens match on word boundaries, so "ai" does not match "chair";
 *   - the mood vocabulary is disjoint, so a query term contributes to exactly
 *     one facet and the facets do not double-count.
 */

export interface ScoredStyle {
    id: string
    matchedTerms: string[]
    score: number
}

interface Field {
    values: string[]
    weight: number
}

/** Mood facets; deliberately non-overlapping keyword sets. */
const MOOD_FACETS = {
    bold: ['bold', 'expressive', 'loud', 'vibrant', 'saturated', 'dramatic'],
    brutalist: ['brutalist', 'raw', 'monospace', 'unadorned', 'grid'],
    corporate: ['corporate', 'enterprise', 'professional', 'trustworthy', 'institutional'],
    editorial: ['editorial', 'magazine', 'magazine-like', 'typographic', 'content-first'],
    luxury: ['luxury', 'premium', 'refined', 'elegant', 'sophisticated', 'quiet-luxury'],
    minimal: ['minimal', 'clean', 'spare', 'restrained', 'whitespace', 'uncluttered'],
    playful: ['playful', 'friendly', 'rounded', 'quirky', 'warm', 'human'],
    technical: ['technical', 'dense', 'data', 'dashboard', 'functional', 'systematic'],
} as const

export type MoodFacet = keyof typeof MOOD_FACETS

const MOOD_LOOKUP = new Map<string, MoodFacet>(
    ( Object.keys(MOOD_FACETS) as MoodFacet[] )
        .flatMap(
            facet => MOOD_FACETS[ facet ]
                .map(keyword => [
                    keyword,
                    facet,
                ] as const),
        ),
)

export function tokenize(input: string): string[] {
    return input.toLowerCase()
        .split(/[^a-z0-9+#]+/)
        .filter(token => token.length > 1)
}

/** True when `needle` appears in `haystack` on a word boundary. */
export function containsTerm(haystack: string, needle: string): boolean {
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(needle)}([^a-z0-9]|$)`, 'i')

    return pattern.test(haystack)
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Score one style against the query terms.
 *
 * Returns 0 when nothing matched, which lets callers filter cheaply.
 */
export function scoreStyle(
    style: {
        colors?: string[]
        description?: string
        fonts?: string[]
        id: string
        northStar: string
        siteName: string
        url?: string
    },
    terms: readonly string[],
): ScoredStyle {
    if (terms.length === 0) return {
        id: style.id,
        matchedTerms: [],
        score: 0,
    }

    const fields: Field[] = [
        {
            weight: 5,
            values: [style.siteName],
        },
        {
            weight: 4,
            values: [style.northStar],
        },
        {
            weight: 3,
            values: [
                ...( style.colors ?? [] ),
                ...( style.fonts ?? [] ),
            ],
        },
        {
            weight: 2,
            values: style.description ? [style.description] : [],
        },
        {
            weight: 1,
            values: style.url ? [style.url] : [],
        },
    ]

    const matchedTerms = new Set<string>()
    let score = 0
    const seenFacets = new Set<MoodFacet>()

    for (const term of terms) {
        let bestWeight = 0

        for (const field of fields) {
            if (field.values.some(value => containsTerm(value, term))) {
                bestWeight = Math.max(bestWeight, field.weight)
            }
        }

        if (bestWeight > 0) {
            score += bestWeight
            matchedTerms.add(term)

            continue
        }

        // No literal hit: fall back to the mood vocabulary, counting each facet
        // once no matter how many of its keywords the query contained.
        const facet = MOOD_LOOKUP.get(term)
        if (facet && !seenFacets.has(facet)) {
            seenFacets.add(facet)
            score += 2
            matchedTerms.add(term)
        }
    }

    return {
        id: style.id,
        matchedTerms: [...matchedTerms],
        score,
    }
}
