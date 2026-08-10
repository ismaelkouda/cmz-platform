import type { AxeResults, Result, RunOptions } from 'axe-core';
import * as axe from 'axe-core';

/**
 * Impacts axe qui font **échouer** la CI (T12-8 / M-9 / pratique Big Tech).
 *
 * - Meta / Google / W3C ACT : bloquer le pipeline sur **critical** + **serious**
 *   (violations bloquantes WCAG pour utilisateurs de lecteurs d'écran /
 *   navigation clavier).
 * - `moderate` / `minor` : signalés en détail (message d'avertissement) mais
 *   non bloquants par défaut — éviter le faux « gate art » sur règles
 *   subjectives en jsdom. Forçables via options pour runs manuels.
 *
 * Contraste (`color-contrast`) est **désactivé** sous jsdom (pas de paint
 * CSS réel) — laisser la règle active donnerait un faux 0 violation ou du
 * bruit non reproductible. Couverture contraste réelle = Playwright
 * (T12-6) + moteur navigateur.
 */
export type AxeBlockingImpact = 'critical' | 'serious' | 'moderate' | 'minor';

export const DEFAULT_AXE_BLOCKING_IMPACTS: readonly AxeBlockingImpact[] = [
    'critical',
    'serious',
] as const;

/** Périmètre WCAG 2.0 / 2.1 A+AA — surface CI standard (axe tags). */
export const AXE_WCAG_TAGS = [
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
] as const;

/**
 * Règles hors-cible en test de **fragment** de composant sous jsdom :
 * elles concernent le document HTML complet (`<html lang>`, `<title>`,
 * landmark unique) jamais fourni par `TestBed.createComponent`.
 * Les désactiver explicitement évite un faux positif « page incomplete »
 * sans baisser la barre sémantique sur le fragment métier.
 */
export const AXE_JSDOM_FRAGMENT_DISABLED_RULES = [
    'color-contrast',
    'document-title',
    'html-has-lang',
    'landmark-one-main',
    'page-has-heading-one',
    'region',
] as const;

export interface ExpectNoAxeViolationsOptions {
    /**
     * Impacts qui échouent le test. Défaut : critical + serious (T12-8).
     * Passer `['critical','serious','moderate','minor']` pour gate « full »
     * (proche profil angular `accessibility.axe` — uniquement quand le DOM
     * est un document complet + moteur navigateur).
     */
    readonly blockingImpacts?: readonly AxeBlockingImpact[];
    /** Règles désactivées en plus du set fragment jsdom. */
    readonly disableRules?: readonly string[];
    /**
     * Si true, les violations non-bloquantes (moderate/minor par défaut)
     * sont listées dans l'Error message des bloquantes, et loguées en
     * `console.warn` même en succès — traçabilité CI. Défaut true.
     */
    readonly reportNonBlocking?: boolean;
}

export interface AxeGateResult {
    readonly blocking: Result[];
    readonly nonBlocking: Result[];
    readonly raw: AxeResults;
}

function buildRunOptions(
    options: ExpectNoAxeViolationsOptions = {}
): RunOptions {
    const disable = new Set<string>([
        ...AXE_JSDOM_FRAGMENT_DISABLED_RULES,
        ...(options.disableRules ?? []),
    ]);
    const rules: NonNullable<RunOptions['rules']> = {};
    for (const id of disable) {
        rules[id] = { enabled: false };
    }
    return {
        runOnly: {
            type: 'tag',
            values: [...AXE_WCAG_TAGS],
        },
        rules,
    };
}

/**
 * Partitionne les violations axe selon les impacts bloquants.
 * Exporté pour tests unitaires de la politique de gate (sans Angular).
 */
export function partitionAxeViolations(
    violations: Result[],
    blockingImpacts: readonly AxeBlockingImpact[] = DEFAULT_AXE_BLOCKING_IMPACTS
): { blocking: Result[]; nonBlocking: Result[] } {
    const gate = new Set(blockingImpacts);
    const blocking: Result[] = [];
    const nonBlocking: Result[] = [];
    for (const v of violations) {
        const impact = (v.impact ?? 'minor') as AxeBlockingImpact;
        if (gate.has(impact)) {
            blocking.push(v);
        } else {
            nonBlocking.push(v);
        }
    }
    return { blocking, nonBlocking };
}

export function formatAxeViolations(violations: Result[]): string {
    return violations
        .map((v) => {
            const nodes = v.nodes
                .slice(0, 5)
                .map((n) => `    · ${n.target.join(' ')}`)
                .join('\n');
            const more =
                v.nodes.length > 5
                    ? `\n    · … +${v.nodes.length - 5} nœud(s)`
                    : '';
            return (
                `- [${v.impact ?? 'inconnu'}] ${v.id} : ${v.help} ` +
                `(${v.nodes.length} nœud(s))\n` +
                `  ${v.helpUrl}\n` +
                `${nodes}${more}`
            );
        })
        .join('\n');
}

/**
 * Exécute axe-core sur un élément déjà rendu (`fixture.nativeElement`) et
 * applique la **politique de gate** Big Tech (T12-8).
 *
 * @throws Error si ≥1 violation d'impact bloquant (défaut critical|serious)
 */
export async function runAxeGate(
    container: Element,
    options: ExpectNoAxeViolationsOptions = {}
): Promise<AxeGateResult> {
    if (!(container instanceof Element)) {
        throw new TypeError(
            'runAxeGate: container doit être un Element DOM (fixture.nativeElement).'
        );
    }
    const blockingImpacts =
        options.blockingImpacts ?? DEFAULT_AXE_BLOCKING_IMPACTS;
    const raw = await axe.run(container, buildRunOptions(options));
    const { blocking, nonBlocking } = partitionAxeViolations(
        raw.violations,
        blockingImpacts
    );
    return { blocking, nonBlocking, raw };
}

/**
 * Gate a11y page / composant — API stable pour les specs `*.a11y.spec.ts`.
 */
export async function expectNoAxeViolations(
    container: Element,
    options: ExpectNoAxeViolationsOptions = {}
): Promise<void> {
    const reportNonBlocking = options.reportNonBlocking ?? true;
    const { blocking, nonBlocking } = await runAxeGate(container, options);

    if (reportNonBlocking && nonBlocking.length > 0) {
        console.warn(
            `[a11y] ${nonBlocking.length} violation(s) non bloquante(s) ` +
                `(impact hors gate ${JSON.stringify(
                    options.blockingImpacts ?? DEFAULT_AXE_BLOCKING_IMPACTS
                )}) :\n${formatAxeViolations(nonBlocking)}`
        );
    }

    if (blocking.length > 0) {
        const soft =
            reportNonBlocking && nonBlocking.length > 0
                ? `\n\n(+ ${nonBlocking.length} non bloquante(s) — voir ci-dessus / formatAxe)`
                : '';
        throw new Error(
            `${blocking.length} violation(s) a11y BLOQUANTES ` +
                `(impact ∈ ${JSON.stringify(
                    options.blockingImpacts ?? DEFAULT_AXE_BLOCKING_IMPACTS
                )}) détectée(s) par axe-core :\n` +
                `${formatAxeViolations(blocking)}${soft}`
        );
    }
}
