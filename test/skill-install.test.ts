/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * The installer, driven through its real CLI surface.
 *
 * Everything runs against a tmpdir home and a tmpdir working directory, and the
 * skill tree is copied into the tmpdir too, so a test can bump `skillVersion`
 * without touching the repository. The platform is injected rather than read,
 * which is how the Windows junction branch is reachable from Linux.
 */

import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadManifest, runCli, type CliDeps } from '../src/skill/install.js'
import { VERSION } from '../src/version.js'

interface Harness {
    deps: CliDeps
    home: string
    project: string
    skillDir: string
}

let harness: Harness
let out: string
let err: string

const SKILL_NAME = 'refero-design-research'

/**
 * Stand-in for the release the skill ships in.
 *
 * The installer derives this from the package version at runtime, so a test
 * that hardcoded the real one would fail on every release for no reason.
 */
const SKILL_VERSION = '1.0.0'

function run(argv: string[]): number {
    out = ''
    err = ''

    return runCli(argv, { ...harness.deps, out: text => out += text, err: text => err += text })
}

/** `~/.agents/skills/refero-design-research`, the shared global copy. */
function sharedDir(): string {
    return join(harness.home, '.agents', 'skills', SKILL_NAME)
}

/** `~/.claude/skills/refero-design-research`, a link target. */
function claudeDir(): string {
    return join(harness.home, '.claude', 'skills', SKILL_NAME)
}

function markerAt(dir: string): Record<string, unknown> {
    return JSON.parse(readFileSync(join(dir, '.refero-design-mcp.json'), 'utf8')) as Record<string, unknown>
}

/** Both resolutions in one try: a link may point at a target not yet written. */
function pointsAtForTest(linkPath: string, target: string): boolean {
    try {
        return realpathSync(linkPath) === realpathSync(target)
    } catch {
        return false
    }
}

/** Copy the real skill into the tmpdir so a test can edit its manifest. */
function copySkill(home: string): string {
    const target = join(home, 'source-skill', SKILL_NAME)
    cpSync(join(import.meta.dirname, '..', 'skill', SKILL_NAME), target, { recursive: true })

    return target
}

/**
 * Simulate running a different release of the package.
 *
 * The version is derived, not stored in `clients.json`, so it is injected
 * through the same seam the real entry point uses. A test cannot bump it by
 * editing the manifest — that field no longer exists, and the validator fails
 * the build if it comes back.
 */
function setSkillVersion(version: string): void {
    harness.deps.version = version
}

let root: string

beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'refero-design-skill-test-'))
    const home = join(root, 'home')
    const project = join(root, 'project')

    mkdirSync(home, { recursive: true })
    mkdirSync(project, { recursive: true })
    // The two clients whose detect directory this suite creates.
    mkdirSync(join(home, '.claude'), { recursive: true })
    mkdirSync(join(home, '.codex'), { recursive: true })

    const skillDir = copySkill(home)

    harness = {
        deps: {
            env: { cwd: project, home, platform: 'linux' },
            err: () => undefined,
            out: () => undefined,
            skillDir,
            // Pinned so assertions do not move when the package is released.
            version: SKILL_VERSION,
        },
        home,
        project,
        skillDir,
    }
})

afterEach(() => {
    rmSync(root, { force: true, recursive: true })
})

describe('a fresh install', () => {
    it('writes the shared root and links each client that declares its own directory', () => {
        expect(run([ 'install' ])).toBe(0)

        expect(existsSync(join(sharedDir(), 'SKILL.md'))).toBe(true)
        expect(existsSync(join(sharedDir(), 'references', 'mcp-tools.md'))).toBe(true)
        expect(lstatSync(claudeDir()).isSymbolicLink()).toBe(true)
        expect(realpathSync(claudeDir())).toBe(realpathSync(sharedDir()))
    })

    it('records a marker in the copy and a timestamp in it', () => {
        run([ 'install' ])

        const marker = markerAt(sharedDir())

        expect(marker.skill).toBe(SKILL_NAME)
        expect(marker.mode).toBe('copy')
        expect(marker.skillVersion).toBe(SKILL_VERSION)
        expect(marker.path).toBe(sharedDir())
        expect(typeof marker.installedAt).toBe('string')
    })

    it('performs one write and one link for a bare install with both clients present', () => {
        run([ 'install' ])

        expect(out).toContain('link created')
        expect(out).toContain('installed')
        // codex reads the shared root, so it is not a second write.
        expect(out.match(/copy\s+~\/\.agents/g)).toHaveLength(1)
    })

    it('prints where it wrote, the restart hint, and an example prompt', () => {
        run([ 'install' ])

        expect(out).toContain('Restart the agent session')
        expect(out).toContain('refero-design-research skill')
        expect(out).toContain('re-run `refero-design-skill install`')
    })
})

