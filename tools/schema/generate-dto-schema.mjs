#!/usr/bin/env node
/**
 * generate-dto-schema.mjs — T2-1 (Option A).
 *
 * Génère un JSON Schema (draft 2020-12) rétro-ingénié depuis les 303 DTOs
 * TypeScript du dépôt (`libs/*\/data/src/lib/dtos/*.ts`), en utilisant l'API
 * TypeScript Compiler (`ts.createProgram` + AST, pas d'exécution de code
 * DTO — les interfaces/types sont effacés à la compilation).
 *
 * **Limite explicite (voir docs/architecture/memo-openapi.md, Option A) :**
 * ce schéma décrit ce que les DTOs TypeScript *affirment* aujourd'hui. Il
 * hérite de toute erreur ou omission déjà présente dans ces DTOs (eux-mêmes
 * une rétro-ingénierie du frontend legacy — aucun accès à un contrat
 * backend documenté). Il ne garantit PAS la conformité avec ce que
 * l'API réelle retourne en production. C'est un filet anti-dérive
 * interne (DTO ↔ mapper ↔ mock), pas une preuve de contrat externe.
 *
 * Doctrine « pas de nouvelle dépendance » (cf. tools/corpus/validate-pair-schema.mjs
 * en tête de fichier) : uniquement Node natif + `typescript` déjà présent
 * dans node_modules (résolu via require, pas de réseau).
 *
 * Portée syntaxique couverte (auditée manuellement sur les 303 fichiers avant
 * écriture de ce script — voir le rapport de livraison) :
 *   - `export interface X { ... }`, y compris `extends`
 *   - `export type X = <union de string literals>`
 *   - `export type X = <alias vers un autre type nommé>` (ex. `= Y;`)
 *   - `export type X = SimpleResponseDto<Y>` / `PaginatedResponseDto<Y>` /
 *     `Paginate<Y>` (génériques du dépôt — instanciées par consommateur)
 *   - `export enum X { A = 'a', ... }` (enums string)
 *   - `export const X = {...} as const; export type X = (typeof X)[keyof typeof X];`
 *     (pattern « enum-like » observé dans libs/shared/data — ex. MediaStatusDto)
 *   - types inline (object literal anonyme, union, `Record<string, T>`,
 *     `Date`, `| null`, tableaux `T[]`)
 *
 * Non couvert (absent des 303 DTOs au moment de l'écriture, vérifié par
 * grep exhaustif) : `any`, `unknown`, tuples, index signatures `[key: string]`,
 * génériques utilisateur au-delà de ceux de `simple-response.dto.ts`.
 * Si l'un de ces cas apparaît dans un futur DTO, ce générateur log un
 * avertissement explicite plutôt que d'échouer silencieusement (voir
 * `unsupported()`).
 *
 * Usage :
 *   node tools/schema/generate-dto-schema.mjs
 *   node tools/schema/generate-dto-schema.mjs --out <path>   (test/CI)
 *   bun run generate:dto-schema
 */

import { writeFileSync, mkdirSync, globSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const SCHEMA_OUT_PATH = join(
    ROOT,
    'docs/architecture/schema/dto.schema.json'
);
export const MEMO_PATH = 'docs/architecture/memo-openapi.md';

/** Noms des types génériques réutilisables définis dans shared-data. */
const GENERIC_WRAPPER_NAMES = new Set([
    'SimpleResponseDto',
    'PaginatedResponseDto',
    'Paginate',
]);

/**
 * Fichiers DTO à inclure, dans l'ordre de découverte du filesystem
 * (l'ordre n'affecte pas la sortie — voir tri déterministe en fin de
 * pipeline — mais affecte l'ordre de résolution du Program TS).
 */
export function findDtoFiles(root = ROOT) {
    const pattern = join(root, 'libs/*/data/src/lib/dtos/*.ts').replace(
        /\\/g,
        '/'
    );
    const files = globSync(pattern).filter((f) => !f.endsWith('.spec.ts'));
    return files.sort();
}

/** Avertissements de portée non couverte — jamais silencieux. */
const warnings = [];
function unsupported(file, name, detail) {
    warnings.push({ file: relative(ROOT, file), name, detail });
}

function loadCompilerOptions() {
    const tsconfigPath = join(ROOT, 'tsconfig.base.json');
    const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    if (configFile.error) {
        throw new Error(
            'tsconfig.base.json illisible : ' +
                ts.flattenDiagnosticMessageText(
                    configFile.error.messageText,
                    '\n'
                )
        );
    }
    const parsed = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        dirname(tsconfigPath)
    );
    return parsed.options;
}

