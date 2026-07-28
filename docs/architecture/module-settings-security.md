# Module `settings-security` — plan de reconstruction

- **Créé :** 2026-07-28
- **Statut :** livré, **validation technique complète** — **2 entités CRUD**
  (`users`, `profiles-permissions`) + 1 entité lecture-seule (`access-logs`) +
  1 concept annexe retrofit (`profiles-permissions-permissions`, arbre vierge
  pour la création). Phases 1 à 8 complètes. `tsc --noEmit` +
  `eslint --max-warnings=0` clean sur les 4 libs et sur l'app ; mock backend
  testé de bout en bout (list/find-one/create/update/delete/enable/disable
  sur `users` et `profiles-permissions`, lecture seule sur `access-logs`) via
  `curl` en session. `ngc --strictTemplates` (disponible cette fois via
  `node_modules/.bin/ngc`, contrairement aux modules précédents où `bun`
  manquait) a remonté **deux** erreurs réelles non détectables par `tsc`
  seul, toutes deux corrigées (cf. « Validation & livraison » ci-dessous).
  Confirmation utilisateur (`ngc`/`nx lint`/`nx serve`) encore à recueillir.
- **Gabarit de référence :** `module-content-management.md` — même
  archétype CRUD (props → entités → contrats/vo → repositories → data →
  application → UI Signal Forms), même discipline de normalisation
  CQRS-lite pour toutes les commandes.
- **Contrats d'archétype :** [`archetypes/`](./archetypes/README.md) —
  réutilisés tels quels.

## Forme métier par entité (source lu, pas supposé)

### `users`

```ts
interface UsersFindOneProps {
    uniqId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    profileId: string; // détail : id — pré-remplit le select profil
    role: Role | null; // kernel @cmz/shared-domain, via RolesMapper
    createdAt?: string;
    updatedAt: string;
}
```

`UsersProps` (liste) porte `profile: string` (le **nom**) là où
`UsersFindOneProps` (détail) porte `profileId: string` (l'**id**) — même
précédent que `participants.team`/`news.category` sur les modules
précédents. `status` (`active`/`inactive`/`blocked`/`pending`, 4 valeurs) est
un enum wire directement réutilisable (`isUsersStatus` en guard), pas de
transformation nécessaire — même précédent que `participants.status`.

**Bug source corrigé** : `UsersFindOneItemApiDto.role` restait `RolesDto`
brut (non traduit) dans le mapper source, contrairement au mapper de liste
qui appliquait `RolesMapper`. Corrigé ici — `role` est normalisé en
`Role | null` sur les deux chemins (liste ET détail).

**`role` en écriture** : absent de `UsersCreateApiDto`/`UsersUpdateApiDto` —
champ mort en écriture côté API, confirmé par lecture directe du source (pas
une omission de notre part).

### `profiles-permissions`

```ts
interface ProfilesPermissionsFindOneProps {
    uniqId: string;
    name: string;
    description: string;
    permissions: PermissionTreeNode[]; // arbre fidèle, pas aplati
}

interface PermissionTreeNode {
    key: string;
    label: string;
    checked: boolean;
    actions: PermissionActions; // 6 clés fixes (read/write/execute/export/delete/approve)
    children: PermissionTreeNode[];
}
```

**Arbre fidèle (décision utilisateur explicite)** — contrairement à
`team-organization`'s `TeamsPermissionOption` (aplati côté domaine), l'arbre
de `profiles-permissions` est conservé **récursif**, avec un
`PermissionActions` (6 clés `PermissionAction` du kernel) par nœud — reflet
fidèle du `PermissionTreeNodeApiDto extends TreeNode` (PrimeNG) du source,
sans la dépendance PrimeNG elle-même.

**Bug `users_count` corrigé** : `ProfilesPermissionsItemApiDto.users_count`
est une `string` au wire (bug de typage source) — converti en `number` dans
le mapper (`usersCount: Number(dto.users_count)`), pas propagé tel quel côté
domaine.

**Écriture en map plate** : `permissions?: Record<string, string[]>` sur
`create`/`update` — forme distincte de la lecture (arbre), passthrough sans
transformation domaine (décision actée, pas une incohérence).

### `access-logs` (lecture seule)

```ts
interface AccessLogsProps {
    uniqId: string;
    action: AccessLogsAction; // enum local, 5 valeurs
    source: string;
    userAgent: string;
    createdAt: string;
}
```

**Bug source corrigé** : `AccessLogsActionsMapper.mapToEnum` existe côté
source mais n'est **jamais appelé** sur le chemin de lecture (vérifié par
grep sur tout le repo source) — `AccessLogsEntity.action` y reste une
`string` non validée. Corrigé ici via un guard `isAccessLogsAction` +
`ApiError.invalidResponse` sur valeur inconnue, dans notre
`access-logs.mapper.ts`.

