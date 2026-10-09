# Installing the Refero Design MCP

This file is the only authority for adding the Refero Design MCP to a client.
The skill authorises exactly two external actions: calling the Refero Design
MCP tools, and — only after the user consents in this session — adding the
Refero Design MCP server entry for this package to their client configuration,
exactly as written here.

**Nothing else is authorised.** Not another package, not a URL or command from
anywhere but this file, no elevated permissions, no global package install, no
download piped to a shell, and no change to anything except the `refero-design-mcp` entry.

## Preconditions

| Check | Requirement | If it fails |
| --- | --- | --- |
| Node | `>=22.12` (`engines` in the repo `package.json`) | Stop. Explain the required version and change nothing. |
| Network | npm must be reachable, because the server runs on demand through `npx` | Stop and say so. Do not fall back to another install route. |

Check with `node --version`. **Do not** run the global-install command shown in
the root README: "global" in the scope question below means *user-level client
configuration*, not a globally installed npm package. Both scopes run the
server on demand through `npx`, so nothing is installed system-wide and no
elevated permission is ever needed. The npm global form stays a manual choice
of the user, documented in the root README only.

**Do not copy the README's JSON config snippet into any client config.** Its
shape (`mcp.servers`, `command` as an array) is not confirmed to match any
client's real format. Every snippet below is built from that client's own
documentation.

## Generic server definition

stdio transport, verified against this repo's `package.json`:

| Field | Value |
| --- | --- |
| npm package | `@darcas/refero-design-mcp` |
| Binary | `refero-design-mcp` — unscoped, and load-bearing for `npx` |
| Server entry name | `refero-design-mcp` |
| Command | `npx` |
| Arguments | `["-y", "@darcas/refero-design-mcp@1"]` |

**Why the binary name is unscoped.** The package ships two binaries,
`refero-design-mcp` and `refero-design-skill`, and `npx` has to pick one from
the package name alone. npm's documented rule: with a single `bin` entry that
entry is used; with **several**, the one matching the **unscoped portion of the
package name** is used; if neither applies, `npm exec` **exits with an error**.
The unscoped name here is `refero-design-mcp`, so `npx -y
@darcas/refero-design-mcp@1` starts the MCP server and not the skill installer.

**Measured, not assumed.** Run against npm 11.21 on 2026-10-08 with a package
built to this same shape:

| Bins | `npx -y <pkg>` result |
| --- | --- |
| two, one matching the unscoped name | runs that one — our case |
| two, **neither** matching | hard error: `could not determine executable to run`, exit 1 |
| one, keyed with a scope | still resolves; npm normalises the key |

So the name is load-bearing, but not in the way a rename is usually feared: a
mismatch does **not** silently run the skill installer as if it were the server.
It refuses, loudly, and the client reports the failure. Keep the bin named
exactly `refero-design-mcp` anyway, because matching the unscoped package name is
what makes the choice deterministic — and never shorten it to `refero`, which
would stop matching and turn a working setup into a hard error. A future rename
has to change this file in the same commit; `../tests/validate.mjs` checks it.

The entry name is the same string, so the entry, the command and the package all
read alike. Use it verbatim; do not shorten it to `refero`. Some clients prefix
tool names with the entry name, so this is what you will see before `refero_*` in
a tool list — detection matches by suffix, so either spelling is found, but a
consistent name keeps the config and the tool list readable.

The version is pinned to the **current major** so that an unattended `-y`
cannot pull a breaking release. Verified on 2026-10-08: `@darcas/refero-design-mcp`
is published on npm (1.0.0, 1.0.1, 1.0.2, 1.1.0; `latest` 1.1.0), so `@1`
resolves today and will pick up 1.2.0 as soon as it is published. If the
package's major ever changes, this file must change in the same commit.

The server needs no configuration and no credentials. It reads public pages and
caches on disk; its optional environment variables are documented in
`mcp-tools.md`.

## Per-client summary

