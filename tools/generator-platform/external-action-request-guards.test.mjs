// X2, oracles des gardes (revue et validation X2) : jeton de service déclaré
// et lié au contrat de la définition par la coque, chaque moitié de la garde
// « coque avec session », et typage par défaut du mode atelier.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import {
    computeActionRequestV2Targets,
    computeExternalAngularActionRequestTarget,
} from './action-request-v2-targets.mjs';
import {
    planExternalActionRequest,
    shellServiceBinding,
} from './core/external-action-request.mjs';
import { sha256 } from './core/generation-manifest.mjs';
import { createApplicationSessionFixture } from './test-support/application-session-fixture.mjs';
import {
    snapshotTree,
    TOOLS_ROOT,
} from './test-support/external-application-fixture.mjs';
import {
    MANIFEST,
    sessionApp,
} from './test-support/external-publication-fixture.mjs';
import { writeExternalActionDefinitions } from './test-support/external-session-fixture.mjs';

const ENDPOINTS = 'src/app/session/service-endpoints.ts';

async function actionProduct(t, domain) {
    const product = await sessionApp(t, domain);
    const { enter } = await writeExternalActionDefinitions(
        product.root,
        domain
    );
    return { ...product, options: { ...product.base, definitionPath: enter } };
}

// Seconde paire contrat/définition dans le produit, dérivée de la première.
async function contractVariant(product, name, mutate) {
    const base = `descriptions/session-${product.input.domain}`;
    const contract = JSON.parse(
        await readFile(join(product.root, base, 'backend.json'), 'utf8')
    );
    mutate(contract);
    const contractPath = `${base}/${name}.backend.json`;
    const contractBytes = JSON.stringify(contract, null, 2) + '\n';
    await writeFile(join(product.root, contractPath), contractBytes);
    const definition = JSON.parse(
        await readFile(
            join(product.root, product.options.definitionPath),
            'utf8'
        )
    );
    definition.backend_contract = {
        ...definition.backend_contract,
        uri: contractPath,
        id: contract.contract.id,
        sha256: sha256(contractBytes),
    };
    const definitionPath = `${base}/actions/${name}.json`;
    await writeFile(
        join(product.root, definitionPath),
        JSON.stringify(definition, null, 2) + '\n'
    );
    return { ...product.options, definitionPath };
}

test('X2 : jeton de service absent de la coque ou lié à un autre contrat, refusé avant toute écriture (I-1, M-5)', async (t) => {
    const product = await actionProduct(t, 'observatory');
    // Autre service : le modèle compile, mais la coque n'a pas son jeton.
    const otherService = await contractVariant(
        product,
        'archive',
        (contract) => {
            const [service] = contract.services;
            const previous = service.id;
            service.id = 'observatory-archive';
            for (const operation of contract.operations)
                if (operation.service_id === previous)
                    operation.service_id = service.id;
        }
    );
    // Même service, autre contrat : la coque résoudrait l'URL d'un autre
    // contrat pour ce jeton.
    const otherContract = await contractVariant(product, 'copy', (contract) => {
        contract.contract.id = 'observatory-api-copy';
    });
    // Service homonyme par son jeton (`.` et `-` donnent le même nom) : la
    // coque lie ce jeton à un autre service.
    const homonym = await contractVariant(product, 'homonym', (contract) => {
        const [service] = contract.services;
        const previous = service.id;
        service.id = 'observatory.service';
        for (const operation of contract.operations)
            if (operation.service_id === previous)
                operation.service_id = service.id;
    });
    const before = await snapshotTree(product.root, []);
    await assert.rejects(
        planExternalActionRequest(homonym),
        /bound to another service or contract by the session shell/
    );
    await assert.rejects(
        planExternalActionRequest(otherService),
        /service endpoint is not declared by the session shell/
    );
    await assert.rejects(
        planExternalActionRequest(otherContract),
        /bound to another service or contract by the session shell/
    );
    assert.deepEqual(await snapshotTree(product.root, []), before);
    // Déclaration contradictoire dans la coque (filtre ajouté avant le vrai) :
    // ambiguë, refusée par la garde avant même le contrôle du sceau.
    const endpoints = join(product.app, ENDPOINTS);
    const original = await readFile(endpoints, 'utf8');
    await writeFile(
        endpoints,
        original.replace(
            'endpoint.contract_id ===',
            "endpoint.contract_id === 'observatory-api-copy' && endpoint.contract_id ==="
        )
    );
    await assert.rejects(
        planExternalActionRequest(product.options),
        /bound to another service or contract by the session shell/
    );
    await writeFile(endpoints, original);
    assert.deepEqual(await snapshotTree(product.root, []), before);
    // La paire liée par la coque reste publiable.
    const plan = await planExternalActionRequest(product.options);
    assert.equal(plan.action_id, 'observatory-enter');
});

