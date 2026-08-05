# Outils SEOS vendorés — P0-11 / M-5 / M-6

> **Constat qu'ils corrigent** : trois audits successifs
> (`audit-workspace-2026-07-27.md`, `-08-02.md`, `-08-02-revue-finale.md`) ont
> noté `find . -iname "check-pattern*"` → **0 résultat** dans ce dépôt. Ce
> n'était pas un oubli d'implémentation : ces outils n'ont **jamais existé
> ici**, ils vivent dans le dépôt legacy (`cmz-backoffice-frontend/seos/`),
> auquel l'exécution de cet audit n'avait pas accès jusqu'à ce que l'accès soit
> explicitement accordé. Vendorés ici le 2026-08-03, dès que l'accès a été rendu
> possible.

## Provenance — copie exacte, pas une réécriture

Copiés depuis `cmz-backoffice-frontend/seos/tools/` au commit épinglé par
[`legacy.lock.json`](../../legacy.lock.json)
(`cb15bf80fa072e12e9d4fce4b9236abe6ac78058`, 2026-07-31) — le même SHA que celui
déjà figé pour la reproductibilité du corpus (ADR-0014). Adaptation initiale :
extension `.js` → `.mjs` (ESM sans `package.json` local / projet Nx fantôme).

**Évolution monorepo (OPS-1 / CI weight)** : `generate-reference-module` a été
découpé en modules par couche sous `generate-reference-module/` pour tenir le
plafond de 800 lignes (`tools/check-file-weight.mjs --all`). Contrat : **sortie
du générateur inchangée** (oracle golden) — toute évolution sémantique du
générateur reste à porter d’abord dans le dépôt legacy puis re-vendorée ; le
découpage ici est structurel pour le monorepo, pas un fork de logique.

| Fichier vendoré                                                     | Rôle                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check-pattern.mjs`                                                 | Vérifie la **présence** des fichiers du cœur canonique d'un pattern (fait structurel, jamais le contenu)                                                                                                                                                                                                                         |
| `check-semantics.mjs`                                               | Vérifie le **contenu** de certains fichiers contre 9 règles mécaniques issues de bugs réels observés (`defer()`, clés i18n, handlers `UiFeedbackService`, `Validators.required` vs validateur domaine, artefacts orphelins, cérémonie VO/Entity, nommage `-select-response-api.dto.ts`, chaînage VO→Entity, résidus `console.*`) |
| `generate-reference-module.mjs` + `generate-reference-module/*.mjs` | Génère le module de référence "resources" (pattern `crud-entity`) à plat — CLI d’entrée + écritures par couche (domain / application / presentation / di+infra). Découpé **sans changer la sortie** (vérifié par golden `diff -rq` vs monolithe 2051 l.) pour le plafond CI `check:weight --all` (800 l.)                        |
| `patterns/crud-entity.pattern.json`                                 | Schéma canonique (106 `core_files`, 23 versions de corrections documentées) — schéma **legacy**, chemins `presentation/pages/...`                                                                                                                                                                                                |
| `patterns/action-request.pattern.json`                              | Schéma canonique de la famille `action-request` (legacy)                                                                                                                                                                                                                                                                         |

**Non vendoré, volontairement** : le compilateur DSL (`compile-dsl.js`,
`extract-pattern.js`, `dsl/`) — hors périmètre de P0-11, qui ne cite que
`check-pattern*`/`check-semantics*`. À vendorer séparément si un besoin réel
apparaît.

## Portée réelle — legacy, pas encore Nx

**Ces deux checkers valident la structure `presentation/pages/<module>/...` du
dépôt legacy, pas la structure `libs/<module>/{domain,data,application,ui}` de
ce monorepo.** Ce n'est pas une lacune de portage oubliée : c'est le design
documenté par [`tools/seos-adapter/README.md`](../seos-adapter/README.md) —
`check-pattern.js` s'exécute **avant** la distribution en libs Nx, sur la sortie
**plate** du générateur, précisément pour ne jamais avoir à réimplémenter le
schéma de vérification pour la forme Nx. Les schémas **déjà adaptés** à la
structure Nx (placeholder `{VOLET}`, chemins `domain/entities/{VOLET}/...`)
vivent séparément dans
[`docs/architecture/patterns/`](../../docs/architecture/patterns/)
(`workflow-action.pattern.json`, `read-only-view.pattern.json`) — ce sont des
schémas **re-dérivés indépendamment** pour ce monorepo, pas produits par ces
outils vendorés.

## Auto-test de bout en bout — exécuté et vérifié le 2026-08-03

```bash
rm -rf /tmp/seos-reference
node tools/seos/generate-reference-module.mjs /tmp/seos-reference
# → Module crud-entity "resources" (module=seos-reference) genere sous /tmp/seos-reference

node tools/seos/check-pattern.mjs /tmp/seos-reference resources \
  --schema tools/seos/patterns/crud-entity.pattern.json
# → Conformite : 106/106 fichiers du coeur presents (100.0%)
# → Aucun fichier du coeur manquant.

node tools/seos-adapter/adapt.mjs /tmp/seos-reference seos-reference-check --dry-run
# → Fichiers traités : 107 / 107
# → 5 libs (@cmz/seos-reference-check-{domain,data,application,ui,feature})

node tools/seos/check-semantics.mjs /tmp/seos-reference resources
# → 7/9 règles OK ; 2 règles ("cles i18n", "DomainError -> handler") se
#   dégradent proprement ("impossible de verifier, fr.json introuvable" /
#   "Racine src/ introuvable") au lieu de planter, car le module généré est
#   un module isolé, pas un module vivant dans une app complète avec son
#   src/ — comportement attendu, pas un échec de l'outil.
```

**Piège de nommage documenté, retrouvé et confirmé pendant ce vendoring** : le
dossier de sortie du générateur **doit** s'appeler exactement `seos-reference`
(pas `seos-reference-test`, pas un nom arbitraire) — le nom du module est dérivé
du `basename()` du chemin par `check-pattern.mjs`, et le générateur, lui, nomme
les fichiers de niveau module d'après `seos-reference` en dur. Un nom de dossier
différent produit 3 « fichiers manquants » qui n'en sont pas — déjà documenté
dans `tools/seos-adapter/README.md`, reproduit ici pour confirmer qu'il tient
toujours.

## Ce que ce vendoring ne résout pas (honnête, pas de faux acquis)

- **M-6 (exécution en CI)** n'est fait qu'à moitié : l'auto-test ci-dessus
  prouve que les outils _fonctionnent_, mais aucun job CI ne les exécute encore
  — la conformité aux contrats reste, comme le note la revue finale, une revue
  humaine ponctuelle, pas un gate automatique. Ajouter un job n'a de sens que si
  des modules réels de **ce** dépôt (pas seulement le module de référence isolé)
  sont vérifiés — ce qui suppose d'écrire les schémas Nx-shaped équivalents
  (déjà commencé pour `workflow-action`/ `read-only-view`, absent pour
  `crud-entity`/`action-request` malgré 11+7 modules qui suivent ces patterns).
- **I-7** (audit `permissionGuard` ↔ permissions legacy) est un chantier séparé,
  traité indépendamment (voir §7 de l'audit principal) — ces outils ne le
  couvrent pas, ils vérifient la structure de fichiers, pas la logique de
  permissions.
