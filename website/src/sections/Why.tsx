/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import {PUBLISHED_STYLES_APPROX, STYLES_URL} from '../site'

/**
 * The two decisions that shape everything else (README §"Why it is built this
 * way"), as argument — prose with the evidence in it, not a list of
 * adjectives. Verbatim tool output lives in the README; the landing page keeps
 * the reasoning and links out for the transcript.
 */
export function Why() {
    return (
        <section className="section section--ruled" id="why" aria-labelledby="why-title">
            <div className="container">
                <p className="eyebrow">Why it is built this way</p>
                <h2 id="why-title">Two decisions shape everything else.</h2>
                <div className="prose">
                    <h3>The JSON API is not used</h3>
                    <p>
                        <a href={STYLES_URL} target="_blank" rel="nofollow noopener">styles.refero.design</a>&rsquo;s{' '}
                        <code>robots.txt</code> disallows <code>/api/</code>, and the endpoint is
                        gated in practice: it answers <code>403</code> to every non-browser client
                        and <code>200</code> to a real browser, which points at TLS fingerprinting
                        rather than authentication.
                    </p>
                    <p>
                        Spoofing headers would not fix that, and would not be the right thing to
                        do regardless. So this server reads only what <code>Allow: /</code> permits
                        — the published sitemap and the public style pages — reachable with a
                        plain <code>curl</code> and no pretending to be anything else.
                    </p>

                    <h3>Coverage is reported, never implied</h3>
                    <p>
                        A style page is a few hundred KB and there are {PUBLISHED_STYLES_APPROX} of them,
                        so the local index grows on demand. That makes{' '}
                        <em>I found no matches</em> ambiguous — it usually means{' '}
                        <em>I looked at 30 of {PUBLISHED_STYLES_APPROX}</em>, not <em>nothing exists</em>.
                    </p>
                    <p>
                        Every search states its own coverage, and{' '}
                        <code>refero_index_status</code> exists so the model can check before
                        concluding that a style is absent.
                    </p>
                </div>
            </div>
        </section>
    )
}