# Generator Platform — canonical IR seed

This directory implements the first evidence-gated vertical slice defined by
ADR-0029, ADR-0030, and ADR-0031. It is deliberately outside any Nx target
profile: these files define the portable contract that source adapters produce
and target adapters consume.

PLAT-2 adds two independent, fail-closed ingestion paths:

- `adapters/structured-spec-adapter.mjs` consumes the versioned JSON source in
  `sources/action-request.spec.json`;
- `adapters/legacy-typescript-adapter.mjs` uses the declared TypeScript compiler
  API to inspect interfaces, validation branches, HTTP calls, endpoint
  constants, public-access context, and the session-persistence effect in the
  real legacy source files.

Both adapters emit the same strictly validated normalized observation. The
target-neutral builder combines that observation with the explicit human policy
in `policies/action-request.policy.json`. Non-deductible descriptions, command
classification, and opaque-type boundaries therefore remain decisions—not facts
falsely attributed to source extraction.

PLAT-3 adds two deterministic target profiles and renderers:

- `renderers/angular-nx-renderer.mjs` emits an Nx library descriptor, Angular
  injectable HTTP/command services, session persistence, models, and validation;
- `renderers/react-typescript-renderer.mjs` emits a Fetch-based client and
  ReactJS command hooks. ReactJS APIs cross an explicit `ReactHooksPort`, so
  generated code remains independent from a particular host wiring. React and
  ReactDOM exist only as root development dependencies for the native ReactJS
  target gate; they are not production dependencies of the Angular app or its
  libraries.

Every run type-checks both generated trees with the TypeScript compiler API.
Persisted manifests content-address the canonical IR, the complete target
profile, each generated file, and the ordered output tree. The generated files
are ephemeral verification products; manifests are the committed drift oracle.

The `action-request-runtime.test.mjs` suite then materializes both generated
trees in an isolated temporary package and executes their emitted modules. Its
shared oracle checks exact validation issues, HTTP method/path/body, public
access metadata, session-persistence ordering and transport/session failures.
Angular runs through its generated injectables and RxJS commands; ReactJS runs
through its generated Fetch client and hooks port. The scope and remaining
limits are recorded in
[`validation-runtime-action-request.md`](../../docs/architecture/validation-runtime-action-request.md).

PLAT-5 reuses that exact oracle against structurally valid constraint,
session-effect, and access/authentication mutants. Each mutant must change and
compile both target trees, then fail the relevant runtime invariant on both
stacks. This campaign also keeps access and integration authentication
consistent and makes session ports conditional on a session effect.

PLAT-4 adds a second, behaviorally contradictory reference composition,
`workflow-action`. The bounded source adapter reads the real `requests-details`
and list-export paths, fails closed if their permission, qualification, refresh,
transport, or asynchronous export signatures drift, and emits two separate
documents:

- source paths and SHA-256 provenance in an Evidence Model;
- states, permissions, branches, steps, and execution topologies in a
  source/target-neutral Behavior Model.

`angular-workflow-renderer.mjs` and `react-workflow-renderer.mjs` consume only
the Behavior Model. Both generated trees compile strictly and run the same
oracle for `take`, approve/reject qualification, export guards, empty/error
branches, and an awaited asynchronous `fetchRows`/file-write continuation. The
mutation suite removes or changes guards and causal waiting; every selected
mutant must be rejected on both targets. Scope and limits are recorded in
[`validation-runtime-workflow-action.md`](../../docs/architecture/validation-runtime-workflow-action.md).

The same canonical graph is independently produced by the versioned
`sources/requests-workflow.definition.json`. Its Evidence Model points only to
the JSON definition, while the code adapter keeps its own source hashes. Deep
equality is asserted only on the Behavior Models. This is adapter/source-format
independence, not independent business corroboration: the JSON definition
formalizes the already known reference behavior.

## Author a new action-request

`generate-action-request.mjs` turns a declarative feature definition into a
validated Evidence Model, canonical Semantic Model, strictly compiled Angular
and/or ReactJS package, and generation manifest. The versioned
`sources/support-request.definition.json` example proves a second domain with
authenticated Bearer transport and no session effect.

```bash
bun run generate:action-request \
  --definition tools/generator-platform/sources/support-request.definition.json \
  --out /tmp/generated-support \
  --target all
```

Add `--dry-run` to compute a deterministic Change Set without creating,
modifying, or deleting any file. Against an existing output, the command first
checks every `generator-owned` file against its previous manifest hash and
refuses manual drift. The generated `src/after-success.extension.ts` is instead
`human-owned/preserve`: the dry-run reads its actual bytes, records the same
SHA-256 before and after, and never proposes its replacement or deletion.

The slot runs after canonical execution (and after session persistence when
present) but before the target boundary publishes success. Extension failures
propagate; a slot-specific timeout policy is not implemented yet.