test('X2 : liaison de service lue dans la syntaxe de la coque, quel que soit le formatage', async (t) => {
    const product = await sessionApp(t, 'equipment-hire');
    const source = await readFile(join(product.app, ENDPOINTS), 'utf8');
    const token = 'EQUIPMENT_HIRE_SERVICE_API_URL';
    const expected = {
        contract_id: 'equipment-hire-api',
        service_id: 'equipment-hire-service',
    };
    assert.deepEqual(shellServiceBinding(source, token), expected);
    assert.deepEqual(
        shellServiceBinding(source.replace(/\s+/g, ' '), token),
        expected
    );
    assert.equal(shellServiceBinding(source, 'OTHER_API_URL'), null);
    // Un jeton non exporté ne compte pas, même avec un autre modificateur.
    for (const replacement of ['const', 'declare const'])
        assert.equal(
            shellServiceBinding(
                source.replaceAll('export const', replacement),
                token
            ),
            null,
            replacement
        );
    // Deux filtres contradictoires dans la même déclaration : ambigu.
    assert.equal(
        shellServiceBinding(
            source.replace(
                "endpoint.service_id === 'equipment-hire-service'",
                "endpoint.service_id === 'equipment-hire-service' && endpoint.contract_id === 'other'"
            ),
            token
        ).ambiguous,
        true
    );
});

test('X2 : chaque moitié de la garde « coque avec session » refuse seule', async (t) => {
    const product = await actionProduct(t, 'equipment-hire');
    const manifestPath = join(product.app, MANIFEST);
    const original = await readFile(manifestPath);
    const before = await snapshotTree(product.root, []);
    for (const missing of ['src/app/session/index.ts', ENDPOINTS]) {
        const manifest = JSON.parse(original.toString('utf8'));
        manifest.generated_files = manifest.generated_files.filter(
            (entry) => entry.path !== missing
        );
        await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
        await assert.rejects(
            planExternalActionRequest(product.options),
            /application has no session module/,
            missing
        );
    }
    await writeFile(manifestPath, original);
    assert.deepEqual(await snapshotTree(product.root, []), before);
});

test('garantie 8 : le mode atelier type-check toujours une commande 2.1 par défaut (V-X2-4)', async (t) => {
    const fixture = await createApplicationSessionFixture({
        domain: 'observatory',
    });
    t.after(() => rm(fixture.root, { recursive: true, force: true }));
    const definitionPath = join(
        fixture.root,
        'definitions/observatory-enter.json'
    );
    const hostBindings = { services: fixture.hostBindings.services };
    // Le module de session lié n'existe pas dans l'atelier : la sortie ne
    // type-check pas, et le mode atelier doit le dire.
    await assert.rejects(
        computeActionRequestV2Targets({
            definitionPath,
            artifactRoot: fixture.root,
            hostBindings,
            target: 'angular',
        }),
        /generated target \S+ does not typecheck[\s\S]*TS2307/
    );
    // Même entrée, voie extérieure : le typage revient au produit.
    const external = await computeExternalAngularActionRequestTarget({
        definitionPath,
        definitionDocument: await readFile(definitionPath),
        artifactRoot: fixture.root,
        hostBindings: () => hostBindings,
    });
    assert.equal(typeof external.files['src/index.ts'], 'string');
});

test('X2 : l’aide reste accessible avec --target-root (M-8)', () => {
    const result = spawnSync(
        process.execPath,
        [
            join(
                TOOLS_ROOT,
                'tools/generator-platform/generate-action-request.mjs'
            ),
            '--target-root',
            '/absent',
            '--help',
        ],
        { cwd: TOOLS_ROOT, encoding: 'utf8', timeout: 60_000 }
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /--target-root/);
    assert.match(result.stdout, /--dry-run/);
});
