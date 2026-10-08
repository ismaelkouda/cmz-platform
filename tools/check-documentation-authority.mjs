#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const AUTHORITY_FILES = Object.freeze({
    authority: 'PROJECT_AUTHORITY.md',
    readme: 'README.md',
    llmContext: 'LLM_CONTEXT.md',
    appBuilder: 'LLM_APP_BUILDER.md',
    adr29: 'docs/adr/0029-perimetre-capacites-plateforme-generation.md',
    adr38: 'docs/adr/0038-nature-produit-public-multi-locataire.md',
    adr94: 'docs/adr/0094-cap-produit-interne-remplacement-progressif-et-cibles-web.md',
    roadmap: 'docs/architecture/feuille-de-route.md',
    ledger: 'docs/architecture/taches-restantes.md',
    firstProduct:
        'docs/projects/signalement-zone-non-couverte/project-brief.md',
});

/**
 * @param {Record<keyof typeof AUTHORITY_FILES, string>} documents
 * @returns {string[]}
 */
export function collectAuthorityViolations(documents) {
    const violations = [];
    const requireText = (key, value, reason) => {
        if (!documents[key].includes(value)) violations.push(reason);
    };

    requireText(
        'authority',
        'atelier interne assisté par IA',
        'PROJECT_AUTHORITY.md doit déclarer le produit interne courant'
    );
    requireText(
        'authority',
        'signalement de zone non couverte',
        'PROJECT_AUTHORITY.md doit nommer la première application réelle'
    );
    requireText(
        'readme',
        'PROJECT_AUTHORITY.md',
        'README.md doit router les nouveaux lecteurs vers PROJECT_AUTHORITY.md'
    );
    requireText(
        'llmContext',
        "n'est plus le point d'entrée",
        'LLM_CONTEXT.md doit annoncer explicitement son statut historique'
    );
    requireText(
        'adr29',
        'Superseded pour le cap produit',
        'ADR-0029 doit rester supersédé pour le cap produit'
    );
    requireText(
        'adr38',
        'Superseded pour la phase courante',
        'ADR-0038 doit rester supersédé pour la phase courante'
    );
    requireText(
        'adr94',
        '**Statut :** Accepted',
        'ADR-0094 doit rester la décision produit acceptée'
    );
    requireText(
        'roadmap',
        '## Chemin critique courant',
        'la feuille de route doit exposer un chemin critique courant'
    );
    requireText(
        'ledger',
        'Registre historique, pas feuille de route courante',
        'taches-restantes.md doit annoncer son statut de registre historique'
    );
    requireText(
        'firstProduct',
        '**Statut :** découverte produit',
        'la première application réelle doit conserver un brief de découverte'
    );

    if (/create-app[^\n]*--apply\b/.test(documents.appBuilder)) {
        violations.push(
            'LLM_APP_BUILDER.md ne doit pas réintroduire --apply pour create-app'
        );
    }
    if (
        !documents.appBuilder.includes('--expect-plan <plan_id>') ||
        !documents.appBuilder.includes('--profile react-spa')
    ) {
        violations.push(
            'LLM_APP_BUILDER.md doit documenter le protocole create-app et le profil React courants'
        );
    }

    return violations;
}

export function readAuthorityDocuments(root = ROOT) {
    return Object.fromEntries(
        Object.entries(AUTHORITY_FILES).map(([key, path]) => [
            key,
            readFileSync(join(root, path), 'utf8'),
        ])
    );
}

function main() {
    const violations = collectAuthorityViolations(readAuthorityDocuments());
    if (violations.length > 0) {
        console.error('FAIL  autorité documentaire incohérente');
        for (const violation of violations) console.error(`  - ${violation}`);
        process.exitCode = 1;
        return;
    }
    console.log(
        'OK  autorité documentaire — cap, historique, roadmap et CLI cohérents'
    );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