/**
 * Construit un Program TS couvrant tous les DTOs (+ leurs imports résolus
 * via les path mappings de tsconfig.base.json, ex. @cmz/shared-data).
 */
export function createDtoProgram(files) {
    const options = loadCompilerOptions();
    const program = ts.createProgram({ rootNames: files, options });
    return program;
}

// ---------------------------------------------------------------------------
// Conversion de types TS (AST) → fragments JSON Schema
// ---------------------------------------------------------------------------

/** @returns {{schema: object|null, refName: string|null}} */
function convertTypeNode(node, ctx) {
    if (!node) return { type: 'object' };

    switch (node.kind) {
        case ts.SyntaxKind.StringKeyword:
            return { type: 'string' };
        case ts.SyntaxKind.NumberKeyword:
            return { type: 'number' };
        case ts.SyntaxKind.BooleanKeyword:
            return { type: 'boolean' };
        case ts.SyntaxKind.NullKeyword:
            return { type: 'null' };
        case ts.SyntaxKind.ObjectKeyword:
            // TS `object` (ex. geom?: object sur OpticalFiberNetworkFindOneItemApiDto) —
            // forme non spécifiée dans le DTO source lui-même : modélisé au plus
            // large (objet sans contrainte de propriétés), fidèle à l'absence
            // d'info du DTO plutôt que d'inventer une forme.
            return { type: 'object' };
        case ts.SyntaxKind.UndefinedKeyword:
            return { type: 'null' }; // JSON n'a pas de undefined — traité comme absence/optionnel en amont
        case ts.SyntaxKind.LiteralType: {
            const lit = node.literal;
            if (lit.kind === ts.SyntaxKind.NullKeyword) {
                return { type: 'null' };
            }
            if (lit.kind === ts.SyntaxKind.StringLiteral) {
                return { type: 'string', enum: [lit.text] };
            }
            if (
                lit.kind === ts.SyntaxKind.NumericLiteral ||
                lit.kind === ts.SyntaxKind.PrefixUnaryExpression
            ) {
                return {
                    type: 'number',
                    enum: [Number(lit.getText(ctx.sourceFile))],
                };
            }
            if (lit.kind === ts.SyntaxKind.TrueKeyword) {
                return { type: 'boolean', enum: [true] };
            }
            if (lit.kind === ts.SyntaxKind.FalseKeyword) {
                return { type: 'boolean', enum: [false] };
            }
            unsupported(
                ctx.file,
                ctx.typeName,
                `literal non gérée: ${lit.getText(ctx.sourceFile)}`
            );
            return {};
        }
        case ts.SyntaxKind.ArrayType: {
            const item = convertTypeNode(node.elementType, ctx);
            return { type: 'array', items: item };
        }
        case ts.SyntaxKind.ParenthesizedType:
            return convertTypeNode(node.type, ctx);
        case ts.SyntaxKind.UnionType: {
            const parts = node.types.map((t) => convertTypeNode(t, ctx));
            return mergeUnion(parts);
        }
        case ts.SyntaxKind.TypeLiteral: {
            return convertMembersToObjectSchema(node.members, ctx);
        }
        case ts.SyntaxKind.TypeReference: {
            return convertTypeReference(node, ctx);
        }
        case ts.SyntaxKind.TupleType:
            unsupported(ctx.file, ctx.typeName, 'tuple type non supporté');
            return { type: 'array' };
        case ts.SyntaxKind.AnyKeyword:
        case ts.SyntaxKind.UnknownKeyword:
            unsupported(
                ctx.file,
                ctx.typeName,
                `${ts.SyntaxKind[node.kind]} non supporté`
            );
            return {};
        default:
            unsupported(
                ctx.file,
                ctx.typeName,
                `nœud AST non géré: ${ts.SyntaxKind[node.kind]} (${
                    node.getText ? node.getText(ctx.sourceFile) : ''
                })`
            );
            return {};
    }
}

