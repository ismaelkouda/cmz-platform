// X5 C4 (D-X5-3, R1) : patrons fermés des membres d'un nœud de lecture dans la
// composition extérieure. Chaque membre ne fait que LIRE ou DÉLÉGUER à la
// façade de lecture (G3) : aucune adresse résolue, aucun appel HTTP, aucun gel
// (la donnée naît gelée dans le décodeur et la façade, F-d).
import { QUERY_MEMBER_KINDS } from './angular-page-composition-api.mjs';

function fail(message) {
    throw new Error(`angular page composition renderer: ${message}`);
}

const EMPTY_INPUT = 'Readonly<Record<string, never>>';

// `hasInput` : la façade attend l'entrée typée de la lecture.
export function externalQueryMember(descriptor, member, kind, hasInput) {
    const facade = `this.${descriptor.propertyName}Facade`;
    // Paramètre toujours nommé `input` : la page passe un seul littéral objet
    // (grammaire, forme 6). Sans entrée, il est consommé par `void input;` :
    // le lint du PRODUIT refuse un paramètre inutilisé, même préfixé `_`.
    const command = (parameter, call, used) =>
        `(${parameter}): Observable<undefined> => defer(() => { ${used ? '' : 'void input; '}${call}; return of(undefined); })`;
    const patterns = {
        items: `computed(() => ${facade}.items())`,
        state: `computed(() => ${facade}.state())`,
        // Statut numérique seul : aucun message du serveur n'atteint la page.
        error: `computed(() => ${facade}.error()?.statusCode)`,
        pagination: `computed(() => ${facade}.pagination())`,
        load: hasInput
            ? command(
                  `input: Parameters<${descriptor.facadeAlias}['load']>[0]`,
                  `${facade}.load(input)`,
                  true
              )
            : command(`input: ${EMPTY_INPUT}`, `${facade}.load()`, false),
        reload: command(`input: ${EMPTY_INPUT}`, `${facade}.reload()`, false),
    };
    if (!Object.hasOwn(patterns, member) || QUERY_MEMBER_KINDS[member] !== kind)
        fail(`${descriptor.node.id}.${member} is outside the closed pattern`);
    const expression = patterns[member];
    if (kind === 'signal' && !expression.startsWith('computed'))
        fail(`${descriptor.node.id}.${member} is not a read-only signal`);
    if (
        kind === 'command' &&
        !/^\(input: [^)]*\): Observable<undefined> => defer\(\(\) => \{ (?:void input; )?this\.[a-zA-Z0-9]+Facade\.(?:load|reload)\((?:input)?\); return of\(undefined\); \}\)$/.test(
            expression
        )
    )
        fail(`${descriptor.node.id}.${member} is not a cold delegation`);
    return `        ${member}: ${expression},`;
}
