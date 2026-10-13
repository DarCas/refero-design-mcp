/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import {renderInline} from '../inline'
import {DESIGN_NOTES} from '../site'

/**
 * The design notes (README §Design notes): five decisions, each a claim and the
 * reason it was taken. A definition list rather than cards — the notes are
 * sentences about the implementation, and they read as a list of reasons.
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
                <h2 id="design-notes-title">Five decisions that shape the answers.</h2>
                <div className="prose">
                    <dl className="notes">
                        {DESIGN_NOTES.map((note) => (
                            <div className="notes__entry" key={note.title}>
                                <dt className="notes__term">{renderInline(note.title)}</dt>
                                <dd className="notes__definition">{renderInline(note.body)}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </section>
    )
}