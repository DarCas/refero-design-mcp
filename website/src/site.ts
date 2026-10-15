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

/**
 * The catalogue size as landing-page prose states it. The exact count moves
 * with the catalogue, so prose says "over 1,300" and never goes stale; the
 * exact figure survives only where it is part of a dated measurement (the
 * Performance table, its lede, and `llms-full.txt`).
 */
export const PUBLISHED_STYLES_APPROX = 'over 1,300'

/** README §Performance — the warm cache every measured figure on the page was taken against. */
export const INDEXED_SAMPLE = '26'

/** README §"How styles are indexed" — the size of one RSC payload inside a style page. */
export const STYLE_PAGE_SIZE = '~300 KB'

/**
 * README §Tools — the six tools with the purpose the README gives each one.
 * The purposes are the README's own sentences, backticks included, so nothing
 * has to be re-typed by hand into the table.
 */
export const TOOLS = [
    {
        name: 'refero_index_status',
        purpose: 'Published styles vs. locally indexed styles',
    },
    {
        name: 'refero_search_styles',
        purpose: 'Free-text search over names, north stars, colours, fonts, URLs',
    },
    {
        name: 'refero_match_style',
        purpose: 'Ranks styles against a prose design brief',
    },
    {
        name: 'refero_get_design_md',
        purpose: 'Renders a style as `design.md`, by section',
    },
    {
        name: 'refero_get_style',
        purpose: 'Parsed design system plus measured tokens, as JSON',
    },
    {
        name: 'refero_list_style_ids',
        purpose: 'Style UUIDs from the sitemap, without reading any page',
    },
]

/** README §Tools — the resource, for clients that prefer resource reads. */
export const RESOURCE_URI = 'refero://style/{id}/design.md'

/** README §Tools — the four behavioural hints, as the tools declare them. */
export const TOOL_HINTS = [
    'readOnlyHint: true',
    'destructiveHint: false',
    'idempotentHint: true',
    'openWorldHint: true',
]
    .map((hint) => `\`${hint}\``)
    .join(', ')

/** README §The skill — the installer. Flag-level reference lives in the README. */
export const SKILL_INSTALL_COMMAND = 'refero-design-skill install'

/** README §The skill — where a global install writes the one shared copy. */
export const SKILLS_DIR = '~/.agents/skills/'

/** README §Performance — the measured table, and the machine it was measured on. */
export const PERFORMANCE = [
    {
        operation: '`refero_search_styles` — rank 1,342 summaries',
        before: '15.5 ms',
        after: '12.6 ms',
        speedUp: '1.2×',
    },
    {operation: '`refero_index_status`', before: '27.9 ms', after: '0.15 ms', speedUp: '186×'},
    {
        operation: '`expand` scan when everything is cached',
        before: '49.0 ms',
        after: '0.10 ms',
        speedUp: '490×',
    },
    {operation: 'First call in a process', before: '372 ms', after: '70 ms', speedUp: '5.3×'},
]

/** README §Configuration — the three ways a client can start the server. */
export const CONFIG_NPX = `{
  "mcp": {
    "servers": {
      "refero-design-mcp": {
        "command": ["npx", "-y", "${PACKAGE_NAME}@1"]
      }
    }
  }
}`

export const CONFIG_GLOBAL = `"refero-design-mcp": {
  "command": ["refero-design-mcp"]
}`

/**
 * The hosted remote. Same shape as the README snippet, except the server key
 * is `refero-design-mcp` everywhere on this page — the README's `"refero"`
 * is the only place that shortens it, per explicit user decision.
 */
export const REMOTE_URL = 'https://mcp.inspirai.os.darcas.app/mcp'

export const CONFIG_REMOTE = `"refero-design-mcp": {
  "type": "remote",
  "url": "${REMOTE_URL}"
}`

