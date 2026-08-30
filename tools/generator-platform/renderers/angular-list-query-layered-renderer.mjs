/**
 * Périmètre restreint (2026-08-30) : équivalent en couches de
 * angular-list-query-renderer.mjs, pour que la sortie List simple soit
 * créable/retirable via tools/create-module.mjs et tools/retire-module.mjs
 * exactement comme action-request — ces deux outils exigent un conteneur
 * Nx `libs/<module>/<couche>/project.json` avec un tag `scope:<module>`
 * partagé, pas la sortie plate `libs/generated/{domain}-angular` du
 * renderer standalone (voir README de tools/generator-platform : cette
 * dernière reste "verification-only", jamais destinée au cycle de vie
 * create/retire).
 *
 * Seulement 2 couches (domain, data) — pas 3 comme action-request-layered.
 * Aucune couche "application" : List simple n'a ni port/token à raccorder
 * (pas de permission, pas de session) ni de slot after-success (aucun
 * effet de bord à étendre pour une lecture pure). Le catalogue
 * 'list-query-model' (core/artifact-plan.mjs) ne déclare d'ailleurs que
 * des responsabilités 'domain'/'data'/'per-layer' — jamais 'application' —
 * donc bindLayeredArtifacts n'attend rien de plus ici.
 */
import { assertArtifactPlan } from '../core/artifact-plan.mjs';
import { expandProfileValue, renderModels } from './shared.mjs';
import {
    assertListQueryRendererInput,
    itemTypeName,
    renderResponseEnvelopeContract,
} from './list-query-shared.mjs';
import { bindLayeredArtifacts } from './layered-artifact-binding.mjs';

export function domainPackageName(basePackageName) {
    return `@cmz/${basePackageName}-domain`;
}
export function dataPackageName(basePackageName) {
    return `@cmz/${basePackageName}-data`;
}

function renderClientImplementation(semantic, domainPkg) {
    const hasEnvelope = semantic.integrations.some(
        (integration) => integration.response_envelope === 'simple'
    );
    const itemTypes = [
        ...new Set(
            semantic.operations.map((operation) => itemTypeName(operation))
        ),
    ];
    const methods = semantic.operations
        .map((operation) => {
            const integration = semantic.integrations.find(
                (candidate) => candidate.id === operation.integration_ref
            );
            if (!integration) {
                throw new Error(
                    `angular list-query layered renderer: missing ${operation.integration_ref}`
                );
            }
            const item = itemTypeName(operation);
            const isEnveloped = integration.response_envelope === 'simple';
            const requestType = isEnveloped
                ? `ResponseEnvelope<${item}[]>`
                : `${item}[]`;
            const pipeline = isEnveloped
                ? `.pipe(map(unwrapResponseEnvelope))`
                : '';
            const methodName = operation.id
                .split(/[-_]/)
                .filter(Boolean)
                .map((part, index) =>
                    index === 0
                        ? part[0].toLowerCase() + part.slice(1)
                        : part[0].toUpperCase() + part.slice(1)
                )
                .join('');
            return `    ${methodName}(): Observable<${item}[]> {\n        return this.http.get<${requestType}>(joinUrl(this.baseUrl, '${integration.path}'), {\n            context: new HttpContext().set(PUBLIC_REQUEST, ${integration.authentication === 'none'}),\n        })${pipeline};\n    }`;
        })
        .join('\n\n');
    const rxjsImports = hasEnvelope
        ? 'map, type Observable'
        : 'type Observable';
    const envelopeContract = hasEnvelope
        ? `\n${renderResponseEnvelopeContract()}\n`
        : '';
    return `import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';\nimport { InjectionToken, Service, inject } from '@angular/core';\nimport { ${rxjsImports} } from 'rxjs';\nimport type { ${itemTypes.join(', ')} } from '${domainPkg}';\n\nexport const LIST_QUERY_BASE_URL = new InjectionToken<string>('LIST_QUERY_BASE_URL');\nexport const PUBLIC_REQUEST = new HttpContextToken<boolean>(() => false);\n${envelopeContract}\nfunction joinUrl(baseUrl: string, path: string): string {\n    return [baseUrl.replace(/\\/$/, ''), path.replace(/^\\//, '')].join('/');\n}\n\n// autoProvided:false — même doctrine que ListQueryClient standalone\n// (renderers/angular-list-query-renderer.mjs) et ActionRequestClient\n// (renderers/angular-nx-layered-renderer.mjs).\n@Service({ autoProvided: false })\nexport class ListQueryClient {\n    private readonly http = inject(HttpClient);\n    private readonly baseUrl = inject(LIST_QUERY_BASE_URL);\n\n${methods}\n}\n`;
}

