# Generator Platform — canonical IR seed

This directory implements the first evidence-gated vertical slice defined by
ADR-0029, ADR-0030, and ADR-0031. It is deliberately outside any Nx target
profile: these files define the portable contract that source adapters produce
and target adapters consume.

## Canonical backend contract

`schemas/backend-contract.schema.json` defines the closed, source-independent
contract consumed by future application and page specifications. OpenAPI,
Postman, manually authored declarations, and bounded legacy inspection are
inputs to adapters; none gets a source-specific escape hatch in the canonical
model. Every service, security scheme, model, field, parameter, body, response,
and operation carries evidence pointing to an immutable source snapshot.

`core/backend-contract.mjs` adds the cross-document invariants that JSON Schema
alone cannot prove: unique identities, resolved references, exact recursive
type shapes, access/security consistency, path-parameter equivalence, at least
one success response, closed envelope shapes, used sources, workspace-contained
regular snapshots, and exact SHA-256 provenance. This is the P0.1 vocabulary;
the three publication adapters below are its only current ingestion paths.

Named backend models preserve their real top-level shape (`object`, `array`, or
`scalar`) so normalization never invents an `items` wrapper around an array.
Typed validation constraints are accepted only where meaningful;
contradictory bounds and invalid regular expressions fail closed.

Lifecycle is evidence-backed and monotonic: an analogue remains `reference`;
the target contract starts `planned`, becomes `implemented` only with target
implementation evidence, and reaches `verified-live` only with corresponding
evidence. A reference source cannot be re-labelled to satisfy a planned target,
and the contract status always equals its least mature target entity.

### Compile a structured backend definition

`compile-backend-contract.mjs` is the first source adapter. It consumes a
LLM-authored JSON definition whose entities contain business facts but no
hand-written evidence or lifecycle duplication. The adapter attaches exact JSON
Pointer locations, hashes the source snapshot byte-for-byte, projects every
entity to the canonical contract, and runs all canonical invariants.

Manual input can create only `reference` or `planned` contracts. It can never
self-promote to `implemented` or `verified-live`; those transitions require
future implementation and runtime adapters.

Publication requires an immutable reviewed plan:

```bash
bun run compile:backend-contract -- \
  --adapter structured \
  --definition contracts/clean-street.definition.json \
  --out contracts/clean-street.backend.json \
  --dry-run

bun run compile:backend-contract -- \
  --adapter structured \
  --definition contracts/clean-street.definition.json \
  --out contracts/clean-street.backend.json \
  --apply <plan_id_du_dry_run>
```

The dry-run writes nothing. Apply recomputes the complete plan, refuses stale
input, publishes a fully synchronized candidate through a no-overwrite hard
link, and resumes an interrupted complete candidate. Definitions, output
parents, and every path component must remain regular and inside the workspace.

### OpenAPI and Postman adapters

`--adapter openapi` accepts a strict JSON/YAML subset of OpenAPI 3.0, 3.1, or
3.2. The root must contain closed CMZ metadata:

```yaml
x-cmz-contract:
  authority: declared
  contract_id: clean-street-api
  lifecycle: planned
  service_id: public-api
  source_id: clean-street-openapi
```

Each server carries `x-cmz-environment`. Local component references,
descriptions, explicit object closure, exact security and explicit success
responses are required. External/chained references, ambiguous unions, inline
bodies, callbacks, webhooks, generic statuses and operation-level servers fail
closed. Lifecycle and authority are exact pairs: `reference/observational`,
`planned/declared`, or `implemented/authoritative`. OpenAPI cannot claim
`verified-live` without a future runtime adapter.

`--adapter postman` accepts only Collection v2.1 and requires the standard
collection variables `baseUrl`, `cmz_contract_id`, `cmz_contract_version`,
`cmz_environment`, `cmz_service_id`, and `cmz_source_id`. It always emits an
observational `reference` contract. Example request/response bodies become
opaque scalar JSON models; the adapter deliberately never infers fields or
types from examples. At least one saved success response per request is
required.

```bash
bun run compile:backend-contract -- --adapter openapi \
  --definition contracts/target.openapi.yaml \
  --out contracts/target.backend.json --dry-run

bun run compile:backend-contract -- --adapter postman \
  --definition contracts/analogue.postman.json \
  --out contracts/analogue-reference.backend.json --dry-run
```

### Application design, shell, and page realization

`schemas/application-design.schema.json` is target-neutral. It connects
immutable project evidence and canonical backend contracts to audiences,
web/Android/iOS experiences, pages, states, controls, actions, loads, bindings,
regions and accessible elements. `core/application-design.mjs` checks exact
field/operation references, parameter and body bindings, access strength,
permissions, navigation reachability, offline states and symmetric experience
membership. An approved design cannot contain unknowns or use a `reference`
backend as its implementation target.

