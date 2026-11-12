// CI #389, « T2 décodé » : T2 porte aussi sur les valeurs DÉCODÉES du gabarit.
// L'analyse de la source brute (template.mjs) ne voit pas ce qu'Angular décode
// ensuite : entités HTML dans un texte ou un attribut statique (`&#x202E;`,
// `&#8203;`), échappements `\u…` dans une chaîne d'expression. Ce module
// parcourt l'arbre R3 et applique les mêmes classes refusées à :
// - la valeur de chaque texte (TmplAstText) et de chaque attribut statique ;
// - chaque littéral de chaîne d'expression, interpolations comprises.
// La barre oblique inverse est refusée dans une chaîne d'expression du gabarit,
// comme STRING_TEXT le fait en TypeScript.
import * as angular from '@angular/compiler';

import { REFUSED_CHARACTER_CLASSES, violation } from './text.mjs';

function refusedIn(value) {
    for (const character of value)
        for (const [label, pattern] of Object.entries(
            REFUSED_CHARACTER_CLASSES
        ))
            if (pattern.test(character))
                return `U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} (${label})`;
    return undefined;
}

export function decodedValueViolations(file, text, nodes) {
    const found = [];
    const check = (value, start, end, where) => {
        const refused = refusedIn(value);
        if (refused)
            found.push(
                violation(
                    'T2',
                    file,
                    text,
                    start,
                    end,
                    `decoded ${where} carries an invisible or control character ${refused}`
                )
            );
    };
    class Literals extends angular.RecursiveAstVisitor {
        visitLiteralPrimitive(ast, context) {
            if (typeof ast.value === 'string') {
                const { start, end } = ast.sourceSpan;
                check(ast.value, start, end, 'string literal');
                if (text.slice(start, end).includes('\\'))
                    found.push(
                        violation(
                            'T2',
                            file,
                            text,
                            start,
                            end,
                            'template string literal contains a backslash'
                        )
                    );
            }
            return super.visitLiteralPrimitive(ast, context);
        }

        visitTemplateLiteralElement(ast, context) {
            const { start, end } = ast.sourceSpan;
            check(ast.text, start, end, 'template literal');
            if (text.slice(start, end).includes('\\'))
                found.push(
                    violation(
                        'T2',
                        file,
                        text,
                        start,
                        end,
                        'template string literal contains a backslash'
                    )
                );
            return super.visitTemplateLiteralElement(ast, context);
        }
    }
    const literals = new Literals();
    const expression = (value) => {
        if (!value) return;
        const ast = value instanceof angular.ASTWithSource ? value.ast : value;
        ast.visit(literals);
    };
    const span = (node) => [
        node.sourceSpan.start.offset,
        node.sourceSpan.end.offset,
    ];
    class Values extends angular.TmplAstRecursiveVisitor {
        visitText(node) {
            check(node.value, ...span(node), 'text');
        }

        visitTextAttribute(node) {
            // La valeur seule, plus précise que l'attribut entier.
            const located = node.valueSpan ?? node.sourceSpan;
            check(
                node.value,
                located.start.offset,
                located.end.offset,
                'attribute'
            );
        }

        visitBoundText(node) {
            expression(node.value);
        }

        visitBoundAttribute(node) {
            expression(node.value);
        }

        visitBoundEvent(node) {
            expression(node.handler);
        }

        visitIfBlockBranch(node) {
            expression(node.expression);
            super.visitIfBlockBranch(node);
        }

        visitSwitchBlock(node) {
            expression(node.expression);
            super.visitSwitchBlock(node);
        }

        visitSwitchBlockCase(node) {
            expression(node.expression);
            super.visitSwitchBlockCase(node);
        }

        visitForLoopBlock(node) {
            expression(node.expression);
            expression(node.trackBy);
            super.visitForLoopBlock(node);
        }

        visitLetDeclaration(node) {
            expression(node.value);
        }
    }
    angular.tmplAstVisitAll(new Values(), nodes);
    return found;
}
