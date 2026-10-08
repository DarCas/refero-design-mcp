# refero-design-research

An Agent Skill that teaches coding agents to do **evidence-based design
research** before implementing substantial UI, using the
[Refero Design MCP](https://github.com/DarCas/refero-design-mcp).

> The underlying data belongs to Refero Design. This skill is an unofficial
> client; no affiliation or endorsement is implied.

## Who it is for

**Backend developers who can read a token file but cannot answer "what mood do
you want?"** They know their product, their users and their constraints, and
they can choose between concrete options — but they have no design vocabulary
and no taste to lean on.

The skill is shaped around that. It asks a small round of closed questions
instead of guessing, converges on one recommended direction, fills evidence
gaps with fixed rules instead of taste, and hands back a paste-ready token
block before any prose.

An example prompt you can copy:

> Build the landing page for my API product. Use the refero-design-research skill.

## What it produces

A written design direction in the shape of
`references/design-output.md`: a token block in your project's own format first,
then colour, typography, spacing, layout, surfaces, components, interaction,
accessibility and do/don't.

Every numeric value carries one of three labels — **Observed** (the MCP
returned it, with the source style and id), **Decision** (chosen, with a
reason), or **Decision (default)** (from `references/defaults.md`, because
there was no evidence). That separation is the point: it makes the document
auditable, and it stops a plausible-looking value from passing as evidence.

## Layout

```
skill/refero-design-research/
├── SKILL.md                     the protocol — what to call, in what order
├── README.md                    this file
├── clients.json                 installer manifest (target directories)
├── references/
│   ├── mcp-tools.md             generated from the MCP source
│   ├── install-mcp.md           adding the MCP to each client, with consent
│   ├── research-workflow.md     queries, comparison, the question bank
│   ├── design-output.md         the output shape and the `design.md` skeleton
│   ├── defaults.md              fallback rules when evidence is missing
│   └── donation.md              the closing donation line, and its bounds
├── examples/
│   └── design-direction.example.md   worked output, fully synthetic
└── tests/
    ├── validate.mjs             static checks, offline, no dependencies
    └── scenarios/               behavioural checklist (A–M)
```

`SKILL.md` is the only file an agent loads automatically. The rest are read on
demand.

## Validation

```bash
node skill/refero-design-research/tests/validate.mjs
```

Offline, no dependencies, non-zero exit on failure. It checks the frontmatter
against the Agent Skills specification, that every internal link resolves, that
every `refero_*` tool named in the skill exists in `references/mcp-tools.md`,
that the client manifest is well formed, and that nothing credential-shaped has
been committed.

`tests/scenarios/` holds behavioural scenarios to run by hand against a real
agent session. They are documented as manual because the thing they test is
agent behaviour, not code.

## Requirements

- **Node >= 22.12** for the MCP server (`engines.node`), enforced by npm.
- The **Refero Design MCP** must be available to the agent. If it is not, this
  skill asks once whether to install it and, on agreement, sets it up itself —
  see [install-mcp.md](references/install-mcp.md).

Installation is documented **once**, in the repository README — see
[Installation](https://github.com/DarCas/refero-design-mcp#installation).

## Relationship to the `refero-design` skill

`refero-design` owns methodology, craft and anti-slop review. This one owns the
extraction protocol. They are disjoint and complementary: use `refero-design`
for how to design well, and this skill for pulling real measured evidence out of
the catalogue before you do.

## Licence

MIT, the same as the package. See [LICENSE](https://github.com/DarCas/refero-design-mcp/blob/main/LICENSE).
