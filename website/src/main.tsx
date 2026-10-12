/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import {StrictMode} from 'react'
import {createRoot, hydrateRoot} from 'react-dom/client'
import {App} from './App'
import './styles/tokens.css'
import './styles/base.css'
import './styles/hero.css'

const container = document.getElementById('root')

if (container === null) {
    throw new Error('website: mounting point #root not found in index.html')
}

const page = (
    <StrictMode>
        <App />
    </StrictMode>
)

// `scripts/prerender.mjs` already injected the markup at build time, so the
// document is complete when JavaScript arrives: hydrate it, never render a
// second tree on top of the first.
if (container.hasChildNodes()) {
    hydrateRoot(container, page)
} else {
    createRoot(container).render(page)
}
