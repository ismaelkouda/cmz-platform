// CI #389, jalon 1 : un contrat backend lu en mode graphe 2.1 a son propre
// budget (CONTRACT_GRAPH_LIMITS), le même pour le compilateur et la cible. Les
// observations d'exécution gardent OBSERVATION_LIMITS, inchangé.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { computeExternalAngularActionRequestTarget } from './action-request-v2-targets.mjs';
import {
    ACTION_RESULT_GRAPH_LIMITS,
    CONTRACT_GRAPH_LIMITS,
    parseContractGraph,
} from './core/action-request-result-graph.mjs';
import {
    OBSERVATION_LIMITS,
    observationInputPrimitives as io,
} from './core/runtime-observation-evidence.mjs';
import { createApplicationSessionFixture } from './test-support/application-session-fixture.mjs';

// Même décompte que le préflight du lecteur borné : chaînes, ouvrants, , et :.
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

// Comme une adoption : chaque liste `evidence` du contrat est triplée.
function triple(node) {
    if (Array.isArray(node)) node.forEach(triple);
    else if (node && typeof node === 'object')
        for (const [key, value] of Object.entries(node))
            if (key === 'evidence' && Array.isArray(value))
                node[key] = [...value, ...value, ...value];
            else triple(value);
}

async function paddedTarget(t, passes) {
    const fixture = await createApplicationSessionFixture({
        domain: 'observatory',
    });
    t.after(() => rm(fixture.root, { recursive: true, force: true }));
    const definitionPath = join(
        fixture.root,
        'definitions/observatory-enter.json'
    );
    const definition = JSON.parse(await readFile(definitionPath, 'utf8'));
    const contractPath = join(fixture.root, definition.backend_contract.uri);
    const contract = JSON.parse(await readFile(contractPath, 'utf8'));
    for (let pass = 0; pass < passes; pass++) triple(contract);
    const text = JSON.stringify(contract, null, 2) + '\n';
    await writeFile(contractPath, text);
    definition.backend_contract.sha256 = createHash('sha256')
        .update(text)
        .digest('hex');
    await writeFile(definitionPath, JSON.stringify(definition, null, 2) + '\n');
    const hostBindings = { services: fixture.hostBindings.services };
    return {
        tokens: tokens(text),
        compute: async () =>
            computeExternalAngularActionRequestTarget({
                definitionPath,
                definitionDocument: await readFile(definitionPath),
                artifactRoot: fixture.root,
                hostBindings: () => hostBindings,
            }),
    };
}

test('contrat adopté au-delà du budget d’une observation : accepté par la cible extérieure', async (t) => {
    const padded = await paddedTarget(t, 1);
    assert.ok(padded.tokens > OBSERVATION_LIMITS.nodes, String(padded.tokens));
    assert.ok(
        padded.tokens < CONTRACT_GRAPH_LIMITS.nodes,
        String(padded.tokens)
    );
    const target = await padded.compute();
    assert.equal(typeof target.files['src/index.ts'], 'string');
});

test('contrat au-delà du budget de contrat : refusé', async (t) => {
    const padded = await paddedTarget(t, 4);
    assert.ok(
        padded.tokens > CONTRACT_GRAPH_LIMITS.nodes,
        String(padded.tokens)
    );
    await assert.rejects(padded.compute(), /OBS_LIMIT|AR_GRAPH_LIMIT/);
});

test('budgets : contrat dérivé du graphe, observation inchangée', () => {
    assert.deepEqual(
        {
            depth: CONTRACT_GRAPH_LIMITS.depth,
            nodes: CONTRACT_GRAPH_LIMITS.nodes,
            stringLength: CONTRACT_GRAPH_LIMITS.stringLength,
            width: CONTRACT_GRAPH_LIMITS.width,
        },
        {
            depth: ACTION_RESULT_GRAPH_LIMITS.depth,
            nodes: ACTION_RESULT_GRAPH_LIMITS.runtimeNodes,
            stringLength: ACTION_RESULT_GRAPH_LIMITS.runtimeString,
            width: ACTION_RESULT_GRAPH_LIMITS.runtimeArray,
        }
    );
    assert.equal(OBSERVATION_LIMITS.nodes, 4096);
    assert.equal(OBSERVATION_LIMITS.depth, 24);
    assert.equal(OBSERVATION_LIMITS.stringLength, 1024);
    assert.equal(OBSERVATION_LIMITS.documentBytes, 65536);
    // Une observation de plus de 4570 nœuds reste refusée ; le même document
    // passe comme contrat (largeur ≤ 2048, budget inchangé).
    const document = Buffer.from(
        JSON.stringify({
            groups: Array.from({ length: 50 }, () =>
                Array.from({ length: 92 }, (_, i) => i)
            ),
        })
    );
    assert.throws(() => io.parse(document), /OBS_LIMIT/);
    assert.equal(parseContractGraph(document).groups.flat().length, 4600);
    assert.throws(
        () =>
            parseContractGraph(
                Buffer.alloc(CONTRACT_GRAPH_LIMITS.documentBytes + 1, ' ')
            ),
        /AR_GRAPH_LIMIT/
    );
});
