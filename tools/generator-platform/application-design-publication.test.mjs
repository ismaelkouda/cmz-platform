import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { parseArgs } from '../compile-application-design.mjs';
import {
    planApplicationDesignPublication,
    publishApplicationDesign,
} from './core/application-design-publication.mjs';
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

async function fixture() {
    const root = await mkdtemp(join(tmpdir(), 'design-publication-'));
    await mkdir(join(root, 'draft'));
    await mkdir(join(root, 'designs'));
    const data = await writeApplicationDesignFixture(
        root,
        backendContractSchema
    );
    await writeFile(
        join(root, 'draft/design.yaml'),
        `${JSON.stringify(data.design, null, 2)}\n`
    );
    return {
        workspaceRoot: root,
        sourcePath: 'draft/design.yaml',
        outputPath: 'designs/clean-street.application-design.json',
        applicationDesignSchema,
        backendContractSchema,
    };
}

test('la CLI exige exactement dry-run ou un plan SHA-256', () => {
    assert.deepEqual(
        parseArgs(['--source', 'a.yaml', '--out', 'b.json', '--dry-run']),
        {
            dryRun: true,
            sourcePath: 'a.yaml',
            outputPath: 'b.json',
        }
    );
    assert.throws(
        () => parseArgs(['--source', 'a.yaml', '--out', 'b.json']),
        /exactement --dry-run ou --apply/
    );
    assert.throws(
        () =>
            parseArgs([
                '--source',
                'a.yaml',
                '--out',
                'b.json',
                '--apply',
                'invalid',
            ]),
        /SHA-256 valide/
    );
});

test('dry-run ne produit aucun octet puis apply publie atomiquement', async () => {
    const options = await fixture();
    const plan = await planApplicationDesignPublication(options);
    assert.match(plan.plan_id, /^[a-f0-9]{64}$/);
    await assert.rejects(
        () => readFile(join(options.workspaceRoot, options.outputPath)),
        /ENOENT/
    );
    const result = await publishApplicationDesign({
        ...options,
        planId: plan.plan_id,
    });
    assert.equal(result.already_published, false);
    assert.deepEqual(
        await readFile(join(options.workspaceRoot, options.outputPath)),
        plan.content
    );
    assert.equal(
        (
            await publishApplicationDesign({
                ...options,
                planId: plan.plan_id,
            })
        ).already_published,
        true
    );
});

test('refuse plan périmé et dépendance modifiée sans publier', async () => {
    const stalePlan = await fixture();
    await assert.rejects(
        () =>
            publishApplicationDesign({
                ...stalePlan,
                planId: 'f'.repeat(64),
            }),
        /reviewed plan id is stale/
    );

    const staleDependency = await fixture();
    const plan = await planApplicationDesignPublication(staleDependency);
    await writeFile(
        join(staleDependency.workspaceRoot, 'design/project-brief.md'),
        '# changed after review\n'
    );
    await assert.rejects(
        () =>
            publishApplicationDesign({
                ...staleDependency,
                planId: plan.plan_id,
            }),
        /sha256 mismatch/
    );
    await assert.rejects(
        () =>
            readFile(
                join(staleDependency.workspaceRoot, staleDependency.outputPath)
            ),
        /ENOENT/
    );
});
