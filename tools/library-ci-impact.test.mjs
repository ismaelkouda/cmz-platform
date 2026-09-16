import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    classifyLibraryCiImpact,
    COMMON_EXACT_INPUTS,
    INTEGRATION_EXACT_INPUTS,
    ISOLATION_EXACT_INPUTS,
} from './library-ci-impact.mjs';

const NONE = {
    isolation: false,
    integration: false,
    reasons: { isolation: [], integration: [] },
};

describe('impact CI des preuves bibliothèque', () => {
    it('garde seulement le contrat rapide pour une PR applicative ou documentaire', () => {
        assert.deepEqual(
            classifyLibraryCiImpact([
                'apps/backoffice-angular/src/app/app.ts',
                'docs/architecture/audit.md',
                'libs/requests/ui/src/lib/requests.component.ts',
            ]),
            NONE
        );
    });

    it('active les deux preuves pour chaque entrée commune', () => {
        for (const path of COMMON_EXACT_INPUTS) {
            const result = classifyLibraryCiImpact([path]);
            assert.equal(result.isolation, true, path);
            assert.equal(result.integration, true, path);
            assert.deepEqual(result.reasons, {
                isolation: [path],
                integration: [path],
            });
        }
    });

    it('active isolation et E2E pour toute la fermeture du confinement', () => {
        for (const path of ISOLATION_EXACT_INPUTS) {
            const result = classifyLibraryCiImpact([path]);
            assert.equal(result.isolation, true, path);
            assert.equal(result.integration, true, path);
        }
    });

    it('active seulement l’E2E pour chaque entrée propre à l’intégration', () => {
        for (const path of INTEGRATION_EXACT_INPUTS.filter(
            (candidate) => !ISOLATION_EXACT_INPUTS.includes(candidate)
        )) {
            const result = classifyLibraryCiImpact([path]);
            assert.equal(result.isolation, false, path);
            assert.equal(result.integration, true, path);
            assert.deepEqual(result.reasons.integration, [path]);
        }
    });

    it('couvre automatiquement toute nouvelle recette, matrice ou source du moteur', () => {
        for (const path of [
            'conventions/libraries/angular/new-library.setup.json',
            'conventions/libraries/angular/new-library.compat.json',
            'designs/future-application.application-design.json',
            'examples/application-conception-proof/future-contract.json',
            'tools/library-setup/new-runtime-proof.mjs',
            'tools/library-setup/runtime-fixtures/new-probe.ts',
        ]) {
            const result = classifyLibraryCiImpact([path]);
            assert.equal(result.integration, true, path);
        }
    });

    it('ne confond pas des chemins voisins avec la surface gouvernée', () => {
        assert.deepEqual(
            classifyLibraryCiImpact([
                'docs/conventions/libraries/example.md',
                'tools/library-setup-old/sandbox.mjs',
                'package.json.md',
            ]),
            NONE
        );
    });

    it('déduplique et trie les raisons pour un diagnostic déterministe', () => {
        assert.deepEqual(
            classifyLibraryCiImpact([
                'tools/create-app.mjs',
                'bun.lock',
                'tools/create-app.mjs',
            ]),
            {
                isolation: true,
                integration: true,
                reasons: {
                    isolation: ['bun.lock'],
                    integration: ['bun.lock', 'tools/create-app.mjs'],
                },
            }
        );
    });
});
