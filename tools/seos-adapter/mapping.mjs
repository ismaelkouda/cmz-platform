/**
 * Tables de correspondance de l'adaptateur monorepo (ADR-0011).
 *
 * Seule source de vérité pour :
 *   - la distribution des couches générées vers les libs de couche ;
 *   - la réécriture des spécificateurs d'import (alias → nom de package `@cmz/*`).
 *
 * Étendre ces tables suffit à couvrir un nouveau pattern ou une nouvelle couche —
 * on ne forke pas les générateurs (ADR-0011).
 */

/** Scope npm du monorepo. */
export const SCOPE = '@cmz';

/**
 * Couche produite par le générateur → lib de couche.
 * `dir` : sous-dossier sous `libs/<module>/`.
 * `suffix` : suffixe du nom de package `@cmz/<module>-<suffix>`.
 * `tag` : tag Nx de couche (frontières ESLint, Phase 06).
 * `dependsOn` : suffixes des libs internes que cette couche peut importer.
 */
export const LAYERS = {
    domain: {
        dir: 'domain',
        suffix: 'domain',
        tag: 'type:domain',
        dependsOn: [],
    },
    infrastructure: {
        dir: 'data',
        suffix: 'data',
        tag: 'type:data',
        dependsOn: ['domain'],
    },
    application: {
        dir: 'application',
        suffix: 'application',
        tag: 'type:application',
        dependsOn: ['domain', 'data'],
    },
    presentation: {
        dir: 'ui',
        suffix: 'ui',
        tag: 'type:ui',
        dependsOn: ['domain', 'application'],
    },
    di: {
        dir: 'feature',
        suffix: 'feature',
        tag: 'type:feature',
        dependsOn: ['domain', 'data', 'application', 'ui'],
    },
};

/**
 * Les fichiers de couche `di/` ET les fichiers `*.routes.ts` de la racine du
 * module vont dans la lib `feature`.
 */
export const ROOT_FILES_LAYER = 'di';

/**
 * Correspondance des sous-espaces `@shared/*` du projet source vers les libs
 * partagées `@cmz/shared-*` (Phase 05). Le premier segment après `@shared/`
 * décide de la lib.
 */
export const SHARED_SUBSPACES = {
    domain: 'shared-domain',
    class: 'shared-domain',
    data: 'shared-data',
    application: 'shared-application',
    components: 'shared-ui',
    directives: 'shared-ui',
    presentation: 'shared-ui',
    constants: 'shared-constants',
    interface: 'shared-constants',
    di: 'shared-application',
    routes: 'shared-application',
};

/** Fallback si un sous-espace `@shared/*` n'est pas encore cartographié. */
export const SHARED_FALLBACK = 'shared-domain';

/**
 * Classe un spécificateur d'import du projet source.
 *
 * Retourne l'un de :
 *   { kind: 'internal', module, layer, tail }  — import d'un module de couche <layer>
 *   { kind: 'shared', lib }                     — noyau @shared/*  → @cmz/<lib>
 *   { kind: 'core' }                            — noyau @core/*    → @cmz/core
 *   { kind: 'external' }                        — @angular, rxjs, relatif… : inchangé
 *   { kind: 'unknown-layer', layer }            — module reconnu, couche non cartographiée
 *
 * `tail` = chemin après la couche (ex. "entities/x/x.entity"), utilisé pour
 * produire un import relatif quand la cible est dans la même lib.
 */
export function classifySpecifier(spec) {
    const m = /^@(?:pages|presentation\/pages)\/([a-z-]+)\/(.+)$/.exec(spec);
    if (m) {
        const [, module, rest] = m;
        const layer = rest.split('/')[0];
        const cfg = LAYERS[layer];
        if (!cfg) return { kind: 'unknown-layer', layer };
        return {
            kind: 'internal',
            module,
            layer,
            tail: rest.slice(layer.length + 1),
        };
    }
    if (spec.startsWith('@shared/')) {
        const sub = spec.slice('@shared/'.length).split('/')[0];
        return {
            kind: 'shared',
            lib: SHARED_SUBSPACES[sub] ?? SHARED_FALLBACK,
        };
    }
    if (spec.startsWith('@core/')) return { kind: 'core' };
    return { kind: 'external' };
}

/** Nom de package `@cmz/<module>-<suffixe de couche>`. */
export function packageName(module, layer) {
    return `${SCOPE}/${module}-${LAYERS[layer].suffix}`;
}