describe('idempotence and versioning', () => {
    it('is a no-op on a second identical install, and says so', () => {
        run([ 'install' ])
        expect(run([ 'install' ])).toBe(0)

        expect(out).toContain('already installed')
        expect(out).not.toContain('Restart the agent session')
    })

    it('refreshes when the package version moves on', () => {
        run([ 'install' ])
        setSkillVersion('1.1.0')

        expect(run([ 'install' ])).toBe(0)

        expect(markerAt(sharedDir()).skillVersion).toBe('1.1.0')
        expect(out).toContain('installed')
    })

    it('takes the version from the package, not from clients.json', () => {
        // The manifest cannot hold one. If it ever does, this pins the bug
        // rather than the behaviour: two numbers ship disagreeing.
        const manifest = JSON.parse(readFileSync(join(harness.skillDir, 'clients.json'), 'utf8')) as Record<string, unknown>

        expect(manifest.skillVersion).toBeUndefined()
        expect(loadManifest(harness.skillDir, '9.9.9').skillVersion).toBe('9.9.9')
        // The default is the real release, resolved the same way the server
        // reports its own version — so the skill can never claim a number the
        // package did not ship.
        expect(loadManifest(harness.skillDir).skillVersion).toBe(VERSION)
    })

    it('treats a changed tree at the same version as a local edit', () => {
        run([ 'install' ])
        writeFileSync(join(sharedDir(), 'SKILL.md'), 'hand-edited\n', 'utf8')

        expect(run([ 'install' ])).toBe(1)
        // Names both causes: a changed package and a hand-edited copy look the
        // same from here, and only one of them is the user's doing.
        expect(err).toContain(`differs from this package's copy of ${SKILL_NAME}`)
        expect(err).toContain('edited by hand')
        expect(readFileSync(join(sharedDir(), 'SKILL.md'), 'utf8')).toBe('hand-edited\n')
    })
})

describe('scope', () => {
    it('links in global scope and copies in project scope', () => {
        run([ 'install', '--client', 'claude,codex', '--scope', 'project' ])

        const projectClaude = join(harness.project, '.claude', 'skills', SKILL_NAME)
        const projectShared = join(harness.project, '.agents', 'skills', SKILL_NAME)

        expect(lstatSync(projectClaude).isSymbolicLink()).toBe(false)
        expect(markerAt(projectClaude).mode).toBe('copy')
        expect(existsSync(join(projectShared, 'SKILL.md'))).toBe(true)
    })

    it('writes the project shared root only when a client asks for it', () => {
        run([ 'install', '--client', 'claude', '--scope', 'project' ])

        expect(existsSync(join(harness.project, '.claude', 'skills', SKILL_NAME))).toBe(true)
        expect(existsSync(join(harness.project, '.agents', 'skills', SKILL_NAME))).toBe(false)
    })
})

describe('--dry-run', () => {
    it('writes nothing at all, including markers', () => {
        expect(run([ 'install', '--dry-run' ])).toBe(0)

        expect(out).toContain('Dry run')
        expect(existsSync(sharedDir())).toBe(false)
        expect(existsSync(join(harness.home, '.claude', 'skills'))).toBe(false)
    })

    it('prints the diff it would apply without touching the tree', () => {
        run([ 'install' ])
        writeFileSync(join(sharedDir(), 'SKILL.md'), 'hand-edited\n', 'utf8')

        expect(run([ 'install', '--dry-run', '--force' ])).toBe(0)

        expect(out).toContain('~ SKILL.md')
        expect(out).toContain('- hand-edited')
        expect(readFileSync(join(sharedDir(), 'SKILL.md'), 'utf8')).toBe('hand-edited\n')
    })
})

