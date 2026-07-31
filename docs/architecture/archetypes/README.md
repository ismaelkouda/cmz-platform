# Contrats d'archétype — extraits du module de référence

- **Créé :** 2026-07-26
- **Source** : `libs/administrative-infrastructure/{domain,data,application,ui}`
  (module validé `ngc --strictTemplates` + `nx serve`, Phase 07).
- **But** : formaliser ce qu'on applique déjà par jugement à chaque nouveau
  module, pour le tester explicitement sur un cas plus dur
  (`administrative-boundary` : 3 entités hiérarchiques, relations, vues
  imbriquées) **avant** d'investir dans l'automatisation lourde (Phase 04 —
  `extract-pattern.js`/`check-pattern.js`/adaptateur SEOS, dépôt tiers non
  installé ici).

## Ce que c'est — et ce que ce n'est pas

**C'est** une déclinaison scopée du tableau « contrat d'archétype » du plan
d'exécution (§ Phase 07) : pour chaque **rôle de fichier**, on fixe son rôle
DDD/CQRS, sa règle mécanique (invariant vérifiable), l'extrait de convention
Angular 22 attendu, et un pointeur vers le fichier de référence exact. Le
squelette de chaque fichier est **déterministe** (dérivé du contrat) ; seul le
contenu métier change d'un module/d'une entité à l'autre.

**Ce n'est pas** la Phase 04 officielle : pas de mineur (`extract-pattern.js`)
qui découvre la structure depuis le source Angular 21, pas de `check-pattern.js`
scorant 106/106 contre un schéma versionné, pas d'adaptateur AST (ts-morph) qui
distribue automatiquement en libs. Ces outils dépendent d'un dépôt tiers SEOS
non installé dans ce monorepo (décision D1). Ici, l'IA (agissant sous ces
contrats) est le générateur ; la vérification structurelle se fait par les mêmes
moyens qu'aujourd'hui (`ngc --strictTemplates`, audit de boundaries sur imports
réels, `deps = imports`) — pas encore par un score automatisé.

## Comment lire les contrats

Chaque fichier ci-dessous couvre une couche et liste ses archétypes dans l'ordre
de production (domaine → data → application → ui). Pour chaque archétype :

| Élément               | Contenu                                                                 |
| --------------------- | ----------------------------------------------------------------------- |
| **Rôle DDD/CQRS**     | Ce que le fichier fait dans l'architecture                              |
| **Règle mécanique**   | Invariant vérifiable, indépendant du métier                             |
| **Squelette**         | Forme générique du fichier (trous = contenu métier)                     |
| **Référence**         | Fichier exact du module `administrative-infrastructure` dont c'est issu |
| **Variantes connues** | Cas où le contrat a déjà dû être adapté (documentées, pas des bugs)     |

## Principe transversal — la requiredness d'un champ de filtre n'est jamais présumée

Point corrigé le 2026-07-26 après relecture : un **filtre** (liste, find-one, ou
vue imbriquée) n'est pas _par catégorie_ un contrat entièrement optionnel.
Chaque champ — de filtre comme de formulaire — se juge individuellement contre
la réalité métier de l'entité. Ce principe traverse les 4 couches :

