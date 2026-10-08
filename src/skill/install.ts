#!/usr/bin/env node

/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * `refero-design-skill` — put the research skill where an agent will find it.
 *
 * Knowledge about agent clients is data, not code: `clients.json` declares the
 * target directories, so correcting a client is a five-line commit. What cannot
 * be expressed in the manifest lives here — write *through* symlinks, never
 * clobber without `--force`, link in global scope and copy in project scope.
 *
 * Unlike the MCP entry point, stdout is the product here: this is a CLI, and
 * the installer's report is the thing the user asked for.
 */

import {
    copyFileSync,
    existsSync,
    lstatSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    realpathSync,
    rmSync,
    symlinkSync,
    unlinkSync,
    writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Stats } from 'node:fs'

import { VERSION } from '../version.js'

// ── manifest ─────────────────────────────────────────────────────────────────

export type Scope = 'global' | 'project'
export type TargetMode = 'copy' | 'link'

/**
 * One scope of one client.
 *
 * `path: null` means "not claimed": the installer refuses the target and reports
 * the `reason` rather than creating a directory nothing reads. `sharedRoot`
 * marks a client that reads the shared `.agents/skills` root and therefore
 * declares no directory of its own.
 */
export interface ClientTarget {
    path: string | null
    reason?: string
    sharedRoot?: boolean
}

export interface ClientManifest {
    detect: string[]
    global: ClientTarget
    id: string
    label: string
    project: ClientTarget
    source?: string
    status: 'partial' | 'unverified' | 'verified'
}

export interface SkillManifest {
    clients: ClientManifest[]
    sharedRoots: Record<Scope, string>
    skillName: string
    skillVersion: string
}

/** What the installer recorded inside a directory it wrote. */
export interface Marker {
    installedAt: string
    mode: TargetMode
    path: string
    skill: string
    skillVersion: string
}

export interface InstallEnv {
    cwd: string
    home: string
    platform: NodeJS.Platform
}

export interface Target {
    clients: string[]
    dir: string
    linkTo?: string
    mode: TargetMode
}

export interface Plan {
    scope: Scope | null
    skillName: string
    skillVersion: string
    sourceDir: string
    targets: Target[]
    unclaimed: { client: string; reason: string; scope: Scope }[]
}

export interface InstallRequest {
    clients: string[]
    dryRun: boolean
    force: boolean
    path?: string
    scope: Scope
    useAll: boolean
}

export type Outcome = 'installed' | 'link created' | 'outdated' | 'removed' | 'unchanged'

export interface ApplyOptions {
    dryRun: boolean
    env: InstallEnv
    force: boolean
    now: () => string
    report: (line: string) => void
}

/**
 * Written inside every copy so a later run can tell "this tool put it here"
 * from "the user made this directory". Excluded from the tree diff, since it is
 * this tool's own bookkeeping and always changes.
 *
 * Named after the MCP, not after the installer, because that is what it marks:
 * the skill that this package's server documents.
 */
const MARKER_FILE = '.refero-design-mcp.json'

/**
 * A failure the user can act on.
 *
 * Every one carries the command that fixes it, because an installer that says
 * "permission denied" and stops has done half the job.
 */
export class CliError extends Error {
    readonly hint: string

    constructor(message: string, hint: string) {
        super(message)
        this.hint = hint
    }
}

/**
 * Read the manifest from beside the skill it describes.
 *
 * Parsed rather than imported: the file lives outside `rootDir`, so a static
 * import would drag it into the build output and defeat the point of shipping
 * the manifest as data.
 *
 * `skillVersion` is derived, not read. The skill ships inside this package's
 * tarball, so there is no release in which one moves without the other, and a
 * second literal could only duplicate the package version or claim an
 * independence that does not exist. Deriving it also binds the installed skill
 * to the tool surface it shipped with, so an MCP release that changes a tool
 * the skill calls is reported as out of date rather than silently mismatched.
 */
