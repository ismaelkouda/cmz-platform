import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { collectVisualEvaluation } from './core/visual-evaluation.mjs';

const [planSchema, presentationSchema, bundleSchema] = await Promise.all(
    [
        'visual-evaluation-plan',
        'presentation-evidence',
        'visual-evaluation-bundle',
    ].map(async (name) =>
        JSON.parse(
            await readFile(
                new URL(`./schemas/${name}.schema.json`, import.meta.url),
                'utf8'
            )
        )
    )
);

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function png(width = 1024, height = 768) {
    const content = Buffer.alloc(24);
    Buffer.from('89504e470d0a1a0a', 'hex').copy(content);
    Buffer.from('49484452', 'hex').copy(content, 12);
    content.writeUInt32BE(width, 16);
    content.writeUInt32BE(height, 20);
    return content;
}

async function fixture() {
    const root = await mkdtemp(join(tmpdir(), 'visual-evaluation-'));
    const resultsRoot = join(root, 'test-results');
    await Promise.all([
        mkdir(join(root, 'designs'), { recursive: true }),
        mkdir(join(root, 'references'), { recursive: true }),
        mkdir(join(root, 'apps/proof/e2e'), { recursive: true }),
        mkdir(join(resultsRoot, 'scenario'), { recursive: true }),
    ]);

    const reference = png();
    const actual = png();
    const title = 'rend un état invalide comparable';
    const captureName = 'medium-create-invalid.actual.png';
    await Promise.all([
        writeFile(join(root, 'references/medium-invalid.png'), reference),
        writeFile(
            join(root, 'apps/proof/e2e/create.spec.ts'),
            `test('${title}', async () => {});\n`
        ),
        writeFile(join(resultsRoot, 'scenario', captureName), actual),
        writeFile(
            join(resultsRoot, 'scenario', `${captureName}.metadata.json`),
            `${JSON.stringify({
                browser_name: 'chromium',
                browser_version: '140.0.0.0',
                browser_channel: 'bundled',
            })}\n`
        ),
    ]);

    const presentation = {
        schema_version: '1.0.0',
        kind: 'presentation-evidence',
        presentation_id: 'presentation_aaaaaaaaaaaaaaaa',
        page_id: 'page_bbbbbbbbbbbbbbbb',
        status: 'approved',
        authority: 'presentation-only',
        sources: [
            {
                id: 'medium-create-invalid',
                source_kind: 'wireframe',
                purpose: 'feedback',
                snapshot_uri: 'references/medium-invalid.png',
                media_type: 'image/png',
                bytes: reference.byteLength,
                sha256: sha256(reference),
                trust: 'untrusted-content',
                state_ids: ['ready'],
                viewport: { width: 1024, height: 768, pixel_ratio: 1 },
            },
        ],
    };
    const plan = {
        schema_version: '1.0.0',
        kind: 'visual-evaluation-plan',
        evaluation_id: 'visual-evaluation_cccccccccccccccc',
        page_id: presentation.page_id,
        presentation_id: presentation.presentation_id,
        presentation_evidence_uri: 'designs/presentation.json',
        cases: [
            {
                id: 'medium-create-invalid',
                reference_source_id: 'medium-create-invalid',
                viewport: { width: 1024, height: 768, pixel_ratio: 1 },
                runtime_scenario: {
                    spec_uri: 'apps/proof/e2e/create.spec.ts',
                    test_title: title,
                    capture_name: captureName,
                },
                review_dimensions: ['feedback-state', 'layout-geometry'],
            },
        ],
    };
    await Promise.all([
        writeFile(
            join(root, 'designs/presentation.json'),
            `${JSON.stringify(presentation, null, 2)}\n`
        ),
        writeFile(
            join(root, 'designs/evaluation.json'),
            `${JSON.stringify(plan, null, 2)}\n`
        ),
    ]);
    return { root, resultsRoot, presentation, plan, reference, actual };
}

async function collect(data) {
    return collectVisualEvaluation({
        workspaceRoot: data.root,
        planPath: 'designs/evaluation.json',
        planSchema,
        presentationSchema,
        bundleSchema,
        resultsRoot: data.resultsRoot,
    });
}

test('lie une référence approuvée à un unique rendu réel sans produire de verdict', async () => {
    const data = await fixture();
    const bundle = await collect(data);

    assert.equal(bundle.status, 'captured-unreviewed');
    assert.equal(bundle.cases[0].review.status, 'pending-human-review');
    assert.equal(bundle.cases[0].review.authority, 'human');
    assert.equal(bundle.cases[0].reference.sha256, sha256(data.reference));
    assert.equal(bundle.cases[0].actual.sha256, sha256(data.actual));
    assert.equal(bundle.render_environment.browser_version, '140.0.0.0');
    assert.equal(bundle.render_environment.browser_channel, 'bundled');
    assert.equal(Object.hasOwn(bundle, 'score'), false);
    assert.equal(Object.hasOwn(bundle.cases[0], 'verdict'), false);
});

test('refuse une référence absente, un viewport divergent et un hash périmé', async () => {
    for (const mutate of [
        (data) => {
            data.plan.cases[0].reference_source_id = 'unknown-reference';
        },
        (data) => {
            data.plan.cases[0].viewport.width = 900;
        },
        (data) => {
            data.presentation.sources[0].sha256 = '0'.repeat(64);
        },
        (data) => {
            data.presentation.unreviewed_override = true;
        },
    ]) {
        const data = await fixture();
        mutate(data);
        await Promise.all([
            writeFile(
                join(data.root, 'designs/presentation.json'),
                `${JSON.stringify(data.presentation, null, 2)}\n`
            ),
            writeFile(
                join(data.root, 'designs/evaluation.json'),
                `${JSON.stringify(data.plan, null, 2)}\n`
            ),
        ]);
        await assert.rejects(
            () => collect(data),
            /unknown presentation source|viewport differs|sha256 drifted|presentation evidence violates schema/
        );
    }
});

test('refuse un scénario renommé, une capture dupliquée ou de mauvaises dimensions', async () => {
    const stale = await fixture();
    stale.plan.cases[0].runtime_scenario.test_title = 'ancien titre';
    await writeFile(
        join(stale.root, 'designs/evaluation.json'),
        `${JSON.stringify(stale.plan, null, 2)}\n`
    );
    await assert.rejects(() => collect(stale), /test title is stale/);

    const duplicated = await fixture();
    await mkdir(join(duplicated.resultsRoot, 'duplicate'));
    await writeFile(
        join(
            duplicated.resultsRoot,
            'duplicate',
            'medium-create-invalid.actual.png'
        ),
        png()
    );
    await assert.rejects(() => collect(duplicated), /found 2/);

    const wrongSize = await fixture();
    await writeFile(
        join(
            wrongSize.resultsRoot,
            'scenario',
            'medium-create-invalid.actual.png'
        ),
        png(900, 768)
    );
    await assert.rejects(
        () => collect(wrongSize),
        /PNG dimensions differ from viewport/
    );

    const missingMetadata = await fixture();
    await unlink(
        join(
            missingMetadata.resultsRoot,
            'scenario',
            'medium-create-invalid.actual.png.metadata.json'
        )
    );
    await assert.rejects(
        () => collect(missingMetadata),
        /metadata\.json, found 0/
    );
});
