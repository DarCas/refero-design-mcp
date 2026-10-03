/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Error reporting for tools that address a single style.
 *
 * The three cases are kept distinct because they need different recovery
 * advice: a wrong id, a style that cannot be parsed, and a network failure
 * are not the same problem.
 */

import { Store } from '../../index/store.js'
import { isStyleId } from '../../types.js'
import { errorText, type ToolText } from './@shared.js'

/**
 * Reject a malformed style id before it costs a request.
 *
 * The id becomes a cache path key and a URL segment downstream, and a bare 404
 * gives the model nothing to act on, so the hint names the tool that lists
 * valid ids.
 */
export function validateStyleId(styleId: string): ToolText | null {
    if (isStyleId(styleId)) return null

    return errorText(
        `"${styleId}" is not a style id.`,
        'Style ids are UUIDs, for example "a73148b9-449b-42cd-9f38-86ef694f500e". Use `refero_list_style_ids` to find valid ones.',
    )
}

export function reportStyleError(error: unknown, styleId: string): ToolText {
    if (Store.isNotFound(error)) {
        return errorText(
            `Style ${styleId} was not found.`,
            'Check `refero_list_style_ids` for valid ids.',
        )
    }

    if (Store.isExtractionFailure(error)) {
        return errorText(
            `Style ${styleId} could not be parsed: ${( error as Error ).message}`,
            'The page structure may have changed at the origin.',
        )
    }

    return errorText(( error as Error ).message, `While fetching style ${styleId}.`)
}
