// DOCKER-314: contrat des étapes natives, partagé avec les gardes et leurs mutants.
export const expr = (text) => '$' + '{{ ' + text + ' }}';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function runtimeAssertion(
    runtime,
    prefix = '',
    condition,
    nodeSeen = false
) {
    const lines = ['set -euo pipefail'];
    if (runtime === 'node' || nodeSeen)
        lines.push('test "$(node --version)" = "v$(cat ' + prefix + '.nvmrc)"');
    if (runtime === 'bun')
        lines.push(
            'expected="$(node -p \'require("./' +
                prefix +
                'package.json").packageManager.slice(4)\')"',
            'test "$(bun --version)" = "$expected"'
        );
    return {
        name: 'Verify ' + runtime + ' runtime against source',
        ...(condition === undefined ? {} : { if: condition }),
        shell: 'bash',
        run: lines.join('\n') + '\n',
    };
}

export function productionImageSteps() {
    return [
        {
            id: 'production-image-build',
            name: 'Production image — frozen build',
            shell: 'bash',
            run:
                [
                    'set -euo pipefail',
                    'export DOCKER_BUILDKIT=1',
                    'sha256sum Dockerfile bun.lock package.json .nvmrc',
                    'timeout 1200s docker build --pull --progress=plain --iidfile "$RUNNER_TEMP/production-image.id" .',
                    'image="$(cat "$RUNNER_TEMP/production-image.id")"',
                    'test "$(docker image inspect --format \'{{.Id}}\' "$image")" = "$image"',
                    'echo "PRODUCTION_IMAGE_ID=$image"',
                ].join('\n') + '\n',
        },
        {
            id: 'production-image-http',
            name: 'Production image — HTTP and runtime config',
            shell: 'bash',
            run:
                [
                    'set -euo pipefail',
                    'timeout 90s bash tools/smoke-production-image.sh "$(cat "$RUNNER_TEMP/production-image.id")"',
                ].join('\n') + '\n',
        },
        {
            id: 'production-image-build-negative',
            name: 'Production image — reject broken build',
            shell: 'bash',
            run:
                [
                    'set -euo pipefail',
                    'export DOCKER_BUILDKIT=1',
                    'cp Dockerfile "$RUNNER_TEMP/Dockerfile.production-negative"',
                    'printf \'\\nRUN printf "CMZ_DOCKER_BUILD_NEGATIVE\\\\n"; exit 91\\n\' >> "$RUNNER_TEMP/Dockerfile.production-negative"',
                    'status=0',
                    'timeout 180s docker build --progress=plain -f "$RUNNER_TEMP/Dockerfile.production-negative" . > "$RUNNER_TEMP/production-build-negative.log" 2>&1 || status=$?',
                    'cat "$RUNNER_TEMP/production-build-negative.log"',
                    'case "$status" in 0|124|137) echo "Counter-proof did not produce the expected failure" >&2; exit 1 ;; esac',
                    'grep -E \'^#[0-9]+ [0-9.]+ CMZ_DOCKER_BUILD_NEGATIVE$\' "$RUNNER_TEMP/production-build-negative.log"',
                    'grep -F \'exit code: 91\' "$RUNNER_TEMP/production-build-negative.log"',
                    'echo "PRODUCTION_BUILD_NEGATIVE=PASS"',
                ].join('\n') + '\n',
        },
        {
            id: 'production-image-start-negative',
            name: 'Production image — reject broken startup',
            shell: 'bash',
            run:
                [
                    'set -euo pipefail',
                    'status=0',
                    'CMZ_ENV_TEMPLATE=/etc/cmz/no-such-template timeout 90s bash tools/smoke-production-image.sh "$(cat "$RUNNER_TEMP/production-image.id")" > "$RUNNER_TEMP/production-start-negative.log" 2>&1 || status=$?',
                    'cat "$RUNNER_TEMP/production-start-negative.log"',
                    'case "$status" in 0|124|137) echo "Counter-proof did not produce the expected failure" >&2; exit 1 ;; esac',
                    'grep -F \'PRODUCTION_IMAGE_EXITED_BEFORE_HTTP\' "$RUNNER_TEMP/production-start-negative.log"',
                    'grep -F \'/etc/cmz/no-such-template\' "$RUNNER_TEMP/production-start-negative.log"',
                    'echo "PRODUCTION_START_NEGATIVE=PASS"',
                ].join('\n') + '\n',
        },
    ];
}

