/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * The section index: a fixed bottom-right disclosure listing every section
 * anchor, identical on mobile and desktop.
 *
 * A native `<details>` rather than React state, so the menu works with
 * JavaScript disabled and prerenders closed — the render stays deterministic
 * and there is nothing to hydrate. The glyph is text (`≡`), not an icon font,
 * which the house rules forbid.
 */

const ENTRIES: Array<{href: string; label: string}> = [
    {href: '#top', label: 'Top'},
    {href: '#why', label: 'Why'},
    {href: '#how-it-works', label: 'How it works'},
    {href: '#tools', label: 'Tools'},
    {href: '#skill', label: 'Skill'},
    {href: '#performance', label: 'Performance'},
    {href: '#configuration', label: 'Configuration'},
    {href: '#design-notes', label: 'Notes'},
    {href: '#faq', label: 'FAQ'},
]

import type {MouseEvent as ReactMouseEvent} from 'react'

/**
 * Click behaviour: the menu closes on every jump so it never covers the
 * landing section, and "Top" scrolls without touching the URL hash.
 * Plain `href`s stay in the markup, so without JavaScript the browser still
 * performs a native anchor jump — the script only polishes it.
 *
 * Order matters: closing the `<details>` first collapses the fixed panel, and
 * the scroll starts on the next frame against the final layout. Scrolling in
 * the same task as the close leaves the page where it was (verified
 * in-browser: smooth scroll + synchronous close = `y` unchanged).
 */
function onNavigate(event: ReactMouseEvent<HTMLAnchorElement>): void {
    const details = event.currentTarget.closest('details')
    const href = event.currentTarget.getAttribute('href') ?? ''
    const smooth = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth'

    event.preventDefault()
    details?.removeAttribute('open')

    requestAnimationFrame(() => {
        if (href === '#top') {
            window.scrollTo({top: 0, behavior: smooth})
            window.history.replaceState(null, '', window.location.pathname)
        } else {
            document.querySelector(href)?.scrollIntoView({behavior: smooth, block: 'start'})
            window.history.replaceState(null, '', href)
        }
    })
}

export function Nav() {
    return (
        <details className="nav-fab">
            <summary className="nav-fab__button" aria-label="Sections">
                <span className="nav-fab__lines" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                </span>
            </summary>
            <nav className="nav-fab__panel" aria-label="Page sections">
                <ul>
                    {ENTRIES.map((entry) => (
                        <li key={entry.href}>
                            <a href={entry.href} onClick={onNavigate}>
                                {entry.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        </details>
    )
}
