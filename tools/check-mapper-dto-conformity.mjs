#!/usr/bin/env node
/**
 * check-mapper-dto-conformity.mjs — T2-2, volet « mappers conformes au schéma ».
 *
 * Contexte : T2-2 documentait ce volet comme non couvert, avec l'intitulé
 * « valider que libs/*\/data/src/lib/mappers/*.ts produit bien des objets
 * domaine cohérents avec le DTO source ». En creusant avant d'écrire quoi
 * que ce soit (voir docs/architecture/taches-restantes.md, entrée T2-2) :
 * `tsconfig.base.json` a déjà `strict: true`, et `ngc --strictTemplates`/
 * `tsc` tournent déjà dans l'oracle multi-niveaux du dépôt. Pour le sens
 * dto → domaine (`mapItemFromDto(dto: XxxApiDto)`), tout accès `dto.champ`
 * à un champ absent du type est **déjà** une erreur de compilation — un
 * outil dédié comparant contre `dto.schema.json` (une projection JSON avec
 * pertes documentées du vrai type TS) serait plus faible que l'oracle
 * déjà actif, donc redondant.
 *
 * Le vrai gap, découvert par inspection réelle (pas supposé) : le sens
 * domaine → dto utilise très majoritairement (75 fichiers sur 313 mappers)
 * le pattern `const params = {} as XxxApiDto;` puis des assignations
 * `params.champ = ...` une à une, certaines conditionnelles (`if (...) {
 * params.champ = ... }`). Le cast `as` désactive la vérification stricte
 * de complétude de TypeScript : rien ne garantit statiquement qu'un champ
 * `required` du DTO cible est bien assigné avant le `return`. C'est ce que
 * ce script vérifie — un vrai gap, pas une redondance avec `tsc --strict`.
 *
 * Portée volontairement limitée à ce pattern précis (`{} as <DtoName>` +
 * assignations `variable.prop = ...` directes) : c'est le seul cas observé
 * dans le dépôt au moment de l'écriture (audité exhaustivement — aucun
 * spread, aucun `Object.assign` dans ce sous-ensemble de fichiers). Si un
 * futur mapper utilise `{ ...x }`, ce script ne le voit pas et log un
 * avertissement de portée (jamais un faux vert silencieux).
 *
 * Ce que ce script NE fait PAS (hors périmètre, non demandé) :
 *   - Valider le sens dto → domaine : déjà couvert par `tsc --strict`.
 *   - Valider la valeur métier assignée (ex. un mauvais mapping de champ
 *     source vers la bonne clé DTO) : nécessiterait de deviner la
 *     sémantique métier sans contrat backend documenté — hors de portée
 *     d'une preuve machine, cf. limite déjà actée pour `dto.schema.json`
 *     lui-même (T2-1, Option A).
 *
 * Usage :
 *   node tools/check-mapper-dto-conformity.mjs
 *   bun run check:mapper-dto-conformity
 */

import { globSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
    createDtoProgram,
    generateSchema,
} from './schema/generate-dto-schema.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Fichiers mapper à auditer — code de production uniquement, jamais les specs. */
export function findMapperFiles(root = ROOT) {
    const pattern = join(root, 'libs/*/data/src/lib/mappers/*.ts').replace(
        /\\/g,
        '/'
    );
    return globSync(pattern)
        .filter((f) => !f.endsWith('.spec.ts'))
        .sort();
}

/**
 * Repère, dans un fichier source, chaque variable initialisée par
 * `<expr> as <DtoName>` où `<expr>` est un littéral objet vide `{}`, et
 * pour chacune : la liste des propriétés assignées de façon
 * INCONDITIONNELLE (au niveau racine du bloc de fonction, jamais dans un
 * `if`/`for`/`while`/`try` — une assignation conditionnelle ne prouve rien
 * statiquement, elle peut ne jamais s'exécuter).
 */