describe('client selection', () => {
    it('fails on an unknown id and lists the valid ones', () => {
        expect(run([ 'install', '--client', 'nope' ])).toBe(1)

        expect(err).toContain('Unknown client: nope')
        for (const id of [ 'claude', 'opencode', 'codex', 'cursor', 'copilot' ]) {
            expect(err).toContain(id)
        }

        expect(existsSync(sharedDir())).toBe(false)
    })

    it('behaves as --all for a bare install', () => {
        run([ 'install' ])

        const detected = out.includes('~/.claude/skills')
        expect(detected).toBe(true)
        expect(existsSync(claudeDir())).toBe(true)
    })

    it('fails a bare install when no client is detected, and points at --path', () => {
        rmSync(join(harness.home, '.claude'), { force: true, recursive: true })
        rmSync(join(harness.home, '.codex'), { force: true, recursive: true })

        expect(run([ 'install' ])).toBe(1)

        expect(err).toContain('No supported agent client was detected')
        expect(err).toContain('--path')
        expect(err).toContain('claude, opencode, codex, cursor, copilot')
    })

    it('installs outside the manifest with --path', () => {
        const elsewhere = join(harness.project, 'vendor', 'agent-skills')

        expect(run([ 'install', '--path', elsewhere ])).toBe(0)

        expect(existsSync(join(elsewhere, SKILL_NAME, 'SKILL.md'))).toBe(true)
        expect(markerAt(join(elsewhere, SKILL_NAME)).mode).toBe('copy')
    })
})

