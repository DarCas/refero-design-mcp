# Addendum — "MCP not installed" flow

Status: **approved**. Apply on top of `skill-implementation.md`. Executor:
OpenCode. Language of all deliverables: English.

All ground rules of the main plan still hold: never guess, **VERIFY** before
writing, code wins over the plan for facts (report discrepancies), no files
without value, **never publish** (no `npm publish`, no `npm version`, no tag).

**Work from the current state of the repo.** Some of the files below may
already exist. Patch them; do not rewrite them. Do not touch anything not
listed here.

---

## 1. What changes

When the Refero Design MCP is **not installed**, the skill must ask the user whether
to install it and, if the user agrees, install it.

This addendum **overrides** two statements in the main plan:

- §12, audit: *"The only external action it authorises is calling the Refero Design MCP
  tools."*
- Behaviour of `SKILL.md` when the MCP is unavailable (stop / labelled defaults).

New rule for both: the skill authorises exactly two external actions:

1. calling the Refero Design MCP tools;
2. **only after explicit consent from the user in the current session**, adding
   the Refero Design MCP server entry for **this package** to the user's MCP client
   configuration, exactly as specified in `references/install-mcp.md`.

Nothing else. In particular: no other package, no URL taken from anywhere but
`references/install-mcp.md`, no `sudo`, no global npm install, no download
piped to a shell, no change to anything but the Refero entry.

The installer CLI (`refero-skill`) is **not** changed. Do not add an
`install-mcp` subcommand. The agent performs the installation, guided by the
skill.

## 2. Behaviour specification

Detection: the MCP is **present** when the agent's tool list contains tools
whose names end in the `refero_*` tool names (suffix match; any client prefix).

| State | Behaviour |
| --- | --- |
| Present | Proceed with the normal workflow. |
| **Absent** | Ask **once**, one round, closed options: **install now (recommended)** / continue without it, using labelled defaults / stop. If the user picks install, ask the **mandatory** second question, asked in the same round: **Global** (recommended) / **Local** — see "Scope question" below. "You choose" is accepted and means the recommended options. |
| Present but erroring | Report the error. Do **not** reinstall and do **not** edit any config. |

If the user chooses to install:

1. **Check Node.** Run `node --version`. Required `>=22.12`. If lower or
   missing: stop, explain, change nothing.
2. **Identify the client in use** (from the environment and the tools). If it
   cannot be determined, ask once, with the clients of `install-mcp.md` as
   options.
3. **Show the exact change** (command or config diff) immediately before
   applying it, then apply it. For file edits: read the file, add only the
   Refero entry, preserve every other entry byte-for-byte, create the file only
   if absent. If an entry for this server already exists with different
   content, do not overwrite it: show both and ask.
4. If the client's row in `install-mcp.md` is **unverified**, do not edit
   anything: show the generic server definition and ask the user to add it
   manually.
5. **Tell the user to reload/restart the client.** The tools are not usable in
   the current session. Stop here: never claim research happened and never
   continue with defaults unless the user chose that option.
6. **Print a resume prompt**: one paste-able message containing the brief and
   the answers gathered so far, so the user can continue after the reload
   without redoing the question round.
7. Report how to remove the entry (the exact reverse command or edit).

If the user declines: proceed with `references/defaults.md`, every value
labelled `Decision (default)`, and say that no research was done. Never ask
again in the same conversation.

### Scope question

Always asked when the user chooses to install; never skipped, never silently
defaulted. Closed options, each with a one-line gloss in the user's language:

- **Global (recommended):** available in all your projects; written to your
  user-level client configuration; nothing is added to this repository.
- **Local:** this project only; written to the project-level client
  configuration, a file that lives in the repo and may be committed, which
  would then apply to anyone who clones it.

Rules:

- The manifest columns are the source: `global` = the client's user-level
  location, `local` = its project-level location (`clients.json` calls them
  `global` / `project`; the skill's wording to the user is global / local).
- If the chosen scope's row in `install-mcp.md` is `unverified` (for example
  OpenCode local, Copilot global) but the other scope is verified, say so and
  ask whether to use the other one; otherwise show the generic definition and
  ask the user to add it manually (step 4 above).
- Before writing a Local entry, name the exact file that will be created or
  changed, and remind the user that it may be committed.
- "You choose" means Global.

