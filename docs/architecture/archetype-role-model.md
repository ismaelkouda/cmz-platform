# Modèle rôle / archétype / instance — spec d'implémentation

> **Statut :** spec, non implémentée. À acter en ADR après revue.
> **Pour :** implémentation Codex. Couplé au schéma `application-design`
> (IR, [ADR-0030](../adr/0030-ir-canonique-et-profils-cibles.md)) — chantier en
> cours ; l'étape 0 en dépend.
> **Contexte :** [ADR-0010](../adr/0010-flux-de-generation-assistee-par-ia.md),
> [`conventions/README.md`](../../conventions/README.md),
> [`conventions/archetypes/angular/`](../../conventions/archetypes/angular/README.md).

## 1. Problème

Un archétype à **forme unique et figée** est fragile. Preuve : `contracts/`
imposait « un mapper = classe `@Service` », « une façade = loader `Observable` » —
formes que le framework a dépassées (`resource()`, retrait de `TranslationPort`).
La correction n'est pas « plus de rigidité » : c'est de séparer ce qui est
**stable** de ce qui **suit le framework**, et de rendre les variations
**décidables par règle**, pas par jugement du LLM.

## 2. Modèle à trois niveaux

| Niveau | Ce que c'est | Exemple | Immuable ? |
|---|---|---|---|
| **Rôle** | une responsabilité sémantique, sans stack | `mapping` = « transformer wire ↔ domaine » | **oui** — change rarement et délibérément (ADR + bump de schéma) |
| **Archétype** | la ou les formes concrètes d'un rôle pour une (plateforme, version majeure), + la règle qui choisit | angular-22 : `mapping` → classe `@Service` **si** dépendances, **sinon** fonction pure | **non** — suit le framework ; changement discipliné (nouvelle version = nouveau fichier) |
| **Instance** | le fichier généré pour un besoin concret | `report-status.mapper.ts` | **oui pour une version donnée** — on régénère, on n'édite pas (drift-guard existant) |

- **Rôle** = neutre → un registre partagé par toutes les stacks.
- **Archétype** = par stack → `conventions/archetypes/<stack>/`, structurellement
  parallèle, jamais fusionné (un mapper Angular ≠ un mapper React).

## 3. Le registre de rôles

Fichier : `tools/generator-platform/schemas/role-registry.json` (données) +
`role-registry.schema.json` (forme).

```jsonc
{
  "schema_version": "1.0.0",
  "kind": "archetype-role-registry",
  "roles": [
    { "id": "domain-model",     "kind": "ir",         "description": "Un concept métier porté sous forme stable." },
    { "id": "value-object",     "kind": "ir",         "description": "Une valeur contrainte du domaine." },
    { "id": "input-validation", "kind": "ir",         "description": "Valider l'entrée d'une commande avant tout appel." },
    { "id": "mapping",          "kind": "ir",         "description": "Transformer une forme de transport (DTO) en forme du domaine et inversement." },
    { "id": "remote-query",     "kind": "ir",         "description": "Lire de la donnée distante." },
    { "id": "remote-command",   "kind": "ir",         "description": "Muter via le backend." },
    { "id": "screen",           "kind": "ir",         "description": "Une page / vue adressable." },
    { "id": "screen-fragment",  "kind": "ir",         "description": "Une sous-vue réutilisable (liste, formulaire, carte)." },
    { "id": "navigation-edge",  "kind": "ir",         "description": "Un lien / une route entre écrans." },
    { "id": "access-guard",     "kind": "ir",         "description": "Contrôle de permission / d'authentification sur un écran ou une commande." },
    { "id": "i18n-catalog",     "kind": "ir",         "description": "Les chaînes traduisibles d'une fonctionnalité." },
    { "id": "server-state-facade","kind": "structural","description": "Exposer l'état d'une query/command à l'UI (signaux, hook, ViewModel)." },
    { "id": "local-view-state", "kind": "structural", "description": "État de filtre / formulaire porté par un écran." },
    { "id": "error-surface",    "kind": "structural", "description": "Comment une erreur domaine / opérationnelle atteint l'utilisateur." },
    { "id": "public-api",       "kind": "structural", "description": "Ce qu'une unité de code expose vers l'extérieur." }
  ]
}
```

- `kind: ir` = exprimé directement par l'`application-design` ; `kind: structural`
  = impliqué par le fait de générer du code réel pour une cible.
- **Liste initiale proposée** — l'étape 0 la confronte aux types de nœuds réels
  du schéma d'IR figé et l'ajuste.

**Schéma** (`role-registry.schema.json`) : `roles` non vide ; chaque rôle
`{ id (kebab, unique), kind (enum `ir` | `structural`), description (non vide) }` ;
`additionalProperties: false` partout.

**Versioning** : `schema_version` semver.
- Ajout d'un rôle → **MINOR**. La gate passe en *warn* pendant une PR, puis
  *fail* : toute `conventions/archetypes/<stack>/roles.json` doit avoir ajouté
  ce rôle.
- Renommage / retrait → **MAJOR** + ADR.

## 4. Les sélecteurs de forme

Du **code**, pas de la donnée : des prédicats purs sur un nœud d'IR.

Fichier : `tools/generator-platform/core/form-selectors.mjs`

```js
/** @type {Record<string, (irNode: object) => boolean>} */
export const FORM_SELECTORS = {
  'mapping.has-dependencies': (node) => (node.dependencies ?? []).length > 0,
  'mapping.is-pure-rename':   (node) => (node.transforms ?? []).every((t) => t.kind === 'rename'),
  'remote-query.is-paginated':(node) => node.pagination != null,
  // …
};
```

