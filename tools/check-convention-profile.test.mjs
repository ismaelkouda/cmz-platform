import assert from 'node:assert/strict';
import {
    cpSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { validateConventionProfiles } from './check-convention-profile.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_SRC = join(REPO_ROOT, 'conventions/profile.schema.json');
const ANGULAR_SRC = join(REPO_ROOT, 'conventions/angular-22.profile.json');

function scratchRoot() {
    const root = mkdtempSync(join(tmpdir(), 'convention-profile-'));
    mkdirSync(join(root, 'conventions'));
    cpSync(SCHEMA_SRC, join(root, 'conventions/profile.schema.json'));
    return root;
}

function writeProfile(root, name, profile) {
    writeFileSync(
        join(root, 'conventions', name),
        `${JSON.stringify(profile, null, 2)}\n`
    );
}

const baseAngular = JSON.parse(readFileSync(ANGULAR_SRC, 'utf8'));

const CONCERNS = [
    'component_model',
    'local_state',
    'server_state',
    'navigation',
    'forms',
    'i18n',
    'styling',
    'accessibility',
    'testing',
];

test('le profil Angular réel est conforme au schéma', () => {
    const result = validateConventionProfiles(REPO_ROOT);
    assert.deepEqual(result.errors, []);
    assert.equal(result.ok, true);
    assert.ok(result.checked.includes('conventions/angular-22.profile.json'));
});

test('le schéma exige un jeu de préoccupations fixe et fermé', () => {
    const schema = JSON.parse(readFileSync(SCHEMA_SRC, 'utf8'));
    const conventions = schema.properties.conventions;
    assert.equal(conventions.additionalProperties, false);
    assert.deepEqual([...conventions.required].sort(), [...CONCERNS].sort());
    // chaque préoccupation a la même forme neutre
    assert.deepEqual(schema.$defs.concern.required, [
        'native',
        'forbid',
        'guidance',
    ]);
});

test('rejette un profil auquel il manque une préoccupation', () => {
    const root = scratchRoot();
    try {
        const profile = structuredClone(baseAngular);
        delete profile.conventions.server_state;
        writeProfile(root, 'angular-22.profile.json', profile);
        const { ok, errors } = validateConventionProfiles(root);
        assert.equal(ok, false);
        assert.match(
            errors.join('\n'),
            /conventions\.server_state: is required/
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('rejette une convention qui se revendique inter-plateforme', () => {
    const root = scratchRoot();
    try {
        const profile = structuredClone(baseAngular);
        profile.conventions.i18n.native =
            'un TranslationPort cross-platform commun Angular/React';
        writeProfile(root, 'angular-22.profile.json', profile);
        const { ok, errors } = validateConventionProfiles(root);
        assert.equal(ok, false);
        assert.match(
            errors.join('\n'),
            /conventions\.i18n\.native: se revendique inter-plateforme/
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("rejette un packages[] qui nomme un wrapper d'abstraction", () => {
    const root = scratchRoot();
    try {
        const profile = structuredClone(baseAngular);
        profile.conventions.i18n.packages = ['@cmz/i18n-port'];
        writeProfile(root, 'angular-22.profile.json', profile);
        const { ok, errors } = validateConventionProfiles(root);
        assert.equal(ok, false);
        assert.match(
            errors.join('\n'),
            /conventions\.i18n\.packages\[0\]:.*wrapper d'abstraction/
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('exige une guidance par préoccupation', () => {
    const root = scratchRoot();
    try {
        const profile = structuredClone(baseAngular);
        delete profile.conventions.forms.guidance;
        writeProfile(root, 'angular-22.profile.json', profile);
        const { ok, errors } = validateConventionProfiles(root);
        assert.equal(ok, false);
        assert.match(
            errors.join('\n'),
            /conventions\.forms\.guidance: is required/
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('exige que le nom de fichier reflète plateforme + version majeure', () => {
    const root = scratchRoot();
    try {
        writeProfile(root, 'angular-latest.profile.json', baseAngular);
        const { ok, errors } = validateConventionProfiles(root);
        assert.equal(ok, false);
        assert.match(
            errors.join('\n'),
            /nom attendu conventions\/angular-22\.profile\.json/
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('rejette deux profils pour la même plateforme', () => {
    const root = scratchRoot();
    try {
        writeProfile(root, 'angular-22.profile.json', baseAngular);
        const other = structuredClone(baseAngular);
        other.platform_version = '23';
        writeProfile(root, 'angular-23.profile.json', other);
        const { ok, errors } = validateConventionProfiles(root);
        assert.equal(ok, false);
        assert.match(errors.join('\n'), /plateforme "angular" déjà déclarée/);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('rejette un profil sans version_pin', () => {
    const root = scratchRoot();
    try {
        const profile = structuredClone(baseAngular);
        delete profile.version_pin;
        writeProfile(root, 'angular-22.profile.json', profile);
        const { ok, errors } = validateConventionProfiles(root);
        assert.equal(ok, false);
        assert.match(errors.join('\n'), /\$\.version_pin: is required/);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