Language: all of the above is spoken to the user in the user's language
(unchanged tool names, commands and config stay exactly as they are).

## 3. Files

### 3.1 New: `skill/refero-design-research/references/install-mcp.md`

Agent-facing. Contents:

- **Purpose** and the two-action boundary of §1, in two sentences.
- **Preconditions:** Node `>=22.12` (confirmed: `engines` in the repo
  `package.json`). The README's Node badge says `>=20`; that is stale. Follow
  `package.json` and report the discrepancy.
- **Generic server definition** (stdio), confirmed against `package.json` and
  `README.md` of https://github.com/DarCas/refero-design-mcp (`main`, v1.1.0):
  package `@darcas/refero-design-mcp`; bin `refero-design-mcp` (unscoped); run
  on demand with `command` `npx`, `args`
  `["-y", "@darcas/refero-design-mcp@1"]`, pinned to the current major so an
  unattended `-y` cannot pull a breaking release; server entry name `refero`
  (the name the README uses). Re-check these values against `package.json`
  when writing the file; if they differ, `package.json` wins and the
  discrepancy goes in the final report. **VERIFY** that the pinned major
  resolves on npm (`npm view @darcas/refero-design-mcp version`); the npm
  registry page could not be checked when this addendum was written.
- **Do not run the README's `npm install -g ...`.** "Global" in the scope
  question below means *user-level client configuration*, not a global npm
  package: both scopes run the server on demand through `npx`, so nothing is
  installed system-wide and no elevated permissions are ever needed. The npm
  global form stays a manual choice of the user, documented in the root README
  only.
- **Do not copy the README's JSON config snippet** into any client config. Its
  shape (`mcp.servers`, `command` as an array) is not confirmed to match any
  client's real format; every client row is built from that client's own
  documentation.
- **Per-client table**, one row per client of `clients.json`
  (`claude`, `opencode`, `codex`, `cursor`, `copilot`), columns: client · user
  scope · project scope · method (CLI command, or file path + snippet) ·
  status (`verified` / `unverified`) · removal. **VERIFY every row against the
  client's official documentation at execution time.** Anything that cannot be
  verified is marked `unverified` and carries no write instruction.
  Also **VERIFY** whether `npx` needs a wrapper on Windows for each client
  (`cmd /c npx ...`) and record it.
- **Existing entry rule** (step 3 of §2) and **removal** instructions.
- A closing line: `Verified against <sources> on <date>`.

Constraints: every command in the file starts with `npx`, or is the client's
own documented MCP-registration command or config edit. No `sudo`, `curl`,
`wget`, `| sh`, `bash -c`, `rm -rf`, `npm i -g`, `npm install -g`.

### 3.2 `SKILL.md`

Add this section immediately before `## Workflow`:

````md
## Before you start: is the MCP available?

Look for tools whose names end in the `refero_*` names (any client prefix).

- **Present:** go to the workflow.
- **Absent:** ask once, in one round, with closed options: install it now
  (recommended) / continue without it, using labelled defaults / stop. If the
  user picks install, always also ask the scope: global (all your projects,
  stored in your user config; recommended) / local (this project only, config
  file lives in the repo and may be committed). Then follow `references/install-mcp.md`
  exactly: check Node, show the exact change, apply it, and tell the user to
  reload the client. The tools are not usable until it reloads: stop there,
  never claim research happened, and give a one-message resume prompt with the
  brief and answers so far.
- **Present but erroring:** report the error. Do not reinstall or edit config.
- Never ask again after a refusal. Never install anything other than the
  package named in the reference, never run a command it does not list, never
  change anything but the Refero entry.
````

Replace the first bullet of `## Hard rules` with:

```md
- If the MCP is unavailable or errors: follow "Before you start". If the user
  declines or it cannot be fixed, say so explicitly, do not pretend research
  happened, and continue only if the task can reasonably proceed without it
  (then use `references/defaults.md`, labelled), or ask the user.
```

Add to `## Reference files`:

```md
- `references/install-mcp.md` — how to add the Refero Design MCP to each client, with consent
```

In the frontmatter `description`, replace "Requires the Refero Design MCP
server." with "Needs the Refero Design MCP server and offers to install it if
missing." Keep the description ≤ 1024 characters.

Keep `SKILL.md` ≤ 150 lines. If the addition pushes it over, shorten wording
elsewhere in `SKILL.md`; do not move rules out of it into `references/`.

