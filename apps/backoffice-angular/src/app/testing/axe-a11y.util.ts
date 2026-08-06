import * as axe from 'axe-core';

/**
 * Exécute axe-core sur un élément déjà rendu (`fixture.nativeElement`) et
 * échoue le test — message détaillé, une ligne par violation — si au moins
 * une règle est enfreinte.
 *
 * Audit M-9 (revue finale 2026-08-02) : premier outillage a11y du dépôt.
 * `@axe-core/playwright` a été délibérément écarté — Playwright n'est pas
 * installé (ADR-0008, jamais tranché, cf. chantier I-8/L) et l'installer
 * uniquement pour ce test aurait été une décision d'outillage e2e complète,
 * hors mandat d'un audit seul. `axe-core` nu, exécuté contre le DOM déjà
 * rendu par `TestBed.createComponent()` + `fixture.detectChanges()` sous
 * jsdom (déjà la dépendance de test de ce dépôt, `package.json`), couvre la
 * même surface structurelle sans nouvelle décision d'infrastructure.
 *
 * **Limite honnête, pas contournée** : jsdom n'implémente pas de moteur de
 * rendu/CSS réel — `getComputedStyle` n'y reflète jamais la mise en page
 * peinte. Les règles qui en dépendent (`color-contrast` en premier lieu)
 * sont désactivées explicitement ci-dessous plutôt que laissées tourner
 * pour produire un faux « 0 violation » qui ne prouverait rien. Ce test
 * couvre donc la correction structurelle/sémantique (labels de formulaire,
 * rôles ARIA, structure de tableau/liste, hiérarchie de titres, texte
 * accessible des boutons) — pas le rendu visuel. Une couverture
 * `color-contrast` réelle suppose un vrai moteur de rendu (Playwright/
 * navigateur headless), explicitement hors de portée ici (cf. docstring
 * ci-dessus).
 */
export async function expectNoAxeViolations(container: Element): Promise<void> {
    const results = await axe.run(container, {
        rules: {
            'color-contrast': { enabled: false },
        },
    });

    if (results.violations.length > 0) {
        const detail = results.violations
            .map(
                (v) =>
                    `- [${v.impact ?? 'inconnu'}] ${v.id} : ${v.help} ` +
                    `(${v.nodes.length} nœud(s) — ${v.helpUrl})`
            )
            .join('\n');
        throw new Error(
            `${results.violations.length} violation(s) a11y détectée(s) par axe-core :\n${detail}`
        );
    }
}
