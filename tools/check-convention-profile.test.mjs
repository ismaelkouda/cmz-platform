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

test('le profil Angular réel est conforme au schéma', () => {
    const result = validateConventionProfiles(REPO_ROOT);
    assert.deepEqual(result.errors, []);
    assert.equal(result.ok, true);
    assert.ok(result.checked.includes('conventions/angular-22.profile.json'));
});

test('conventions/profile.schema.json est un JSON non vide', () => {
    const schema = JSON.parse(readFileSync(SCHEMA_SRC, 'utf8'));
    assert.equal(schema.type, 'object');
    assert.ok(schema.required.includes('conventions'));
});

test('rejette un profil sans conventions.i18n', () => {
    const root = scratchRoot();
    try {
        const profile = structuredClone(baseAngular);
        delete profile.conventions.i18n;
        writeProfile(root, 'angular-22.profile.json', profile);
        const { ok, errors } = validateConventionProfiles(root);
        assert.equal(ok, false);
        assert.match(errors.join('\n'), /conventions\.i18n: is required/);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('rejette une i18n qui ressemble à une abstraction cross-platform', () => {
    const root = scratchRoot();
    try {
        const profile = structuredClone(baseAngular);
        profile.conventions.i18n = {
            library: 'custom-translation-port',
            package: '@cmz/i18n-abstraction',
            forbid: ['littéraux en dur'],
        };
        writeProfile(root, 'angular-22.profile.json', profile);
        const { ok, errors } = validateConventionProfiles(root);
        assert.equal(ok, false);
        assert.match(
            errors.join('\n'),
            /i18n\.library:.*abstraction cross-platform/
        );
        assert.match(
            errors.join('\n'),
            /i18n\.package:.*abstraction cross-platform/
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

test('rejette un async_state sans primitive de server state', () => {
    const root = scratchRoot();
    try {
        const profile = structuredClone(baseAngular);
        profile.conventions.async_state = { forbid: ['BehaviorSubject'] };
        writeProfile(root, 'angular-22.profile.json', profile);
        const { ok, errors } = validateConventionProfiles(root);
        assert.equal(ok, false);
        assert.match(
            errors.join('\n'),
            /async_state\.server_state: is required/
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
