import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import {
    ALLOWED_SECRET_HANDOVERS,
    checkWorkflows,
    classifySecretUse,
    eventViolations,
    permissionViolations,
    secretViolations,
    tokenizeExpression,
    workflowEvents,
} from './check-workflow-privileges.mjs';

const TRUSTED = "github.ref == 'refs/heads/main'";
const HANDOVER = (name) => `\${{ ${TRUSTED} && secrets.${name} || '' }}`;
const DISPATCH = '  schedule:\n    - cron: "0 0 * * *"\n  workflow_dispatch:';
const REVIEWED = {
    'f.yml': {
        events: ['schedule', 'workflow_dispatch'],
        jobs: { publish: ['contents'] },
    },
};

function readOnly(on, body) {
    return `name: F\non:\n${on}\npermissions:\n  contents: read\n${body}`;
}

// Remise relue des gabarits ci-dessous : job `a`, étape `s`, variable `T`.
const HANDOVERS = { 'f.yml': { a: { s: { T: 'A' } } } };

function runStep(value, id = 's') {
    const identity = id === null ? '' : `        id: ${id}\n`;
    return `jobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo ok\n${identity}        env:\n          T: ${value}\n`;
}

function publishJob(on, condition) {
    return `name: F\non:\n${on}\njobs:\n  publish:\n    runs-on: ubuntu-latest\n${condition}    permissions:\n      contents: write\n    steps:\n      - run: echo ok\n`;
}

function check(content, writes = {}, handovers = {}) {
    return checkWorkflows([{ file: 'f.yml', content }], { writes, handovers });
}

// ─── Événements ─────────────────────────────────────────────────────────────

test('lit les trois écritures de `on`', () => {
    assert.deepEqual(workflowEvents({ on: 'push' }), ['push']);
    assert.deepEqual(workflowEvents({ on: ['push', 'pull_request'] }), [
        'pull_request',
        'push',
    ]);
    assert.deepEqual(workflowEvents({ on: { schedule: [], push: null } }), [
        'push',
        'schedule',
    ]);
    assert.equal(workflowEvents({}), null);
});

test('refuse un événement non relu et un `on` absent', () => {
    for (const event of [
        'pull_request_target',
        'workflow_run',
        'workflow_call',
    ])
        assert.match(
            eventViolations('f.yml', { on: { [event]: null } })[0],
            new RegExp(`événement \`${event}\` non relu`)
        );
    assert.match(eventViolations('f.yml', {})[0], /absents ou illisibles/);
    assert.deepEqual(
        eventViolations('f.yml', { on: ['push', 'schedule'] }),
        []
    );
});

// ─── Jetons et écritures ────────────────────────────────────────────────────

test('accepte un jeton racine en lecture et un bloc racine vide', () => {
    for (const permissions of [{ contents: 'read' }, {}])
        assert.deepEqual(
            permissionViolations('f.yml', {
                on: 'push',
                permissions,
                jobs: { build: {}, test: {} },
            }),
            []
        );
});

test('refuse un job sans bloc quand le workflow ne borne rien', () => {
    const violations = permissionViolations('f.yml', {
        on: 'push',
        jobs: { build: {}, test: { permissions: { contents: 'read' } } },
    });
    assert.equal(violations.length, 1);
    assert.match(violations[0], /f\.yml › build : aucun bloc/);
});

test('refuse write-all, read-all et une écriture racine', () => {
    assert.match(
        permissionViolations('f.yml', {
            on: 'push',
            permissions: 'write-all',
            jobs: { a: {} },
        })[0],
        /permissions: write-all/
    );
    assert.match(
        permissionViolations('f.yml', {
            on: 'push',
            permissions: {},
            jobs: { a: { permissions: 'read-all' } },
        })[0],
        /f\.yml › a : `permissions: read-all`/
    );
    assert.match(
        permissionViolations('f.yml', {
            on: 'push',
            permissions: { contents: 'write' },
            jobs: { a: {} },
        })[0],
        /écriture `contents` accordée à tous les jobs/
    );
});