export function loadManifest(skillDir: string, version: string = VERSION): SkillManifest {
    const manifestPath = join(skillDir, 'clients.json')

    try {
        const parsed = JSON.parse(readFileSync(manifestPath, 'utf8')) as Omit<SkillManifest, 'skillVersion'>
        return { ...parsed, skillVersion: version }
    } catch (error) {
        throw new CliError(
            `Cannot read ${manifestPath}: ${( error as Error ).message}`,
            'Reinstall the package: npm install -g @darcas/refero-design-mcp',
        )
    }
}

/**
 * Resolve a manifest path against the environment.
 *
 * `~` is the home directory and anything else relative is the working
 * directory, which is what separates a global target from a project one. The
 * environment is injected rather than read from `os` so a test never touches
 * the real home.
 */
export function expandPath(raw: string, env: InstallEnv): string {
    if (raw === '~') return env.home
    if (raw.startsWith('~/')) return resolve(env.home, raw.slice(2))

    return resolve(env.cwd, raw)
}

/** Display form of an absolute path: `~` and the working directory shortened. */
function displayPath(path: string, env: InstallEnv): string {
    if (path === env.home) return '~'
    if (path.startsWith(`${env.home}${sep}`)) return `~${path.slice(env.home.length)}`

    const fromCwd = relative(env.cwd, path)
    if (fromCwd !== '' && !fromCwd.startsWith('..') && !isAbsolute(fromCwd)) return `.${sep}${fromCwd}`

    return path
}

function detectedClients(manifest: SkillManifest, env: InstallEnv): string[] {
    return manifest.clients
        .filter(client => client.detect.some(candidate => existsSync(expandPath(candidate, env))))
        .map(client => client.id)
}

/**
 * Turn a request into the set of directories to write, deduplicated by path.
 *
 * Global scope always writes the shared root even when no selected client reads
 * it, because it is what the links point at. Project scope writes it only when a
 * client asks for it — an unrequested write into someone's repository is worse
 * than a missing one.
 */
export function planInstall(
    manifest: SkillManifest,
    sourceDir: string,
    request: InstallRequest,
    env: InstallEnv,
): Plan {
    const unclaimed: Plan['unclaimed'] = []

    if (request.path !== undefined) {
        const root = resolve(env.cwd, request.path)

        return {
            scope: null,
            skillName: manifest.skillName,
            skillVersion: manifest.skillVersion,
            sourceDir,
            targets: [{
                clients: [`--path ${root}`],
                dir: join(root, manifest.skillName),
                mode: 'copy',
            }],
            unclaimed,
        }
    }

    const scope = request.scope
    const valid = manifest.clients.map(client => client.id)
    let selected: ClientManifest[]

    if (request.useAll) {
        const found = detectedClients(manifest, env)
        if (found.length === 0) {
            throw new CliError(
                'No supported agent client was detected.',
                `Install for one explicitly: refero-design-skill install --client ${valid[ 0 ]}; ` +
                'or use --path <dir> for an unsupported client. Known ids: ' + valid.join(', '),
            )
        }

        selected = manifest.clients.filter(client => found.includes(client.id))
    } else {
        const unknown = request.clients.filter(id => !valid.includes(id))
        if (unknown.length > 0) {
            throw new CliError(
                `Unknown client: ${unknown.join(', ')}.`,
                `Known ids: ${valid.join(', ')}`,
            )
        }

        selected = manifest.clients.filter(client => request.clients.includes(client.id))
    }

    const sharedRoot = join(expandPath(manifest.sharedRoots[ scope ], env), manifest.skillName)
    const dirs = new Map<string, string[]>()

    const claim = (dir: string, id: string): void => {
        const existing = dirs.get(dir)

        if (existing === undefined) dirs.set(dir, [id])
        else if (!existing.includes(id)) existing.push(id)
    }

    if (scope === 'global') dirs.set(sharedRoot, [])

    for (const client of selected) {
        const target = client[ scope ]

        if (target.sharedRoot === true) {
            if (!dirs.has(sharedRoot)) dirs.set(sharedRoot, [])
            claim(sharedRoot, client.id)
            continue
        }

        if (target.path === null) {
            unclaimed.push({client: client.id, reason: target.reason ?? 'not claimed', scope})
            continue
        }

        claim(join(expandPath(target.path, env), manifest.skillName), client.id)
    }

    if (dirs.size === 0) {
        const reasons = unclaimed.map(entry => `${entry.client}.${entry.scope}: ${entry.reason}`)

        throw new CliError(
            `No ${scope}-scope target is claimed by ${selected.map(client => client.id).join(', ')}.`,
            reasons.length > 0
                ? reasons.join('; ') + '. Use --path <dir> to install it anyway.'
                : 'Use --path <dir> to install it anyway.',
        )
    }

    // Insertion order: the shared root first when global scope added it, then
    // the client directories in manifest order. applyPlan and removePlan impose
    // the mode ordering they each need, because install and uninstall disagree.
    const targets = [...dirs].map(([dir, clients]): Target => scope === 'global' && dir !== sharedRoot
        ? {clients, dir, linkTo: sharedRoot, mode: 'link'}
        : {clients, dir, mode: 'copy'})

    return {
        scope,
        skillName: manifest.skillName,
        skillVersion: manifest.skillVersion,
        sourceDir,
        targets,
        unclaimed,
    }
}