```bash
bun run compile:application-design -- \
  --source design-sources/my-app.yaml \
  --out designs/my-app.application-design.json --dry-run

bun run compile:application-design -- \
  --source design-sources/my-app.yaml \
  --out designs/my-app.application-design.json --apply <plan_id>

bun run check:application-designs
```

`create-app` renders an approved web experience as an Angular 22/PWA shell. Its
nominal command computes and publishes the immutable plan directly, compiles
the candidate with `ngc`, then executes a no-cache production build and lint in
the real Nx graph. `--dry-run` remains available for inspection and
`--expect-plan` makes prior plan review enforceable when needed. Failure rolls
the output back to a hash-verified candidate.

Every shell contains a generated access-decision port and a pure access policy.
Public routes stay public; `authenticated` and `authorized` routes receive a
functional guard. With no host identity provider the decision is deny, and an
authorized route requires every declared permission. This is a safe shell
boundary, not a claim that the future Clean Street identity backend already
exists.

```bash
bun run create-app -- --design designs/my-app.application-design.json \
  --experience citizen-web --app my-app
bun run create-app -- --design designs/my-app.application-design.json \
  --experience citizen-web --app my-app --dry-run
bun run create-app -- --design designs/my-app.application-design.json \
  --experience citizen-web --app my-app --expect-plan <plan_id>
```

Page realization is delegated without giving the LLM repository-wide write
authority. `prepare:page-realization` binds one page contract and the protected
workspace inventory to a work order. The LLM may write exactly the listed page
files. The work order also carries the closed `screen` role node and the
selected Angular archetype contract (`shape`, `forbid`, path and SHA-256); the
LLM cannot choose or rewrite that form. `verify:page-realization` rejects
external drift, extra files, direct network calls, backend endpoint literals,
incomplete evidence, or missing exact `data-cmz-id` mappings before running
compilation, production build, lint, and tests. These four commands no longer
inherit the caller environment or execute in the real workspace: a
platform-owned runner uses a disposable Git-visible candidate, a strict
environment allowlist, read-only dependencies, no external network, and the
available macOS or Docker sandbox. Angular/Vitest receives loopback only and
binds its internal server to `127.0.0.1`. The security evidence and residual
limits are recorded in
[`securisation-page-realization-2026-09-15.md`](../../docs/architecture/securisation-page-realization-2026-09-15.md).

```bash
bun run prepare:page-realization -- --app my-app --page <page_id> --dry-run
bun run prepare:page-realization -- --app my-app --page <page_id> --apply <work_order_id>
bun run verify:page-realization -- --app my-app --page <page_id> --work-order <work_order_id>
```

Applications have the same plan/apply and recovery discipline on removal:

```bash
bun run retire-app -- --app my-app --dry-run
bun run retire-app -- --app my-app --apply <plan_id>
bun run retire-app -- --app my-app --resume
# or, to restore the journaled app:
bun run retire-app -- --app my-app --abort
```

### Versioned end-to-end proof

`examples/application-conception-proof/` is a technical fixture, not a product
specification. It retains a raw Postman analogue, its canonical `reference`
contract, a distinct declared `planned` target, the source and canonical
application design, and one bounded page realization. The design is also
published under `designs/`, so `check:application-designs` can never pass over
an empty set unnoticed.

```bash
bun run check:application-pipeline
```

The gate recompiles and byte-compares both backend contracts and the design,
asserts that no action binds the analogue, publishes a disposable Angular/PWA
shell, prepares a real work order, installs the reviewed page output, then runs
`ngc`, production build, lint, and tests. It removes all disposable output in a
`finally` block. This proof does not validate any Clean Street field: that
product remains blocked until its own target contract is confirmed.

### Demand-driven composition registry

`composition-registry.json` replaces dispatch code edited by hand. Every entry
names one generator, canonical layers, maturity, and real definition evidence.
An experimental composition requires one readable case; a proven composition
requires at least two distinct feature cases. Paths must be regular,
workspace-contained and non-symbolic. A registry change during `create-module`
invalidates resume, while `--abort` remains able to restore from the journaled
composition snapshot.

Maturity is an adoption gate, not a documentation label. `create-module`
rejects an `experimental` entry before any workspace write unless the initial
command carries `--allow-experimental`. That explicit consent neither promotes
the composition nor weakens generation, build, lint, graph, formatting, or
lockfile gates; it is intentionally invalid on `--resume` and `--abort`.

```bash
bun run check:composition-registry
```

The registry is intentionally not a feature wish list. New compositions enter
only after their generator and business cases exist; unsupported kinds remain
rejected rather than approximated. `list-query` remains experimental because
its sole case is the retained source of a removed POC. `action-request` is also
experimental: its generators and isolated runtime proofs are reproducible, but
the Staff audit of 2026-09-15 identified unresolved production blockers. Their
v1 evidence remains available for migration work; neither may be adopted by
default.

