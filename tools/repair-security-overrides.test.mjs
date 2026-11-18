import assert from 'node:assert/strict';
import {
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { parse as parseYaml } from 'yaml';

import {
    AUDIT_IGNORES,
    parseAuditReport,
    registryLatestVersion,
    runAudit,
    validateAuditExceptions,
    workflowAuditViolations,
} from './audit-exceptions.mjs';
import {
    repairSecurityOverrides,
    securityRepairPlan,
} from './repair-security-overrides.mjs';

const high = (id = 'GHSA-aaaa-bbbb-cccc') => ({
    severity: 'high',
    url: `https://github.com/advisories/${id}`,
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

function repairFixture(t, pkg = { overrides: { axios: '^1.20.0' } }) {
    const root = mkdtempSync(join(tmpdir(), 'cmz-security-repair-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const packagePath = join(root, 'package.json');
    const lockPath = join(root, 'bun.lock');
    const packageBytes = Buffer.from(`${JSON.stringify(pkg, null, 2)}\n`);
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

    assert.deepEqual(
        repairSecurityOverrides(fixture.root, { runCommand, exceptions: [] }),
        {
            repaired: true,
            packages: ['axios'],
        }
    );
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
        () =>
            repairSecurityOverrides(fixture.root, {
                runCommand,
                exceptions: [],
            }),
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

test('REFERENCE repair conserve la référence après les mutations de Bun', (t) => {
    const fixture = repairFixture(t, {
        devDependencies: { vite: '^8.3.4' },
        overrides: { vite: '$vite' },
    });
    let auditCount = 0;
    const phases = [];
    const runCommand = (_command, args) => {
        phases.push(args[0]);
        if (args[0] === 'audit') {
            auditCount += 1;
            return auditCount === 1 ? JSON.stringify({ vite: [high()] }) : '{}';
        }
        assert.deepEqual(
            readFileSync(fixture.packagePath),
            fixture.packageBytes
        );
        writeFileSync(
            fixture.packagePath,
            JSON.stringify({
                devDependencies: { vite: '^8.3.5' },
                overrides: { vite: '^8.3.5' },
            })
        );
        writeFileSync(fixture.lockPath, 'lock-after\n');
        return '';
    };
    assert.deepEqual(
        repairSecurityOverrides(fixture.root, { runCommand, exceptions: [] }),
        {
            repaired: true,
            packages: ['vite'],
        }
    );
    assert.deepEqual(phases, ['audit', 'update', 'install', 'audit']);
    assert.deepEqual(readFileSync(fixture.packagePath), fixture.packageBytes);
    assert.equal(
        JSON.parse(readFileSync(fixture.packagePath, 'utf8')).overrides.vite,
        '$vite'
    );
});

test('REFERENCE repair restaure référence et verrou si la réconciliation échoue', (t) => {
    const fixture = repairFixture(t, {
        devDependencies: { vite: '^8.3.4' },
        overrides: { vite: '$vite' },
    });
    const runCommand = (_command, args) => {
        if (args[0] === 'audit') return JSON.stringify({ vite: [high()] });
        writeFileSync(fixture.packagePath, '{"overrides":{"vite":"^8.3.5"}}');
        writeFileSync(fixture.lockPath, 'partial-lock\n');
        if (args[0] === 'install') throw new Error('reconcile-failed');
        return '';
    };
    assert.throws(
        () =>
            repairSecurityOverrides(fixture.root, {
                runCommand,
                exceptions: [],
            }),
        /reconcile-failed/
    );
    assert.deepEqual(readFileSync(fixture.packagePath), fixture.packageBytes);
    assert.equal(readFileSync(fixture.lockPath, 'utf8'), 'lock-before\n');
});

// ─── Exceptions d'audit (tools/audit-exceptions.mjs) ───────────────────────
// Ce fichier est déjà câblé (check:dependabot-policy) : aucun script ajouté.

const PICO_URL = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
const pico = (extra = {}) => ({
    severity: 'high',
    url: PICO_URL,
    vulnerable_versions: '<=4.0.7',
    ...extra,
});
const at = (iso) => new Date(iso);
const VALID = { now: at('2026-11-17T12:00:00Z'), latestVersion: () => '4.0.7' };

test('AUDIT_IGNORES : une seule entrée, forme exacte, gelée', () => {
    assert.deepEqual(AUDIT_IGNORES, [
        {
            id: 'GHSA-FC5Q-39XC-VJPF',
            package: 'picomatch',
            granted: '2026-11-17',
            expires: '2026-12-01',
            reason: 'Outillage de build et de dev seulement, sur des motifs écrits par le dépôt, sans version corrigée publiée le 2026-11-17 : décision « B » du propriétaire.',
        },
    ]);
    assert.ok(Object.isFrozen(AUDIT_IGNORES));
    assert.ok(Object.isFrozen(AUDIT_IGNORES[0]));
});

test('exception valide : identifiant rendu dans la casse du rapport', () => {
    for (const now of ['2026-11-17T00:00:00Z', '2026-11-30T23:59:59Z'])
        assert.deepEqual(
            validateAuditExceptions(
                { picomatch: [pico()], qs: [high()] },
                { ...VALID, now: at(now) }
            ),
            ['GHSA-fc5q-39xc-vjpf'],
            now
        );
});

test('refus a : expirée dès le jour de expires (UTC)', () => {
    for (const now of ['2026-12-01T00:00:00Z', '2027-01-01T00:00:00Z'])
        assert.throws(
            () =>
                validateAuditExceptions(
                    { picomatch: [pico()] },
                    { ...VALID, now: at(now) }
                ),
            /^Error: exception GHSA-FC5Q-39XC-VJPF expirée depuis le 2026-12-01$/
        );
});

test('refus b : plus de 14 jours, ou accordée dans le futur ; forme stricte', () => {
    const entry = { ...AUDIT_IGNORES[0] };
    const check = (change) =>
        validateAuditExceptions(
            { picomatch: [pico()] },
            { ...VALID, exceptions: [{ ...entry, ...change }] }
        );
    assert.throws(
        () => check({ granted: '2026-11-16' }),
        /^Error: exception GHSA-FC5Q-39XC-VJPF : durée de plus de 14 jours$/
    );
    assert.throws(
        () => check({ granted: '2026-11-17', expires: '2026-11-17' }),
        /expirée depuis le 2026-11-17$/
    );
    assert.throws(
        () => check({ granted: '2026-11-18', expires: '2026-11-20' }),
        /^Error: exception GHSA-FC5Q-39XC-VJPF : accordée dans le futur$/
    );
    assert.throws(
        () => check({ granted: '2026-11-31' }),
        /granted doit être une date AAAA-MM-JJ$/
    );
    assert.throws(() => check({ extra: 1 }), /exception mal formée/);
    assert.throws(() => check({ reason: ' ' }), /raison écrite manquante/);
    assert.throws(() => check({ id: 'GHSA-fc5q-39xc-vjpf' }), /GHSA invalide/);
});

test('refus c : avis absent du rapport, exception périmée à retirer', () => {
    for (const report of [{}, { picomatch: [high('GHSA-2222-3333-4444')] }])
        assert.throws(
            () => validateAuditExceptions(report, VALID),
            /^Error: exception GHSA-FC5Q-39XC-VJPF périmée : l'avis n'apparaît plus dans bun audit, retirer l'exception$/
        );
});

test('refus d : avis sous un autre paquet que picomatch', () => {
    for (const report of [
        { picomatch: [pico()], micromatch: [pico()] },
        { micromatch: [pico()] },
    ])
        assert.throws(
            () => validateAuditExceptions(report, VALID),
            /^Error: exception GHSA-FC5Q-39XC-VJPF : avis aussi sous micromatch, pas seulement picomatch$/
        );
});

test('refus e : version corrigée publiée, registre illisible ou injoignable', () => {
    const report = { picomatch: [pico()] };
    assert.throws(
        () =>
            validateAuditExceptions(report, {
                ...VALID,
                latestVersion: () => '4.0.8',
            }),
        /^Error: exception GHSA-FC5Q-39XC-VJPF : version corrigée publiée \(picomatch@4\.0\.8 hors de <=4\.0\.7\), retirer l'exception et corriger$/
    );
    assert.throws(
        () =>
            validateAuditExceptions(report, {
                ...VALID,
                latestVersion: () => '',
            }),
        /dernière version de picomatch illisible$/
    );
    assert.throws(
        () =>
            validateAuditExceptions(
                { picomatch: [pico({ vulnerable_versions: undefined })] },
                VALID
            ),
        /vulnerable_versions illisible$/
    );
    const failed = { status: 1, stdout: '', signal: null };
    assert.throws(
        () => registryLatestVersion('picomatch', () => failed),
        /^Error: registre injoignable pour picomatch$/
    );
    assert.throws(
        () =>
            registryLatestVersion('picomatch', () => ({
                error: new Error('ENOTFOUND'),
            })),
        /registre injoignable/
    );
    assert.equal(
        registryLatestVersion('picomatch', (cmd, args) => {
            assert.deepEqual(
                [cmd, ...args],
                ['bun', 'info', 'picomatch', 'version']
            );
            return { status: 0, stdout: '4.0.7\n' };
        }),
        '4.0.7'
    );
});

test('point d entrée : valide, puis audit natif avec --ignore, code propagé', () => {
    const calls = [];
    const spawn = (_cmd, args) => {
        calls.push(args.join(' '));
        if (args.includes('--json'))
            return {
                status: 1,
                stdout: JSON.stringify({ picomatch: [pico()] }),
            };
        return { status: 7 };
    };
    const logs = [];
    const log = (line) => logs.push(line);
    const code = runAudit({ ...VALID, spawn, log });
    assert.equal(code, 7);
    assert.deepEqual(logs, [
        'exception validée : GHSA-FC5Q-39XC-VJPF (picomatch), expire le 2026-12-01',
    ]);
    assert.deepEqual(calls, [
        'audit --json',
        'audit --audit-level=high --ignore=GHSA-fc5q-39xc-vjpf',
    ]);
    calls.length = 0;
    assert.throws(
        () =>
            runAudit({
                ...VALID,
                now: at('2026-12-01T00:00:00Z'),
                spawn,
                log,
            }),
        /expirée/
    );
    assert.deepEqual(calls, ['audit --json'], 'aucun audit natif après refus');
});

test('réparation nocturne : rouge à l expiration et dès qu une correction existe', (t) => {
    const fixture = repairFixture(t);
    const runCommand = (_command, args) => {
        if (args[0] === 'audit') return JSON.stringify({ picomatch: [pico()] });
        if (args[0] === 'info') return '4.0.7\n';
        throw new Error(`commande inattendue ${args.join(' ')}`);
    };
    assert.deepEqual(
        repairSecurityOverrides(fixture.root, { runCommand, now: VALID.now }),
        { repaired: false, packages: [] }
    );
    assert.throws(
        () =>
            repairSecurityOverrides(fixture.root, {
                runCommand,
                now: at('2026-12-01T00:00:00Z'),
            }),
        /expirée depuis le 2026-12-01/
    );
    assert.throws(
        () =>
            repairSecurityOverrides(fixture.root, {
                runCommand: (c, args, o) =>
                    args[0] === 'info' ? '4.0.8\n' : runCommand(c, args, o),
                now: VALID.now,
            }),
        /version corrigée publiée/
    );
    // Sans exception, l'avis non gouverné reste un refus nommé.
    assert.throws(
        () =>
            repairSecurityOverrides(fixture.root, {
                runCommand,
                now: VALID.now,
                exceptions: [],
            }),
        /hors overrides auto-réparables: picomatch/
    );
});

test('réparation : l exception validée vaut aussi pour l audit qui suit la réparation', (t) => {
    const fixture = repairFixture(t);
    let audits = 0;
    const runCommand = (_command, args) => {
        if (args[0] === 'info') return '4.0.7\n';
        if (args[0] === 'audit') {
            audits += 1;
            return JSON.stringify(
                audits === 1
                    ? { axios: [high()], picomatch: [pico()] }
                    : { picomatch: [pico()] }
            );
        }
        if (args[0] === 'update')
            writeFileSync(fixture.lockPath, 'lock-after\n');
        return '';
    };
    assert.deepEqual(
        repairSecurityOverrides(fixture.root, { runCommand, now: VALID.now }),
        { repaired: true, packages: ['axios'] }
    );
    assert.equal(audits, 2);
});

test('plan : sans liste validée, aucun avis n est ignoré par défaut', () => {
    assert.deepEqual(securityRepairPlan({ picomatch: [pico()] }, {}), {
        findings: [
            {
                packageName: 'picomatch',
                id: 'GHSA-FC5Q-39XC-VJPF',
                severity: 'high',
            },
        ],
        repairable: [],
        unsupported: ['picomatch'],
    });
});

test('workflows : audit par son seul point d entrée, aucun --ignore à la main', () => {
    const job = (run) => ({ jobs: { a: { steps: [{ run }] } } });
    for (const [run, message] of [
        [
            'bun audit --audit-level=high',
            /audit lancé hors de node tools\/audit-exceptions\.mjs$/,
        ],
        [
            'bun audit --audit-level=high --ignore=GHSA-fc5q-39xc-vjpf',
            /--ignore d'audit écrit à la main/,
        ],
        ['bun audit --ignore 1247710', /--ignore d'audit écrit à la main/],
        [
            'node tools/audit-exceptions.mjs --ignore=1247710',
            /--ignore d'audit écrit à la main/,
        ],
        [
            'node tools/audit-exceptions.mjs --now=2026-11-18',
            /s'appelle seul, sans argument$/,
        ],
        ['npm audit', /audit lancé hors/],
    ])
        assert.match(
            workflowAuditViolations('f.yml', job(run)).join('\n'),
            message,
            run
        );
    for (const run of [
        'node tools/audit-exceptions.mjs',
        'bun install --frozen-lockfile --ignore-scripts',
    ])
        assert.deepEqual(workflowAuditViolations('f.yml', job(run)), [], run);
});

test('workflows du dépôt : 0 contournement, point d entrée aux 4 étapes d audit', () => {
    const directory = new URL('../.github/workflows/', import.meta.url);
    const calls = {};
    for (const file of readdirSync(directory).filter((f) =>
        /\.ya?ml$/.test(f)
    )) {
        const workflow = parseYaml(
            readFileSync(new URL(file, directory), 'utf8')
        );
        assert.deepEqual(workflowAuditViolations(file, workflow), [], file);
        for (const job of Object.values(workflow.jobs ?? {}))
            for (const step of job.steps ?? [])
                for (const line of String(step.run ?? '').split('\n'))
                    if (line.trim() === 'node tools/audit-exceptions.mjs')
                        calls[file] = (calls[file] ?? 0) + 1;
    }
    assert.deepEqual(calls, {
        'ci.yml': 1,
        'nx-migrations.yml': 2,
        'security-overrides-repair.yml': 1,
    });
});