// ── filesystem ───────────────────────────────────────────────────────────────

function lstatOrNull(path: string): Stats | null {
    try {
        return lstatSync(path)
    } catch {
        return null
    }
}

function readMarker(dir: string): Marker | null {
    try {
        return JSON.parse(readFileSync(join(dir, MARKER_FILE), 'utf8')) as Marker
    } catch {
        return null
    }
}

/** Every file under `dir`, as sorted paths relative to it. */
function listFiles(dir: string, prefix = ''): string[] {
    const out: string[] = []

    for (const entry of readdirSync(dir, {withFileTypes: true})) {
        const relativePath = prefix === '' ? entry.name : `${prefix}/${entry.name}`
        if (entry.isDirectory()) out.push(...listFiles(join(dir, entry.name), relativePath))
        else out.push(relativePath)
    }

    return out.sort()
}

const MAX_COMPARE_BYTES = 1024 * 1024

function sameContent(a: string, b: string): boolean {
    const left = lstatSync(a)
    const right = lstatSync(b)

    if (left.size !== right.size || left.size > MAX_COMPARE_BYTES) return false

    return readFileSync(a).equals(readFileSync(b))
}

interface TreeDiff {
    added: string[]
    changed: string[]
    empty: boolean
    removed: string[]
}

/** What an install would do to `target`, excluding the marker this tool owns. */
function diffTrees(sourceDir: string, targetDir: string): TreeDiff {
    const source = listFiles(sourceDir).filter(name => name !== MARKER_FILE)
    const target = listFiles(targetDir).filter(name => name !== MARKER_FILE)
    const sourceSet = new Set(source)
    const targetSet = new Set(target)

    const added = source.filter(name => !targetSet.has(name))
    const changed = source.filter(name => targetSet.has(name)
        && !sameContent(join(sourceDir, name), join(targetDir, name)))
    const removed = target.filter(name => !sourceSet.has(name))

    return {
        added,
        changed,
        empty: added.length === 0 && changed.length === 0 && removed.length === 0,
        removed,
    }
}

function copyTree(from: string, to: string): void {
    mkdirSync(to, {recursive: true})

    for (const entry of readdirSync(from, {withFileTypes: true})) {
        const source = join(from, entry.name)
        const target = join(to, entry.name)

        if (entry.isDirectory()) copyTree(source, target)
        else copyFileSync(source, target)
    }
}

