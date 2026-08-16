/**
 * Validation du schéma SEOS Corpus Pair (T2-7 / H-5) — **sans Ajv**.
 *
 * Raison Big Tech : le monorepo Bun ne hoist pas `ajv` à la racine ; un
 * résolveur vers `node_modules/.bun/ajv@…` est fragile. Un validateur
 * minimal couvrant exactement `pair.schema.json` (types, enum, required,
 * pattern, format date|date-time, additionalProperties, $ref $defs)
 * est déterministe et testable hors réseau.
 *
 * Usage :
 *   bun run check:pair-schema
 *   node tools/corpus/validate-pair-schema.mjs --fixture
 *   node tools/corpus/validate-pair-schema.mjs corpus/foo.pairs.jsonl
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    buildOracleReport,
    assertOracleReportShape,
} from './oracle-report.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCHEMA_PATH = join(ROOT, 'docs/architecture/corpus/pair.schema.json');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_RE =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * @param {object} schema
 * @param {unknown} data
 * @param {string} path
 * @param {object} rootSchema
 * @returns {string[]}
 */
function validate(schema, data, path, rootSchema) {
    /** @type {string[]} */
    const errors = [];
    if (schema.$ref) {
        const ref = schema.$ref;
        if (!ref.startsWith('#/$defs/')) {
            return [`${path}: unsupported $ref ${ref}`];
        }
        const name = ref.slice('#/$defs/'.length);
        const def = rootSchema.$defs?.[name];
        if (!def) return [`${path}: unknown $defs ${name}`];
        return validate(def, data, path, rootSchema);
    }

    if (schema.type) {
        const types = Array.isArray(schema.type) ? schema.type : [schema.type];
        const ok = types.some((t) => {
            if (t === 'null') return data === null;
            if (t === 'array') return Array.isArray(data);
            if (t === 'object')
                return (
                    data !== null &&
                    typeof data === 'object' &&
                    !Array.isArray(data)
                );
            if (t === 'integer')
                return typeof data === 'number' && Number.isInteger(data);
            return typeof data === t;
        });
        if (!ok) {
            errors.push(
                `${path}: type expected ${types.join('|')}, got ${describe(data)}`
            );
            return errors;
        }
    }

    if (schema.enum && !schema.enum.includes(data)) {
        errors.push(`${path}: value not in enum`);
    }

    if (typeof data === 'string') {
        if (schema.pattern) {
            const re = new RegExp(schema.pattern);
            if (!re.test(data)) {
                errors.push(`${path}: pattern mismatch (${schema.pattern})`);
            }
        }
        if (schema.format === 'date' && !DATE_RE.test(data)) {
            errors.push(`${path}: format date (YYYY-MM-DD)`);
        }
        if (schema.format === 'date-time' && !DATE_TIME_RE.test(data)) {
            errors.push(`${path}: format date-time ISO-8601`);
        }
    }

    if (typeof data === 'number' && schema.minimum !== undefined) {
        if (data < schema.minimum) {
            errors.push(`${path}: < minimum ${schema.minimum}`);
        }
    }

    if (Array.isArray(data) && schema.items) {
        data.forEach((item, i) => {
            errors.push(
                ...validate(schema.items, item, `${path}[${i}]`, rootSchema)
            );
        });
    }

    if (
        data &&
        typeof data === 'object' &&
        !Array.isArray(data) &&
        schema.properties
    ) {
        const obj = /** @type {Record<string, unknown>} */ (data);
        if (schema.required) {
            for (const key of schema.required) {
                if (!(key in obj)) {
                    errors.push(`${path}: missing required « ${key} »`);
                }
            }
        }
        for (const [key, value] of Object.entries(obj)) {
            if (schema.properties[key]) {
                errors.push(
                    ...validate(
                        schema.properties[key],
                        value,
                        path ? `${path}.${key}` : key,
                        rootSchema
                    )
                );
            } else if (schema.additionalProperties === false) {
                errors.push(
                    `${path}: additional property « ${key} » not allowed`
                );
            }
        }
    }

    return errors;
}

function describe(data) {
    if (data === null) return 'null';
    if (Array.isArray(data)) return 'array';
    return typeof data;
}

/** @param {object} schema @param {unknown} data */
export function validatePair(schema, data) {
    return validate(schema, data, '', schema);
}

