/*
 * Dario Casertano <dario@casertano.name>
 * Copyright (c) 2026 Casertano Dario – All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * The skill's own validator, executed as a test.
 *
 * It ships inside the npm tarball and it is the gate the plan puts on the skill,
 * so a mistake in it is a mistake in the deliverable. Nothing else runs it:
 * `npm run verify` compiles and tests `test/`, and `skill/` is outside that, so
 * a plain syntax error in the validator reaches a commit unnoticed. Two did.
 *
 * The second suite runs the validator against a copy extracted with no
 * repository around it, which is the state a user gets after
 * `npm install -g && refero-design-skill install`. Repo-dependent checks have to
 * skip there instead of failing: an `.opencode/` directory next to the installed
 * copy has a `package.json` of its own, so "a manifest exists" is not the same
 * as "this is our repository".
 */

import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const root = new URL('..', import.meta.url).pathname
const skillDir = join(root, 'skill', 'refero-design-research')

/** Runs the validator and returns its exit status with both streams captured. */
function validate(dir: string): { status: number | null, out: string, err: string } {
    const result = spawnSync(process.execPath, [join(dir, 'tests', 'validate.mjs')], {
        encoding: 'utf8',
    })

    return { status: result.status, out: result.stdout ?? '', err: result.stderr ?? '' }
}

let extracted = ''

beforeAll(() => {
    extracted = join(mkdtempSync(join(tmpdir(), 'refero-skill-extract-')), 'refero-design-research')
    cpSync(skillDir, extracted, { recursive: true })
})

afterAll(() => {
    rmSync(extracted, { force: true, recursive: true })
})

describe('the skill validator', () => {
    it('passes with the repository around it', () => {
        const { status, out, err } = validate(skillDir)

        expect(err, err).toBe('')
        expect(status, out + err).toBe(0)
        // No skip either: inside the repo every check has something real to
        // compare against, so a silent skip here would be its own regression.
        expect(out).not.toMatch(/^skip {2}/m)
        expect(out).toMatch(/\d+ passed, 0 failed/)
    })

    it('passes when extracted with no repository, skipping what it cannot check', () => {
        const { status, out, err } = validate(extracted)

        expect(err, err).toBe('')
        expect(status, out + err).toBe(0)
        expect(out).toMatch(/\d+ passed, 0 failed/)

        // The point of the exercise: it has to decline rather than guess. Without
        // this the suite would also pass on a validator that checked nothing.
        expect(out, 'expected the repo-dependent checks to skip').toMatch(/^skip {2}/m)
        expect(out).toMatch(/^skip {2}donation\.md points at the same link/m)
    })
})
