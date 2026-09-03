# Modèle rôle / archétype / instance — spec d'implémentation

> **Statut :** première tranche verticale implémentée et gatée : le contrat de
> page produit le rôle `screen`, sélectionné puis consommé par le work order
> Angular du LLM. Le prérequis de
> [ADR-0039](../adr/0039-frontiere-contractuelle-conception-realisation-llm.md)
> est livré ; les rôles sans producteur et consommateur réels restent hors du
> registre. **Pour :** extension disciplinée. Couplé au schéma
> `application-design` (IR,
> [ADR-0030](../adr/0030-ir-canonique-et-profils-cibles.md)) — schéma canonique
> `1.0.0` désormais figé. **Contexte :**
> [ADR-0010](../adr/0010-flux-de-generation-assistee-par-ia.md),
> [`conventions/README.md`](../../conventions/README.md),
> [`conventions/archetypes/angular/`](../../conventions/archetypes/angular/README.md).

## 1. Problème

Un archétype à **forme unique et figée** est fragile. Preuve : `contracts/`
imposait « un mapper = classe `@Service` », « une façade = loader `Observable` »
— formes que le framework a dépassées (`resource()`, retrait de
`TranslationPort`). La correction n'est pas « plus de rigidité » : c'est de
séparer ce qui est **stable** de ce qui **suit le framework**, et de rendre les
variations **décidables par règle**, pas par jugement du LLM.

## 0. Principe directeur — croissance pilotée par la demande

Le modèle n'est **jamais complété d'avance**. Un rôle n'entre dans le registre
que lorsqu'un **producteur** IR typé et un **consommateur** (renderer ou
assembleur de work order) l'exercent réellement, sur au moins un cas versionné.

Corollaire : tant qu'une seule cible existe (Angular), ajouter des rôles ne fait
que **deviner** la frontière d'abstraction. C'est la **deuxième cible** (React)
qui la valide. Le catalogue de l'annexe A est un backlog non normatif, pas une
feuille de route à épuiser.

## 2. Modèle à trois niveaux

| Niveau        | Ce que c'est                                                                                        | Exemple                                                                                | Immuable ?                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Rôle**      | une responsabilité sémantique, sans stack                                                           | `mapping` = « transformer wire ↔ domaine »                                             | **oui** — change rarement et délibérément (ADR + bump de schéma)                         |
| **Archétype** | la ou les formes concrètes d'un rôle pour une (plateforme, version majeure), + la règle qui choisit | angular-22 : `mapping` → classe `@Service` **si** dépendances, **sinon** fonction pure | **non** — suit le framework ; changement discipliné (nouvelle version = nouveau fichier) |
| **Instance**  | le fichier généré pour un besoin concret                                                            | `report-status.mapper.ts`                                                              | **oui pour une version donnée** — on régénère, on n'édite pas (drift-guard existant)     |

- **Rôle** = neutre → un registre partagé par toutes les stacks.
- **Archétype** = par stack → `conventions/archetypes/<stack>/`,
  structurellement parallèle, jamais fusionné (un mapper Angular ≠ un mapper
  React).

## 3. Le registre de rôles

Fichier : `tools/generator-platform/role-registry.json` (données) +
`role-registry.schema.json` (forme).

**Forme active** — chaque rôle déclare exactement :

```jsonc
{
    "id": "<kebab>",
    "producer": "<pipeline>",
    "consumer": "<pipeline>",
    "description": "<non vide>",
}
```

`id` kebab unique, `additionalProperties: false`. `producer` et `consumer` sont
des noms de pipeline validés contre la constante `ROLE_PIPELINES`
(`tools/generator-platform/core/archetype-selection.mjs`) : **on ne peut pas
déclarer un rôle sans code producteur/consommateur réel**.
`role-node.schema.json` ferme l'identité, la source hashée et le payload du nœud
produit.

**Contenu actif — un seul rôle :**

```json
{
    "schema_version": "1.0.0",
    "kind": "archetype-role-registry",
    "roles": [
        {
            "id": "screen",
            "producer": "page-realization-contract",
            "consumer": "page-realization-work-order",
            "description": "Réaliser un écran adressable depuis son contrat de page canonique."
        }
    ]
}
```

Le registre est aujourd'hui **1 entrée + `ROLE_PIPELINES`** : c'est un
échafaudage assumé, pas encore une table riche. Il le devient à mesure que des
rôles réels s'y ajoutent (§9, annexe A).

### La décision qui bloque les rôles de code — `application-design` vs `artifact-plan`