const READ = expr("github.ref == 'refs/heads/main'");
const ACTIVE = "steps.discover.outputs.active == 'true'";
const planPath = expr('runner.temp') + '/runtime-alignment/plan.json';
const dataPath = expr('runner.temp') + '/runtime-alignment';
const planName =
    'runtime-alignment-' +
    expr('github.run_id') +
    '-' +
    expr('github.run_attempt');
const discover =
    [
        'set -euo pipefail',
        'directory="$RUNNER_TEMP/runtime-alignment"',
        'mkdir -p "$directory/input/candidate"',
        'trigger_head=""',
        'if test "${GITHUB_EVENT_NAME:-}" = workflow_run; then',
        '  trigger_head="$(jq -r --arg repo "$GITHUB_REPOSITORY" \'if (.workflow_run | .name == "CI" and .status == "completed" and .event == "pull_request" and .head_repository.full_name == $repo and (.head_branch | startswith("dependabot/")) and (.head_sha | test("^[a-f0-9]{40}$"))) then .workflow_run.head_sha else "" end\' "$GITHUB_EVENT_PATH")"',
        '  if test -z "$trigger_head"; then echo "active=false" >> "$GITHUB_OUTPUT"; echo "Runtime alignment: upstream event ignored."; exit 0; fi',
        'fi',
        'gh api --paginate "repos/$GITHUB_REPOSITORY/pulls?state=open&per_page=100" --jq \'.[] | select(.user.login == "dependabot[bot]" and .base.ref == "main" and .head.repo.full_name == .base.repo.full_name) | .number\' > "$directory/numbers"',
        'active=false',
        'while IFS= read -r number; do',
        '  if ! [[ "$number" =~ ^[1-9][0-9]*$ ]]; then exit 1; fi',
        '  gh api --paginate --slurp "repos/$GITHUB_REPOSITORY/pulls/$number/files?per_page=100" | jq add > "$directory/input/files.json"',
        '  if ! jq -e \'length == 1 and (.[0] | (.filename == ".nvmrc") or (.filename == "Dockerfile" and ((.patch // "") | test("(?m)^[+-]FROM (oven/bun|node):"))) or (.filename == "package.json" and ((.patch // "") | test("(?m)^[+-].*\\u0022packageManager\\u0022"))))\' "$directory/input/files.json" > /dev/null; then continue; fi',
        '  gh api "repos/$GITHUB_REPOSITORY/pulls/$number" > "$directory/input/pr.json"',
        '  if test -n "$trigger_head" && ! jq -e --arg head "$trigger_head" --arg repo "$GITHUB_REPOSITORY" \'.head.sha == $head and .user.login == "dependabot[bot]" and .state == "open" and .base.ref == "main" and .base.repo.full_name == $repo and .head.repo.full_name == $repo\' "$directory/input/pr.json" > /dev/null; then continue; fi',
        '  head="$(jq -r .head.sha "$directory/input/pr.json")"',
        '  if ! [[ "$head" =~ ^[a-f0-9]{40}$ ]]; then exit 1; fi',
        '  for path in Dockerfile package.json .nvmrc; do',
        '    gh api "repos/$GITHUB_REPOSITORY/contents/$path?ref=$head" --jq .content | base64 --decode > "$directory/input/candidate/$path"',
        '  done',
        '  active=true',
        '  break',
        'done < "$directory/numbers"',
        'echo "active=$active" >> "$GITHUB_OUTPUT"',
        'if test "$active" = false; then echo "Runtime alignment: nothing to do; no checkout or installation."; fi',
    ].join('\n') + '\n';

