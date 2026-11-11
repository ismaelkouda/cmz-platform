import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
    createApplicationSessionFixture,
    SESSION_FIXTURE_DOMAINS,
} from './application-session-fixture.mjs';
import { hash, TOOLS_ROOT } from './external-application-fixture.mjs';
import { sessionCatalogueDefinition } from './session-catalogue-query.mjs';

export { SESSION_FIXTURE_DOMAINS };

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

// Toute mention d'un module `@cmz/` comme spécificateur : `from`, import nu,
// `import()` dynamique ou `require`. Le produit ne dépend d'aucun paquet cmz.
export const CMZ_MODULE_SPECIFIER = /['"`]@cmz\//;

// Copies only the declared input closure of a fictitious session design into
// an owned product, under descriptions/. Generated models, page contracts and
// execution plans of the in-memory fixture are deliberately left out: the shell
// must produce its own outputs from the product inputs alone.
export async function writeExternalSessionDesign(root, domain) {
    const data = await createApplicationSessionFixture({ domain });
    try {
        const base = `descriptions/session-${domain}`;
        const paths = {
            source: `${base}/declared.json`,
            contract: `${base}/backend.json`,
            brief: `${base}/brief.md`,
            design: `${base}/application-design.json`,
        };
        const sourceUri = `fixtures/${domain}.declared.json`;
        const briefUri = `fixtures/${domain}.brief.md`;
        const sourceBytes = await readFile(join(data.root, sourceUri));
        const briefBytes = await readFile(join(data.root, briefUri));
        const contract = structuredClone(data.contract);
        for (const source of contract.sources)
            if (source.snapshot_uri === sourceUri)
                source.snapshot_uri = paths.source;
        const contractBytes = json(contract);
        const design = structuredClone(data.design);
        design.sources[0].snapshot_uri = paths.brief;
        design.backend_contracts[0] = {
            ...design.backend_contracts[0],
            snapshot_uri: paths.contract,
            sha256: hash(contractBytes),
        };
        const files = [
            [paths.source, sourceBytes],
            [paths.brief, briefBytes],
            [paths.contract, contractBytes],
            [paths.design, json(design)],
        ];
        for (const [path, bytes] of files) {
            await mkdir(dirname(join(root, path)), { recursive: true });
            await writeFile(join(root, path), bytes, { flag: 'wx' });
        }
        const experience = design.experiences[0];
        const page = (id) => design.pages.find((entry) => entry.id === id);
        return {
            domain,
            root,
            design,
            designPath: paths.design,
            inputPaths: files.map(([path]) => path).sort(),
            experienceId: experience.id,
            entryPage: page(experience.entry_page_id),
            landingPage: page(experience.session.landing_page_id),
            reconnectPage: page(experience.session.reconnect_page_id),
            serviceUrls: contract.services.flatMap((service) =>
                service.base_urls.map((entry) => entry.url)
            ),
        };
    } finally {
        await rm(data.root, { recursive: true, force: true });
    }
}

export function sessionShellOptions(input, profile = 'angular-pwa') {
    return {
        workspaceRoot: TOOLS_ROOT,
        targetRoot: input.root,
        designPath: input.designPath,
        experienceId: input.experienceId,
        appName: `session-${input.domain}`,
        profile,
    };
}

export function createAppArguments(options) {
    return [
        '--target-root',
        options.targetRoot,
        '--design',
        options.designPath,
        '--experience',
        options.experienceId,
        '--app',
        options.appName,
        '--profile',
        options.profile,
    ];
}

// X2 : définitions action-request 2.1 du domaine fictif, écrites dans le produit
// sous descriptions/ et liées au contrat backend du produit lui-même (chemin et
// empreinte). Aucune donnée réelle : mêmes définitions que la fixture atelier.
export async function writeExternalActionDefinitions(root, domain) {
    const data = await createApplicationSessionFixture({ domain });
    try {
        const base = `descriptions/session-${domain}`;
        const contractPath = `${base}/backend.json`;
        const contractBytes = await readFile(join(root, contractPath));
        const definitions = {};
        for (const [id, { definition }] of data.actions) {
            const local = structuredClone(definition);
            local.backend_contract = {
                ...local.backend_contract,
                uri: contractPath,
                sha256: hash(contractBytes),
            };
            const path = `${base}/actions/${id}.json`;
            await mkdir(dirname(join(root, path)), { recursive: true });
            await writeFile(join(root, path), json(local), { flag: 'wx' });
            definitions[id] = path;
        }
        return { definitions, enter: definitions[`${domain}-enter`] };
    } finally {
        await rm(data.root, { recursive: true, force: true });
    }
}

// X5 C3a : définition de la lecture « catalogue » (profil extérieur), écrite
// dans le produit avec la référence du contrat que porte le produit.
export async function writeExternalQueryDefinition(root, domain, edit) {
    const base = `descriptions/session-${domain}`;
    const contractPath = `${base}/backend.json`;
    const contractBytes = await readFile(join(root, contractPath));
    const contract = JSON.parse(contractBytes.toString('utf8'));
    const definition = await sessionCatalogueDefinition({
        domain,
        backendReference: {
            uri: contractPath,
            id: contract.contract.id,
            version: contract.contract.version,
            sha256: hash(contractBytes),
        },
    });
    edit?.(definition);
    const path = `${base}/queries/${domain}-catalogue.json`;
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), json(definition));
    return path;
}