`application-design` (ADR-0030/0039) émet les concepts **d'orchestration**
(`screen`, `navigation`, `access`, `state`). `artifact-plan` émet les
**responsabilités de code** (`domain-model`, `input-validator`,
`integration-client`, `runtime-binding`, `public-api`). Aucun des deux n'émet
aujourd'hui de nœud typé `mapping` / `remote-query` / `remote-command`.

Avant tout rôle de code (T7+), trancher **D1** — trois options :

| Option | Idée                                                                                       | Coût   | Risque                                       |
| ------ | ------------------------------------------------------------------------------------------ | ------ | -------------------------------------------- |
| **a**  | typer des nœuds de rôle dans `artifact-plan` (2ᵉ famille de producteurs, même registre)    | modéré | le registre couple deux IR                   |
| **b**  | IR jointe unique orchestration + code                                                      | élevé  | refonte ADR-0030                             |
| **c**  | statu quo — `artifact-plan` reste le contrat des renderers de code, hors registre de rôles | nul    | le modèle de rôles ne couvre jamais que l'UI |

Recommandation à documenter en ADR : **(a)**, en gardant `role.producer` comme
discriminant de famille. **Aucun code de rôle n'est écrit avant cet ADR.**

**Versioning** : `schema_version` semver. Les schémas actifs n'acceptent
actuellement que `1.0.0` ; une nouvelle version doit donc être ajoutée
explicitement aux producteurs, consommateurs, validateurs et tests dans la même
modification.

- Ajout rétrocompatible d'un rôle → **MINOR**. La gate reste _fail-closed_ : le
  producteur, le consommateur et chaque cible supportée doivent être livrés
  atomiquement dans la même PR. Il n'existe aucun mode transitoire _warn_.
- Renommage / retrait → **MAJOR** + ADR.

## 4. Les sélecteurs de forme

Du **code**, pas de la donnée : des prédicats purs sur un nœud d'IR.

Fichier : `tools/generator-platform/core/form-selectors.mjs`. Il reste vide pour
`screen`, car une seule forme concrète est aujourd'hui prouvée.

```js
/** @type {Record<string, (irNode: object) => boolean>} */
export const FORM_SELECTORS = {
    'mapping.has-dependencies': (node) => (node.dependencies ?? []).length > 0,
    'mapping.is-pure-rename': (node) =>
        (node.transforms ?? []).every((t) => t.kind === 'rename'),
    'remote-query.is-paginated': (node) => node.pagination != null,
    // …
};
```

**Critères d'admission d'un futur sélecteur conditionnel** :

- chaque sélecteur est **pur**, **total** (ne lève jamais), déterministe ;
- l'id est `<role>.<predicat>` en kebab ;
- couvert par au moins une fixture `true` et une `false`.

La v1 active ne contient aucun sélecteur conditionnel : ces propriétés ne sont
donc pas présentées comme déjà prouvées. La gate actuelle vérifie l'existence et
l'appartenance au rôle ; l'ajout du premier sélecteur devra livrer simultanément
le harnais automatisant les trois critères ci-dessus.

`always` est réservé : catch-all inconditionnel, jamais dans `FORM_SELECTORS`.

## 5. La déclaration d'archétype par stack

Fichier : `conventions/archetypes/<stack>/roles.json`

La cible Angular active contient seulement
`screen → [{ selector: "always", archetype: "component" }]`. L'exemple suivant
illustre une extension future et n'est pas une configuration acceptée actuelle.

```jsonc
{
    "schema_version": "1.0.0",
    "stack": "angular",
    "roles": {
        "mapping": [
            {
                "selector": "mapping.is-pure-rename",
                "archetype": "mapper-function",
            },
            {
                "selector": "mapping.has-dependencies",
                "archetype": "mapper-service",
            },
            { "selector": "always", "archetype": "mapper-service" },
        ],
        "access-guard": {
            "na": "géré au niveau shell par une CanActivateFn fonctionnelle, jamais un archétype de lib",
        },
        // … une entrée par rôle du registre
    },
}
```

- valeur = **liste ordonnée** `{ selector, archetype }` dont la **dernière**
  entrée a `selector: "always"`. Une cible doit donc couvrir chaque rôle actif ;
  le schéma v1 n'admet ni `{na}`, ni omission silencieuse.
- première correspondance gagne (comme un `switch` avec `default`).

