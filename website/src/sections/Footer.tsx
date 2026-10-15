/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import {
    LICENSE_URL,
    NPM_URL,
    PACKAGE_NAME,
    PERSON_NAME,
    PERSON_URL,
    REPOSITORY_URL,
    SUPPORT_URL,
} from '../site'

const START_YEAR = 2026

function getYearRange(): string {
    const current = new Date().getFullYear()
    return current > START_YEAR ? `${START_YEAR}-${current}` : `${START_YEAR}`
}

/**
 * The colophon: who built the page, what designed its layout, and under which
 * license it ships — then the affiliation statement, repeated here on purpose
 * because the footer is the part of the page most likely to be quoted out of
 * context.
 */
export function Footer() {
    return (
        <footer className="inverted colophon" id="colophon">
            <div className="container">
                <div className="colophon__row">
                    <div className="colophon__identity">
                        <p>
                            Built by{' '}
                            <a className="colophon__name" href={PERSON_URL} target="_blank" rel="nofollow noopener">
                                {PERSON_NAME}
                            </a>
                        </p>
                        <p>
                            Layout designed with{' '}
                            <a href={REPOSITORY_URL} target="_blank" rel="nofollow noopener">
                                <code>{PACKAGE_NAME}</code>
                            </a>
                        </p>
                        <p>
                            &copy; {getYearRange()} {PERSON_NAME}.{' '}
                            <a href={LICENSE_URL} target="_blank" rel="nofollow noopener">MIT licensed</a>.
                        </p>
                    </div>
                    <nav className="colophon__links" aria-label="Repository, package and support">
                        <a href={REPOSITORY_URL} target="_blank" rel="nofollow noopener">Repository</a>
                        <a href={NPM_URL} target="_blank" rel="nofollow noopener">npm</a>
                        <a href={SUPPORT_URL} target="_blank" rel="nofollow noopener">Support the project</a>
                    </nav>
                </div>
            </div>
        </footer>
    )
}