function builtInFixtures(schema) {
    const ranAt = '2026-08-06T12:00:00.000Z';
    const report = buildOracleReport({
        structuralOnly: true,
        gate: {
            ok: true,
            results: [
                { task: 'build', ok: true, detail: 'nx run-many -t build' },
                { task: 'lint', ok: true, detail: 'nx run-many -t lint' },
                {
                    task: 'test',
                    ok: true,
                    skipped: true,
                    detail: 'C-2 skipped',
                },
            ],
        },
        pairOracle: ['@cmz/dashboard-domain:build'],
        verifiedOracles: new Set(['@cmz/dashboard-domain:build']),
        levels: { structural: 1, behavioral: 0, other: 0 },
        ranAt,
    });

    const valid = {
        id: 'dashboard.statistics.entity',
        legacy: 'src/presentation/pages/dashboard/domain/entities/x.ts',
        nx: 'libs/dashboard/domain/src/lib/entities/dashboard.entity.ts',
        chain_id: 'dashboard.home',
        node: 'entity',
        pattern: 'read-only-view',
        module: 'dashboard',
        layer: 'domain',
        status: 'verified',
        oracle: ['@cmz/dashboard-domain:build'],
        verified_at: '2026-08-06',
        oracle_report: report,
        legacy_ref: {
            commit: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        },
    };

    const invalidOracleReport = {
        ...valid,
        id: 'dashboard.statistics.entity-bad',
        oracle_report: {
            ran_at: ranAt,
            mode: 'nope',
            build: { status: 'pass' },
        },
    };

    const invalidExtraProp = {
        ...valid,
        id: 'dashboard.statistics.entity-extra',
        invente: true,
    };

    return { valid, invalidOracleReport, invalidExtraProp, schema };
}

function collectJsonlPaths(cliArgs) {
    const paths = cliArgs.filter((a) => !a.startsWith('--'));
    if (paths.length) return paths.map((p) => resolve(ROOT, p));
    const dir = join(ROOT, 'corpus');
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
        .filter((f) => f.endsWith('.pairs.jsonl'))
        .map((f) => join(dir, f));
}

function main() {
    const args = process.argv.slice(2);
    const fixtureOnly = args.includes('--fixture');
    const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));

    let failures = 0;
    let checked = 0;

    if (fixtureOnly || args.length === 0) {
        const { valid, invalidOracleReport, invalidExtraProp } =
            builtInFixtures(schema);

        const shapeErrs = assertOracleReportShape(valid.oracle_report);
        if (shapeErrs.length) {
            console.error('[fixture] assertOracleReportShape:', shapeErrs);
            failures += 1;
        }

        checked += 1;
        const vErr = validatePair(schema, valid);
        if (vErr.length) {
            console.error('[fixture] valid sample rejected:', vErr);
            failures += 1;
        } else {
            console.error('[fixture] ✓ valid pair + oracle_report');
        }

        checked += 1;
        const bad = validatePair(schema, invalidOracleReport);
        if (!bad.length) {
            console.error(
                '[fixture] invalidOracleReport should fail schema validation'
            );
            failures += 1;
        } else {
            console.error(
                `[fixture] ✓ rejects broken oracle_report (${bad.length} err)`
            );
        }

        checked += 1;
        const extra = validatePair(schema, invalidExtraProp);
        if (!extra.length) {
            console.error(
                '[fixture] invalidExtraProp should fail (additionalProperties)'
            );
            failures += 1;
        } else {
            console.error('[fixture] ✓ rejects additionalProperties');
        }

        if (fixtureOnly) {
            if (failures) {
                console.error(
                    `[validate-pair-schema] FAIL — ${failures} fixture case(s)`
                );
                process.exit(1);
            }
            console.error(
                `[validate-pair-schema] OK — ${checked} fixture check(s)`
            );
            process.exit(0);
        }
    }

    const files = collectJsonlPaths(args);
    for (const file of files) {
        if (!existsSync(file)) {
            console.error(`[validate-pair-schema] missing ${file}`);
            failures += 1;
            continue;
        }
        const lines = readFileSync(file, 'utf8')
            .split('\n')
            .filter((l) => l.trim());
        let lineNo = 0;
        for (const line of lines) {
            lineNo += 1;
            checked += 1;
            let obj;
            try {
                obj = JSON.parse(line);
            } catch (e) {
                console.error(`${file}:${lineNo} JSON parse: ${e.message}`);
                failures += 1;
                continue;
            }
            const errs = validatePair(schema, obj);
            if (errs.length) {
                console.error(
                    `${file}:${lineNo} id=${obj?.id ?? '?'} —\n  ${errs.join('\n  ')}`
                );
                failures += 1;
            }
        }
        console.error(
            `[validate-pair-schema] ${file} — ${lines.length} line(s)`
        );
    }

    if (failures) {
        console.error(
            `[validate-pair-schema] FAIL — ${failures} error(s), ${checked} object(s) checked`
        );
        process.exit(1);
    }
    console.error(
        `[validate-pair-schema] OK — ${checked} object(s), ${files.length} file(s)`
    );
}

main();