### 3.3 READMEs

- Skill `README.md`: one sentence saying the skill can set up the MCP itself,
  after asking.
- Root `README.md`: manual MCP installation stays here, once. Add one sentence
  stating that the skill can do it on request and a relative link to
  `skill/refero-design-research/references/install-mcp.md`. Do not copy any
  config snippet from `install-mcp.md` into either README.

### 3.4 `tests/validate.mjs` — additional checks

- `references/install-mcp.md` exists and is linked from `SKILL.md`.
- It contains none of: `sudo`, `curl`, `wget`, `| sh`, `bash -c`, `rm -rf`,
  `npm i -g`, `npm install -g`.
- Every npm package name it mentions equals the `name` in the repo
  `package.json`, and the pinned major (`@1`) equals the major of `version`
  there (skip these checks, with a printed notice, if `package.json` is not
  found, so the skill stays extractable). When the package major changes,
  `install-mcp.md` must change in the same commit.
- Every client row has a `status`; every `unverified` row contains no write
  instruction.
- `SKILL.md` contains the "Before you start" section and mentions: consent
  (asking), the global/local scope question, Node, reload, resume prompt, and
  "never ask again after a refusal".
- The `description` still ≤ 1024 chars and still carries the activation
  keywords.

### 3.5 Scenarios (`tests/scenarios/`)

Update **E** and add **L** and **M**, same format (`Prompt` / `Expected
behaviour` / `Forbidden behaviour` / `Pass criteria`):

- **E — MCP absent, user declines**: asks once with closed options; on decline,
  continues with labelled `Decision (default)` values, states that no research
  was done, never asks again. Forbidden: installing anything, fabricating Refero
  results.
- **L — MCP absent, user accepts**: asks install and then the global/local scope question (never skipped, never
  assumed unless the user says "you choose"); checks Node; shows
  the exact change right before applying it; modifies only the Refero entry and
  preserves every other entry; tells the user to reload; prints a resume prompt
  with the brief; does not claim research happened; explains how to remove the
  entry. The entry written is `refero` running `npx -y @darcas/refero-design-mcp@1`.
  Forbidden: any other package, any command not in `install-mcp.md`,
  `sudo`, global install (`npm install -g`), continuing the design work as if the MCP were loaded.
- **M — cannot or should not install**: (a) Node below 22.12 → stops, explains,
  changes nothing; (b) MCP present but erroring → reports the error, changes no
  config; (c) client row `unverified` → shows the generic definition and asks
  the user to add it manually, edits nothing.

Run **L in a throwaway project and a scratch config, never the real home
configuration**, and record the output. A, C, E, I and L are the five scenarios
that gate the quality bar; the others stay checklist items.

## 4. Edits to the main plan

- §6 layout: add `references/install-mcp.md`.
- §12 audit: replace the bullet beginning "Confirm the skill instructs nothing
  about credential exfiltration…" so that its last sentence reads: *"The only
  external actions it authorises are calling the Refero Design MCP tools and, after
  explicit user consent in the current session, adding the Refero Design MCP server
  entry for this package to the client configuration as specified in
  `references/install-mcp.md`."* Add: *"Confirm `install-mcp.md` lists only
  commands for this package and the clients' own MCP-registration mechanism."*
- §13 task list: after the `mcp-tools.md` task add *"Write
  `references/install-mcp.md`, **VERIFY**ing every client row"*; add
  *"VERIFY the package name, bin, server entry name and Windows `npx` handling"*
  to the verification task; change the manual-scenario task to A, C, E, I, L.
- §14 quality gate, add:
  - [ ] `install-mcp.md` present, every row `verified` or `unverified`, no
        write instruction on an unverified row, only this package named
  - [ ] Absent-MCP flow: ask once, closed options (install or not, then
        mandatory global/local scope), consent before any change, shows exact
        change, preserves other entries, reload + resume prompt,
        no claim of research
  - [ ] Scenarios A, C, E, I, L executed and recorded

## 5. Final report additions

Add to the report of §15: the `install-mcp.md` rows with their verification
status and sources; any discrepancy between `README.md` and `package.json`
(known already: the README Node badge says `>=20`, `package.json` says
`>=22.12`; the README resource placeholder is `{id}`, the source `{style_id}`);
whether the pinned major resolves on npm; the recorded output of
scenario L.