/** Common-prefix/suffix trimmed diff: exact, and enough to review an overwrite. */
function lineDiff(before: string, after: string): string[] {
    const a = before.split('\n')
    const b = after.split('\n')
    let start = 0

    while (start < a.length && start < b.length && a[ start ] === b[ start ]) start++

    let endA = a.length - 1
    let endB = b.length - 1

    while (endA >= start && endB >= start && a[ endA ] === b[ endB ]) {
        endA--
        endB--
    }

    return [
        ...a.slice(start, endA + 1).map(line => `- ${line}`),
        ...b.slice(start, endB + 1).map(line => `+ ${line}`),
    ]
}

function reportDiff(sourceDir: string, targetDir: string, diff: TreeDiff, options: ApplyOptions): void {
    for (const name of diff.added) options.report(`  + ${name}`)
    for (const name of diff.removed) options.report(`  - ${name}`)

    for (const name of diff.changed) {
        options.report(`  ~ ${name}`)

        const installed = join(targetDir, name)
        const stat = lstatOrNull(installed)
        if (stat === null || stat.size > MAX_COMPARE_BYTES) continue

        for (const line of lineDiff(
            readFileSync(installed, 'utf8'),
            readFileSync(join(sourceDir, name), 'utf8'),
        )) options.report(`    ${line}`)
    }
}

// ── applying a plan ──────────────────────────────────────────────────────────

/**
 * True when `linkPath` is a symlink that resolves to `target`.
 *
 * Both resolutions are inside the try because a link may legitimately point at a
 * target that has not been written yet.
 */
function pointsAt(linkPath: string, target: string): boolean {
    try {
        return realpathSync(linkPath) === realpathSync(target)
    } catch {
        return false
    }
}

/**
 * Write the skill into a directory this installer owns.
 *
 * An existing symlink is written *through*, never replaced: a skills directory
 * that is itself a link into a sync folder would be detached by rm + mkdir.
 */
function applyCopy(plan: Plan, target: Target, options: ApplyOptions): Outcome {
    const existing = lstatOrNull(target.dir)
    const dir = existing?.isSymbolicLink() === true ? realpathSync(target.dir) : target.dir

    if (existing !== null && !existing.isDirectory()) {
        throw new CliError(
            `${target.dir} exists and is not a directory.`,
            'Move it aside, then re-run refero-design-skill install.',
        )
    }

    if (existing !== null) {
        const marker = readMarker(dir)

        // No marker means the directory is somebody else's, so replacing it is a
        // blind overwrite and takes an explicit --force. This used to throw
        // unconditionally while telling the user to pass --force, which could
        // never succeed.
        if (marker === null && !options.force) {
            throw new CliError(
                `${target.dir} exists and was not installed by refero-design-skill.`,
                'Re-run with --force to replace it: refero-design-skill install --force ' +
                    `--scope ${plan.scope ?? 'global'}`,
            )
        }

        if (marker !== null && marker.skill !== plan.skillName) {
            throw new CliError(
                `${target.dir} holds "${marker.skill}", not "${plan.skillName}".`,
                'Install that skill with its own installer.',
            )
        }

        const diff = diffTrees(plan.sourceDir, dir)
        // No marker means no recorded version, so a forced replace of one is
        // never "up to date".
        const outdated = marker !== null && marker.skillVersion !== plan.skillVersion

        if (marker !== null && !outdated && diff.empty) return 'unchanged'

        // A version difference is the expected reason for a rewrite. A tree
        // difference at the *same* version is somebody's local edit.
        if (marker !== null && !outdated && !options.force) {
            throw new CliError(
                `${target.dir} differs from this package's copy of ${plan.skillName}.`,
                'Either this package changed after the skill was installed, or the installed copy '
                    + 'was edited by hand. Re-run with --force to sync; --dry-run prints the diff first.',
            )
        }

        reportDiff(plan.sourceDir, dir, diff, options)

        if (options.dryRun) return marker !== null && outdated ? 'outdated' : 'installed'

        if (marker === null) {
            // A directory we do not own, replaced on an explicit --force. Removed
            // outright: its contents are unknown, and leaving them behind would
            // interleave somebody else's files with the skill.
            rmSync(dir, {force: true, recursive: true})
        } else {
            // Our own copy, refreshed in place. Removing the directory would take
            // its inode with it, and an agent watching that path sees the skill
            // disappear and stop advertising it — observed on a live session
            // after a `--force` refresh. Removing only the files the source no
            // longer has keeps the directory itself stable, which `copyTree` then
            // overwrites in place.
            for (const name of diff.removed) rmSync(join(dir, name), { force: true })
        }
    }

    if (options.dryRun) return 'installed'

    copyTree(plan.sourceDir, dir)
    writeFileSync(join(dir, MARKER_FILE), `${JSON.stringify({
        installedAt: options.now(),
        mode: 'copy',
        path: dir,
        skill: plan.skillName,
        skillVersion: plan.skillVersion,
    } satisfies Marker, null, 2)}\n`, 'utf8')

    return 'installed'
}

