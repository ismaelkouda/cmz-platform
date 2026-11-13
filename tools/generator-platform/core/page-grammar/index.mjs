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
import { ONLINE_ACCESS, readAccess } from '../read-access.mjs';

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

// Contexte de la grammaire, tiré du bon de travail et du contrat de page.
export function grammarContext(workOrder, pageContract) {
    const page = pageContract.page;
    return {
        compositionModule: workOrder.composition.module,
        selector: workOrder.grammar.selector,
        api: new Map(
            workOrder.composition.api.map((entry) => [entry.path, entry.kind])
        ),
        ids: new Set(
            [
                ...page.states,
                ...page.controls,
                ...page.actions,
                ...page.data_bindings,
                ...page.regions,
                ...page.regions.flatMap((region) => region.elements),
            ].map((entry) => entry.id)
        ),
        routes: new Set(workOrder.grammar.routes),
        // X5 C5b : règles d'une page à lectures, seulement si le bon de
        // travail porte `read_states`. Textes d'absence : contrat de page
        // scellé (A3).
        reads: workOrder.read_states
            ? {
                  online: ONLINE_ACCESS,
                  reads: workOrder.read_states.reads.map(readAccess),
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