describe('refusing to clobber', () => {
    it('refuses a real directory sitting where a link belongs', () => {
        const foreign = join(harness.home, '.claude', 'skills', SKILL_NAME)
        mkdirSync(foreign, { recursive: true })
        writeFileSync(join(foreign, 'SKILL.md'), 'mine\n', 'utf8')

        expect(run([ 'install' ])).toBe(1)

        expect(err).toContain('is not a link this installer created')
        expect(err).toContain('--force')
        expect(readFileSync(join(foreign, 'SKILL.md'), 'utf8')).toBe('mine\n')
    })

    it('refuses a shared copy carrying no marker', () => {
        const foreign = join(harness.home, '.agents', 'skills', SKILL_NAME)
        mkdirSync(foreign, { recursive: true })
        writeFileSync(join(foreign, 'SKILL.md'), 'mine\n', 'utf8')

        expect(run([ 'install', '--client', 'codex' ])).toBe(1)

        expect(err).toContain('was not installed by refero-design-skill')
        expect(err).toContain('--force')
        expect(readFileSync(join(foreign, 'SKILL.md'), 'utf8')).toBe('mine\n')
    })

    it('refreshes in place, keeping the directory inode stable', () => {
        // An agent watching the skills path drops the skill when the directory
        // vanishes and is recreated, and does not always pick it back up. That
        // was observed on a live session after a --force refresh, so the refresh
        // path must overwrite rather than delete-then-copy.
        run([ 'install', '--client', 'codex' ])
        const before = statSync(sharedDir())

        writeFileSync(join(sharedDir(), 'SKILL.md'), 'hand-edited\n', 'utf8')
        writeFileSync(join(sharedDir(), 'stale.md'), 'gone next run\n', 'utf8')

        expect(run([ 'install', '--client', 'codex', '--force' ])).toBe(0)

        expect(statSync(sharedDir()).ino).toBe(before.ino)
        expect(existsSync(join(sharedDir(), 'stale.md'))).toBe(false)
        expect(readFileSync(join(sharedDir(), 'SKILL.md'), 'utf8')).not.toBe('hand-edited\n')
    })

    it('replaces a marker-less copy with --force, after printing the diff', () => {
        // Regression: the refusal above tells the user to pass --force, so that
        // has to work. It did not — the refusal threw whatever the flags said,
        // which left no way out of the state the error described.
        const foreign = sharedDir()
        mkdirSync(foreign, { recursive: true })
        writeFileSync(join(foreign, 'SKILL.md'), 'mine\n', 'utf8')
        writeFileSync(join(foreign, 'not-in-the-skill.txt'), 'gone\n', 'utf8')

        expect(run([ 'install', '--client', 'codex', '--force' ])).toBe(0)

        expect(out).toContain('~ SKILL.md')
        expect(out).toContain('- not-in-the-skill.txt')
        expect(markerAt(foreign).skill).toBe(SKILL_NAME)
        expect(readFileSync(join(foreign, 'SKILL.md'), 'utf8')).not.toBe('mine\n')
        expect(existsSync(join(foreign, 'not-in-the-skill.txt'))).toBe(false)
    })

    it('writes nothing when a marker-less copy is replaced with --force --dry-run', () => {
        const foreign = sharedDir()
        mkdirSync(foreign, { recursive: true })
        writeFileSync(join(foreign, 'SKILL.md'), 'mine\n', 'utf8')

        expect(run([ 'install', '--client', 'codex', '--force', '--dry-run' ])).toBe(0)

        expect(out).toContain('~ SKILL.md')
        expect(readFileSync(join(foreign, 'SKILL.md'), 'utf8')).toBe('mine\n')
        expect(existsSync(join(foreign, '.refero-design-mcp.json'))).toBe(false)
    })

    it('replaces a local edit with --force, after printing the diff', () => {
        run([ 'install', '--client', 'codex' ])
        writeFileSync(join(sharedDir(), 'SKILL.md'), 'hand-edited\n', 'utf8')

        expect(run([ 'install', '--client', 'codex', '--force' ])).toBe(0)

        expect(out).toContain('~ SKILL.md')
        expect(out).toContain('- hand-edited')
        expect(out).toContain('+ ---')
        expect(readFileSync(join(sharedDir(), 'SKILL.md'), 'utf8')).not.toBe('hand-edited\n')
    })

    it('refuses a link pointing somewhere else, and replaces it with --force', () => {
        const elsewhere = join(harness.project, 'other-skill')
        mkdirSync(elsewhere, { recursive: true })

        const claudeSkills = join(harness.home, '.claude', 'skills')
        mkdirSync(claudeSkills, { recursive: true })
        symlinkSync(elsewhere, claudeDir())

        expect(run([ 'install', '--client', 'claude' ])).toBe(1)
        expect(err).toContain('pointing somewhere else')

        expect(run([ 'install', '--client', 'claude', '--force' ])).toBe(0)
        expect(pointsAtForTest(claudeDir(), sharedDir())).toBe(true)
        expect(existsSync(elsewhere)).toBe(true)
    })

    it('writes through a symlinked skills directory instead of replacing it', () => {
        // The shape that motivates rule 3: the whole skills directory is a link
        // into a sync folder, and rm + mkdir would detach it.
        const real = join(harness.project, 'synced-skills')
        const claudeSkills = join(harness.home, '.claude', 'skills')
        mkdirSync(real, { recursive: true })
        symlinkSync(real, claudeSkills)

        expect(run([ 'install' ])).toBe(0)

        expect(lstatSync(claudeSkills).isSymbolicLink()).toBe(true)
        expect(existsSync(join(real, SKILL_NAME, 'SKILL.md'))).toBe(true)
        expect(pointsAtForTest(join(real, SKILL_NAME), sharedDir())).toBe(true)
    })
})

describe('windows', () => {
    it('creates a junction rather than a directory symlink', () => {
        harness.deps.env = { ...harness.deps.env, platform: 'win32' }

        expect(run([ 'install', '--client', 'claude' ])).toBe(0)

        expect(existsSync(claudeDir())).toBe(true)
        // A junction is a reparse point, so readlink reports a drive-absolute
        // target rather than a relative one; on Linux the type is the observable.
        expect(typeof readlinkSync(claudeDir())).toBe('string')
        expect(realpathSync(claudeDir())).toBe(realpathSync(sharedDir()))
    })
})