Use `--apply <change_set_id>` only after reviewing the dry-run to regenerate an
existing output. The identifier binds the application to the exact observed and
desired state; a stale identifier is rejected. The command verifies the
control-plane and target manifests, rejects drift or unowned files, builds and
typechecks a sibling candidate tree, rechecks the live Change Set, then commits
with rollback. Human-owned extensions are copied byte-for-byte and their
observed hashes are persisted in the new manifests. Without `--dry-run` or
`--apply <change_set_id>`, the output directory must not already exist. The
output parent directory must already exist because locks, candidates, and
backups are created as siblings on the same filesystem.

Publication is serialized by an exclusive per-output lock. Candidate files,
directories, and the transaction journal are synchronized before directory
renames. At the next publication attempt, a stale local lock is reclaimed and an
interrupted transaction either restores the previous tree or accepts the
published tree only after checking every manifest and artifact hash. Ambiguous
states fail closed and keep the recovery tree. The commit still uses two
directory renames. ADR-0035 therefore defines an offline-activation reader
model: external readers must not consume the output until the publication
command succeeds. The runtime accepts only local APFS/macOS and ext4/Linux
storage, verifies the real `statfs` profile before writing, and rejects every
other filesystem. The suite actually `SIGKILL`s a child publisher after each
critical rename. A blocking `macos-14`/APFS and `ubuntu-24.04`/ext4 CI matrix
runs the same recovery suite and a real-filesystem publication probe.
User-facing target names are `angular` and `reactjs`;
`angular-nx` and `react-typescript` remain internal profile identifiers. See the
[`action-request` authoring guide](../../docs/guides/creer-une-action-request.md).

The implementation keeps candidate/change-set orchestration in
`core/generation-publication.mjs` and durable locking, journaling, recovery, and
commit mechanics in `core/generation-transaction.mjs`. Their tests follow the
same boundary. Every source and test module remains below the repository's
800-line limit without an exception or allowlist entry.

If publication is already committed but post-commit cleanup cannot be made
durable, the API returns success with `recovery_pending: true` and the exact
`recovery_root`; it does not report a false rollback. A later publication
attempt processes that journal before doing new work.

## Probe the evolvable-composition decision

The executable director contract in
[`acceptance/evolvable-composition.contract.json`](./acceptance/evolvable-composition.contract.json)
asks a stricter question than the current `action-request` example: can one
remembered composition change data, permissions, behavior graph, and
presentation simultaneously, regenerate Angular and ReactJS, and preserve a
human-owned extension?

Run its characterization probe with:

```bash
bun run probe:composition-evolution
```

This is deliberately not a false feature-success gate. It exits successfully
only while the currently supported subset still works and the exact known-gap
set remains explicit. `decision_satisfied` stays `false` until all gaps are
implemented and the contract is promoted from characterization to a blocking
acceptance gate. An intentional capability addition must update the executable
probe and contract in the same change.

## Author a bounded workflow-action

`generate-workflow-action.mjs` accepts the currently supported workflow
composition: take, approve/reject qualification, and an awaited filtered export.
Unsupported operations, rule sets, or step order fail closed.

```bash
bun run generate:workflow-action \
  --definition tools/generator-platform/sources/requests-workflow.definition.json \
  --out /tmp/generated-requests-workflow \
  --target all
```

The workflow command supports the same read-only `--dry-run` and explicit
transactional `--apply <change_set_id>` contracts.

The command writes separate Evidence and Behavior Models, strictly compiles the
selected Angular and/or ReactJS packages, persists their shared Artifact Plan
and manifests, and refuses to overwrite an existing directory unless
`--apply <change_set_id>` is explicitly supplied after review. See the
[`workflow-action` authoring guide](../../docs/guides/creer-un-workflow-action.md).

## Contracts

- `schemas/evidence.schema.json` separates observed facts, unresolved unknowns,
  and explicit architectural decisions. Source-code evidence is
  content-addressed with SHA-256.
- `schemas/semantic-model.schema.json` defines target-neutral types, operations,
  constraints, effects, access rules, and integration boundaries.
- `schemas/artifact-plan.schema.json` defines the target-neutral logical
  responsibilities that every renderer must materialize exhaustively.
- `schemas/change-set.schema.json` defines deterministic `create`, `replace`,
  `preserve`, `delete`, and `unchanged` planning results. The planner supports
  `generator-owned/replace` and the single proven
  `human-owned/preserve` slot; every other ownership pair fails closed.
- `generation-control-manifest.json` is emitted beside the Evidence,
  Semantic/Behavior, and Artifact Plan documents. It gives these root-level
  control-plane files explicit `generator-owned/replace` ownership and drift
  hashes before an apply.
- `schemas/generation-manifest.schema.json` defines the reproducibility contract
  for rendered target trees, including each file's planned responsibility,
  owner, and write policy.