/** Fusionne une union de fragments JSON Schema (type[]/enum quand homogène, sinon anyOf). */
function mergeUnion(parts) {
    // Cas fréquent : toutes les parts sont { type: 'string', enum: [...] } (string literal union)
    const allStringEnum = parts.every(
        (p) =>
            p.type === 'string' && Array.isArray(p.enum) && p.enum.length === 1
    );
    if (allStringEnum) {
        return { type: 'string', enum: parts.map((p) => p.enum[0]) };
    }

    // Cas fréquent : mélange de types scalaires simples (pas de $ref, pas d'objet) → type: [...]
    const simple = parts.every(
        (p) => p.type && !p.$ref && !p.properties && !p.items && !p.enum
    );
    if (simple) {
        const types = [...new Set(parts.map((p) => p.type))];
        return types.length === 1 ? { type: types[0] } : { type: types };
    }

    // Cas général : anyOf (couvre $ref | null, object | string | null, etc.)
    // On regroupe d'abord les `null` en un `type: 'null'` unique pour rester lisible.
    return { anyOf: dedupeSchemas(parts) };
}

function dedupeSchemas(parts) {
    const seen = new Set();
    const out = [];
    for (const p of parts) {
        const key = JSON.stringify(p);
        if (!seen.has(key)) {
            seen.add(key);
            out.push(p);
        }
    }
    return out;
}

function convertMembersToObjectSchema(members, ctx) {
    const properties = {};
    const required = [];
    for (const member of members) {
        if (!ts.isPropertySignature(member) || !member.name) continue;
        const propName = member.name.getText(ctx.sourceFile);
        const propSchema = member.type ? convertTypeNode(member.type, ctx) : {};
        properties[propName] = propSchema;
        if (!member.questionToken) required.push(propName);
    }
    const schema = {
        type: 'object',
        properties: sortKeys(properties),
        additionalProperties: false,
    };
    if (required.length) schema.required = required.sort();
    return schema;
}

/** Résout `Record<K,V>`, `Date`, `Paginate<T>`/wrappers génériques, et les $ref vers $defs locaux. */
function convertTypeReference(node, ctx) {
    const name = node.typeName.getText(ctx.sourceFile);

    if (name === 'Date') {
        // Wire format : les DTOs `Date` ne sont utilisés que côté requête (filtres) —
        // sérialisées en ISO string sur le wire. Modélisé comme string (format date-time
        // non forcé : la valeur exacte envoyée dépend du call-site, cf. api-date.mapper.ts).
        return { type: 'string' };
    }

    if (name === 'File') {
        // Type DOM `File` (ex. HomeCreateApiDto.image_file) — payload binaire
        // multipart/form-data, jamais sérialisé en JSON. JSON Schema ne peut
        // pas décrire un flux binaire : laissé sans contrainte (schéma vide =
        // « accepte toute valeur ») plutôt que d'inventer une forme JSON qui
        // n'existe pas sur le wire réel pour ce champ.
        return {};
    }

    if (name === 'Record') {
        const args = node.typeArguments ?? [];
        const valueSchema = args[1] ? convertTypeNode(args[1], ctx) : {};
        return { type: 'object', additionalProperties: valueSchema };
    }

    if (name === 'Array') {
        const args = node.typeArguments ?? [];
        return {
            type: 'array',
            items: args[0] ? convertTypeNode(args[0], ctx) : {},
        };
    }

    if (GENERIC_WRAPPER_NAMES.has(name)) {
        const args = node.typeArguments ?? [];
        const inner = args[0] ? convertTypeNode(args[0], ctx) : {};
        return buildGenericWrapperSchema(name, inner);
    }

    // Référence vers un autre DTO/type nommé du dépôt (même fichier, autre
    // fichier du même module, ou @cmz/shared-data) → $ref vers $defs.
    if (ctx.knownTypeNames.has(name)) {
        return { $ref: `#/$defs/${name}` };
    }

    unsupported(
        ctx.file,
        ctx.typeName,
        `référence de type non résolue: ${name}`
    );
    return {};
}

