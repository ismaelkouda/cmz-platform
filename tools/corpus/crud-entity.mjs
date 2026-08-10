/**
 * Corpus crud-entity — 10 modules (famille CRUD : administrative-boundary,
 * administrative-infrastructure, communication, content-management,
 * coverage-areas, settings-security, team-organization, authentication, core, shared).
 *
 * @see conventions/crud-entity.pattern.json
 * @see docs/architecture/archetypes/data.md
 * @see docs/architecture/archetypes/domain.md
 * @see docs/architecture/archetypes/application.md
 * @see docs/architecture/archetypes/ui.md
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { layerOracles } from './oracle-levels.mjs';

/** @typedef {{ id: string; description: string; pattern: string; entity: string; nodes: string[] }} CrudChainDef */

export const CRUD_ENTITY_MODULES = {
    'administrative-boundary': {
        pattern: 'crud-entity',
        entities: ['region', 'department', 'municipality'],
    },
    'administrative-infrastructure': {
        pattern: 'crud-entity',
        entities: ['infrastructure', 'infrastructure-type'],
    },
    communication: {
        pattern: 'crud-entity',
        entities: ['messaging'],
    },
    'content-management': {
        pattern: 'crud-entity',
        entities: [
            'home',
            'slide',
            'news',
            'legal-notice',
            'privacy-policy',
            'terms-use',
        ],
    },
    'coverage-areas': {
        pattern: 'crud-entity',
        entities: [
            'site-group',
            'mobile-network',
            'optical-fiber-network',
            'radio-relay-links',
            'fiber-constructor',
            'tower-type',
        ],
    },
    'settings-security': {
        pattern: 'crud-entity',
        entities: ['users', 'profiles-permissions', 'access-logs'],
    },
    'team-organization': {
        pattern: 'crud-entity',
        entities: [
            'teams',
            'participants',
            'daily-goal',
            'agents-performances',
        ],
    },
    authentication: {
        pattern: 'crud-entity',
        entities: ['login', 'current-user'],
    },
    core: {
        pattern: 'crud-entity',
        entities: ['error-handling', 'interceptors'],
    },
    shared: {
        pattern: 'crud-entity',
        entities: [
            'shared-ui',
            'shared-domain',
            'shared-data',
            'shared-application',
        ],
    },
};

for (const [mod, def] of Object.entries(CRUD_ENTITY_MODULES)) {
    def.chains = def.entities.map((entity) => `${mod}.${entity}.crud-v0`);
}

/**
 * Construit la liste des chaînes pour un module crud-entity donné.
 * @param {string} module
 * @returns {Record<string, CrudChainDef>}
 */
export function buildCrudEntityChains(module) {
    const modDef = CRUD_ENTITY_MODULES[module];
    if (!modDef) return {};

    const chains = {};
    for (const entity of modDef.entities) {
        const chainId = `${module}.${entity}.crud-v0`;
        chains[chainId] = {
            id: chainId,
            description: `Tranche verticale CRUD complète pour ${entity} dans ${module}`,
            pattern: 'crud-entity',
            entity,
            nodes: [
                'crud-props',
                'crud-entity',
                'crud-filter-entity',
                'crud-find-one-entity',
                'crud-select-entity',
                'crud-filter-contract',
                'crud-filter-vo',
                'crud-repository-port',
                'crud-api-dto',
                'crud-filter-api-dto',
                'crud-mapper',
                'crud-filter-mapper',
                'crud-find-one-mapper',
                'crud-select-mapper',
                'crud-api-source',
                'crud-repository-impl',
                'crud-use-case',
                'crud-facade',
                'crud-select-facade',
                'crud-presenter',
                'crud-filter-store',
                'crud-list-page',
            ],
        };
    }
    return chains;
}

/** @type {Record<string, Record<string, CrudChainDef>>} */
export const CRUD_ENTITY_CHAINS = Object.keys(CRUD_ENTITY_MODULES).reduce(
    (acc, mod) => {
        Object.assign(acc, buildCrudEntityChains(mod));
        return acc;
    },
    {}
);

/**
 * Génère les paires IR (legacy -> Nx) pour une chaîne crud-entity.
 * @param {string} module
 * @param {CrudChainDef} chain
 * @returns {Array<import('./emit-pairs.mjs').CorpusPair>}
 */
