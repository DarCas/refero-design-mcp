/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'

/** A style as advertised by the sitemap: identity plus freshness signal. */
export const sitemapEntrySchema = z.object({
    id: z.string()
        .uuid(),
    lastmod: z.string()
        .optional(),
})
export type SitemapEntry = z.infer<typeof sitemapEntrySchema>

export const styleSummarySchema = z.object({
    id: z.string(),
    siteName: z.string(),
    url: z.string()
        .optional(),
    /** Opening of the design system description, kept for search relevance. */
    description: z.string()
        .default(''),
    northStar: z.string()
        .default(''),
    colorScheme: z.string()
        .default('unknown'),
    fonts: z.array(z.string())
        .default([]),
    colors: z.array(
        z.object({
            name: z.string().default(''),
            hex: z.string().default(''),
        }),
    )
        .default([]),
    screenshotUrl: z.string()
        .optional(),
    thumbnailUrl: z.string()
        .optional(),
    stylePageUrl: z.string(),
})
export type StyleSummary = z.infer<typeof styleSummarySchema>

/*
 * Field shapes below were derived by inspecting real style pages, not by
 * guessing: the same key arrives as a string on one style and a number on
 * the next, `null` shows up where a value is expected, and whole sub-objects
 * change shape between sites. Every schema is therefore permissive about type
 * and strict about presence, so a partial document degrades instead of
 * throwing away a whole design system.
 */

const measurement = z.union([
    z.string(),
    z.number(),
])
    .transform(value => String(value).trim())
    .transform(value => ( value === '' ? undefined : value ))

const optionalMeasurement = measurement.optional()

/** Tolerates absent / null / wrong-typed optionals. */
const nullableMeasurement = measurement.nullish()
    .transform(value => value ?? undefined)

export const designSystemSchema = z
    .object({
        colors: z.array(
            z.object({
                hex: z.string().default(''),
                name: z.string().default(''),
                role: z.string().optional(),
                group: z.string().optional(),
            })
                .passthrough(),
        )
            .default([]),
        components: z.array(
            z.object({
                name: z.string().default(''),
                html: z.string().optional(),
                css: z.string().optional(),
                description: z.string().optional(),
            })
                .passthrough(),
        )
            .default([]),
        customSections: z.array(
            z.object({
                title: z.string().default(''),
                // May be a React Flight lazy reference such as "$1e" rather than
                // inline content; the renderer detects and skips those.
                content: z.string().default(''),
            })
                .passthrough(),
        )
            .default([]),
        description: z.string()
            .optional(),
        donts: z.array(z.string())
            .default([]),
        dos: z.array(z.string())
            .default([]),
        elevationPhilosophy: z.string()
            .optional(),
        imagery: z.string()
            .optional(),
        industry: z.string()
            .optional(),
        layout: z.string()
            .optional(),
        northStar: z.string()
            .optional(),
        similar: z.array(
            z.union([
                z.string(),
                z.object({
                    business: z.string().optional(),
                    why: z.string().optional(),
                }).passthrough(),
            ]),
        )
            .default([]),
        spacing: z.object({
            // Observed as a per-element map, e.g. { cards: "28px", buttons: "9999px" }.
            radius: z.record(z.string(), z.string()).or(measurement).optional(),
            elementGap: nullableMeasurement,
            sectionGap: nullableMeasurement,
            cardPadding: nullableMeasurement,
            pageMaxWidth: nullableMeasurement,
        })
            .passthrough()
            .optional(),
        surfaces: z.array(
            z.object({
                hex: z.string().default(''),
                name: z.string().default(''),
                level: z.union([z.string(), z.number()]).optional(),
                purpose: z.string().optional(),
            })
                .passthrough(),
        )
            .default([]),
        theme: z.string()
            .optional(),
        // Observed as [{ business, why }], but older styles use bare strings.
        typeScale: z.array(
            z.object({
                role: z.string().default(''),
                family: z.string().optional(),
                size: optionalMeasurement,
                weight: measurement.optional(),
                lineHeight: optionalMeasurement,
                letterSpacing: optionalMeasurement,
            })
                .passthrough(),
        )
            .default([]),
        typography: z.array(
            z.object({
                family: z.string().default(''),
                role: z.string().optional(),
                sizes: nullableMeasurement,
                weight: nullableMeasurement,
                lineHeight: nullableMeasurement,
                letterSpacing: nullableMeasurement,
                substitute: z.string().optional(),
            })
                .passthrough(),
        )
            .default([]),
    })
    .passthrough()

