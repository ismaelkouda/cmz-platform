import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { verifyImageSizeSecurity } from './check-image-size-security.mjs';

const roots = [];

afterEach(() => {
    for (const root of roots.splice(0)) {
        rmSync(root, { recursive: true, force: true });
    }
});

function fixture() {
    const root = mkdtempSync(join(tmpdir(), 'cmz-image-size-security-'));
    roots.push(root);
    execFileSync('git', ['init', '-q'], { cwd: root });
    writeFileSync(
        join(root, 'package.json'),
        `${JSON.stringify({ overrides: { axios: '^1.20.0' } })}\n`
    );
    writeFileSync(join(root, 'bun.lock'), '    "axios": ["axios@1.20.0"],\n');
    return root;
}

test('accepte un graphe sans Less ni image-size', () => {
    assert.deepEqual(verifyImageSizeSecurity(fixture()), {
        lessResolvedAsOptionalPeer: false,
        imageSizeInstalled: false,
    });
});

test('refuse toute réintroduction de image-size dans le lockfile', () => {
    const root = fixture();
    writeFileSync(
        join(root, 'bun.lock'),
        '    "image-size": ["image-size@0.5.5", "", {}],\n    "less": ["less@4.9.1", "", {}],\n'
    );
    assert.throws(
        () => verifyImageSizeSecurity(root),
        /ne doit résoudre ni déclarer/
    );
});

test('accepte Less corrigé comme peer optionnelle sans usage applicatif', () => {
    const root = fixture();
    writeFileSync(
        join(root, 'bun.lock'),
        '    "less": ["less@4.9.1", "", {}],\n'
    );
    assert.deepEqual(verifyImageSizeSecurity(root), {
        lessResolvedAsOptionalPeer: true,
        imageSizeInstalled: false,
    });
});

test('refuse image-size dans chaque section de dépendances racine', () => {
    for (const section of [
        'dependencies',
        'devDependencies',
        'optionalDependencies',
        'peerDependencies',
    ]) {
        const root = fixture();
        writeFileSync(
            join(root, 'package.json'),
            `${JSON.stringify({ [section]: { 'image-size': '^2.0.4' } })}\n`
        );
        assert.throws(
            () => verifyImageSizeSecurity(root),
            new RegExp(`dépendance racine \\(${section}:`)
        );
    }
});

test('refuse Less dans chaque section de dépendances racine', () => {
    for (const section of [
        'dependencies',
        'devDependencies',
        'optionalDependencies',
        'peerDependencies',
    ]) {
        const root = fixture();
        writeFileSync(
            join(root, 'package.json'),
            `${JSON.stringify({ [section]: { less: '^4.9.1' } })}\n`
        );
        assert.throws(
            () => verifyImageSizeSecurity(root),
            new RegExp(`dépendance racine inutilisée \\(${section}:`)
        );
    }
});

test('refuse un override image-size dormant', () => {
    const root = fixture();
    writeFileSync(
        join(root, 'package.json'),
        `${JSON.stringify({ overrides: { 'image-size': '^2.0.4' } })}\n`
    );
    assert.throws(
        () => verifyImageSizeSecurity(root),
        /override image-size dormant/
    );
});

test('refuse un override Less dormant', () => {
    const root = fixture();
    writeFileSync(
        join(root, 'package.json'),
        `${JSON.stringify({ overrides: { less: '^4.9.1' } })}\n`
    );
    assert.throws(() => verifyImageSizeSecurity(root), /override Less dormant/);
});

test('refuse aussi les overrides présents avec une valeur vide', () => {
    for (const packageName of ['image-size', 'less']) {
        const root = fixture();
        writeFileSync(
            join(root, 'package.json'),
            `${JSON.stringify({ overrides: { [packageName]: '' } })}\n`
        );
        assert.throws(
            () => verifyImageSizeSecurity(root),
            new RegExp(
                `override ${packageName === 'less' ? 'Less' : packageName} dormant`
            )
        );
    }
});

test('refuse image-size même sous une clé de lockfile imbriquée', () => {
    const root = fixture();
    writeFileSync(
        join(root, 'bun.lock'),
        '    "less/image-size": ["image-size@0.5.5", "", {}],\n'
    );
    assert.throws(
        () => verifyImageSizeSecurity(root),
        /ne doit résoudre ni déclarer/
    );
});

test('refuse un fichier Less sans adoption formalisée', () => {
    const root = fixture();
    writeFileSync(join(root, 'feature.LESS'), '.feature { color: red; }\n');
    assert.throws(
        () => verifyImageSizeSecurity(root),
        /fichier Less détecté sans adoption formalisée/
    );
});