test('accepte une écriture relue, liée à ses événements et à main', () => {
    assert.deepEqual(
        check(publishJob(DISPATCH, `    if: ${TRUSTED} && true\n`), REVIEWED),
        []
    );
    assert.deepEqual(
        check(publishJob(DISPATCH, `    if: \${{ ${TRUSTED} }}\n`), REVIEWED),
        []
    );
});

test('refuse une écriture absente de la liste, ou une liste périmée', () => {
    assert.match(
        check(publishJob(DISPATCH, `    if: ${TRUSTED} && true\n`))[0],
        /écriture non relue \(contents\)/
    );
    assert.match(
        check(publishJob(DISPATCH, `    if: ${TRUSTED} && true\n`), {
            'f.yml': {
                events: ['schedule', 'workflow_dispatch'],
                jobs: { publish: ['contents', 'issues'] },
            },
        })[0],
        /liste issues que le job ne demande plus/
    );
    assert.match(
        check(
            readOnly(DISPATCH, 'jobs:\n  a:\n    runs-on: x\n'),
            REVIEWED
        ).join('\n'),
        /cite le job `publish`, absent/
    );
});

test('refuse une écriture relue déclenchée par un autre événement', () => {
    assert.match(
        check(
            publishJob('  pull_request:', `    if: ${TRUSTED} && true\n`),
            REVIEWED
        ).join('\n'),
        /relues pour les événements schedule, workflow_dispatch ; le workflow se déclenche sur pull_request/
    );
});

test('refuse une écriture que ne garde pas la ref main', () => {
    for (const condition of [
        '',
        "    if: needs.a.outputs.x == 'true'\n",
        `    if: ${TRUSTED} && false || always()\n`,
        `    if: always() && ${TRUSTED}\n`,
        "    if: github.ref == 'refs/heads/mainx' && true\n",
        "    if: github.ref != 'refs/heads/main' && true\n",
        `    if: ${TRUSTED} != true\n`,
        `    if: ${TRUSTED} == false && true\n`,
    ])
        assert.match(
            check(publishJob(DISPATCH, condition), REVIEWED).join('\n'),
            /un job qui écrit doit porter `if: github\.ref == 'refs\/heads\/main' && …`/,
            condition
        );
});

// ─── Secrets ────────────────────────────────────────────────────────────────

test('découpe une expression et échoue sur un caractère inconnu', () => {
    assert.deepEqual(tokenizeExpression("a.b-c == 'it''s' && !x[0]"), [
        'a',
        '.',
        'b-c',
        '==',
        "'it''s'",
        '&&',
        '!',
        'x',
        '[',
        '0',
        ']',
    ]);
    assert.equal(tokenizeExpression('a ? b : c'), null);
});

test('classe les usages du contexte secrets', () => {
    const kind = (expression) => classifySecretUse(expression).kind;
    assert.deepEqual(classifySecretUse(` ${TRUSTED} && secrets.A || '' `), {
        kind: 'handover',
        name: 'A',
    });
    assert.equal(kind("secrets.A == '' && 'true' || 'false'"), 'test');
    assert.equal(
        kind("(github.ref != 'refs/heads/main' || secrets.A != '') && 'x'"),
        'test'
    );
    assert.equal(kind('needs.secrets.result'), 'none');
    assert.equal(kind("steps.secrets.outputs.found == 'true'"), 'none');
    assert.equal(kind("contains(github.ref, 'secrets')"), 'none');
    for (const expression of [
        'secrets.A',
        "secrets['A']",
        'toJSON(secrets)',
        'SECRETS.A',
        'secrets.*',
        `${TRUSTED} && secrets.A || secrets.B`,
        `${TRUSTED} && secrets.A`,
        `${TRUSTED} && secrets.A || 'x'`,
        `secrets.A || ${TRUSTED} && 'x'`,
        "github.ref == 'refs/heads/main2' && secrets.A || ''",
        "github.ref != 'refs/heads/main' && secrets.A || ''",
        "github.base_ref == 'refs/heads/main' && secrets.A || ''",
        "secrets.A == '' && secrets.B",
        "'' == secrets.A",
        "secrets.A == 'guess'",
        'secrets.A ? 1 : 2',
    ])
        assert.equal(kind(expression), 'unrecognized', expression);
});

