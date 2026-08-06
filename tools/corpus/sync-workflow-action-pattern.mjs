#!/usr/bin/env node
/**
 * Sync `workflow-action.pattern.json` vers le dépôt legacy SEOS.
 *
 * Source canonique (cible Nx + nx_mapping) :
 *   docs/architecture/patterns/workflow-action.pattern.json
 * Destination :
 *   $SEOS_LEGACY_ROOT/seos/patterns/workflow-action.pattern.json
 *
 * Usage:
 *   SEOS_LEGACY_ROOT=/chemin/legacy node tools/corpus/sync-workflow-action-pattern.mjs [--dry-run]
 *
 * SEOS_LEGACY_ROOT obligatoire (pas de fallback, audit B-1).
 *
 * @see A-2026-07-30-07 step 3 — Rule 0 satisfaite (processing + requests)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireLegacyRoot } from './legacy-root.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const LEGACY_ROOT = requireLegacyRoot();
const dryRun = process.argv.includes('--dry-run');

const sourcePath = join(
    ROOT,
    'docs/architecture/patterns/workflow-action.pattern.json'
);
const source = JSON.parse(readFileSync(sourcePath, 'utf8'));

/** Format legacy check-pattern.js — core_files relative au module pages/{module}/ */
const legacyPattern = {
    pattern: source.pattern,
    version: source.version,
    lineage: source.lineage,
    description: source.description,
    validated_on: source.validated_on,
    source: 'cmz-platform docs/architecture/patterns/workflow-action.pattern.json — sync Rule 0 (processing 113 + requests 157 paires, 8 chaînes requests, 2026-07-31)',
    limite_methodologique_independance:
        source.limite_methodologique_independance,
    unit_placeholder: '{VOLET}',
    core_files: [
        ...source.list_volet_core_files_legacy,
        '{MODULE}.routes.ts',
        'di/{MODULE}.providers.ts',
        'infrastructure/api/{MODULE}.endpoints.ts',
    ],
    subgraphs: source.subgraphs,
    chains: source.chains,
    modules_validated: {
        processing: source.reference_implementation,
        requests: source.second_validation,
    },
    nx_sync: {
        monorepo_path: 'cmz-platform',
        pattern_source:
            'docs/architecture/patterns/workflow-action.pattern.json',
        corpus: [
            'corpus/processing.pairs.jsonl',
            'corpus/requests.pairs.jsonl',
        ],
        nx_mapping: source.nx_mapping,
        list_volet_core_files_nx: source.list_volet_core_files_nx,
        legacy_layers_dropped_in_nx:
            source.nx_mapping.legacy_layers_dropped_in_nx,
        legacy_layers_dropped_rationale:
            source.nx_mapping.legacy_layers_dropped_rationale,
    },
    constraints: source.constraints,
    design_decisions_v0: source.design_decisions_v0,
    differences_vs_crud_entity: source.differences_vs_crud_entity,
    differences_vs_action_request: source.differences_vs_action_request,
};

const destDir = join(LEGACY_ROOT, 'seos/patterns');
const destPath = join(destDir, 'workflow-action.pattern.json');
const payload = JSON.stringify(legacyPattern, null, 2) + '\n';

if (dryRun) {
    console.log(`[dry-run] Écrirait → ${destPath}`);
    console.log(`  validated_on: ${legacyPattern.validated_on.join(', ')}`);
    console.log(`  core_files: ${legacyPattern.core_files.length} entrées`);
    process.exit(0);
}

mkdirSync(destDir, { recursive: true });
writeFileSync(destPath, payload, 'utf8');
console.log(`Synced workflow-action.pattern.json → ${destPath}`);
