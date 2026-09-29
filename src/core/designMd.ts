/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * design.md generator.
 *
 * `sections` is the contract, not a hint. A caller asking for two sections gets
 * those two sections; a parameter that is accepted and then ignored is worse
 * than no parameter, because the model believes it has narrowed the response
 * and silently receives the full document instead.
 *
 * Each section renders independently and the requested set is composed in the
 * canonical order, not the order the caller typed them.
 */

import { isFlightReference, SECTIONS, type Section, type StyleDetail } from '../types.js'

const SECTION_TITLES: Record<Section, string> = {
    colors: 'Colours',
    components: 'Components',
    custom: 'Notes',
    imagery: 'Imagery',
    overview: 'Overview',
    principles: "Do / Don't",
    similar: 'Related references',
    spacing: 'Spacing and radius',
    surfaces: 'Surfaces',
    type_scale: 'Type scale',
    typography: 'Typography',
}

function heading(section: Section): string {
    return `## ${SECTION_TITLES[ section ]}`
}

function bulletList(items: string[]): string {
    return items.map(item => `- ${item}`).join('\n')
}

function formatSpacing(
    radius: string | Record<string, string> | undefined,
    gap: string | undefined,
    sectionGap: string | undefined,
    padding: string | undefined,
    maxWidth: string | undefined,
): string {
    const lines: string[] = []

    if (radius) {
        if (typeof radius === 'string') {
            lines.push(`- Border radius: ${radius}`)
        } else {
            const entries = Object.entries(radius)
            lines.push(
                `- Border radius: ${entries
                    .map(([element, value]) => `${element} \`${value}\``)
                    .join(', ')}`,
            )
        }
    }
    if (gap) lines.push(`- Element gap: ${gap}`)
    if (sectionGap) lines.push(`- Section gap: ${sectionGap}`)
    if (padding) lines.push(`- Card padding: ${padding}`)
    if (maxWidth) lines.push(`- Max page width: ${maxWidth}`)

    return lines.length > 0 ? bulletList(lines) : '_Not specified._'
}

type Renderer = (detail: StyleDetail) => string | null;

const RENDERERS: Record<Section, Renderer> = {
    colors: detail => {
        const {colors, surfaces} = detail.designSystem
        if (colors.length === 0 && surfaces.length === 0) return null

        const parts: string[] = [heading('colors')]
        parts.push('', '| Token | Hex | Role |')
        parts.push('| --- | --- | --- |')

        const cell = (value: string): string => value.replace(/\|/g, '\\|')
        for (const color of colors) {
            const name = cell(color.name || color.hex || 'unnamed')
            parts.push(`| ${name} | \`${cell(color.hex)}\` | ${cell(color.role ?? color.group ?? '')} |`)
        }

        if (surfaces.length > 0) {
            parts.push('', '### Surfaces', '', '| Surface | Hex | Level | Purpose |', '| --- | --- | --- | --- |')
            for (const surface of surfaces) {
                parts.push(
                    `| ${cell(surface.name || 'unnamed')} | \`${cell(surface.hex)}\` | ${cell(String(surface.level ?? ''))} | ${cell(surface.purpose ?? '')} |`,
                )
            }
        }

        return parts.join('\n')
    },

    components: detail => {
        const {components} = detail.designSystem
        if (components.length === 0) return null

        const parts: string[] = [heading('components')]
        for (const component of components) {
            parts.push('', `### ${component.name || 'Component'}`)
            if (component.description) parts.push('', component.description)
            if (component.html) parts.push('', '```html', component.html.trim(), '```')
            if (component.css) parts.push('', '```css', component.css.trim(), '```')
        }
        return parts.join('\n')
    },

    custom: detail => {
        const {customSections} = detail.designSystem
        const usable = customSections.filter(
            section => section.content.length > 0 && !isFlightReference(section.content),
        )
        if (usable.length === 0) return null

        const parts: string[] = [heading('custom')]
        for (const section of usable) {
            parts.push('', `### ${section.title}`, '', section.content)
        }
        return parts.join('\n')
    },

    imagery: detail => {
        const {imagery, layout} = detail.designSystem
        if (!imagery && !layout) return null
        const parts: string[] = [heading('imagery')]
        if (layout) parts.push('', '**Layout**', '', layout)
        if (imagery) parts.push('', '**Imagery**', '', imagery)
        return parts.join('\n')
    },

    overview: detail => {
        const {summary, designSystem} = detail
        const lines = [
            `# ${summary.siteName}`,
            '',
            `- Source site: ${summary.url ?? 'unknown'}`,
            `- Style page: ${summary.stylePageUrl}`,
            `- Colour scheme: ${summary.colorScheme}`,
            `- Industry: ${designSystem.industry ?? 'not stated'}`,
            `- Fonts: ${summary.fonts.length > 0 ? summary.fonts.join(', ') : 'not specified'}`,
        ]
        if (designSystem.northStar) {
            lines.push('', '**North star**', '', designSystem.northStar)
        }
        if (designSystem.description) lines.push('', '**Description**', '', designSystem.description)
        return lines.join('\n')
    },

    principles: detail => {
        const {dos, donts} = detail.designSystem
        if (dos.length === 0 && donts.length === 0) return null

        const parts: string[] = [heading('principles')]
        if (dos.length > 0) parts.push('', '### Do', '', bulletList(dos))
        if (donts.length > 0) parts.push('', "### Don't", '', bulletList(donts))
        return parts.join('\n')
    },

    similar: detail => {
        const {similar} = detail.designSystem
        if (similar.length === 0) return null

        const parts: string[] = [heading('similar')]
        for (const entry of similar) {
            if (typeof entry === 'string') {
                parts.push('', `- ${entry}`)
                continue
            }
            const name = entry.business ?? 'Unnamed'
            parts.push('', `- **${name}**${entry.why ? ` — ${entry.why}` : ''}`)
        }
        return parts.join('\n')
    },

    spacing: detail => {
        const spacing = detail.designSystem.spacing
        if (!spacing) return null
        return [
            heading('spacing'),
            '',
            formatSpacing(spacing.radius, spacing.elementGap, spacing.sectionGap, spacing.cardPadding, spacing.pageMaxWidth),
        ].join('\n')
    },

    surfaces: detail => {
        const {surfaces, elevationPhilosophy} = detail.designSystem
        if (surfaces.length === 0 && !elevationPhilosophy) return null

        const parts: string[] = [heading('surfaces')]
        if (elevationPhilosophy) parts.push('', '**Elevation**', '', elevationPhilosophy)
        if (surfaces.length > 0) {
            parts.push('', bulletList(surfaces.map(surface => `\`${surface.hex}\` ${surface.name}`)))
        }
        return parts.join('\n')
    },

    type_scale: detail => {
        const {typeScale} = detail.designSystem
        if (typeScale.length === 0) return null

        const parts: string[] = [heading('type_scale'), '', '| Role | Size | Family | Weight | Line height | Letter spacing |', '| --- | --- | --- | --- | --- | --- |']
        for (const step of typeScale) {
            parts.push(
                `| ${step.role} | ${step.size ?? ''} | ${step.family ?? ''} | ${step.weight ?? ''} | ${step.lineHeight ?? ''} | ${step.letterSpacing ?? ''} |`,
            )
        }
        return parts.join('\n')
    },

    typography: detail => {
        const {typography} = detail.designSystem
        if (typography.length === 0) return null

        const parts: string[] = [heading('typography')]
        for (const entry of typography) {
            parts.push('', `### ${entry.family || 'Unnamed family'}`)
            if (entry.role) parts.push('', entry.role)
            const details: string[] = []
            if (entry.sizes) details.push(`- Sizes: ${entry.sizes}`)
            if (entry.weight) details.push(`- Weight: ${entry.weight}`)
            if (entry.lineHeight) details.push(`- Line height: ${entry.lineHeight}`)
            if (entry.substitute) details.push(`- Fallback: ${entry.substitute}`)
            if (details.length > 0) parts.push('', bulletList(details))
        }
        return parts.join('\n')
    },
}

