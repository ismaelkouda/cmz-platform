# Audit workspace — revue senior (2026-07-27)

- **Périmètre :** tout le monorepo — nommage, contenu, séparation des
  responsabilités, communication inter-couches, cohérence doc ↔ code.
- **Méthode :** inspection directe (lecture de fichiers, `grep` de tous les
  imports cross-couches, `git log` sur les docs racine), pas une relecture des
  intentions déclarées. Chaque constat ci-dessous est vérifié sur le code réel,
  pas déduit de la documentation.
- **Ce que ce document n'est pas :** un remplacement des verdicts déjà écrits
  dans [`archetypes/README.md`](./archetypes/README.md) (hypothèse
  archétype-contrat) ou des plans `module-*.md`. Il les complète en regardant le
  workspace comme un tout, au-delà du module en cours.

## Synthèse

Le socle est solide là où il a été explicitement conçu : boundaries Nx (scope ×
type) **réellement** respectées (0 violation trouvée en grep direct,
indépendamment de ce qu'affirme la config), séparation wire/domain appliquée y
compris dans le module de référence, conventions de nommage suivies à la lettre
sur les 3 modules métier.

La dette est ailleurs, et elle est réelle : la documentation d'entrée du repo
raconte un état qui n'existe plus depuis 5 jours ; la stratégie de tests actée
par ADR n'a jamais été opérationnalisée dans aucune des 24 phases exécutées à ce
jour (3 modules × 8 phases) ; et surtout, la validation `tsc`/`eslint`/`ngc` —
présentée comme le garde-fou de la méthode archétype-contrat — a un angle mort
démontré : du code mort, syntaxiquement valide et bien typé, a traversé une
migration de framework (Reactive Forms → Signal Forms) sans être détecté, dans
**deux modules différents**, dont un construit après l'adoption de la méthode
archétype-contrat.

## P0 — état trompeur pour quiconque arrive sur le repo

### 1. Documentation racine désynchronisée du code depuis ~5 jours

`README.md`, `docs/architecture/etat-du-socle.md`,
`docs/architecture/feuille-de-route.md`, `docs/architecture/plan-d-execution.md`
et `docs/architecture/strategie-de-reconstruction.md` datent tous du 21-22/07
(`git log` confirmé) et affirment : _« libs/ vide, aucun package applicatif »_,
roadmap Phase 02→08 pilotée par génération SEOS sur 53 entités.

Réalité au 27/07 : 3 modules métier complets ou en cours
(`administrative-infrastructure`, `administrative-boundary`, `authentication`)

- kernel `shared/*` + `core`, soit **678 fichiers `.ts`** dans `libs/` +
  `apps/`. La méthode a d'ailleurs changé en route : abandon de la génération
  SEOS au profit de l'archétype-contrat (manuel, validé par
  `tsc`/`ngc`/`eslint`) — un pivot de fond, documenté dans
  `module-administrative-boundary.md` et `archetypes/README.md`, mais **jamais
  répercuté** dans les 5 documents d'entrée cités plus haut.

**Impact :** quiconque lit le README ou `etat-du-socle.md` en premier — un
nouvel arrivant, un futur moi sans mémoire de session — se fait une idée fausse
de l'état du projet et de la méthode en vigueur.

**Recommandation :** soit ces 5 docs sont mis à jour à chaque module livré
(comme le sont déjà les `module-*.md`), soit ils sont explicitement marqués
comme figés à la Phase 01/04 et remplacés en position d'entrée par un pointeur
vers l'état réel.

### 2. Couverture de tests : 0 sur 678 fichiers source

[ADR-0008](../adr/0008-outillage-de-tests.md) acte Vitest (unitaire) +
Playwright (e2e) comme décision ferme, avec la migration des tests « à prévoir
dans la charge de la Phase 07 ». Or :

- `find libs apps -name "*.spec.ts" -o -name "*.test.ts"` → **1 seul fichier**,
  `apps/backoffice-angular/src/app/app.spec.ts` — le scaffold par défaut de
  `ng generate`, jamais complété.
- Aucune des 24 phases exécutées à ce jour (3 modules × 8 phases, plus les
  slices du kernel) ne contient d'étape « écrire les tests ». La validation de
  chaque phase repose exclusivement sur `tsc --noEmit`, `eslint`,
  `ngc --strictTemplates`.

Ce n'est pas neutre : ces trois outils vérifient des **types et une syntaxe**,
jamais un **comportement**. Le constat #3 ci-dessous montre concrètement ce que
cet angle mort laisse passer.

