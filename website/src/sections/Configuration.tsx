/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import {renderInline} from '../inline'
import {
    CONFIG_GLOBAL,
    CONFIG_NPX,
    CONFIG_TRAP,
    ENV_VARS,
    ENV_WORTH_TOUCHING,
    NODE_FLOOR,
} from '../site'

/**
 * Configuration (README §Installation, §Configuration, §Environment variables):
 * the three ways a client can start the server, in the order a reader meets
 * them, and the ten environment variables behind the defaults — collapsed, so
 * the three worth touching are what the section is about.
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
                            <code>-y</code> suppresses the install prompt, which would otherwise
                            block startup, and the version is pinned to the current major so an
                            unattended <code>-y</code> cannot pull a breaking release. Starts
                            in about 2s on a cold cache, under 1s once cached.
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
                            directly. This form works <strong>only</strong> with the global
                            install in place — without it the client fails to start the server
                            (<code>exit 127: refero-design-mcp: not found</code>). Either form
                            behaves identically once running.
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
                            One trap, for developing the package
                        </h3>
                        <p className="config__step-body">
                            Both forms fail with{' '}
                            <code>exit 127: sh: 1: refero-design-mcp: not found</code> when the
                            client&rsquo;s working directory is a checkout of <em>this</em>{' '}
                            repository, and work everywhere else. Inside its own checkout the{' '}
                            <code>package.json</code> matches the package name, so{' '}
                            <code>npx</code> resolves the request to the local project instead of
                            the registry — and a
                            project never links its own bins into <code>node_modules/.bin</code>. If
                            you hit it, name the package and the binary separately:
                        </p>
                        <figure className="figure terminal">
                            <figcaption className="figure__label">mcp.json</figcaption>
                            <pre className="figure__code">
                                <code>{CONFIG_TRAP}</code>
                            </pre>
                        </figure>
                        <p className="config__step-body">
                            No other user hits this: it needs a local <code>package.json</code> with
                            this exact name.
                        </p>
                    </li>
                </ol>
                <p className="config__transport">
                    Transport is stdio. Diagnostics go to stderr only — stdout carries
                    JSON-RPC frames and nothing else. The package is scoped but the binary is
                    not, so the command is <code>refero-design-mcp</code> with no{' '}
                    <code>@darcas/</code> prefix.
                </p>
                <details className="disclosure">
                    <summary className="disclosure__summary">
                        Every environment variable, and its default
                    </summary>
                    <div className="disclosure__body">
                        <p>
                            Every setting is optional, and the defaults are the ones{' '}
                            <code>src/config.ts</code> validates at startup. They are
                            alphabetical, so
                            a variable is found by looking rather than by knowing which group it
                            sits
                            in. The three worth touching first when you want faster research rather
                            than more of it are{' '}
                            {ENV_WORTH_TOUCHING.map((name, index) => (
                                <span key={name}>
                                    {index > 0 && ', '}
                                    {renderInline(name)}
                                    {index === ENV_WORTH_TOUCHING.length - 1 ? '.' : ''}
                                </span>
                            ))}
                        </p>
                        <table className="table table--env">
                            <thead>
                                <tr>
                                    <th scope="col">Variable</th>
                                    <th scope="col">Default</th>
                                    <th scope="col">Purpose</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ENV_VARS.map((entry) => (
                                    <tr key={entry.name}>
                                        <th scope="row">{renderInline(entry.name)}</th>
                                        <td>{renderInline(entry.value)}</td>
                                        <td>{renderInline(entry.purpose)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </details>
            </div>
        </section>
    )
}