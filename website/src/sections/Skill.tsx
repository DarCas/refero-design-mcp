/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import {
    REPOSITORY_URL,
    SKILL_INSTALL_COMMAND,
    SKILL_NAME,
    SKILL_README_PATH,
    SKILL_README_URL,
    SKILLS_DIR,
} from '../site'

/**
 * The Agent Skill (README §The skill): what it decides that the MCP cannot,
 * the one install command, and what it writes. Flag-level reference lives in
 * the README — the landing page sells the install, not the manual.
 */
export function Skill() {
    return (
        <section className="section section--ruled" id="skill" aria-labelledby="skill-title">
            <div className="container">
                <p className="eyebrow">The skill</p>
                <h2 id="skill-title">A skill that decides which questions to ask.</h2>
                <p className="section-lede">
                    The package also ships an Agent Skill, <code>{SKILL_NAME}</code>, that teaches
                    a coding agent to do evidence-based design research with the Refero Design MCP
                    before it implements substantial UI. The MCP answers questions about styles,
                    the skill decides how to ask them.
                </p>
                <figure className="figure terminal">
                    <figcaption className="figure__label">Install the skill</figcaption>
                    <pre className="figure__code">
                        <code>{SKILL_INSTALL_COMMAND}</code>
                    </pre>
                </figure>
                <div className="prose">
                    <p>
                        That is the whole command. It detects the agent clients you have, writes
                        one shared copy under <code>{SKILLS_DIR}</code>, and links each client to
                        it. There is no <code>postinstall</code> — nothing is written outside{' '}
                        <code>node_modules</code> until you run it explicitly.
                    </p>
                    <p>
                        The skill contains no Refero data: only instructions, plus a tool reference
                        generated from <code>src/</code>. All flags and scopes in{' '}
                        <a href={SKILL_README_URL} target="_blank" rel="nofollow noopener">
                            <code>{SKILL_README_PATH}</code>
                        </a>{' '}
                        — or <a href={`${REPOSITORY_URL}#the-skill`} target="_blank" rel="nofollow noopener">the README</a>.
                    </p>
                </div>
            </div>
        </section>
    )
}