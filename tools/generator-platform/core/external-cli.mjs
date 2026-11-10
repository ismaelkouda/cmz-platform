// CLI extérieures fermées (X3) : options exactes, plan relu obligatoire,
// messages sans pile ni chemin de l'atelier.

// `keys` : option → clé ; `--dry-run` et `--apply <plan_id>` sont exclusifs et
// l'un des deux est obligatoire.
export function parseClosedArguments(arguments_, keys, label) {
    const options = {};
    const all = { ...keys, '--apply': 'expectedPlanId' };
    for (let index = 0; index < arguments_.length; index += 1) {
        const argument = arguments_[index];
        if (argument === '--help') return { help: true };
        if (argument === '--dry-run') {
            if (options.dryRun) throw new Error('--dry-run is repeated');
            options.dryRun = true;
            continue;
        }
        if (!Object.hasOwn(all, argument))
            throw new Error(
                `argument not allowed with --target-root: ${argument}`
            );
        const value = arguments_[index + 1];
        if (!value || value.startsWith('--'))
            throw new Error(`${argument} requires a value`);
        if (Object.hasOwn(options, all[argument]))
            throw new Error(`${argument} is repeated`);
        options[all[argument]] = value;
        index += 1;
    }
    // M-8 : seules les options manquantes sont nommées.
    const missing = Object.keys(keys).filter(
        (argument) => !Object.hasOwn(options, keys[argument])
    );
    if (missing.length > 0)
        throw new Error(
            `${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} required`
        );
    if (Boolean(options.dryRun) === Boolean(options.expectedPlanId))
        throw new Error(`${label} requires --dry-run or --apply <plan_id>`);
    return { external: true, ...options };
}

export function reportExternalFailure(error) {
    const known =
        error.message.startsWith('external application:') ||
        error.message.startsWith('external ') ||
        error.message.startsWith('argument not allowed') ||
        error.message.startsWith('--');
    const locked = error.message.startsWith('another generation owns');
    console.error(
        `❌ ${known ? error.message : locked ? 'Une autre commande tient le verrou de cette application ; relancer quand elle est terminée.' : 'Génération extérieure refusée ; inspecter les entrées localement.'}`
    );
    process.exitCode = 1;
}

export function publicationResult(result, appName, extra) {
    return {
        schema_version: '1.0.0',
        plan_id: result.plan_id,
        app_name: appName,
        ...extra,
        status: result.replayed ? 'already-published' : 'published',
        recovered: result.recovered,
    };
}

// I-1, I-3 : une nouvelle publication de la commande périme le plan, la
// composition et le bon de travail des pages qui la consomment ; elles sont
// nommées, pas modifiées.
export function dependentPagesNotice(pages) {
    if (!pages?.length) return;
    const names = pages.map(
        ({ page_id, composition, realization }) =>
            `${page_id} (plan${composition ? ', composition' : ''}${realization ? ', page réalisée' : ''})`
    );
    const realized = pages.some(({ realization }) => realization);
    console.error(
        `⚠ Pages qui consomment cette commande : ${names.join(', ')}. Après publication, relancer compile:page-execution-plan puis generate:page-composition pour chacune${realized ? ', puis prepare:page-realization et verify:page-realization --dry-run pour une page réalisée' : ''}.`
    );
}
