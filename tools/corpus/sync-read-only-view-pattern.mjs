#!/usr/bin/env node
/**
 * Sync `read-only-view.pattern.json` vers le dépôt legacy SEOS.
 *
 * Source canonique (cible Nx + nx_mapping) :
 *   docs/architecture/patterns/read-only-view.pattern.json
 * Destination :
 *   $SEOS_LEGACY_ROOT/seos/patterns/read-only-view.pattern.json
 *
 * Usage:
 *   node tools/corpus/sync-read-only-view-pattern.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const LEGACY_ROOT = resolve(
    process.env.SEOS_LEGACY_ROOT ??
        '/Users/macbookair/Dev/Angular/cmz-backoffice-frontend'
);
const dryRun = process.argv.includes('--dry-run');

const sourcePath = join(
    ROOT,
    'docs/architecture/patterns/read-only-view.pattern.json'
);
const source = JSON.parse(readFileSync(sourcePath, 'utf8'));

/** Format legacy check-pattern.js */
const legacyPattern = {
    pattern: source.pattern,
    version: source.version,
    lineage: source.lineage,
    description: source.description,
    validated_on: source.validated_on,
    partial_modules: source.partial_modules,
    source: 'cmz-platform docs/architecture/patterns/read-only-view.pattern.json — sync Rule 0 (monitoring + reporting corpus 51 paires, interactive-map partial, 2026-08-01)',
    subgraphs: source.subgraphs,
    chains: source.chains,
    modules_validated: {
        monitoring: source.reference_implementation,
        reporting: source.second_validation,
        'interactive-map': source.partial_validation,
    },
    nx_sync: {
        monorepo_path: 'cmz-platform',
        pattern_source:
            'docs/architecture/patterns/read-only-view.pattern.json',
        corpus: [
            'corpus/monitoring.pairs.jsonl',
            'corpus/reporting.pairs.jsonl',
            'corpus/interactive-map.pairs.jsonl',
        ],
        nx_mapping: source.nx_mapping,
        grafana_multi_section_core_files_nx:
            source.grafana_multi_section_core_files_nx,
        grafana_single_view_core_files_nx:
            source.grafana_single_view_core_files_nx,
        legacy_layers_dropped_in_nx:
            source.nx_mapping.legacy_layers_dropped_in_nx,
        legacy_layers_dropped_rationale:
            source.nx_mapping.legacy_layers_dropped_rationale,
    },
    consolidation_rule: source.consolidation_rule,
    forbidden_in_nx: source.forbidden_in_nx,
    required_shared: source.required_shared,
    differences_vs_crud_entity: source.differences_vs_crud_entity,
    differences_vs_workflow_action: source.differences_vs_workflow_action,
    differences_vs_action_request: source.differences_vs_action_request,
    design_decisions_v0: source.design_decisions_v0,
};

const destDir = join(LEGACY_ROOT, 'seos/patterns');
const destPath = join(destDir, 'read-only-view.pattern.json');
const payload = JSON.stringify(legacyPattern, null, 2) + '\n';

if (dryRun) {
    console.log(`[dry-run] Écrirait → ${destPath}`);
    console.log(`  validated_on: ${legacyPattern.validated_on.join(', ')}`);
    console.log(
        `  partial_modules: ${legacyPattern.partial_modules?.join(', ') ?? '—'}`
    );
    process.exit(0);
}

mkdirSync(destDir, { recursive: true });
writeFileSync(destPath, payload, 'utf8');
console.log(`Synced read-only-view.pattern.json → ${destPath}`);