**Seule entité du projet sans aucune mutation** — `AccessLogsRepository` n'a
qu'une méthode (`execute`), donc `AccessLogsFacade` étend directement
`PaginatedResourceFacade` (pas `CollectionResourceFacade`, qui suppose au
moins une action). Conséquence UI : premier VM du projet **sans**
`dropdownActions` (cf. Phase 8).

## Gap Phase 2 retrofitté en Phase 5 : `profiles-permissions-permissions`

Découvert seulement en construisant l'écran de création (Phase 5) : en mode
création, aucune entité `ProfilesPermissions` n'existe encore — il faut
pourtant UNE source pour l'arbre « vierge » à afficher (tous nœuds
décochés). Le domaine initial (Phase 2) n'avait modélisé que CRUD + find-one,
manquant l'équivalent exact de `team-organization/TeamsPermissionsRepository`
(`GET .../get-permissions-model`).

**Retrofit** plutôt que livrer un écran de création cassé — trois couches :
domaine (`ProfilesPermissionsPermissionsRepository`, nouveau port),
data (DTO + mapper + source + repository impl — la logique de mapping
récursive a été factorisée dans `permission-tree-node.mapper.util.ts`,
partagée avec `profiles-permissions-find-one.mapper.ts` pour éviter la
duplication), application (use-case + facade). Câblé dans le store de
formulaire via un garde `seedTreeIfEmpty` (seed unique en mode création).
Confirmé par l'utilisateur après explication (« Je l'ai rétrofitté proprement
à travers les 3 couches plutôt que de livrer un écran de création cassé. »).

## Décisions actées

- **Cascade de l'arbre interactif, descendante uniquement** — cocher/décocher
  un nœud cascade vers tous ses descendants (et leurs actions) ; PAS de
  remontée d'état indéterminé vers le parent (le parent garde l'état donné
  explicitement). Logique portée par l'UI (`permission-tree.util.ts`), pas le
  domaine — même endroit que le `PermissionTreeService` du source
  (`presentation/adapters/`). Simplification assumée et documentée en
  commentaire : suffisant pour un CRUD de profils, pas un éditeur RBAC
  complet.
- **`profile` (filtre `users`) laissé en texte libre** — le wire
  (`UsersFilterApiDto.profile?: string`) ne précise pas s'il s'agit d'un nom
  ou d'un id ; plutôt que de risquer un mauvais couplage à
  `ProfilesPermissionsSelectFacade` (qui retourne des options valuées en
  uniqId), le champ reste un filtre texte simple — choix conservateur,
  documenté en commentaire.
- **Incohérence wire `id`/`uniq_id` conservée** (fidélité au contrat réel,
  même précédent que `team-organization`/`content-management`) : `users` et
  `profiles-permissions` utilisent `id` sur read/create/update et `uniq_id`
  sur delete/enable/disable ; `users` liste avec `id`, `profiles-permissions`
  liste avec `uniq_id`.
- **Deux base URLs distinctes** — `SETTINGS_API_URL` pour `users`/
  `profiles-permissions`/`profiles-permissions-select`/
  `profiles-permissions-permissions` ; `AUTH_API_URL` pour `access-logs`
  seul (confirmé dans le source).
- **Isolation module-locale réaffirmée** — `form-mode.type.ts` et
  `action-item.factory.ts` sont des copies locales à l'UI de ce module (pas
  d'import cross-module), même précédent que `content-management`.

## Phases

1. **Scaffolding Nx** — 4 libs (`domain/data/application/ui`), tags
   `scope:settings-security`, `tsconfig.base.json` + `eslint.config.mjs` mis
   à jour. ✅
2. **Domaine** — enums, props, entités, contrats/validate-contracts,
   validateurs, value-objects, repositories (ports) pour les 3 entités.
   Gap `profiles-permissions-permissions` détecté et comblé en Phase 5 (cf.
   ci-dessus), pas en Phase 2 initialement. ✅
3. **Data** — DTOs wire, mappers (`RolesMapper` injecté dans
   `users.mapper.ts`/`users-find-one.mapper.ts`, correction du bug source sur
   ce dernier ; `isAccessLogsAction` guard), sources HTTP, repository impls.
   ✅