test('accepte un secret gardé dans l’env d’une étape run relue', () => {
    assert.deepEqual(
        check(readOnly('  push:', runStep(HANDOVER('A'))), {}, HANDOVERS),
        []
    );
});

test('accepte un test de vacuité n’importe où', () => {
    assert.deepEqual(
        check(
            readOnly(
                '  pull_request:',
                `env:\n  OFF: \${{ secrets.A == '' && 'true' || 'false' }}\njobs:\n  a:\n    runs-on: x\n    if: secrets.A != ''\n    steps:\n      - run: echo ok\n`
            )
        ),
        []
    );
});

test('ne confond pas le contexte secrets avec un job ou un script du même nom', () => {
    assert.deepEqual(
        check(
            readOnly(
                '  push:',
                "jobs:\n  secrets:\n    runs-on: x\n    steps:\n      - name: Scan secrets\n        run: node tools/check-secrets.mjs\n  after:\n    needs: secrets\n    if: needs.secrets.result == 'success'\n    runs-on: x\n    steps:\n      - run: echo ok\n"
            )
        ),
        []
    );
});

test('refuse tout usage non reconnu du contexte secrets', () => {
    for (const value of [
        '${{ secrets.BAD }}',
        "${{ secrets['BAD'] }}",
        '${{ toJSON(secrets) }}',
        '${{ SECRETS.BAD }}',
        `\${{ ${TRUSTED} && secrets.A || secrets.B }}`,
    ])
        assert.match(
            check(readOnly('  pull_request:', runStep(value)))[0],
            /f\.yml › jobs\.a\.steps\.0\.env\.T : usage du contexte `secrets` non reconnu/,
            value
        );
    assert.match(
        check(
            readOnly(
                '  pull_request:',
                'jobs:\n  a:\n    runs-on: x\n    if: secrets.BAD\n    steps:\n      - run: echo ok\n'
            )
        )[0],
        /f\.yml › jobs\.a\.if : usage du contexte `secrets` non reconnu/
    );
});

test('refuse un secret gardé remis ailleurs que dans l’env d’une étape run', () => {
    const misplaced = {
        'env.T': `env:\n  T: ${HANDOVER('A')}\njobs:\n  a:\n    runs-on: x\n    steps:\n      - run: echo ok\n`,
        'jobs.a.env.T': `jobs:\n  a:\n    runs-on: x\n    env:\n      T: ${HANDOVER('A')}\n    steps:\n      - run: echo ok\n`,
        'jobs.a.steps.0.with.token': `jobs:\n  a:\n    runs-on: x\n    steps:\n      - uses: some/action@v1\n        with:\n          token: ${HANDOVER('A')}\n`,
        'jobs.a.steps.0.env.T': `jobs:\n  a:\n    runs-on: x\n    steps:\n      - uses: some/action@v1\n        env:\n          T: ${HANDOVER('A')}\n`,
        'jobs.a.steps.0.run': `jobs:\n  a:\n    runs-on: x\n    steps:\n      - run: echo ${HANDOVER('A')}\n`,
    };
    for (const [path, body] of Object.entries(misplaced)) {
        const violations = check(readOnly('  push:', body));
        assert.equal(violations.length, 1, path);
        assert.ok(
            violations[0].startsWith(
                `f.yml › ${path} : \`secrets.A\` n'est remis qu'à l'\`env\` d'une étape \`run\``
            ),
            violations[0]
        );
    }
    assert.match(
        check(readOnly('  push:', runStep(`prefix-${HANDOVER('A')}`)))[0],
        /n'est remis qu'à l'`env` d'une étape `run`/
    );
    assert.match(
        check(
            readOnly(
                '  push:',
                `jobs:\n  a:\n    runs-on: x\n    steps:\n      - run: echo ok\n        env:\n          T:\n            - ${HANDOVER('A')}\n`
            )
        )[0],
        /f\.yml › jobs\.a\.steps\.0\.env\.T\.0 : `secrets\.A` n'est remis qu'à l'`env`/
    );
});

