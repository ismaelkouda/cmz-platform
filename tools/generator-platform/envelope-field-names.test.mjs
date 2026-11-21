import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

import { computeListQueryV2Targets } from './list-query-v2-targets.mjs';
import { renderActionRequestV2Decoder } from './renderers/action-request-v2-renderer-shared.mjs';
import {
    renderListQueryV2Decoder,
    renderListQueryV2RequestPath,
} from './renderers/list-query-v2-renderer-shared.mjs';
import { repositoryRoot } from './validate-ir.mjs';

// Noms qui sortiraient d'un littéral `'…'` s'ils étaient insérés tels quels.
// Le schéma du contrat les refuse (backend-contract.test.mjs) ; le rendu doit
// rester sûr même pour un modèle d'exécution qui n'est pas passé par lui.
const HOSTILE = Object.freeze({
    data_field: "d'\\e",
    error_field: "x'y\n",
    message_field: 'm\'"\u2028`${d}',
});

// Champ d'entrée d'un paramètre de chemin : le validateur du modèle le borne
// (FIELD_NAME), pas le rendu. Apostrophe, guillemet, sauts de ligne, U+2028,
// accent grave et `${` : tous repris des séquences d'échappement ci-dessus.
const HOSTILE_INPUT_FIELD = `${HOSTILE.error_field}\r${HOSTILE.message_field}`;

// Seule définition list-query v2 du dépôt dont le paramètre est dans le chemin.
const PATH_PARAMETER_DEFINITION = join(
    repositoryRoot,
    'tools/generator-platform/fixtures/tasks-actions-processing-type.v2.definition.json'
);

const ERRORS = `export class InvalidPayloadError extends Error {
    constructor(readonly path: string, readonly expected: string) {
        super(path);
    }
}
export class ServerResponseError extends Error {}`;

const readJson = async (path) =>
    JSON.parse(await readFile(join(repositoryRoot, path), 'utf8'));

function transpile(source, label) {
    const { outputText, diagnostics } = ts.transpileModule(source, {
        reportDiagnostics: true,
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
        },
    });
    assert.deepEqual(
        diagnostics.map((diagnostic) =>
            ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
        ),
        [],
        label
    );
    return outputText;
}

async function loadModules(t, files, entry = 'decoder.js') {
    const root = await mkdtemp(join(tmpdir(), 'envelope-field-names-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await writeFile(join(root, 'package.json'), '{"type":"module"}\n');
    for (const [name, source] of Object.entries(files)) {
        await writeFile(join(root, name), transpile(source, name));
    }
    return import(pathToFileURL(join(root, entry)).href);
}

function decoderOf(module) {
    const names = Object.keys(module).filter((name) =>
        /^decode\w+Response$/.test(name)
    );
    assert.equal(names.length, 1);
    return module[names[0]];
}

function assertInvalidAt(decode, payload, path, expected) {
    assert.throws(
        () => decode(payload),
        (error) =>
            error.constructor.name === 'InvalidPayloadError' &&
            error.path === path &&
            error.expected === expected
    );
}

test('le décodeur list-query v2 rend un nom d’enveloppe dans un littéral sûr', async (t) => {
    const model = await readJson(
        'examples/users-management-proof/execution/users-list.execution-model.json'
    );
    const query = structuredClone(model.queries[0]);
    query.transport.envelope = { kind: 'object', ...HOSTILE };
    const decode = decoderOf(
        await loadModules(t, {
            'errors.js': ERRORS,
            'decoder.js': renderListQueryV2Decoder(
                query,
                'react',
                './errors.js'
            ),
        })
    );
    assertInvalidAt(decode, {}, `$.${HOSTILE.error_field}`, 'boolean');
    assertInvalidAt(
        decode,
        { [HOSTILE.error_field]: false },
        `$.${HOSTILE.message_field}`,
        'string'
    );
});

for (const envelope of [
    { kind: 'object', ...HOSTILE },
    {
        kind: 'status-object',
        error_field: HOSTILE.error_field,
        message_field: HOSTILE.message_field,
    },
]) {
    test(`le décodeur action-request v2 rend un nom d’enveloppe ${envelope.kind} dans un littéral sûr`, async (t) => {
        const model = await readJson(
            'examples/users-management-proof/execution/create-user.execution-model.json'
        );
        const action = structuredClone(model.actions[0]);
        action.transport.envelope = envelope;
        const decode = decoderOf(
            await loadModules(t, {
                'decoder.js': renderActionRequestV2Decoder(action, ERRORS),
            })
        );
        assertInvalidAt(decode, {}, `$.${HOSTILE.error_field}`, 'boolean');
        if (envelope.kind === 'object') {
            assertInvalidAt(
                decode,
                { [HOSTILE.error_field]: false },
                `$.${HOSTILE.message_field}`,
                'string'
            );
        }
    });
}

let pathParameterTargets;
const computePathParameterTargets = () =>
    (pathParameterTargets ??= computeListQueryV2Targets({
        definitionPath: PATH_PARAMETER_DEFINITION,
    }));

test('le chemin de requête list-query v2 rend un nom de champ d’entrée dans un littéral sûr', async (t) => {
    const { model } = await computePathParameterTargets();
    const query = structuredClone(model.queries[0]);
    assert.equal(query.transport.parameters.length, 1);
    const [binding] = query.transport.parameters;
    assert.equal(binding.in, 'path');
    assert.deepEqual(binding.constraints, { min_length: 1 });
    binding.source_field = HOSTILE_INPUT_FIELD;
    const { requestPath } = await loadModules(
        t,
        {
            'request-path.js': `${ERRORS}

type RequestInput = Readonly<Record<string, unknown>>;

${renderListQueryV2RequestPath(query, 'RequestInput')}

export { requestPath };
`,
        },
        'request-path.js'
    );
    assertInvalidAt(requestPath, {}, `$.${HOSTILE_INPUT_FIELD}`, 'string');
    assertInvalidAt(
        requestPath,
        { [HOSTILE_INPUT_FIELD]: '' },
        `$.${HOSTILE_INPUT_FIELD}`,
        'min length 1'
    );
    assert.equal(
        requestPath({ [HOSTILE_INPUT_FIELD]: 'a/b' }),
        query.transport.path.replace(`{${binding.name}}`, 'a%2Fb')
    );
});

test('le chemin de requête list-query v2 garde les octets publiés pour un nom valide', async () => {
    const targets = await computePathParameterTargets();
    const [query] = targets.model.queries;
    const [binding] = query.transport.parameters;
    // Avant JSON.stringify, le rendu écrivait le littéral `'$.<champ>'` ; la
    // canonisation Prettier (singleQuote) ramène `"$.<champ>"` à ces octets.
    const expected = [
        'path: string, expected: string',
        `'$.${binding.source_field}', 'string'`,
        `'$.${binding.source_field}', 'min length 1'`,
    ];
    for (const [target, file] of [
        ['angular', `src/${query.id}.source.ts`],
        ['react', `src/${query.id}.client.ts`],
    ]) {
        const calls = [
            ...targets[target].files[file].matchAll(
                /\binvalidInput\(([^)]*)\)/g
            ),
        ].map((match) => match[1]);
        assert.deepEqual(calls, expected, `${target} ${file}`);
    }
});
