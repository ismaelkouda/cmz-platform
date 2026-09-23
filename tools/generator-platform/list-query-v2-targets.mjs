import { lstat, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

import {
    validateBackendContract,
    verifyBackendContractSnapshots,
} from './core/backend-contract.mjs';
import { compileListQueryV2ExecutionModel } from './core/list-query-v2-compiler.mjs';
import { renderAngularListQueryV2 } from './renderers/angular-list-query-v2-renderer.mjs';
import {
    loadJson,
    repositoryRoot,
    validateJsonSchema,
} from './validate-ir.mjs';

const DEFAULT_DEFINITION = resolve(
    repositoryRoot,
    'tools/generator-platform/fixtures/site-group-select.v2.definition.json'
);
const BACKEND_SCHEMA = new URL(
    './schemas/backend-contract.schema.json',
    import.meta.url
);
const DEFINITION_SCHEMA = new URL(
    './schemas/list-query-definition-v2.schema.json',
    import.meta.url
);

export const cmzAngularListQueryHostBindings = Object.freeze({
    services: Object.freeze({
        'settings-api': Object.freeze({
            module: '@cmz/core',
            token: 'SETTINGS_API_URL',
        }),
        'report-api': Object.freeze({
            module: '@cmz/core',
            token: 'REPORT_API_URL',
        }),
    }),
});

function failOnErrors(label, errors) {
    if (errors.length > 0) {
        throw new Error(`${label}:\n${errors.join('\n')}`);
    }
}

function resolveBackendPath(uri) {
    if (typeof uri !== 'string') {
        throw new Error('backend contract uri must be a string');
    }
    const path = resolve(repositoryRoot, uri);
    const workspaceRelative = relative(repositoryRoot, path);
    if (
        workspaceRelative === '..' ||
        workspaceRelative.startsWith(`..${sep}`) ||
        isAbsolute(workspaceRelative)
    ) {
        throw new Error('backend contract uri must stay inside the workspace');
    }
    return path;
}

async function readBackendDocument(uri) {
    const path = resolveBackendPath(uri);
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
        throw new Error('backend contract must be a regular non-symlink file');
    }
    const [canonicalRoot, canonicalPath] = await Promise.all([
        realpath(repositoryRoot),
        realpath(path),
    ]);
    const canonicalRelative = relative(canonicalRoot, canonicalPath);
    if (
        canonicalRelative === '..' ||
        canonicalRelative.startsWith(`..${sep}`) ||
        isAbsolute(canonicalRelative)
    ) {
        throw new Error('backend contract must resolve inside the workspace');
    }
    return readFile(canonicalPath);
}

export async function computeAngularListQueryV2Target({
    definitionPath = DEFAULT_DEFINITION,
    hostBindings = cmzAngularListQueryHostBindings,
} = {}) {
    const definitionDocument = await readFile(definitionPath);
    const definition = JSON.parse(definitionDocument.toString('utf8'));
    const [backendSchema, definitionSchema] = await Promise.all([
        loadJson(BACKEND_SCHEMA),
        loadJson(DEFINITION_SCHEMA),
    ]);
    failOnErrors(
        'invalid active list-query definition',
        validateJsonSchema(definition, definitionSchema)
    );
    const backendDocument = await readBackendDocument(
        definition.backend_contract.uri
    );
    const backendContract = JSON.parse(backendDocument.toString('utf8'));
    failOnErrors(
        'invalid active backend contract',
        validateBackendContract(backendContract, backendSchema)
    );
    failOnErrors(
        'invalid active backend provenance',
        await verifyBackendContractSnapshots(backendContract, repositoryRoot)
    );
    const model = compileListQueryV2ExecutionModel({
        definition,
        backendContractDocument: backendDocument,
        backendContractUri: definition.backend_contract.uri,
    });
    return {
        definition,
        model,
        ...renderAngularListQueryV2(model, hostBindings),
    };
}