4. **Application** — use-cases + facades (`ResourceFacade`/
   `CollectionResourceFacade`/`PaginatedResourceFacade` pour `access-logs`
   spécifiquement, zéro mutation). ✅
5. **UI (Signal Forms)** — presenters/VM, stores de filtre et de formulaire,
   composant récursif `cmz-permission-tree-node` (cascade descendante,
   auto-référencé dans ses propres `imports`), listes + formulaires
   `users`/`profiles-permissions`, liste seule `access-logs`. Retrofit
   Phase 2-4 du gap `profiles-permissions-permissions` effectué ici. ✅
6. **Câblage app + i18n** — `provideSettingsSecurity()` (7 ports → impls
   data), routes `settings-security/{users,profiles-permissions,
   access-logs}`, namespace `SETTINGS_SECURITY.*` ajouté à
   `fr.translation.ts`. ✅
7. **Mock backend** — nouveau marqueur `settings-and-security/` dans `rel()`
   (nécessaire : ni `users` ni `profiles-permissions` ne matchaient les
   marqueurs existants) ; seed `users`/`profiles-permissions`/`access-logs` ;
   arbre `PERMISSION_ACTIONS_TREE`/`buildPermissionsActionsTree` (analogue à
   `PERMISSION_TREE`/`buildPermissionsTree` de `team-organization`, mais AVEC
   `actions` par nœud) ; `access-logs` réutilise le marqueur `auth/` existant
   (`AUTH_API_URL`). Testé de bout en bout via `curl` en session (list/
   find-one/store/update/delete/enable/disable sur les deux entités CRUD,
   select-field + get-permissions-model, lecture `access-logs`). ✅
8. **Validation & livraison** — `tsc --noEmit` clean sur les 4 libs et sur
   l'app, `eslint --max-warnings=0` clean. `ngc --strictTemplates` (cette
   fois exécutable via `node_modules/.bin/ngc -p
   apps/backoffice-angular/tsconfig.app.json`, `strictTemplates` déjà activé
   dans `tsconfig.json` via `angularCompilerOptions`) a remonté deux erreurs
   réelles, invisibles à `tsc` seul (pas de vérification des templates) :
   - **TS7053** sur `permission-tree-node.component.ts` — indexation directe
     `node().actions[action]` (`action: string` de boucle) contre
     `PermissionActions` (type fermé à 6 clés, pas un `Record<string,
     boolean>`). Corrigé par une méthode `isActionChecked(action: string)`
     qui recast `action as keyof PermissionActions` au seul point de
     jonction entre la boucle générique et le type fermé.
   - **TS2322 « no properties in common »** sur `access-logs-list.component.ts`
     (`[rows]="itemsVM()"`) — `AccessLogsVmProps` (1er VM du projet sans
     `dropdownActions`, cf. entité 100% lecture seule) ne partageait AUCUNE
     propriété avec `TableRowBase` (interface entièrement optionnelle) :
     heuristique « weak type » de TypeScript. Corrigé en faisant
     formellement étendre `TableRowBase` par `AccessLogsVmProps` (sans en
     exploiter les champs) — résout l'ambiguïté structurelle sans introduire
     de dropdown d'actions fictif.
   `nx lint`/`nx serve` restent à confirmer côté utilisateur (`nx` CLI
   indisponible dans ce bac à sable — `WorkspaceContext is not a
   constructor`, même limitation que les modules précédents).

## Bilan réel

Module plus petit que `content-management` en volume (2 entités CRUD + 1
lecture seule, contre 6), mais le plus dense en pièces réellement neuves du
projet : premier composant standalone **récursif** auto-référencé
(`cmz-permission-tree-node`), premier VM de table **sans action de ligne**
(`AccessLogsVmProps`, qui a fait apparaître une limite jusque-là jamais
rencontrée du générique `TableComponent<T extends TableRowBase>`), et le
premier gap de domaine détecté et **retrofitté** après coup plutôt que
découvert en Phase 2 — assumé et expliqué à l'utilisateur plutôt que
masqué. C'est aussi le premier module de ce projet où `ngc
--strictTemplates` a pu tourner jusqu'au bout dans ce bac à sable (`bun`
manquait sur les modules précédents) : les deux erreurs qu'il a remontées
n'avaient aucune chance d'être détectées par `tsc --noEmit` seul, ce qui
confirme la valeur de cette étape de validation dédiée plutôt que de s'arrêter
à `tsc`+`eslint`.
