/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import {renderInline} from '../inline'
import {INDEXED_SAMPLE, PERFORMANCE, PUBLISHED_STYLES, REPOSITORY_URL} from '../site'

/**
 * The measured half of the page (README §Performance): the operations table
 * and the one honest footnote. The log-scale chart duplicated the table, so it
 * is gone — numbers as text are what a crawler, a screen reader and a reader
 * without CSS all get.
 */
export function Performance() {
    return (
        <section
            className="section section--ruled"
            id="performance"
            aria-labelledby="performance-title"
        >
            <div className="container">
                <p className="eyebrow">Evidence: performance</p>
                <h2 id="performance-title">The index is lazy, so coverage is the slow part.</h2>
                <p className="section-lede">
                    Almost every tool call has to answer <em>how much do we actually have?</em>{' '}
                    before it can answer anything else. Measured against a warm cache of{' '}
                    {INDEXED_SAMPLE} of the {PUBLISHED_STYLES} published styles, the operations that
                    answer it got between 1.2× and 490× faster.
                </p>
                <table className="table table--metrics">
                    <thead>
                        <tr>
                            <th scope="col">Operation</th>
                            <th scope="col">Before</th>
                            <th scope="col">After</th>
                            <th scope="col">Speed-up</th>
                        </tr>
                    </thead>
                    <tbody>
                        {PERFORMANCE.map((row) => (
                            <tr key={row.operation}>
                                <th scope="row">{renderInline(row.operation)}</th>
                                <td>{row.before}</td>
                                <td>{row.after}</td>
                                <td>{row.speedUp}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="prose">
                    <p>
                        <strong>The ranking barely moved, and that is deliberate.</strong> At ~13
                        ms across the whole catalogue it was never the bottleneck, so the scorer
                        was left alone. Median of 15 runs, warm cache — your numbers will differ;
                        the ratio is the point.{' '}
                        <a href={`${REPOSITORY_URL}#performance`} target="_blank" rel="nofollow noopener">Full conditions</a>.
                    </p>
                </div>
            </div>
        </section>
    )
}