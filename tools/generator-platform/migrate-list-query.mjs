import { createHash } from 'node:crypto';
import { readFile, realpath, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
    validateBackendContract,
    verifyBackendContractSnapshots,
} from './core/backend-contract.mjs';
import {
    migrateListQueryV1Definition,
    validateListQueryV2Definition,
} from './core/list-query-v2.mjs';
import {
    loadJson,
    repositoryRoot,
    validateJsonSchema,
} from './validate-ir.mjs';

const SCHEMAS = {
    backend: new URL('./schemas/backend-contract.schema.json', import.meta.url),
    v1: new URL('./schemas/list-query-definition.schema.json', import.meta.url),
    v2: new URL(
        './schemas/list-query-definition-v2.schema.json',
        import.meta.url
    ),
};

export function parseListQueryMigrationArguments(arguments_) {
    const options = {};
    for (let index = 0; index < arguments_.length; index += 1) {
        const argument = arguments_[index];
        if (argument === '--help') return { help: true };
        if (
            ![
                '--definition',
                '--backend-contract',
                '--decisions',
                '--out',
            ].includes(argument)
        ) {
            throw new Error(`unknown argument ${argument}`);
        }
        const value = arguments_[index + 1];
        if (!value || value.startsWith('--')) {
            throw new Error(`${argument} requires a value`);
        }
        options[argument.slice(2)] = value;
        index += 1;
    }
    for (const required of [
        'definition',
        'backend-contract',
        'decisions',
        'out',
    ]) {
        if (!options[required]) throw new Error(`--${required} is required`);
    }
    return options;
}

async function readJsonDocument(path) {
    const content = await readFile(path);
    return { content, value: JSON.parse(content.toString('utf8')) };
}

function failOnErrors(label, errors) {
    if (errors.length) throw new Error(`${label}:\n${errors.join('\n')}`);
}

export async function migrateListQueryFile({
    definitionPath,
    backendContractPath,
    decisionsPath,
    outputPath,
    workspaceRoot = repositoryRoot,
}) {
    const absoluteDefinition = resolve(definitionPath);
    const absoluteBackend = resolve(backendContractPath);
    const absoluteDecisions = resolve(decisionsPath);
    const absoluteOutput = resolve(outputPath);
    if (absoluteOutput === absoluteDefinition) {
        throw new Error(
            'migration output must differ from the source definition'
        );
    }
    const canonicalWorkspace = await realpath(resolve(workspaceRoot));
    const canonicalBackend = await realpath(absoluteBackend);
    const backendContractUri = relative(
        canonicalWorkspace,
        canonicalBackend
    ).replaceAll('\\', '/');
    if (
        backendContractUri === '..' ||
        backendContractUri.startsWith('../') ||
        backendContractUri.startsWith('/')
    ) {
        throw new Error('backend contract must be inside the repository');
    }
    const [definitionDocument, backendDocument, decisionsDocument, schemas] =
        await Promise.all([
            readJsonDocument(absoluteDefinition),
            readJsonDocument(canonicalBackend),
            readJsonDocument(absoluteDecisions),
            Promise.all([
                loadJson(SCHEMAS.backend),
                loadJson(SCHEMAS.v1),
                loadJson(SCHEMAS.v2),
            ]),
        ]);
    const [backendSchema, v1Schema, v2Schema] = schemas;
    failOnErrors(
        'invalid backend contract',
        validateBackendContract(backendDocument.value, backendSchema)
    );
    failOnErrors(
        'invalid backend contract provenance',
        await verifyBackendContractSnapshots(
            backendDocument.value,
            canonicalWorkspace
        )
    );
    const definitionSchema =
        definitionDocument.value.schema_version === '2.0.0'
            ? v2Schema
            : v1Schema;
    failOnErrors(
        'invalid list-query definition',
        validateJsonSchema(definitionDocument.value, definitionSchema)
    );
    const backendContractSha256 = createHash('sha256')
        .update(backendDocument.content)
        .digest('hex');
    const migrated = migrateListQueryV1Definition(definitionDocument.value, {
        backendContract: backendDocument.value,
        backendContractUri,
        backendContractSha256,
        decisions: decisionsDocument.value,
    });
    failOnErrors(
        'invalid migrated list-query definition',
        validateJsonSchema(migrated, v2Schema)
    );
    failOnErrors(
        'invalid migrated list-query semantics',
        validateListQueryV2Definition(migrated, backendDocument.value, {
            backendContractSha256,
            backendContractUri,
        })
    );
    await writeFile(absoluteOutput, `${JSON.stringify(migrated, null, 2)}\n`, {
        flag: 'wx',
    });
    return { output: absoluteOutput, definition: migrated };
}

function usage() {
    return 'Usage:\n  bun run migrate:list-query --definition <v1.json> --backend-contract <contract.json> --decisions <decisions.json> --out <v2.json>\n';
}

async function main() {
    const options = parseListQueryMigrationArguments(process.argv.slice(2));
    if (options.help) {
        process.stdout.write(usage());
        return;
    }
    const result = await migrateListQueryFile({
        definitionPath: options.definition,
        backendContractPath: options['backend-contract'],
        decisionsPath: options.decisions,
        outputPath: options.out,
    });
    console.log(`list-query 2.0.0 written to ${result.output}`);
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    await main();
}
