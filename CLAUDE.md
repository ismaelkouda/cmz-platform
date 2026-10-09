<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill
  first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer
  running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`)
  instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g.,
  `bunx nx build`, `bunx nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not
  all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS
  invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin
  configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard
  commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call
  nx_docs just to look up generator syntax

<!-- nx configuration end-->

---

# cmz-platform — entrée Claude Code

@AGENTS.md @PROJECT_AUTHORITY.md

`AGENTS.md` fixe les règles opérationnelles et impose les autres lectures du
modèle d'agents. `PROJECT_AUTHORITY.md` fixe le cap produit courant. Ces deux
fichiers priment sur les journaux, audits et mémoires historiques.

Avant toute action, choisir exactement un rôle parmi les quatre skills projet
exposées sous `.claude/skills/`. Ces entrées Claude importent les skills
canoniques de `.agents/skills/` ; elles ne créent ni permissions ni règles
concurrentes.

Ne pas utiliser un journal, un audit, une décision supersédée ou un corpus
historique comme point de départ du cap courant. Ne jamais inventer un
comportement métier, un endpoint, une permission ou une preuve absente.
