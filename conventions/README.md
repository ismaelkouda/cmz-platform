# Profils de convention

Source unique des choix de code qui **changent d'une version majeure à l'autre**
d'un framework. Le générateur et l'IA les **lisent** au moment de la génération
; ils ne les contiennent jamais
([ADR-0010](../docs/adr/0010-flux-de-generation-assistee-par-ia.md)).

## Principe

Quand une convention change — par exemple `@Injectable({providedIn:'root'})` →
`@Service` entre Angular v20 et v22 — on écrit un **nouveau profil**, on ne
touche pas aux générateurs. C'est le catalog de versions
([ADR-0005](../docs/adr/0005-versions-du-socle.md)) appliqué aux conventions de
code : un seul endroit à modifier.

## Fichiers

| Profil                                                 | Framework | Vérifié pour |
| ------------------------------------------------------ | --------- | ------------ |
| [`angular-22.profile.json`](./angular-22.profile.json) | Angular   | v22.0.7      |

Convention transverse (indépendante de la version du framework) :

| Convention                   | Portée                              |
| ---------------------------- | ----------------------------------- |
| [`nommage.md`](./nommage.md) | Nommage dossiers/fichiers intra-lib |

## Règle de cohérence

La version majeure d'un profil doit correspondre à la version du framework dans
le catalog. `angular-22.profile.json` va avec `@angular/core: 22.x` du catalog.
Un écart est un bug — à vérifier en CI (Phase 06).

## Emplacement

Les profils vivent **dans ce monorepo** (pas dans le dépôt tiers des outils
SEOS) : ils sont spécifiques au dépôt — ils disent « ici on cible Angular 22 ».
Les outils SEOS, eux, sont génériques et versionnés séparément
([ADR-0009](../docs/adr/0009-reconstruction-pilotee-par-patterns.md)).
