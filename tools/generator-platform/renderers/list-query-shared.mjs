import {
    expandProfileValue,
    pascalCase,
    renderResponseEnvelopeContract,
} from './shared.mjs';

export function itemTypeName(operation) {
    if (
        operation.output.kind !== 'list' ||
        operation.output.items.kind !== 'model'
    ) {
        throw new Error(
            `list-query renderer: unsupported output shape for ${operation.id}`
        );
    }
    return pascalCase(operation.output.items.name);
}

export function assertListQueryRendererInput(
    semantic,
    profile,
    expectedProfile
) {
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
        if (operation.kind !== 'query') {
            throw new Error(
                `renderer: unsupported operation kind ${operation.kind}`
            );
        }
        if (operation.integration_ref === undefined) {
            throw new Error(
                `renderer: integration missing for ${operation.id}`
            );
        }
        if (operation.access.mode === 'authorized') {
            throw new Error(
                `renderer: ${operation.id} — access "authorized" is out of scope (List simple)`
            );
        }
    }
}

export { renderResponseEnvelopeContract };
