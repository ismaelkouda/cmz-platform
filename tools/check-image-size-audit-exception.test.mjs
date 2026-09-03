import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import {
    EXCEPTION,
    verifyImageSizeAuditException,
} from './check-image-size-audit-exception.mjs';

const roots = [];

afterEach(() => {
    for (const root of roots.splice(0)) {
        rmSync(root, { recursive: true, force: true });
    }
});

function fixture() {
    const root = mkdtempSync(join(tmpdir(), 'cmz-image-size-audit-'));
    roots.push(root);
    execFileSync('git', ['init', '-q'], { cwd: root });

    const packageRoot = join(
        root,
        'node_modules/.bun',
        `image-size@${EXCEPTION.version}`,
        'node_modules/image-size'
    );
    mkdirSync(join(packageRoot, 'lib/types'), { recursive: true });
    writeFileSync(
        join(packageRoot, 'package.json'),
        `${JSON.stringify({ name: 'image-size', version: EXCEPTION.version })}\n`
    );
    for (const file of EXCEPTION.parserFiles) {
        writeFileSync(
            join(packageRoot, 'lib/types', file),
            'module.exports = {};\n'
        );
    }

    writeFileSync(
        join(root, 'bun.lock'),
        [
            `    "image-size": ["image-size@${EXCEPTION.version}", "", { "bin": { "image-size": "bin/image-size.js" } }, "${EXCEPTION.integrity}"],`,
            `    "less": ["less@${EXCEPTION.lessVersion}", "", { "optionalDependencies": { "image-size": "~0.5.0" } }],`,
            '',
        ].join('\n')
    );
    return root;
}

const validDate = new Date('2026-09-03T00:00:00.000Z');

test("accepte uniquement la distribution historique prouvée avant l'échéance", () => {
    const proof = verifyImageSizeAuditException(fixture(), { now: validDate });
    assert.equal(proof.version, '0.5.5');
});

test('invalide automatiquement une version différente', () => {
    const root = fixture();
    writeFileSync(
        join(root, 'bun.lock'),
        '    "image-size": ["image-size@2.0.2", "", {}, "sha512-drift"],\n'
    );
    assert.throws(
        () => verifyImageSizeAuditException(root, { now: validDate }),
        /occurrence exacte de image-size@0\.5\.5/
    );
});

test("invalide l'exception dès qu'un parseur concerné apparaît", () => {
    const root = fixture();
    const typeDir = join(
        root,
        'node_modules/.bun/image-size@0.5.5/node_modules/image-size/lib/types'
    );
    writeFileSync(join(typeDir, 'icns.js'), 'while (true) {}\n');
    assert.throws(
        () => verifyImageSizeAuditException(root, { now: validDate }),
        /ensemble de parseurs inattendu/
    );
});

test("invalide l'exception dès qu'un fichier Less devient Git-visible", () => {
    const root = fixture();
    writeFileSync(
        join(root, 'active.LESS'),
        '.x { width: image-width("x.icns"); }\n'
    );
    assert.throws(
        () => verifyImageSizeAuditException(root, { now: validDate }),
        /fichier Less Git-visible/
    );
});

test("invalide l'exception après sa date de revue", () => {
    assert.throws(
        () =>
            verifyImageSizeAuditException(fixture(), {
                now: new Date('2026-10-04T00:00:00.000Z'),
            }),
        /revue expirée/
    );
});
