import { createHash, randomUUID } from 'node:crypto';
import {
    closeSync,
    existsSync,
    fsyncSync,
    lstatSync,
    mkdirSync,
    openSync,
    readFileSync,
    renameSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import ts from 'typescript';

const CONFIG_FILES = [
    'eslint.config.mjs',
    'tsconfig.base.json',
    'knip.json',
    'package.json',
    'bun.lock',
];
const CLEANED_CONFIG_FILES = [
    'eslint.config.mjs',
    'tsconfig.base.json',
    'knip.json',
    'package.json',
];

function assertRegularFile(path, label) {
    const metadata = lstatSync(path);
    if (!metadata.isFile() || metadata.isSymbolicLink())
        throw new Error(
            `${label} doit être un fichier régulier, jamais un lien.`
        );
}

function readRegularFile(path, label) {
    assertRegularFile(path, label);
    return readFileSync(path);
}

function writeAtomic(path, content) {
    if (existsSync(path)) assertRegularFile(path, path);
    mkdirSync(dirname(path), { recursive: true });
    const temporary = join(
        dirname(path),
        `.retire-config-${process.pid}-${randomUUID()}`
    );
    let fd;
    try {
        fd = openSync(temporary, 'wx', 0o600);
        writeFileSync(fd, content);
        fsyncSync(fd);
        closeSync(fd);
        fd = undefined;
        renameSync(temporary, path);
        const parent = openSync(dirname(path), 'r');
        fsyncSync(parent);
        closeSync(parent);
    } catch (error) {
        if (fd !== undefined) closeSync(fd);
        rmSync(temporary, { force: true });
        throw error;
    }
}

export function captureConfigOriginals(workspaceRoot) {
    return Object.fromEntries(
        CONFIG_FILES.map((file) => [
            file,
            readRegularFile(join(workspaceRoot, file), file).toString('base64'),
        ])
    );
}

export function captureOptionalRegularFile(workspaceRoot, relativePath) {
    const path = join(workspaceRoot, relativePath);
    if (!existsSync(path)) return null;
    return readRegularFile(path, relativePath).toString('base64');
}

export function optionalOriginalSha256(original) {
    return original === null
        ? null
        : createHash('sha256')
              .update(Buffer.from(original, 'base64'))
              .digest('hex');
}

export function desiredConfigCleanupSha256(configOriginals, moduleName, plan) {
    const originals = Object.fromEntries(
        CLEANED_CONFIG_FILES.map((file) => [
            file,
            Buffer.from(configOriginals[file], 'base64').toString('utf8'),
        ])
    );
    return Object.fromEntries(
        Object.entries(computeConfigCleanup(originals, moduleName, plan)).map(
            ([file, content]) => [
                file,
                createHash('sha256').update(content).digest('hex'),
            ]
        )
    );
}

export function validateTransactionalConfigs(
    workspaceRoot,
    state,
    { requireDesired = false } = {}
) {
    for (const file of CLEANED_CONFIG_FILES) {
        const content = readRegularFile(join(workspaceRoot, file), file);
        const current = createHash('sha256').update(content).digest('hex');
        const allowed = requireDesired
            ? [state.desiredConfigSha256[file]]
            : [
                  state.configOriginalSha256[file],
                  state.desiredConfigSha256[file],
              ];
        if (!allowed.includes(current))
            throw new Error(
                `${file} a été modifié hors de la transaction de retrait.`
            );
    }
}

export function validateOptionalFileForRestore(
    workspaceRoot,
    relativePath,
    originalSha256,
    createdSha256
) {
    const current = captureOptionalRegularFile(workspaceRoot, relativePath);
    const currentHash = optionalOriginalSha256(current);
    if (currentHash === null) {
        if (originalSha256 !== null)
            throw new Error(
                `Le fichier initial ${relativePath} a disparu hors de la transaction.`
            );
        return;
    }
    if (![originalSha256, createdSha256].filter(Boolean).includes(currentHash))
        throw new Error(
            `${relativePath} n’est pas une version journalisée ; restauration automatique refusée.`
        );
}

export function restoreOptionalRegularFile(
    workspaceRoot,
    relativePath,
    original,
    expectedHash
) {
    const path = join(workspaceRoot, relativePath);
    if (original === null) {
        if (!existsSync(path)) return;
        assertRegularFile(path, relativePath);
        rmSync(path);
        const parent = openSync(dirname(path), 'r');
        fsyncSync(parent);
        closeSync(parent);
        return;
    }
    const content = Buffer.from(original, 'base64');
    const actualHash = createHash('sha256').update(content).digest('hex');
    if (actualHash !== expectedHash)
        throw new Error(`Sauvegarde optionnelle altérée : ${relativePath}`);
    writeAtomic(path, content);
}

export function configOriginalsSha256(originals) {
    return Object.fromEntries(
        Object.entries(originals).map(([file, base64]) => [
            file,
            createHash('sha256')
                .update(Buffer.from(base64, 'base64'))
                .digest('hex'),
        ])
    );
}

export function restoreConfigOriginals(
    workspaceRoot,
    originals,
    expectedHashes
) {
    for (const file of CONFIG_FILES) {
        if (typeof originals?.[file] !== 'string')
            throw new Error(`Sauvegarde de configuration absente : ${file}`);
        const content = Buffer.from(originals[file], 'base64');
        const actualHash = createHash('sha256').update(content).digest('hex');
        if (actualHash !== expectedHashes?.[file])
            throw new Error(`Sauvegarde de configuration altérée : ${file}`);
        writeAtomic(join(workspaceRoot, file), content);
    }
}

function parseEslintConstraints(source) {
    const file = ts.createSourceFile(
        'eslint.config.mjs',
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.JS
    );
    if (file.parseDiagnostics.length > 0) {
        const diagnostic = file.parseDiagnostics[0];
        throw new Error(
            `eslint.config.mjs syntaxiquement invalide : ` +
                ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
        );
    }
    const constraints = [];
    let depConstraintArrays = 0;
    let depConstraints;
    function visit(node) {
        if (
            ts.isPropertyAssignment(node) &&
            node.name.getText(file) === 'depConstraints'
        ) {
            depConstraintArrays += 1;
            if (!ts.isArrayLiteralExpression(node.initializer))
                throw new Error(
                    'eslint.config.mjs: depConstraints doit être un tableau littéral.'
                );
            depConstraints = node.initializer;
            for (const element of node.initializer.elements) {
                if (!ts.isObjectLiteralExpression(element))
                    throw new Error(
                        'eslint.config.mjs: chaque depConstraint doit être un objet littéral.'
                    );
                const sourceTagProperties = element.properties.filter(
                    (property) =>
                        ts.isPropertyAssignment(property) &&
                        property.name.getText(file) === 'sourceTag'
                );
                if (sourceTagProperties.length !== 1)
                    throw new Error(
                        'eslint.config.mjs: chaque depConstraint exige un sourceTag unique.'
                    );
                const initializer = sourceTagProperties[0].initializer;
                if (!ts.isStringLiteral(initializer))
                    throw new Error(
                        'eslint.config.mjs: sourceTag doit être une chaîne littérale.'
                    );
                constraints.push({
                    array: node.initializer,
                    element,
                    sourceTag: initializer.text,
                });
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(file);
    if (depConstraintArrays !== 1)
        throw new Error(
            'eslint.config.mjs: aucun depConstraints structurel trouvé.'
        );
    return { constraints, depConstraints, file };
}

function removeEslintScopeConstraint(source, scopeTag) {
    const parsed = parseEslintConstraints(source);
    const matches = parsed.constraints.filter(
        (constraint) => constraint.sourceTag === scopeTag
    );
    if (matches.length === 0) return source;
    if (matches.length !== 1)
        throw new Error(
            `eslint.config.mjs doit contenir exactement une contrainte ${scopeTag}, trouvée(s): ${matches.length}.`
        );
    const { array, element } = matches[0];
    const index = array.elements.indexOf(element);
    let start;
    let end;
    if (index < array.elements.length - 1) {
        start = element.getFullStart();
        end = array.elements[index + 1].getFullStart();
    } else if (index > 0) {
        const previous = array.elements[index - 1];
        const before = source.slice(
            previous.end,
            element.getStart(parsed.file)
        );
        const previousComma = before.indexOf(',');
        if (previousComma < 0)
            throw new Error(
                'eslint.config.mjs: séparateur précédent introuvable.'
            );
        const afterElement = source.slice(element.end, array.end - 1);
        const trailingComma = afterElement.indexOf(',');
        if (trailingComma >= 0) {
            start = previous.end + previousComma + 1;
            end = element.end + trailingComma + 1;
        } else {
            start = previous.end;
            end = element.end;
        }
    } else {
        start = element.getFullStart();
        const afterElement = source.slice(element.end, array.end - 1);
        const trailingComma = afterElement.indexOf(',');
        end = trailingComma < 0 ? element.end : element.end + trailingComma + 1;
    }
    const result = `${source.slice(0, start)}${source.slice(end)}`;
    const after = parseEslintConstraints(result).constraints.map(
        (constraint) => constraint.sourceTag
    );
    const expected = parsed.constraints
        .filter((constraint) => constraint !== matches[0])
        .map((constraint) => constraint.sourceTag);
    if (JSON.stringify(after) !== JSON.stringify(expected))
        throw new Error(
            `eslint.config.mjs: la transformation AST n'a pas retiré exclusivement ${scopeTag}.`
        );
    return result;
}

function addEslintScopeConstraint(source, scopeTag) {
    const parsed = parseEslintConstraints(source);
    if (
        parsed.constraints.some(
            (constraint) => constraint.sourceTag === scopeTag
        )
    )
        throw new Error(`eslint.config.mjs contient déjà ${scopeTag}.`);
    const array = parsed.depConstraints;
    if (!array || array.elements.length === 0)
        throw new Error('eslint.config.mjs: depConstraints vide non supporté.');
    const last = array.elements[array.elements.length - 1];
    const lineStart = source.lastIndexOf('\n', last.getStart(parsed.file)) + 1;
    const indent = source.slice(lineStart, last.getStart(parsed.file));
    if (!/^\s+$/.test(indent))
        throw new Error(
            'eslint.config.mjs: indentation de depConstraints indéterminable.'
        );
    const closingBracket = array.end - 1;
    let whitespaceStart = closingBracket;
    while (whitespaceStart > 0 && /\s/.test(source[whitespaceStart - 1]))
        whitespaceStart -= 1;
    const insertion =
        `${array.elements.hasTrailingComma ? '' : ','}\n` +
        `${indent}{\n` +
        `${indent}    sourceTag: '${scopeTag}',\n` +
        `${indent}    onlyDependOnLibsWithTags: [\n` +
        `${indent}        '${scopeTag}',\n` +
        `${indent}        'scope:shared',\n` +
        `${indent}    ],\n` +
        `${indent}},`;
    const result = `${source.slice(0, whitespaceStart)}${insertion}${source.slice(whitespaceStart)}`;
    const after = parseEslintConstraints(result).constraints.map(
        (constraint) => constraint.sourceTag
    );
    const expected = [
        ...parsed.constraints.map((constraint) => constraint.sourceTag),
        scopeTag,
    ];
    if (JSON.stringify(after) !== JSON.stringify(expected))
        throw new Error(
            `eslint.config.mjs: la transformation AST n'a pas ajouté exclusivement ${scopeTag}.`
        );
    return result;
}

function jsonPropertyName(property, file) {
    if (!ts.isPropertyAssignment(property)) return null;
    if (ts.isStringLiteral(property.name)) return property.name.text;
    return property.name.getText(file);
}

function parseJsonDocument(source, filename) {
    const file = ts.parseJsonText(filename, source);
    if (file.parseDiagnostics.length > 0) {
        const diagnostic = file.parseDiagnostics[0];
        throw new Error(
            `${filename} syntaxiquement invalide : ${ts.flattenDiagnosticMessageText(
                diagnostic.messageText,
                '\n'
            )}`
        );
    }
    return file;
}

function removeListElement(source, list, element, container, file, filename) {
    const index = list.indexOf(element);
    let start;
    let end;
    let replacement = '';
    if (index < list.length - 1) {
        if (index === 0) {
            start = container.getStart(file) + 1;
            replacement = source.slice(start, element.getStart(file));
            end = list[index + 1].getStart(file);
        } else {
            start = element.getFullStart();
            end = list[index + 1].getFullStart();
        }
    } else if (index > 0) {
        const previous = list[index - 1];
        const parentEnd = container.end - 1;
        const afterElement = source.slice(element.end, parentEnd);
        const trailingComma = afterElement.indexOf(',');
        if (trailingComma >= 0) {
            const before = source.slice(previous.end, element.getStart(file));
            const previousComma = before.indexOf(',');
            if (previousComma < 0)
                throw new Error(
                    `${filename}: séparateur précédent introuvable.`
                );
            start = previous.end + previousComma + 1;
            end = element.end + trailingComma + 1;
        } else {
            start = previous.end;
            end = element.end;
        }
    } else {
        start = element.getFullStart();
        const parentEnd = container.end - 1;
        const afterElement = source.slice(element.end, parentEnd);
        const trailingComma = afterElement.indexOf(',');
        end = trailingComma < 0 ? element.end : element.end + trailingComma + 1;
    }
    return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

function removeJsonMatchingEntries(source, forbidden, filename) {
    let result = source;
    let removed = 0;
    for (;;) {
        const file = parseJsonDocument(result, filename);
        let match;
        function visit(node, parent) {
            if (match) return;
            if (
                ts.isPropertyAssignment(node) &&
                forbidden.has(jsonPropertyName(node, file)) &&
                ts.isObjectLiteralExpression(parent)
            ) {
                match = {
                    container: parent,
                    element: node,
                    list: parent.properties,
                };
                return;
            }
            if (
                ts.isStringLiteral(node) &&
                forbidden.has(node.text) &&
                ts.isArrayLiteralExpression(parent)
            ) {
                match = {
                    container: parent,
                    element: node,
                    list: parent.elements,
                };
                return;
            }
            ts.forEachChild(node, (child) => visit(child, node));
        }
        visit(file, undefined);
        if (!match) return { source: result, removed };
        result = removeListElement(
            result,
            match.list,
            match.element,
            match.container,
            file,
            filename
        );
        removed += 1;
    }
}

function parseJsonPaths(source) {
    const file = ts.parseJsonText('tsconfig.base.json', source);
    if (file.parseDiagnostics.length > 0) {
        const diagnostic = file.parseDiagnostics[0];
        throw new Error(
            `tsconfig.base.json syntaxiquement invalide : ${ts.flattenDiagnosticMessageText(
                diagnostic.messageText,
                '\n'
            )}`
        );
    }
    const statement = file.statements[0];
    const root =
        statement && ts.isExpressionStatement(statement)
            ? statement.expression
            : undefined;
    if (!root || !ts.isObjectLiteralExpression(root))
        throw new Error('tsconfig.base.json: racine objet attendue.');
    const compilerOptionsProperty = root.properties.find(
        (property) => jsonPropertyName(property, file) === 'compilerOptions'
    );
    if (
        !compilerOptionsProperty ||
        !ts.isPropertyAssignment(compilerOptionsProperty) ||
        !ts.isObjectLiteralExpression(compilerOptionsProperty.initializer)
    )
        throw new Error('tsconfig.base.json: compilerOptions objet absent.');
    const pathsProperty = compilerOptionsProperty.initializer.properties.find(
        (property) => jsonPropertyName(property, file) === 'paths'
    );
    if (
        !pathsProperty ||
        !ts.isPropertyAssignment(pathsProperty) ||
        !ts.isObjectLiteralExpression(pathsProperty.initializer)
    )
        throw new Error('tsconfig.base.json: compilerOptions.paths absent.');
    return { file, paths: pathsProperty.initializer };
}

function addJsonPath(source, alias, target) {
    const { file, paths } = parseJsonPaths(source);
    if (
        paths.properties.some(
            (property) => jsonPropertyName(property, file) === alias
        )
    )
        throw new Error(`tsconfig.base.json contient déjà ${alias}.`);
    if (paths.properties.length === 0)
        throw new Error('tsconfig.base.json: paths vide non supporté.');
    const last = paths.properties[paths.properties.length - 1];
    const lineStart = source.lastIndexOf('\n', last.getStart(file)) + 1;
    const indent = source.slice(lineStart, last.getStart(file));
    if (!/^\s+$/.test(indent))
        throw new Error(
            'tsconfig.base.json: indentation de paths indéterminable.'
        );
    const closingBrace = paths.end - 1;
    let whitespaceStart = closingBrace;
    while (whitespaceStart > 0 && /\s/.test(source[whitespaceStart - 1]))
        whitespaceStart -= 1;
    const insertion =
        `${paths.properties.hasTrailingComma ? '' : ','}\n` +
        `${indent}${JSON.stringify(alias)}: [\n` +
        `${indent}  ${JSON.stringify(target)}\n` +
        `${indent}]`;
    const result = `${source.slice(0, whitespaceStart)}${insertion}${source.slice(whitespaceStart)}`;
    const reparsed = parseJsonPaths(result);
    if (
        !reparsed.paths.properties.some(
            (property) => jsonPropertyName(property, reparsed.file) === alias
        )
    )
        throw new Error(
            `tsconfig.base.json: ajout structurel de ${alias} non vérifié.`
        );
    return result;
}

function removeJsonPath(source, alias) {
    const { file, paths } = parseJsonPaths(source);
    const matches = paths.properties.filter(
        (property) => jsonPropertyName(property, file) === alias
    );
    if (matches.length === 0) return source;
    if (matches.length !== 1)
        throw new Error(`tsconfig.base.json: alias ${alias} dupliqué.`);
    const property = matches[0];
    const index = paths.properties.indexOf(property);
    let start;
    let end;
    if (index < paths.properties.length - 1) {
        start = property.getFullStart();
        end = paths.properties[index + 1].getFullStart();
    } else if (index > 0) {
        start = paths.properties[index - 1].end;
        end = property.end;
    } else {
        start = property.getFullStart();
        end = property.end;
    }
    const result = `${source.slice(0, start)}${source.slice(end)}`;
    const reparsed = parseJsonPaths(result);
    if (
        reparsed.paths.properties.some(
            (candidate) => jsonPropertyName(candidate, reparsed.file) === alias
        )
    )
        throw new Error(
            `tsconfig.base.json: retrait structurel de ${alias} non vérifié.`
        );
    return result;
}

export function applyConfigCleanup(workspaceRoot, moduleName, plan) {
    const originals = Object.fromEntries(
        [
            'eslint.config.mjs',
            'tsconfig.base.json',
            'knip.json',
            'package.json',
        ].map((file) => [
            file,
            readRegularFile(join(workspaceRoot, file), file).toString('utf8'),
        ])
    );
    const desired = computeConfigCleanup(originals, moduleName, plan);
    const changed = [];
    for (const [file, after] of Object.entries(desired)) {
        if (after === originals[file]) continue;
        writeAtomic(join(workspaceRoot, file), after);
        changed.push(file);
    }
    return changed;
}

export function computeConfigCleanup(originals, moduleName, plan) {
    const files = [
        'eslint.config.mjs',
        'tsconfig.base.json',
        'knip.json',
        'package.json',
    ];
    if (files.some((file) => typeof originals?.[file] !== 'string'))
        throw new Error(
            'Sources de configuration incomplètes pour le retrait.'
        );
    const aliases = new Set(plan.projects.map((project) => project.name));
    const forbidden = new Set([
        ...aliases,
        `scope:${moduleName}`,
        ...plan.roots,
        ...plan.roots.map((root) => `./${root}`),
    ]);
    let tsconfig = originals['tsconfig.base.json'];
    for (const alias of [...aliases].reverse())
        tsconfig = removeJsonPath(tsconfig, alias);
    return {
        'eslint.config.mjs': removeEslintScopeConstraint(
            originals['eslint.config.mjs'],
            `scope:${moduleName}`
        ),
        'tsconfig.base.json': tsconfig,
        'knip.json': removeJsonMatchingEntries(
            originals['knip.json'],
            forbidden,
            'knip.json'
        ).source,
        'package.json': removeJsonMatchingEntries(
            originals['package.json'],
            forbidden,
            'package.json'
        ).source,
    };
}

export function applyConfigAddition(workspaceRoot, moduleName, plan) {
    const eslintPath = join(workspaceRoot, 'eslint.config.mjs');
    const eslintBefore = readRegularFile(
        eslintPath,
        'eslint.config.mjs'
    ).toString('utf8');
    const tsconfigPath = join(workspaceRoot, 'tsconfig.base.json');
    const tsconfigBefore = readRegularFile(
        tsconfigPath,
        'tsconfig.base.json'
    ).toString('utf8');
    const desired = computeConfigAddition(
        {
            'eslint.config.mjs': eslintBefore,
            'tsconfig.base.json': tsconfigBefore,
        },
        moduleName,
        plan
    );
    const changed = [];
    const eslintAfter = desired['eslint.config.mjs'];
    writeAtomic(eslintPath, eslintAfter);
    changed.push('eslint.config.mjs');
    const tsconfigAfter = desired['tsconfig.base.json'];
    writeAtomic(tsconfigPath, tsconfigAfter);
    changed.push('tsconfig.base.json');
    return changed;
}

export function computeConfigAddition(originals, moduleName, plan) {
    if (
        typeof originals?.['eslint.config.mjs'] !== 'string' ||
        typeof originals?.['tsconfig.base.json'] !== 'string'
    )
        throw new Error(
            'Sources de configuration incomplètes pour la création.'
        );
    let tsconfig = originals['tsconfig.base.json'];
    for (const project of plan.projects) {
        tsconfig = addJsonPath(
            tsconfig,
            project.name,
            `./${project.root}/src/index.ts`
        );
    }
    return {
        'eslint.config.mjs': addEslintScopeConstraint(
            originals['eslint.config.mjs'],
            `scope:${moduleName}`
        ),
        'tsconfig.base.json': tsconfig,
    };
}