**Recommandation :** soit une phase dédiée « tests » est ajoutée au gabarit de
module (avant la phase 8 de chaque module suivant), soit la dette est actée
explicitement dans `etat-du-socle.md` comme un choix assumé et daté, plutôt que
silencieuse.

## P1 — dette réelle, non bloquante

### 3. Code mort qui a survécu à la migration Signal Forms, invisible aux 3 gates

`libs/shared/ui/src/lib/helpers/form-errors.helper.ts` expose
`getControlError(control: FormControl, messages)` — une fonction qui opère sur
`FormControl` (Reactive Forms). Le design-system est passé aux Signal Forms le
23/07 (`cmz-field` lit `field().errors()` directement, sans table de messages
par clé). Cette fonction est donc structurellement incompatible avec tout
composant construit depuis ce pivot.

Elle est pourtant ré-exportée « pour permettre une composition/override future »
(commentaire du fichier) dans **deux** modules :

- `libs/administrative-infrastructure/ui/src/lib/helpers/form-errors.helper.ts`
- `libs/administrative-boundary/ui/src/lib/helpers/form-errors.helper.ts`

`grep` sur `getControlError` dans tout `libs/` : 3 occurrences, **toutes des
ré-exports**, zéro appel réel. Idem pour
`INFRASTRUCTURE_FORM_KEYS`/`*_FORM_ERROR_MESSAGES` (admin-infra) : définis,
barrel-exportés, jamais consommés par les composants `list`/`form` du module.

Le point important n'est pas le fichier en soi, mais ce qu'il démontre :
`administrative-boundary` a été construit **après** l'adoption de la méthode
archétype-contrat et validé phase par phase par `tsc`/`eslint`/`ngc` — et ce
code mort y a été recopié sans qu'aucun des trois outils ne s'en aperçoive,
puisqu'un export non consommé n'est une erreur pour aucun des trois. Seul un
outil dead-code (`ts-prune`, `knip`) ou une lecture humaine l'attrape.

