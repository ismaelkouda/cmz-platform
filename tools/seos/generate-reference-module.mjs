#!/usr/bin/env node
/**
 * SEOS — Générateur du module de référence "resources" (CLI).
 *
 * Découpé en modules par couche (domain / application / presentation / infra)
 * pour respecter le plafond de lignes CI (`check-file-weight --all`, 800 l.).
 * La sémantique de sortie est celle d'Experience 035 (module flat legacy).
 *
 * Usage:
 *   node tools/seos/generate-reference-module.mjs <dossier-destination>
 *   node tools/seos/generate-reference-module.mjs <dossier-destination> --config <config.json>
 */
import { createContext } from './generate-reference-module/context.mjs';
import { writeDomain } from './generate-reference-module/write-domain.mjs';
import { writeApplication } from './generate-reference-module/write-application.mjs';
import { writePresentationStore } from './generate-reference-module/write-presentation-store.mjs';
import { writeDiInfrastructure } from './generate-reference-module/write-di-infrastructure.mjs';
import { writePresentationUi } from './generate-reference-module/write-presentation-ui.mjs';

const rawArgs = process.argv.slice(2);
const ROOT = rawArgs.find(
    (a) =>
        a &&
        !a.startsWith('--') &&
        rawArgs[rawArgs.indexOf(a) - 1] !== '--config'
);
const configFlagIdx = rawArgs.indexOf('--config');
const configPath = configFlagIdx >= 0 ? rawArgs[configFlagIdx + 1] : null;

if (!ROOT) {
    console.error(
        'Usage: node generate-reference-module.mjs <dossier-destination> [--config config.json]'
    );
    process.exit(1);
}

const ctx = createContext(ROOT, configPath);
writeDomain(ctx);
writeApplication(ctx);
writePresentationStore(ctx);
writeDiInfrastructure(ctx);
writePresentationUi(ctx);

console.log(
    `Module crud-entity "${ctx.E}" (module=${ctx.MODULE}) genere sous`,
    ROOT
);