/** Construit la forme JSON Schema exacte de SimpleResponseDto<T>/PaginatedResponseDto<T>/Paginate<T> instanciés. */
function buildGenericWrapperSchema(wrapperName, innerSchema) {
    if (wrapperName === 'SimpleResponseDto') {
        return {
            type: 'object',
            description:
                'Instanciation de SimpleResponseDto<T> (libs/shared/data) — T = le type consommateur.',
            properties: sortKeys({
                error: { type: 'boolean' },
                message: { type: 'string' },
                data: innerSchema,
            }),
            required: ['data', 'error', 'message'],
            additionalProperties: false,
        };
    }
    if (wrapperName === 'PaginatedResponseDto') {
        return {
            type: 'object',
            description:
                'Instanciation de PaginatedResponseDto<T> (libs/shared/data) — T = le type consommateur, imbriqué dans Paginate<T>.',
            properties: sortKeys({
                error: { type: 'boolean' },
                message: { type: 'string' },
                data: buildGenericWrapperSchema('Paginate', innerSchema),
            }),
            required: ['data', 'error', 'message'],
            additionalProperties: false,
        };
    }
    if (wrapperName === 'Paginate') {
        return {
            type: 'object',
            description:
                'Instanciation de Paginate<T> (libs/shared/data) — pagination Laravel-like.',
            properties: sortKeys({
                current_page: { type: 'number' },
                data: { type: 'array', items: innerSchema },
                first_page_url: { type: 'string' },
                from: { type: 'number' },
                last_page: { type: 'number' },
                last_page_url: { type: 'string' },
                links: { type: 'array', items: { $ref: '#/$defs/Link' } },
                next_page_url: { type: 'string' },
                path: { type: 'string' },
                per_page: { type: 'number' },
                prev_page_url: { type: 'string' },
                to: { type: 'number' },
                total: { type: 'number' },
            }),
            required: [
                'current_page',
                'data',
                'first_page_url',
                'from',
                'last_page',
                'last_page_url',
                'links',
                'next_page_url',
                'path',
                'per_page',
                'prev_page_url',
                'to',
                'total',
            ],
            additionalProperties: false,
        };
    }
    throw new Error(`wrapper générique inconnu: ${wrapperName}`);
}

function sortKeys(obj) {
    const out = {};
    for (const key of Object.keys(obj).sort()) out[key] = obj[key];
    return out;
}

// ---------------------------------------------------------------------------
// Extraction des déclarations top-level exportées par fichier
// ---------------------------------------------------------------------------

/**
 * Première passe : collecte tous les noms de types exportés (interface/type/enum)
 * sur l'ensemble des fichiers DTO, pour permettre la résolution de $ref
 * indépendamment de l'ordre de traitement des fichiers.
 */
function collectKnownTypeNames(sourceFiles) {
    const names = new Set();
    for (const sf of sourceFiles) {
        for (const stmt of sf.statements) {
            const isExported = (stmt.modifiers ?? []).some(
                (m) => m.kind === ts.SyntaxKind.ExportKeyword
            );
            if (!isExported) continue;
            if (
                (ts.isInterfaceDeclaration(stmt) ||
                    ts.isTypeAliasDeclaration(stmt) ||
                    ts.isEnumDeclaration(stmt)) &&
                stmt.name
            ) {
                names.add(stmt.name.text);
            }
        }
    }
    return names;
}

function convertEnumDeclaration(stmt, ctx) {
    const values = [];
    for (const member of stmt.members) {
        if (!member.initializer) continue;
        if (ts.isStringLiteral(member.initializer)) {
            values.push(member.initializer.text);
        } else {
            unsupported(
                ctx.file,
                stmt.name.text,
                `membre enum non-string: ${member.getText(ctx.sourceFile)}`
            );
        }
    }
    return { type: 'string', enum: values };
}

