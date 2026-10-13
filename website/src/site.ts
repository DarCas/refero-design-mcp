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

/** README §Performance — the warm cache every measured figure on the page was taken against. */
export const INDEXED_SAMPLE = '26'

/** README §"How styles are indexed" — the size of one RSC payload inside a style page. */
export const STYLE_PAGE_SIZE = '~300 KB'

/**
 * The coverage block `refero_index_status` returns, as the tool writes it
 * (`src/server/tools/indexStatus.ts` → the `- Published styles`, `- Indexed
 * locally`, `- Coverage` lines and the line that follows them). The header and
 * the sitemap timestamp are elided; the numbers are the ones the repository's
 * own cache holds, so the `Coverage` line is `2%` — what that code actually
 * prints for 26 of 1,342 — and not a rounded-down figure chosen to look worse.
 *
 * The lines are verbatim, which is why the last one runs past 100 columns: a
 * string literal cannot be wrapped without changing what the tool printed.
 */
export const INDEX_STATUS_COVERAGE = [
    `- Published styles: ${PUBLISHED_STYLES}`,
    `- Indexed locally: ${INDEXED_SAMPLE}`,
    '- Coverage: 2%',
    '',
    'Search and match results reflect local coverage only.',
    'Raise `expand` on those tools to index more styles.',
].join('\n')

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

/** README §Tools §Sections — the values `refero_get_design_md` accepts. */
export const SECTIONS = [
    'overview',
    'colors',
    'typography',
    'type_scale',
    'spacing',
    'surfaces',
    'imagery',
    'principles',
    'components',
    'similar',
    'custom',
]
    .map((section) => `\`${section}\``)
    .join(' · ')

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

/** README §The skill — the installer, and the invocations it documents. */
export const SKILL_INSTALL_COMMAND = 'refero-design-skill install'

const SKILL_EXAMPLES = [
    'refero-design-skill list                           # what is installed where',
    'refero-design-skill install --client claude,codex  # pick clients',
    'refero-design-skill install --project               # copy into the repository',
    'refero-design-skill install --dry-run              # print the plan, write nothing',
    'refero-design-skill uninstall --client claude      # remove what it installed',
].join('\n')

/**
 * The whole terminal panel of the section: the one command that does the work,
 * then the invocations the README documents beside it. One block, because the
 * documented lines are 77 columns wide — wider than any column this page can
 * give them, so the panel has to carry the measure.
 */
export const SKILL_PANEL = `${SKILL_INSTALL_COMMAND}\n\n${SKILL_EXAMPLES}`

/** README §The skill — where a global install writes the one shared copy. */
export const SKILLS_DIR = '~/.agents/skills/'

/** README §The skill — the flags, verbatim, in the README's own code spans. */
export const SKILL_FLAGS = [
    {
        flag: '`--client <ids>`',
        effect: [
            'Comma-separated ids from `skill/refero-design-research/clients.json`.',
            'An unknown id fails and lists the valid ones',
        ].join(' '),
    },
    {
        flag: '`--scope global|project`',
        effect: [
            'Defaults to `global`.',
            'Project scope copies into the repository, because a symlink into `$HOME` breaks',
            'on another machine and in CI',
        ].join(' '),
    },
    {
        flag: '`--global`, `--project`',
        effect: [
            'Shorthands for `--scope global` and `--scope project`,',
            'which are what most other installers spell this way',
        ].join(' '),
    },
    {
        flag: '`--all`',
        effect: 'Every client whose detect directory already exists. Bare `install` does this',
    },
    {
        flag: '`--path <dir>`',
        effect: 'Escape hatch for an unsupported client or an unusual location',
    },
    {
        flag: '`--dry-run`',
        effect: 'Print the resolved plan and touch nothing',
    },
    {
        flag: '`--force`',
        effect: 'Required to overwrite local modifications, and it prints the diff first',
    },
]

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

/**
 * README §Performance — the same four rows as the chart, in the chart's order.
 * `ratio` is the number the bar length is derived from; `value` is what the
 * axis says, so the text in the document is the measurement, not the bar.
 */
export const PERFORMANCE_CHART = [
    {label: 'expand scan, all cached', ratio: 490, value: '490×'},
    {label: 'refero_index_status', ratio: 186, value: '186×'},
    {label: 'first call in a process', ratio: 5.3, value: '5.3×'},
    {label: 'rank 1,342 summaries', ratio: 1.2, value: '1.2×'},
]

