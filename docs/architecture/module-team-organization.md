# Module `team-organization` — plan de reconstruction

- **Créé :** 2026-07-28
- **Statut :** livré et **confirmé** — **2 entités CRUD** (`participants` +
  `teams`) + 2 concepts annexes (`teams-select`, `teams-permissions`). Phases 1
  à 8 complètes. Validation locale (`tsc` + `eslint` + `ngc --strictTemplates`)
  clean sur les 4 libs et sur l'app ; mock backend testé de bout en bout
  (list/find-one/select/permissions/create/update/enable/disable/delete) via
  `curl` en session. `nx lint`/`nx serve` confirmés conformes par l'utilisateur
  sur son poste macOS (2026-07-28). Module `team-organization` **terminé**.
- **Gabarit de référence :** `module-coverage-areas.md` — même archétype CRUD
  (props → entités → contrats/vo → repositories → data → application → UI Signal
  Forms), déjà validé sur 4 entités.
- **Contrats d'archétype :** [`archetypes/`](./archetypes/README.md) —
  réutilisés tels quels.

## Périmètre réel vs classification (écart trouvé, pas supposé)

Le tableau de classification ne rendait pas compte de la complexité réelle de
`team-organization`. Lecture directe du source
(`src/presentation/pages/team-organization/`) : le domaine comprend en réalité
`participants` (CRUD classique + rôle + équipe) et `teams` (CRUD

- `reportTypes`/`operators` + un **arbre de permissions récursif** PrimeNG + un
  **sous-écran séparé** de gestion des membres (`teams-participants` :
  assign/reassign/remove).

Décision utilisateur, après présentation explicite de cet écart
(`AskUserQuestion`) : **« CRUD complet, membres/perms différés »** —
`participants` et `teams` en CRUD complet (permissions simplifiées en liste de
cases à cocher **aplatie**, pas l'arbre PrimeNG), le sous-écran
`teams-participants` (assign/reassign/remove) explicitement **différé**, même
précédent que la coupe de l'onglet Historique / aperçu carte GeoJSON sur
`coverage-areas`.

## `participants` — forme métier (source lu, pas supposé)

```ts
interface ParticipantsProps {
    uniqId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: Role | null; // réutilise le Role du kernel (@cmz/shared-domain)
    team: string | null; // NOM de l'équipe (liste)
    status: ParticipantsStatus; // 4 valeurs, enum local au module
    updatedAt: string;
}
```

Statut à 4 valeurs (`active/inactive/blocked/pending`) — enum local, distinct de
tout `Status` partagé (2 valeurs) et de celui de `teams` dans ce même module
(également 2 valeurs, mais nom différent : `TeamsStatus`).

**Divergence volontaire du champ `team`** entre la liste et le détail — vérifiée
dans les deux mappers source, pas une incohérence corrigée silencieusement :

- liste (`ParticipantsProps.team`) : porte le **nom** de l'équipe
  (`dto.team?.uniq_id ? dto.team.name : null`) — affichage direct en table.
- détail (`ParticipantsFindOneProps.team`) : porte l'**uniqId**
  (`dto.team?.uniq_id ?? null`) — pré-remplit le `p-select` du formulaire
  d'édition.

**Incohérence de nommage wire conservée telle quelle** : les endpoints
`create`/`update` envoient `phone_number`, alors que les réponses liste/détail
renvoient `phone`. Vérifié dans les deux DTOs source, gardé tel quel (fidélité
au contrat wire réel, pas une simplification).

`enable`/`disable` sont des **endpoints dédiés** (`PUT .../enable`,
`PUT .../disable`), pas un champ statut modifiable via `update` — normalisé au
pattern `contract`/`validate-contract`/`validator`/`vo` établi partout ailleurs
(le source ne validait `uniqId` qu'au compile-time, sans garde-fou runtime).

## `teams` — forme métier (source lu, pas supposé)

```ts
interface TeamsProps {
    uniqId: string;
    code: string;
    name: string;
    description: string;
    status: TeamsStatus; // dérivé de is_active, comme site-group
    membersCount: string;
    updatedAt: string;
}
interface TeamsFindOneProps {
    uniqId: string;
    code: string | null;
    name: string | null;
    description: string | null;
    reportTypes: ReportType[]; // réutilise le ReportType du kernel
    operators: TelecomOperator[]; // réutilise le TelecomOperator du kernel
    permissions: TeamsPermissionOption[]; // arbre aplati, cf. plus bas
}
```

**Reconstruction volontaire de `TeamsFindOneEntity`** : la version source est du
code mort (constructeur positionnel jamais réellement instancié,
`id: string | null`). Reconstruite en forme objet-props standard, alignée sur le
reste de l'archétype.

**Simplification actée des permissions** : le source utilise un arbre PrimeNG
récursif (`TreeNode` enrichi, `data.checked`) avec deux sources distinctes selon
le mode — `GET .../get-permissions-model` (arbre complet, tout décoché) en
création, `permissions_json` embarqué dans la réponse détail (déjà coché/décoché
selon l'état réel) en édition. Reconstruit ici en **liste de cases à cocher
aplatie** (`TeamsPermissionOption { value, label, checked }`), perte de
hiérarchie assumée et documentée — pas une omission accidentelle. La distinction
création/édition des deux sources est préservée (`TeamsPermissionsRepository`
pour la création, `TeamsFindOneEntity.permissions` pour l'édition).

`enable`/`disable` : même pattern dédié que `participants`.

## Correction en cours de route : `ReportType`/`TelecomOperator` déjà au kernel

Erreur initiale en Phase 2 (domaine) : création de deux enums **locaux**
`ReportType`/`TelecomOperator` dans `team-organization-domain`, avant
vérification du kernel partagé. Découverte a posteriori (Phase 3, lecture de
`@cmz/shared-data`) : ces deux enums existaient **déjà** dans
`@cmz/shared-domain` (lot de 11 enums du kernel initial, valeurs wire-first
identiques `'abi'/'zob'/...`, `'mtn'/'orange'/'moov'`), posés en prévision d'une
réutilisation future. Corrigé immédiatement : suppression des doublons locaux,
réutilisation directe des enums kernel (autorisé par les frontières —
`scope:team-organization` dépend de `scope:shared`). Leçon retenue : **vérifier
le kernel partagé avant de créer un enum local**, même quand un module semble
n'avoir aucun overlap évident avec les modules déjà construits.

`ParticipantsStatus`/`TeamsStatus` eux restent **légitimement locaux** : aucun
équivalent générique actif/inactif/bloqué/en-attente n'existe au kernel, et
chaque module CRUD déjà construit (`site-group`, `administrative-boundary`,
`administrative-infrastructure`) a le sien — précédent confirmé, pas
re-questionné.

## Concepts annexes

- **`TeamsSelectRepository`** (`GET .../teams/select-field` →
  `{uniq_id, name, code}[]`) : alimente le `p-select` équipe du formulaire
  `participants`. Même précédent que `SiteGroupSelectRepository` sur
  `coverage-areas`.
- **`TeamsPermissionsRepository`** (`GET .../teams/get-permissions-model`) :
  alimente le mode création du formulaire `teams` uniquement — l'édition utilise
  les permissions déjà embarquées dans `TeamsFindOneEntity`.

## Hors périmètre (différé, décision explicite)

- `teams-participants` (assign/reassign/remove de membres) — sous-écran séparé,
  complexité et valeur produit distinctes du CRUD `participants`/ `teams`.
- `teams-free-participants`, `agents-performances`, `daily-goal` — classes de
  pattern différentes (Lot 4), hors classification CRUD/action-request.
- Arbre de permissions PrimeNG complet (nested tree UI) — remplacé par la liste
  aplatie ci-dessus.

## Phases (participants + teams, mêmes 8 phases que `coverage-areas`)

1. **Scaffolding Nx** — 4 libs (`domain/data/application/ui`), tags
   `scope:team-organization`, `tsconfig.base.json` + `eslint.config.mjs` mis à
   jour. ✅
2. **Domaine** — enums (`ParticipantsStatus`, `TeamsStatus`,
   `TeamsPermissionOption`), props, entités, contrats/validate-contracts,
   validateurs, value-objects, repositories (ports) pour les deux entités
    - `teams-select` + `teams-permissions`. Correction `ReportType`/
      `TelecomOperator` appliquée en cours de phase (cf. ci-dessus). ✅
3. **Data** — DTOs wire, mappers (`ParticipantsCreateMapper`/
   `UpdateMapper`/`FilterMapper` en **classes injectables** — exception au
   pattern « fonction pure » des autres modules, car premiers mappers de
   commande du projet ayant besoin d'une vraie traduction de valeur via un
   service partagé, `RolesMapper`), sources HTTP (`AUTH_API_URL`), repository
   impls, utilitaire `flattenPermissionTree`. ✅
4. **Application** — use-cases + facades (`ResourceFacade`/
   `CollectionResourceFacade`) pour les deux entités + les 2 concepts annexes.
   ✅
5. **UI (Signal Forms)** — presenters/VM, stores de filtre et de formulaire,
   composants liste/formulaire, routes. `reportTypes`/ `operators`/`permissions`
   en cases à cocher (`toggle*()` sur le store, même pattern que `technology`
   sur `mobile-network`). ✅
6. **Câblage app + i18n** — `provideTeamOrganization()`, routes
   `team-organization/participants` et `team-organization/teams`, namespace
   `TEAM_ORGANIZATION` + constantes `COMMON.*` manquantes (`BLOCKED/PENDING`,
   `SUPERVISOR/LEADER/AGENT`, `ABI/ZOB/CPS/CPO`, `MTN/ORANGE/MOOV` et leurs
   `_STYLE`) ajoutées à `fr.translation.ts`. ✅
7. **Mock backend** — seed `teams` (avec arbre de permissions statique
   `PERMISSION_TREE` + `permission_values` par équipe) et `participants` (avec
   référence croisée vers `teams`), toutes les routes CRUD + `select-field` +
   `get-permissions-model`. Testé de bout en bout via `curl` en session (12
   appels, tous conformes). ✅
8. **Validation & livraison** — `tsc --noEmit` clean sur les 4 libs, `eslint`
   clean, `ngc --strictTemplates` clean sur l'app entière. ✅ —
   `nx lint`/`nx serve` restent à confirmer côté utilisateur.

## Bilan réel

Écart significatif entre le score de classification initial et la complexité
réelle du module (arbre de permissions, sous-écran de gestion de membres, deux
enums déjà au kernel découverts a posteriori) — comme pour `coverage-areas`, la
classification automatique reste un point de départ, pas une vérité à exécuter
sans lecture directe du source. La correction en cours de route
(`ReportType`/`TelecomOperator`) est elle-même documentée plutôt que
silencieusement corrigée, conformément à la discipline établie sur ce projet.