export interface BuildOptions {
    /** Requested sections. Defaults to the full document. */
    sections?: Section[];
}

/**
 * Render a design.md document containing exactly the requested sections.
 *
 * Sections with no data are dropped rather than rendered as empty headings,
 * and the result is capped with a note pointing at the sectioned API.
 */
export function buildDesignMd(
    detail: StyleDetail,
    options: BuildOptions = {},
    maxChars: number,
): string {
    const requested = options.sections?.length ? new Set(options.sections) : new Set(SECTIONS)
    const blocks: string[] = []

    for (const section of SECTIONS) {
        if (!requested.has(section)) continue
        const rendered = RENDERERS[ section ](detail)
        if (rendered) blocks.push(rendered)
    }

    if (blocks.length === 0) {
        return [
            `# ${detail.summary.siteName}`,
            '',
            '_This style has no published design system content yet._',
        ].join('\n')
    }

    // The overview carries the document title, so it goes first regardless of
    // the order the caller listed the sections in.
    blocks.sort((a, b) => {
        const rank = (text: string): number => ( text.startsWith('# ') && !text.startsWith('## ') ? 0 : 1 )
        return rank(a) - rank(b)
    })

    const document = blocks.join('\n\n')

    if (document.length <= maxChars) return document

    const note = `\n\n---\n\n_Document truncated at ${maxChars} characters. Request specific sections to see the rest._`
    return document.slice(0, Math.max(0, maxChars - note.length)) + note
}
