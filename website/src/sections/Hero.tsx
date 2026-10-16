/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import {
    INSTALL_COMMAND,
    NPM_URL,
    PACKAGE_NAME,
    PUBLISHED_STYLES_APPROX,
    REPOSITORY_URL,
    SITE_NAME,
    SITE_TAGLINE,
    STYLES_URL,
} from '../site'

export function Hero() {
    return (
        <section className="hero" id="top" aria-labelledby="hero-title">
            <div className="hero__glow" aria-hidden="true">
                <div className="hero__wash">
                    <span className="hero__blob hero__blob--a" />
                    <span className="hero__blob hero__blob--b" />
                </div>
                <span className="hero__scan" />
            </div>
            <div className="container">
                <p className="hero__brand">{SITE_NAME}</p>
                <h1 className="hero__title" id="hero-title">
                    {SITE_TAGLINE}
                </h1>
                <p className="hero__lede">
                    <code>{PACKAGE_NAME}</code> is an MCP server that discovers, searches and
                    extracts design systems from the {PUBLISHED_STYLES_APPROX} styles published on{' '}
                    <a href={STYLES_URL} target="_blank" rel="nofollow noopener">styles.refero.design</a> — palette, type scale, spacing,
                    surfaces and do/don&rsquo;t guidance — so a coding agent implements from
                    measured evidence instead of an invented direction.
                </p>
                <figure className="hero__install terminal">
                    <figcaption className="hero__install-label">Install</figcaption>
                    <pre className="hero__install-code">
                        <code>{INSTALL_COMMAND}</code>
                    </pre>
                </figure>
                <div className="hero__actions">
                    <a className="button" href={NPM_URL} target="_blank" rel="nofollow noopener">
                        Install from npm
                    </a>
                    <a className="link" href={REPOSITORY_URL} target="_blank" rel="nofollow noopener">
                        Read the documentation
                    </a>
                </div>
            </div>
        </section>
    )
}