> **Gap connu — `{na}` (tâche T2).** Certains rôles n'ont **aucun fichier de
> lib** sur une cible : `access-guard` et `navigation-edge` sont rendus au
> niveau du shell (garde fonctionnelle, fichier de routes), pas un
> `*.contract.md`. Le schéma actuel force pourtant une liste
> `{selector, archetype}`. Avant `navigation-edge` / `access-guard`,
> `archetype-roles.schema.json` doit accepter `{ "na": "<raison non vide>" }`
> comme valeur de rôle, avec test adverse (`na` vide → rejet).

**Schéma** (`archetype-roles.schema.json`) : `stack` ∈ enum des plateformes ;
chaque valeur est une liste non vide. Le validateur complète JSON Schema en
exigeant que les clés de `roles` soient exactement celles du registre, que
`always` soit uniquement en dernière position et que chaque archétype se résolve
vers un contrat formel.

## 6. Format d'un fichier archétype

Un fichier = **une forme**. Frontmatter YAML formel + le corps prose actuel
(rôle, exemplaire, non-reproduction) conservé sous le frontmatter.

```markdown
---
archetype: mapper-service
role: mapping
shape: >
    Classe exportée `<Nom>Mapper`, décorée `@Service()`, dépendances par
    `inject()`, une méthode publique `map(dto): <Entité>`.
forbid:
    - "@Injectable({ providedIn: 'root' })"
    - 'logique métier appartenant au domaine'
    - 'any'
---

## Rôle

… (corps existant) …
```

Scission des archétypes actuels **seulement si un producteur rend le choix
mécanique**. `mapper` → `mapper-service` (dépendances) + `mapper-function` (pur)
est un candidat clair. `entity` **n'est pas** un candidat en l'état :
`entity.contract.md` décrit `entity-flat` et `entity-props` comme « toutes deux
admises », **sans règle** — c'est une discrétion d'auteur, pas deux formes
sélectionnables. Une scission sans sélecteur serait de la fausse précision.

## 7. Gate `check:target-archetype-coverage`

`tools/check-target-archetype-coverage.mjs`. Fail-closed, exit 1 à la moindre
violation :

1. tout rôle du registre est une clé de **chaque**
   `conventions/archetypes/<stack>/roles.json` ;
2. chaque valeur est une liste ordonnée non vide finissant par `always` ;
3. tout `selector` référencé existe dans `FORM_SELECTORS` (ou vaut `always`) ;
4. tout `archetype` référencé a un fichier `<stack>/<archetype>.contract.md`
   dont le frontmatter `role` = la clé et `archetype` = l'id ;
5. **aucun contrat migré** (frontmatter formel présent) orphelin. Les contrats
   prose historiques ne deviennent pas actifs par accident ; ils seront migrés
   avec leur producteur et leur consommateur ;
6. `schema_version` du registre et de chaque `roles.json` cohérents.

Câblage : script `package.json`, dans `check:all` et une étape CI — vérifié par
`check:ci-wiring`. Test `role-archetype.test.mjs` avec fixtures adverses (rôle
manquant, `always` absent, sélecteur inconnu, archétype orphelin, frontmatter
incohérent).

## 8. Intégration au pipeline

### Frontière découverte puis implémentée

`application-design` n'est pas, à lui seul, le producteur de tous les rôles
proposés au §3. Il émet réellement les concepts applicatifs (`screen`, états,
navigation, accès), tandis que `artifact-plan` émet les responsabilités de code
(`domain-model`, `input-validator`, `integration-client`, `runtime-binding`,
`public-api`, etc.). Les rôles `mapping`, `remote-query` ou `remote-command` ne
sont actuellement pas des nœuds explicites et typés dans aucun des deux
documents.

Le protocole est concret pour `screen` : `role-node.schema.json` ferme identité,
rôle, source hashée et payload ; `role-production.mjs` produit le nœud depuis
`page-realization-contract` ; `page-realization.mjs` consomme la sélection, le
frontmatter et son hash dans le work order. Il reste interdit d'ajouter un rôle
seulement déclaratif : `ROLE_PIPELINES` et la gate imposent un producteur et un
consommateur implémentés.

```
application-design → page-realization-contract
  → décomposition en nœuds typés, chacun portant un role
  → pour chaque nœud : selectArchetype(role, node, stack)
        entries = roles.json[role]
        pour {selector, archetype} de entries :
          si selector === 'always' ou FORM_SELECTORS[selector](node) → archetype
  → assemblage du prompt (LLM de réalisation) : shape + forbid du frontmatter
                                              + profil de convention + données de l'IR
    ou → renderer déterministe qui consomme la même sélection
  → oracle (build + lint + strictTemplates + gates)
```

