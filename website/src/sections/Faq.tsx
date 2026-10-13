/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import {renderInline} from '../inline'
import {DISCLAIMER, FAQ} from '../site'

/**
 * The FAQ (README §intro, §Installation, §Configuration, §Environment
 * variables, `src/config.ts`): the questions readers actually ask, on the
 * inverted graphite band.
 *
 * The answers are `<details>` because an FAQ is a list of independent answers,
 * not a document to read top to bottom — and because the band is the one place
 * on the page where collapsing content also improves the composition. The
 * questions and answers are the strings in `site.ts`, which is what Step 6's
 * `FAQPage` JSON-LD is built from: an assistant quotes the page's answer.
 */
export function Faq() {
    return (
        <section className="inverted faq" id="faq" aria-labelledby="faq-title">
            <div className="container">
                <p className="eyebrow">FAQ</p>
                <h2 id="faq-title">The six questions this page should answer itself.</h2>
                <div className="faq__list">
                    {FAQ.map((entry) => (
                        <details className="disclosure faq__item" key={entry.question}>
                            <summary className="disclosure__summary faq__question">
                                {entry.question}
                            </summary>
                            <div className="disclosure__body faq__answer">
                                <p>{renderInline(entry.answer)}</p>
                            </div>
                        </details>
                    ))}
                </div>
                <p className="faq__disclaimer">{DISCLAIMER}</p>
            </div>
        </section>
    )
}