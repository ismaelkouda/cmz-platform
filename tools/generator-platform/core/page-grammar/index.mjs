// X4-sécurité-3 : accepteur de la page réalisée, fonction pure
// `pageGrammarViolations({ files, workOrder })`. Il s'exécute en premier et
// fait autorité ; les couches de X4-sécurité-2 restent derrière, en renfort.
import { TypeScriptGrammar } from './typescript.mjs';
import './typescript-class.mjs';
import './typescript-expression.mjs';
import { TemplateGrammar } from './template.mjs';
import './template-element.mjs';
import { styleGrammar } from './style.mjs';
import { formatViolation } from './text.mjs';
import { readClassViolations } from './read-class.mjs';
import { readTemplateViolations } from './read-template.mjs';
import {
    OFFLINE_BRANCH_ID,
    ONLINE_ACCESS,
    isReservedBranchId,
    readAccess,
} from '../read-access.mjs';

export { TemplateGrammar, TypeScriptGrammar };

export function typescriptGrammar({
    name = 'page.component.ts',
    text,
    context,
}) {
    return new TypeScriptGrammar({ name, text, context }).check();
}

export function templateGrammar({ text, facts, contract }) {
    return new TemplateGrammar({ text, facts, contract }).check();
}

// Faits de la classe que le gabarit consomme : membres, genres, visibilités,
// imports du décorateur et liaisons d'hôte.
export function templateFacts(grammar) {
    return {
        text: grammar.text,
        fields: new Map(
            [...grammar.fields].map(([name, field]) => [
                name,
                { kind: field.kind, visibility: field.visibility },
            ])
        ),
        methods: new Map(
            [...grammar.methods].map(([name, method]) => [
                name,
                {
                    visibility: method.visibility,
                    params: method.params,
                    returns: method.returns,
                },
            ])
        ),
        decoratorImports: [...grammar.facts.decoratorImports],
        host: [...grammar.facts.host],
    };
}

// Identifiants déclarés par le contrat de page (H3).
export function pageContractIds(page) {
    return [
        ...page.states,
        ...page.controls,
        ...page.actions,
        ...page.data_bindings,
        ...page.regions,
        ...page.regions.flatMap((region) => region.elements),
    ].map((entry) => entry.id);
}

// Contexte de la grammaire, tiré du bon de travail et du contrat de page.
export function grammarContext(workOrder, pageContract) {
    const page = pageContract.page;
    const reads = workOrder.read_states
        ? workOrder.read_states.reads.map(readAccess)
        : undefined;
    // X5 C6 N5-1 : fermé, l'identifiant hors ligne publié est la constante.
    if (
        workOrder.read_states &&
        workOrder.read_states.offline_branch_id !== OFFLINE_BRANCH_ID
    )
        throw new Error('published offline branch id differs');
    const declared = pageContractIds(page);
    return {
        compositionModule: workOrder.composition.module,
        selector: workOrder.grammar.selector,
        api: new Map(
            workOrder.composition.api.map((entry) => [entry.path, entry.kind])
        ),
        // X5 C6 N5-1 : une page à lectures admet aussi ses identifiants de
        // branche dérivés (exigés à la racine par LE2 et LE6).
        ids: new Set([
            ...declared,
            ...(reads
                ? [
                      OFFLINE_BRANCH_ID,
                      ...reads.flatMap((read) => [...read.branchIds.values()]),
                  ]
                : []),
        ]),
        // Garde (a) : identifiants du contrat dans la famille réservée.
        reserved: reads ? declared.filter(isReservedBranchId) : [],
        routes: new Set(workOrder.grammar.routes),
        // X5 C5b : règles d'une page à lectures, seulement si le bon de
        // travail porte `read_states`. Textes d'absence : contrat de page
        // scellé (A3).
        reads: workOrder.read_states
            ? {
                  online: ONLINE_ACCESS,
                  reads,
                  offlineBranchId: OFFLINE_BRANCH_ID,
                  absentTexts: page.data_bindings
                      .map((binding) => binding.absent_text)
                      .filter((text) => typeof text === 'string'),
              }
            : undefined,
    };
}

// Violations situées des trois fichiers de la page. La spec n'est pas
// soumise à la grammaire : elle s'exécute confinée, dans l'oracle.
export function pageGrammarFindings(options) {
    // Fermé en cas d'échec : une erreur interne de l'accepteur refuse la page.
    try {
        return grammarFindings(options);
    } catch (error) {
        return [
            Object.freeze({
                code: 'T0',
                file: 'page.component.ts',
                start: 0,
                end: 0,
                line: 1,
                column: 1,
                message: `acceptor failure: ${String(error?.message ?? error).split('\n')[0]}`,
            }),
        ];
    }
}

function grammarFindings({ files, workOrder, pageContract }) {
    const context = grammarContext(workOrder, pageContract);
    const found = [];
    // X5 C6 N5-1, garde (a) : un identifiant du contrat dans la famille
    // réservée des racines de branche est refusé, par son nom.
    for (const id of context.reserved)
        found.push(
            Object.freeze({
                code: 'LE2',
                file: 'page.component.html',
                start: 0,
                end: 0,
                line: 1,
                column: 1,
                message: `PAGE_READ_BRANCH_ID_RESERVED: contract id ${JSON.stringify(id)} takes the reserved branch id form`,
            })
        );
    let facts;
    if (typeof files['page.component.ts'] === 'string') {
        const grammar = typescriptGrammar({
            text: files['page.component.ts'],
            context,
        });
        found.push(...grammar.found);
        if (context.reads)
            found.push(...readClassViolations(grammar, context.reads));
        facts = templateFacts(grammar);
    }
    if (typeof files['page.component.html'] === 'string') {
        const template = templateGrammar({
            text: files['page.component.html'],
            facts: facts ?? {
                text: '',
                fields: new Map(),
                methods: new Map(),
                decoratorImports: [],
                host: [],
            },
            contract: { ids: context.ids, routes: context.routes },
        });
        found.push(...template.found);
        if (context.reads && template.parsedNodes)
            found.push(
                ...readTemplateViolations(
                    'page.component.html',
                    files['page.component.html'],
                    template.parsedNodes,
                    context.reads
                )
            );
    }
    if (typeof files['page.component.scss'] === 'string')
        found.push(
            ...styleGrammar({ text: files['page.component.scss'] }).found
        );
    return found;
}

export function pageGrammarViolations(options) {
    return pageGrammarFindings(options).map(formatViolation);
}
