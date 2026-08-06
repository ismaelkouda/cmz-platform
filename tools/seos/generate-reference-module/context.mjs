/**
 * SEOS generate-reference-module — parsing CLI config + helpers d'écriture.
 * Extrait du monolithe pour respecter le plafond de poids fichier (CI `--all`).
 */
import fs from 'node:fs';
import path from 'node:path';

export function pascalCase(kebab) {
    return String(kebab)
        .split('-')
        .filter(Boolean)
        .map((s) => s[0].toUpperCase() + s.slice(1))
        .join('');
}

export function upperSnake(kebab) {
    return String(kebab).replace(/-/g, '_').toUpperCase();
}

export function toSnake(name) {
    return String(name)
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/-/g, '_')
        .toLowerCase();
}

const defaultConfig = {
    entity: 'resources',
    module: 'seos-reference',
    fields: ['code', 'name', 'description'],
    filters: [],
    apiBase: null,
    description: '',
};

/**
 * @param {string} root dossier de sortie
 * @param {string | null} configPath chemin optionnel JSON config
 */
export function createContext(root, configPath) {
    const loaded = configPath
        ? JSON.parse(fs.readFileSync(path.resolve(configPath), 'utf8'))
        : {};
    const cfg = { ...defaultConfig, ...loaded };

    const E = cfg.entity;
    const Cap = cfg.entityCap || pascalCase(E);
    const MODULE = cfg.module;
    const MODULE_UPPER = cfg.moduleUpper || upperSnake(MODULE);
    const ENTITY_UPPER = cfg.entityUpper || upperSnake(E);
    const ModuleCap = cfg.moduleCap || pascalCase(MODULE);
    const FIELD_DEFS = (cfg.fields || defaultConfig.fields).map((f) =>
        typeof f === 'string'
            ? { name: f, required: true }
            : { name: f.name, required: f.required !== false, type: f.type }
    );
    const FIELD_NAMES = FIELD_DEFS.map((f) => f.name);
    const REQUIRED_FIELDS = FIELD_DEFS.filter((f) => f.required).map(
        (f) => f.name
    );
    const EXTRA_FILTERS = (cfg.filters || [])
        .map((f) => (typeof f === 'string' ? f : f.name))
        .filter(
            (f) => f && f !== 'search' && f !== 'startDate' && f !== 'endDate'
        );
    const API_BASE = cfg.apiBase || `/${E}`;
    const BASE = `@pages/${MODULE}`;

    const crudOps = [
        { kind: 'create', fields: [...FIELD_NAMES] },
        { kind: 'update', fields: ['uniqId', ...FIELD_NAMES] },
    ];

    function w(relPath, content) {
        const abs = path.join(root, relPath);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, content.trimStart());
    }

    // Métadonnées DSL (si présentes)
    if (cfg.sourceDsl || cfg.extensions || cfg.description) {
        w(
            'seos.feature.meta.json',
            JSON.stringify(
                {
                    pattern: 'crud-entity',
                    entity: E,
                    module: MODULE,
                    fields: FIELD_NAMES,
                    filters: EXTRA_FILTERS,
                    apiBase: API_BASE,
                    description: cfg.description || '',
                    extensions: cfg.extensions || {},
                    sourceDsl: cfg.sourceDsl || null,
                    generatedAt: new Date().toISOString(),
                },
                null,
                2
            ) + '\n'
        );
    }

    return {
        root,
        cfg,
        w,
        E,
        Cap,
        MODULE,
        MODULE_UPPER,
        ENTITY_UPPER,
        ModuleCap,
        FIELD_DEFS,
        FIELD_NAMES,
        REQUIRED_FIELDS,
        EXTRA_FILTERS,
        API_BASE,
        BASE,
        crudOps,
        toSnake,
        pascalCase,
        upperSnake,
    };
}
