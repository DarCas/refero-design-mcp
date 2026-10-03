/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Response truncation.
 *
 * Cutting markdown with `slice(0, n)` slices code fences in half, which makes
 * the model read broken HTML/CSS as if it were the design. This trims on a
 * structural boundary instead: it stops on a line boundary, closes any fence it
 * left open, and always says what was removed — so a shortened response is
 * still valid markdown.
 */

export interface TruncateResult {
    originalLength: number
    text: string
    truncated: boolean
}

const FENCE_RE = /^\s*```|^\s*~~~/

export function truncateMarkdown(text: string, limit: number): TruncateResult {
    if (text.length <= limit) {
        return {
            text,
            truncated: false,
            originalLength: text.length,
        }
    }

    const lines = text.split('\n')
    const kept: string[] = []
    let length = 0
    let openFence: string | null = null
    let truncated = false

    for (const line of lines) {
        const cost = line.length + 1

        if (length + cost > limit) {
            truncated = true

            break
        }

        const fence = FENCE_RE.exec(line)?.[ 0 ] ?? null

        if (openFence === null) {
            kept.push(line)
            length += cost
            if (fence) openFence = fence
        } else if (fence && fence.startsWith(openFence)) {
            kept.push(line)
            length += cost
            openFence = null
        } else {
            kept.push(line)
            length += cost
        }
    }

    if (openFence !== null) {
        // Never hand back an unterminated fence.
        kept.push('```')
    }

    if (truncated) {
        kept.push(
            '',
            '---',
            '',
            `_Response truncated at ${limit} characters. Ask for specific sections to get the rest._`,
        )
    }

    const output = kept.join('\n')

    return {
        originalLength: text.length,
        text: output,
        truncated,
    }
}
