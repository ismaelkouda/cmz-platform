import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
    copyFile,
    mkdir,
    mkdtemp,
    readFile,
    rm,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { publishApplicationShell } from './core/application-shell-publication.mjs';
import { writeApplicationDesignFixture } from './test-support/application-design-fixture.mjs';

const applicationDesignSchema = JSON.parse(
    await readFile(
        new URL('./schemas/application-design.schema.json', import.meta.url),
        'utf8'
    )
);
const backendContractSchema = JSON.parse(
    await readFile(
        new URL('./schemas/backend-contract.schema.json', import.meta.url),
        'utf8'
    )
);
export const evidenceSchema = JSON.parse(
    await readFile(
        new URL(
            './schemas/page-realization-evidence.schema.json',
            import.meta.url
        ),
        'utf8'
    )
);
export const presentationEvidenceSchema = JSON.parse(
    await readFile(
        new URL('./schemas/presentation-evidence.schema.json', import.meta.url),
        'utf8'
    )
);

export function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

export async function pageRealizationFixture(profile = 'angular-pwa') {
    const root = await mkdtemp(join(tmpdir(), 'page-realization-'));
    await mkdir(join(root, 'apps'));
    await mkdir(join(root, 'designs'));
    await mkdir(join(root, 'tools/generator-platform/schemas'), {
        recursive: true,
    });
    await mkdir(join(root, 'conventions/archetypes/angular'), {
        recursive: true,
    });
    await mkdir(join(root, 'conventions/archetypes/reactjs'), {
        recursive: true,
    });
    for (const path of [
        'tools/generator-platform/role-registry.json',
        'tools/generator-platform/schemas/role-registry.schema.json',
        'tools/generator-platform/schemas/role-node.schema.json',
        'tools/generator-platform/schemas/archetype-roles.schema.json',
        'tools/generator-platform/schemas/archetype-contract.schema.json',
        'conventions/archetypes/angular/roles.json',
        'conventions/archetypes/angular/component.contract.md',
        'conventions/archetypes/reactjs/roles.json',
        'conventions/archetypes/reactjs/component.contract.md',
    ]) {
        await copyFile(
            new URL(`../../${path}`, import.meta.url),
            join(root, path)
        );
    }
    await writeFile(
        join(root, '.gitignore'),
        '.cmz/page-realization-work-orders/\n'
    );
    const data = await writeApplicationDesignFixture(
        root,
        backendContractSchema
    );
    if (profile === 'react-spa') {
        data.design.experiences[0].offline_policy = 'none';
    }
    await writeFile(
        join(root, 'designs/clean-street.application-design.json'),
        `${JSON.stringify(data.design, null, 2)}\n`
    );
    await publishApplicationShell(
        {
            workspaceRoot: root,
            designPath: 'designs/clean-street.application-design.json',
            experienceId: 'citizen-web',
            appName: 'clean-street',
            profile,
            applicationDesignSchema,
            backendContractSchema,
        },
        { run: () => '' }
    );
    execFileSync('git', ['init', '-q'], { cwd: root });
    execFileSync('git', ['add', '.'], { cwd: root });
    return {
        root,
        pageId: 'page_2222222222222222',
        pageRoot: join(
            root,
            'apps/clean-street/src/app/pages/page_2222222222222222'
        ),
    };
}

function mappings(ids) {
    return ids.map((id) => ({
        id,
        selector: `[data-cmz-id="${id}"]`,
    }));
}

function realizationEvidence(data, contractHash) {
    return {
        schema_version: '1.0.0',
        kind: 'page-realization-evidence',
        page_id: data.pageId,
        page_contract_sha256: contractHash,
        states: mappings(['ready', 'submitted', 'failed', 'offline']),
        controls: mappings(['description']),
        actions: mappings(['submit-report']),
        data_bindings: [],
        regions: mappings(['main']),
        elements: mappings(['report-heading', 'report-form']),
    };
}

function realizationMarkup() {
    return [
        'ready',
        'submitted',
        'failed',
        'offline',
        'description',
        'submit-report',
        'main',
        'report-heading',
        'report-form',
    ]
        .map((id) => `<div data-cmz-id="${id}">${id}</div>`)
        .join('\n');
}

export async function realizeAngularPage(data, contractHash) {
    await rm(data.pageRoot, { recursive: true, force: true });
    await mkdir(data.pageRoot, { recursive: true });
    await writeFile(
        join(data.pageRoot, 'page.component.ts'),
        `import { Component } from '@angular/core';\n@Component({selector: 'app-page-proof', templateUrl: './page.component.html', styleUrl: './page.component.scss'})\nexport class PageComponent {}\n`
    );
    await writeFile(
        join(data.pageRoot, 'page.component.html'),
        `${realizationMarkup()}\n`
    );
    await writeFile(
        join(data.pageRoot, 'page.component.scss'),
        ':host { display: block; }\n'
    );
    await writeFile(
        join(data.pageRoot, 'page.component.spec.ts'),
        `import { describe, expect, it } from 'vitest';\nimport { PageComponent } from './page.component';\ndescribe('PageComponent', () => { it('exists', () => expect(PageComponent).toBeDefined()); });\n`
    );
    await writeFile(
        join(data.pageRoot, 'realization-evidence.json'),
        `${JSON.stringify(realizationEvidence(data, contractHash), null, 2)}\n`
    );
}

export async function realizeReactPage(data, contractHash) {
    await writeFile(
        join(data.pageRoot, 'page.tsx'),
        `import styles from './page.module.scss';\nexport function Pagepage2222222222222222() { return <main className={styles.page}>${realizationMarkup()}</main>; }\n`
    );
    await writeFile(
        join(data.pageRoot, 'page.module.scss'),
        '.page { display: block; }\n'
    );
    await writeFile(
        join(data.pageRoot, 'page.spec.tsx'),
        `import { describe, expect, it } from 'vitest';\nimport { Pagepage2222222222222222 } from './page';\ndescribe('page', () => { it('exists', () => expect(Pagepage2222222222222222).toBeDefined()); });\n`
    );
    await writeFile(
        join(data.pageRoot, 'realization-evidence.json'),
        `${JSON.stringify(realizationEvidence(data, contractHash), null, 2)}\n`
    );
}

export async function writePresentationEvidence(data, overrides = {}) {
    const sourcePath = join(data.root, 'designs/users-layout.json');
    const sourceContent = Buffer.from(
        `${JSON.stringify({ layout: 'users', regions: ['filters', 'list'] })}\n`
    );
    await writeFile(sourcePath, sourceContent);
    const manifest = {
        schema_version: '1.0.0',
        kind: 'presentation-evidence',
        presentation_id: 'presentation_aaaaaaaaaaaaaaaa',
        page_id: data.pageId,
        status: 'approved',
        authority: 'presentation-only',
        sources: [
            {
                id: 'users-layout',
                source_kind: 'structured-design',
                purpose: 'primary-layout',
                snapshot_uri: 'designs/users-layout.json',
                media_type: 'application/json',
                bytes: sourceContent.byteLength,
                sha256: sha256(sourceContent),
                trust: 'untrusted-content',
                state_ids: ['ready'],
                viewport: null,
            },
        ],
        ...overrides,
    };
    const manifestPath = join(data.root, 'designs/users.presentation.json');
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    return {
        manifest,
        manifestPath: 'designs/users.presentation.json',
        sourcePath,
    };
}
