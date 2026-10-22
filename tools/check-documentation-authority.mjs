#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
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
    productCap:
        'docs/adr/0101-premiere-application-reelle-et-priorite-produit.md',
    roadmap: 'docs/architecture/feuille-de-route.md',
    ledger: 'docs/architecture/taches-restantes.md',
    retainedDiscoveryBrief:
        'docs/projects/signalement-zone-non-couverte/project-brief.md',
});

const CURRENT_CAP_FIELD = 'Première application réelle — décision courante';

// Métadonnées contiguës après le H1, avant tout texte/section/exemple.
// Ni une citation, ni un bloc de code, ni un lien historique ne font autorité.
function metadata(document = '') {
    const [title, ...lines] = document.split(/\r?\n/);
    if (!/^# \S/.test(title)) return [];
    const fields = [];
    for (const line of lines) {
        if (!line.trim()) continue;
        const match = line.match(/^- \*\*([^*]+?) :\*\*\s*(.*?)\s*$/);
        if (match) fields.push({ name: match[1], value: match[2] });
        else if (/^ {2,}\S/.test(line) && fields.length > 0)
            fields.at(-1).value += ` ${line.trim()}`;
        else break;
    }
    return fields;
}

function metadataValue(document, name) {
    const fields = metadata(document).filter((field) => field.name === name);
    return fields.length === 1 ? fields[0].value.trim() : null;
}

// Un seul lien local vers un fichier, résolu depuis le document qui le porte.
function linkedPath(value, source) {
    const target = value?.match(/^\[[^\]\n]+\]\((\.[^\s()?#\\]+)\)$/)?.[1];
    if (!target || !/^\.{1,2}\//.test(target)) return null;
    const path = posix.normalize(posix.join(posix.dirname(source), target));
    return path.startsWith('../') || path === '..' ? null : path;
}

function predecessor(document) {
    const prefix = 'Supersède pour ';
    const fields = metadata(document).filter((field) =>
        field.name.startsWith(prefix)
    );
    if (fields.length !== 1) return null;
    const scope = fields[0].name.slice(prefix.length).trim();
    const path = linkedPath(fields[0].value.trim(), AUTHORITY_FILES.productCap);
    if (!scope || !path || path === AUTHORITY_FILES.productCap) return null;
    return { scope, path };
}

/**
 * @param {Record<string, string>} documents
 * @returns {string[]}
 */
export function collectAuthorityViolations(documents) {
    const violations = [];
    const requireText = (key, value, reason) => {
        if (!documents[key]?.includes(value)) violations.push(reason);
    };

    for (const [key, path] of Object.entries(AUTHORITY_FILES)) {
        if (!documents[key]?.trim())
            violations.push(`${path} est absent ou vide`);
    }
    if (metadataValue(documents.productCap, 'Statut') !== 'Accepted')
        violations.push(
            'le cap courant doit porter le statut Accepted en tête'
        );
    for (const key of ['authority', 'roadmap']) {
        const path = linkedPath(
            metadataValue(documents[key], CURRENT_CAP_FIELD),
            AUTHORITY_FILES[key]
        );
        if (path !== AUTHORITY_FILES.productCap)
            violations.push(
                `${AUTHORITY_FILES[key]} doit porter un renvoi courant unique vers ${AUTHORITY_FILES.productCap}`
            );
    }
    const previous = predecessor(documents.productCap);
    if (!previous) {
        violations.push(
            'le cap courant doit déclarer sa supersession partielle'
        );
    } else if (
        metadataValue(documents.productPredecessor, 'Statut') !== 'Accepted' ||
        linkedPath(
            metadataValue(
                documents.productPredecessor,
                `Superseded pour ${previous.scope} par`
            ),
            previous.path
        ) !== AUTHORITY_FILES.productCap
    ) {
        violations.push(
            `${previous.path} doit rester Accepted avec une supersession partielle réciproque en tête`
        );
    }

    requireText(
        'authority',
        'atelier interne assisté par IA',
        'PROJECT_AUTHORITY.md doit déclarer le produit interne courant'
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
    if (metadataValue(documents.adr94, 'Statut') !== 'Accepted')
        violations.push(
            'ADR-0094 doit rester Accepted pour ses principes conservés'
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
        'retainedDiscoveryBrief',
        '**Statut :** découverte produit',
        'le brief de découverte conservé doit rester en découverte produit'
    );

    if (/create-app[^\n]*--apply\b/.test(documents.appBuilder)) {
        violations.push(
            'LLM_APP_BUILDER.md ne doit pas réintroduire --apply pour create-app'
        );
    }
    if (
        !documents.appBuilder?.includes('--expect-plan <plan_id>') ||
        !documents.appBuilder?.includes('--profile react-spa')
    ) {
        violations.push(
            'LLM_APP_BUILDER.md doit documenter le protocole create-app et le profil React courants'
        );
    }

    return violations;
}

export function readAuthorityDocuments(root = ROOT) {
    const read = (path) => {
        try {
            return readFileSync(join(root, path), 'utf8');
        } catch (error) {
            if (error.code === 'ENOENT') return '';
            throw error;
        }
    };
    const documents = Object.fromEntries(
        Object.entries(AUTHORITY_FILES).map(([key, path]) => [key, read(path)])
    );
    const previous = predecessor(documents.productCap);
    documents.productPredecessor = previous ? read(previous.path) : '';
    return documents;
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