/**
 * Point a client directory at the shared copy.
 *
 * `junction` on Windows: a plain directory symlink needs administrator rights
 * without Developer Mode, and a junction does not.
 */
function applyLink(target: Target, options: ApplyOptions): Outcome {
    const existing = lstatOrNull(target.dir)
    const linkTo = target.linkTo as string

    if (existing !== null) {
        if (existing.isSymbolicLink() && pointsAt(target.dir, linkTo)) return 'unchanged'

        const clash = existing.isDirectory()
            ? `${target.dir} exists and is not a link this installer created.`
            : `${target.dir} is a link pointing somewhere else.`

        if (!options.force) {
            throw new CliError(
                clash,
                'Re-run with --force to replace it: refero-design-skill install ' +
                '--force --scope global',
            )
        }

        if (options.dryRun) return 'link created'

        if (existing.isSymbolicLink()) unlinkSync(target.dir)
        else rmSync(target.dir, {force: true, recursive: true})
    }

    if (options.dryRun) return 'link created'

    mkdirSync(dirname(target.dir), {recursive: true})
    symlinkSync(linkTo, target.dir, options.env.platform === 'win32' ? 'junction' : 'dir')

    return 'link created'
}

/** Only the targets of one mode; the two loops below must not overlap. */
function ofMode(targets: Target[], mode: TargetMode): Target[] {
    return targets.filter(target => target.mode === mode)
}

export function applyPlan(plan: Plan, options: ApplyOptions): Map<string, Outcome> {
    const results = new Map<string, Outcome>()

    // Copies first: a link target that does not exist yet cannot be resolved,
    // and the ordering is also what makes an existing link test as "unchanged"
    // rather than as pointing somewhere else.
    for (const target of ofMode(plan.targets, 'copy')) {
        results.set(target.dir, applyCopy(plan, target, options))
    }

    for (const target of ofMode(plan.targets, 'link')) {
        results.set(target.dir, applyLink(target, options))
    }

    return results
}