`selectArchetype()` est **déterministe** : c'est la donnée de l'IR qui tranche
entre les formes, jamais le LLM.

## 9. État et extension ordonnée

**Livré (tranche 1)** : protocole fermé, registre, schémas, parser de
frontmatter, `roles.json`, sélection déterministe, gate
`check:target-archetype-coverage` et branchement réel `screen → component` dans
le work order, re-vérifié par le hash. Prérequis : `application-design` `1.0.0`
figé + ADR-0039.

**Reste — chaque tâche petite, indépendante, gatée :**

| Tâche   | Contenu                                                                                                                                            | Précond. |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **T1**  | ADR tranchant **D1** (§3) — recommandation : option (a)                                                                                            | —        |
| **T2**  | schéma `archetype-roles` accepte `{ na: "<raison>" }` + test adverse                                                                               | —        |
| **T3**  | rôle `navigation-edge` (producteur : nav de `application-design` ; consommateur : renderer shell)                                                  | T2       |
| **T4**  | rôle `i18n-catalog` (producteur : chaînes de `application-design` ; consommateur : shell + page)                                                   | T2       |
| **T5**  | rôle `access-guard` → `roles.json` angular = `{ na: … }`                                                                                           | T2       |
| **T6**  | gate `check:lint-tools` (`eslint 'tools/**/*.mjs'` + `**/*.mjs` dans `eslint.config.mjs`) — orthogonal, attrape la classe « `.mjs` non linté »     | —        |
| **T7+** | rôles de code (`mapping`, `remote-query`, `remote-command`, `domain-model`, `server-state-facade`) — **1 par PR**, producteur `artifact-plan` typé | **T1**   |

Différé jusqu'à un vrai besoin : 1er sélecteur conditionnel + harnais fixtures
(arrive avec `mapping`) ; frontmatter `mapper` (idem) ; `entity` reste non
scindé tant qu'aucune règle mécanique ne sépare `entity-flat` / `entity-props`.

## 10. Non-objectifs

- **Pas l'IR** — `application-design` / ADR-0030 est un chantier séparé.
- **Pas une couche neutre générable** — le registre de rôles est un index
  sémantique, pas une représentation d'où l'on génère du code.
- **Pas de forme par instance** — les formes sont énumérées depuis le code de
  référence réel (« vérifié sur N occurrences »), pas dérivées nœud par nœud.
- **Ne remplace pas l'oracle** (build / lint / strictTemplates) — le complète en
  amont.
- **Pas de complétion spéculative** — voir §0.

## Annexe A — catalogue de rôles candidats (non normatif)

Backlog de réflexion, **pas** le schéma actif (§3). Un candidat ne devient un
rôle que par une tâche T-numérotée avec producteur + consommateur réels. La
colonne « producteur pressenti » indique où le nœud pourrait naître ; `?` = pas
de nœud typé aujourd'hui.

| Candidat                          | Description                                      | Producteur pressenti                      |
| --------------------------------- | ------------------------------------------------ | ----------------------------------------- |
| `navigation-edge`                 | lien / route entre écrans                        | `application-design` (nav)                |
| `i18n-catalog`                    | chaînes traduisibles d'une fonctionnalité        | `application-design` (chaînes)            |
| `access-guard`                    | contrôle de permission / auth sur un écran       | `application-design` (`page.access`)      |
| `screen-fragment`                 | sous-vue réutilisable (liste, formulaire, carte) | `application-design` (`region`/`element`) |
| `domain-model`                    | concept métier sous forme stable                 | `artifact-plan` ?                         |
| `value-object`                    | valeur contrainte du domaine                     | `artifact-plan` ?                         |
| `input-validation`                | valider l'entrée d'une commande                  | `artifact-plan` ?                         |
| `mapping`                         | transformer transport ↔ domaine                  | `?` (aucun nœud typé)                     |
| `remote-query` / `remote-command` | lire / muter via backend                         | `?`                                       |
| `server-state-facade`             | exposer l'état query/command à l'UI              | `artifact-plan` (`runtime-binding`) ?     |
| `local-view-state`                | état de filtre / formulaire d'un écran           | `application-design` ?                    |
| `error-surface`                   | comment une erreur atteint l'utilisateur         | `?` (concept flou — à préciser)           |
| `public-api`                      | ce qu'une unité de code expose                   | `artifact-plan` (`public-api`)            |
