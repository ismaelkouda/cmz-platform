// CI #389, X5 : toute lecture de contrat backend du fil X5 passe par la lecture
// bornée (CONTRACT_GRAPH_LIMITS) : cible et compilateur list-query v2,
// validation de conception. Un contrat au-delà du budget est refusé ; les
// contrats légitimes passent (Π1 : sorties list-query internes identiques).
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { validateApplicationDesignWithDependencies } from './core/application-design.mjs';
import { CONTRACT_GRAPH_LIMITS } from './core/backend-contract-reader.mjs';
import { compileListQueryV2ExecutionModel } from './core/list-query-v2-compiler.mjs';
import { computeListQueryV2Targets } from './list-query-v2-targets.mjs';
import { createApplicationSessionFixture } from './test-support/application-session-fixture.mjs';

const fixture = (name) =>
    readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8').then(
        JSON.parse
    );
const sha = (text) => createHash('sha256').update(text).digest('hex');

// Même décompte que le préflight du lecteur borné.
function tokens(text) {
    let quoted = false;
    let escaped = false;
    let count = 0;
    for (const char of text) {
        if (quoted) {
            if (!escaped && char === '"') quoted = false;
            else if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
        } else if (char === '"') {
            quoted = true;
            count++;
        } else if ('{[,:'.includes(char)) count++;
    }
    return count;
}

// Contrat légitime dont chaque liste `evidence` est démultipliée jusqu'à
// dépasser le budget de nœuds d'un contrat.
function oversized(contract) {
    for (const factor of [16, 32, 64, 128, 256]) {
        const copy = structuredClone(contract);
        const grow = (node) => {
            if (Array.isArray(node)) node.forEach(grow);
            else if (node && typeof node === 'object')
                for (const [key, value] of Object.entries(node))
                    if (key === 'evidence' && Array.isArray(value))
                        node[key] = Array.from(
                            { length: factor },
                            () => value
                        ).flat();
                    else grow(value);
        };
        grow(copy);
        const text = JSON.stringify(copy, null, 2) + '\n';
        // Au-delà du budget de nœuds, sous le plafond d'octets : le refus vient
        // bien du budget de nœuds.
        if (
            tokens(text) > CONTRACT_GRAPH_LIMITS.nodes &&
            Buffer.byteLength(text) < CONTRACT_GRAPH_LIMITS.documentBytes
        )
            return text;
    }
    return assert.fail('aucun facteur ne dépasse le budget de nœuds');
}

test('compilateur list-query v2 : contrat au-delà du budget refusé', async () => {
    const definition = await fixture('users-list.v2.definition.json');
    const text = oversized(await fixture('users-list.backend-contract.json'));
    definition.backend_contract.sha256 = sha(text);
    assert.throws(
        () =>
            compileListQueryV2ExecutionModel({
                definition,
                backendContractDocument: Buffer.from(text),
                backendContractUri: definition.backend_contract.uri,
            }),
        /backend contract is not readable within limits \(OBS_LIMIT\)/
    );
});

test('cible list-query v2 : contrat au-delà du budget refusé', async (t) => {
    const directory = new URL(
        `./.stack-test-runtime/contract-reader-${process.pid}/`,
        import.meta.url
    );
    await mkdir(directory, { recursive: true });
    t.after(() => rm(directory, { recursive: true, force: true }));
    const definition = await fixture('users-list.v2.definition.json');
    const text = oversized(await fixture('users-list.backend-contract.json'));
    await writeFile(new URL('contract.json', directory), text);
    definition.backend_contract.uri = `tools/generator-platform/.stack-test-runtime/contract-reader-${process.pid}/contract.json`;
    definition.backend_contract.sha256 = sha(text);
    const definitionPath = new URL('definition.json', directory);
    await writeFile(definitionPath, JSON.stringify(definition));
    // Le refus vient de la lecture de la CIBLE, avant le compilateur.
    await assert.rejects(
        computeListQueryV2Targets({
            definitionPath: definitionPath.pathname,
        }),
        /^Error: invalid active backend contract:\nbackend contract is not readable within limits \(OBS_LIMIT\)/
    );
});

test('validation de conception : contrat cible au-delà du budget refusé', async (t) => {
    const data = await createApplicationSessionFixture({
        domain: 'observatory',
    });
    t.after(() => rm(data.root, { recursive: true, force: true }));
    const design = structuredClone(data.design);
    const reference = design.backend_contracts[0];
    const path = join(data.root, reference.snapshot_uri);
    const text = oversized(JSON.parse(await readFile(path, 'utf8')));
    await writeFile(path, text);
    reference.sha256 = sha(text);
    const errors = await validateApplicationDesignWithDependencies({
        design,
        workspaceRoot: data.root,
        applicationDesignSchema: data.schemas['application-design'],
        backendContractSchema: data.schemas['backend-contract'],
    });
    assert.ok(
        errors.some((error) =>
            /backend contract is not readable within limits \(OBS_LIMIT\)/.test(
                error
            )
        ),
        errors.join('\n')
    );
});
