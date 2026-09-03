# Profils de convention

Source unique des choix de code d'une plateforme cible, au moment de la
génération. Le générateur et l'IA les **lisent** ; ils ne les contiennent jamais
([ADR-0010](../docs/adr/0010-flux-de-generation-assistee-par-ia.md)).

## Structure identique pour toute stack, contenu 100 % natif

`conventions/profile.schema.json` fixe **le même jeu de préoccupations** pour
Angular, React, Kotlin ou Swift :

| Préoccupation | La décision qu'elle tranche |
| --- | --- |
| `component_model` | l'unité d'UI et sa déclaration |
| `local_state` | l'état d'un écran / composant |
| `server_state` | comment la donnée distante est chargée, mise en cache, exposée |
| `navigation` | comment les écrans / routes sont déclarés |
| `forms` | saisie + validation |
| `i18n` | externalisation des chaînes visibles |
| `styling` | application du style visuel |
| `accessibility` | le seuil a11y et sa vérification |
| `testing` | comment l'UI générée est testée |

Chaque préoccupation a la **même forme neutre** —
`{ native, packages, forbid, guidance }` — mais sa valeur est écrite **dans les
mots de la plateforme**, tirée de sa guidance officielle (`angular.dev`,
`react.dev`, `developer.android.com`, `developer.apple.com`). Aucune primitive
d'un autre framework, aucun terme du schéma qui présuppose une stack.

Exemple `i18n` :

| Plateforme | `native` | `packages` |
| --- | --- | --- |
| Angular | `TranslocoDirective` / pipe `transloco` | `@jsverse/transloco` |
| React | hook `useTranslation` de react-i18next | `react-i18next` |
| Kotlin | ressources `strings.xml` + `stringResource()` | — |
| Swift | String Catalogs + `LocalizedStringKey` | — |

### Zéro abstraction cross-platform

Un profil nomme le mécanisme natif de sa plateforme, jamais un wrapper conçu
pour masquer une différence entre plateformes (l'anti-pattern `TranslationPort`,
retiré du repo — [ADR-0036](../docs/adr/0036-convergence-transloco-angular.md)).
`tools/check-convention-profile.mjs` échoue si un `native` se revendique
inter-plateforme ou si un `packages[]` nomme un `*-port` / `*-wrapper` /
`*-abstraction`.

## Un profil par (plateforme, version majeure)

Quand une convention change — `@Injectable({providedIn:'root'})` → `@Service`
entre Angular v20 et v22 — on écrit un **nouveau profil**
(`angular-23.profile.json`), on ne touche pas aux générateurs. Le nom de fichier
reflète `platform` + version majeure ; `version_pin` dit où la version est
épinglée dans le dépôt (`package.json` catalog, `libs.versions.toml`,
`Package.swift`…) et la contrainte que le major du profil doit satisfaire.

## Vérification

`check:convention-profile` (dans `check:all` + CI) a deux couches :

1. **noyau générique** — schéma, identité unique, nom de fichier, guidance par
   préoccupation, anti-abstraction — pour **tout** profil ;
2. **plugin par plateforme** — analyse statique du code réel contre le profil.
   Le plugin Angular existe ; React/Kotlin/Swift s'ajoutent quand la stack est
   réellement construite.

## Fichiers

| Profil | Plateforme | Vérifié pour |
| --- | --- | --- |
| [`angular-22.profile.json`](./angular-22.profile.json) | Angular | v22.0.7 |

Le profil dit _comment_ écrire. Les **archétypes de types de fichier** d'une
cible — _quoi_ produire par type de fichier — sont un jeu par stack sous
[`archetypes/<stack>/`](./archetypes/angular/README.md) (Angular pour l'instant).
Ils ne sont pas neutres : la neutralité vit dans l'IR / les compositions.

Convention transverse (indépendante de la plateforme) :
[`nommage.md`](./nommage.md) — nommage dossiers/fichiers intra-lib.

## Recettes de setup de bibliothèque — `libraries/`

Le profil dit _quel_ mécanisme utiliser (`styling` → Angular Material + Tailwind
pour Angular). Il ne dit pas _comment_ installer et configurer ces bibliothèques
— et ce « comment » change vite (Tailwind v3 `tailwind.config.js` → v4 `@theme` ;
flags de `ng add @angular/material` d'une version à l'autre).

`libraries/<lib>.setup.json` sépare trois niveaux
([ADR-0041](../docs/adr/0041-angular-material-tailwind-defaults.md)) — schéma
fermé : [`library-setup.schema.json`](./libraries/library-setup.schema.json).

| Champ | Rôle | Statut |
| --- | --- | --- |
| `static_invariants[]` | présence **structurelle** (`file-exists` / `file-contains` / `file-matches` sur un fichier de l'app), dont exactement une `footprint` (l'assertion la plus distinctive). **Garde-fou de dérive, pas une preuve de fonctionnement.** | vérifié à chaque run |
| `runtime_acceptance[]` | preuve **réelle** (`compile-component`, `compiled-css-rule`, `browser-coexistence`) — exige un harnais de build/navigateur | `harness-pending` : listé, pas exécuté (suivi B/C) |
| `packages[]` | paquets npm ; vérifiés structurellement (`package.json` racine + catalog + `bun.lock`), jamais par sous-chaîne | vérifié quand une app adopte la lib |
| `coexistence[]` | invariants actifs seulement si une autre lib est aussi déclarée (frontière Material ↔ preflight Tailwind) | idem |
| `install` (`oneOf` par `method`) | `official-schematic` → `command: { executable, argv }` ; `reference-derived` → `reference_tool` (confiné à `tools/`, fichier régulier) ; `llm-then-verified` → `prompt_contract` | VOLATILE — délégué, jamais figé comme vérité |

L'installation est faite par le schematic du vendeur, par un script
`reference-derived` (`tools/scaffold-tailwind.mjs`) ou par un LLM borné ; sa
sortie est **revérifiée contre les `static_invariants`**.

Chaque app avec un `project.json` **doit** déclarer
[`apps/<app>/.cmz/libraries.json`](./libraries/app-library-manifest.schema.json)
(`kind: "app-library-manifest"`, schéma fermé). `check:library-setup` (dans
`check:all` + CI) : rejoue les `static_invariants` dans l'arbre de l'app (chaque
chemin confiné, aucun lien symbolique), vérifie que la plateforme du manifeste
concorde avec l'exécuteur Nx, et **échoue si une lib gouvernée est utilisée
(empreinte détectée) sans être déclarée**. `backoffice-angular` déclare
`["tailwind", "transloco"]`.

| Recette | `install.method` |
| --- | --- |
| [`angular-material.setup.json`](./libraries/angular-material.setup.json) | `official-schematic` |
| [`tailwind.setup.json`](./libraries/tailwind.setup.json) | `reference-derived` |
| [`transloco.setup.json`](./libraries/transloco.setup.json) | `official-schematic` |

## Emplacement

Les profils vivent **dans ce monorepo** — ils disent « ici on cible Angular
22 ». Les outils SEOS, eux, sont génériques et versionnés séparément
([ADR-0009](../docs/adr/0009-reconstruction-pilotee-par-patterns.md)).