/** Remove exactly what the plan installed, and nothing it did not write. */
export function removePlan(plan: Plan, options: ApplyOptions): Map<string, Outcome> {
    const results = new Map<string, Outcome>()

    // Links first: unlinking never destroys its target, so this cannot leave the
    // shared copy deleted underneath a link that still points at it.
    for (const target of ofMode(plan.targets, 'link')) {
        const existing = lstatOrNull(target.dir)

        if (existing === null) {
            results.set(target.dir, 'unchanged')
            continue
        }

        if (!existing.isSymbolicLink()) {
            throw new CliError(
                `${target.dir} is no longer a link, so refero-design-skill did not put it there.`,
                'Remove it by hand if you want it gone.',
            )
        }

        if (!options.dryRun) unlinkSync(target.dir)
        results.set(target.dir, 'removed')
    }

    for (const target of ofMode(plan.targets, 'copy')) {
        const existing = lstatOrNull(target.dir)

        if (existing === null) {
            results.set(target.dir, 'unchanged')
            continue
        }

        // A symlinked skills directory is written through, so the marker lives at
        // the real path and that is the directory the marker describes.
        const dir = existing.isSymbolicLink() === true ? realpathSync(target.dir) : target.dir
        const marker = readMarker(dir)

        if (marker === null || marker.skill !== plan.skillName) {
            throw new CliError(
                `${target.dir} was not installed by refero-design-skill.`,
                'Refusing to delete it. Remove it by hand if that is what you want.',
            )
        }

        if (!options.dryRun) rmSync(dir, {force: true, recursive: true})
        results.set(target.dir, 'removed')
    }

    return results
}

// ── reporting ────────────────────────────────────────────────────────────────

interface State {
    dir: string
    mode: TargetMode | null
    version: string | null
}

function readState(target: Target): State {
    const existing = lstatOrNull(target.dir)

    if (existing === null) return {dir: target.dir, mode: null, version: null}

    if (target.mode === 'link') {
        if (!existing.isSymbolicLink()) return {dir: target.dir, mode: null, version: null}
        return {
            dir: target.dir,
            mode: 'link',
            version: readMarker(realpathSync(target.dir))?.skillVersion ?? null,
        }
    }

    const dir = existing.isSymbolicLink() === true ? realpathSync(target.dir) : target.dir
    const marker = readMarker(dir)

    return {
        dir: target.dir,
        mode: marker === null ? null : 'copy',
        version: marker?.skillVersion ?? null,
    }
}

function renderList(manifest: SkillManifest, sourceDir: string, env: InstallEnv): string[] {
    const lines = [
        `${manifest.skillName} ${manifest.skillVersion}`,
        `  source    ${sourceDir}`,
        '',
    ]

    for (const client of manifest.clients) {
        const found = client.detect.some(candidate => existsSync(expandPath(candidate, env)))
        lines.push(`${client.id} — ${client.label} [${client.status}] ${found ? 'detected' : 'not detected'}`)

        for (const scope of ['global', 'project'] as const) {
            const declared = client[ scope ]

            if (declared.sharedRoot !== true && declared.path === null) {
                lines.push(`  ${scope.padEnd(8)} not claimed — ${declared.reason ?? 'not claimed'}`)
                continue
            }

            // A client with a directory of its own is a link target in global
            // scope, and the link is what global scope writes.
            const mode: TargetMode = scope === 'global' && declared.sharedRoot !== true ? 'link' : 'copy'
            const dir = declared.sharedRoot === true
                ? join(expandPath(manifest.sharedRoots[ scope ], env), manifest.skillName)
                : join(expandPath(declared.path as string, env), manifest.skillName)
            const state = readState({clients: [client.id], dir, mode})
            const shown = state.mode === null
                ? 'not installed'
                : state.version === null
                    ? 'installed, no marker'
                    : state.version === manifest.skillVersion
                        ? state.version
                        : `${state.version} OUTDATED`

            lines.push(`  ${scope.padEnd(8)} ${mode.padEnd(6)} ${displayPath(state.dir, env).padEnd(56)} ${shown}`)
        }

        lines.push('')
    }

    return lines
}

function renderPlan(plan: Plan, results: Map<string, Outcome>, env: InstallEnv, dryRun: boolean): string[] {
    const lines: string[] = []

    if (dryRun) lines.push('Dry run — nothing was written.')
    lines.push('')

    for (const target of plan.targets) {
        const outcome = results.get(target.dir) ?? 'unchanged'
        const via = target.clients.length > 0 ? target.clients.join(', ') : 'shared root'
        const label = target.mode === 'link'
            ? `link -> ${displayPath(target.linkTo as string, env)}`
            : 'copy'

        lines.push(`  ${outcome.padEnd(14)} ${label.padEnd(58)} ${displayPath(target.dir, env)}  [${via}]`)
    }

    for (const entry of plan.unclaimed) {
        lines.push(`  skipped       ${entry.client}.${entry.scope} — ${entry.reason}`)
    }

    return lines
}