function findCastAssignments(sourceFile, dtoDefNames) {
    const results = [];

    function visitFunctionBody(fnNode) {
        const body = fnNode.body;
        if (!body || !ts.isBlock(body)) return;

        // 1) variables `const x = {} as DtoName;` déclarées au niveau racine du bloc
        const casts = new Map(); // varName -> dtoTypeName
        for (const stmt of body.statements) {
            if (!ts.isVariableStatement(stmt)) continue;
            for (const decl of stmt.declarationList.declarations) {
                if (!decl.initializer || !ts.isAsExpression(decl.initializer))
                    continue;
                const asExpr = decl.initializer;
                if (
                    !ts.isObjectLiteralExpression(asExpr.expression) ||
                    asExpr.expression.properties.length !== 0
                ) {
                    continue; // uniquement `{}` vide — pas notre pattern
                }
                if (!ts.isTypeReferenceNode(asExpr.type)) continue;
                const typeName = asExpr.type.typeName.getText(sourceFile);
                if (!dtoDefNames.has(typeName)) continue;
                if (!ts.isIdentifier(decl.name)) continue;
                casts.set(decl.name.text, typeName);
            }
        }
        if (casts.size === 0) return;

        // 2) assignations `varName.prop = ...` INCONDITIONNELLES uniquement :
        // on ne descend PAS dans if/for/while/try/switch — seules les
        // ExpressionStatement directes du bloc racine comptent.
        const unconditionalProps = new Map(); // varName -> Set<prop>
        for (const varName of casts.keys())
            unconditionalProps.set(varName, new Set());

        for (const stmt of body.statements) {
            if (!ts.isExpressionStatement(stmt)) continue;
            const expr = stmt.expression;
            if (
                !ts.isBinaryExpression(expr) ||
                expr.operatorToken.kind !== ts.SyntaxKind.EqualsToken
            )
                continue;
            const left = expr.left;
            if (
                !ts.isPropertyAccessExpression(left) ||
                !ts.isIdentifier(left.expression)
            )
                continue;
            const varName = left.expression.text;
            if (!unconditionalProps.has(varName)) continue;
            unconditionalProps.get(varName).add(left.name.text);
        }

        for (const [varName, dtoTypeName] of casts) {
            results.push({
                dtoTypeName,
                assignedUnconditionally: unconditionalProps.get(varName),
                fnName: fnNode.name?.getText(sourceFile) ?? '<anonyme>',
            });
        }
    }

    function visit(node) {
        if (
            ts.isFunctionDeclaration(node) ||
            ts.isMethodDeclaration(node) ||
            ts.isArrowFunction(node) ||
            ts.isFunctionExpression(node)
        ) {
            visitFunctionBody(node);
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    return results;
}

export function checkMapperConformity({
    mapperFiles = findMapperFiles(),
    dtoSchema = generateSchema().schema,
} = {}) {
    const dtoDefNames = new Set(Object.keys(dtoSchema.$defs));
    const program = createDtoProgram(mapperFiles);
    const violations = [];
    let castsChecked = 0;

    for (const file of mapperFiles) {
        const sourceFile = program.getSourceFile(resolve(file));
        if (!sourceFile) continue;

        const casts = findCastAssignments(sourceFile, dtoDefNames);
        for (const cast of casts) {
            castsChecked++;
            const def = dtoSchema.$defs[cast.dtoTypeName];
            const required = def?.required ?? [];
            const missing = required.filter(
                (prop) => !cast.assignedUnconditionally.has(prop)
            );
            if (missing.length) {
                violations.push({
                    file: relative(ROOT, file),
                    fnName: cast.fnName,
                    dtoTypeName: cast.dtoTypeName,
                    missing,
                });
            }
        }
    }

    return { violations, castsChecked, mapperFileCount: mapperFiles.length };
}

/** Clé stable pour identifier un cas dans KNOWN_GAPS, indépendante de l'ordre des champs. */
export function violationKey(v) {
    return `${v.file}::${v.fnName}::${v.dtoTypeName}`;
}

/**
 * Baseline figée (2026-08-18) — 23 cas réels découverts à l'écriture de ce
 * gate, analysés un par un (voir docs/architecture/taches-restantes.md,
 * entrée T2-2) : 2 familles distinctes, aucune n'a de test unitaire dans le
 * dépôt pour trancher « bug réel » vs « DTO mal typé » (pas d'accès à
 * `$SEOS_LEGACY_ROOT` ni à un contrat backend documenté dans ce sandbox).
 * Même doctrine que `check-pattern-nx-coverage.mjs` (`KNOWN_GAPS`) : ces
 * cas ne sont PAS neutralisés silencieusement — ils restent listés
 * nommément, la commande échoue si un cas listé ici devient stale (corrigé
 * sans retirer l'entrée), et surtout échoue sur tout **nouveau** cas non
 * présent dans cette liste. Le gate protège donc contre la régression dès
 * maintenant, sans bloquer sur les 23 cas existants avant une revue humaine.
 * Retirer une entrée dès que le mapper/DTO correspondant est corrigé.
 */
const KNOWN_GAPS = new Set([
    'libs/administrative-infrastructure/data/src/lib/mappers/infrastructure-create.mapper.ts::infrastructureCreateMapper::InfrastructureCreateApiDto',
    'libs/administrative-infrastructure/data/src/lib/mappers/infrastructure-delete.mapper.ts::infrastructureDeleteMapper::InfrastructureDeleteApiDto',
    'libs/administrative-infrastructure/data/src/lib/mappers/infrastructure-filter.mapper.ts::infrastructureFilterMapper::InfrastructureFilterApiDto',
    'libs/administrative-infrastructure/data/src/lib/mappers/infrastructure-find-one-filter.mapper.ts::infrastructureFindOneFilterMapper::InfrastructureFindOneFilterApiDto',
    'libs/administrative-infrastructure/data/src/lib/mappers/infrastructure-type-create.mapper.ts::infrastructureTypeCreateMapper::InfrastructureTypeCreateApiDto',
    'libs/administrative-infrastructure/data/src/lib/mappers/infrastructure-type-delete.mapper.ts::infrastructureTypeDeleteMapper::InfrastructureTypeDeleteApiDto',
    'libs/administrative-infrastructure/data/src/lib/mappers/infrastructure-type-disable.mapper.ts::infrastructureTypeDisableMapper::InfrastructureTypeDisableApiDto',
    'libs/administrative-infrastructure/data/src/lib/mappers/infrastructure-type-enable.mapper.ts::infrastructureTypeEnableMapper::InfrastructureTypeEnableApiDto',
    'libs/administrative-infrastructure/data/src/lib/mappers/infrastructure-type-find-one-filter.mapper.ts::infrastructureTypeFindOneFilterMapper::InfrastructureTypeFindOneFilterApiDto',
    'libs/administrative-infrastructure/data/src/lib/mappers/infrastructure-type-update.mapper.ts::infrastructureTypeUpdateMapper::InfrastructureTypeUpdateApiDto',
    'libs/administrative-infrastructure/data/src/lib/mappers/infrastructure-update.mapper.ts::infrastructureUpdateMapper::InfrastructureUpdateApiDto',
    'libs/coverage-areas/data/src/lib/mappers/mobile-network-create.mapper.ts::mobileNetworkCreateMapper::MobileNetworkCreateApiDto',
    'libs/coverage-areas/data/src/lib/mappers/mobile-network-delete.mapper.ts::mobileNetworkDeleteMapper::MobileNetworkDeleteApiDto',
    'libs/coverage-areas/data/src/lib/mappers/mobile-network-disable.mapper.ts::mobileNetworkDisableMapper::MobileNetworkDisableApiDto',
    'libs/coverage-areas/data/src/lib/mappers/mobile-network-enable.mapper.ts::mobileNetworkEnableMapper::MobileNetworkEnableApiDto',
    'libs/coverage-areas/data/src/lib/mappers/mobile-network-find-one-filter.mapper.ts::mobileNetworkFindOneFilterMapper::MobileNetworkFindOneFilterApiDto',
    'libs/coverage-areas/data/src/lib/mappers/mobile-network-update.mapper.ts::mobileNetworkUpdateMapper::MobileNetworkUpdateApiDto',
    'libs/coverage-areas/data/src/lib/mappers/site-group-create.mapper.ts::siteGroupCreateMapper::SiteGroupCreateApiDto',
    'libs/coverage-areas/data/src/lib/mappers/site-group-delete.mapper.ts::siteGroupDeleteMapper::SiteGroupDeleteApiDto',
    'libs/coverage-areas/data/src/lib/mappers/site-group-disable.mapper.ts::siteGroupDisableMapper::SiteGroupDisableApiDto',
    'libs/coverage-areas/data/src/lib/mappers/site-group-enable.mapper.ts::siteGroupEnableMapper::SiteGroupEnableApiDto',
    'libs/coverage-areas/data/src/lib/mappers/site-group-find-one-filter.mapper.ts::siteGroupFindOneFilterMapper::SiteGroupFindOneFilterApiDto',
    'libs/coverage-areas/data/src/lib/mappers/site-group-update.mapper.ts::siteGroupUpdateMapper::SiteGroupUpdateApiDto',
]);

function main() {
    const { violations, castsChecked, mapperFileCount } =
        checkMapperConformity();

    console.log(
        `INFO  ${mapperFileCount} fichier(s) mapper audité(s), ${castsChecked} cast(s) ` +
            '« {} as <DtoName> » vérifié(s) contre les champs required du schéma DTO.'
    );

    const violationsByKey = new Map(
        violations.map((v) => [violationKey(v), v])
    );
    const newGaps = [...violationsByKey.keys()].filter(
        (key) => !KNOWN_GAPS.has(key)
    );
    const staleGaps = [...KNOWN_GAPS].filter(
        (key) => !violationsByKey.has(key)
    );

    let failed = false;

    if (newGaps.length) {
        failed = true;
        console.error('');
        console.error(
            `FAIL  check:mapper-dto-conformity — ${newGaps.length} nouveau(x) ` +
                'mapper(s) omettent un champ requis du DTO cible (absent de KNOWN_GAPS) :'
        );
        for (const key of newGaps) {
            const v = violationsByKey.get(key);
            console.error(
                `  - ${v.file} :: ${v.fnName}() → ${v.dtoTypeName} : ` +
                    `champ(s) requis jamais assigné(s) inconditionnellement : ${v.missing.join(', ')}`
            );
        }
        console.error('');
        console.error(
            'Remède : assigner ce(s) champ(s) inconditionnellement avant le return, ' +
                'ou si l’absence est réellement voulue, vérifier que le champ est bien ' +
                'optionnel (`?`) côté DTO source (régénérer avec ' +
                '`node tools/schema/generate-dto-schema.mjs` si le DTO a changé) plutôt ' +
                'que de compter sur le cast `as` pour masquer l’écart. Si le cas est déjà ' +
                'connu et accepté après revue humaine, ajouter la clé à KNOWN_GAPS dans ' +
                'tools/check-mapper-dto-conformity.mjs avec une justification.'
        );
    }

    if (staleGaps.length) {
        failed = true;
        console.error('');
        console.error(
            `FAIL  check:mapper-dto-conformity — ${staleGaps.length} entrée(s) ` +
                'KNOWN_GAPS obsolète(s) (le mapper est maintenant conforme, retirer ' +
                'l’entrée de tools/check-mapper-dto-conformity.mjs) :'
        );
        for (const key of staleGaps) {
            console.error(`  - ${key}`);
        }
    }

    if (failed) process.exit(1);

    console.log(
        `OK  check:mapper-dto-conformity — ${violations.length} cas connu(s) dans ` +
            'KNOWN_GAPS (baseline figée, T2-2), aucun nouveau cas, aucune entrée obsolète.'
    );
    process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
