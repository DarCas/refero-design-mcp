#!/usr/bin/env node
/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Static checks over the skill tree. Plain Node, no dependencies, offline.
 *
 * These are the failure modes that are cheap to prevent and expensive to ship:
 * a frontmatter field that stops a client loading the skill, a relative link
 * that sends an agent to a file that is not there, a tool name this MCP does
 * not have, a credential committed by accident. Everything here can be decided
 * from the repository, so none of it is a test that cannot fail.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REPO_ROOT = resolve(SKILL_ROOT, '..', '..')

const failures = []
const checks = []

/** Returned by a check that cannot run here; reported, never failed. */
const SKIP = Symbol('skip')

function check(name, assertion) {
    try {
        const problem = assertion()
        if (problem === SKIP) process.stdout.write(`skip  ${name}\n`)
        else if (problem) failures.push(`${name}: ${problem}`)
        else checks.push(name)
    } catch (error) {
        failures.push(`${name}: threw ${error.message}`)
    }
}

function read(file) {
    return readFileSync(join(SKILL_ROOT, file), 'utf8')
}

/** Every file in the skill, as repo-root-relative posix paths. */
function walk(dir) {
    const out = []

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) out.push(...walk(full))
        else out.push(full)
    }

    return out
}

const ALL_FILES = walk(SKILL_ROOT)
const MD_FILES = ALL_FILES.filter(f => extname(f) === '.md')

function rel(file) {
    return relative(SKILL_ROOT, file).split(sep).join('/')
}

// ── frontmatter ─────────────────────────────────────────────────────────────

function parseFrontmatter(text) {
    const match = /^---\n([\s\S]*?)\n---\n/.exec(text)
    if (!match) return null

    const fields = {}

    for (const line of match[1].split('\n')) {
        const field = /^([A-Za-z-]+):\s*(.*)$/.exec(line)
        if (field) fields[field[1]] = field[2]
    }

    return fields
}

const SKILL_MD = read('SKILL.md')
const FRONTMATTER = parseFrontmatter(SKILL_MD)

check('SKILL.md has frontmatter', () => (FRONTMATTER ? null : 'no `---` block at the top of the file'))

check('SKILL.md name equals the directory', () => {
    const dir = SKILL_ROOT.split(sep).pop()
    if (FRONTMATTER?.name !== dir) return `frontmatter name is "${FRONTMATTER?.name}", directory is "${dir}"`
    return null
})

check('SKILL.md name is lowercase-hyphenated', () => {
    const name = FRONTMATTER?.name ?? ''
    return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) ? null : `"${name}" does not match ^[a-z0-9]+(-[a-z0-9]+)*$`
})

check('SKILL.md name is within 64 characters', () => {
    const name = FRONTMATTER?.name ?? ''
    return name.length <= 64 ? null : `${name.length} characters`
})

check('SKILL.md description is within 1024 characters', () => {
    const length = (FRONTMATTER?.description ?? '').length
    return length > 0 && length <= 1024 ? null : `${length} characters`
})

check('SKILL.md compatibility is within 500 characters', () => {
    const value = FRONTMATTER?.compatibility
    if (value === undefined) return null
    return value.length <= 500 ? null : `${value.length} characters`
})

check('SKILL.md declares a licence matching the package', () => {
    const pkg = manifest()
    if (!pkg) return SKIP

    return FRONTMATTER?.license === pkg.license
        ? null
        : `frontmatter "${FRONTMATTER?.license}" vs package "${pkg.license}"`
})

check('SKILL.md description carries the activation keywords', () => {
    const description = (FRONTMATTER?.description ?? '').toLowerCase()
    const missing = ['landing page', 'dashboard', 'design system', 'typography', 'redesign']
        .filter(keyword => !description.includes(keyword))
    return missing.length === 0 ? null : `missing: ${missing.join(', ')}`
})

check('SKILL.md description names refero-design as the craft skill', () => {
    return (FRONTMATTER?.description ?? '').includes('refero-design')
        ? null
        : 'the two skills overlap on "dashboard"; the description must route craft questions elsewhere'
})