const AFTER_INSTALL = [
    'Restart the agent session so it re-discovers skills. Some clients (Claude Code,',
    'Codex) pick up changes live; others read them at startup.',
    '',
    'Try it:',
    '  "Build the landing page for my API product. Use the refero-design-research skill."',
    '',
    'After upgrading the npm package, re-run `refero-design-skill install` — there is no',
    'postinstall script, so nothing updates itself.',
]

// ── cli ──────────────────────────────────────────────────────────────────────

export interface CliDeps {
    env: InstallEnv
    err: (text: string) => void
    out: (text: string) => void
    skillDir: string
    /**
     * The release the skill is installed from, which the manifest inherits.
     * Injectable rather than read from `VERSION` at the call site so a test can
     * simulate an upgrade without editing a manifest that must not hold one.
     */
    version?: string
}

const USAGE = [
    'Usage:',
    '  refero-design-skill install [--client <ids>] [--scope global|project] [--all]',
    '                       [--dry-run] [--force] [--path <dir>]',
    '  refero-design-skill uninstall --client <ids> [--scope global|project] [--dry-run]',
    '  refero-design-skill list',
    '  refero-design-skill --version',
    '',
    'Bare `install` behaves as `--all` in global scope. Global scope writes one',
    'shared copy under ~/.agents/skills and links each client to it; project scope',
    'copies into the repository, because a symlink into $HOME breaks on another',
    'machine and in CI.',
].join('\n')

interface ParsedArgs {
    clients: string[]
    command: 'help' | 'install' | 'list' | 'uninstall' | 'version'
    dryRun: boolean
    error?: string
    force: boolean
    path?: string
    scope: Scope
    useAll: boolean
}

function parseArgs(argv: string[]): ParsedArgs {
    const parsed: ParsedArgs = {
        clients: [],
        command: 'help',
        dryRun: false,
        force: false,
        scope: 'global',
        useAll: false,
    }
    const value = (flag: string, inline: string | undefined, rest: string[], index: number): string => {
        if (inline !== undefined) return inline
        const next = rest[ index + 1 ]
        if (next === undefined || next.startsWith('--')) throw new CliError(`${flag} needs a value.`, USAGE)

        return next
    }

    try {
        const rest = [...argv]

        for (let index = 0; index < rest.length; index++) {
            const arg = rest[ index ] as string

            if (!arg.startsWith('-')) {
                if (arg !== 'install' && arg !== 'uninstall' && arg !== 'list' && arg !== 'help') {
                    throw new CliError(`Unknown command: ${arg}.`, USAGE)
                }
                parsed.command = arg
                continue
            }

            const [flag, inline] = arg.includes('=') ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)] : [arg, undefined]

            switch (flag) {
                case '--version':
                    parsed.command = 'version'
                    break
                case '--help':
                case '-h':
                    parsed.command = 'help'
                    break
                case '--client':
                    parsed.clients.push(...value(flag, inline, rest, index).split(',').map(id => id.trim()).filter(id => id !== ''))
                    index += inline === undefined ? 1 : 0
                    break
                case '--scope': {
                    const scope = value(flag, inline, rest, index)
                    if (scope !== 'global' && scope !== 'project') {
                        throw new CliError(`--scope must be global or project, got "${scope}".`, USAGE)
                    }
                    parsed.scope = scope
                    index += inline === undefined ? 1 : 0
                    break
                }
                case '--path':
                    parsed.path = value(flag, inline, rest, index)
                    index += inline === undefined ? 1 : 0
                    break
                case '--all':
                    parsed.useAll = true
                    break
                case '--dry-run':
                    parsed.dryRun = true
                    break
                case '--force':
                    parsed.force = true
                    break
                default:
                    throw new CliError(`Unknown option: ${flag}.`, USAGE)
            }
        }
    } catch (error) {
        parsed.error = ( error as Error ).message
    }

    return parsed
}

