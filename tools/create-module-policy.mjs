function fail(message) {
    throw new Error(message);
}

export function parseCreateModuleArgs(argv) {
    const options = {
        abort: false,
        allowExperimental: false,
        dryRun: false,
        resume: false,
    };
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (argument === '--definition') options.definition = argv[++index];
        else if (argument === '--module') options.module = argv[++index];
        else if (argument === '--dry-run') options.dryRun = true;
        else if (argument === '--allow-experimental')
            options.allowExperimental = true;
        else if (argument === '--resume') options.resume = true;
        else if (argument === '--abort') options.abort = true;
        else fail(`Argument inconnu : ${argument}`);
    }
    if (options.resume || options.abort) {
        if (!options.module || !/^[a-z][a-z0-9-]*$/.test(options.module))
            fail('--resume/--abort exige --module <kebab-case>.');
        if (
            options.definition ||
            options.dryRun ||
            options.allowExperimental ||
            (options.resume && options.abort)
        )
            fail(
                '--resume et --abort sont exclusifs de --definition/--dry-run/--allow-experimental.'
            );
    } else if (!options.definition) {
        fail('--definition <fichier.json> est requis.');
    }
    return options;
}

export function assertCompositionAdoption(options, definition, composition) {
    if (composition.maturity === 'experimental' && !options.allowExperimental)
        fail(
            `La composition "${definition.kind}" est expérimentale et interdite ` +
                `par défaut. Limite connue : ${composition.maturityNote} ` +
                `Après revue explicite de ce risque, relancer avec --allow-experimental.`
        );
}