const revalidate =
    [
        'set -euo pipefail',
        'plan="$RUNNER_TEMP/runtime-alignment/plan.json"',
        'number="$(jq -r .identity.number "$plan")"',
        'if ! [[ "$number" =~ ^[1-9][0-9]*$ ]]; then exit 1; fi',
        'gh api "repos/$GITHUB_REPOSITORY/pulls/$number" > "$RUNNER_TEMP/runtime-alignment/current.json"',
        'current_main="$(gh api "repos/$GITHUB_REPOSITORY/commits/main" --jq .sha)"',
        'node trusted-main/tools/runtime-version-policy.mjs verify "$plan" "$RUNNER_TEMP/runtime-alignment/current.json" "$current_main" >> "$GITHUB_OUTPUT"',
    ].join('\n') + '\n';

const publish =
    [
        'set -euo pipefail',
        'plan="$RUNNER_TEMP/runtime-alignment/plan.json"',
        'candidate="$RUNNER_TEMP/runtime-candidate"',
        'git -C trusted-main fetch origin "refs/heads/$BRANCH"',
        'test "$(git -C trusted-main rev-parse FETCH_HEAD)" = "$EXPECTED_HEAD"',
        'test "$EXPECTED_BASE" = "$(jq -r .identity.baseSha "$plan")"',
        'git -C trusted-main merge-base --is-ancestor "$EXPECTED_BASE" "$RUNTIME_MAIN_SHA"',
        'git -C trusted-main merge-base --is-ancestor "$EXPECTED_BASE" "$EXPECTED_HEAD"',
        'test -z "$(git -C trusted-main diff --summary "$EXPECTED_BASE" "$EXPECTED_HEAD")"',
        'test "$(git -C trusted-main diff --name-only "$EXPECTED_BASE" "$EXPECTED_HEAD")" = "$CHANGED_PATH"',
        'mkdir -p "$RUNNER_TEMP/runtime-alignment/snapshot"',
        'for path in Dockerfile package.json .nvmrc; do',
        '  git -C trusted-main show "$EXPECTED_HEAD:$path" > "$RUNNER_TEMP/runtime-alignment/snapshot/$path"',
        'done',
        'gh api "repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER" > "$RUNNER_TEMP/runtime-alignment/current.json"',
        'current_main="$(gh api "repos/$GITHUB_REPOSITORY/commits/main" --jq .sha)"',
        'node trusted-main/tools/runtime-version-policy.mjs verify "$plan" "$RUNNER_TEMP/runtime-alignment/current.json" "$current_main" "$RUNNER_TEMP/runtime-alignment/snapshot" > /dev/null',
        'git -C trusted-main worktree add --detach "$candidate" "$EXPECTED_HEAD"',
        'node trusted-main/tools/runtime-version-policy.mjs apply "$plan" "$candidate"',
        'test "$(git -C "$candidate" diff --name-only)" = "$EDIT_PATH"',
        'git -C "$candidate" diff --check',
        'git -C "$candidate" config user.name "github-actions[bot]"',
        'git -C "$candidate" config user.email "41898282+github-actions[bot]@users.noreply.github.com"',
        'git -C "$candidate" add -- "$EDIT_PATH"',
        'git -C "$candidate" commit -m "fix(build): aligner $RUNTIME $TARGET entre CI et image"',
        'gh api "repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER" > "$RUNNER_TEMP/runtime-alignment/current.json"',
        'current_main="$(gh api "repos/$GITHUB_REPOSITORY/commits/main" --jq .sha)"',
        'node trusted-main/tools/runtime-version-policy.mjs verify "$plan" "$RUNNER_TEMP/runtime-alignment/current.json" "$current_main" > /dev/null',
        'gh auth setup-git',
        'git -C "$candidate" push origin "HEAD:refs/heads/$BRANCH"',
        'published_head="$(git -C "$candidate" rev-parse HEAD)"',
        'echo "RUNTIME_ALIGNMENT_PUSHED_HEAD=$published_head"',
        'echo "Aligned PR #$PR_NUMBER: commit $published_head pushed; CI dispatch pending." >> "$GITHUB_STEP_SUMMARY"',
        'for attempt in 1 2 3 4 5; do',
        '  if ! gh api "repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER" > "$RUNNER_TEMP/runtime-alignment/published-pr.json"; then echo "RUNTIME_ALIGNMENT_PR_READ_FAILED head=$published_head" >&2; exit 1; fi',
        '  observed_head="$(jq -er \'.head.sha | select(type == "string" and test("^[a-f0-9]{40}$"))\' "$RUNNER_TEMP/runtime-alignment/published-pr.json")"',
        '  echo "RUNTIME_ALIGNMENT_PR_HEAD attempt=$attempt observed=$observed_head expected=$published_head"',
        '  if ! jq -e --slurpfile plan "$plan" \'.number == $plan[0].identity.number and .state == "open" and .user.login == $plan[0].identity.author and .head.ref == $plan[0].identity.branch and .head.repo.full_name == $plan[0].identity.headRepo and .base.sha == $plan[0].identity.baseSha and .base.ref == "main" and .base.repo.full_name == $plan[0].identity.baseRepo\' "$RUNNER_TEMP/runtime-alignment/published-pr.json" > /dev/null; then echo "RUNTIME_ALIGNMENT_PR_IDENTITY_CHANGED head=$published_head" >&2; exit 1; fi',
        '  if test "$observed_head" = "$published_head"; then break; fi',
        '  if test "$observed_head" != "$EXPECTED_HEAD"; then echo "RUNTIME_ALIGNMENT_PR_HEAD_CHANGED observed=$observed_head expected=$published_head" >&2; exit 1; fi',
        '  if test "$attempt" = 5; then echo "RUNTIME_ALIGNMENT_HEAD_NOT_VISIBLE observed=$observed_head expected=$published_head" >&2; exit 1; fi',
        '  sleep 2',
        'done',
        'current_main="$(gh api "repos/$GITHUB_REPOSITORY/commits/main" --jq .sha)"',
        'if test "$current_main" != "$RUNTIME_MAIN_SHA"; then echo "RUNTIME_ALIGNMENT_MAIN_CHANGED observed=$current_main expected=$RUNTIME_MAIN_SHA" >&2; exit 1; fi',
        'remote_head="$(git -C trusted-main ls-remote --exit-code origin "refs/heads/$BRANCH" | cut -f1)"',
        'if test "$remote_head" != "$published_head"; then echo "RUNTIME_ALIGNMENT_REMOTE_HEAD_CHANGED observed=$remote_head expected=$published_head" >&2; exit 1; fi',
        'if ! gh workflow run ci.yml --repo "$GITHUB_REPOSITORY" --ref "$BRANCH"; then echo "RUNTIME_ALIGNMENT_CI_DISPATCH_FAILED head=$published_head; commit remains published, do not repeat push" >&2; exit 1; fi',
        'echo "RUNTIME_ALIGNMENT_CI_DISPATCH_ACCEPTED head=$published_head"',
        'echo "Aligned PR #$PR_NUMBER; CI dispatched. Dependabot no longer rebases this branch; use a reviewed native merge of main." >> "$GITHUB_STEP_SUMMARY"',
    ].join('\n') + '\n';

