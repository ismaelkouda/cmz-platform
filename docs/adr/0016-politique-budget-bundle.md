# ADR-0016 — Politique de budget de bundle (rehaussement interdit sans justification écrite)

- **Statut :** Accepted
- **Date :** 2026-08-02

## Contexte

Le build production de `backoffice-angular` applique des budgets Angular
(`type: initial`, `anyComponentStyle`) dans
[`apps/backoffice-angular/project.json`](../../apps/backoffice-angular/project.json).
Un commit a déjà relevé le plafond initial à 2 Mo pour débloquer le Tier 2, puis
les seuils sont revenus à `900kb` / `1mb` — sans trace écrite hors message de
commit (audit P2-21 / E-11).

Par ailleurs les docs citaient trois chiffres de bundle incompatibles
(221 / 856 / 861 kB). La métrique canonique est désormais
[`bundle-metrics.json`](../../apps/backoffice-angular/bundle-metrics.json)
(audit E-8) : **Initial total raw** mesuré après
`bunx nx run backoffice-angular:build:production`.

Relever un budget pour faire passer la CI sans arbitrage transforme le gate en
décoration.

## Options envisagées

### Option A — Budgets libres, ajustés « pour que ça passe »

- Avantages : vélocité courte.
- Inconvénients : dette silencieuse ; aucune mémoire institutionnelle ; récidive
  du va-et-vient 2 Mo ↔ 1 Mo.

### Option B — Gel absolu des plafonds (jamais de hausse)

- Avantages : discipline maximale.
- Inconvénients : bloque des ajouts légitimes (nouvelle famille UI, i18n, etc.)
  sans voie de sortie documentée.

### Option C — Plafonds versionnés + hausse seulement via ADR

- Avantages : le gate reste opposable ; toute hausse est une décision d'archi
  traçable ; la baisse ou l'optimisation restent libres.
- Inconvénients : friction administrative pour un changement rare.

## Décision

**Option C.**

1. **Source exécutable des plafonds :**
   `apps/backoffice-angular/project.json` →
   `targets.build.configurations.production.budgets`.
2. **Source exécutable de la mesure :**
   `apps/backoffice-angular/bundle-metrics.json` (régénérée par
   `bun run bundle:record` / `bun run bundle:metrics`). Métrique citée dans les
   docs = `initial_raw_kb` uniquement.
3. **Plafonds en vigueur (Accepted 2026-08-02) :**

   | Budget              | maximumWarning | maximumError |
   | ------------------- | -------------- | ------------ |
   | `initial`           | `900kb`        | `1mb`        |
   | `anyComponentStyle` | `4kb`          | `8kb`        |

4. **Rehaussement interdit sans justification écrite.** Modifier à la hausse
   `maximumWarning` ou `maximumError` exige **avant merge** :
   - un **ADR** (nouvel ADR, ou supersession de celui-ci) qui fixe : ancien
     plafond, nouveau plafond, cause (dépendance, feature, dette acceptée),
     plan de réduction ou échéance de revue ;
   - la mise à jour de `bundle-metrics.json` + docs générés
     (`bun run bundle:metrics && bun run generate:status`).
   Un message de commit ou un commentaire YAML **ne suffisent pas**.
5. **Baisser** un plafond ou réduire le bundle (lazy-load, tree-shake) ne
   requiert pas de nouvel ADR — seulement CI verte et métriques à jour.
6. **Chunks lazy** (ex. ExcelJS ~948 kB) sont **hors** budget `initial` par
   design ; les gonfler n'autorise pas à relever `initial` sans ADR.

## Justification

- Le budget est un contrat d'architecture, pas un curseur de CI.
- L'historique 2 Mo sans ADR montre que le message de commit est insuffisant.
- E-8 a fermé la dérive des chiffres ; E-11 ferme la dérive des plafonds.

## Conséquences

### Positives

- Toute hausse de budget est reviewable et indexée (`docs/adr/`).
- Nightly / `docs-freshness` gardent mesure et docs alignées (E-5 / E-8).
- Clarifie la frontière initial vs lazy pour les agents et contributeurs.

### Négatives / dette acceptée

- Friction pour une hausse légitime (volontaire).
- Les plafonds actuels (1 mb error) laissent ~140 kB de marge au-dessus de
  861 kB mesurés — marge à surveiller, pas à consommer par défaut.

### Points à réévaluer

- Si le bundle initial dépasse durablement `maximumWarning` sans voie de
  réduction sous 90 jours : nouvel ADR (hausse justifiée **ou** plan de coupe
  obligatoire).
- Si Angular change l'unité / la définition d'« initial » : mettre à jour
  `record-bundle-metrics.mjs` et cet ADR.

## Références

- Audit workspace 2026-08-02 — P2-21, E-8, E-11
- [`apps/backoffice-angular/project.json`](../../apps/backoffice-angular/project.json)
- [`apps/backoffice-angular/bundle-metrics.json`](../../apps/backoffice-angular/bundle-metrics.json)
- [`tools/record-bundle-metrics.mjs`](../../tools/record-bundle-metrics.mjs)
- [ADR-0005](./0005-versions-du-socle.md) — versions / catalog