export type DesignSystem = z.infer<typeof designSystemSchema>

/**
 * Measured tokens scraped from the live site, as opposed to the curated design
 * system. These carry usage frequency and context, which is what makes them
 * useful for telling a signature colour from an incidental one.
 */
export const rawTokensSchema = z.object({
    colors: z.object({
        tokens: z.array(
            z.object({
                hex: z.string().default(''),
                contexts: z.array(z.string()).default([]),
                frequency: z.number().default(0),
                properties: z.array(z.string()).default([]),
            })
                .passthrough(),
        )
            .default([]),
    })
        .passthrough()
        .optional(),
    gradients: z.array(z.unknown())
        .default([]),
    shapes: z.object({
        radii: z.array(
            z.object({
                value: measurement.optional(),
                contexts: z.array(z.string()).default([]),
                frequency: z.number().default(0),
            })
                .passthrough(),
        )
            .default([]),
    })
        .passthrough()
        .optional(),
    spacing: z.object({
        tokens: z.array(
            z.object({
                value: measurement.optional(),
                contexts: z.array(z.string()).default([]),
                frequency: z.number().default(0),
                properties: z.array(z.string()).default([]),
            })
                .passthrough(),
        )
            .default([]),
    })
        .passthrough()
        .optional(),
    typography: z.object({
        fonts: z.array(
            z.object({
                family: z.string().default(''),
                source: z.string().optional(),
                weights: z.array(measurement).default([]),
                frequency: z.number().default(0),
            })
                .passthrough(),
        )
            .default([]),
    })
        .passthrough()
        .optional(),
})
    .passthrough()

export type RawTokens = z.infer<typeof rawTokensSchema>

/** Everything we know about one style: summary, curated system, measured tokens. */
export const styleDetailSchema = z.object({
    /** When this entry was written to the local cache. */
    cachedAt: z.string(),
    designSystem: designSystemSchema,
    /** lastmod advertised by the sitemap at the time of the fetch. */
    lastmod: z.string()
        .optional(),
    /**
     * `prefault`, not `default`: in zod 4 `default` substitutes the value
     * verbatim, which would leave this field as a bare `{}` with none of
     * `rawTokensSchema`'s own defaults filled in. `prefault` applies the value to
     * the *input* and then parses it, which is what zod 3's `default` did.
     */
    raw: rawTokensSchema.prefault({}),
    summary: styleSummarySchema,
})
export type StyleDetail = z.infer<typeof styleDetailSchema>

/** Sections of a design system document, in the order they should be rendered. */
export const SECTIONS = [
    'overview',
    'colors',
    'typography',
    'type_scale',
    'spacing',
    'surfaces',
    'imagery',
    'principles',
    'components',
    'similar',
    'custom',
] as const

export const sectionSchema = z.enum(SECTIONS)
export type Section = z.infer<typeof sectionSchema>

/** True for React Flight lazy references such as "$1e" or "$L3". */
export function isFlightReference(value: string): boolean {
    return /^\$[0-9a-zA-Z]+$/.test(value.trim())
}

const STYLE_ID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/**
 * True for a well-formed style UUID.
 *
 * Checked before anything reaches the network or the cache directory: the id
 * arrives from the model and becomes a cache path key and a URL segment.
 */
export function isStyleId(value: string): boolean {
    return STYLE_ID_RE.test(value)
}
