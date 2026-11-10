#!/usr/bin/env node
// Reprise explicite d'une publication interrompue dans une application
// extérieure (ADR-0103). Sans plan : la reprise annule un état interrompu
// exact, ou le refuse comme ambigu et laisse tout en place.
import { pathToFileURL } from 'node:url';

import { recoverApplicationPublication } from './generator-platform/core/application-publication.mjs';
import { repositoryRoot } from './generator-platform/validate-ir.mjs';

const GUIDE = 'docs/architecture/external-application-creation.md';

function fail(message) {
    throw Object.assign(new Error(message), { code: 'CMZ_CLI_USAGE' });
}

const DRIFT = {
    unlisted: 'fichier absent du manifeste de cet arbre',
    modified: 'contenu différent du manifeste de cet arbre',
    missing: 'fichier inscrit au manifeste mais absent',
    manifest: 'manifeste d’application illisible',
    entry: 'entrée spéciale ou lien symbolique',
    directory: 'répertoire non possédé',
    partial: 'candidat partiel différent du plan courant',
    several: 'plusieurs publications interrompues pour cette application',
};

// M-3 : premier écart, en chemin relatif au produit, jamais un chemin local.
// Le nom est cité en JSON pour qu'aucun caractère du produit ne s'interprète.
export function describeDrift({ tree, path, kind }) {
    const where = path === null ? tree : `${tree}/${path}`;
    return `Écart : ${JSON.stringify(where)} (${DRIFT[kind] ?? kind}).`;
}

export function parseArgs(argv) {
    const options = {};
    for (let index = 0; index < argv.length; index += 2) {
        const [argument, value] = [argv[index], argv[index + 1]];
        if (!['--target-root', '--app'].includes(argument))
            fail(`Argument inconnu : ${argument}`);
        if (!value || value.startsWith('--')) fail('Valeur d’option requise.');
        const key = argument === '--app' ? 'appName' : 'targetRoot';
        if (key in options) fail('Une option ne peut pas être répétée.');
        options[key] = value;
    }
    if (!options.targetRoot || !options.appName)
        fail('--target-root et --app sont requis.');
    return options;
}

export async function main(argv = process.argv.slice(2)) {
    const options = parseArgs(argv);
    const result = await recoverApplicationPublication({
        workspaceRoot: repositoryRoot,
        ...options,
    });
    console.log(
        JSON.stringify(
            {
                schema_version: '1.0.0',
                app_name: options.appName,
                status: result.recovered ? 'recovered' : 'nothing-to-recover',
            },
            null,
            2
        )
    );
}

if (
    process.argv[1] &&
    pathToFileURL(process.argv[1]).href === import.meta.url
) {
    main().catch((error) => {
        const known =
            error.code === 'CMZ_CLI_USAGE' ||
            error.message.startsWith('external application:');
        const locked = error.message.startsWith('another generation owns');
        console.error(
            `❌ ${known ? error.message : locked ? 'Une autre commande tient le verrou de cette application ; relancer la reprise quand elle est terminée.' : 'Reprise refusée ; inspecter le produit localement.'}`
        );
        if (error.message.includes('ambiguous interrupted publication')) {
            if (error.drift) console.error(`   ${describeDrift(error.drift)}`);
            console.error(
                `   Rien n'a été déplacé. Marche à suivre : ${GUIDE}, section « Ownership et reprise ».`
            );
        }
        process.exitCode = 1;
    });
}