// ─── Liste fermée des remises ───────────────────────────────────────────────

test('refuse un secret arbitraire dans une étape run, même gardé par main', () => {
    const untrusted = readOnly(
        '  push:',
        `jobs:\n  build:\n    runs-on: x\n    steps:\n      - name: Install untrusted dependencies\n        id: install\n        run: bun install\n        env:\n          PRODUCTION_DATABASE_TOKEN: ${HANDOVER('PRODUCTION_DATABASE_TOKEN')}\n`
    );
    assert.deepEqual(check(untrusted), [
        "f.yml › build › install › PRODUCTION_DATABASE_TOKEN › PRODUCTION_DATABASE_TOKEN : remise de secret non relue ; l'ajouter à ALLOWED_SECRET_HANDOVERS après revue.",
    ]);
});

test('lie une remise au job, à l’étape, à la variable et au secret', () => {
    const cases = {
        'autre job': {
            content: runStep(HANDOVER('A')).replace('  a:', '  b:'),
            unreviewed: 'b › s › T › A',
        },
        'autre étape': {
            content: runStep(HANDOVER('A'), 'install'),
            unreviewed: 'a › install › T › A',
        },
        'autre variable': {
            content: runStep(HANDOVER('A')).replace('T:', 'U:'),
            unreviewed: 'a › s › U › A',
        },
        'autre secret': {
            content: runStep(HANDOVER('B')),
            unreviewed: 'a › s › T › B',
        },
    };
    for (const [name, { content, unreviewed }] of Object.entries(cases))
        assert.deepEqual(
            check(readOnly('  push:', content), {}, HANDOVERS),
            [
                `f.yml › ${unreviewed} : remise de secret non relue ; l'ajouter à ALLOWED_SECRET_HANDOVERS après revue.`,
                'f.yml : ALLOWED_SECRET_HANDOVERS cite a › s › T › A, que le workflow ne remet plus.',
            ],
            name
        );
});

test('refuse une remise dans une étape sans id, ou d’id vide', () => {
    // Une liste qui citerait l'id vide ne doit pas rouvrir la porte.
    const emptyId = { 'f.yml': { a: { '': { T: 'A' } } } };
    for (const [id, handovers] of [
        [null, {}],
        ["''", emptyId],
    ])
        assert.equal(
            check(
                readOnly('  push:', runStep(HANDOVER('A'), id)),
                {},
                handovers
            )[0],
            "f.yml › jobs.a.steps.0.env.T : l'étape qui reçoit `secrets.A` doit porter un `id` ; ALLOWED_SECRET_HANDOVERS lie chaque remise à une étape nommée.",
            String(id)
        );
});

test('refuse une entrée de liste que le workflow ne remet plus', () => {
    assert.deepEqual(
        check(readOnly('  push:', runStep("'x'")), {}, HANDOVERS),
        [
            'f.yml : ALLOWED_SECRET_HANDOVERS cite a › s › T › A, que le workflow ne remet plus.',
        ]
    );
});

test('refuse deux étapes de même id qui reçoivent la même remise', () => {
    const twice = `${runStep(HANDOVER('A'))}      - run: bun install\n        id: s\n        env:\n          T: ${HANDOVER('A')}\n`;
    assert.deepEqual(check(readOnly('  push:', twice), {}, HANDOVERS), [
        'f.yml › a › s › T › A : remise présente dans deux étapes de même `id` ; une entrée relue vaut pour une seule étape.',
    ]);
});

// Les vrais workflows, pas des gabarits : la liste fermée doit décrire le
// dépôt tel qu'il est, et refuser qu'un jeton y change d'étape.
function repositoryWorkflows(transform = {}) {
    return ['ci.yml', 'corpus-full.yml', 'nightly-integration.yml'].map(
        (file) => {
            const content = readFileSync(
                new URL(`../.github/workflows/${file}`, import.meta.url),
                'utf8'
            );
            return {
                file,
                content: transform[file] ? transform[file](content) : content,
            };
        }
    );
}