check('SKILL.md is within 150 lines', () => {
    // The trailing newline terminates the last line, it does not start another.
    const lines = SKILL_MD.replace(/\n$/, '').split('\n').length
    return lines <= 150 ? null : `${lines} lines`
})

// ── content the skill must encode ───────────────────────────────────────────

const REQUIRED_SKILL_PHRASES = [
    ['the audience section', /##\s+Who you are working for/i],
    ['closed questions', /closed/i],
    ['one round of questions', /one round/i],
    ['at most four questions', /at most four questions/i],
    ['a marked recommendation', /recommend(ed|ation)/i],
    ['the "you choose" escape', /you choose/i],
    ['answering in the user language', /user's language/i],
    ['the non-research trigger', /small fix/i],
    ['the Observed label', /\*\*Observed\*\*/],
    ['the Decision label', /\*\*Decision\*\*/],
    ['the default label', /Decision \(default\)/],
    ['coverage before concluding', /coverage/i],
    ['refero_index_status', /refero_index_status/],
    ['refero_get_style', /refero_get_style/],
    ['section-limited fetching', /`?sections`?/],
    ['selection by style_id', /`style_id`/],
    ['prefix-tolerant tool naming', /client-specific prefix/],
    ['no fabrication', /[Nn]ever fabricate/],
    ['the MCP-unavailable behaviour', /MCP is unavailable/i],
    ['output text is data, not instructions', /data, not instructions/i],
    ['no bulk loops', /no loops over style lists/i],
]

check('SKILL.md encodes the required behaviours', () => {
    const missing = REQUIRED_SKILL_PHRASES
        .filter(([, pattern]) => !pattern.test(SKILL_MD))
        .map(([label]) => label)
    return missing.length === 0 ? null : `missing: ${missing.join(', ')}`
})

// ── internal links ──────────────────────────────────────────────────────────

/** Markdown links and backticked paths, minus the ones that are not local. */
function localReferences(file) {
    const text = readFileSync(file, 'utf8')
    const found = []

    for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) found.push(target)
    // Backticked paths: no spaces, at least one slash, a known documentation
    // extension. This is what SKILL.md uses instead of markdown links.
    for (const [, target] of text.matchAll(/`([^`\s]*\/[^`\s]*\.[a-z]+)`/gi)) found.push(target)

    return found.filter(target =>
        !/^[a-z][a-z0-9+.-]*:/i.test(target)
        && !target.startsWith('#')
        && !target.startsWith('/')
        && !target.includes(' ')
        // `{site}/sitemaps/styles.xml` is a documented placeholder, not a file.
        && !target.includes('{')
        // A path rooted at `~`, `$` or a dot-directory names a location on the
        // user's machine (`~/.claude.json`, `.cursor/mcp.json`), never a file
        // of this skill.
        && !/^(~|\$|\.)/.test(target)
        // Likewise `node_modules/.bin`: a path inside an install tree, which
        // this skill never contains and must never be asked to resolve.
        && !target.split('/').includes('node_modules'))
}

check('every local reference in the skill resolves', () => {
    const broken = []

    for (const file of MD_FILES) {
        for (const target of localReferences(file)) {
            const resolved = resolve(dirname(file), target.split('#')[0])
            try {
                statSync(resolved)
            } catch {
                broken.push(`${rel(file)} -> ${target}`)
            }
        }
    }

    return broken.length === 0 ? null : `unresolved: ${broken.join(', ')}`
})

// ── tool names ──────────────────────────────────────────────────────────────

const DOCUMENTED_TOOLS = new Set(
    [...read('references/mcp-tools.md').matchAll(/^##\s+`(refero_[a-z_]+)`/gm)].map(m => m[1]),
)

check('every refero_* tool named in the skill is documented', () => {
    const named = new Set()

    for (const file of ALL_FILES) {
        if (extname(file) === '.json') continue
        const text = readFileSync(file, 'utf8')
        // A group-less regex, so the whole match is the name.
        for (const match of text.matchAll(/refero_[a-z_]+/g)) named.add(match[0])
    }

    const unknown = [...named].filter(name => !DOCUMENTED_TOOLS.has(name)).sort()
    return unknown.length === 0 ? null : `not in references/mcp-tools.md: ${unknown.join(', ')}`
})

check('mcp-tools.md documents every tool the server registers', () => {
    const toolsDir = join(REPO_ROOT, 'src', 'server', 'tools')
    let registered

    try {
        registered = new Set(
            readdirSync(toolsDir, { withFileTypes: true })
                .filter(entry => entry.isFile() && entry.name.endsWith('.ts'))
                .map(entry => readFileSync(join(toolsDir, entry.name), 'utf8'))
                .flatMap(source => [...source.matchAll(/'(refero_[a-z_]+)'/g)].map(match => match[1])),
        )
    } catch {
        return SKIP
    }

    const missing = [...registered].filter(name => !DOCUMENTED_TOOLS.has(name)).sort()
    return missing.length === 0 ? null : `server registers but the doc omits: ${missing.join(', ')}`
})

// Every place mcp-tools.md states a version has to move together. Checking only
// the footer left the header and the worked example free to drift, so a bump
// could publish a document that names two different releases.
const MCP_TOOLS_VERSION_SLOTS = [
    ['header', /Generated from `src\/` at v(\S+?),/],
    ['example', /\(server version (\S+?)\)/],
    ['footer', /Generated from refero-design-mcp @ (\S+?),/],
]

check('mcp-tools.md records the package version in every slot', () => {
    const pkg = manifest()
    if (!pkg) return SKIP

    const text = read('references/mcp-tools.md')
    const wrong = []

    for (const [slot, pattern] of MCP_TOOLS_VERSION_SLOTS) {
        const found = pattern.exec(text)
        if (!found) wrong.push(`${slot}: not found`)
        else if (found[1] !== pkg.version) wrong.push(`${slot}: ${found[1]} vs ${pkg.version}`)
    }

    return wrong.length === 0 ? null : wrong.join('; ')
})

check('mcp-tools.md names no other version', () => {
    const pkg = manifest()
    if (!pkg) return SKIP

    // Anything that looks like a release of this package, minus the ones the
    // slots above account for. Catches a stale example nobody thought to edit.
    const text = read('references/mcp-tools.md')
    const found = [...new Set([...text.matchAll(/\bv?\d+\.\d+\.\d+\b/g)].map(m => m[0]))]
    const allowed = new Set(MCP_TOOLS_VERSION_SLOTS.map(([, pattern]) => pkg.version))
    const stray = found.filter(value => !allowed.has(value.replace(/^v/, '')))
    return stray.length === 0 ? null : `also mentions: ${stray.join(', ')}`
})

check('the synthetic example is labelled as fictional', () => {
    const example = read('examples/design-direction.example.md')
    if (!/fictional/i.test(example.split('\n').slice(0, 6).join('\n'))) return 'no fictional banner in the first lines'
    return example.includes('Decision (default)') ? null : 'no Decision (default) label in use'
})

// ── clients.json ────────────────────────────────────────────────────────────

const CLIENTS = JSON.parse(read('clients.json'))

check('clients.json declares a skill name', () => (CLIENTS.skillName ? null : 'no skillName'))

check('clients.json holds no skill version of its own', () => {
    // The installer derives it from the package version, because the skill and
    // the server ship in one tarball and cannot be released apart. A literal
    // here is the bug this check exists to prevent: two numbers that look
    // independent, drift apart, and ship disagreeing inside the tarball.
    return CLIENTS.skillVersion === undefined ? null : `declares skillVersion "${CLIENTS.skillVersion}"`
})

check('clients.json skillName matches the directory', () => {
    const dir = SKILL_ROOT.split(sep).pop()
    return CLIENTS.skillName === dir ? null : `"${CLIENTS.skillName}" vs directory "${dir}"`
})

check('clients.json declares both shared roots', () => {
    const missing = ['global', 'project'].filter(scope => !CLIENTS.sharedRoots?.[scope])
    return missing.length === 0 ? null : `missing: ${missing.join(', ')}`
})

check('clients.json client ids are unique', () => {
    const ids = CLIENTS.clients.map(c => c.id)
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
    return dupes.length === 0 ? null : `duplicated: ${[...new Set(dupes)].join(', ')}`
})

check('every client declares a status and both scopes', () => {
    const broken = []

    for (const client of CLIENTS.clients) {
        if (!['verified', 'partial', 'unverified'].includes(client.status)) {
            broken.push(`${client.id}: status "${client.status}" is not one of verified/partial/unverified`)
        }
        for (const scope of ['global', 'project']) {
            const target = client[scope]
            if (target === null) continue
            if (!target) broken.push(`${client.id}: no ${scope} target`)
            else if (target.sharedRoot !== true && !target.path) broken.push(`${client.id}: ${scope} target has neither path nor sharedRoot`)
        }
    }

    return broken.length === 0 ? null : broken.join('; ')
})

check('every unclaimed target carries a reason', () => {
    const missing = []

    for (const client of CLIENTS.clients) {
        for (const scope of ['global', 'project']) {
            const target = client[scope]
            if (target !== null) continue
            if (!target || typeof target.reason !== 'string' || target.reason.trim() === '') {
                missing.push(`${client.id}.${scope}`)
            }
        }
    }

    return missing.length === 0 ? null : `no reason on: ${missing.join(', ')}`
})

check('every verified client cites where its claim was verified', () => {
    const missing = CLIENTS.clients
        .filter(client => client.status === 'verified' && !/https:\/\//.test(client.source ?? ''))
        .map(client => client.id)
    return missing.length === 0 ? null : `no source URL on: ${missing.join(', ')}`
})

check('client target paths are plausible', () => {
    const suspicious = []

    for (const client of CLIENTS.clients) {
        for (const scope of ['global', 'project']) {
            const path = client[scope]?.path
            if (path === undefined) continue
            if (path.startsWith('~') && !path.startsWith('~/')) suspicious.push(`${client.id}.${scope}: "${path}"`)
            else if (path.includes('..')) suspicious.push(`${client.id}.${scope}: "${path}" escapes its scope`)
            else if (path.startsWith('/')) suspicious.push(`${client.id}.${scope}: "${path}" is absolute, which pins every user to one machine`)
        }
    }

    return suspicious.length === 0 ? null : suspicious.join('; ')
})

check('every detect entry exists on this machine for the clients claimed verified', () => {
    // A "verified" client whose detect directory is absent here is not an
    // error — it simply is not installed. What must not happen is an empty
    // detect list, which would make `--all` silently install nothing.
    const empty = CLIENTS.clients.filter(client => !Array.isArray(client.detect) || client.detect.length === 0)
    return empty.length === 0 ? null : `no detect entries on: ${empty.map(c => c.id).join(', ')}`
})

// ── the absent-MCP install path ─────────────────────────────────────────────

const REQUIRED_ABSENT_MCP = [
    ['the section itself', /##\s+Before you start: is the MCP available\?/],
    ['consent before installing', /install it now/],
    ['consent named in the reference list', /consent/i],
    ['the mandatory global/local scope question', /scope: global/i],
    ['the local scope and its committable file', /may be committed/],
    ['the Node check', /check Node/i],
    ['showing the exact change first', /show the exact change/i],
    ['telling the user to reload', /reload the client/i],
    ['the resume prompt', /resume prompt/i],
    ['never asking again after a refusal', /Never ask again after a refusal/],
    ['never claiming research happened', /never claim research happened/],
    ['installing nothing else', /Never install anything other than/],
]

check('SKILL.md encodes the absent-MCP flow', () => {
    const missing = REQUIRED_ABSENT_MCP
        .filter(([, pattern]) => !pattern.test(SKILL_MD))
        .map(([label]) => label)
    return missing.length === 0 ? null : `missing: ${missing.join(', ')}`
})

const INSTALL_MCP = 'references/install-mcp.md'
const HAS_INSTALL_MCP = ALL_FILES.includes(join(SKILL_ROOT, INSTALL_MCP))

/**
 * The repo manifest, or null when the skill is read outside the repository.
 *
 * Presence is not enough. An installed skill sits next to projects that have a
 * `package.json` of their own — an `.opencode/` directory is exactly such a
 * place, and it is where this skill lands when installed with `--scope project`.
 * So the manifest has to actually look like this package before any
 * repo-dependent check is allowed to assert anything.
 */
function manifest() {
    try {
        const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'))

        return typeof pkg?.name === 'string' && typeof pkg?.version === 'string' && pkg?.bin
            ? pkg
            : null
    } catch {
        return null
    }
}

check('install-mcp.md exists and is linked from SKILL.md', () => {
    if (!HAS_INSTALL_MCP) return `no ${INSTALL_MCP}`
    return SKILL_MD.includes(`\`${INSTALL_MCP}\``) ? null : 'SKILL.md does not reference it'
})

check('install-mcp.md contains no forbidden command', () => {
    if (!HAS_INSTALL_MCP) return `no ${INSTALL_MCP}`
    const text = read(INSTALL_MCP).toLowerCase()
    const forbidden = ['sudo', 'curl', 'wget', '| sh', 'bash -c', 'rm -rf', 'npm i -g', 'npm install -g']
    const found = forbidden.filter(token => text.includes(token))
    return found.length === 0 ? null : `contains: ${found.join(', ')}`
})

check('install-mcp.md names only this package, pinned to the current major', () => {
    if (!HAS_INSTALL_MCP) return `no ${INSTALL_MCP}`
    const pkg = manifest()
    // The skill ships inside a published tarball, where the repo root is absent.
    // Report and move on rather than fail: the skill must stay extractable.
    if (!pkg) return SKIP

    const text = read(INSTALL_MCP)
    const named = [...new Set([...text.matchAll(/@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*/gi)].map(m => m[0]))]
    const foreign = named.filter(name => name !== pkg.name)
    if (foreign.length > 0) return `names another package: ${foreign.join(', ')}`

    const pin = new RegExp(`${pkg.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@(\\d+)`).exec(text)
    if (!pin) return `no ${pkg.name}@<major> pin`
    return pin[1] === pkg.version.split('.')[0] ? null : `pinned @${pin[1]}, package is ${pkg.version}`
})

check('the bin install-mcp.md names is the one npx resolves', () => {
    if (!HAS_INSTALL_MCP) return `no ${INSTALL_MCP}`
    const pkg = manifest()
    if (!pkg) return SKIP

    const bin = typeof pkg.bin === 'string' ? { [pkg.name]: pkg.bin } : (pkg.bin ?? {})
    const names = Object.keys(bin)
    if (names.length === 0) return 'package.json declares no bin'

    // npm exec, documented: a single bin is used as-is; with several, the one
    // matching the unscoped package name is used; otherwise it exits with an
    // error. This package ships two bins, so the second rule is what applies —
    // and a rename that breaks it would surface here rather than in production.
    const unscoped = pkg.name.replace(/^@[^/]+\//, '')
    const matching = names.filter(name => name === unscoped)
    if (names.length > 1 && matching.length !== 1) {
        return `${names.length} bins (${names.join(', ')}), none uniquely matching ` +
            `the unscoped name "${unscoped}" — npx would error`
    }

    // Unscoped bin names are also the repo's own convention, asserted in
    // test/version.test.ts; fail here with the reason.
    const scoped = names.filter(name => name.startsWith('@'))
    if (scoped.length > 0) return `scoped bin name, which npx will not match: ${scoped.join(', ')}`

    const text = read(INSTALL_MCP)
    return text.includes(`\`${unscoped}\``) ? null : `install-mcp.md never names the bin "${unscoped}"`
})

/** Client rows in install-mcp.md, as `id -> status`, from its `###` headings. */
function installRows() {
    const rows = []
    for (const part of read(INSTALL_MCP).split(/^###\s+/m).slice(1)) {
        const heading = part.split('\n')[0]
        const id = /^`([a-z]+)`/.exec(heading)?.[1]
        const status = /\*\*(verified|partial|unverified)\*\*/.exec(heading)?.[1]
        if (id && status) rows.push({ id, status, body: part })
    }
    return rows
}

check('install-mcp.md covers every client in clients.json, each with a status', () => {
    if (!HAS_INSTALL_MCP) return `no ${INSTALL_MCP}`
    const rows = installRows()
    const ids = rows.map(row => row.id)
    const missing = CLIENTS.clients.filter(client => !ids.includes(client.id)).map(client => client.id)
    const unknown = ids.filter(id => !CLIENTS.clients.some(client => client.id === id))
    if (missing.length > 0) return `no row for: ${missing.join(', ')}`
    return unknown.length === 0 ? null : `row for an unknown client: ${unknown.join(', ')}`
})

check('no unverified install-mcp.md row carries a write instruction', () => {
    if (!HAS_INSTALL_MCP) return `no ${INSTALL_MCP}`
    const problems = []
    for (const row of installRows()) {
        if (row.status !== 'unverified') continue
        // An unverified row may describe the location; it must not tell the
        // agent to write the entry, because nobody confirmed the shape.
        for (const token of ['npx', 'mcp add', 'mcp_servers', 'mcpServers']) {
            if (row.body.includes(token)) problems.push(`${row.id}: "${token}"`)
        }
    }
    return problems.length === 0 ? null : problems.join('; ')
})

// ── the closing donation line ───────────────────────────────────────────────

const DONATION = 'references/donation.md'
const HAS_DONATION = ALL_FILES.includes(join(SKILL_ROOT, DONATION))

check('SKILL.md carries the donation rule and links the reference', () => {
    if (!HAS_DONATION) return `no ${DONATION}`
    if (!/Offer the donation once/i.test(SKILL_MD)) return 'the rule is missing from Hard rules'
    return SKILL_MD.includes(`\`${DONATION}\``) ? null : 'the rule does not point at the reference'
})

check('donation.md points at the same link as the root README', () => {
    if (!HAS_DONATION) return `no ${DONATION}`
    // One source of truth. Nothing else here would notice a divergent or dead
    // donation link, because the link resolver deliberately skips external URLs.
    let readme

    try {
        readme = readFileSync(join(REPO_ROOT, 'README.md'), 'utf8')
    } catch {
        return SKIP
    }

    const canonical = /https?:\/\/[^\s)>"']*donate[^\s)>"']*/.exec(readme)?.[0]

    if (!canonical) return 'no donation link in the root README to compare against'
    return read(DONATION).includes(canonical) ? null : `does not use the README link ${canonical}`
})

check('donation.md keeps the ask non-aggressive', () => {
    if (!HAS_DONATION) return `no ${DONATION}`
    const text = read(DONATION)
    // Tone and bounds are behavioural, so nothing but an assertion keeps them.
    // Matched loosely: rewording the sentence is fine, dropping a bound is not.
    const missing = [
        ['an explicit way out', /no pressure/i],
        ['a once-per-conversation bound', /once per conversation/i],
        ['the ban on putting it in a file', /never a file|does not go in `design\.md`/i],
        ['the ban on installing or signing up', /never install/i],
    ].filter(([, pattern]) => !pattern.test(text)).map(([label]) => label)

    return missing.length === 0 ? null : `missing: ${missing.join(', ')}`
})

check('donation.md attributes the money to the tool, never to Refero', () => {
    if (!HAS_DONATION) return `no ${DONATION}`
    // The skill reads a third party's catalogue and says it is not affiliated
    // with Refero Design, so an ask that does not name the recipient is
    // ambiguous in the one way that costs money.
    const text = read(DONATION)

    if (!/author of this tool/i.test(text)) return 'does not say who receives the money'
    return /never name Refero Design as the recipient/i.test(text)
        ? null
        : 'does not rule out attributing it to Refero Design'
})

/**
 * The tree drawn in README.md's `## Layout`, as paths relative to the skill.
 *
 * Directories are named with a trailing slash and carry no description; their
 * children sit one level in, so a line's depth is the width of its tree prefix
 * divided by the four columns each level occupies.
 */
function layoutTree() {
    const block = /## Layout[\s\S]*?```\n([\s\S]*?)```/.exec(read('README.md'))

    if (!block) return null

    const entries = []
    const stack = []

    for (const line of block[1].split('\n')) {
        const match = /^([\s│]*(?:├──|└──)\s+)([^\s]+)/.exec(line)

        if (!match) continue

        const depth = Math.max(match[1].length / 4 - 1, 0)
        const isDirectory = match[2].endsWith('/')

        stack.length = depth
        const parent = stack.join('/')
        const name = match[2].replace(/\/$/, '')

        if (isDirectory) stack.push(name)
        entries.push({ name, parent, isDirectory })
    }

    return entries
}

check('README.md Layout lists exactly the files that exist', () => {
    const entries = layoutTree()

    if (entries === null) return 'no Layout code block'
    if (entries.length === 0) return 'the Layout block parsed to nothing'

    const pathOf = entry => (entry.parent === '' ? entry.name : `${entry.parent}/${entry.name}`)

    const listed = new Set(entries.map(pathOf))
    const real = new Set(ALL_FILES.map(rel))

    // A listed directory stands for its contents only when the tree draws no
    // children under it: that is what keeps `tests/scenarios/` to one line
    // instead of thirteen. A directory whose children *are* drawn covers
    // nothing, so a file added to `references/` without a new line is caught.
    const parents = new Set(entries.map(entry => entry.parent))
    const collapsed = entries
        .filter(entry => entry.isDirectory && !parents.has(pathOf(entry)))
        .map(pathOf)
    const covered = file => collapsed.some(dir => file.startsWith(`${dir}/`))

    const missing = []
    const invented = []

    for (const file of real) {
        if (!listed.has(file) && !covered(file)) missing.push(file)
    }

    for (const path of listed) {
        if (real.has(path)) continue
        if ([ ...real ].some(file => file.startsWith(`${path}/`))) continue
        invented.push(path)
    }

    if (missing.length > 0) return `not listed: ${missing.join(', ')}`
    return invented.length === 0 ? null : `listed but absent: ${invented.join(', ')}`
})

check('README.md Layout is directories first then files, alphabetical within each', () => {
    const entries = layoutTree()

    if (entries === null) return 'no Layout code block'

    const groups = new Map()

    for (const entry of entries) {
        if (!groups.has(entry.parent)) groups.set(entry.parent, [])
        groups.get(entry.parent).push(entry)
    }

    const wrong = []

    for (const [parent, children] of groups) {
        // Directories, then files, each alphabetical: the order a reader scans
        // a tree in, and the one that makes the next addition predictable.
        const order = children.map(child => `${child.isDirectory ? '0' : '1'}${child.name}`)
        const sorted = [ ...order ].sort()

        if (order.join('|') !== sorted.join('|')) {
            wrong.push(`${parent === '' ? 'the skill root' : `${parent}/`}: ${children.map(c => c.name).join(', ')}`)
        }
    }

    return wrong.length === 0 ? null : `unsorted in ${wrong.join(' | ')}`
})

/**
 * The environment variables `src/config.ts` reads, and the tables that
 * document them.
 *
 * The tables name a variable in prose elsewhere in the same file, so only the
 * first cell of a table row counts: it is the one that starts and ends with a
 * backticked `REFERO_*` and nothing else.
 */
function envTables() {
    const files = [ '../../README.md', 'references/mcp-tools.md' ]
    const tables = []

    for (const file of files) {
        let text

        try {
            text = read(file)
        } catch {
            // Extracted from a tarball there is no repository README. The
            // skill still has to validate, so check whatever is here.
            continue
        }

        const found = new Map()

        for (const [, name] of text.matchAll(/^\|\s*`(REFERO_[A-Z_]+)`\s*\|/gm)) {
            if (!found.has(name)) found.set(name, found.size)
        }

        tables.push({ file, found })
    }

    return tables
}

check('every environment variable in src/config.ts is documented in both tables', () => {
    const config = join(REPO_ROOT, 'src', 'config.ts')

    let source

    try {
        source = readFileSync(config, 'utf8')
    } catch {
        return SKIP
    }

    const declared = new Set([ ...source.matchAll(/\bREFERO_[A-Z_]+\b/g) ].map(match => match[0]))
    const problems = []

    for (const { file, found } of envTables()) {
        const documented = new Set(found.keys())
        const missing = [...declared].filter(name => !documented.has(name)).sort()
        const invented = [...documented].filter(name => !declared.has(name)).sort()

        if (missing.length > 0) problems.push(`${file}: undocumented ${missing.join(', ')}`)
        if (invented.length > 0) problems.push(`${file}: documents ${invented.join(', ')}, which the code does not read`)
    }

    return problems.length === 0 ? null : problems.join('; ')
})

check('environment variable tables are alphabetical', () => {
    const unsorted = []

    for (const { file, found } of envTables()) {
        const order = [...found.keys()]
        const sorted = [ ...order ].sort()

        if (order.join('|') !== sorted.join('|')) {
            unsorted.push(`${file}: ${order.join(', ')}`)
        }
    }

    return unsorted.length === 0 ? null : `not alphabetical in ${unsorted.join(' | ')}`
})

// ── content audit ───────────────────────────────────────────────────────────

const SECRET_PATTERNS = [
    ['an assignment to a credential-shaped name', /\b(api[_-]?key|secret|password|passwd|token[_-]?secret|access[_-]?key)\s*[=:]\s*["']?[A-Za-z0-9/+_-]{8,}/i],
    ['a bearer credential', /bearer\s+[A-Za-z0-9._~+/-]{12,}=*/i],
    ['an authorization header', /authorization\s*:\s*\S/i],
    ['a private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
]

check('no credential-shaped content', () => {
    const hits = []

    for (const file of ALL_FILES) {
        const text = readFileSync(file, 'utf8')
        for (const [label, pattern] of SECRET_PATTERNS) {
            const match = pattern.exec(text)
            if (match) hits.push(`${rel(file)}: ${label} ("${match[0].slice(0, 40)}")`)
        }
    }

    return hits.length === 0 ? null : hits.join('; ')
})

check('no binary, image, cache or environment files', () => {
    const BINARY = new Set([
        '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp', '.pdf',
        '.zip', '.tgz', '.gz', '.bz2', '.7z', '.woff', '.woff2', '.ttf', '.otf', '.eot',
        '.exe', '.dll', '.so', '.dylib', '.bin', '.node', '.pyc', '.class', '.jar', '.wasm',
    ])
    const FORBIDDEN_DIRS = ['node_modules', '.cache', 'dist', 'coverage', '.git', '.venv', '__pycache__']
    const bad = []

    for (const file of ALL_FILES) {
        const parts = rel(file).split('/')
        const extension = extname(file).toLowerCase()

        if (BINARY.has(extension)) bad.push(`${rel(file)}: binary or image`)
        else if (parts.some(part => FORBIDDEN_DIRS.includes(part))) bad.push(`${rel(file)}: build or cache directory`)
        else if (parts.includes('.env') || parts.includes('.env.local')) bad.push(`${rel(file)}: environment file`)
        else if (statSync(file).size > 100 * 1024) bad.push(`${rel(file)}: over 100 KB`)
    }

    return bad.length === 0 ? null : bad.join('; ')
})

check('every markdown file is valid UTF-8 text with a final newline', () => {
    const bad = ALL_FILES
        .filter(file => /\.(md|json|mjs)$/.test(file))
        .filter(file => !readFileSync(file, 'utf8').endsWith('\n'))
        .map(rel)
    return bad.length === 0 ? null : `no trailing newline: ${bad.join(', ')}`
})

// ── report ──────────────────────────────────────────────────────────────────

for (const name of checks) process.stdout.write(`  ok  ${name}\n`)

for (const failure of failures) process.stdout.write(`FAIL  ${failure}\n`)

process.stdout.write(`\n${checks.length} passed, ${failures.length} failed\n`)
process.exit(failures.length === 0 ? 0 : 1)
