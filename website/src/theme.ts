/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * The colour theme: where the choice lives, and the only module that knows how
 * it is remembered.
 *
 * The choice lives on `<html data-theme>`, outside React's tree, so the inline
 * script in `index.html` can apply it before the first paint and hydration never
 * sees it. That script cannot import this module — it has to run before the
 * bundle is fetched — so the storage key and the two `theme-color` meta ids are
 * written in both places. Keep the two copies in step. Decided — DESIGN.md §10.
 */

export type Theme = 'light' | 'dark'

/** Also written verbatim in the `index.html` inline script. */
const STORAGE_KEY = 'inspirai.theme'

/** Both metas are in the document; the media query decides which one is read. */
const THEME_COLORS = [
    ['theme-color-light', 'light'],
    ['theme-color-dark', 'dark']
] as const

const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * The theme in force: the reader's own choice if there is one, the operating
 * system's otherwise. Reading it back is what keeps the control honest after a
 * reload, when only the document knows what the inline script decided.
 */
export function currentTheme(): Theme {
    const chosen = document.documentElement.dataset.theme

    if (chosen === 'dark' || chosen === 'light') {
        return chosen
    }

    return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

/** Apply a theme, tell the browser chrome about it, and remember it. */
export function setTheme(theme: Theme): void {
    document.documentElement.dataset.theme = theme

    for (const [id, candidate] of THEME_COLORS) {
        const meta = document.querySelector<HTMLMetaElement>(`meta#${id}`)

        if (meta !== null) {
            meta.media = candidate === theme ? 'all' : 'not all'
        }
    }

    try {
        window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
        // Storage can be unavailable in private modes. The theme still applies
        // to this page; it just will not be remembered for the next one.
    }
}
