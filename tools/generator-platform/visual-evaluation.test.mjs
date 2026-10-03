import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { collectVisualEvaluation } from './core/visual-evaluation.mjs';

const [
    planSchema,
    presentationSchema,
    reviewProtocolSchema,
    runtimeEvidenceSchema,
    bundleSchema,
] = await Promise.all(
    [
        'visual-evaluation-plan',
        'presentation-evidence',
        'visual-review-protocol',
        'visual-runtime-evidence',
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
    const evidenceName = 'medium-create-invalid.evidence.json';
    const evidence = {
        schema_version: '1.0.0',
        kind: 'visual-runtime-evidence',
        case_id: 'medium-create-invalid',
        viewport: { width: 1024, height: 768, pixel_ratio: 1 },
        findings: [
            {
                criterion_id: 'accessibility.dialog-semantics',
                outcome: 'pass',
                facts: [{ id: 'role', actual: 'dialog', expected: 'dialog' }],
            },
            {
                criterion_id: 'visual.feedback-legibility',
                outcome: 'pass',
                facts: [
                    {
                        id: 'field-error-count',
                        actual: 5,
                        expected: 5,
                    },
                ],
            },
        ],
    };
    await Promise.all([
        writeFile(join(root, 'references/medium-invalid.png'), reference),
        writeFile(
            join(root, 'apps/proof/e2e/create.spec.ts'),
            `test('${title}', async () => {});\n`
        ),
        writeFile(join(resultsRoot, 'scenario', captureName), actual),
        writeFile(
            join(resultsRoot, 'scenario', evidenceName),
            `${JSON.stringify(evidence, null, 2)}\n`
        ),
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
    const reviewProtocol = {
        schema_version: '1.0.0',
        kind: 'visual-review-protocol',
        protocol_id: 'visual-review_dddddddddddddddd',
        status: 'approved',
        authority: 'human',
        sources: [
            {
                id: 'wcag-2.2',
                source_kind: 'official',
                title: 'WCAG 2.2',
                uri: 'https://www.w3.org/TR/WCAG22/',
                version: '2.2',
                verified_on: '2026-10-03',
            },
        ],
        criteria: [
            {
                id: 'accessibility.dialog-semantics',
                dimension: 'accessibility-semantics',
                title: 'Dialogue accessible',
                question: 'Le dialogue expose-t-il ses propriétés ?',
                evidence_mode: 'deterministic',
                blocking: true,
                source_refs: ['wcag-2.2#4.1.2'],
            },
            {
                id: 'visual.feedback-legibility',
                dimension: 'feedback-legibility',
                title: 'Retour lisible',
                question: "L'erreur est-elle rapidement compréhensible ?",
                evidence_mode: 'hybrid',
                blocking: true,
                source_refs: ['wcag-2.2#3.3.1'],
            },
            {
                id: 'visual.reference-fidelity',
                dimension: 'reference-fidelity',
                title: 'Fidélité sémantique',
                question: "L'intention visuelle est-elle préservée ?",
                evidence_mode: 'human',
                blocking: true,
                source_refs: ['wcag-2.2#1.3.2'],
            },
        ],
        decision_policy: {
            allowed_outcomes: [
                'approved',
                'changes-requested',
                'insufficient-evidence',
            ],
            deterministic_failure: 'changes-requested',
            missing_evidence: 'insufficient-evidence',
            human_pending: 'blocks-approval',
            aggregate_score: 'forbidden',
        },
    };
    const plan = {
        schema_version: '2.0.0',
        kind: 'visual-evaluation-plan',
        evaluation_id: 'visual-evaluation_cccccccccccccccc',
        page_id: presentation.page_id,
        presentation_id: presentation.presentation_id,
        presentation_evidence_uri: 'designs/presentation.json',
        review_protocol_uri: 'designs/review-protocol.json',
        cases: [
            {
                id: 'medium-create-invalid',
                reference_source_id: 'medium-create-invalid',
                viewport: { width: 1024, height: 768, pixel_ratio: 1 },
                runtime_scenario: {
                    spec_uri: 'apps/proof/e2e/create.spec.ts',
                    test_title: title,
                    capture_name: captureName,
                    evidence_name: evidenceName,
                },
                criterion_ids: [
                    'accessibility.dialog-semantics',
                    'visual.feedback-legibility',
                    'visual.reference-fidelity',
                ],
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
        writeFile(
            join(root, 'designs/review-protocol.json'),
            `${JSON.stringify(reviewProtocol, null, 2)}\n`
        ),
    ]);
    return {
        root,
        resultsRoot,
        presentation,
        reviewProtocol,
        plan,
        evidence,
        reference,
        actual,
    };
}

async function collect(data) {
    return collectVisualEvaluation({
        workspaceRoot: data.root,
        planPath: 'designs/evaluation.json',
        planSchema,
        presentationSchema,
        reviewProtocolSchema,
        runtimeEvidenceSchema,
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
    assert.equal(
        bundle.review_protocol.protocol_id,
        data.reviewProtocol.protocol_id
    );
    assert.equal(
        bundle.cases[0].review.criteria[0].deterministic_outcome,
        'pass'
    );
    assert.equal(bundle.cases[0].review.criteria[1].human_outcome, 'pending');
    assert.equal(
        bundle.cases[0].review.criteria[2].deterministic_outcome,
        'not-applicable'
    );
    assert.equal(bundle.cases[0].reference.sha256, sha256(data.reference));
    assert.equal(bundle.cases[0].actual.sha256, sha256(data.actual));
    assert.equal(bundle.render_environment.browser_version, '140.0.0.0');
    assert.equal(bundle.render_environment.browser_channel, 'bundled');
    assert.equal(Object.hasOwn(bundle, 'score'), false);
    assert.equal(Object.hasOwn(bundle.cases[0], 'verdict'), false);
});

test('refuse un protocole ambigu, un critère inconnu ou une source non approuvée', async () => {
    for (const [mutate, pattern] of [
        [
            (data) =>
                data.reviewProtocol.criteria.push(
                    data.reviewProtocol.criteria[0]
                ),
            /criterion ids must be unique/,
        ],
        [
            (data) => data.plan.cases[0].criterion_ids.push('visual.unknown'),
            /unknown review criterion/,
        ],
        [
            (data) =>
                data.reviewProtocol.criteria[0].source_refs.splice(
                    0,
                    1,
                    'unknown#rule'
                ),
            /invalid source reference/,
        ],
        [
            (data) =>
                data.reviewProtocol.sources.push({
                    id: 'unused-official-source',
                    source_kind: 'official',
                    title: 'Unused source',
                    uri: 'https://example.invalid/unused',
                    version: '1',
                    verified_on: '2026-10-03',
                }),
            /source unused-official-source is unused/,
        ],
    ]) {
        const data = await fixture();
        mutate(data);
        await Promise.all([
            writeFile(
                join(data.root, 'designs/review-protocol.json'),
                `${JSON.stringify(data.reviewProtocol, null, 2)}\n`
            ),
            writeFile(
                join(data.root, 'designs/evaluation.json'),
                `${JSON.stringify(data.plan, null, 2)}\n`
            ),
        ]);
        await assert.rejects(() => collect(data), pattern);
    }
});

test('refuse une politique locale non hashée ou modifiée', async () => {
    for (const [declaredHash, pattern] of [
        [undefined, /must declare sha256/],
        ['0'.repeat(64), /sha256 drifted/],
    ]) {
        const data = await fixture();
        await mkdir(join(data.root, 'docs'), { recursive: true });
        await writeFile(join(data.root, 'docs/policy.md'), 'policy\n');
        const localSource = {
            id: 'local-policy',
            source_kind: 'repository-policy',
            title: 'Local policy',
            uri: 'docs/policy.md',
            version: '1',
            verified_on: '2026-10-03',
        };
        if (declaredHash) localSource.sha256 = declaredHash;
        data.reviewProtocol.sources.push(localSource);
        data.reviewProtocol.criteria[0].source_refs.push('local-policy#rule');
        await writeFile(
            join(data.root, 'designs/review-protocol.json'),
            `${JSON.stringify(data.reviewProtocol, null, 2)}\n`
        );
        await assert.rejects(() => collect(data), pattern);
    }
});

test('refuse une preuve runtime incomplète, divergente ou en échec bloquant', async () => {
    for (const [mutate, pattern] of [
        [(data) => data.evidence.findings.pop(), /must cover exactly/],
        [
            (data) => {
                data.evidence.viewport.width = 900;
            },
            /evidence viewport differs/,
        ],
        [
            (data) => {
                data.evidence.findings[0].outcome = 'fail';
            },
            /blocking criterion .* did not pass/,
        ],
        [
            (data) => {
                data.evidence.findings[0].facts[0].actual = 'alert';
            },
            /passing criterion .* contradicts its facts/,
        ],
    ]) {
        const data = await fixture();
        mutate(data);
        await writeFile(
            join(
                data.resultsRoot,
                'scenario',
                'medium-create-invalid.evidence.json'
            ),
            `${JSON.stringify(data.evidence, null, 2)}\n`
        );
        await assert.rejects(() => collect(data), pattern);
    }
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
