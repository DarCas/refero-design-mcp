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
import {ThemeToggle} from './sections/ThemeToggle'
import {Tools} from './sections/Tools'
import {Why} from './sections/Why'

/**
 * The page, in the order of `docs/website/PLAN.md` §4: the hero, the two
 * argument sections, the two deliverables, the dense reference half, then the
 * FAQ and the colophon on the inverted band that closes it.
 *
 * The ambient lattice (`docs/website/DESIGN.md` §8) is the first child, so it
 * sits behind every section without a rule on each one.
 */
export function App() {
    return (
        <>
            <div className="ambient" aria-hidden="true">
                <div className="ambient__margin">
                    <div className="ambient__grid" />
                </div>
            </div>
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
            <ThemeToggle />
        </>
    )
}