function convertInterfaceDeclaration(stmt, ctx) {
    const properties = {};
    const required = [];

    // Membres hérités via `extends` (résolu par nom, uniquement des interfaces locales connues)
    for (const heritage of stmt.heritageClauses ?? []) {
        for (const typeExpr of heritage.types) {
            const parentName = typeExpr.expression.getText(ctx.sourceFile);
            const parentSchema = ctx.resolvedDefs.get(parentName);
            if (parentSchema?.properties) {
                Object.assign(properties, parentSchema.properties);
                if (parentSchema.required)
                    required.push(...parentSchema.required);
            } else {
                unsupported(
                    ctx.file,
                    stmt.name.text,
                    `extends ${parentName} non résolu (ordre de traitement ou type externe)`
                );
            }
        }
    }

    for (const member of stmt.members) {
        if (!ts.isPropertySignature(member) || !member.name) continue;
        const propName = member.name.getText(ctx.sourceFile);
        const propSchema = member.type
            ? convertTypeNode(member.type, { ...ctx, typeName: stmt.name.text })
            : {};
        properties[propName] = propSchema;
        if (!member.questionToken) required.push(propName);
    }

    const schema = {
        type: 'object',
        properties: sortKeys(properties),
        additionalProperties: false,
    };
    if (required.length) schema.required = [...new Set(required)].sort();
    return schema;
}

/**
 * `export type X = <union|ref|générique instancié>`.
 * Gère aussi le pattern `(typeof X)[keyof typeof X]` (enum-like const) en
 * le résolvant via le `const X = {...} as const` associé dans le même fichier.
 */
function convertTypeAliasDeclaration(stmt, ctx, sourceFile) {
    const typeName = stmt.name.text;
    const typeNode = stmt.type;

    if (isTypeofKeyofPattern(typeNode)) {
        return resolveConstAssertionEnum(typeName, sourceFile, ctx);
    }

    return convertTypeNode(typeNode, { ...ctx, typeName });
}

function isTypeofKeyofPattern(node) {
    return (
        ts.isIndexedAccessTypeNode(node) &&
        node.indexType.kind === ts.SyntaxKind.TypeOperator &&
        node.indexType.operator === ts.SyntaxKind.KeyOfKeyword
    );
}

/** Résout `export const X = {A: 'a', B: 'b'} as const;` → enum JSON Schema. */
function resolveConstAssertionEnum(typeName, sourceFile, ctx) {
    for (const stmt of sourceFile.statements) {
        if (!ts.isVariableStatement(stmt)) continue;
        for (const decl of stmt.declarationList.declarations) {
            if (decl.name.getText(sourceFile) !== typeName) continue;
            let init = decl.initializer;
            if (init && ts.isAsExpression(init)) init = init.expression;
            if (init && ts.isObjectLiteralExpression(init)) {
                const values = [];
                for (const prop of init.properties) {
                    if (!ts.isPropertyAssignment(prop)) continue;
                    const v = prop.initializer;
                    if (ts.isStringLiteral(v)) values.push(v.text);
                    else if (v.kind === ts.SyntaxKind.TrueKeyword)
                        values.push(true);
                    else if (v.kind === ts.SyntaxKind.FalseKeyword)
                        values.push(false);
                    else if (ts.isNumericLiteral(v))
                        values.push(Number(v.text));
                    else
                        unsupported(
                            ctx.file,
                            typeName,
                            `valeur const-enum non gérée: ${v.getText(sourceFile)}`
                        );
                }
                const types = [...new Set(values.map((v) => typeof v))];
                return {
                    type: types.length === 1 ? types[0] : types,
                    enum: values,
                };
            }
        }
    }
    unsupported(
        ctx.file,
        typeName,
        'pattern (typeof X)[keyof typeof X] sans const X associé'
    );
    return {};
}

// ---------------------------------------------------------------------------
// Pipeline principal
// ---------------------------------------------------------------------------

