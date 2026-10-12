/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Every external value the page states, in one place.
 *
 * Nothing here is invented: each value traces to `README.md` or to a file in
 * the repository, and the trail is named next to it. Components import from
 * here so no URL, package name or count is scattered across the tree.
 */

/** The site's own name and pitch. Provided by the user; carried by `website/CNAME`. */
export const SITE_NAME = 'InspirAI'

export const SITE_TAGLINE = 'AI-Powered Design Research for Coding Agents'

/**
 * Provisional origin. The final canonical/`og:url` value belongs to Step 9
 * (publication); keeping it here — and in `index.html`, which cannot import
 * this module — is what makes that swap a one-line change.
 */
export const SITE_URL = 'https://inspirai.os.darcas.app'

/** README §intro — the package the page is about. */
export const PACKAGE_NAME = '@darcas/refero-design-mcp'

/** README §Installation. */
export const INSTALL_COMMAND = `npm install -g ${PACKAGE_NAME}`

/** README §Installation — "Requires Node ≥ 22.12." */
export const NODE_FLOOR = '22.12'

/** README §License. */
export const LICENSE = 'MIT'

/** README §Tools — the six tools, each declaring all four behavioural hints. */
export const TOOL_COUNT = 6

/** README §Testing — "125 tests across 9 files." */
export const TEST_COUNT = 125

/** README §Performance — "1,342 published styles". */
export const PUBLISHED_STYLES = '1,342'

/** Root `package.json` → `repository.url`. */
export const REPOSITORY_URL = 'https://github.com/DarCas/refero-design-mcp'

export const NPM_URL = `https://www.npmjs.com/package/${PACKAGE_NAME}`

/** README §intro — the origin the server reads, and the only one it may. */
export const STYLES_URL = 'https://styles.refero.design'

/** README §intro — the "Buy me a coffee" support link. */
export const SUPPORT_URL = 'https://www.paypal.com/donate/?hosted_button_id=YZQDE3TEYDBWA'
