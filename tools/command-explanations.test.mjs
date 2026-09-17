import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
    commandExplanation,
    EXPLAINED_COMMANDS,
    formatCommandExplanation,
} from './command-explanations.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const RUNBOOK = 'docs/architecture/runbook-commandes-creation.md';
const TOP_LEVEL_KEYS = [
    'schema_version',
    'command',
    'summary',
    'runbook',
    'invocations',
    'ownership',
    'phases',
    'checks',
    'transaction',
];
const EXPECTED_PHASES = {
    'create-app': [
        'preconditions',
        'plan',
        'candidate',
        'compile',
        'publication',
        'targeted-checks',
    ],
    'add-library': [
        'preconditions',
        'qualified-track',
        'candidate',
        'adapter',
        'install-without-scripts',
        'targeted-checks',
        'plan',
        'publication',
    ],
    'create-module': [
        'preconditions',
        'journal-planned',
        'generation',
        'journal-generated',
        'configuration',
        'journal-configured',
        'gates',
        'completion',
    ],
};

function exactKeys(value, keys) {
    return Object.keys(value).sort().join('\0') === [...keys].sort().join('\0');
}

test('le contrat explain est fermé, versionné et complet pour les trois commandes', () => {
    assert.deepEqual(EXPLAINED_COMMANDS, [
        'create-app',
        'add-library',
        'create-module',
    ]);
    for (const command of EXPLAINED_COMMANDS) {
        const explanation = commandExplanation(command);
        assert.equal(exactKeys(explanation, TOP_LEVEL_KEYS), true, command);
        assert.equal(explanation.schema_version, '1.0.0');
        assert.equal(explanation.command, command);
        assert.equal(explanation.runbook, RUNBOOK);
        assert.ok(explanation.summary.length > 20);
        assert.ok(explanation.invocations.length >= 2);
        assert.equal(
            exactKeys(explanation.ownership, [
                'creates',
                'modifies',
                'protects',
                'temporary',
            ]),
            true
        );
        assert.deepEqual(
            explanation.phases.map(({ id }) => id),
            EXPECTED_PHASES[command]
        );
        assert.equal(
            explanation.phases.every(
                (phase) =>
                    exactKeys(phase, ['id', 'description']) &&
                    phase.description.length > 20
            ),
            true
        );
        assert.ok(explanation.checks.length >= 5);
        assert.equal(
            exactKeys(explanation.transaction, [
                'journal',
                'lock',
                'recovery',
                'resume_command',
                'abort_command',
            ]),
            true
        );
    }
});

test('seul create-module annonce un journal et des commandes de reprise manuelles', () => {
    for (const command of ['create-app', 'add-library']) {
        const transaction = commandExplanation(command).transaction;
        assert.equal(transaction.journal, null);
        assert.equal(transaction.resume_command, null);
        assert.equal(transaction.abort_command, null);
    }
    const transaction = commandExplanation('create-module').transaction;
    assert.equal(
        transaction.journal,
        '.cmz/create-module-transactions/<module>/state.json'
    );
    assert.match(transaction.resume_command, /--resume --module <nom>$/);
    assert.match(transaction.abort_command, /--abort --module <nom>$/);
});

test('--explain fonctionne hors workspace et ne crée aucun fichier', (t) => {
    const directory = mkdtempSync(join(tmpdir(), 'cmz-command-explain-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    for (const command of EXPLAINED_COMMANDS) {
        const result = spawnSync(
            process.execPath,
            [join(ROOT, 'tools', `${command}.mjs`), '--explain'],
            { cwd: directory, encoding: 'utf8' }
        );
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.stderr, '');
        assert.equal(result.stdout, formatCommandExplanation(command));
        assert.deepEqual(readdirSync(directory), []);
    }
});

test('--explain refuse toute combinaison ambiguë', () => {
    for (const command of EXPLAINED_COMMANDS) {
        const result = spawnSync(
            process.execPath,
            [join(ROOT, 'tools', `${command}.mjs`), '--explain', '--dry-run'],
            { encoding: 'utf8' }
        );
        assert.equal(result.status, 1);
        assert.match(result.stderr, /--explain doit être utilisé seul/);
    }
});

test('le runbook reste court et couvre chaque commande et chaque reprise', () => {
    const content = readFileSync(join(ROOT, RUNBOOK), 'utf8');
    const lines = content.split('\n').length - 1;
    assert.ok(lines <= 200, `runbook trop long : ${lines} lignes`);
    assert.ok(lines >= 80, `runbook trop superficiel : ${lines} lignes`);
    for (const command of EXPLAINED_COMMANDS) {
        assert.match(content, new RegExp(`## .*${command}`));
        assert.match(content, new RegExp(`bun run ${command} --explain`));
    }
    assert.match(content, /--resume --module <nom>/);
    assert.match(content, /--abort --module <nom>/);
});

test('un appelant ne peut pas modifier la source de vérité partagée', () => {
    const modified = commandExplanation('create-app');
    modified.phases[0].id = 'corrompu';
    assert.equal(
        commandExplanation('create-app').phases[0].id,
        'preconditions'
    );
    assert.throws(() => commandExplanation('commande-inconnue'));
});
