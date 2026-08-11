/**
 * Tests node:test — helpers de mapping legacy→Nx (`mapping-helpers.mjs`).
 *
 * Trouvé lors de l'audit self-review post-ADR-0022 (2026-08-11) : ces
 * fonctions déterminent *quel chemin* le corpus attribue à chaque nœud IR
 * (workflow-action). Une erreur ici fait mentir silencieusement l'Oracle
 * (un chemin "verified" qui ne correspond en réalité pas au bon fichier).
 * `detailsDomainNxPath` en particulier a été ajoutée dans cette session
 * même (ADR-0022, POC factorisation `workflow-details`) sans aucun test —
 * corrigé ici.
 *
 * Run: node --test tools/corpus/mapping-helpers.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    makeCtx,
    listExportRefVolet,
    legacyPage,
    legacyListExportPage,
    resolveOracle,
    moduleOracle,
    modDetails,
    detailsDomainNxPath,
    WORKFLOW_DETAILS_SHARED_MODULES,
} from './mapping-helpers.mjs';

describe('makeCtx', () => {
    it('résout Volet PascalCase pour un volet connu', () => {
        assert.deepEqual(makeCtx('processing', 'queues'), {
            module: 'processing',
            volet: 'queues',
            Volet: 'Queues',
        });
    });

    it('retombe sur le volet brut si non listé dans VOLET_PASCAL', () => {
        assert.deepEqual(makeCtx('processing', 'inconnu'), {
            module: 'processing',
            volet: 'inconnu',
            Volet: 'inconnu',
        });
    });
});

describe('listExportRefVolet', () => {
    it('report-states → approve (spécifique)', () => {
        assert.equal(listExportRefVolet('report-states'), 'approve');
    });

    it('tout autre module → queues (défaut)', () => {
        assert.equal(listExportRefVolet('requests'), 'queues');
        assert.equal(listExportRefVolet('processing'), 'queues');
        assert.equal(listExportRefVolet('finalization'), 'queues');
    });
});

describe('legacyPage / legacyListExportPage', () => {
    it('legacyPage préfixe le chemin sous presentation/pages/<module>', () => {
        assert.equal(
            legacyPage('requests', 'domain/entities/requests.entity.ts'),
            'src/presentation/pages/requests/domain/entities/requests.entity.ts'
        );
    });

    it('legacyListExportPage : report-states redirige vers approve.component.ts', () => {
        assert.equal(
            legacyListExportPage('report-states', 'domain/x.ts'),
            'src/presentation/pages/report-states/presentation/features/approve/approve.component.ts'
        );
    });

    it('legacyListExportPage : autre module retombe sur legacyPage standard', () => {
        assert.equal(
            legacyListExportPage('requests', 'domain/x.ts'),
            legacyPage('requests', 'domain/x.ts')
        );
    });
});

describe('resolveOracle', () => {
    it("undefined/null → undefined (pas d'oracle attendu)", () => {
        assert.equal(
            resolveOracle(makeCtx('requests', 'queues'), undefined),
            undefined
        );
    });

    it('fonction → appelée avec le contexte', () => {
        const ctx = makeCtx('requests', 'queues');
        const result = resolveOracle(ctx, (c) => [
            `@cmz/${c.module}-domain:build`,
        ]);
        assert.deepEqual(result, ['@cmz/requests-domain:build']);
    });

    it('tableau → substitue processing par le module courant', () => {
        const ctx = makeCtx('finalization', 'tasks');
        const result = resolveOracle(ctx, [
            '@cmz/processing-domain:build',
            '@cmz/processing-application:test',
        ]);
        assert.deepEqual(result, [
            '@cmz/finalization-domain:build',
            '@cmz/finalization-application:test',
        ]);
    });

    it('tableau pour le module processing lui-même → inchangé', () => {
        const ctx = makeCtx('processing', 'queues');
        const result = resolveOracle(ctx, ['@cmz/processing-domain:build']);
        assert.deepEqual(result, ['@cmz/processing-domain:build']);
    });
});

describe('moduleOracle / modDetails', () => {
    it("moduleOracle est l'identité (documente l'intention au call site)", () => {
        const oracle = ['@cmz/processing-domain:build'];
        assert.equal(moduleOracle(oracle), oracle);
    });

    it('modDetails suffixe -details', () => {
        assert.equal(modDetails('requests'), 'requests-details');
    });
});

describe('detailsDomainNxPath (ADR-0022, POC factorisation workflow-details)', () => {
    it('module migré (report-states) → redirige vers la lib partagée', () => {
        assert.equal(
            detailsDomainNxPath(
                'report-states',
                'libs/report-states/domain/src/lib/entities/report-states-details.entity.ts',
                'entities/workflow-details.entity.ts'
            ),
            'libs/workflow-details/domain/src/lib/entities/workflow-details.entity.ts'
        );
    });

    it('module migré (requests) → redirige aussi vers la lib partagée', () => {
        assert.equal(
            detailsDomainNxPath(
                'requests',
                'libs/requests/domain/src/lib/entities/requests-details.entity.ts',
                'entities/workflow-details.entity.ts'
            ),
            'libs/workflow-details/domain/src/lib/entities/workflow-details.entity.ts'
        );
    });

    it('module non migré (processing) → garde le chemin historique par module', () => {
        const perModulePath =
            'libs/processing/domain/src/lib/entities/processing-details.entity.ts';
        assert.equal(
            detailsDomainNxPath(
                'processing',
                perModulePath,
                'entities/workflow-details.entity.ts'
            ),
            perModulePath
        );
    });

    it('module non migré (finalization) → idem, non affecté par le POC', () => {
        const perModulePath =
            'libs/finalization/domain/src/lib/entities/finalization-details.entity.ts';
        assert.equal(
            detailsDomainNxPath(
                'finalization',
                perModulePath,
                'entities/workflow-details.entity.ts'
            ),
            perModulePath
        );
    });

    it('WORKFLOW_DETAILS_SHARED_MODULES contient exactement les 2 modules migrés à ce jour', () => {
        assert.deepEqual([...WORKFLOW_DETAILS_SHARED_MODULES].sort(), [
            'report-states',
            'requests',
        ]);
    });
});