export function generateSchema({ files = findDtoFiles() } = {}) {
    warnings.length = 0;
    const program = createDtoProgram(files);
    const fileSet = new Set(files.map((f) => resolve(f)));
    const sourceFiles = program
        .getSourceFiles()
        .filter((sf) => fileSet.has(resolve(sf.fileName)));

    const knownTypeNames = collectKnownTypeNames(sourceFiles);
    const defs = {};
    // resolvedDefs sert à résoudre `extends` intra-fichier de façon fiable
    // même quand l'ordre AST place l'enfant avant le parent dans le fichier.
    const resolvedDefs = new Map();

    // Deux passes : (1) interfaces sans dépendance à `extends` non résolu
    // seraient suffisantes en un seul passage si on triait — plus simple et
    // robuste : deux passes sur l'ensemble des fichiers pour laisser
    // `extends` se résoudre même en cas d'ordre défavorable.
    const pending = [];

    for (const sf of sourceFiles) {
        if (!fileSet.has(resolve(sf.fileName))) continue;
        for (const stmt of sf.statements) {
            const isExported = (stmt.modifiers ?? []).some(
                (m) => m.kind === ts.SyntaxKind.ExportKeyword
            );
            if (!isExported) continue;

            if (ts.isEnumDeclaration(stmt)) {
                const schema = convertEnumDeclaration(stmt, {
                    file: sf.fileName,
                    sourceFile: sf,
                });
                defs[stmt.name.text] = schema;
                resolvedDefs.set(stmt.name.text, schema);
            } else if (
                ts.isInterfaceDeclaration(stmt) &&
                GENERIC_WRAPPER_NAMES.has(stmt.name.text)
            ) {
                // SimpleResponseDto<T>/PaginatedResponseDto<T>/Paginate<T> —
                // génériques réutilisables (libs/shared/data/dtos/simple-response.dto.ts).
                // JSON Schema n'a pas de generics : chaque site d'usage concret
                // (`type X = SimpleResponseDto<Y>`) produit sa propre instanciation
                // ($defs.X) via buildGenericWrapperSchema. Cette entrée-ci documente
                // la forme générique elle-même (T non contraint) pour la lisibilité,
                // mais rien ne devrait $ref cette entrée directement — préférer
                // l'instanciation nommée par le type consommateur.
                const schema = buildGenericWrapperSchema(stmt.name.text, {
                    description:
                        'T — type instancié par le consommateur (non contraint ici).',
                });
                defs[stmt.name.text] = schema;
                resolvedDefs.set(stmt.name.text, schema);
            } else if (ts.isInterfaceDeclaration(stmt)) {
                pending.push({ kind: 'interface', stmt, sf });
            } else if (ts.isTypeAliasDeclaration(stmt)) {
                pending.push({ kind: 'type', stmt, sf });
            }
        }
    }

    const ctxBase = { knownTypeNames, resolvedDefs };

    // Interfaces d'abord (pour que `extends` trouve son parent dans resolvedDefs
    // dans la majorité des cas), avec relance pour les extends non résolus au 1er tour.
    const interfaceItems = pending.filter((p) => p.kind === 'interface');
    const typeItems = pending.filter((p) => p.kind === 'type');

    let remaining = interfaceItems;
    for (let pass = 0; pass < 3 && remaining.length; pass++) {
        const stillPending = [];
        for (const item of remaining) {
            const { stmt, sf } = item;
            const name = stmt.name.text;
            const needsParent = (stmt.heritageClauses ?? []).some((h) =>
                h.types.some((t) => !resolvedDefs.has(t.expression.getText(sf)))
            );
            if (needsParent && pass < 2) {
                stillPending.push(item);
                continue;
            }
            const schema = convertInterfaceDeclaration(stmt, {
                ...ctxBase,
                file: sf.fileName,
                sourceFile: sf,
            });
            defs[name] = schema;
            resolvedDefs.set(name, schema);
        }
        remaining = stillPending;
    }

    for (const { stmt, sf } of typeItems) {
        const name = stmt.name.text;
        // Le pattern const-enum produit DEUX déclarations same-name (const X + type X) —
        // on ne traite que la déclaration `type X = (typeof X)[keyof typeof X]`.
        const schema = convertTypeAliasDeclaration(
            stmt,
            { ...ctxBase, file: sf.fileName, sourceFile: sf },
            sf
        );
        defs[name] = schema;
        resolvedDefs.set(name, schema);
    }

    const sortedDefs = sortKeys(defs);

    const schema = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'https://cmz-platform.local/schemas/dto.schema.json',
        title: 'CMZ Platform DTO Schema (rétro-ingéniérie — T2-1 Option A)',
        description:
            'ATTENTION — PROVENANCE ET LIMITE DE CONFORMITÉ (T2-1, Option A, ' +
            'voir docs/architecture/memo-openapi.md) : ce schéma est généré ' +
            'automatiquement par rétro-ingénierie des interfaces/types/enums ' +
            'TypeScript existants sous libs/*/data/src/lib/dtos/*.ts et ' +
            'libs/shared/data/src/lib/dtos/*.ts (tools/schema/generate-dto-schema.mjs). ' +
            "Il ne dérive d'AUCUN contrat backend documenté et n'a jamais été " +
            "validé contre le trafic réel de l'API. Il hérite donc de toute " +
            'erreur ou omission déjà présente dans les DTOs actuels ' +
            '(eux-mêmes une rétro-ingénierie du frontend legacy — voir ' +
            '§1 du mémo). Ce schéma NE PROUVE PAS la conformité avec ce que ' +
            "le backend retourne réellement en production : c'est un filet " +
            'anti-dérive interne (DTO ↔ mapper ↔ mock), pas un contrat externe. ' +
            'Les Options B (capture réseau) et C (schéma fourni par le backend) ' +
            'restent ouvertes et bloquées-humain. Régénérer : ' +
            '`node tools/schema/generate-dto-schema.mjs` (gate de fraîcheur : ' +
            '`node tools/check-dto-schema.mjs`).',
        type: 'object',
        $defs: sortedDefs,
    };

    return {
        schema,
        warnings: [...warnings],
        defCount: Object.keys(sortedDefs).length,
        fileCount: files.length,
    };
}

