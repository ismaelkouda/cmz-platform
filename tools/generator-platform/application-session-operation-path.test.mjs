// CI #389, commit 3 : chemins d'opération d'API de la session (opérations
// protégées), versionnés compris (`/v1.0/…`). Les chemins de page restent
// stricts. La frontière du Bearer au runtime est prouvée par la spec Angular
// `action-request-session.spec.ts`.
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import test from 'node:test';

import { validateApplicationDesign } from './core/application-design.mjs';
import {
    canonicalOperationPath,
    canonicalSessionPath,
} from './core/application-design-session.mjs';
import { createApplicationSessionFixture } from './test-support/application-session-fixture.mjs';

test('chemin d’opération : segments [A-Za-z0-9_.-]+, sans . ni .., sans encodage', () => {
    for (const path of [
        '/',
        '/v1.0/backoffice/login',
        '/v1.0/backoffice/privacy/accept',
        '/a-b/c_d',
        '/v2.1.3/x',
    ])
        assert.equal(canonicalOperationPath(path), path, path);
    for (const path of [
        '/.',
        '/..',
        '/./a',
        '/a/./b',
        '/a/../b',
        '/a/..',
        '/a//b',
        '//host',
        '/a/',
        '/%2e%2e/a',
        '/a?x=1',
        '/a#x',
        '/a\\b',
        'https://host/a',
        'javascript:x',
        'a/b',
        '/' + 'x'.repeat(513),
        undefined,
    ])
        assert.equal(canonicalOperationPath(path), null, String(path));
});

test('chemin de page : reste strict, sans point', () => {
    for (const path of ['/v1.0', '/v1.0/x', '/a.b'])
        assert.equal(canonicalSessionPath(path), null, path);
    assert.equal(
        canonicalSessionPath('/territorial-structure/regions'),
        '/territorial-structure/regions'
    );
});

test('session : opérations protégées versionnées acceptées, segments . et .. refusés, pages strictes', async (t) => {
    const fixture = await createApplicationSessionFixture({
        domain: 'equipment-hire',
    });
    t.after(() => rm(fixture.root, { recursive: true, force: true }));
    const { design, schemas, contracts } = fixture;
    const protectedPaths =
        design.experiences[0].session.protected_operations.map(
            (operation) => operation.path
        );
    assert.ok(protectedPaths.length > 0);
    assert.ok(protectedPaths.every((path) => path.startsWith('/v1.0/')));
    assert.deepEqual(
        validateApplicationDesign(
            design,
            schemas['application-design'],
            contracts
        ),
        []
    );
    // Même changement dans le contrat et la conception : seul le chemin
    // d'opération décide.
    for (const path of ['/v1.0/../consents', '/v1.0/./consents']) {
        const changed = structuredClone(design);
        const binding = changed.experiences[0].session.protected_operations[0];
        const changedContracts = new Map(
            [...contracts].map(([key, entry]) => [key, structuredClone(entry)])
        );
        changedContracts
            .get(binding.contract_id)
            .contract.operations.find(
                (operation) => operation.id === binding.operation_id
            ).path = path;
        binding.path = path;
        assert.deepEqual(
            validateApplicationDesign(
                changed,
                schemas['application-design'],
                changedContracts
            ),
            ['APP_SESSION_BINDING'],
            path
        );
    }
    const page = structuredClone(design);
    page.pages[0].path = '/v1.0';
    assert.notDeepEqual(
        validateApplicationDesign(
            page,
            schemas['application-design'],
            contracts
        ),
        []
    );
});