export function expandCrudEntityChain(module, chain) {
    const entity = chain.entity;
    const root = process.cwd();
    const pairs = [];

    const nodesToPaths = [
        {
            node: 'crud-props',
            layer: 'domain',
            rel: `libs/${module}/domain/src/lib/props/${entity}.props.ts`,
        },
        {
            node: 'crud-entity',
            layer: 'domain',
            rel: `libs/${module}/domain/src/lib/entities/${entity}.entity.ts`,
        },
        {
            node: 'crud-filter-entity',
            layer: 'domain',
            rel: `libs/${module}/domain/src/lib/entities/${entity}-filter.entity.ts`,
        },
        {
            node: 'crud-find-one-entity',
            layer: 'domain',
            rel: `libs/${module}/domain/src/lib/entities/${entity}-find-one.entity.ts`,
        },
        {
            node: 'crud-select-entity',
            layer: 'domain',
            rel: `libs/${module}/domain/src/lib/entities/${entity}-select.entity.ts`,
        },
        {
            node: 'crud-filter-contract',
            layer: 'domain',
            rel: `libs/${module}/domain/src/lib/contracts/${entity}-filter.contract.ts`,
        },
        {
            node: 'crud-filter-vo',
            layer: 'domain',
            rel: `libs/${module}/domain/src/lib/value-objects/${entity}-filter.vo.ts`,
        },
        {
            node: 'crud-repository-port',
            layer: 'domain',
            rel: `libs/${module}/domain/src/lib/repositories/${entity}.repository.ts`,
        },
        {
            node: 'crud-api-dto',
            layer: 'data',
            rel: `libs/${module}/data/src/lib/dtos/${entity}-response-api.dto.ts`,
        },
        {
            node: 'crud-filter-api-dto',
            layer: 'data',
            rel: `libs/${module}/data/src/lib/dtos/${entity}-filter-api.dto.ts`,
        },
        {
            node: 'crud-mapper',
            layer: 'data',
            rel: `libs/${module}/data/src/lib/mappers/${entity}.mapper.ts`,
        },
        {
            node: 'crud-filter-mapper',
            layer: 'data',
            rel: `libs/${module}/data/src/lib/mappers/${entity}-filter.mapper.ts`,
        },
        {
            node: 'crud-find-one-mapper',
            layer: 'data',
            rel: `libs/${module}/data/src/lib/mappers/${entity}-find-one.mapper.ts`,
        },
        {
            node: 'crud-select-mapper',
            layer: 'data',
            rel: `libs/${module}/data/src/lib/mappers/${entity}-select.mapper.ts`,
        },
        {
            node: 'crud-api-source',
            layer: 'data',
            rel: `libs/${module}/data/src/lib/sources/${entity}.api.ts`,
        },
        {
            node: 'crud-repository-impl',
            layer: 'data',
            rel: `libs/${module}/data/src/lib/repositories/${entity}.repository.impl.ts`,
        },
        {
            node: 'crud-use-case',
            layer: 'application',
            rel: `libs/${module}/application/src/lib/use-cases/all-${entity}.use-case.ts`,
        },
        {
            node: 'crud-facade',
            layer: 'application',
            rel: `libs/${module}/application/src/lib/facades/${entity}.facade.ts`,
        },
        {
            node: 'crud-select-facade',
            layer: 'application',
            rel: `libs/${module}/application/src/lib/facades/${entity}-select.facade.ts`,
        },
        {
            node: 'crud-presenter',
            layer: 'ui',
            rel: `libs/${module}/ui/src/lib/adapters/${entity}-vm.presenter.ts`,
        },
        {
            node: 'crud-filter-store',
            layer: 'ui',
            rel: `libs/${module}/ui/src/lib/stores/${entity}-filter.store.ts`,
        },
        {
            node: 'crud-list-page',
            layer: 'ui',
            rel: `libs/${module}/ui/src/lib/features/${entity}-list.component.ts`,
        },
    ];

    for (const item of nodesToPaths) {
        const fullNxPath = join(root, item.rel);
        const exists = existsSync(fullNxPath);
        const pairId = `${chain.id}::${item.node}`;

        pairs.push({
            id: pairId,
            legacy: null,
            nx: exists ? item.rel : null,
            chain_id: chain.id,
            node: item.node,
            pattern: 'crud-entity',
            module,
            layer: item.layer,
            status: 'n/a',
            oracle: exists ? layerOracles(module, item.layer) : [],
            verified_at: new Date().toISOString().split('T')[0],
            notes: 'Correspondance legacy non vérifiable — voir docs/architecture/backlog-llm.md P0-2',
        });
    }

    return pairs;
}