### Migrate a frozen list-query v1 definition

The v2 contract does not repeat HTTP, authentication, or wire DTO facts. It
content-addresses one canonical backend contract, maps its wire fields to a
read model, and makes cache, concurrency, cancellation, retry, and stale-data
behavior explicit. Migration therefore requires a reviewed decisions file; it
never guesses these policies.

```bash
bun run migrate:list-query -- \
  --definition tools/generator-platform/fixtures/editorial-blocks.v1.definition.json \
  --backend-contract tools/generator-platform/fixtures/list-query-v1.backend-contract.json \
  --decisions tools/generator-platform/fixtures/list-query-v1.migration-decisions.json \
  --out /tmp/editorial-blocks.v2.json
```

The command validates both inputs, refuses any v1/backend disagreement, writes
one new file, and never overwrites an existing output. The versioned before,
decisions, backend, and expected-after fixtures make the transformation
reviewable without running the command.

The migration also compiles its result into one internal, target-neutral
execution model before writing. That model resolves the query port, transport,
strict wire decoder, read mapping, controller states, execution policies, and
failure propagation once for every future target. Parameterized endpoints and
nested wire models fail closed until a real second case proves their contract.
No migration-specific journal or runtime is introduced.

### Publish a list-query v2 output

The existing `generate:list-query` command detects v1/v2 from the closed
`schema_version`. V2 publishes the already-proven Angular and React sources
through the same manifests, ownership, lock, journal, rollback and recovery
protocol as the other generators:

```bash
bun run generate:list-query -- \
  --definition tools/generator-platform/fixtures/site-group-select.v2.definition.json \
  --out /tmp/generated-site-groups \
  --target all
```

Creation requires an absent output path. To evolve an existing output, first
review the read-only change set, then apply that exact identifier:

```bash
bun run generate:list-query -- --definition <v2.json> --out <directory> --target all --dry-run
bun run generate:list-query -- --definition <v2.json> --out <directory> --target all --apply <change_set_id>
```

The v2 control plane contains the target-neutral execution model and artifact
plan. The published sources are type-checked against declared workspace ports;
unknown aliases fail closed. `angular-layered` remains a v1-only target. V2 is
still experimental until a real N×N page composition consumes the publication.

Direct lists, the proven single string path parameter, and the canonical page
with typed query parameters are executable on both targets. The Angular page
reuses the host `HttpClient`, interceptors and `ResourceFacade`; the React page
reuses its explicit fetch port and native hook lifecycle. Both map backend field
names to the canonical page roles from the execution model. Neither infers
Laravel, Spring, .NET or Django conventions.

## Migrate an action-request to v2

Action-request v2 follows the same backend-authority boundary as list-query v2.
The authoring document references a content-addressed backend contract and
contains only UI field bindings, validations, result projection, and explicit
execution decisions. It does not redeclare HTTP, access, authentication,
response envelopes, or wire DTOs.

The migration requires a reviewed decisions file because concurrency, retry,
idempotency, invalidation, and post-success host effects cannot be inferred
safely:

```bash
bun run migrate:action-request -- \
  --definition tools/generator-platform/sources/support-request.definition.json \
  --backend-contract tools/generator-platform/fixtures/action-request-v1.backend-contract.json \
  --decisions tools/generator-platform/fixtures/action-request-v1.migration-decisions.json \
  --out /tmp/support-request.v2.json
```

The command verifies backend source snapshots, checks v1/backend parity, writes
one new file with exclusive-create semantics, and is idempotent when given a
valid v2 input. The initial v2 subset is deliberately narrow: JSON mutations
with no parameters and primitive object fields. Unsupported shapes fail closed.

Before writing, the command also compiles the definition and exact backend
bytes into one internal, target-neutral execution model. That model keeps the
business input, request DTO, response DTO and result projection separate,
resolves public authentication to `omit`, and records the remote-success commit
boundary. A host-side failure after that boundary becomes
`committed-with-local-error`; only the local post-success effect may be retried,
never the already-committed remote mutation.

`forgot-password.v2.definition.json` is the first active-code contract proof.
It is traced to the Angular client, endpoint, DTO, envelope, interceptor, and
test configuration sources. Its status means “implemented client observation,”
not “server verified live.”

The Angular target now renders six ordinary TypeScript artifacts from that same
compiled model: models, input validation, strict response decoder, HTTP client,
execution facade, and public API. The generated code is formatted, type-checked,
then executed with Angular `TestBed`, `HttpTestingController`, and the host's
real auth/error interceptors. Public execution uses the host's exported
`SKIP_AUTH` token, so it neither invents a private token nor leaks the session
Bearer. Invalid input fails before HTTP; unknown response fields fail before the
domain result; duplicate submission is rejected without disturbing the active
request.