/** README §Performance — the conditions the numbers were taken under. */
export const PERFORMANCE_CONDITIONS = [
    'Median of 15 runs on an Intel i9-12900F / Linux / Node 22, against a warm local cache holding',
    '26 of 1,342 published styles. "Before" is the previous implementation, measured in the same',
    'session on the same machine.',
    'Your numbers will differ; the ratio is the point, not the milliseconds.',
].join(' ')

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

export const CONFIG_TRAP = `"refero-design-mcp": {
  "command": ["npx", "-y", "-p", "${PACKAGE_NAME}@1", "refero-design-mcp"]
}`

/** README §Environment variables — all ten, alphabetical, with the validated defaults. */
export const ENV_VARS = [
    {
        name: '`REFERO_CACHE_DIR`',
        value: '`~/.cache/refero-design-mcp`',
        purpose: 'On-disk cache location',
    },
    {
        name: '`REFERO_CACHE_TTL_MS`',
        value: '`604800000`',
        purpose: 'Cache freshness window (7 days)',
    },
    {name: '`REFERO_CONCURRENCY`', value: '`4`', purpose: 'Max simultaneous requests'},
    {name: '`REFERO_MAX_FETCHES`', value: '`25`', purpose: 'Max page fetches per tool call'},
    {name: '`REFERO_MAX_RESPONSE_CHARS`', value: '`40000`', purpose: 'Response budget'},
    {
        name: '`REFERO_SITE_URL`',
        value: '`https://styles.refero.design`',
        purpose: 'Origin base URL',
    },
    {
        name: '`REFERO_STYLES_SITEMAP`',
        value: '`{site}/sitemaps/styles.xml`',
        purpose: 'Style index',
    },
    {name: '`REFERO_TIMEOUT_MS`', value: '`30000`', purpose: 'Per-request timeout'},
    {name: '`REFERO_USER_AGENT`', value: 'see `src/config.ts`', purpose: 'Request identification'},
    {name: '`REFERO_VERBOSE`', value: '`false`', purpose: 'Diagnostics to stderr'},
]

/** README §Environment variables — the three worth touching first. */
export const ENV_WORTH_TOUCHING = [
    '`REFERO_MAX_FETCHES`',
    '`REFERO_CONCURRENCY`',
    '`REFERO_TIMEOUT_MS`',
]

/** README §Design notes — five decisions, each a claim and its reason. */
export const DESIGN_NOTES = [
    {
        title: 'Schemas derived from real payloads, not from documentation',
        body: [
            '`spacing.radius` is a per-element map (`{cards: "28px", buttons: "9999px"}`),',
            'not a string.',
            '`similar` is `[{business, why}]` on current styles but bare strings on older ones.',
            '`surfaces` is `{hex, name, level, purpose}`.',
            'A `typeScale` size arrives as `"17"` on one style and `17` on the next, and is',
            'normalised',
            'to a string at the boundary.',
            'Every schema is permissive about type and strict about presence,',
            'so a partial document degrades instead of throwing away a whole design system.',
        ].join(' '),
    },
    {
        title: 'Measured and curated data are both kept',
        body: [
            '`result.raw` holds tokens with usage frequency and context;',
            '`result.designSystem` holds the curated reading.',
            'Frequency is what separates a signature colour from an incidental one.',
        ].join(' '),
    },
    {
        title: 'Truncation respects structure',
        body: [
            'Cutting markdown with `slice(0, n)` slices code fences in half, which makes the model',
            'read broken CSS as if it were the design.',
            'This server trims on a structural boundary instead, and closes any fence it opens,',
            'so a',
            'shortened document is still valid. Every path that caps a',
            'response goes through that helper, including `refero_get_design_md`.',
        ].join(' '),
    },
    {
        title: 'A malformed `style_id` never costs a request',
        body: [
            'Ids are checked against the UUID shape before anything reaches the network or the',
            'cache directory, so a wrong id returns an error naming the tool that lists valid ones',
            'instead of',
            'a bare `404`.',
        ].join(' '),
    },
    {
        title: 'Conditional requests everywhere',
        body: [
            'Every request carries its validators, so a repeat call usually costs a `304`',
            'rather than the ~300 KB page behind it.',
        ].join(' '),
    },
]

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

/** README §intro — the origin the server reads, and the only one it may. */
export const STYLES_URL = 'https://styles.refero.design'

/** README §intro — the "Buy me a coffee" support link. */
export const SUPPORT_URL = 'https://www.paypal.com/donate/?hosted_button_id=YZQDE3TEYDBWA'
