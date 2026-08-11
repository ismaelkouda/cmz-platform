/**
 * Tests node:test — `resolveStatus` (Oracle de statut du corpus SEOS).
 *
 * Trouvé lors de l'audit self-review post-ADR-0022 (2026-08-11) : c'est la
 * fonction qui décide `verified`/`pending`/`blocked`/`n/a`/`emitted` pour
 * chaque paire du corpus — l'Oracle lui-même (LLM_CONTEXT.md §1.2) — et elle
 * n'avait aucun test, malgré 6 branches de décision. Extraite dans
 * `resolve-status.mjs` (fonction pure, sans effet de bord au niveau module)
 * pour être importable en test — `emit-pairs.mjs` reste un script CLI que
 * l'import direct exécuterait (`process.argv`/`process.exit`).
 *
 * Utilise de vrais répertoires temporaires (`mkdtempSync`) plutôt que des
 * mocks de `fs` — on teste `existsAt` (chemin réel sur disque) au même
 * niveau de réalisme que ce que `emit-pairs.mjs` fait en production.
 *
 * Run: node --test tools/corpus/emit-pairs.test.mjs
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveStatus } from './resolve-status.mjs';

describe('resolveStatus (Oracle de statut corpus — audit self-review 2026-08-11)', () => {
    let root;
    let legacyRoot;

    before(() => {
        root = mkdtempSync(join(tmpdir(), 'seos-nx-'));
        legacyRoot = mkdtempSync(join(tmpdir(), 'seos-legacy-'));
        mkdirSync(join(root, 'libs/foo/domain/src/lib'), { recursive: true });
        writeFileSync(
            join(root, 'libs/foo/domain/src/lib/foo.entity.ts'),
            'export class Foo {}\n'
        );
        mkdirSync(join(legacyRoot, 'src/presentation/pages/foo'), {
            recursive: true,
        });
        writeFileSync(
            join(legacyRoot, 'src/presentation/pages/foo/foo.entity.ts'),
            '// legacy\n'
        );
    });

    after(() => {
        rmSync(root, { recursive: true, force: true });
        rmSync(legacyRoot, { recursive: true, force: true });
    });

    it('status n/a de la paire source est toujours préservé, même hors structural-only', () => {
        const pair = { status: 'n/a', legacy: 'nope', nx: null };
        const status = resolveStatus(pair, new Set(), {
            structuralOnly: false,
            verify: false,
            legacyRoot,
            root,
        });
        assert.equal(status, 'n/a');
    });

    it('structural-only=false + legacy introuvable → blocked (avant même de regarder nx)', () => {
        const pair = {
            status: 'verified',
            legacy: 'src/presentation/pages/absent/x.ts',
            nx: 'libs/foo/domain/src/lib/foo.entity.ts',
        };
        const status = resolveStatus(pair, new Set(), {
            structuralOnly: false,
            verify: false,
            legacyRoot,
            root,
        });
        assert.equal(status, 'blocked');
    });

    it('structural-only=true → ignore le legacy même absent (ADR-0015)', () => {
        const pair = {
            status: 'verified',
            legacy: 'src/presentation/pages/absent/x.ts',
            nx: 'libs/foo/domain/src/lib/foo.entity.ts',
        };
        const status = resolveStatus(pair, new Set(), {
            structuralOnly: true,
            verify: false,
            legacyRoot,
            root,
        });
        assert.notEqual(status, 'blocked');
    });

    it('pair.nx absent (null) → pending', () => {
        const pair = {
            status: 'verified',
            legacy: 'src/presentation/pages/foo/foo.entity.ts',
            nx: null,
        };
        const status = resolveStatus(pair, new Set(), {
            structuralOnly: true,
            verify: false,
            legacyRoot,
            root,
        });
        assert.equal(status, 'pending');
    });

    it('pair.nx renseigné mais fichier absent sur disque → pending', () => {
        const pair = {
            status: 'verified',
            legacy: 'src/presentation/pages/foo/foo.entity.ts',
            nx: 'libs/foo/domain/src/lib/absent.entity.ts',
        };
        const status = resolveStatus(pair, new Set(), {
            structuralOnly: true,
            verify: false,
            legacyRoot,
            root,
        });
        assert.equal(status, 'pending');
    });

    it('fichier nx présent, --verify absent → emitted (pas de contrôle oracle)', () => {
        const pair = {
            status: 'verified',
            legacy: 'src/presentation/pages/foo/foo.entity.ts',
            nx: 'libs/foo/domain/src/lib/foo.entity.ts',
            oracle: ['@cmz/foo-domain:build'],
        };
        const status = resolveStatus(pair, new Set(), {
            structuralOnly: true,
            verify: false,
            legacyRoot,
            root,
        });
        assert.equal(status, 'emitted');
    });

    it('fichier nx présent, pas de liste oracle → emitted même sous --verify', () => {
        const pair = {
            status: 'verified',
            legacy: 'src/presentation/pages/foo/foo.entity.ts',
            nx: 'libs/foo/domain/src/lib/foo.entity.ts',
        };
        const status = resolveStatus(pair, new Set(), {
            structuralOnly: true,
            verify: true,
            legacyRoot,
            root,
        });
        assert.equal(status, 'emitted');
    });

    it('--verify + tous les oracles requis dans verifiedOracles → verified', () => {
        const pair = {
            status: 'verified',
            legacy: 'src/presentation/pages/foo/foo.entity.ts',
            nx: 'libs/foo/domain/src/lib/foo.entity.ts',
            oracle: ['@cmz/foo-domain:build', '@cmz/foo-domain:test'],
        };
        const status = resolveStatus(
            pair,
            new Set(['@cmz/foo-domain:build', '@cmz/foo-domain:test']),
            { structuralOnly: true, verify: true, legacyRoot, root }
        );
        assert.equal(status, 'verified');
    });

    it('--verify + un seul oracle requis manquant → emitted, PAS verified (pas de faux positif)', () => {
        const pair = {
            status: 'verified',
            legacy: 'src/presentation/pages/foo/foo.entity.ts',
            nx: 'libs/foo/domain/src/lib/foo.entity.ts',
            oracle: ['@cmz/foo-domain:build', '@cmz/foo-domain:test'],
        };
        const status = resolveStatus(pair, new Set(['@cmz/foo-domain:build']), {
            structuralOnly: true,
            verify: true,
            legacyRoot,
            root,
        });
        assert.equal(status, 'emitted');
    });
});