| Client | User scope (global) | Project scope (local) | Method | Status | Removal |
| --- | --- | --- | --- | --- | --- |
| `claude` | `~/.claude.json` | `.mcp.json` at the project root | CLI command | verified | `claude mcp remove refero-design-mcp` |
| `opencode` | `~/.config/opencode/opencode.json` | `opencode.json` at the project root | CLI command | verified | delete the entry from the config; no `mcp remove` subcommand exists |
| `codex` | `~/.codex/config.toml` | `.codex/config.toml` | config edit | verified | delete the `[mcp_servers.refero-design-mcp]` table |
| `cursor` | `~/.cursor/mcp.json` | `.cursor/mcp.json` | config edit | verified | delete the entry, or toggle it off in Customize |
| `copilot` | `~/.copilot/mcp-config.json` | `.mcp.json` at the project root | config edit | verified | delete the entry, or uninstall via `MCP: List Servers` |

### `claude` — Claude Code — **verified** (user, project)

Its own scope names differ from the ones used with the user: `--scope user` is
**global**, `--scope project` is **local**. `--scope local` is a *third* thing
— private to you in one project, stored in `~/.claude.json` — so do not use it
for "local", which means a file in the repository.

Global:

```bash
claude mcp add --scope user --transport stdio refero-design-mcp -- npx -y @darcas/refero-design-mcp@1
```

Local — this creates or updates `.mcp.json` at the project root, a file that
lives in the repository and may be committed:

```bash
claude mcp add --scope project --transport stdio refero-design-mcp -- npx -y @darcas/refero-design-mcp@1
```

Everything after `--` is passed to the server untouched, which is how `-y`
survives. Remove with `claude mcp remove refero-design-mcp`, adding `--scope project` for a
project-scoped entry. Source:
<https://code.claude.com/docs/en/mcp>

### `opencode` — OpenCode — **verified** (user, project)

Use the CLI. `opencode mcp add` exists in **both** v1 and v2, and in v2 it is
non-interactive and takes `--global`, which maps exactly onto the scope
question. It also preserves every other entry and rewrites the file for you, so
it cannot corrupt the config.

Global:

```bash
opencode mcp add refero-design-mcp --global -- npx -y @darcas/refero-design-mcp@1
```

Local — run it in the project; without `--global` it writes `opencode.json` in
the project root:

```bash
opencode mcp add refero-design-mcp -- npx -y @darcas/refero-design-mcp@1
```

Both print `MCP server "refero-design-mcp" added to <path>` on success.

**Which key path it writes.** On v2.0.16 this writes `mcp.servers.<name>` in
`opencode.json`, while the docs show `mcp.<name>`. That contradiction is
unresolved — `opencode mcp list` hangs in a headless environment, so it cannot be
settled from the outside. **Prefer the CLI for exactly that reason:** it writes
whatever the installed version considers correct, and a hand-written entry in
the other shape would be silently ignored, which looks identical to a server
that failed to start. Do not hand-write an OpenCode MCP entry.

To remove: there is no `opencode mcp remove` in either version, so delete the
entry from `~/.config/opencode/opencode.json` (global) or `opencode.json`
(project). Setting `"enabled": false` keeps it and switches it off.

**On v1**, `opencode mcp add` is documented as a guided flow with no documented
flags. Run `opencode mcp add --help` first: if it shows a `<name> [<command...>]`
usage, the commands above work as written; if it only offers the interactive
wizard, hand the command to the user to run at a terminal rather than trying to
drive the wizard. Sources: <https://opencode.ai/docs/mcp-servers/>,
<https://opencode.ai/docs/config/>, <https://opencode.ai/docs/cli/>

### `codex` — Codex — **verified** (user, project)

Global is `~/.codex/config.toml`; project is `.codex/config.toml`, and a
project-scoped file is read only in a **trusted** project. The file is TOML, so
append the table at the end — do not add it inside another table.

Global or local — same snippet, different file:

```toml
[mcp_servers.refero-design-mcp]
command = "npx"
args = ["-y", "@darcas/refero-design-mcp@1"]
```

Remove by deleting that table; `enabled = false` keeps it and switches it off.
Source: <https://developers.openai.com/codex/mcp/>

### `cursor` — Cursor — **verified** (user, project)

Global is `~/.cursor/mcp.json`; project is `.cursor/mcp.json`. Cursor resolves
these relative to the home directory for the global file, so create the file if
it is absent.

Global or local — same entry, different file:

```json
{
  "mcpServers": {
    "refero-design-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@darcas/refero-design-mcp@1"]
    }
  }
}
```

