/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * The backtick spans of a quoted README sentence, as inline code.
 *
 * The strings `site.ts` holds are copies of README sentences, backticks and
 * all, so the source stays checkable against the README by eye. This is the one
 * place a backtick becomes an element: a string method cannot insert an element
 * in the middle of a string, and printing the backticks themselves would be a
 * page defect — so the odd indexes below are the spans `String.split` captured.
 */

import type {ReactNode} from 'react'

const CODE_SPAN = /`([^`]+)`/g

export function renderInline(text: string): ReactNode[] {
    return text.split(CODE_SPAN).map((part, index) =>
        index % 2 === 1 ? <code key={index}>{part}</code> : part,
    )
}