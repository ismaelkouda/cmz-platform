import { stableJson } from './library-plan.mjs';

function fail(message) {
    throw new Error(`library qualification contracts: ${message}`);
}

/**
 * Contrats propres et réciproques qui doivent être prouvés pour qualifier une
 * piste. Le propriétaire reste attaché à chaque contrat : deux bibliothèques
 * peuvent employer le même identifiant sans partager le même oracle.
 */
export function qualificationProofContracts(recipe, recipeRegistry) {
    if (!(recipeRegistry instanceof Map)) {
        fail('registre de recettes requis');
    }
    const contracts = [];
    const append = (owner, scope, entries = []) => {
        for (const contract of entries) {
            contracts.push({ owner, scope, contract });
        }
    };
    const owner = `${recipe.platform}/${recipe.library}`;
    append(owner, 'runtime', recipe.runtime_acceptance);
    for (const block of recipe.coexistence ?? []) {
        append(owner, `coexistence:${block.with}`, block.runtime_acceptance);
    }
    for (const candidate of recipeRegistry.values()) {
        if (candidate.platform !== recipe.platform) continue;
        for (const block of candidate.coexistence ?? []) {
            if (block.with !== recipe.library) continue;
            append(
                `${candidate.platform}/${candidate.library}`,
                `coexistence:${block.with}`,
                block.runtime_acceptance
            );
        }
    }
    return contracts.sort((left, right) =>
        stableJson(left).localeCompare(stableJson(right))
    );
}

export function qualificationOracleKeys(recipe, recipeRegistry) {
    const keys = qualificationProofContracts(recipe, recipeRegistry).map(
        ({ owner, contract }) => `${owner}#${contract.id}`
    );
    if (new Set(keys).size !== keys.length) {
        fail(`oracle dupliqué pour ${recipe.platform}/${recipe.library}`);
    }
    return keys.sort();
}
