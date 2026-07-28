# Module `communication` — plan de reconstruction

- **Créé :** 2026-07-28
- **Statut :** livré, **validation technique complète** — 2 entités
  (`messaging`, CRUD complet ; `notifications`, lecture + 2 actions réelles
  `readOne`/`readAll`). Phases 1 à 8 complètes. `tsc --noEmit` +
  `eslint --max-warnings=0` clean sur les 4 libs et sur l'app ; `ngc
  --strictTemplates` clean sur `apps/backoffice-angular` (0 erreur) — cette
  fois exécuté APRÈS le câblage des routes (Phase 6), donc réellement
  significatif : contrairement à un run pendant la Phase 5 (où les
  composants ne sont pas encore atteignables depuis l'app et le check ne
  prouve rien), celui de la Phase 8 type-vérifie effectivement les
  templates `messaging-form`/`messaging-list`/`notifications-list`. Mock
  backend testé de bout en bout (list/find-one/create/update/delete sur
  `messaging`, `readOne`/`readAll` sur `notifications`) via `curl` en
  session.
- **Gabarit de référence :** `module-settings-security.md` — même
  archétype (props → entités → contrats/vo → repositories → data →
  application → UI Signal Forms).

## Forme métier par entité

### `messaging`

```ts
interface MessagingProps {
    // liste
    uniqId: string;
    reportId: string;
    type: MessagingType; // tip/education/info/awareness
    targetType: MessagingTarget; // report/area
    region: string; // NOM (liste)
    department: string;
    municipality: string;
    channels: MessagingChannel[]; // push/mail/sms
    subject: string;
    content: string;
    createdAt: string;
}