function projectJson(name, sourceRoot, tags) {
    const projectRoot = sourceRoot.replace(/\/src$/, '');
    return `${JSON.stringify(
        {
            name,
            $schema: '../../../node_modules/nx/schemas/project-schema.json',
            projectType: 'library',
            sourceRoot,
            tags,
            targets: {
                build: {
                    executor: 'nx:run-commands',
                    options: {
                        command: `tsc --noEmit --project ${projectRoot}/tsconfig.json`,
                        cwd: '{workspaceRoot}',
                    },
                },
            },
        },
        null,
        2
    )}\n`;
}

function tsconfigJson({ experimentalDecorators }) {
    return `${JSON.stringify(
        {
            extends: '../../../tsconfig.base.json',
            ...(experimentalDecorators
                ? { compilerOptions: { experimentalDecorators: true } }
                : {}),
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
        },
        null,
        2
    )}\n`;
}

function packageJson(name, dependencies) {
    return `${JSON.stringify(
        { name, version: '0.0.0', private: true, dependencies },
        null,
        2
    )}\n`;
}

export function renderAngularListQueryLayered(semantic, artifactPlan, profile) {
    assertArtifactPlan(artifactPlan, semantic, 'list-query-model');
    assertListQueryRendererInput(semantic, profile, 'angular-nx-layered');
    const outputRoot = expandProfileValue(
        profile.output_root,
        semantic,
        'output_root'
    );
    const basePackageName = expandProfileValue(
        profile.package_name,
        semantic,
        'package_name'
    );
    const domainPkg = domainPackageName(basePackageName);
    const dataPkg = dataPackageName(basePackageName);

    const domainFiles = {
        'project.json': projectJson(
            domainPkg,
            `${outputRoot}/angular-domain/src`,
            [
                `scope:${semantic.domain.id}`,
                'type:domain',
                'platform:angular',
                'generated:true',
            ]
        ),
        'package.json': packageJson(domainPkg, {}),
        'src/models.ts': renderModels(semantic),
        'src/index.ts': `export * from './models';\n`,
        'tsconfig.json': tsconfigJson({ experimentalDecorators: false }),
    };
    const domainArtifacts = bindLayeredArtifacts(
        artifactPlan,
        'domain',
        domainFiles,
        {
            'project.json': 'package-descriptor',
            'package.json': 'package-descriptor',
            'src/models.ts': 'domain-model',
            'src/index.ts': 'public-api',
            'tsconfig.json': 'compiler-configuration',
        }
    );

    const dataFiles = {
        'project.json': projectJson(dataPkg, `${outputRoot}/angular-data/src`, [
            `scope:${semantic.domain.id}`,
            'type:data',
            'platform:angular',
            'generated:true',
        ]),
        'package.json': packageJson(dataPkg, {
            [domainPkg]: 'workspace:*',
            '@angular/common': 'catalog:',
            '@angular/core': 'catalog:',
            rxjs: 'catalog:',
        }),
        'src/list-query-client.ts': renderClientImplementation(
            semantic,
            domainPkg
        ),
        'src/index.ts': `export * from './list-query-client';\n`,
        'tsconfig.json': tsconfigJson({ experimentalDecorators: true }),
    };
    const dataArtifacts = bindLayeredArtifacts(
        artifactPlan,
        'data',
        dataFiles,
        {
            'project.json': 'package-descriptor',
            'package.json': 'package-descriptor',
            'src/list-query-client.ts': 'integration-client',
            'src/index.ts': 'public-api',
            'tsconfig.json': 'compiler-configuration',
        }
    );

    return { domain: domainArtifacts, data: dataArtifacts };
}