- `schemas/action-request-definition.schema.json` defines the user-facing,
  target-independent authoring contract.
- `schemas/behavior-model.schema.json` defines the target-neutral workflow
  graph; source provenance is deliberately kept outside that graph.
- `schemas/workflow-evidence.schema.json` and
  `schemas/workflow-action-definition.schema.json` define the separated
  provenance and bounded authoring contracts.
- `profiles/*.profile.json` declare target identity, dependency boundary, output
  root, and runtime integration contract.
- `manifests/*.manifest.json` pin the reproducible Angular and ReactJS output
  trees. Their internal profile identifiers retain the implementation details
  `angular-nx` and `react-typescript`.
- `fixtures/action-request.*.json` is the first canonical slice, extracted from
  the existing authentication action-request implementation.

The semantic fixture intentionally contains no Angular, Nx, React, Figma, SEOS,
TypeScript, or repository-path vocabulary. Such details belong in evidence,
source adapters, target profiles, or execution manifests—not in the canonical
semantic model.

## Validation

Run:

```bash
bun run check:generator-platform
```

The aggregate gate is intentionally layered:

```bash
bun run check:generator-platform:core
bun run check:generator-platform:angular
bun run check:generator-platform:reactjs
```

- `core` uses `node:test` for source adapters, canonical models, plans,
  manifests, deterministic rendering and cross-target black-box Oracles;
- `angular` prepares the generated TypeScript tree, type-checks generated code
  and specs strictly, then resolves the services through Angular `TestBed` in a
  zoneless Vitest/jsdom test environment;
- `reactjs` prepares and strictly type-checks its own generated TypeScript tree,
  then executes generated hooks with React 19, ReactDOM, React Testing Library
  `renderHook`, and asynchronous `act` calls.

Stack-specific tests live under `stack-tests/<stack>` and are selected by
separate Vitest configurations. A new renderer is not complete until it owns a
native stack gate; passing only the framework-neutral Oracle is insufficient.
The prepared trees are disposable outputs under `.stack-test-runtime/` and are
excluded from version control.

The check verifies both JSON Schemas and cross-document invariants:

- source hashes and repository containment;
- globally unique identifiers;
- resolved evidence, type, integration, and constraint references;
- structural correctness of recursive type references;
- consistency between required-field constraints and declared fields;
- absence of known target/framework leakage in the semantic model.
- deep equality of the two normalized observations and of their resulting IR;
- equality with the versioned semantic golden fixture;
- independent source and policy hashes for both Evidence Models;
- fail-closed rejection of unknown TypeScript validation branches.
- independent Angular and ReactJS compilation from TypeScript output;
- runtime execution of the emitted Angular and ReactJS modules against the same
  `action-request` validation, transport, effect-ordering, and failure cases;
- rejection of constraint, session-effect, and access/authentication mutants by
  the same behavioral oracle on both targets;
- compilation and runtime execution of the independent `support` definition on
  Angular and ReactJS, without authentication-specific generated names;
- persisted manifest equality and deterministic tree hashes;
- schema-valid, deterministic Artifact Plans shared by Angular and ReactJS,
  with exhaustive renderer bindings and fail-closed stale-plan detection;
- deterministic, schema-valid dry-runs for absent, unchanged, evolved, drifted,
  and obsolete generated artifacts, with explicit proof that no file changes;
- effective publication on an existing output for `action-request` and
  `workflow-action`, including control-plane drift checks, candidate
  typechecking, unowned-file refusal, anti-TOCTOU replan, rollback and explicit
  recovery-path preservation if rollback itself fails;
- executable `after-success` extensions on `action-request` and
  `workflow-action`, plus byte-for-byte preservation planning for edited human
  implementations on Angular and ReactJS;
- invalidation of both manifests after an IR mutation;
- absence of source-adapter imports from renderer implementations.
- fail-closed extraction of the real `requests` workflow evidence;
- deep equality between code-derived and JSON-derived workflow Behavior Models,
  with distinct Evidence Models;
- end-to-end `generate:workflow-action` output, strict target selection and
  overwrite refusal;
- strict compilation, manifest stability, runtime equivalence, and mutation
  detection for generated Angular and ReactJS workflow outputs.
- native Angular dependency-injection execution through `TestBed`, including
  RxJS success/error propagation for `action-request` and the complete shared
  workflow Oracle;
- native ReactJS hook execution through React Testing Library, including
  success/error state publication, permission refusal and causal waiting of an
  asynchronous export callback;
- exact characterization of the evolvable-composition director contract,
  including regression detection for its supported subset and drift detection
  for its declared gaps.

The validator is dependency-free by design. It implements only the JSON Schema
keywords used by these contracts; expanding a schema with new keywords must be
accompanied by validator tests or by adoption of a declared full JSON Schema
implementation.