function setupSteps(prefix = '', condition) {
    const when = condition === undefined ? {} : { if: condition };
    return [
        {
            uses: 'actions/setup-node@v7',
            ...when,
            with: { 'node-version-file': prefix + '.nvmrc' },
        },
        runtimeAssertion('node', prefix, condition),
        {
            uses: 'oven-sh/setup-bun@v2',
            ...when,
            with: { 'bun-version-file': prefix + 'package.json' },
        },
        runtimeAssertion('bun', prefix, condition, true),
    ];
}

export function alignmentWorkflow() {
    return {
        name: 'Runtime versions — alignment',
        on: {
            schedule: [{ cron: '*/15 * * * *' }],
            workflow_dispatch: null,
            workflow_run: {
                workflows: ['CI'],
                types: ['completed'],
                branches: ['dependabot/**'],
            },
        },
        concurrency: {
            group: 'runtime-version-alignment',
            'cancel-in-progress': false,
        },
        permissions: { contents: 'read' },
        jobs: {
            prepare: {
                if: READ,
                'runs-on': 'ubuntu-latest',
                'timeout-minutes': 5,
                permissions: { contents: 'read', 'pull-requests': 'read' },
                outputs: { changed: expr('steps.propose.outputs.changed') },
                steps: [
                    {
                        id: 'discover',
                        name: 'Discover isolated Dependabot runtime updates',
                        env: { GH_TOKEN: expr('github.token') },
                        shell: 'bash',
                        run: discover,
                    },
                    {
                        uses: 'actions/checkout@v7',
                        if: ACTIVE,
                        with: {
                            ref: expr('github.sha'),
                            'persist-credentials': false,
                            'fetch-depth': 0,
                        },
                    },
                    ...setupSteps('', ACTIVE),
                    {
                        if: ACTIVE,
                        run: 'bun install --frozen-lockfile --ignore-scripts',
                    },
                    {
                        id: 'propose',
                        if: ACTIVE,
                        shell: 'bash',
                        env: { RUNTIME_MAIN_SHA: expr('github.sha') },
                        run:
                            'node tools/runtime-version-policy.mjs propose "' +
                            dataPath +
                            '/input" "' +
                            planPath +
                            '" >> "$GITHUB_OUTPUT"\n',
                    },
                    {
                        uses: 'actions/upload-artifact@v7',
                        if: "steps.propose.outputs.changed == 'true'",
                        with: {
                            name: planName,
                            path: planPath,
                            'if-no-files-found': 'error',
                            'retention-days': 1,
                        },
                    },
                ],
            },
            publish: {
                needs: 'prepare',
                if: expr(
                    "github.ref == 'refs/heads/main' && needs.prepare.outputs.changed == 'true'"
                ),
                'runs-on': 'ubuntu-latest',
                'timeout-minutes': 5,
                permissions: {
                    contents: 'write',
                    actions: 'write',
                    'pull-requests': 'read',
                },
                steps: [
                    {
                        uses: 'actions/checkout@v7',
                        with: {
                            ref: expr('github.sha'),
                            path: 'trusted-main',
                            'persist-credentials': false,
                            'fetch-depth': 0,
                        },
                    },
                    ...setupSteps('trusted-main/'),
                    {
                        'working-directory': 'trusted-main',
                        run: 'bun install --frozen-lockfile --ignore-scripts',
                    },
                    {
                        uses: 'actions/download-artifact@v7',
                        with: { name: planName, path: dataPath },
                    },
                    {
                        id: 'verify',
                        env: {
                            GH_TOKEN: expr('github.token'),
                            RUNTIME_MAIN_SHA: expr('github.sha'),
                        },
                        shell: 'bash',
                        run: revalidate,
                    },
                    {
                        env: {
                            GH_TOKEN: expr('github.token'),
                            RUNTIME_MAIN_SHA: expr('github.sha'),
                            BRANCH: expr('steps.verify.outputs.branch'),
                            EXPECTED_HEAD: expr('steps.verify.outputs.head'),
                            EXPECTED_BASE: expr('steps.verify.outputs.base'),
                            PR_NUMBER: expr('steps.verify.outputs.number'),
                            CHANGED_PATH: expr(
                                'steps.verify.outputs.changed_path'
                            ),
                            EDIT_PATH: expr('steps.verify.outputs.edit_path'),
                            RUNTIME: expr('steps.verify.outputs.runtime'),
                            TARGET: expr('steps.verify.outputs.target'),
                        },
                        shell: 'bash',
                        run: publish,
                    },
                ],
            },
            ...bundleJobs(),
        },
    };
}