**Recommandation :** supprimer les 2 re-exports + le fichier shared-ui (ou le
garder seul, sans duplication, s'il sert vraiment ailleurs — vérifié : non).
Ajouter `knip` ou équivalent aux garde-fous `pre-commit`/CI si la taille du repo
le justifie bientôt.

### 4. Donnée mappée puis jetée silencieusement (`InfrastructureEntity`)

`InfrastructureProps`/`InfrastructureFindOneProps` incluent `createdAt` (mappé
depuis `created_at` côté DTO), mais `InfrastructureEntity` et
`InfrastructureFindOneEntity` n'exposent **aucun getter** pour ce champ — seul
`updatedAt` en a un (utilisé par `.with()` pour l'identité de cache). La donnée
est reçue, stockée en mémoire, puis inaccessible depuis la création du module
(23/07).

**Impact :** faible aujourd'hui (rien n'en a besoin), mais si un besoin apparaît
côté UI, ça ressemblera à un bug back-end alors que la donnée est simplement
jetée côté front.

### 5. Refactor commencé, jamais terminé ni annulé, non commité

`git status` montre depuis plusieurs jours :

- `libs/shared/constants/src/lib/constants/pagination.constant.ts` modifié
  (réintroduit `export type PageNumber = string;`, remplaçant un commentaire qui
  pointait vers `@cmz/shared-domain`)
- `libs/shared/domain/src/lib/types/page-number.type.ts` supprimé

`grep -rn "PageNumber" libs/` → **1 seule occurrence**, la déclaration
elle-même. Zéro consommateur des deux côtés du déplacement. Ce diff traîne dans
l'arbre de travail sans être ni fini ni révoqué — signalé mais non résolu à
plusieurs reprises dans les sessions précédentes.

**Recommandation :** trancher (commit si le déplacement est voulu,
`git checkout` sinon) — un diff qui dort n'apporte rien et pollue chaque
`git status` futur.

### 6. `nx-welcome.ts` orphelin, malgré son statut « à retirer » déjà acté

`etat-du-socle.md` (points ouverts, §21/07) : _« `nx-welcome.ts` (dépasse le
budget SCSS) à retirer — au câblage des routes »_. Les routes réelles sont
câblées depuis le 23/07 (admin-infra) et le 27/07 (admin-boundary) —
`app.routes.ts` ne référence plus `nx-welcome` du tout (`grep` confirmé, 0
occurrence hors du fichier lui-même). Le fichier est un orphelin non retiré
alors que sa condition de suppression est remplie depuis 4 jours — autre
symptôme du constat #1 (doc non tenue à jour).

### 7. Commentaire technique qui contredit une décision d'architecture actée

`libs/shared/domain/src/lib/errors/domain-error.abstract.ts:7` documente
`params` comme destiné à _« Transloco : translate(messageKey, params) »_ — or la
décision actée du projet est **i18next**, pas Transloco (cf. mémoire de
session + `TranslationPort`/adaptateur i18next dans `shared-ui`). Un commentaire
qui pointe vers la mauvaise techno induit en erreur le prochain lecteur qui n'a
que ce fichier sous les yeux.

### 8. `messageKey` dynamique vs fixe — cas spécial invisible sans lecture exhaustive

20 des 21 erreurs domaine (`libs/shared/domain/src/lib/errors/**`) ont un
`messageKey` **fixe** (littéral, ex. `GenericRequiredError` →
`'COMMON.ERROR.REQUIRED'`). Une seule, `ServerResponseError`, porte un message
**dynamique** (celui renvoyé par le serveur, en passthrough i18next). Le
comportement recherché est légitime — le serveur peut envoyer un message déjà
traduisible ou un texte brut — mais rien dans le type ne distingue
structurellement ce cas (pas de sous-type `DynamicMessageError`, pas de
marqueur). Le prochain développeur qui ajoute une erreur HTTP suivra par défaut
le pattern majoritaire (fixe) sans savoir qu'un pattern dynamique existe et
pourquoi.

## P2 — cosmétique

### 9. Indirection sans bénéfice actuel

Le commentaire de `form-errors.helper.ts` justifie la ré-exportation locale par
module comme permettant une « composition/override futur » — mais aucun des deux
modules qui le ré-exportent ne l'override ni ne le compose différemment. C'est
de l'indirection pure, cf. #3 pour la suite (la fonction elle-même est morte).

## Ce qui tient, vérifié — pas supposé

- **Boundaries Nx (scope × type) réellement respectées.** Vérifié par `grep`
  direct des imports `@cmz/*-{data,application,ui}` dans chaque couche
  (`application` n'importe jamais `-data`, `ui` n'importe jamais `-data`,
  `domain` n'importe jamais `-data`/`-application`/`-ui`) : **0 violation**,
  indépendamment de ce que dit `eslint.config.mjs`. La config elle-même est
  propre : deux axes orthogonaux (`type:*` = couche, `scope:*` = isolation de
  module), `shared` inaccessible depuis rien d'autre que lui-même côté
  dépendant, chaque module ne voit que lui + le kernel.
- **Séparation wire/domain appliquée y compris dans le module de référence.**
  Vérifié sur `InfrastructureEntity`/`InfrastructureMapper` : DTO snake_case
  (`infrastructure_type`, `created_at`), props domaine camelCase, mapper
  explicite avec cache d'identité (`.with()`) — le même pattern que celui
  documenté a posteriori pour `authentication`. Ce n'était donc pas une
  invention du module 3, mais une convention déjà là dans le module 1.
- **Nommage strictement conforme à `conventions/nommage.md` et
  `contracts/*.contract.md`** sur les 3 modules métier : suffixes d'archétype
  respectés, dossiers au pluriel (sauf `dto/` assumé), séparation `props/`
  (implémentée par une classe) vs `interfaces/` (forme autonome) — vérifiée sur
  `CurrentUser`/`UserPermission`/`AuthToken` (kernel authentication), bien
  rangés en `interfaces/` puisqu'aucune classe ne les `implements`.

## Priorisation suggérée

| #   | Constat                                            | Sévérité | Effort  |
| --- | -------------------------------------------------- | -------- | ------- |
| 1   | Docs racine désynchronisées                        | P0       | faible  |
| 2   | 0 test sur 678 fichiers                            | P0       | élevé   |
| 3   | Code mort Reactive Forms recopié dans 2 modules    | P1       | faible  |
| 4   | `createdAt` mappé puis inaccessible                | P1       | faible  |
| 5   | Refactor `PageNumber` en suspens, non commité      | P1       | faible  |
| 6   | `nx-welcome.ts` orphelin                           | P1       | trivial |
| 7   | Commentaire Transloco erroné                       | P1       | trivial |
| 8   | `messageKey` dynamique non marqué structurellement | P1       | moyen   |
| 9   | Ré-export « pour override futur » jamais utilisé   | P2       | trivial |

Les points 3, 4, 5, 6, 7, 9 sont des corrections mécaniques de quelques minutes
chacune. Le point 1 est une décision éditoriale (à qui incombe la mise à jour de
ces docs) plus qu'un effort. Le point 2 est le seul chantier de fond — il
conditionne la crédibilité de « validé » pour tout module livré à partir de
maintenant.
