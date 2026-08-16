export function pascalCase(value) {
    return value
        .split(/[-_]/)
        .filter(Boolean)
        .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
        .join('');
}

export function camelCase(value) {
    const pascal = pascalCase(value);
    return `${pascal[0].toLowerCase()}${pascal.slice(1)}`;
}

export function typeName(reference) {
    if (reference.kind === 'primitive') {
        const primitives = {
            boolean: 'boolean',
            decimal: 'number',
            integer: 'number',
            json: 'unknown',
            string: 'string',
        };
        if (!primitives[reference.name]) {
            throw new Error(
                `renderer: unsupported primitive ${reference.name}`
            );
        }
        return primitives[reference.name];
    }
    if (reference.kind === 'model') return pascalCase(reference.name);
    throw new Error(`renderer: unsupported type reference ${reference.kind}`);
}

export function renderModels(semantic) {
    const blocks = semantic.types.map((type) => {
        const name = pascalCase(type.id);
        if (type.kind === 'opaque') {
            return `export type ${name} = Readonly<Record<string, unknown>>;`;
        }
        if (type.kind !== 'object') {
            throw new Error(
                `renderer: unsupported type definition ${type.kind}`
            );
        }
        const fields = type.fields
            .map(
                (field) =>
                    `    readonly ${field.name}${field.required ? '' : '?'}: ${typeName(field.type)};`
            )
            .join('\n');
        return `export interface ${name} {\n${fields}\n}`;
    });
    return `${blocks.join('\n\n')}\n`;
}

export function renderValidation(semantic) {
    const imports = semantic.operations.map((operation) =>
        pascalCase(operation.input.name)
    );
    const functions = semantic.operations.map((operation) => {
        const inputName = pascalCase(operation.input.name);
        const constraints = semantic.constraints.filter((constraint) =>
            constraint.target.startsWith(`${operation.input.name}.`)
        );
        const lines = [];
        for (const constraint of constraints) {
            const field = constraint.target.split('.')[1];
            if (constraint.kind === 'required') {
                lines.push(
                    `    if (typeof value.${field} === 'string' && value.${field}.trim().length === 0) issues.push({ field: '${field}', rule: 'required' });`
                );
            } else if (constraint.kind === 'format') {
                lines.push(
                    `    if (!EMAIL_PATTERN.test(value.${field})) issues.push({ field: '${field}', rule: 'format:${constraint.parameters.format}' });`
                );
            } else if (constraint.kind === 'equals') {
                const other = constraint.parameters.other_target.split('.')[1];
                lines.push(
                    `    if (value.${field} !== value.${other}) issues.push({ field: '${field}', rule: 'equals:${other}' });`
                );
            } else {
                throw new Error(
                    `renderer: unsupported constraint ${constraint.kind}`
                );
            }
        }
        return `export function validate${inputName}(value: ${inputName}): readonly ValidationIssue[] {\n    const issues: ValidationIssue[] = [];\n${lines.join('\n')}\n    return issues;\n}`;
    });
    return `import type { ${[...new Set(imports)].join(', ')} } from './models';\n\nconst EMAIL_PATTERN = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n\nexport interface ValidationIssue {\n    readonly field: string;\n    readonly rule: string;\n}\n\n${functions.join('\n\n')}\n`;
}

export function operationTypes(semantic) {
    return semantic.operations.flatMap((operation) => [
        pascalCase(operation.input.name),
        pascalCase(operation.output.name),
    ]);
}

export function requiredPermissions(operation) {
    return operation.access.mode === 'authorized'
        ? operation.access.permissions
        : [];
}

export function renderPermissionContract() {
    return `export interface PermissionPort {
    has(permission: string): boolean;
}

export class PermissionDeniedError extends Error {
    readonly code = 'permission_denied';
    readonly missingPermissions: readonly string[];

    constructor(missingPermissions: readonly string[]) {
        super(\`Missing required permissions: \${missingPermissions.join(', ')}\`);
        this.name = 'PermissionDeniedError';
        this.missingPermissions = Object.freeze([...missingPermissions]);
    }
}

function assertRequiredPermissions(
    permissionPort: PermissionPort,
    requiredPermissions: readonly string[]
): void {
    const missingPermissions = requiredPermissions.filter(
        (permission) => !permissionPort.has(permission)
    );
    if (missingPermissions.length > 0) {
        throw new PermissionDeniedError(missingPermissions);
    }
}`;
}

export function expandProfileValue(value, semantic, field) {
    if (typeof value !== 'string') {
        throw new Error(`renderer: profile ${field} must be a string`);
    }
    const expanded = value.replaceAll('{domain}', semantic.domain.id);
    if (/[{}]/.test(expanded)) {
        throw new Error(
            `renderer: profile ${field} contains an unsupported placeholder`
        );
    }
    return expanded;
}

export function assertRendererInput(semantic, profile, expectedProfile) {
    if (profile.id !== expectedProfile) {
        throw new Error(
            `renderer ${expectedProfile}: received profile ${profile.id}`
        );
    }
    if (!semantic.operations.length)
        throw new Error('renderer: operations are required');
    const outputRoot = expandProfileValue(
        profile.output_root,
        semantic,
        'output_root'
    );
    if (outputRoot.startsWith('/') || outputRoot.split('/').includes('..')) {
        throw new Error(`renderer ${expectedProfile}: unsafe output_root`);
    }
    const packageName = expandProfileValue(
        profile.package_name,
        semantic,
        'package_name'
    );
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(packageName)) {
        throw new Error(`renderer ${expectedProfile}: unsafe package_name`);
    }
    for (const operation of semantic.operations) {
        if (operation.kind !== 'command') {
            throw new Error(
                `renderer: unsupported operation kind ${operation.kind}`
            );
        }
        if (operation.integration_ref === undefined) {
            throw new Error(
                `renderer: integration missing for ${operation.id}`
            );
        }
        const permissions = operation.access.permissions ?? [];
        if (
            operation.access.mode === 'authorized' &&
            permissions.length === 0
        ) {
            throw new Error(
                `renderer: authorized operation ${operation.id} requires permissions`
            );
        }
        if (operation.access.mode !== 'authorized' && permissions.length > 0) {
            throw new Error(
                `renderer: ${operation.access.mode} operation ${operation.id} cannot declare permissions`
            );
        }
        if (new Set(permissions).size !== permissions.length) {
            throw new Error(
                `renderer: operation ${operation.id} declares duplicate permissions`
            );
        }
    }
}