export function runtimeWorkflowErrors(entries) {
    const errors = [];
    let align, ci;
    for (const { file, workflow: w } of entries) {
        if (file === 'runtime-version-alignment.yml') align = w;
        if (file === 'ci.yml') ci = w;
        if (/\b(?:NODE_VERSION|BUN_VERSION)\b/.test(JSON.stringify(w)))
            errors.push(file + ': pin de runtime concurrent');
        if (/\bdocker\s+(?:image\s+)?(?:push|login)\b/.test(JSON.stringify(w)))
            errors.push(file + ': publication/login Docker interdit');
        for (const [jobId, job] of Object.entries(w?.jobs ?? {})) {
            let nodeSeen = false;
            for (const [index, step] of (job.steps ?? []).entries()) {
                const type = step.uses?.startsWith('actions/setup-node@')
                    ? 'node'
                    : step.uses?.startsWith('oven-sh/setup-bun@')
                      ? 'bun'
                      : null;
                if (!type) continue;
                const source = type === 'node' ? '.nvmrc' : 'package.json';
                const key =
                    type === 'node' ? 'node-version-file' : 'bun-version-file';
                const candidateBun =
                    file === 'nx-migrations.yml' &&
                    jobId === 'qualification' &&
                    type === 'bun';
                const candidate =
                    expr('runner.temp') + '/nx-qualified-candidate';
                const prefix =
                    file === 'runtime-version-alignment.yml' &&
                    ['publish', 'publish-bundle'].includes(jobId)
                        ? 'trusted-main/'
                        : '';
                if (
                    !same(step.with, {
                        [key]: candidateBun
                            ? candidate + '/' + source
                            : prefix + source,
                    }) ||
                    step['continue-on-error'] !== undefined
                )
                    errors.push(
                        file +
                            ': sélection native unique manquante (' +
                            type +
                            ')'
                    );
                const expected = runtimeAssertion(
                    type,
                    prefix,
                    step.if,
                    nodeSeen
                );
                if (candidateBun) expected['working-directory'] = candidate;
                if (!same(job.steps[index + 1], expected))
                    errors.push(
                        file +
                            ': assertion immédiate manquante/neutralisée (' +
                            type +
                            ')'
                    );
                if (type === 'node') nodeSeen = true;
            }
        }
    }
    if (!same(align, alignmentWorkflow()))
        errors.push(
            'runtime-version-alignment.yml: contrat main/readonly/write/artefact modifié'
        );
    if (
        !same(ci?.on, {
            push: { branches: ['main'] },
            pull_request: { branches: ['main'] },
            workflow_dispatch: null,
        })
    )
        errors.push('CI image: événements ou chemins filtrés');
    const oracle = ci?.jobs?.oracle;
    if (
        oracle?.if !== undefined ||
        oracle?.['continue-on-error'] !== undefined ||
        oracle?.['timeout-minutes'] !== 45 ||
        !same(oracle.permissions, {
            contents: 'read',
            actions: 'read',
            'pull-requests': 'read',
        }) ||
        oracle.steps?.find((s) => s.uses?.startsWith('actions/checkout@'))
            ?.with?.['persist-credentials'] !== false
    )
        errors.push('Oracle image: plafond/permissions/checkout non conformes');
    const steps = oracle?.steps ?? [];
    const bundles = steps.filter((s) =>
        [
            'nx-bundle-production',
            'nx-bundle-freshness',
            'bundle-proposal',
            'bundle-proposal-upload',
        ].includes(s.id)
    );
    if (
        !same(bundles, bundleProductionSteps()) ||
        bundles.some(
            (s, i) => steps.indexOf(s) !== steps.indexOf(bundles[0]) + i
        )
    )
        errors.push(
            'Oracle bundle: build/fraîcheur/projection/artefact altérés'
        );
    const images = steps.filter((s) => s.id?.startsWith('production-image-'));
    if (
        !same(images, productionImageSteps()) ||
        steps.slice(-4).some((s, i) => !same(s, productionImageSteps()[i]))
    )
        errors.push(
            'Oracle image: build/smoke/contre-preuves absents ou neutralisés'
        );
    return errors;
}

