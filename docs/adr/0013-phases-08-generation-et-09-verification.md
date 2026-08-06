# ADR-0013 — Phase 08 = génération depuis patterns ; Phase 09 = vérification fonctionnelle

- **Statut :** Accepted
- **Date :** 2026-08-02

## Contexte

Quatre documents donnaient deux définitions incompatibles de la « Phase 08 » :

| Document                     | Phase 08 =                                             |
| ---------------------------- | ------------------------------------------------------ |
| `plan-d-execution.md`        | Vérification fonctionnelle vs l'application source     |
| `feuille-de-route.md`        | Vérification fonctionnelle — « non démarrée »          |
| `generation-from-patterns.md`| Génération depuis patterns — zéro code métier manuel   |
| `LLM_CONTEXT.md`             | Génération depuis patterns — phase active              |

**Générer** sous contrat d'archétype et **vérifier** l'équivalence comportementale
avec le legacy sont deux activités distinctes, avec des critères de sortie
disjoints. Les fusionner sous un même numéro de phase produit des docs
contradictoires et fait disparaître le gate fonctionnel sans décision écrite
(audit workspace 2026-08-02, P0-4).

La Phase 07 (reconstruction assistée) est clôturée
([A-2026-08-01-01](../seos/Assumptions-Register.md#a-2026-08-01-01--clôture-famille-read-only-view-4-4--fin-phase-07)).
La suite confirmée est la boucle Generate-Verify-Repair industrialisée.

## Options envisagées

### Option A — Phase 08 = uniquement vérification fonctionnelle

- Avantages : conserve le plan d'exécution historique.
- Inconvénients : contredit la spec et le `LLM_CONTEXT` déjà publiés ; retarde
  le test décisif de la thèse SEOS (génération sans code métier manuel).

### Option B — Phase 08 = uniquement génération ; abandon de la vérif. fctnelle

- Avantages : aligne la doc sur la trajectoire confirmée.
- Inconvénients : supprime le seul gate d'équivalence comportementale vs legacy
  sans remplacement — inacceptable pour le livrable de niveau 3 (corpus).

### Option C — Deux phases distinctes (08 génération, 09 vérification)

- Avantages : chaque activité a un numéro, des critères de sortie et un ordre
  clair ; rien n'est abandonné sans ADR.
- Inconvénients : renumérote le plan historique (une section à déplacer).

## Décision

**Option C.**

1. **Phase 08 — Génération depuis patterns** : concevoir et livrer modules /
   applications via pattern JSON + chaînes corpus + boucle
   Generate-Verify-Repair, sans saisie manuelle du TypeScript métier. Spec :
   [`generation-from-patterns.md`](../architecture/generation-from-patterns.md).
2. **Phase 09 — Vérification fonctionnelle** : reprendre le contenu historique
   de l'ancienne Phase 08 (`plan-d-execution.md` § vérification) — structurel,
   parcours métier vs legacy, non-régression e2e (Playwright).

Ordre non négociable : **ne pas industrialiser la génération (pilotes Phase 08)
sous un oracle encore troué** — chantier A (oracle) préalable ; Phase 09
s'appuie aussi sur le chantier C (tests comportementaux).

## Justification

- La confirmation produit (2026-08-01) ouvre explicitement la génération zéro
  code métier manuel après clôture des familles IR 4/4.
- L'audit P0-4 exige un arbitrage écrit : deux définitions actives = dette
  documentaire qui revient (récidive du constat #1 de l'audit 2026-07-27).
- Conserver la vérification fonctionnelle en Phase 09 évite de perdre le gate
  d'équivalence legacy sans le remplacer.

## Conséquences

### Positives

- Une seule définition de Phase 08 dans tous les documents d'entrée.
- La vérification vs legacy reste planifiée et traçable (Phase 09).
- Alignement ADR-0010 / thèse SEOS §1.2 / corpus Méthode 2.

### Négatives / dette acceptée

- `plan-d-execution.md` et `feuille-de-route.md` doivent être mis à jour
  (propagation E-3) — correction vivante, pas journal append-only.
- La Phase 09 n'a pas encore de critères de sortie détaillés au-delà du plan
  historique ; à préciser avant démarrage.

### Points à réévaluer

- Si un pilote Phase 08 échoue faute d'oracle comportemental, avancer le
  chantier C avant d'élargir la génération (cf. audit H-1).

## Références

- Audit workspace 2026-08-02 — P0-4, chantier E-1/E-2
- [ADR-0010](./0010-flux-de-generation-assistee-par-ia.md)
- [ADR-0009](./0009-reconstruction-pilotee-par-patterns.md)
- [`generation-from-patterns.md`](../architecture/generation-from-patterns.md)
- [A-2026-08-01-01](../seos/Assumptions-Register.md)
