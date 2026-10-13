/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import {
    DISCLAIMER,
    LICENSE,
    NODE_FLOOR,
    NPM_URL,
    PACKAGE_NAME,
    REPOSITORY_URL,
    SITE_NAME,
    SUPPORT_URL,
} from '../site'

/**
 * The colophon: the license, where the code and the package are, the support
 * link, the Node floor, and the affiliation statement — the last one repeated
 * here on purpose, because the footer is the part of the page most likely to be
 * quoted out of context.
 */
export function Footer() {
    return (
        <footer className="inverted colophon" id="colophon">
            <div className="container">
                <div className="colophon__row">
                    <p className="colophon__identity">
                        <a className="colophon__name" href={REPOSITORY_URL}>
                            {SITE_NAME}
                        </a>{' '}
                        ships <code>{PACKAGE_NAME}</code> — {LICENSE}, Node &ge; {NODE_FLOOR}.
                    </p>
                    <nav className="colophon__links" aria-label="Repository, package and support">
                        <a href={REPOSITORY_URL}>Repository</a>
                        <a href={NPM_URL}>npm</a>
                        <a href={SUPPORT_URL}>Support the project</a>
                    </nav>
                </div>
                <p className="colophon__disclaimer">{DISCLAIMER}</p>
            </div>
        </footer>
    )
}