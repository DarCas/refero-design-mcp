/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

import {renderInline} from '../inline'
import {RESOURCE_URI, SECTIONS, STYLES_URL, TOOL_HINTS, TOOLS} from '../site'

/**
 * The six MCP tools (README §Tools): what each is for, the four behavioural
 * hints they all declare, the resource, and the `sections` argument.
 *
 * One table serves both widths — stacking at narrow widths is the stylesheet's
 * job, so the document holds one set of rows and no second copy of the list for
 * phones.
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
                        read <a href={STYLES_URL}>styles.refero.design</a>. Clients that gate on
                        these get an accurate answer without having to infer it.
                    </p>
                    <p>
                        A resource, <code>{RESOURCE_URI}</code>, is exposed for clients that prefer
                        resource reads over tool calls.
                    </p>
                    <p>
                        <code>refero_get_design_md</code> takes <code>sections</code>, and honours
                        it: <span className="values">{renderInline(SECTIONS)}</span>. Sections with
                        no data are dropped rather than rendered as empty headings.
                    </p>
                </div>
            </div>
        </section>
    )
}