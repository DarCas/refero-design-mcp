/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import {PUBLISHED_STYLES, STYLE_PAGE_SIZE} from '../site'

/**
 * The indexing pipeline (README §"How styles are indexed"): the sitemap, the
 * style page, the cached record. It is the README's own text diagram rebuilt as
 * an ordered list, so the three stages are text in the document — crawlable and
 * readable without the CSS, and legible to a screen reader as a sequence.
 */
export function HowItWorks() {
    return (
        <section className="section section--ruled" id="how-it-works" aria-labelledby="how-title">
            <div className="container">
                <p className="eyebrow">How it works</p>
                <h2 id="how-title">A sitemap, a style page, a cached record.</h2>
                <p className="section-lede">
                    The Refero Design MCP turns one of the {PUBLISHED_STYLES} published styles into
                    a validated record in three steps: the sitemap names the ids, the style page
                    carries the payload, and the parser keeps what it finds.
                </p>
                <figure className="figure terminal">
                    <figcaption className="figure__label">
                        How a published style becomes a record
                    </figcaption>
                    <ol className="pipeline">
                        <li className="pipeline__stage">
                            <p className="pipeline__step">01 · enumerate</p>
                            <p className="pipeline__artifact">sitemaps/styles.xml</p>
                            <p className="pipeline__yield">
                                every style id with its <code>lastmod</code> — small, fetched once
                            </p>
                        </li>
                        <li className="pipeline__stage">
                            <p className="pipeline__step">02 · fetch on demand</p>
                            <p className="pipeline__artifact">/style/&#123;id&#125;</p>
                            <p className="pipeline__yield">
                                a Next.js RSC payload inside the page&rsquo;s HTML —{' '}
                                {STYLE_PAGE_SIZE}, fetched on demand
                            </p>
                        </li>
                        <li className="pipeline__stage">
                            <p className="pipeline__step">03 · parse and cache</p>
                            <p className="pipeline__artifact">
                                result.meta · result.raw · result.designSystem
                            </p>
                            <p className="pipeline__yield">parsed, validated, cached</p>
                        </li>
                    </ol>
                    <p className="figure__note">
                        The index is lazy: the sitemap is read once, but a style page is{' '}
                        {STYLE_PAGE_SIZE} and there are {PUBLISHED_STYLES} of them, so a search or
                        a match only ever sees what it has indexed. That is why every result
                        states its coverage — a miss is not a verdict.
                    </p>
                </figure>
                <div className="prose">
                    <p>
                        The style record is located by <code>styleId</code>. A page embeds a dozen
                        or more related styles that share the same key names, so anchoring on the
                        id is what prevents returning a neighbour&rsquo;s palette.
                    </p>
                    <p>
                        The RSC format is internal to Next.js and may change. Every failure
                        surfaces as a typed error rather than a partially-filled object that looks
                        like a valid answer.
                    </p>
                </div>
            </div>
        </section>
    )
}