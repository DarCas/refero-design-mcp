/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import {Hero} from './sections/Hero'

/**
 * The page, in the order of `docs/website/PLAN.md` §4. Sections 2–9 are added
 * by later steps; Step 1 lands the hero.
 */
export function App() {
    return (
        <main id="main">
            <Hero />
        </main>
    )
}