export function bundleProductionSteps() {
    const active =
        "always() && !cancelled() && github.event_name == 'pull_request' && github.event.pull_request.user.login == 'dependabot[bot]' && steps.nx-bundle-production.outcome == 'success' && steps.nx-bundle-freshness.outcome == 'failure'";
    return [
        {
            name: 'Bundle production — budgets + baseline Linux',
            id: 'nx-bundle-production',
            env: {
                NX_CLOUD_ACCESS_TOKEN: expr(
                    "github.ref == 'refs/heads/main' && secrets.NX_CLOUD_ACCESS_TOKEN || ''"
                ),
                NX_NO_CLOUD: 'true',
            },
            run: 'bunx nx run backoffice-angular:build:production --skip-nx-cache\n',
        },
        {
            name: 'Bundle metrics — freshness',
            id: 'nx-bundle-freshness',
            run: 'bun run check:bundle-metrics-freshness\n',
        },
        {
            name: 'Bundle metrics — prepare data-only proposal',
            id: 'bundle-proposal',
            if: expr(active),
            env: { GH_TOKEN: expr('github.token') },
            run: 'node tools/bundle-metrics-proposal.mjs produce\n',
        },
        {
            name: 'Bundle metrics — upload data-only proposal',
            id: 'bundle-proposal-upload',
            if: expr(
                active + " && steps.bundle-proposal.outputs.active == 'true'"
            ),
            uses: 'actions/upload-artifact@v7',
            with: {
                name:
                    'bundle-metrics-' +
                    expr('github.run_id') +
                    '-' +
                    expr('github.run_attempt'),
                path: expr('runner.temp') + '/bundle-metrics-proposal/',
                'if-no-files-found': 'error',
                'retention-days': 1,
            },
        },
    ];
}