This renderer deliberately supports only the active `forgot-password` shape.
The React target now consumes the same compiled model and artifact plan. Its
client delegates service resolution, transport, and authentication policy to an
explicit host port; it does not call a global fetch or create authentication.
The generated hook runs with real React primitives, rejects concurrent submit,
and stops publishing state after unmount without claiming that the remote
mutation was cancelled. Models, validation, and decoding are shared only at
renderer level; Angular and React keep separate clients and lifecycles.

The existing `generate:action-request` command detects v1/v2 from the closed
`schema_version`. V2 publishes both proven targets with the existing manifests,
ownership, lock, journal, rollback, and recovery protocol:

```bash
bun run generate:action-request -- \
  --definition tools/generator-platform/fixtures/forgot-password.v2.definition.json \
  --out /tmp/generated-forgot-password \
  --target all
```

An existing output requires the same reviewed `--dry-run` then
`--apply <change_set_id>` flow as v1 and `list-query` v2. The v2 control plane
contains `artifact-plan.json` and `action-request-execution-model.json`; it does
not masquerade as a v1 semantic/evidence model. Layered targets remain v1-only.
Unsupported neighboring shapes fail closed. The next proof is a real N×N page
composition consuming both durable v2 primitives.

The first C2 increment now compiles a target-neutral `page-execution-plan`
directly from a content-addressed page contract and the published v2 execution
models. It does not introduce a third business primitive or copy their runtime
policies. Each query/command instance keeps its own local state and exact
primitive reference; every output binding resolves to one explicit
`producer_node_id`.

The compiler proof uses two real list queries (including one route-parameter
binding) and one real action request. It rejects stale hashes, missing or
ambiguous primitives, weaker page access, incompatible controls, ambiguous
producers, and caller-declared invalidation while product intent cannot name
its targets. A standalone replay validator checks the closed schema and the
exact canonical capability union. No composition root or joint HTTP execution
is claimed yet; those are the next C3/C4 proofs.

C3 now materializes one Angular composition target from that plan. Each node is
rendered through the already-proven v2 primitive renderer into its own
`src/nodes/<node-id>` boundary, then a minimal `PageComposition` service and an
explicit provider list wire the instances together. Host URL tokens come from
a closed, versioned binding document; the renderer negotiates against an
independent Angular capability allowlist and rechecks every referenced file and
SHA-256 before rendering.

The command reuses the existing transactional publisher:

```bash
bun run generate:page-composition --plan <plan.json> \
  --host-bindings tools/generator-platform/fixtures/angular-page-host-bindings.json \
  --out <directory> [--dry-run | --apply <change_set_id>]
```

The output deliberately contains no component or template. C3 proves a strict,
published composition root.

C4 now prepares that exact output for the native Angular stack suite and tests
it from an external consumer. The hermetic host observes two GET requests and
one POST together, including URL, payload, auth, cache bypass, isolated partial
failure, targeted retry, latest-wins and destroy cancellation, and double-submit
rejection. The oracle imports no generator internals and adds no production
runtime. Policies currently declared as `none` (automatic retry, invalidation,
idempotency key and post-success effect) are verified as absent rather than
invented. Angular remains the only composition target proven at runtime; C5 is
the representative vertical slice.

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
set remains explicit. An intentional capability addition must update the
executable probe and contract in the same change.

`permissions.runtime-enforcement` is now in the supported set. The projected
`authorized` operation requires a host permission port on both targets, checks
every declared permission at execution time, and returns the stable
`permission_denied` error before HTTP/fetch when access is denied. The proof is
behavioral, not a source-string search: the director Oracle executes denied and
granted paths on both generated runtimes.

As of PLAT-5J, `expected_gaps` is empty: `composition.persisted-instance`,
`behavior.graph`, and `presentation.flow` are all now proven by real
execution and moved into the supported set — every capability declared by
`evolvable-composition.contract.json` is now covered by an executable
oracle, not a schema-shape check. `decision_satisfied` therefore reports
`true`. This does **not** by itself promote the contract from
characterization to a blocking acceptance gate: `contract.status` stays
`"characterization"`, `promotion_rule.success` also requires every
invariant to be verified by executable oracles (a separate, broader claim
this probe does not itself adjudicate), and this script never mutates
`contract.status` or triggers any promotion mechanism.

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
- native Angular and ReactJS enforcement of canonical `action-request`
  permissions before HTTP/fetch, plus four killed bypass/wrong-permission
  mutants;
- exact characterization of the evolvable-composition director contract,
  including regression detection for its supported subset and drift detection
  for its declared gaps.

The validator is dependency-free by design. It implements only the JSON Schema
keywords used by these contracts; expanding a schema with new keywords must be
accompanied by validator tests or by adoption of a declared full JSON Schema
implementation.
