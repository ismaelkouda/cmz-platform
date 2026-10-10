import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { parse as parseYaml } from 'yaml';

import {
    AUDIT_IGNORES,
    parseAuditReport,
    repairSecurityOverrides,
    securityRepairPlan,
} from './repair-security-overrides.mjs';

const high = (id = 'GHSA-aaaa-bbbb-cccc') => ({
    severity: 'high',
    url: `https://github.com/advisories/${id}`,
});

test('ne masque aucun avis dans la politique de production', () => {
    assert.deepEqual(AUDIT_IGNORES, []);
});

test('sélectionne uniquement les high/critical gouvernés par overrides', () => {
    const plan = securityRepairPlan(
        {
            axios: [high()],
            hono: [{ severity: 'moderate', url: 'https://example.test' }],
        },
        { axios: '^1.20.0', hono: '^4.12.34' }
    );
    assert.deepEqual(plan.repairable, ['axios']);
    assert.deepEqual(plan.unsupported, []);
});

test('reconnaît les nouvelles transitives critiques une fois gouvernées', () => {
    const plan = securityRepairPlan(
        {
            'proxy-addr': [{ ...high(), severity: 'critical' }],
            'source-map-js': [high()],
        },
        {
            'proxy-addr': '^2.0.8',
            'source-map-js': '^1.2.2',
        }
    );
    assert.deepEqual(plan.repairable, ['proxy-addr', 'source-map-js']);
    assert.deepEqual(plan.unsupported, []);
});

test('signale séparément une vulnérabilité non gouvernée', () => {
    const plan = securityRepairPlan({ qs: [high()] }, { axios: '^1.20.0' });
    assert.deepEqual(plan.repairable, []);
    assert.deepEqual(plan.unsupported, ['qs']);
});

test('déduplique les paquets tout en conservant les avis pour la preuve', () => {
    const plan = securityRepairPlan(
        {
            axios: [high('GHSA-1111-2222-3333'), high('GHSA-4444-5555-6666')],
        },
        { axios: '^1.20.0' }
    );
    assert.deepEqual(plan.repairable, ['axios']);
    assert.equal(plan.findings.length, 2);
});

test('respecte uniquement les exceptions GHSA explicites', () => {
    const ignored = 'GHSA-7777-8888-9999';
    const plan = securityRepairPlan(
        { 'image-size': [high(ignored), high('GHSA-1111-2222-3333')] },
        { 'image-size': '^2.0.0' },
        { ignoredAdvisories: [ignored] }
    );
    assert.deepEqual(
        plan.findings.map(({ id }) => id),
        ['GHSA-1111-2222-3333']
    );
});

test('refuse une forme non objet pour le rapport audit', () => {
    assert.throws(() => parseAuditReport('[]'), /objet JSON/);
});

test('refuse une liste d avis mal formée', () => {
    assert.throws(
        () => securityRepairPlan({ axios: {} }, { axios: '^1.20.0' }),
        /tableau attendu/
    );
});

test('refuse un nom de paquet qui pourrait devenir une option de commande', () => {
    assert.throws(
        () =>
            securityRepairPlan(
                { '--config': [high()] },
                { '--config': '^1.0.0' }
            ),
        /nom de paquet audit non sûr/
    );
});

function repairFixture(t) {
    const root = mkdtempSync(join(tmpdir(), 'cmz-security-repair-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const packagePath = join(root, 'package.json');
    const lockPath = join(root, 'bun.lock');
    const packageBytes = Buffer.from(
        `${JSON.stringify({ overrides: { axios: '^1.20.0' } }, null, 2)}\n`
    );
    writeFileSync(packagePath, packageBytes);
    writeFileSync(lockPath, 'lock-before\n');
    return { root, packagePath, lockPath, packageBytes };
}

test('répare le lockfile et restaure exactement le manifeste muté par Bun', (t) => {
    const fixture = repairFixture(t);
    let auditCount = 0;
    const commands = [];
    const runCommand = (command, args) => {
        commands.push([command, ...args]);
        if (args[0] === 'audit') {
            auditCount += 1;
            return auditCount === 1
                ? JSON.stringify({ axios: [high()] })
                : '{}';
        }
        if (args[0] === 'update') {
            writeFileSync(
                fixture.packagePath,
                '{"devDependencies":{"axios":"1.20.0"}}\n'
            );
            writeFileSync(fixture.lockPath, 'lock-after\n');
        }
        return '';
    };

    assert.deepEqual(repairSecurityOverrides(fixture.root, { runCommand }), {
        repaired: true,
        packages: ['axios'],
    });
    assert.deepEqual(readFileSync(fixture.packagePath), fixture.packageBytes);
    assert.equal(readFileSync(fixture.lockPath, 'utf8'), 'lock-after\n');
    assert.ok(
        commands.some(
            (args) =>
                args.join(' ') ===
                'bun update axios --lockfile-only --ignore-scripts --no-progress'
        )
    );
});

test('restaure le manifeste même lorsque Bun échoue pendant la réparation', (t) => {
    const fixture = repairFixture(t);
    const runCommand = (_command, args) => {
        if (args[0] === 'audit') {
            return JSON.stringify({ axios: [high()] });
        }
        writeFileSync(fixture.packagePath, '{"dependencies":{"axios":"*"}}');
        throw new Error('échec simulé');
    };

    assert.throws(
        () => repairSecurityOverrides(fixture.root, { runCommand }),
        /échec simulé/
    );
    assert.deepEqual(readFileSync(fixture.packagePath), fixture.packageBytes);
    assert.equal(readFileSync(fixture.lockPath, 'utf8'), 'lock-before\n');
});

test('le workflow sépare strictement calcul en lecture et publication en écriture', () => {
    const workflow = parseYaml(
        readFileSync(
            new URL(
                '../.github/workflows/security-overrides-repair.yml',
                import.meta.url
            ),
            'utf8'
        )
    );
    assert.deepEqual(workflow.jobs.repair.permissions, {
        contents: 'read',
        'pull-requests': 'read',
    });
    assert.deepEqual(workflow.jobs.publish.permissions, {
        actions: 'write',
        contents: 'write',
        'pull-requests': 'write',
    });
    assert.equal(workflow.jobs.publish.needs, 'repair');
    // Le job qui écrit est lié à `main` : lancé à la main depuis une autre
    // branche, le workflow audite sans publier.
    assert.equal(
        workflow.jobs.publish.if,
        "github.ref == 'refs/heads/main' && needs.repair.outputs.repaired == 'true'"
    );

    const source = readFileSync(
        new URL(
            '../.github/workflows/security-overrides-repair.yml',
            import.meta.url
        ),
        'utf8'
    );
    assert.match(source, /persist-credentials: false/g);
    assert.match(source, /path: bun\.lock/);
    assert.match(source, /test "\$\(git diff --name-only\)" = "bun\.lock"/);
    assert.match(source, /gh workflow run ci\.yml/);
});