function bundleJobs() {
    const event =
        "github.ref == 'refs/heads/main' && github.event_name == 'workflow_run' && github.event.workflow_run.event == 'pull_request' && github.event.workflow_run.conclusion == 'failure' && github.event.workflow_run.head_repository.full_name == github.repository && startsWith(github.event.workflow_run.head_branch, 'dependabot/')";
    const job = (mode) => {
        const publish = mode === 'publish',
            prefix = publish ? 'trusted-main/' : '';
        return {
            ...(publish ? { needs: 'prepare-bundle' } : {}),
            if: expr(
                event +
                    (publish
                        ? " && needs['prepare-bundle'].outputs.active == 'true'"
                        : '')
            ),
            'runs-on': 'ubuntu-latest',
            'timeout-minutes': 5,
            permissions: {
                contents: publish ? 'write' : 'read',
                actions: publish ? 'write' : 'read',
                'pull-requests': 'read',
            },
            ...(publish
                ? {}
                : {
                      outputs: {
                          active: expr('steps.proposal.outputs.active'),
                      },
                  }),
            steps: [
                {
                    uses: 'actions/checkout@v7',
                    with: {
                        ref: expr('github.sha'),
                        ...(publish ? { path: 'trusted-main' } : {}),
                        'persist-credentials': false,
                        'fetch-depth': 0,
                    },
                },
                ...setupSteps(prefix),
                {
                    ...(publish ? { 'working-directory': 'trusted-main' } : {}),
                    run: 'bun install --frozen-lockfile --ignore-scripts',
                },
                {
                    id: 'proposal',
                    ...(publish ? { 'working-directory': 'trusted-main' } : {}),
                    env: { GH_TOKEN: expr('github.token') },
                    run:
                        'node tools/bundle-metrics-proposal.mjs ' + mode + '\n',
                },
            ],
        };
    };
    return {
        'prepare-bundle': job('prepare'),
        'publish-bundle': job('publish'),
    };
}
