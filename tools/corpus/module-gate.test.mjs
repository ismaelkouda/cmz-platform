/**
 * Tests node:test — `moduleProjects` (`module-gate.mjs`, audit H-2/H-3).
 *
 * Trouvé lors de l'audit self-review post-ADR-0022 (2026-08-11) : cette
 * fonction énumère les projets Nx d'un module pour le gate build+lint+test
 * qui protège toute écriture du corpus (`assertModuleGate`) — sans aucun
 * test. `runModuleGate`/`assertModuleGate` eux-mêmes ne sont pas testés ici
 * (ils invoquent `bunx nx run-many` réellement — effet de bord assumé, pas
 * une fonction pure ; les couvrir demanderait soit un vrai run Nx en test
 * soit un mock d'`execSync`, hors scope de cette passe ciblée sur la
 * logique pure non testée).
 *
 * S'appuie sur les vrais `project.json` du repo — `report-states` a ses 4
 * couches, une convention stable de ce monorepo (LLM_CONTEXT.md §2).
 *
 * Run: node --test tools/corpus/module-gate.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { moduleProjects } from './module-gate.mjs';

describe('moduleProjects (contre les vrais project.json du repo)', () => {
    it("module 4-couches (report-states) → les 4 projets, dans l'ordre domain/data/application/ui", () => {
        assert.deepEqual(moduleProjects('report-states'), [
            '@cmz/report-states-domain',
            '@cmz/report-states-data',
            '@cmz/report-states-application',
            '@cmz/report-states-ui',
        ]);
    });

    it('module 4-couches (requests) → idem', () => {
        assert.deepEqual(moduleProjects('requests'), [
            '@cmz/requests-domain',
            '@cmz/requests-data',
            '@cmz/requests-application',
            '@cmz/requests-ui',
        ]);
    });

    it("module inexistant → tableau vide, pas d'exception", () => {
        assert.deepEqual(moduleProjects('ce-module-nexiste-pas'), []);
    });

    it('module kernel workflow-details (domain uniquement, ADR-0022) → 1 seul projet', () => {
        assert.deepEqual(moduleProjects('workflow-details'), [
            '@cmz/workflow-details-domain',
        ]);
    });
});
