/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import {renderInline} from '../inline'
import {REPOSITORY_URL, RESOURCE_URI, STYLES_URL, TOOL_HINTS, TOOLS} from '../site'

/**
 * The six MCP tools (README §Tools): what each is for, the four behavioural
 * hints they all declare, and the `refero://` resource.
 *
 * The full `sections` list lives in the README — the landing page only needs
 * the shape of the contract, not its enumeration.
 */
export function Tools() {
    return (
        <section className="section section--ruled" id="tools" aria-labelledby="tools-title">
            <div className="container">
                <p className="eyebrow">Tools</p>
                <h2 id="tools-title">Six tools, one resource, nothing that writes.</h2>
                <p className="section-lede">
                    The Refero Design MCP exposes six tools over the published styles: two that
                    report what is indexed, two that search it, and two that hand a style back in
                    the shape the caller asked for.
                </p>
                <table className="table table--tools">
                    <thead>
                        <tr>
                            <th scope="col">Tool</th>
                            <th scope="col">Purpose</th>
                        </tr>
                    </thead>
                    <tbody>
                        {TOOLS.map((tool) => (
                            <tr key={tool.name}>
                                <th scope="row">{renderInline(tool.name)}</th>
                                <td>{renderInline(tool.purpose)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="prose">
                    <p>
                        Every tool declares all four MCP behavioural hints —{' '}
                        <span className="values">{renderInline(TOOL_HINTS)}</span>. None of them
                        mutates the origin, the cache, or anything the caller owns; all of them can
                        read <a href={STYLES_URL} target="_blank" rel="nofollow noopener">styles.refero.design</a>.
                    </p>
                    <p>
                        A resource, <code>{RESOURCE_URI}</code>, is exposed for clients that prefer
                        resource reads over tool calls.{' '}
                        <code>refero_get_design_md</code> renders eleven sections and drops the
                        ones with no data. Full reference in{' '}
                        <a href={`${REPOSITORY_URL}#tools`} target="_blank" rel="nofollow noopener">the README</a>.
                    </p>
                </div>
            </div>
        </section>
    )
}