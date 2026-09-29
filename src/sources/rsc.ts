/**
 * Extracts style data from a Refero style page.
 *
 * The page is a Next.js App Router document. Its React Server Component
 * payload arrives as a series of
 *
 *   self.__next_f.push([1, "<escaped chunk>"])
 *
 * calls. Concatenating the decoded chunks yields a text blob in which the
 * style's authoritative record appears as ordinary JSON:
 *
 *   { styleId, result: { meta, raw, designSystem, screenshot }, ... }
 *
 * Selecting that record by `styleId` matters: a single page also embeds a
 * dozen or more *related* styles that share the same key names, and taking
 * the wrong one silently returns a neighbour's palette.
 *
 * The format is internal to Next.js and may change without notice, so every
 * failure mode is explicit: callers get a typed error rather than a
 * partially-filled object that looks like a valid answer.
 */

import {
  designSystemSchema,
  rawTokensSchema,
  styleSummarySchema,
  type DesignSystem,
  type RawTokens,
  type StyleSummary,
} from '../types.js'

export class ExtractionError extends Error {
  readonly reason: 'no-flight-payload' | 'no-style-record' | 'malformed-json' | 'schema-mismatch'

  constructor(reason: ExtractionError['reason'], message: string) {
    super(message)
    this.name = 'ExtractionError'
    this.reason = reason
  }
}

const FLIGHT_PUSH_RE = /self\.__next_f\.push\(\[1,\s*"((?:[^"\\]|\\.)*)"\]\)/g

/** Decode and concatenate the RSC flight chunks embedded in an HTML document. */
export function decodeFlightPayload(html: string): string {
  FLIGHT_PUSH_RE.lastIndex = 0
  const chunks: string[] = []
  let match: RegExpExecArray | null

  while ((match = FLIGHT_PUSH_RE.exec(html)) !== null) {
    try {
      chunks.push(JSON.parse(`"${match[1]}"`) as string)
    } catch {
      // One malformed chunk must not sink the whole extraction.
    }
  }

  if (chunks.length === 0) {
    throw new ExtractionError(
      'no-flight-payload',
      'No React Server Component payload found. The page structure may have changed.',
    )
  }

  return chunks.join('')
}

/**
 * Given the index of a `{`, return the index just past its matching `}`.
 * String literals and escapes are respected so braces inside CSS or prose do
 * not confuse the scan.
 */
export function braceMatch(blob: string, startIndex: number): number {
  if (blob[startIndex] !== '{') {
    throw new ExtractionError('malformed-json', `Expected '{' at index ${startIndex}`)
  }

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = startIndex; i < blob.length; i += 1) {
    const char = blob[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) continue

    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return i + 1
    }
  }

  throw new ExtractionError('malformed-json', 'Unbalanced JSON object: no closing brace found')
}

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Find the enclosing JSON object at `offset`.
 *
 * Walks outwards and returns the *innermost* enclosing object satisfying
 * `accept` — the tightest record that is still complete, which is what we want
 * when nested records reuse key names.
 */
function findEnclosingRecord(
  blob: string,
  offset: number,
  accept: (record: JsonRecord) => boolean,
): JsonRecord | null {
  if (offset < 0) return null

  for (let i = offset; i >= 0; i -= 1) {
    if (blob[i] !== '{') continue
    let end: number
    try {
      end = braceMatch(blob, i)
    } catch {
      continue
    }
    if (end < offset) continue

    let parsed: unknown
    try {
      parsed = JSON.parse(blob.slice(i, end))
    } catch {
      continue
    }
    if (accept(parsed as JsonRecord)) return parsed as JsonRecord
  }

  return null
}

/**
 * Locate the style's authoritative record.
 *
 * A page mentions its own id many times — in the React element tree, in
 * preview slots, in "related styles" lists — and the payload we want sits at
 * only one of those positions. Every occurrence is tried until one is wrapped
 * in a record carrying a `result` payload for this exact id.
 */
export function findStyleRecord(blob: string, id: string): JsonRecord | null {
  const needle = `"${id}"`
  const accepts = [
    (candidate: JsonRecord): boolean =>
      isRecord(candidate['result']) && (candidate['styleId'] === id || candidate['id'] === id),
    (candidate: JsonRecord): boolean => isRecord(candidate['result']),
  ]

  for (const accept of accepts) {
    let offset = -1
    while ((offset = blob.indexOf(needle, offset + 1)) !== -1) {
      const record = findEnclosingRecord(blob, offset, accept)
      if (record) return record
    }
  }

  return null
}

function readString(source: JsonRecord, key: string): string | undefined {
  const value = source[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export interface ExtractedStyle {
  summary: StyleSummary;
  designSystem: DesignSystem;
  raw: RawTokens;
}

/** Extract summary, curated design system and measured tokens from a style page. */
export function extractStyle(html: string, id: string, stylePageUrl: string): ExtractedStyle {
  const blob = decodeFlightPayload(html)

  if (!blob.includes(id)) {
    throw new ExtractionError('no-style-record', `The page does not mention style ${id}.`)
  }

  const record = findStyleRecord(blob, id)
  if (!record) {
    throw new ExtractionError(
      'no-style-record',
      `No style payload found for ${id}. This style may not have a published design system yet.`,
    )
  }

  const result = record['result'] as JsonRecord
  const meta = isRecord(result['meta']) ? result['meta'] : {}
  const screenshot = isRecord(result['screenshot']) ? result['screenshot'] : {}

  const designSystemParsed = designSystemSchema.safeParse(result['designSystem'] ?? {})
  if (!designSystemParsed.success) {
    throw new ExtractionError(
      'schema-mismatch',
      `Design system did not match the expected shape: ${designSystemParsed.error.issues
        .slice(0, 3)
        .map(issue => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('; ')}`,
    )
  }
  const designSystem = designSystemParsed.data

  const rawParsed = rawTokensSchema.safeParse(result['raw'] ?? {})
  const raw: RawTokens = rawParsed.success ? rawParsed.data : rawTokensSchema.parse({})

  // Fonts: prefer the measured list (it carries weights and usage counts),
  // falling back to the curated design system when absent.
  const typographyRaw = raw['typography']
  const measuredFamilies =
    isRecord(typographyRaw) && Array.isArray(typographyRaw['fonts'])
      ? (typographyRaw['fonts'] as unknown[])
          .map(font => (isRecord(font) ? readString(font, 'family') : undefined))
          .filter((family): family is string => typeof family === 'string')
      : []

  const fonts =
    measuredFamilies.length > 0
      ? measuredFamilies
      : designSystem.typography.map(entry => entry.family).filter(family => family.length > 0)

  const summary = styleSummarySchema.parse({
    id,
    siteName: readString(meta, 'siteName') ?? readString(record, 'siteName') ?? `Style ${id.slice(0, 8)}`,
    url: readString(meta, 'url') ?? readString(record, 'url'),
    description: designSystem.description?.slice(0, 600) ?? '',
    northStar: designSystem.northStar ?? '',
    colorScheme: designSystem.theme ?? 'unknown',
    fonts: [...new Set(fonts)],
    colors: designSystem.colors.map(color => ({ name: color.name, hex: color.hex })),
    screenshotUrl: readString(screenshot, 'url') ?? readString(record, 'screenshotUrl'),
    thumbnailUrl: readString(screenshot, 'thumbnail') ?? readString(record, 'thumbnailUrl'),
    stylePageUrl,
  })

  return { summary, designSystem, raw }
}