interface MessagingFindOneProps {
    // détail — region/department/municipality en ID, pas en nom
    region: string;
    department: string;
    municipality: string;
    // ...
}
```

Même précédent que `participants.team`/`news.category` : la liste porte le
nom lisible, le détail porte l'id (pré-remplissage du select en édition).

**Bug source corrigé (mapper find-one)** : `JSON.stringify(dto.region?.id)`
— `JSON.stringify` sur une string l'entoure de guillemets littéraux
(`"\"abc\""` au lieu de `"abc"`), cassant tout matching contre les options
du select. Corrigé en `dto.region?.id ?? ''`.

**Bug source corrigé (mapper liste)** : `type`/`targetType` restaient
non traduits sur le chemin liste (le mapper source appelait
`MessagingTypeMapper`/`MessagingTargetMapper` seulement côté détail).
Corrigé — les deux mappers sont appliqués sur les deux chemins.

**Bug source corrigé (source HTTP)** : `delete`/`enable`/`disable`
interpolaient l'objet DTO entier dans l'URL (`` `${apiDto}/delete` `` →
`[object Object]/delete` au lieu de `` `${apiDto.uniq_id}/delete` ``).
Corrigé.

**Incohérence wire conservée (fidélité au contrat réel)** : `create` utilise
`region_id`/`department_id`/`municipality_id`, `update` utilise
`region`/`department`/`municipality` — mêmes ids, juste un nommage
différent entre les deux endpoints (vérifié dans le source, pas une
invention).

**Consolidation validation** : le source séparait
`validateMessagingCreate` (champs requis) de
`MessagingCreateEntity.ensureCanBeCreated()` (longueur SMS, sujet requis
si canal mail) — deux mécanismes pour la même opération. Fusionnés en UN
validateur (`validateMessagingCreate`), cohérent avec l'absence de
précédent « entity de commande » ailleurs dans ce monorepo. La règle
source « sujet requis si canal mail » était en réalité un sous-cas jamais
atteignable de la règle générale « sujet toujours requis » — documenté en
commentaire plutôt que reproduit tel quel.

### `notifications`

```ts
interface NotificationsProps {
    uniqId: string;
    reference: string;
    title: string;
    type: TypeReport; // kernel @cmz/shared-domain — 1er vrai consommateur
    message: string;
    status: NotificationsStatus; // read/unread
    sendAt: string;
    updatedAt: string;
}
```

`type` réutilise `TypeReport` (kernel, posé en prévision, jamais consommé
jusqu'ici) plutôt que de recréer un enum local — même réflexe que
`ReportType`/`TelecomOperator` sur `team-organization`. Sur le wire,
`model_type` porte des valeurs **PascalCase** (`RequestReport`/
`ProcessingReport`/`FinalizationReport`), distinctes des valeurs domaine
(`requests`/`processing`/`finalization`) — fidèlement reproduit dans
`NotificationsTypeReportMapper` et dans le seed du mock.

`NotificationsRepository` n'a que 2 méthodes réelles : `readOne`/`readAll`
(pas de create/update/delete classique) — mais ce sont de VRAIES actions
mutantes, donc `NotificationsFacade` étend `CollectionResourceFacade`
(qui expose `runAction`) et non `PaginatedResourceFacade` (réservé aux
entités à zéro mutation, cf. `AccessLogsFacade`). `runAction` ne suppose
rien de spécifique à create/update/delete — il s'applique tout aussi bien
à un `readOne`/`readAll`.

## Décisions actées

- **Dépendance cross-domaine explicite (première du projet)** — le
  formulaire `messaging` (cible = zone géographique) a besoin du cascade
  région → département → commune de `administrative-boundary`
  (`RegionSelectFacade`, `RegionOption`/`DepartmentOption`/
  `MunicipalityOption`). Jusqu'ici, CHAQUE scope ne dépendait que de
  lui-même + `scope:shared` (isolation stricte entre modules). Option
  choisie par l'utilisateur (question posée explicitement, la dépendance
  brisant un invariant tenu sur tous les modules précédents) :
  **dépendance explicite** — exception ajoutée à `eslint.config.mjs`
  (`scope:communication` → aussi `scope:administrative-boundary`),
  documentée en commentaire avec la date de la décision. Alternatives
  écartées : dupliquer le cascade localement (perte de cohérence si le
  référentiel change), extraire un lib partagé plus lourd (prématuré pour
  un seul consommateur).
- **Dialogue de détail `notifications` remplacé par une action réelle** —
  le source ouvrait un `ManagementDialogComponent` au clic sur une ligne,
  mais ce composant était un stub jamais câblé à une vraie vue (et son
  repository `find-one` associé n'était appelé nulle part, confirmé par
  grep). Option choisie par l'utilisateur : remplacer par « marquer comme
  lu » (`readOne`, déjà fonctionnel côté backend/mock) plutôt que
  reconstruire un dialogue non fonctionnel à l'identique. Le bouton d'en-
  tête « tout marquer comme lu » (`readAll`), lui, était réellement câblé
  dans le source — conservé tel quel.
- **Actions de ligne `messaging` : view/edit/delete, pas enable/disable**
  — le source déclarait bien `enable`/`disable` au niveau repository,
  mais ne les branchait à AUCUN bouton réel (seul `view` était un
  `TableAction` réel, `edit` restait perpétuellement en lecture seule côté
  source — bug d'incomplétude). Reconstruit avec un `edit` réellement
  fonctionnel (le backend le supporte). `enable`/`disable` omis de l'UI :
  `MessagingEntity` n'expose aucun champ de statut pour raisonner le sens
  d'une bascule (contrairement à `users.status`) — ils restent au niveau
  repository/facade (fidélité au contrat backend) sans bouton dédié.
- **Pas d'export Excel sur `notifications`** — le source portait un bouton
  d'export (`ExcelExportService`), mais aucune autre liste reconstruite
  dans ce monorepo n'a porté cette fonctionnalité (le service n'existe pas
  côté kernel reconstruit) : cohérence avec le reste du projet plutôt que
  fidélité isolée à cette seule vue.
- **`channels` absent du filtre `messaging`** — présent dans le contrat
  domaine, mais `FilterFieldType` (`cmz-filter`) ne supporte que
  `text`/`number`/`select`/`date`, pas de multi-select ; construire un
  contrôle dédié pour ce seul besoin aurait été disproportionné (même
  esprit que la décision rich-text de `content-management`).
- **Isolation module-locale réaffirmée** — `form-mode.type.ts` et
  `action-item.factory.ts` sont des copies locales à l'UI de ce module.

## Phases

1. **Scaffolding Nx** — 4 libs, tags `scope:communication`,
   `tsconfig.base.json` + `eslint.config.mjs` (nouvelle contrainte de
   dépendance cross-scope, cf. décisions). ✅
2. **Domaine** — enums (codes métier stables, pas des clés de traduction
   comme valeur — corrige `MessagingTypeEnum`/`NotificationsStatus` du
   source), props/entités, contrats/validate-contracts, validateur
   consolidé `messaging`, value-objects, repositories (ports). ✅
3. **Data** — DTOs wire, mappers (bidirectionnels pour
   type/target/channel), sources HTTP (bug delete/enable/disable
   corrigé), repository impls. ✅
4. **Application** — use-cases + facades (`CollectionResourceFacade` pour
   `messaging` ET `notifications`, `ResourceFacade` pour
   `messaging-find-one`). ✅
5. **UI (Signal Forms)** — presenters/VM, stores de filtre et de
   formulaire. `messaging-form.store.ts` : cascade région → département →
   commune à 3 niveaux (extension du précédent 2-niveaux de
   `municipality-form.store.ts`), `targetType` pilotant `reportId` vs.
   cascade en exclusif, `channels` en cases à cocher, validation croisée
   longueur SMS dupliquée côté UI pour un retour immédiat.
   `notifications` : lecture seule + action `markAsRead` par ligne,
   bouton d'en-tête `readAll`. ✅
6. **Câblage app + i18n** — `provideCommunication()` (3 ports → impls
   data), routes `communication/{messaging,notifications}`, namespace
   `COMMUNICATION.*` ajouté à `fr.translation.ts` + clés `COMMON`
   manquantes (`VIEW`, `READ`, `UNREAD`, `READ_ALL`, `REQUESTS`,
   `PROCESSING`, `FINALIZATION` — 1er vrai consommateur i18n du kernel
   `TYPE_REPORT_LABEL`). ✅
7. **Mock backend** — pas de nouveau marqueur `rel()` nécessaire (les deux
   entités sont sur `AUTH_API_URL`, déjà couvert par le marqueur `auth/`
   existant). Seed `messaging` référençant directement les régions/
   départements déjà seedés (cascade cohérent sans duplication de jeu de
   données) ; seed `notifications` avec `model_type` PascalCase fidèle au
   mapper réel. Testé de bout en bout via `curl` (list/find-one/create/
   update/delete messaging, read/read-all notifications). Confirmé au
   passage : aucun filtrage query params n'est implémenté côté mock sur
   TOUT le fichier (précédent constant depuis `users`/`access-logs`) —
   pagination brute sur le seed complet, cohérent avec l'existant plutôt
   qu'une exception isolée pour ce module. ✅
8. **Validation & livraison** — `tsc --noEmit` clean, `eslint
   --max-warnings=0` clean sur les 4 libs et sur l'app. `ngc
   --strictTemplates` clean (0 erreur) — exécuté après le câblage Phase 6,
   donc les templates `messaging-form`/`messaging-list`/
   `notifications-list` sont réellement atteints par le compilateur
   (vérifié en confirmant leur présence dans `dist/out-tsc` après
   compilation), contrairement à un run pendant la Phase 5 qui n'aurait
   rien prouvé (routes pas encore câblées). ✅

## Bilan réel

Premier module du projet à introduire une dépendance cross-scope
explicite (`communication` → `administrative-boundary`), rompant
sciemment un invariant tenu sur 4 modules précédents — décidé avec
l'utilisateur plutôt qu'unilatéralement, et documenté à l'endroit exact
de la règle (`eslint.config.mjs`) pour que la prochaine lecture du fichier
comprenne le pourquoi sans avoir à relire cette doc. Aussi le premier
module où une action de menu contextuel (`notifications.markAsRead`) est
née du remplacement d'un flux mort du source plutôt que de sa
reproduction — cohérent avec la posture actée en début de projet
(analyser/critiquer, ne pas recopier les incohérences du source) et avec
le précédent `access-logs`/`profiles-permissions-permissions` de
`settings-security` (décisions de reconstruction surfacées, pas devinées).
