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
import { errorText, type ToolText } from './shared.js'

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
