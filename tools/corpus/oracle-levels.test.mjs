/**
 * Tests node:test — niveaux d'oracle G-V-R (`oracle-levels.mjs`, audit H-1).
 *
 * Trouvé lors de l'audit self-review post-ADR-0022 (2026-08-11) : ces
 * fonctions décident si un oracle est "structural" ou "behavioral" —
 * directement propagé dans `STATUS.md`/`LLM_CONTEXT.md` ("Corpus SEOS —
 * nature", `byLevel.structural`/`behavioral`) — sans aucun test.
 *
 * S'appuie sur de vrais `project.json` du repo (pas de mock) : les
 * assertions se basent sur des faits stables de l'architecture (chaque
 * lib `-domain` a un target `test` — convention Vitest établie), pas sur
 * un état susceptible de changer à chaque module ajouté.
 *
 * Run: node --test tools/corpus/oracle-levels.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    oracleLevel,
    projectJsonPath,
    hasNxTestTarget,
    ensureBehavioralLevel,
    layerOracles,
} from './oracle-levels.mjs';

describe('oracleLevel', () => {
    it(':build → structural', () => {
        assert.equal(
            oracleLevel('@cmz/report-states-domain:build'),
            'structural'
        );
    });

    it(':test → behavioral', () => {
        assert.equal(
            oracleLevel('@cmz/report-states-domain:test'),
            'behavioral'
        );
    });

    it('autre suffixe (:lint, :e2e...) → other', () => {
        assert.equal(oracleLevel('@cmz/report-states-domain:lint'), 'other');
        assert.equal(oracleLevel('backoffice-angular:e2e'), 'other');
    });
});

describe('projectJsonPath', () => {
    it('@cmz/core → chemin dédié (pas de couche)', () => {
        assert.ok(
            projectJsonPath('@cmz/core').endsWith('libs/core/project.json')
        );
    });

    it('@cmz/<module>-<layer> → libs/<module>/<layer>/project.json', () => {
        assert.ok(
            projectJsonPath('@cmz/report-states-domain').endsWith(
                'libs/report-states/domain/project.json'
            )
        );
        assert.ok(
            projectJsonPath('@cmz/requests-application').endsWith(
                'libs/requests/application/project.json'
            )
        );
    });

    it('projet hors namespace @cmz/ → null', () => {
        assert.equal(projectJsonPath('backoffice-angular'), null);
    });

    it('@cmz/<module> sans couche reconnue → null', () => {
        assert.equal(projectJsonPath('@cmz/unknown-thing'), null);
    });
});

describe('hasNxTestTarget (contre les vrais project.json du repo)', () => {
    it('@cmz/report-states-domain déclare un target test (convention Vitest)', () => {
        assert.equal(hasNxTestTarget('@cmz/report-states-domain'), true);
    });

    it('@cmz/core déclare un target test', () => {
        assert.equal(hasNxTestTarget('@cmz/core'), true);
    });

    it("projet inexistant → false, pas d'exception", () => {
        assert.equal(
            hasNxTestTarget('@cmz/ce-module-nexiste-pas-domain'),
            false
        );
    });
});

describe('ensureBehavioralLevel', () => {
    it('liste vide/undefined → renvoyée telle quelle', () => {
        assert.equal(ensureBehavioralLevel(undefined), undefined);
        assert.deepEqual(ensureBehavioralLevel([]), []);
    });

    it(":build d'un projet avec target test → ajoute le :test comportemental", () => {
        const result = ensureBehavioralLevel([
            '@cmz/report-states-domain:build',
        ]);
        assert.deepEqual(result, [
            '@cmz/report-states-domain:build',
            '@cmz/report-states-domain:test',
        ]);
    });

    it("n'ajoute pas de doublon si le :test est déjà présent", () => {
        const result = ensureBehavioralLevel([
            '@cmz/report-states-domain:build',
            '@cmz/report-states-domain:test',
        ]);
        assert.deepEqual(result, [
            '@cmz/report-states-domain:build',
            '@cmz/report-states-domain:test',
        ]);
    });

    it('cibles non-:build (ex. :test déjà, :lint) sont laissées inchangées', () => {
        const result = ensureBehavioralLevel([
            '@cmz/report-states-domain:lint',
        ]);
        assert.deepEqual(result, ['@cmz/report-states-domain:lint']);
    });
});

describe('layerOracles', () => {
    it("construit puis enrichit l'oracle structural+behavioral pour une couche", () => {
        const result = layerOracles('report-states', 'domain');
        assert.deepEqual(result, [
            '@cmz/report-states-domain:build',
            '@cmz/report-states-domain:test',
        ]);
    });
});
