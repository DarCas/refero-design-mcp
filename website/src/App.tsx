/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import {Configuration} from './sections/Configuration'
import {DesignNotes} from './sections/DesignNotes'
import {Faq} from './sections/Faq'
import {Footer} from './sections/Footer'
import {Hero} from './sections/Hero'
import {HowItWorks} from './sections/HowItWorks'
import {Nav} from './sections/Nav'
import {Performance} from './sections/Performance'
import {Skill} from './sections/Skill'
import {Tools} from './sections/Tools'
import {Why} from './sections/Why'

/**
 * The page, in the order of `docs/website/PLAN.md` §4: the hero, the two
 * argument sections, the two deliverables, the dense reference half, then the
 * FAQ and the colophon on the inverted band that closes it.
 */
export function App() {
    return (
        <>
            <main id="main">
                <Hero />
                <Why />
                <HowItWorks />
                <Tools />
                <Skill />
                <Performance />
                <Configuration />
                <DesignNotes />
            </main>
            <Faq />
            <Footer />
            <Nav />
        </>
    )
}