describe('uninstall', () => {
    it('removes only what the marker describes', () => {
        run([ 'install' ])
        const sibling = join(harness.home, '.claude', 'skills', 'refero-design')
        mkdirSync(sibling, { recursive: true })

        expect(run([ 'uninstall' ])).toBe(0)

        expect(existsSync(sharedDir())).toBe(false)
        expect(existsSync(claudeDir())).toBe(false)
        expect(existsSync(sibling)).toBe(true)
    })

    it('refuses to delete a copy that carries no marker', () => {
        const foreign = join(harness.home, '.agents', 'skills', SKILL_NAME)
        mkdirSync(foreign, { recursive: true })
        writeFileSync(join(foreign, 'SKILL.md'), 'mine\n', 'utf8')

        expect(run([ 'uninstall', '--client', 'codex' ])).toBe(1)

        expect(err).toContain('was not installed by refero-design-skill')
        expect(existsSync(foreign)).toBe(true)
    })

    it('refuses to delete a path that has stopped being a link', () => {
        run([ 'install', '--client', 'claude' ])
        rmSync(claudeDir(), { force: true })
        mkdirSync(claudeDir(), { recursive: true })

        expect(run([ 'uninstall', '--client', 'claude' ])).toBe(1)

        expect(err).toContain('no longer a link')
        expect(existsSync(claudeDir())).toBe(true)
    })

    it('removes a project copy through a symlinked skills directory', () => {
        const real = join(harness.project, 'synced')
        const projectShared = join(harness.project, '.agents', 'skills')
        mkdirSync(real, { recursive: true })
        mkdirSync(join(harness.project, '.agents'), { recursive: true })
        symlinkSync(real, projectShared)

        run([ 'install', '--client', 'codex', '--scope', 'project' ])
        expect(existsSync(join(real, SKILL_NAME, 'SKILL.md'))).toBe(true)

        expect(run([ 'uninstall', '--client', 'codex', '--scope', 'project' ])).toBe(0)

        expect(existsSync(join(real, SKILL_NAME))).toBe(false)
        expect(lstatSync(projectShared).isSymbolicLink()).toBe(true)
    })

    it('writes nothing under --dry-run', () => {
        run([ 'install' ])

        expect(run([ 'uninstall', '--dry-run' ])).toBe(0)

        expect(out).toContain('Dry run')
        expect(existsSync(sharedDir())).toBe(true)
        expect(lstatSync(claudeDir()).isSymbolicLink()).toBe(true)
    })
})

describe('list', () => {
    it('reports detected clients and what is installed where', () => {
        expect(run([ 'list' ])).toBe(0)

        expect(out).toContain(`${SKILL_NAME} ${SKILL_VERSION}`)
        expect(out).toContain('claude — Claude Code [verified] detected')
        expect(out).toContain('cursor — Cursor [verified] not detected')
        expect(out).toContain('not installed')
    })

    it('flags an outdated install', () => {
        run([ 'install' ])
        setSkillVersion('2.0.0')

        expect(run([ 'list' ])).toBe(0)
        expect(out).toContain(`${SKILL_VERSION} OUTDATED`)
    })

    it('writes nothing', () => {
        run([ 'install' ])
        const before = realpathSync(sharedDir())

        run([ 'list' ])

        expect(realpathSync(sharedDir())).toBe(before)
    })
})

describe('argument handling', () => {
    it('reports the skill version and names the release it comes from', () => {
        expect(run([ '--version' ])).toBe(0)
        expect(out).toContain(`${SKILL_NAME} — from refero-design-mcp ${SKILL_VERSION}`)
    })

    it('prints usage for help and for an unknown command', () => {
        expect(run([ 'help' ])).toBe(0)
        expect(out).toContain('refero-design-skill install')

        expect(run([ 'frobnicate' ])).toBe(1)
        expect(err).toContain('Unknown command: frobnicate')
    })

    it('rejects a scope that is not global or project', () => {
        expect(run([ 'install', '--scope', 'everywhere' ])).toBe(1)
        expect(err).toContain('--scope must be global or project')
    })

    it('rejects an option with a missing value', () => {
        expect(run([ 'install', '--client' ])).toBe(1)
        expect(err).toContain('--client needs a value')
    })

    it('accepts --client with commas and an inline value', () => {
        expect(run([ 'install', '--client=claude,codex', '--dry-run' ])).toBe(0)
        expect(out).toContain('~/.claude/skills')
        expect(out).toContain('~/.agents/skills')
    })
})