test('les remises du dépôt sont exactement celles de la liste fermée', () => {
    assert.deepEqual(
        checkWorkflows(repositoryWorkflows(), {
            writes: {},
            handovers: ALLOWED_SECRET_HANDOVERS,
        }),
        []
    );
});

test('refuse le jeton Nx déplacé vers Install dependencies dans ci.yml', () => {
    const moveTokenToInstall = (content) => {
        const workflow = parseYaml(content);
        const { steps } = workflow.jobs.oracle;
        const lint = steps.find((step) => step.id === 'nx-lint');
        const install = steps.find(
            (step) => step.name === 'Install dependencies'
        );
        assert.equal(install.run, 'bun install --frozen-lockfile');
        install.env = { NX_CLOUD_ACCESS_TOKEN: lint.env.NX_CLOUD_ACCESS_TOKEN };
        delete lint.env.NX_CLOUD_ACCESS_TOKEN;
        return stringifyYaml(workflow);
    };
    const violations = checkWorkflows(
        repositoryWorkflows({ 'ci.yml': moveTokenToInstall }),
        { writes: {}, handovers: ALLOWED_SECRET_HANDOVERS }
    );
    assert.equal(violations.length, 2, violations.join('\n'));
    assert.match(
        violations[0],
        /ci\.yml › jobs\.oracle\.steps\.\d+\.env\.NX_CLOUD_ACCESS_TOKEN : l'étape qui reçoit `secrets\.NX_CLOUD_ACCESS_TOKEN` doit porter un `id`/
    );
    assert.equal(
        violations[1],
        'ci.yml : ALLOWED_SECRET_HANDOVERS cite oracle › nx-lint › NX_CLOUD_ACCESS_TOKEN › NX_CLOUD_ACCESS_TOKEN, que le workflow ne remet plus.'
    );
});

test('refuse la transmission de secrets à un workflow appelé', () => {
    for (const secrets of ['inherit', `\n      T: ${HANDOVER('A')}`])
        assert.match(
            check(
                readOnly(
                    '  push:',
                    `jobs:\n  call:\n    uses: ./.github/workflows/x.yml\n    secrets: ${secrets}\n`
                )
            ).join('\n'),
            /f\.yml › call : `secrets:` transmet des secrets à un workflow appelé/
        );
});

test('la garde main ne vaut rien sous pull_request_target', () => {
    assert.match(
        check(
            readOnly('  pull_request_target:', runStep(HANDOVER('A'))),
            {},
            HANDOVERS
        )[0],
        /événement `pull_request_target` non relu/
    );
});

// ─── Agrégation ─────────────────────────────────────────────────────────────

test('checkWorkflows refuse un YAML illisible et un fichier cité mais absent', () => {
    assert.match(
        checkWorkflows([{ file: 'f.yml', content: 'a: [1' }], {
            writes: {},
            handovers: {},
        })[0],
        /f\.yml : YAML illisible/
    );
    assert.match(
        checkWorkflows([{ file: 'f.yml', content: '- a\n' }], {
            writes: {},
            handovers: {},
        })[0],
        /n'est pas un mapping YAML/
    );
    assert.deepEqual(
        checkWorkflows(
            [{ file: 'f.yml', content: readOnly('  push:', runStep("'x'")) }],
            {
                writes: { 'gone.yml': { events: ['push'], jobs: {} } },
                handovers: { 'lost.yml': {}, 'gone.yml': {} },
            }
        ),
        [
            'gone.yml : cité par ce garde mais introuvable.',
            'lost.yml : cité par ce garde mais introuvable.',
        ]
    );
});

test('secretViolations parcourt aussi les matrices et les tableaux', () => {
    assert.match(
        secretViolations('f.yml', {
            jobs: {
                a: { strategy: { matrix: { v: ['${{ secrets.BAD }}'] } } },
            },
        })[0],
        /f\.yml › jobs\.a\.strategy\.matrix\.v\.0 : usage du contexte `secrets` non reconnu/
    );
});