**Invariants** (vérifiés par test) :
- chaque sélecteur est **pur**, **total** (ne lève jamais), déterministe ;
- l'id est `<role>.<predicat>` en kebab ;
- couvert par au moins une fixture `true` et une `false`.

`always` est réservé : catch-all inconditionnel, jamais dans `FORM_SELECTORS`.

## 5. La déclaration d'archétype par stack

Fichier : `conventions/archetypes/<stack>/roles.json`

```jsonc
{
  "schema_version": "1.0.0",
  "stack": "angular",
  "roles": {
    "mapping": [
      { "selector": "mapping.is-pure-rename",   "archetype": "mapper-function" },
      { "selector": "mapping.has-dependencies", "archetype": "mapper-service" },
      { "selector": "always",                   "archetype": "mapper-service" }
    ],
    "access-guard": {
      "na": "géré au niveau shell par une CanActivateFn fonctionnelle, jamais un archétype de lib"
    }
    // … une entrée par rôle du registre
  }
}
```

- valeur = **liste ordonnée** `{ selector, archetype }` dont la **dernière**
  entrée a `selector: "always"` ; **ou** `{ "na": "<raison non vide>" }`.
- première correspondance gagne (comme un `switch` avec `default`).

**Schéma** (`archetype-roles.schema.json`) : `stack` ∈ enum des plateformes ;
`roles` fermé ; chaque valeur `oneOf` [liste non vide finissant par `always`,
objet `{na}`].

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
  - "logique métier appartenant au domaine"
  - "any"
---

## Rôle
… (corps existant) …
```

Scission des archétypes actuels qui recouvrent > 1 forme :
`mapper` → `mapper-service` + `mapper-function` ; `entity` → `entity-flat` +
`entity-props` (les deux variantes déjà décrites dans `entity.contract.md`).

## 7. Gate `check:target-archetype-coverage`

`tools/check-target-archetype-coverage.mjs`. Fail-closed, exit 1 à la moindre
violation :

1. tout rôle du registre est une clé de **chaque** `conventions/archetypes/<stack>/roles.json` ;
2. chaque valeur est soit une liste ordonnée finissant par `always`, soit `{na}` non vide ;
3. tout `selector` référencé existe dans `FORM_SELECTORS` (ou vaut `always`) ;
4. tout `archetype` référencé a un fichier `<stack>/<archetype>.contract.md`
   dont le frontmatter `role` = la clé et `archetype` = l'id ;
5. **aucun** fichier `*.contract.md` orphelin (non référencé par `roles.json`) —
   même discipline que « toute source déclarée doit être utilisée » du
   validateur de contrat backend ;
6. `schema_version` du registre et de chaque `roles.json` cohérents.

Câblage : script `package.json`, dans `check:all`, une step CI et/ou un hook
husky — vérifié par `check:ci-wiring`. Test `check-target-archetype-coverage.test.mjs`
avec fixtures adverses (rôle manquant, `always` absent, sélecteur inconnu,
archétype orphelin, frontmatter incohérent).

## 8. Intégration au pipeline

```
application-design (IR)
  → décomposition en nœuds typés, chacun portant un role
  → pour chaque nœud : selectArchetype(role, node, stack)
        entries = roles.json[role]
        si entries.na → ERREUR « l'IR a produit un nœud pour un rôle N/A sur <stack> »
        pour {selector, archetype} de entries :
          si selector === 'always' ou FORM_SELECTORS[selector](node) → archetype
  → assemblage du prompt (LLM de réalisation) : shape + forbid du frontmatter
                                              + profil de convention + données de l'IR
    ou → renderer déterministe qui consomme la même sélection
  → oracle (build + lint + strictTemplates + gates)
```

`selectArchetype()` est **déterministe** : c'est la donnée de l'IR qui tranche
entre les formes, jamais le LLM.

## 9. Plan d'implémentation (ordonné, chaque étape testée + gatée)

0. **Prérequis** — schéma `application-design` figé. En extraire les types de
   nœuds → dériver les rôles `kind: ir`, valider la liste initiale du §3.
1. `role-registry.json` + `role-registry.schema.json` + validateur + test.
2. `form-selectors.mjs` (vide sauf convention) + test d'infra (pureté, totalité).
3. Frontmatter formel des `*.contract.md` : parser + `archetype.schema.json`.
   Migrer les 22 archétypes Angular (prose → frontmatter). Scinder `mapper`,
   `entity`.
4. `conventions/archetypes/angular/roles.json` : une entrée par rôle. Les cas
   conditionnels → sélecteurs implémentés en 2. Les `N/A` documentés.
5. Gate `check:target-archetype-coverage` + test + câblage.
6. Moteur `selectArchetype()` + test. Branchement dans l'assemblage de prompt
   et/ou le renderer.
7. ADR actant le modèle (promu depuis cette spec).

## 10. Non-objectifs

- **Pas l'IR** — `application-design` / ADR-0030 est un chantier séparé.
- **Pas une couche neutre générable** — le registre de rôles est un index
  sémantique, pas une représentation d'où l'on génère du code.
- **Pas de forme par instance** — les formes sont énumérées depuis le code de
  référence réel (« vérifié sur N occurrences »), pas dérivées nœud par nœud.
- **Ne remplace pas l'oracle** (build / lint / strictTemplates) — le complète en
  amont.
