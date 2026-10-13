/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import {renderInline} from '../inline'
import {
    SKILL_FLAGS,
    SKILL_INSTALL_COMMAND,
    SKILL_NAME,
    SKILL_PANEL,
    SKILL_README_PATH,
    SKILL_README_URL,
    SKILLS_DIR,
} from '../site'

/**
 * The Agent Skill (README §The skill): the second deliverable, in two columns
 * — what the skill is and what it writes on the left, the installer's flags on
 * the right, under one terminal panel carrying the commands.
 *
 * The claim the section leads with is its boundary: the skill carries no Refero
 * data at all, only instructions plus a tool reference generated from `src/`.
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
                    before it implements substantial UI. It is a separate deliverable from the MCP
                    itself and neither replaces the other: the MCP answers questions about styles,
                    the skill decides how to ask them.
                </p>
                <figure className="figure terminal">
                    <figcaption className="figure__label">
                        The installer, and the invocations it documents
                    </figcaption>
                    <pre className="figure__code">
                        <code>{SKILL_PANEL}</code>
                    </pre>
                </figure>
                <div className="skill__columns">
                    <div className="skill__column">
                        <p>
                            That is the whole command. It detects the agent clients you have,
                            writes one shared copy under <code>{SKILLS_DIR}</code>, and links each
                            client to it. When the MCP is not installed, the skill can set it up
                            for you — after asking, and only for this package.
                        </p>
                        <p>
                            Global scope links rather than copies, so the skill is one file on
                            disk with several names pointing at it; project scope copies, so it can
                            be committed. Links are created as <code>junction</code> on Windows,
                            and a skills directory that is itself a symlink is written{' '}
                            <em>through</em> rather than replaced.
                        </p>
                        <p>
                            <strong>
                                There is no <code>postinstall</code>.
                            </strong>{' '}
                            Nothing is written outside <code>node_modules</code> by installing the
                            package — only an explicit <code>{SKILL_INSTALL_COMMAND}</code> writes
                            anything, so upgrade the package and re-run it.
                        </p>
                        <p>
                            The skill is not affiliated with Refero Design, and it contains no
                            Refero data: only instructions, plus a tool reference generated
                            from <code>src/</code>. See{' '}
                            <a href={SKILL_README_URL}>
                                <code>{SKILL_README_PATH}</code>
                            </a>{' '}
                            for what it does and who it is for.
                        </p>
                    </div>
                    <div className="skill__column">
                        <table className="table table--flags">
                            <thead>
                                <tr>
                                    <th scope="col">Flag</th>
                                    <th scope="col">Effect</th>
                                </tr>
                            </thead>
                            <tbody>
                                {SKILL_FLAGS.map((entry) => (
                                    <tr key={entry.flag}>
                                        <th scope="row">{renderInline(entry.flag)}</th>
                                        <td>{renderInline(entry.effect)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="skill__note">
                            Declare the scope <strong>once</strong>.{' '}
                            <code>--global --project</code> and{' '}
                            <code>--scope project --global</code> both fail: picking one silently
                            would install to the other place while you believe you chose. A boolean
                            flag given a value (<code>--force=1</code>) fails for the same reason.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}