/** README §intro — the affiliation statement, reproduced word for word. */
export const DISCLAIMER =
    'The underlying data belongs to Refero Design. This is an unofficial client; '
    + 'no affiliation or endorsement is implied.'

/**
 * The FAQ (README §intro, §Installation, §Configuration, §Environment variables
 * and `src/config.ts`). The answers are in `site.ts` because Step 6 builds the
 * `FAQPage` JSON-LD from these same strings: an assistant must be able to quote
 * an answer that is character-identical to the one on the page.
 */
export const FAQ = [
    {
        question: 'Is this affiliated with Refero Design?',
        answer: [
            'No. The underlying data belongs to Refero Design.',
            'This is an unofficial client; no affiliation or endorsement is implied.',
            'The Agent Skill carries the same statement, and no Refero data: only instructions,',
            'plus a tool reference generated from `src/`.',
        ].join(' '),
    },
    {
        question: 'Does it write anything to my machine?',
        answer: [
            'The server writes one thing: its style cache, under `REFERO_CACHE_DIR`.',
            'Installing the package writes nothing outside `node_modules` —',
            'there is no `postinstall`. Running `refero-design-skill install` is the only other',
            'command that writes anything, and only after you run it.',
        ].join(' '),
    },
    {
        question: 'Where does the cache live, and can I move it?',
        answer: [
            'By default `~/.cache/refero-design-mcp`,',
            'or `$XDG_CACHE_HOME/refero-design-mcp` when',
            'that is set. `REFERO_CACHE_DIR` moves it;',
            '`REFERO_CACHE_TTL_MS` sets how long an entry stays fresh (`604800000`, seven days).',
            'Deleting the directory is safe — it costs a',
            're-fetch, never a wrong answer.',
        ].join(' '),
    },
    {
        question: 'Do I need an API key?',
        answer: [
            'No. There is no authentication anywhere in the package. It reads only the published',
            'sitemap and the public style pages — the paths `robots.txt` permits —',
            'so there is nothing to authenticate against.',
        ].join(' '),
    },
    {
        question: 'Can it be used offline?',
        answer: [
            'For what it has already indexed, yes: the cache is on disk',
            'and the tools answer from it',
            'without reaching the network.',
            'A style that has not been indexed needs a fetch, and',
            'comes back as a typed error rather than a plausible-looking answer —',
            '`refero_index_status`',
            'says so plainly: "The sitemap could not be read; the server may be offline."',
        ].join(' '),
    },
    {
        question: 'Why does the server seem to hang when I start it by hand?',
        answer: [
            'It is not hanging. Transport is stdio, so `npm start` waits for a client on stdin,',
            'which is correct behaviour. Diagnostics go to stderr only — stdout carries JSON-RPC',
            'frames and nothing else — so a quiet terminal is the healthy state.',
        ].join(' '),
    },
]

/** Root `package.json` → `repository.url`. */
export const REPOSITORY_URL = 'https://github.com/DarCas/refero-design-mcp'

/** README §The skill — where the skill's own documentation lives. */
export const SKILL_NAME = 'refero-design-research'

export const SKILL_README_PATH = 'skill/refero-design-research/README.md'

export const SKILL_README_URL = `${REPOSITORY_URL}/blob/main/${SKILL_README_PATH}`

export const NPM_URL = `https://www.npmjs.com/package/${PACKAGE_NAME}`

/** Footer — who built the page, and where to find him. */
export const PERSON_NAME = 'Dario Casertano'

export const PERSON_URL = 'https://casertano.name'

/** Footer — the license text the colophon points at. */
export const LICENSE_URL = `${REPOSITORY_URL}/blob/main/LICENSE`

/** README §intro — the origin the server reads, and the only one it may. */
export const STYLES_URL = 'https://styles.refero.design'

/** README §intro — the "Buy me a coffee" support link. */
export const SUPPORT_URL = 'https://www.paypal.com/donate/?hosted_button_id=YZQDE3TEYDBWA'