/**
 * One entry point for every command, so a test drives the real argument parsing
 * and the real filesystem writes rather than a mock of them.
 */
export function runCli(argv: string[], deps: CliDeps): number {
    const {err, out} = deps

    const fail = (error: unknown): number => {
        const message = error instanceof CliError
            ? `${error.message}\n\n${error.hint}`
            : ( error as Error ).message

        err(`refero-design-skill: ${message}\n`)
        return 1
    }

    try {
        const args = parseArgs(argv)

        if (args.error !== undefined) throw new CliError(args.error, USAGE)

        if (args.command === 'help') {
            out(`${USAGE}\n`)
            return 0
        }

        const manifest = loadManifest(deps.skillDir, deps.version)

        if (args.command === 'version') {
            out(`${manifest.skillName} — from refero-design-mcp ${manifest.skillVersion}\n`)
            return 0
        }

        if (args.command === 'list') {
            out(`${renderList(manifest, deps.skillDir, deps.env).join('\n')}\n`)
            return 0
        }

        const request: InstallRequest = {
            clients: args.clients,
            dryRun: args.dryRun,
            force: args.force,
            path: args.path,
            scope: args.scope,
            useAll: args.useAll || ( args.clients.length === 0 && args.path === undefined ),
        }

        const plan = planInstall(manifest, deps.skillDir, request, deps.env)
        const options: ApplyOptions = {
            dryRun: args.dryRun,
            env: deps.env,
            force: args.force,
            now: () => new Date().toISOString(),
            report: line => out(`${line}\n`),
        }

        const results = args.command === 'uninstall'
            ? removePlan(plan, options)
            : applyPlan(plan, options)

        // A no-op is not an install, so it does not get install advice — telling
        // someone to restart their agent for nothing is how a hint stops working.
        const quiet = [...results.values()].every(outcome => outcome === 'unchanged')

        if (quiet) {
            out(`${plan.skillName} ${plan.skillVersion} is already installed.\n`)
            return 0
        }

        const verb = args.command === 'uninstall'
            ? ( args.dryRun ? 'Would uninstall:' : 'Uninstalled:' )
            : ( args.dryRun ? 'Would install:' : 'Installed:' )

        out(`${verb} ${plan.skillName} ${plan.skillVersion}\n`)
        out(`${renderPlan(plan, results, deps.env, args.dryRun).join('\n')}\n`)

        if (args.command === 'install' && !args.dryRun) out(`${AFTER_INSTALL.join('\n')}\n`)

        return 0
    } catch (error) {
        return fail(error)
    }
}

// ── entry ────────────────────────────────────────────────────────────────────

/**
 * Resolved from `import.meta.url` rather than `__dirname`, and two levels up
 * because both `src/skill/` and `dist/skill/` sit the same distance below the
 * package root. That is what makes it work from an `npx` cache.
 */
export const SKILL_DIR = fileURLToPath(new URL('../../skill/refero-design-research', import.meta.url))

function isDirectInvocation(): boolean {
    const entry = process.argv[ 1 ]
    if (entry === undefined) return false

    try {
        return realpathSync(entry) === fileURLToPath(import.meta.url)
    } catch {
        return false
    }
}

if (isDirectInvocation()) {
    process.exit(runCli(process.argv.slice(2), {
        env: {cwd: process.cwd(), home: homedir(), platform: process.platform},
        err: text => {
            process.stderr.write(text)
        },
        out: text => {
            process.stdout.write(text)
        },
        skillDir: SKILL_DIR,
    }))
}