/**
 * Sérialise en JSON puis passe par l'API programmatique de Prettier (déjà
 * une dépendance du dépôt — `.lintstagedrc.json` le lance sur tout `*.json`
 * via le hook pre-commit). Nécessaire : `JSON.stringify(schema, null, 2)`
 * seul divergerait systématiquement du fichier committé, puisque le hook
 * pre-commit reformate toujours `dto.schema.json` avec Prettier avant de le
 * staged (ex. tableaux courts `"required": [...]` collapsés sur une ligne).
 * Sans cet appel, `check-dto-schema.mjs` serait en faux rouge permanent
 * juste après un `git commit` normal.
 */
export async function serializeSchema(schema) {
    const raw = JSON.stringify(schema, null, 2) + '\n';
    const prettier = await import('prettier');
    const config = (await prettier.resolveConfig(SCHEMA_OUT_PATH)) ?? {};
    return prettier.format(raw, {
        ...config,
        filepath: SCHEMA_OUT_PATH,
        parser: 'json',
    });
}

async function main() {
    const args = process.argv.slice(2);
    const outIdx = args.indexOf('--out');
    const outPath = outIdx >= 0 ? resolve(args[outIdx + 1]) : SCHEMA_OUT_PATH;

    const { schema, warnings, defCount, fileCount } = generateSchema();

    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, await serializeSchema(schema), 'utf8');

    console.log(
        `[generate-dto-schema] OK — ${defCount} définition(s) extraite(s) de ${fileCount} fichier(s) DTO → ${relative(ROOT, outPath)}`
    );
    if (warnings.length) {
        console.warn(
            `[generate-dto-schema] ${warnings.length} avertissement(s) de portée non couverte :`
        );
        for (const w of warnings) {
            console.warn(`  - ${w.file} :: ${w.name ?? '?'} :: ${w.detail}`);
        }
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((err) => {
        console.error(err);
        process.exitCode = 1;
    });
}
