/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import { describe, expect, it } from 'vitest'
import { buildDesignMd } from '../src/core/designMd.js'
import { truncateMarkdown } from '../src/core/truncate.js'
import { styleDetailSchema, type StyleDetail } from '../src/types.js'

const detail: StyleDetail = styleDetailSchema.parse({
    cachedAt: '2026-01-01T00:00:00.000Z',
    designSystem: {
        colors: [{hex: '#ffffff', name: 'Gallery White', role: 'Page canvas', group: 'neutral'}],
        customSections: [{title: 'Agent Guide', content: '$1e'}],
        description: 'A white gallery.',
        donts: ['Add drop shadows'],
        dos: ['Centre the product'],
        northStar: 'foldable device in a white gallery',
        similar: [{business: 'Google Pixel', why: 'isolated renders'}],
        spacing: {radius: {cards: '28px'}, elementGap: '20px'},
        theme: 'light',
    },
    summary: {
        colorScheme: 'light',
        colors: [{name: 'Gallery White', hex: '#ffffff'}],
        fonts: ['SF Pro Text'],
        id: 'a73148b9-449b-42cd-9f38-86ef694f500e',
        siteName: 'Apple',
        stylePageUrl: 'https://styles.refero.design/style/a73148b9-449b-42cd-9f38-86ef694f500e',
        url: 'https://www.apple.com/iphone-duo',
    },
})

describe('buildDesignMd', () => {
    it('honours the sections argument', () => {
        // A `sections` argument that is accepted but ignored is worse than none:
        // the caller believes it has narrowed the response and has not.
        const markdown = buildDesignMd(detail, {sections: ['colors']}, 10_000)
        expect(markdown).toContain('## Colours')
        expect(markdown).not.toContain("### Don't")
        expect(markdown).not.toContain('## Components')
    })

    it('puts the overview first regardless of the requested order', () => {
        const markdown = buildDesignMd(detail, {sections: ['colors', 'overview']}, 10_000)
        expect(markdown.startsWith('# Apple')).toBe(true)
    })

    it('drops sections with no data instead of rendering empty headings', () => {
        const markdown = buildDesignMd(detail, {sections: ['components']}, 10_000)
        expect(markdown).not.toContain('## Components')
    })

    it('skips a lazy flight reference rather than printing it as prose', () => {
        const markdown = buildDesignMd(detail, {sections: ['custom']}, 10_000)
        expect(markdown).not.toContain('$1e')
    })

    it('renders a per-element radius map', () => {
        const markdown = buildDesignMd(detail, {sections: ['spacing']}, 10_000)
        expect(markdown).toContain('cards `28px`')
    })

    it('renders structured similar entries', () => {
        const markdown = buildDesignMd(detail, {sections: ['similar']}, 10_000)
        expect(markdown).toContain('**Google Pixel**')
    })

    it('escapes pipes so markdown tables stay intact', () => {
        const withPipe: StyleDetail = {
            ...detail,
            designSystem: {
                ...detail.designSystem,
                colors: [{hex: '#fff', name: 'A|B', role: 'r'}],
            },
        }
        // Escaped, not replaced: dropping the character would silently alter data.
        expect(buildDesignMd(withPipe, {sections: ['colors']}, 10_000)).toContain('A\\|B')
    })

    it('says so when the document had to be cut', () => {
        const markdown = buildDesignMd(detail, {}, 120)
        expect(markdown).toContain('truncated')
    })

    it('never leaves a code fence open when the document is cut', () => {
        // A raw `slice(0, n)` cap lands inside a `css` block, and the test
        // above passed anyway because it only looked for the word "truncated".
        const withCode: StyleDetail = {
            ...detail,
            designSystem: {
                ...detail.designSystem,
                components: [{name: 'Card', css: '.card { color: red; }'.repeat(40)}],
            },
        }

        for (const budget of [80, 140, 200, 300, 500, 900]) {
            const markdown = buildDesignMd(withCode, {}, budget)
            const fences = markdown.split('\n').filter(line => line.trim().startsWith('```'))
            expect(fences.length % 2, `budget ${budget} left ${fences.length} fences`).toBe(0)
        }
    })
})

describe('truncateMarkdown', () => {
    it('leaves a short document untouched', () => {
        const result = truncateMarkdown('# Title', 100)
        expect(result.truncated).toBe(false)
        expect(result.text).toBe('# Title')
    })

    it('never returns an unterminated code fence', () => {
        // A character-count cut would leave an odd number of fences.
        const document = ['text', '```html', '<div class="card">content</div>', '```', 'more'].join('\n')
        const result = truncateMarkdown(document, 20)
        const fences = result.text.split('\n').filter(line => line.trim().startsWith('```'))
        expect(fences.length % 2).toBe(0)
    })

    it('announces the truncation', () => {
        const result = truncateMarkdown('line\n'.repeat(200), 100)
        expect(result.truncated).toBe(true)
        expect(result.text).toContain('truncated')
    })
})
