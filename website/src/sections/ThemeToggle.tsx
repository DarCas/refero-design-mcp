/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import {useEffect, useRef} from 'react'
import {THEME_LABEL} from '../site'
import {currentTheme, setTheme} from '../theme'

/**
 * The theme control: the section index's counterpart, fixed in the top-right
 * corner rather than the bottom-right one.
 *
 * The icon shows the theme a press would give you, and which icon is visible is
 * decided in CSS by the same two conditions the palette uses — so the control is
 * correct before JavaScript runs, in both activation paths, and without a flash.
 *
 * `aria-pressed` is written from the effect and the click handler, never from
 * JSX: the inline script in `index.html` sets the theme before the first paint,
 * so a value React rendered here could disagree with the document at hydration
 * time. Decided — DESIGN.md §10.
 */
export function ThemeToggle() {
    const button = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        syncToggle(button.current)
    }, [])

    function onClick(): void {
        setTheme(currentTheme() === 'dark' ? 'light' : 'dark')
        syncToggle(button.current)
    }

    return (
        <button
            ref={button}
            type="button"
            className="theme-toggle"
            aria-label={THEME_LABEL}
            onClick={onClick}
        >
            <span className="theme-toggle__icon theme-toggle__icon--sun" aria-hidden="true">
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <defs>
                        <radialGradient id="theme-toggle-sun" cx="36%" cy="30%" r="76%">
                            <stop offset="0%" className="theme-toggle__sun-top" />
                            <stop offset="100%" className="theme-toggle__sun-bottom" />
                        </radialGradient>
                    </defs>
                    <circle cx="12" cy="12" r="4.6" fill="url(#theme-toggle-sun)" stroke="none" />
                    <line x1="12" y1="2" x2="12" y2="4" />
                    <line x1="12" y1="20" x2="12" y2="22" />
                    <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
                    <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
                    <line x1="2" y1="12" x2="4" y2="12" />
                    <line x1="20" y1="12" x2="22" y2="12" />
                    <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
                    <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
                </svg>
            </span>
            <span className="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <defs>
                        <linearGradient id="theme-toggle-moon" x1="28%" y1="8%" x2="82%" y2="96%">
                            <stop offset="0%" className="theme-toggle__moon-top" />
                            <stop offset="100%" className="theme-toggle__moon-bottom" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                        fill="url(#theme-toggle-moon)"
                    />
                </svg>
            </span>
        </button>
    )
}

/** Mirror the button's state off the document, which is the source of truth. */
function syncToggle(element: HTMLButtonElement | null): void {
    if (element === null) {
        return
    }

    element.setAttribute('aria-pressed', String(currentTheme() === 'dark'))
}
