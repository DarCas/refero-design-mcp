import { describe, expect, it } from 'vitest'
import { braceMatch, decodeFlightPayload, ExtractionError, extractStyle, findStyleRecord } from '../src/sources/rsc.js'

/**
 * A hand-assembled sample of the RSC payload shape from a published style page.
 *
 * Fixture rather than live fetch: id anchoring, brace matching and
 * flight-reference detection are the fragile parts, so they are pinned against
 * the awkward shapes that actually occur — a numeric `typeScale.size`, a
 * per-element `radius` map, a `customSections.content` that is a Flight
 * reference rather than prose. A real page is ~300 KB; this is the reduction of
 * it that carries the risk.
 */
const APPLE_ID = 'a73148b9-449b-42cd-9f38-86ef694f500e'
const RELATED_ID = '40be36d7-7fe6-4451-9f2d-7ceccfd43be8'

const RECORD = {
  styleId: APPLE_ID,
  result: {
    meta: { url: 'https://www.apple.com/iphone-duo', siteName: 'Apple' },
    designSystem: {
      theme: 'light',
      northStar: 'foldable device in a white gallery',
      description: 'Apple treats the product page as a white gallery.',
      colors: [{ hex: '#ffffff', name: 'Gallery White', role: 'Page canvas', group: 'neutral' }],
      typography: [{ family: 'SF Pro Text', role: 'Body' }],
      typeScale: [{ role: 'body', size: 17, family: 'SF Pro Text', weight: 400, lineHeight: 1.29 }],
      spacing: { radius: { cards: '28px', buttons: '9999px' }, elementGap: '20px', pageMaxWidth: null },
      surfaces: [{ hex: '#ffffff', name: 'Gallery White', level: 0, purpose: 'Hero' }],
      dos: ['Keep the product centred'],
      donts: ['Add drop shadows'],
      similar: [{ business: 'Google Pixel', why: 'Isolated hardware renders' }],
      customSections: [{ title: 'Agent Prompt Guide', content: '$1e' }],
    },
    raw: {
      typography: { fonts: [{ family: 'SF Pro Text', source: 'system', weights: [400, 500], frequency: 2257 }] },
      colors: { tokens: [{ hex: '#f5f5f7', contexts: ['badge'], frequency: 33 }] },
    },
    screenshot: { url: 'https://images.example/full.jpg', thumbnail: 'https://images.example/thumb.jpg' },
  },
  screenshotUrl: 'https://images.example/full.jpg',
  isAdmin: false,
}

function toHtml(payload: unknown): string {
  const encoded = JSON.stringify(JSON.stringify(payload)).slice(1, -1)
  return `<!DOCTYPE html><html><body><script>self.__next_f.push([1,"${encoded}"])</script></body></html>`
}

describe('decodeFlightPayload', () => {
  it('decodes and concatenates multiple chunks', () => {
    const html =
      '<script>self.__next_f.push([1,"a"])</script>' +
      '<script>self.__next_f.push([1,"b"])</script>'
    expect(decodeFlightPayload(html)).toBe('ab')
  })

  it('throws a typed error when the page carries no payload', () => {
    expect(() => decodeFlightPayload('<html><body>nothing</body></html>')).toThrow(ExtractionError)
  })

  it('ignores a malformed chunk instead of failing the whole extraction', () => {
    const html = '<script>self.__next_f.push([1,"\\uZZZZ"])</script><script>self.__next_f.push([1,"ok"])</script>'
    expect(decodeFlightPayload(html)).toBe('ok')
  })
})

describe('braceMatch', () => {
  it('ignores braces inside string literals', () => {
    const blob = '{"a":"} not a brace {"}'
    expect(blob.slice(0, braceMatch(blob, 0))).toBe(blob)
  })

  it('respects escaped quotes', () => {
    const blob = '{"a":"say \\"hi\\" } ok"}'
    expect(blob.slice(0, braceMatch(blob, 0))).toBe(blob)
  })

  it('rejects an unbalanced object', () => {
    expect(() => braceMatch('{"a":1', 0)).toThrow(ExtractionError)
  })
})

describe('findStyleRecord', () => {
  it('anchors on the requested id and ignores related styles', () => {
    const blob = JSON.stringify({ styleId: RELATED_ID, result: { designSystem: { theme: 'dark' } } }) +
      JSON.stringify(RECORD)
    const found = findStyleRecord(blob, APPLE_ID)
    expect(found?.['styleId']).toBe(APPLE_ID)
  })

  it('returns null for an id that is not present', () => {
    expect(findStyleRecord(JSON.stringify(RECORD), '00000000-0000-0000-0000-000000000000')).toBeNull()
  })
})

describe('extractStyle', () => {
  const stylePageUrl = `https://styles.refero.design/style/${APPLE_ID}`
  const { summary, designSystem, raw } = extractStyle(toHtml(RECORD), APPLE_ID, stylePageUrl)

  it('reads identity from the result meta', () => {
    expect(summary.siteName).toBe('Apple')
    expect(summary.url).toBe('https://www.apple.com/iphone-duo')
    expect(summary.id).toBe(APPLE_ID)
  })

  it('normalises numeric type-scale values to strings', () => {
    expect(designSystem.typeScale[0]?.size).toBe('17')
    expect(designSystem.typeScale[0]?.weight).toBe('400')
  })

  it('keeps a per-element radius map as an object', () => {
    expect(designSystem.spacing?.radius).toEqual({ cards: '28px', buttons: '9999px' })
  })

  it('accepts a null max width rather than failing the parse', () => {
    expect(designSystem.spacing?.pageMaxWidth).toBeUndefined()
  })

  it('reads structured similar entries', () => {
    expect(designSystem.similar[0]).toEqual({ business: 'Google Pixel', why: 'Isolated hardware renders' })
  })

  it('prefers measured font data over the curated list', () => {
    expect(summary.fonts).toEqual(['SF Pro Text'])
  })

  it('exposes the screenshot urls', () => {
    expect(summary.screenshotUrl).toBe('https://images.example/full.jpg')
  })

  it('exposes measured tokens alongside the curated system', () => {
    expect(raw.colors?.tokens[0]?.hex).toBe('#f5f5f7')
  })

  it('keeps a lazy flight reference rather than pretending it is prose', () => {
    expect(designSystem.customSections[0]?.content).toBe('$1e')
  })

  it('reports a clear error when the id is absent', () => {
    expect(() => extractStyle(toHtml(RECORD), '11111111-1111-1111-1111-111111111111', stylePageUrl)).toThrow(
      /does not mention style/,
    )
  })
})
