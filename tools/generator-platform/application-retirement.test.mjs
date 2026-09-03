import assert from 'node:assert/strict';
import {
    access,
    mkdir,
    mkdtemp,
    readFile,
    rename,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { parseArgs } from '../retire-app.mjs';
import {
    planApplicationRetirement,
    publishApplicationRetirement,
    recoverApplicationRetirement,
} from './core/application-retirement.mjs';
import {
    planApplicationShell,
    publishApplicationShell,
} from './core/application-shell-publication.mjs';
import { writeApplicationDesignFixture } from './test-support/application-design-fixture.mjs';

const applicationDesignSchema = JSON.parse(
    await readFile(
        new URL('./schemas/application-design.schema.json', import.meta.url),
        'utf8'
    )
);
const backendContractSchema = JSON.parse(
    await readFile(
        new URL('./schemas/backend-contract.schema.json', import.meta.url),
        'utf8'
    )
);

async function exists(path) {
    try {
        await access(path);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
    }
}

async function fixture() {
    const root = await mkdtemp(join(tmpdir(), 'application-retirement-'));
    await mkdir(join(root, 'apps'));
    await mkdir(join(root, 'designs'));
    const data = await writeApplicationDesignFixture(
        root,
        backendContractSchema
    );
    await writeFile(
        join(root, 'designs/clean-street.application-design.json'),
        `${JSON.stringify(data.design, null, 2)}\n`
    );
    const shellOptions = {
        workspaceRoot: root,
        designPath: 'designs/clean-street.application-design.json',
        experienceId: 'citizen-web',
        appName: 'clean-street',
        profile: 'angular-pwa',
        applicationDesignSchema,
        backendContractSchema,
    };
    const shellPlan = await planApplicationShell(shellOptions);
    await publishApplicationShell(
        { ...shellOptions, planId: shellPlan.plan_id },
        { run: () => '' }
    );
    const dependencies = {
        findConsumers: () => [],
        findReferences: () => [],
        gitIdentity: () => ({ head: 'a'.repeat(40), branch: 'main' }),
        withLock: (_root, _app, operation) => operation(),
        assertStorage: () => undefined,
        install: () => undefined,
        postGate: () => undefined,
    };
    return { root, shellOptions, dependencies };
}

test('la CLI retire-app ferme dry-run/apply et reprise/abort', () => {
    assert.deepEqual(parseArgs(['--app', 'clean-street', '--dry-run']), {
        dryRun: true,
        resume: false,
        abort: false,
        appName: 'clean-street',
    });
    assert.deepEqual(parseArgs(['--app', 'clean-street', '--resume']), {
        dryRun: false,
        resume: true,
        abort: false,
        appName: 'clean-street',
    });
    assert.throws(
        () => parseArgs(['--app', 'clean-street', '--resume', '--abort']),
        /utilisé seul/
    );
});

test('retire une app possédée, publie le tombstone et prouve les gates', async () => {
    const data = await fixture();
    const plan = await planApplicationRetirement(
        { workspaceRoot: data.root, appName: 'clean-street' },
        data.dependencies
    );
    const calls = [];
    const result = await publishApplicationRetirement(
        {
            workspaceRoot: data.root,
            appName: 'clean-street',
            planId: plan.plan_id,
        },
        {
            ...data.dependencies,
            install: () => calls.push('install+frozen'),
            postGate: () => calls.push('nx-post-gate'),
        }
    );
    assert.equal(result.plan.tree_sha256, plan.tree_sha256);
    assert.deepEqual(calls, ['install+frozen', 'nx-post-gate']);
    assert.equal(await exists(join(data.root, 'apps/clean-street')), false);
    assert.equal(
        JSON.parse(
            await readFile(
                join(
                    data.root,
                    'docs/architecture/retired-apps/clean-street.json'
                ),
                'utf8'
            )
        ).kind,
        'retired-application'
    );
    await assert.rejects(
        () => planApplicationShell(data.shellOptions),
        /tombstone forbids implicit recreation/
    );
});

test('tout échec de gate restaure l’app et retire son tombstone', async () => {
    const data = await fixture();
    const plan = await planApplicationRetirement(
        { workspaceRoot: data.root, appName: 'clean-street' },
        data.dependencies
    );
    await assert.rejects(
        () =>
            publishApplicationRetirement(
                {
                    workspaceRoot: data.root,
                    appName: 'clean-street',
                    planId: plan.plan_id,
                },
                {
                    ...data.dependencies,
                    install: () => {
                        throw new Error('frozen lock failure');
                    },
                }
            ),
        /frozen lock failure/
    );
    assert.equal(
        await exists(join(data.root, 'apps/clean-street/project.json')),
        true
    );
    assert.equal(
        await exists(
            join(data.root, 'docs/architecture/retired-apps/clean-street.json')
        ),
        false
    );
});

test('refuse consommateurs Nx et références textuelles avant écriture', async () => {
    const data = await fixture();
    await assert.rejects(
        () =>
            planApplicationRetirement(
                { workspaceRoot: data.root, appName: 'clean-street' },
                {
                    ...data.dependencies,
                    findConsumers: () => [
                        {
                            consumer: 'portal',
                            target: 'clean-street',
                            type: 'static',
                        },
                    ],
                }
            ),
        /incoming Nx consumers/
    );
    await assert.rejects(
        () =>
            planApplicationRetirement(
                { workspaceRoot: data.root, appName: 'clean-street' },
                {
                    ...data.dependencies,
                    findReferences: () => ['transloco.config.ts'],
                }
            ),
        /external references/
    );
});

test('reprend une transaction interrompue après déplacement exact', async () => {
    const data = await fixture();
    const plan = await planApplicationRetirement(
        { workspaceRoot: data.root, appName: 'clean-street' },
        data.dependencies
    );
    const transaction = join(
        data.root,
        '.cmz/retire-app-transactions/clean-street'
    );
    const backup = join(transaction, 'app');
    const tombstonePath = join(
        data.root,
        'docs/architecture/retired-apps/clean-street.json'
    );
    const tombstone = `${JSON.stringify(
        {
            schema_version: '1.0.0',
            kind: 'retired-application',
            app_name: 'clean-street',
            design_ref: plan.design_ref,
            retired_tree_sha256: plan.tree_sha256,
            git_head: plan.git_head,
        },
        null,
        2
    )}\n`;
    await mkdir(transaction, { recursive: true });
    await rename(join(data.root, 'apps/clean-street'), backup);
    await mkdir(join(data.root, 'docs/architecture/retired-apps'), {
        recursive: true,
    });
    await writeFile(tombstonePath, tombstone);
    const tombstoneHash = await import('node:crypto').then(({ createHash }) =>
        createHash('sha256').update(tombstone).digest('hex')
    );
    await writeFile(
        join(transaction, 'state.json'),
        `${JSON.stringify(
            {
                schema_version: '1.0.0',
                phase: 'moved',
                plan_id: plan.plan_id,
                app_name: 'clean-street',
                output: 'apps/clean-street',
                tree_sha256: plan.tree_sha256,
                tombstone: 'docs/architecture/retired-apps/clean-street.json',
                tombstone_parent_existed: false,
                tombstone_sha256: tombstoneHash,
            },
            null,
            2
        )}\n`
    );
    await recoverApplicationRetirement(
        {
            workspaceRoot: data.root,
            appName: 'clean-street',
            abort: false,
        },
        data.dependencies
    );
    assert.equal(await exists(transaction), false);
    assert.equal(await exists(join(data.root, 'apps/clean-street')), false);
});