- **domain** ([`domain.md`](./domain.md#contract--validate-contract)) : un champ
  de filtre requis suit **exactement** le mécanisme create/update (`contract`
  optionnel + `validate-contract` requis + `validator` avec
  `GenericRequiredError`) — ce n'est pas un archétype à part.
- **application** ([`application.md`](./application.md)) : le use-case
  `execute()` appelle `xFilterVo(contract)` sans présumer l'absence de champ
  requis ; l'erreur, s'il y en a une, remonte par la même `defer()` + loop
  d'erreurs que n'importe quelle mutation.
- **ui** ([`ui.md`](./ui.md#filter-store-injectable-non-root-signal)) : la
  validation reste domaine ; `FilterField` (`@cmz/shared-ui`) n'a **pas
  aujourd'hui** d'indicateur `required` visuel (vérifié dans le code), à la
  différence de `cmz-field` pour les formulaires — limite UX connue, pas un
  défaut de cet archétype.

Directement applicable à `administrative-boundary` : les filtres des vues
imbriquées (`departments-by-region-id`, `municipalities-by-department-id`)
doivent être jugés champ par champ — si l'id du parent est indispensable à la
requête, il est requis, pas silencieusement optionnel par défaut.

## Fichiers

- [`domain.md`](./domain.md) — props, entity, contract/validate-contract,
  validator, value-object, repository-port, filter-entity, enum wire-first.
- [`data.md`](./data.md) — endpoints, dto, response-mapper, command-mapper,
  api-source, repository-impl.
- [`application.md`](./application.md) — use-case, facade (Collection/Resource).
- [`ui.md`](./ui.md) — constants (form-keys/filter-keys/table/status-label),
  vm-props + presenter, filter-store, form-store, feature component, routes,
  composition-root providers.
- [`workflow-action.md`](./workflow-action.md) — famille workflow (files
  d'attente, take/treat, actions CRUD) — **module de référence : `processing`**.

## Boucle d'application (par fichier, par entité)

1. Identifier le rôle du fichier → ouvrir le contrat correspondant.
2. Vérifier la **règle mécanique** contre la réalité de l'entité (ex. « pas de
   toggle » pour `region`/`department`/`municipality` → omettre l'archétype
   enable/disable, pas le vider de son contenu).
3. Remplir le squelette avec le contenu métier de l'entité (noms, champs,
   validations, endpoints).
4. Si la réalité de l'entité force un écart au contrat (ex. `code` requis,
   relations `{id,name}`) : **documenter la variante dans le contrat**, ne pas
   improviser en silence — c'est ce qui rend le contrat réutilisable pour
   l'entité suivante.
5. Valider : `ngc --strictTemplates` + audit boundaries + `deps = imports`.

## Verdict — `administrative-boundary` (2026-07-27)

**Statut : hypothèse validée.** Les contrats extraits
d'`administrative-infrastructure` ont tenu sur un cas nettement plus dur (3
entités hiérarchiques, relations `{id,name}`, 2 vues imbriquées, select cascade
sur 3 niveaux) **sans réécriture substantielle** — 256 fichiers produits,
`ngc --strictTemplates` + `eslint`/boundaries + `nx lint`/`nx serve` verts,
smoke-testés contre un mock hiérarchique. Les écarts prévus par les décisions
préalables (`code` requis, relations `{id,name}`, cascade
region→department→municipality côté select) sont sortis exactement comme
anticipé, sans improvisation.

**Argument fort pour étendre l'approche aux domaines suivants avant d'investir
dans la Phase 04** (mineur/adaptateur SEOS) : deux modules consécutifs, dont un
délibérément choisi plus dur, ont validé le squelette déterministe + contenu
métier injecté sous contrat, vérifié par les mêmes moyens (`ngc`, boundaries,
`deps = imports`) sans score automatisé.

**Deux points de rupture réels, non prévus par les contrats existants — à
retenir comme entrées pour les futurs contrats officiels :**

1. **Aucun archétype pour une vue en lecture seule (facade + vm-props).** Le
   module de référence n'a que des entités avec CRUD complet ; les 2 vues
   imbriquées (`departments-by-region-id`, `municipalities-by-department-id`)
   n'ont ni mutation ni action. Résolu par jugement au fil de l'eau :
    - **Facade** : `PaginatedResourceFacade` (pas `CollectionResourceFacade`) —
      pas de `runAction()` à brancher sur un port qui n'a que `execute()`.
    - **Navigation drill-down** : pas de `rowClicked` sur `cmz-table`
      (`actionClicked` seul existe) → modélisée en action de dropdown
      (`'view-departments'`/`'view-municipalities'`), pas en clic de ligne.
    - **`vm-props` d'une vue lecture seule ne satisfait pas structurellement
      `TableRowBase`** (`TableRowBase` n'a que des propriétés optionnelles ;
      TypeScript rejette une assignation sans **aucune** propriété en commun —
      `error TS2322: has no properties in common`, trouvé par
      `ngc --strictTemplates`, pas par `tsc` seul). Corrigé en déclarant
      `dropdownActions?: ActionDropdownItem[]` optionnel, jamais renseigné, dans
      le `*-vm-props.interface.ts` de la vue — sans effet runtime (`cmz-table`
      ne le lit que si la colonne `__actionDropdown` figure dans `columns()`,
      absente ici). **À ajouter comme variante officielle du contrat
      `vm-props`** ([`ui.md`](./ui.md)) le jour où un archétype `read-only-view`
      est formalisé (cf. Phase 03 du plan d'exécution, pattern
      `read-only-view`).
2. **`ngc --strictTemplates` est indispensable, `tsc --noEmit` seul ne suffit
   pas.** Le bug ci-dessus n'existe que dans le template Angular (binding
   `[rows]`) ; un `tsc` classique ne type-check pas les templates et serait
   passé vert à tort. Tout contrat de validation futur doit exiger `ngc`/le
   compilateur Angular réel, pas une simple compilation TypeScript.

Aucun autre écart : les 4 couches (domaine → data → application → ui) ont suivi
les contrats existants fichier par fichier, y compris pour les 2 vues imbriquées
une fois les 2 points ci-dessus tranchés.
