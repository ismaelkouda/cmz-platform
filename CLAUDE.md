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

# AI & LLM Execution Guidelines — Big Tech Standards

> 🤖 **IMPORTANT FOR ALL LLM AGENTS**: Always read
> [`LLM_CONTEXT.md`](./LLM_CONTEXT.md) at the beginning of your session.

### Core Mindset & Execution Principles:

1. **Architect Posture**: Do not act as a naive ticket-doer. Understand the
   system end-to-end (SEOS paradigm, MDE + LLM Generate-Verify-Repair loop, Nx
   package-based invariants).
2. **Deterministic Contract Compliance**: The source of truth for business logic
   is `$SEOS_LEGACY_ROOT` (required env var; no machine-path fallback). Never
   guess DTO shapes, endpoints, or field names.
3. **Multi-Level Verification Oracle**: Every module implementation must
   strictly pass the verification oracle:
    - `bunx nx run-many -t build` (or `tsc --noEmit`)
    - `bunx eslint --max-warnings=0`
    - `ngc --strictTemplates` (Zero template errors)
4. **Nx Layer Isolation Invariants**:
    - `@cmz/<module>-domain`: 0 framework/data/ui imports.
    - `@cmz/<module>-data`: depends only on domain, core, shared-data.
    - `@cmz/<module>-application`: depends only on domain, shared-application.
    - `@cmz/<module>-ui`: depends only on application, domain, shared-ui.
    - 0 cross-domain imports between functional modules.