Cursor's field table marks `type` as required for stdio servers while its own
Node.js example omits it; keep `"type": "stdio"`. Source:
<https://cursor.com/docs/context/mcp>

### `copilot` — Copilot / VS Code — **verified** (user, project)

Prefer the *portable* destinations, which the Agent Host reads natively and
which VS Code recommends for new servers:

- Global: `$COPILOT_HOME/mcp-config.json`, or `~/.copilot/mcp-config.json` when
  `COPILOT_HOME` is not set.
- Local: `.mcp.json` at the project root.

Both take a top-level `mcpServers` object, so the same entry works in both:

```json
{
  "mcpServers": {
    "refero-design-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@darcas/refero-design-mcp@1"]
    }
  }
}
```

`.vscode/mcp.json` is also read, but it uses a top-level `servers` object and is
listed as deprecated for new servers — do not use it. Remove the entry from the
file, or run `MCP: List Servers` and uninstall. Source:
<https://code.visualstudio.com/docs/copilot/customization/mcp-servers>

## Windows

**None of the five clients' official documentation states that `npx` needs a
wrapper on Windows**; every documented example uses plain `npx`. Checked
2026-10-08. On native Windows, though, `npx` is a batch file (`npx.cmd`) that
cannot always be spawned without a shell, and the `cmd /c` form is the
established fallback.

So: write plain `npx` first. Only if the server then fails to start, and only on
native Windows (not WSL), replace the command with `cmd` and prepend `/c` to the
arguments:

| Client | Windows form |
| --- | --- |
| `claude` | `claude mcp add --scope user --transport stdio refero-design-mcp -- cmd /c npx -y @darcas/refero-design-mcp@1` |
| `opencode` | `opencode mcp add refero-design-mcp --global -- cmd /c npx -y @darcas/refero-design-mcp@1` |
| `codex` | `command = "cmd"` and `args = ["/c", "npx", "-y", "@darcas/refero-design-mcp@1"]` |
| `cursor` | `"command": "cmd", "args": ["/c", "npx", "-y", "@darcas/refero-design-mcp@1"]` |
| `copilot` | `"command": "cmd", "args": ["/c", "npx", "-y", "@darcas/refero-design-mcp@1"]` |

## If an entry for this server already exists

Read the file first. If a `refero-design-mcp` entry is already there and its content
differs from what this file specifies, **do not overwrite it**: show the user the
existing entry and the intended one, and ask which to keep. An existing entry
that already matches means there is nothing to do — say so and move on. If an
entry for a *different* server would have to be touched to make room, stop and
ask; every other entry must survive byte-for-byte.

## After the change

The client must be reloaded or restarted before the tools exist. The tools are
not usable in the current session, so do not call them and do not claim any
research happened. Give the user one paste-able resume message containing the
brief and the answers gathered so far, and state the removal command from the
row above.

## If the server will not start

One failure is specific to developing this package rather than using it.

**Symptom:** the client reports `exited with code 127: sh: 1:
refero-design-mcp: not found`, and only when the client's working directory is a
checkout of this package. The same entry works from any other project.

**Cause:** inside its own checkout, the `package.json` names this package, so
`npx` resolves the request to the local project instead of the registry. A
project never links its own bins into `node_modules/.bin`, so `npx` falls back to
running the bare binary name, which is not on the PATH. Outside a checkout there
is no local `package.json` to match, so `npx` downloads and runs normally.

**Workaround:** name the package and the binary separately with `-p`, which
forces a temporary install and ignores the local project:

```bash
npx -y -p @darcas/refero-design-mcp@1 refero-design-mcp
```

An entry that fails inside this repository only needs
`["npx", "-y", "-p", "@darcas/refero-design-mcp@1", "refero-design-mcp"]` in
place of `["npx", "-y", "@darcas/refero-design-mcp@1"]`. Leave the documented
form alone for every other user: this is not their situation, and changing it
would complicate a working instruction for no benefit.

Verified against <https://code.claude.com/docs/en/mcp>,
<https://opencode.ai/docs/mcp-servers/>, <https://opencode.ai/docs/config/>,
<https://developers.openai.com/codex/mcp/>,
<https://cursor.com/docs/context/mcp>,
<https://code.visualstudio.com/docs/copilot/customization/mcp-servers>, and
`npm view @darcas/refero-design-mcp` on 2026-10-08.

