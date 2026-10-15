/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import {REPOSITORY_URL} from '../site'

/**
 * The design notes (README §Design notes) in one paragraph: what a landing
 * reader needs is that schemas come from real payloads and degrade gracefully
 * — the five-note enumeration is reference material and lives in the README.
 */
export function DesignNotes() {
    return (
        <section
            className="section section--ruled"
            id="design-notes"
            aria-labelledby="design-notes-title"
        >
            <div className="container">
                <p className="eyebrow">Design notes</p>
                <h2 id="design-notes-title">Built from real payloads, not documentation.</h2>
                <div className="prose">
                    <p>
                        Every schema is derived from observed payloads — permissive about type,
                        strict about presence — so a partial document degrades instead of throwing
                        away a whole design system. Truncation respects structure, malformed ids
                        never cost a request, and repeat calls are usually a <code>304</code>. The
                        five notes in full in{' '}
                        <a href={`${REPOSITORY_URL}#design-notes`} target="_blank" rel="nofollow noopener">the README</a>.
                    </p>
                </div>
            </div>
        </section>
    )
}