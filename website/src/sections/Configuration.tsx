/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import { CONFIG_GLOBAL, CONFIG_NPX, CONFIG_REMOTE, NODE_FLOOR, REPOSITORY_URL } from '../site'

/**
 * Configuration (README §Installation, §Configuration): the three ways a reader
 * actually starts the server. The contributor trap and the ten-variable table
 * are reference material — they live in the README, linked, not rendered.
 */
export function Configuration() {
    return (
        <section
            className="section section--ruled"
            id="configuration"
            aria-labelledby="configuration-title"
        >
            <div className="container">
                <p className="eyebrow">Configuration</p>
                <h2 id="configuration-title">Three ways to start it.</h2>
                <p className="section-lede">
                    Point a client at the package and it runs on demand — no install step.
                    Requires Node &ge; {NODE_FLOOR}; npm reports <code>EBADENGINE</code> on an older
                    runtime.
                </p>
                <ol className="config__steps">
                    <li className="config__step">
                        <h3 className="config__step-title">
                            <span className="config__step-index">01</span>
                            Run on demand through <code>npx</code>
                        </h3>
                        <p className="config__step-body">
                            No install step — the first run downloads the package.{' '}
                            <code>-y</code> suppresses the install prompt, and the version is
                            pinned to the current major so an unattended <code>-y</code> cannot
                            pull a breaking release.
                        </p>
                        <figure className="figure terminal">
                            <figcaption className="figure__label">mcp.json</figcaption>
                            <pre className="figure__code">
                                <code>{CONFIG_NPX}</code>
                            </pre>
                        </figure>
                    </li>
                    <li className="config__step">
                        <h3 className="config__step-title">
                            <span className="config__step-index">02</span>
                            Call the installed binary
                        </h3>
                        <p className="config__step-body">
                            With the package installed globally, the entry can name the binary
                            directly — without the global install the client fails with{' '}
                            <code>exit 127: refero-design-mcp: not found</code>.
                        </p>
                        <figure className="figure terminal">
                            <figcaption className="figure__label">mcp.json</figcaption>
                            <pre className="figure__code">
                                <code>{CONFIG_GLOBAL}</code>
                            </pre>
                        </figure>
                    </li>
                    <li className="config__step">
                        <h3 className="config__step-title">
                            <span className="config__step-index">03</span>
                            Use the hosted remote
                        </h3>
                        <p className="config__step-body">
                            No process to spawn and nothing to install — point the client at the
                            hosted endpoint. Stateless, like running it yourself; the server
                            carries no authentication.
                        </p>
                        <figure className="figure terminal">
                            <figcaption className="figure__label">mcp.json</figcaption>
                            <pre className="figure__code">
                                <code>{CONFIG_REMOTE}</code>
                            </pre>
                        </figure>
                    </li>
                </ol>
                <p className="config__transport">
                    Transport is stdio by default; a second binary serves the same tools over
                    Streamable HTTP for clients that cannot spawn a process — see{' '}
                    <a
                        href={`${REPOSITORY_URL}#remote-streamable-http`}
                        target="_blank"
                        rel="nofollow noopener"
                    >
                        Remote in the README
                    </a>.
                    Diagnostics go to stderr only. Every setting is optional —
                    the three worth touching first are <code>REFERO_MAX_FETCHES</code>,{' '}
                    <code>REFERO_CONCURRENCY</code> and <code>REFERO_TIMEOUT_MS</code>. Full
                    variable table in{' '}
                    <a
                        href={`${REPOSITORY_URL}#environment-variables`}
                        target="_blank"
                        rel="nofollow noopener"
                    >
                        the README
                    </a>.
                </p>
            </div>
        </section>
    )
}
