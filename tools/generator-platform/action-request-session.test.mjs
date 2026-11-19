import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
    lstat,
    mkdtemp,
    mkdir,
    realpath,
    rm,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import { validateActionRequestV2ExecutionModel } from './core/action-request-v2-compiler.mjs';
import { projectActionResultGraph } from './core/action-request-result-graph.mjs';
import { typecheckGenerated } from './core/typecheck-generated.mjs';
import { repositoryRoot } from './validate-ir.mjs';
import {
    renderActionGraphModels,
    renderActionGraphDecoder,
} from './renderers/action-request-typed-result-renderer.mjs';
import { renderReactActionRequestV2 } from './renderers/react-action-request-v2-renderer.mjs';
import { renderAngularActionRequestV2 } from './renderers/angular-action-request-v2-renderer.mjs';
import { pascalCase } from './renderers/shared.mjs';
import {
    createApplicationSessionFixture,
    SESSION_FIXTURE_DOMAINS,
} from './test-support/application-session-fixture.mjs';

async function decoderModule(action, t) {
    const files = {
        ...renderActionGraphModels(action),
        ...renderActionGraphDecoder(action),
    };
    typecheckGenerated(files, 'typed-session-decoder', repositoryRoot);
    const root = await mkdtemp(join(tmpdir(), 'typed-session-decoder-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await writeFile(join(root, 'package.json'), '{"type":"module"}\n');
    for (const [path, source] of Object.entries(files)) {
        const output = join(root, path.replace(/\.ts$/, '.js'));
        await mkdir(dirname(output), { recursive: true });
        const { outputText } = ts.transpileModule(source, {
            compilerOptions: {
                target: ts.ScriptTarget.ES2022,
                module: ts.ModuleKind.ESNext,
            },
        });
        await writeFile(
            output,
            outputText.replace(/(from\s+['"])(\.[^'"]+)(['"])/g, '$1$2.js$3')
        );
    }
    return import(
        pathToFileURL(join(root, `src/${action.id}.decoder.js`)).href
    );
}

test('CLI : versions numériques canoniques bornées et diagnostics opaques sans fuite', async (t) => {
    const root = await realpath(
        await mkdtemp(join(tmpdir(), 'action-version-diagnostic-'))
    );
    t.after(() => rm(root, { recursive: true, force: true }));
    const input = join(root, 'definition.json');
    const output = join(root, 'must-not-exist');
    const cli = fileURLToPath(
        new URL('./generate-action-request.mjs', import.meta.url)
    );
    const longest = '1'.repeat(28) + '.0.0';
    assert.equal(longest.length, 32);
    const cases = [
        ['3.0.0', true],
        ['0.0.0', true],
        [longest, true],
        ['1'.repeat(29) + '.0.0', false],
        ['03.0.0', false],
        ['3.00.0', false],
        ['3.0', false],
        ['3.0.0\n', false],
        ['3.0.0\r\n', false],
        ['3.0.0\u2028', false],
        [' 3.0.0', false],
        ['3.0.0 ', false],
        ['3.0.0\nSENTINEL_PRIVATE_RESPONSE', false],
        [join(root, 'SENTINEL_PRIVATE_RESPONSE'), false],
        [{ SENTINEL_PRIVATE_RESPONSE: true }, false],
        [3, false],
        [null, false],
        [undefined, false],
    ];
    for (const [version, visible] of cases) {
        await writeFile(input, JSON.stringify({ schema_version: version }));
        const result = spawnSync(
            process.execPath,
            [
                cli,
                '--definition',
                input,
                '--out',
                output,
                '--target',
                'angular',
            ],
            { encoding: 'utf8', timeout: 15000, maxBuffer: 65536 }
        );
        assert.equal(result.error, undefined);
        assert.equal(result.signal, null);
        assert.equal(result.status, 1);
        assert.equal(result.stdout, '');
        const message = 'unsupported action-request definition schema_version';
        assert.ok(result.stderr.includes(message));
        assert.equal(result.stderr.includes(message + ' '), visible);
        if (visible) assert.ok(result.stderr.includes(message + ' ' + version));
        assert.ok(Buffer.byteLength(result.stderr) <= 1024);
        assert.doesNotMatch(result.stderr, /SENTINEL_PRIVATE_RESPONSE/);
        for (const path of [root, input, output, cli])
            assert.equal(result.stderr.includes(path), false);
        await assert.rejects(lstat(output), { code: 'ENOENT' });
    }
});

test('CLI : frontière 64 Kio avant parsing pour 1.0, 2.0 et 2.1, sans fuite', async (t) => {
    const root = await realpath(
        await mkdtemp(join(tmpdir(), 'action-input-limit-'))
    );
    t.after(() => rm(root, { recursive: true, force: true }));
    const cli = fileURLToPath(
        new URL('./generate-action-request.mjs', import.meta.url)
    );
    const definition = join(root, 'input.json');
    const output = join(root, 'must-not-exist');
    for (const version of ['1.0.0', '2.0.0', '2.1.0']) {
        const prefix = `{"schema_version":"${version}","SENTINEL_PRIVATE_RESPONSE":"`;
        for (const size of [65536, 65537]) {
            // Malformed at both sizes: parsing is reached at the byte boundary;
            // above it, the file guard must reject before the parser.
            const document =
                prefix + 'x'.repeat(size - Buffer.byteLength(prefix));
            assert.equal(Buffer.byteLength(document), size);
            await writeFile(definition, document);
            const result = spawnSync(
                process.execPath,
                [
                    cli,
                    '--definition',
                    definition,
                    '--out',
                    output,
                    '--target',
                    'angular',
                ],
                {
                    encoding: 'utf8',
                    timeout: 15000,
                    maxBuffer: 65536,
                }
            );
            assert.equal(result.error, undefined);
            assert.equal(result.signal, null);
            assert.equal(result.status, 1);
            assert.equal(result.stdout, '');
            assert.deepEqual(result.stderr.match(/\bAR_GRAPH_[A-Z]+\b/g), [
                size === 65536 ? 'AR_GRAPH_PARSE' : 'AR_GRAPH_FILE',
            ]);
            assert.ok(Buffer.byteLength(result.stderr) <= 1024);
            assert.doesNotMatch(
                result.stderr,
                /SENTINEL_PRIVATE_RESPONSE|x{64}/
            );
            await assert.rejects(lstat(output), { code: 'ENOENT' });
        }
    }
});

test('CLI : refus React avant sortie et diagnostics de parsing bornés sans sentinelle', async (t) => {
    const fixture = await createApplicationSessionFixture();
    t.after(() => rm(fixture.root, { recursive: true, force: true }));
    const cli = fileURLToPath(
        new URL('./generate-action-request.mjs', import.meta.url)
    );
    const definition = join(fixture.root, 'definitions/observatory-enter.json');
    const output = join(fixture.root, 'must-not-exist');
    for (const target of ['all', 'reactjs']) {
        const result = spawnSync(
            process.execPath,
            [
                cli,
                '--definition',
                definition,
                '--out',
                output,
                '--target',
                target,
            ],
            { encoding: 'utf8', timeout: 15000, maxBuffer: 65536 }
        );
        assert.equal(result.status, 1);
        assert.equal(result.stdout, '');
        assert.match(result.stderr, /AR_GRAPH_REACT_UNSUPPORTED/);
        await assert.rejects(lstat(output), { code: 'ENOENT' });
    }
    const shape = structuredClone(
        fixture.actions.get('observatory-enter').definition
    );
    shape.SENTINEL_PRIVATE_RESPONSE = true;
    await writeFile(definition, JSON.stringify(shape));
    const rejected = spawnSync(
        process.execPath,
        [
            cli,
            '--definition',
            definition,
            '--artifact-root',
            fixture.root,
            '--out',
            output,
            '--target',
            'angular',
        ],
        { encoding: 'utf8', timeout: 15000, maxBuffer: 65536 }
    );
    assert.equal(rejected.status, 1);
    assert.equal(rejected.stdout, '');
    assert.doesNotMatch(rejected.stderr, /SENTINEL_PRIVATE_RESPONSE/);
    await assert.rejects(lstat(output), { code: 'ENOENT' });
    await writeFile(definition, '{"SENTINEL_PRIVATE_RESPONSE":');
    const result = spawnSync(
        process.execPath,
        [
            cli,
            '--definition',
            definition,
            '--out',
            output,
            '--target',
            'angular',
        ],
        { encoding: 'utf8', timeout: 15000, maxBuffer: 65536 }
    );
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /AR_GRAPH_PARSE/);
    assert.doesNotMatch(result.stderr, /SENTINEL_PRIVATE_RESPONSE/);
    await assert.rejects(lstat(output), { code: 'ENOENT' });
});

for (const domain of SESSION_FIXTURE_DOMAINS) {
    test(`résultats typés, erreurs déclarées et sentinelle : ${domain}`, async (t) => {
        const fixture = await createApplicationSessionFixture({ domain });
        t.after(() => rm(fixture.root, { recursive: true, force: true }));
        const { model: noneModel } = fixture.actions.get(domain + '-agree');
        const noneAction = noneModel.actions[0];
        assert.equal(noneAction.port.input.kind, 'none');
        assert.deepEqual(noneAction.port.input.fields, []);
        assert.equal(noneAction.request_model.id, null);
        const noneFiles = renderAngularActionRequestV2(noneModel, {
            services: fixture.hostBindings.services,
        }).files;
        assert.ok(
            noneFiles['src/validation.ts'].includes(
                'const INPUT_FIELDS: ReadonlySet<string> = new Set<string>([]);'
            )
        );
        const { model } = fixture.actions.get(domain + '-enter');
        assert.deepEqual(validateActionRequestV2ExecutionModel(model), []);
        const action = model.actions[0];
        const models = renderActionGraphModels(action)['src/models.ts'];
        assert.ok(
            models.includes(`export interface ${pascalCase(action.id)}Input {`)
        );
        assert.ok(
            models.includes(
                `export interface ${pascalCase(action.request_model.id)}RequestBody {`
            )
        );
        const duplicate = structuredClone(action);
        duplicate.model_graph.push(structuredClone(duplicate.model_graph[0]));
        assert.throws(
            () => renderActionGraphModels(duplicate),
            /AR_GRAPH_RENDER_UNSUPPORTED/
        );
        const reserved = structuredClone(action);
        reserved.result_model.id = 'action-request-diagnostic';
        assert.throws(
            () => renderActionGraphModels(reserved),
            /AR_GRAPH_RENDER_UNSUPPORTED/
        );
        const angular = renderAngularActionRequestV2(model, {
            services: fixture.hostBindings.services,
        });
        const generatedSource = ts.createSourceFile(
            'generated-source.ts',
            angular.files[`src/${action.id}.source.ts`],
            ts.ScriptTarget.ES2022,
            true
        );
        const generatedModels = ts.createSourceFile(
            'generated-models.ts',
            angular.files['src/models.ts'],
            ts.ScriptTarget.ES2022,
            true
        );
        assert.deepEqual(generatedSource.parseDiagnostics, []);
        assert.deepEqual(generatedModels.parseDiagnostics, []);
        const modelImports = generatedSource.statements.filter(
            (entry) =>
                ts.isImportDeclaration(entry) &&
                ts.isStringLiteral(entry.moduleSpecifier) &&
                entry.moduleSpecifier.text === './models'
        );
        assert.equal(modelImports.length, 1);
        const named = modelImports[0].importClause?.namedBindings;
        assert.ok(named && ts.isNamedImports(named));
        const importedNames = named.elements.map((entry) => entry.name.text);
        assert.equal(new Set(importedNames).size, importedNames.length);
        const requestName = `${pascalCase(action.request_model.id)}RequestBody`;
        assert.ok(importedNames.includes(requestName));
        assert.ok(
            angular.files[`src/${action.id}.source.ts`].includes(
                `const body: ${requestName} = {`
            )
        );
        const exportedNames = new Set(
            generatedModels.statements.flatMap((entry) => {
                if (
                    ts.isInterfaceDeclaration(entry) ||
                    ts.isTypeAliasDeclaration(entry)
                )
                    return [entry.name.text];
                if (
                    ts.isExportDeclaration(entry) &&
                    entry.exportClause &&
                    ts.isNamedExports(entry.exportClause)
                )
                    return entry.exportClause.elements.map(
                        (item) => item.name.text
                    );
                return [];
            })
        );
        for (const name of importedNames)
            assert.ok(exportedNames.has(name), `unresolved import ${name}`);
        const decoder = await decoderModule(action, t);
        const decode = decoder[`decode${pascalCase(action.id)}Response`];
        const failure = decoder[`decode${pascalCase(action.id)}Failure`];
        const result = decode(fixture.wireResponse);
        const subjectName =
            (domain === 'equipment-hire' ? 'projected_' : '') +
            fixture.names.subject;
        assert.equal(result[subjectName].toString, 'declared-own-string');
        assert.equal(result[subjectName].note, null);
        assert.equal(Object.getPrototypeOf(result), null);
        assert.ok(Object.isFrozen(result[subjectName]));
        const cyclic = structuredClone(fixture.contract.models);
        cyclic.find(
            (entry) => entry.id === domain + '-subject'
        ).fields[0].type = {
            kind: 'model',
            model_id: domain + '-session-result',
        };
        assert.throws(() =>
            projectActionResultGraph(cyclic, [domain + '-session-result'])
        );
        assert.throws(() =>
            projectActionResultGraph(
                Array.from({ length: 33 }, (_, index) => ({
                    id: 'model-' + index,
                })),
                ['model-0']
            )
        );
        const oversized = structuredClone(fixture.wireResponse);
        const oversizedPayload =
            domain === 'equipment-hire' ? oversized : oversized.payload;
        oversizedPayload[fixture.names.subject].name = 'x'.repeat(8193);
        assert.throws(() => decode(oversized));
        const malformed = structuredClone(fixture.wireResponse);
        const payload =
            domain === 'equipment-hire' ? malformed : malformed.payload;
        payload[fixture.names.subject].unknown = 'SENTINEL_PRIVATE_RESPONSE';
        assert.throws(
            () => decode(malformed),
            (error) => {
                assert.equal(
                    error.message.includes('SENTINEL_PRIVATE_RESPONSE'),
                    false
                );
                assert.equal(
                    JSON.stringify(error.diagnostic).includes(
                        'SENTINEL_PRIVATE_RESPONSE'
                    ),
                    false
                );
                return true;
            }
        );
        const inherited = structuredClone(fixture.wireResponse);
        Object.setPrototypeOf(inherited, {
            secret: 'SENTINEL_PRIVATE_RESPONSE',
        });
        assert.throws(() => decode(inherited));
        const accessor = structuredClone(fixture.wireResponse);
        let invoked = false;
        Object.defineProperty(accessor, 'hidden', {
            enumerable: true,
            get() {
                invoked = true;
                return 'SENTINEL_PRIVATE_RESPONSE';
            },
        });
        assert.throws(() => decode(accessor));
        assert.equal(invoked, false);
        const message = fixture.names.message;
        const errorFlag = fixture.names.error;
        assert.equal(
            failure(400, {
                [message]: 'Wrong old credential',
                [errorFlag]: true,
                statusCode: 400,
            }).kind,
            'request'
        );
        assert.equal(
            failure(400, {
                [message]: 'Wrong old credential',
                [errorFlag]: true,
                statusCode: 200,
            }).kind,
            'invalid-response'
        );
        assert.equal(
            failure(401, { [message]: 'Reconnect' }).kind,
            'unauthenticated'
        );
        const fields = failure(422, {
            [message]: 'Correct fields',
            errors: {
                identity: ['Required'],
                unknown: ['SENTINEL_PRIVATE_RESPONSE'],
            },
        });
        assert.deepEqual(Object.keys(fields.fields), ['identity']);
        assert.deepEqual(fields.fields.identity, ['Required']);
        assert.equal(
            JSON.stringify(fields).includes('SENTINEL_PRIVATE_RESPONSE'),
            false
        );
        assert.equal(
            failure(422, {
                [message]: 'x'.repeat(300),
                errors: { identity: ['x'.repeat(400)] },
            }).message.length,
            256
        );
        assert.equal(
            failure(401, {
                [message]: 'Rejected',
                extra: 'SENTINEL_PRIVATE_RESPONSE',
            }).kind,
            'invalid-response'
        );
        assert.throws(
            () => renderReactActionRequestV2(model),
            /UNSUPPORTED|unsupported/
        );
        const noBody = fixture.actions.get(domain + '-agree').model.actions[0];
        assert.equal(noBody.port.input.kind, 'none');
        assert.equal(noBody.transport.request_media_type, null);
        const noBodyDecoder = await decoderModule(noBody, t);
        assert.ok(
            noBodyDecoder[`decode${pascalCase(noBody.id)}Response`](
                fixture.commandResult
            )
        );
        const changed = structuredClone(model);
        changed.actions[0].model_graph[0].extra = true;
        assert.notDeepEqual(validateActionRequestV2ExecutionModel(changed), []);
    });
}
