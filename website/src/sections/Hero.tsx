/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import {
    INSTALL_COMMAND,
    LICENSE,
    NODE_FLOOR,
    NPM_URL,
    PACKAGE_NAME,
    PUBLISHED_STYLES,
    REPOSITORY_URL,
    SITE_NAME,
    SITE_TAGLINE,
    STYLES_URL,
    TEST_COUNT,
    TOOL_COUNT,
} from '../site'

export function Hero() {
    return (
        <section className="hero" id="top" aria-labelledby="hero-title">
            <div className="container">
                <p className="hero__brand">{SITE_NAME}</p>
                <h1 className="hero__title" id="hero-title">
                    {SITE_TAGLINE}
                </h1>
                <p className="hero__lede">
                    <code>{PACKAGE_NAME}</code> is an MCP server that discovers, searches and
                    extracts design systems from the {PUBLISHED_STYLES} styles published on{' '}
                    <a href={STYLES_URL}>styles.refero.design</a> — palette, type scale, spacing,
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
                    <a className="button" href={NPM_URL}>
                        Install from npm
                    </a>
                    <a className="link" href={REPOSITORY_URL}>
                        Read the documentation
                    </a>
                </div>
                <p className="hero__facts">
                    Node &ge; {NODE_FLOOR} &middot; {LICENSE} &middot; {TOOL_COUNT} MCP tools
                    &middot; {TEST_COUNT} tests
                </p>
            </div>
        </section>
    )
}
