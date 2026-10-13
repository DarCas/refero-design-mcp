/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import {renderInline} from '../inline'
import {
    INDEXED_SAMPLE,
    PERFORMANCE,
    PERFORMANCE_CHART,
    PERFORMANCE_CONDITIONS,
    PUBLISHED_STYLES,
} from '../site'

/**
 * The measured half of the page (README §Performance): the operations table, the
 * same four rows as a chart, and the two notes that keep the numbers honest.
 *
 * The chart is CSS bars, not an image: a bar is a div whose width is derived
 * from the ratio, and the number and its label are text in the document, so a
 * crawler, a screen reader and a reader without CSS all get the measurement
 * rather than a picture of one.
 */

/** Bar length on a log₁₀ scale, so 1.2× is visible next to 490×. */
function barWidth(ratio: number): string {
    return `${(Math.log10(ratio) / Math.log10(490)) * 100}%`
}

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
                <figure className="chart">
                    <figcaption className="chart__caption">
                        Speed-up on a log scale — bar length is log₁₀ of the
                        value, so the 1.2× row is still a row.
                    </figcaption>
                    <ul className="chart__rows">
                        {PERFORMANCE_CHART.map((row) => {
                            const width = barWidth(row.ratio)

                            return (
                                <li className="chart__row" key={row.label}>
                                    <span className="chart__value">{row.value}</span>
                                    <span className="chart__bar-track" aria-hidden="true">
                                        <span className="chart__bar" style={{width}} />
                                    </span>
                                    <span className="chart__label">{row.label}</span>
                                </li>
                            )
                        })}
                    </ul>
                </figure>
                <div className="prose">
                    <p>
                        <strong>The ranking barely moved, and that is deliberate.</strong> It was
                        measured before being optimised: at ~13 ms across the whole catalogue it was
                        never the bottleneck, so the scorer was left alone rather than tuned against
                        a
                        guess.
                    </p>
                    <p>
                        <strong>
                            The first call in a process is dominated by one sitemap request
                        </strong>
                        , not by the disk. That fetch is what makes coverage honest, and it is why
                        it
                        happens once rather than per call.
                    </p>
                    <p className="performance__footnote">{PERFORMANCE_CONDITIONS}</p>
                </div>
            </div>
        </section>
    )
}