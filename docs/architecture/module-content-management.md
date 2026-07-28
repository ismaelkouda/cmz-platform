# Module `content-management` — plan de reconstruction

- **Créé :** 2026-07-28
- **Statut :** livré — **6 entités CRUD** (`home`, `slide`, `news`,
  `legal-notice`, `privacy-policy`, `terms-use`) + 1 concept annexe
  (`news-categories-select`). Phases 1 à 8 complètes. `tsc --noEmit` +
  `eslint --max-warnings=0` clean sur les 4 libs et sur l'app ; mock backend
  testé de bout en bout (list/find-one/create/update/delete/enable/disable/
  publish/unpublish/select-catégories) via `curl` en session. `ngc
  --strictTemplates` et `nx lint`/`nx serve` restent à confirmer côté
  utilisateur (bun indisponible dans ce bac à sable).
- **Gabarit de référence :** `module-team-organization.md` — même archétype
  CRUD (props → entités → contrats/vo → repositories → data → application →
  UI Signal Forms), même discipline de normalisation CQRS-lite pour toutes
  les commandes.
- **Contrats d'archétype :** [`archetypes/`](./archetypes/README.md) —
  réutilisés tels quels.

## Choix de périmètre (décisions utilisateur explicites)

Deux décisions ont été surfacées via `AskUserQuestion` avant de coder, plutôt
que supposées :

1. **Domaine suivant** (après livraison de `administrative-infrastructure`,
   `administrative-boundary`, `authentication`, `coverage-areas`,
   `team-organization`) : proposition de 3 domaines « pattern éprouvé »
   restants (`content-management` [6 entités], `settings-security` [2],
   `communication/messaging` [1]) — **`content-management`** choisi comme plus
   gros lot homogène restant.
2. **Champs `content` (rich text)** : le source utilise un éditeur
   Quill/PrimeNG (`p-editor`) pour `content` sur les 6 entités ; le
   design-system ne possède aucun composant WYSIWYG. Choix explicite :
   **`<textarea>` simple**, pas de nouveau composant `cmz-rich-text-editor`
   construit pour cette passe — cohérent avec la philosophie « ne pas
   construire de composant DS pour un besoin isolé » déjà appliquée ailleurs
   (aperçu carte GeoJSON différé sur `coverage-areas`, arbre de permissions
   aplati sur `team-organization`).

## Forme métier par entité (source lu, pas supposé)

### `home` / `slide` — les deux entités « riches » du module

```ts
interface HomeFindOneProps {
    uniqId: string;
    title: string;
    resume: string;
    order: number;
    platforms: Platform[]; // kernel @cmz/shared-domain, 1er vrai consommateur
    status: HomeStatus; // active/inactive, enum local
    content: string;
    image: string;
    timeDurationInSeconds: number; // display-only : pas dans Create/UpdateProps
    buttonLabel: string;
    buttonUrl: string;
    startDate: Date;
    endDate: Date;
}
```

`slide` est la même famille de champs, avec en plus `type: TypeMedia`
(image/vidéo, exclusif) et `subtitle`, sans `resume`/`timeDurationInSeconds`
figé (`timeDuration` est ici un vrai champ éditable, contrairement à `home`).

**Règle de repository établie ce module** — Props vs. ValidateContract en
entrée de `create`/`update` : le port de repository prend les **Props**
domaine déjà construites (transformation réelle appliquée) uniquement quand
une transformation a effectivement lieu. `home`/`slide` convertissent
`startDate`/`endDate` (chaînes) en un objet `DatePeriod` (kernel,
`@cmz/shared-domain`, 1er vrai consommateur) — leur port prend donc
`HomeCreateProps`/`SlideCreateProps` (avec `period: DatePeriod` déjà
construit). Les 4 autres entités (`news`, `legal-notice`, `privacy-policy`,
`terms-use`) ne transforment aucune valeur — leur port prend directement le
`ValidateContract`, sans Props intermédiaire inutile. Cette règle a été
découverte et corrigée en cours de Phase 2 : la génération uniforme initiale
donnait par erreur `ValidateContract` à `home`/`slide` aussi, laissant
`HomeCreateProps` orpheline — corrigé avant que Phase 3 (data) ne parte sur la
mauvaise signature.

**Mappers de commande injectables (exception documentée, étendue ce
module)** : `HomeCreateMapper`/`UpdateMapper` et `SlideCreateMapper`/
`UpdateMapper` sont des classes `@Service()` (pas des fonctions pures) car
elles injectent `ApiDateMapper` (kernel, `@cmz/shared-data`, 1er vrai
consommateur — `.toDateTimeApi(date): string`) pour sérialiser
`period.start`/`.end` en chaînes wire. Même précédent que
`ParticipantsCreateMapper`/`RolesMapper` sur `team-organization`.

**`platforms` en `string[]` sur le wire**, pas `PlatformDto[]` — `PlatformDto`
est un enum TS nominal non structurellement assignable depuis le type
littéral `Platform` du domaine ; corrigé en `string[]` sur les 4 DTOs
concernés (`HomeItemApiDto`, `HomeFindOneItemApiDto`, `HomeCreateApiDto`,
`HomeUpdateApiDto` + équivalents `slide`), même convention que
`report_types`/`operators` sur `team-organization`.

**Incohérence wire conservée** : seul `HomeUpdateApiDto` utilise `uniq_id`
comme identifiant (tous les autres — `slide`/`news`/`legal-notice`/
`privacy-policy`/`terms-use` — utilisent `id`) — vérifiée dans le source,
gardée telle quelle (fidélité au contrat réel).

### `news` — média + catégorie en cascade + hashtags

```ts
interface NewsFindOneProps {
    uniqId: string;
    type: TypeMedia; // image/vidéo, exclusif
    image: string;
    video: string;
    category: string; // porte l'ID ici (détail, pré-remplit le select)
    subCategory: string; // idem
    hashtags: string[];
    title: string;
    resume: string;
    content: string;
    status: NewsStatus; // publish/unpublish
}
```

**Divergence liste/détail volontaire sur `category`/`subCategory`** — même
précédent que `participants.team` sur `team-organization` : la liste
(`NewsProps.category`/`.subCategory`) porte le **nom**, le détail
(`NewsFindOneProps`) porte l'**id** (pré-remplit le select en cascade).
**Bug de null-safety corrigé** au passage : le mapper source ne gardait
l'optional-chaining que sur un des deux champs (`dto.category.id` sans `?.`
par endroits) — les deux champs sont désormais systématiquement
optional-chainés.

**Concept annexe `news-categories-select`** : select seul, pas de CRUD
catégories (ni dans le source, ni ici) — même précédent que
`TeamsSelectRepository`/`SiteGroupSelectRepository`. Domaine :
`NewsCategoryOption extends SelectOption { subCategories: SelectOption[] }`.
Les entités `CategoryEntity`/`SubCategoryEntity` du source sont du **code
mort** (vérifié : non référencées ailleurs dans tout le repo source) — non
portées. DTO non récursif côté data (`NewsCategorySelectItemApiDto` /
`NewsSubCategorySelectItemApiDto`, deux types distincts) — corrige un type
source imprécis qui réutilisait le même type auto-référencé pour les
sous-catégories (qui n'ont elles-mêmes pas de sous-catégories).
`NewsCategoriesSelectMapper extends SimpleResponseMapper<...>` traite le
tableau entier comme un item unique à aplatir en un seul passage — même
correctif que `TeamsPermissionsMapper`.

### `legal-notice` / `privacy-policy` / `terms-use` — 3 documents identiques

```ts
interface XFindOneProps {
    uniqId: string;
    version: string;
    content: string;
    status: XStatus; // publish/unpublish — enum LOCAL à chaque entité
}
```

Forme byte-identique × 3, générée par une seule fabrique de codegen
paramétrée. **Bug source corrigé au passage** :
`terms-use-find-one-props.interface.ts` importait par erreur le statut de
`privacy-policy` — chaque entité importe désormais uniquement son propre enum
(cf. « chacun le sien » ci-dessous).

## Décisions actées, communes aux 6 entités

- **« Chacun le sien »** (réaffirmé, précédent déjà établi sur
  `team-organization`/`coverage-areas`) : chaque entité a son **propre** enum
  de statut local, même quand il est byte-identique en forme à celui d'une
  entité sœur du même module (`HomeStatus`/`SlideStatus` : active/inactive ;
  `NewsStatus`/`LegalNoticeStatus`/`PrivacyPolicyStatus`/`TermsUseStatus` :
  publish/unpublish) — jamais consolidé en enum partagé. C'est cette règle
  qui a fait apparaître organiquement le bug d'import croisé
  `terms-use`/`privacy-policy` mentionné plus haut.
- **Normalisation CQRS-lite uniforme** : le source ne modélise en
  contract/validate-contract/validator/vo que `create`/`update` ; toutes les
  autres commandes (`delete`, `enable-disable-or-publish-unpublish`,
  `filter`, `find-one-filter`) sont de simples DTOs applicatifs côté source.
  Normalisées ici au même pattern complet pour les 6 entités — même
  précédent que la normalisation `enable`/`disable` sur `team-organization`.
- **Fichiers upload** : `home.image`, `slide.image`, `news.image` en
  `<input type="file">` natif hors `[formField]` (Signal Forms ne bind pas
  les fichiers), requis en création seulement — même précédent que
  `optical-fiber-network.geomFile`. `buildFormData` (kernel, précédent
  `geom_file`) pour les payloads create/update de ces 3 entités ;
  `buildHttpPayload` (précédent `radio-relay-links`) pour les 3 entités
  document (JSON simple, pas de fichier).
- **`PLATFORM_OPTIONS`** ajouté au kernel (`@cmz/shared-ui`,
  `platform-label.constant.ts`) — mirroring `REPORT_TYPE_OPTIONS`/
  `TYPE_MEDIA_OPTIONS`, nécessaire pour les cases à cocher `platforms` de
  `home`/`slide` (`PLATFORM_LABEL`/`PLATFORM_STYLE` existaient déjà mais pas
  la forme `{value,label}[]`).
- **Hashtags** (`news`) : saisie libre + puces manuelles (pas de composant DS
  dédié) — même esprit « pas de composant neuf pour un besoin isolé » que la
  décision rich-text.
- **Dates** (`home`/`slide`) : `startDate`/`endDate` modélisées en chaîne
  `YYYY-MM-DD` côté formulaire (`<input type="date">` lié nativement via
  `[formField]`) — même précédent que `radio-relay-links-form.store.ts`.
  Contrairement à `radio-relay-links` (conversion en `Date` au submit), le
  contrat `home`/`slide` attend directement une **chaîne** (`DatePeriod.create`
  la parse côté domaine) — pas de conversion `new Date(...)` au submit ici.
- **Paire `buttonLabel`/`buttonUrl`** (`home`/`slide`) : optionnelle mais
  complète — `assertButtonPairComplete` (domaine, partagé entre les deux
  entités) + `validate()` croisé dupliqué côté formulaire
  (`ctx.valueOf(schema.buttonLabel)`) pour un retour immédiat.
- **Média exclusif image/vidéo** (`slide`/`news`) : `assertValidMediaPair`
  (domaine, partagé) + `validate()` croisé côté formulaire
  (`ctx.valueOf(schema.type)`) — 1er usage projet de lecture croisée de champ
  en Signal Forms, vérifié directement dans le `.d.ts` du package
  (`@angular/forms/signals`, méthode `valueOf` du contexte de validation)
  avant utilisation.
- **`SETTINGS_API_URL`** réutilisé pour les 7 endpoints (`cms/*`) — le
  `CONTENT_MANAGEMENT_BASE_URL` du source est du code mort (déclaré, jamais
  fourni/consommé ; le vrai `HomeApi` source injecte déjà
  `SETTINGS_API_URL`), non porté.

## Hors périmètre (décision explicite)

- Éditeur de texte riche (Quill/WYSIWYG) — `<textarea>` simple à la place
  (cf. décision utilisateur ci-dessus).
- Aperçu image/vidéo en direct dans le formulaire — non reconstruit (mention
  textuelle « une image/vidéo existe déjà » en mode édition/détails, même
  esprit que `optical-fiber-network.geomFile`).

## Phases

1. **Scaffolding Nx** — 4 libs (`domain/data/application/ui`), tags
   `scope:content-management`, `tsconfig.base.json` + `eslint.config.mjs`
   mis à jour. ✅
2. **Domaine** — enums, props, entités, contrats/validate-contracts,
   validateurs (dont `assertButtonPairComplete`/`assertValidMediaPair`
   partagés), value-objects, repositories (ports) pour les 6 entités +
   `news-categories-select`. Correction Props-vs-ValidateContract appliquée
   en cours de phase (cf. ci-dessus). 213 fichiers. ✅
3. **Data** — DTOs wire, mappers (`HomeCreateMapper`/`SlideCreateMapper` en
   classes injectables, le reste en fonctions pures), sources HTTP
   (`SETTINGS_API_URL`), repository impls. Correction `platforms: string[]`
   appliquée en cours de phase. 138 fichiers. ✅
4. **Application** — use-cases + facades (`ResourceFacade`/
   `CollectionResourceFacade`) pour les 6 entités + `news-categories-select`.
   27 fichiers. ✅
5. **UI (Signal Forms)** — presenters/VM, stores de filtre et de formulaire,
   composants liste/formulaire, routes. `platforms` en cases à cocher,
   upload fichier natif, `type` média piloté par `validate()` croisé,
   catégorie/sous-catégorie en cascade, hashtags en puces, dates en
   `<input type="date">`, paire bouton validée en croisé. Décision
   rich-text actée avant de coder cette phase. ✅
6. **Câblage app + i18n** — `provideContentManagement()` (13 ports → impls
   data), routes `content-management/{home,slide,news,legal-notice,
   privacy-policy,terms-use}`, namespace `CONTENT_MANAGEMENT.*` + constantes
   `COMMON.*` manquantes (`PUBLISH/UNPUBLISH`, `MOBILE/WEB/PWA`,
   `IMAGE/VIDEO` et leurs `_STYLE`) ajoutées à `fr.translation.ts`. ✅
7. **Mock backend** — seed des 6 entités + catégories, dispatcheur CRUD
   générique `handleCmsEntity()` (factorisé plutôt que dupliqué 6 fois :
   liste paginée, find-one, store, update, delete, on/off-action
   paramétrable enable/disable ou publish/unpublish). Testé de bout en bout
   via `curl` en session (list/find-one/create/update/delete/enable/
   disable/publish/unpublish sur les 6 entités + select catégories). ✅
8. **Validation & livraison** — `tsc --noEmit` clean sur les 4 libs et sur
   l'app, `eslint --max-warnings=0` clean. ✅ — `ngc --strictTemplates` (bun
   indisponible dans ce bac à sable) et `nx lint`/`nx serve` restent à
   confirmer côté utilisateur.

## Bilan réel

Module le plus volumineux traité à ce jour (6 entités, ~16 % de la base
source d'après la classification initiale) mais aussi le plus homogène :
l'essentiel de la charge est mécanique (codegen déclaratif par entité), le
travail réellement engineering étant concentré sur (1) la décision de scope
rich-text, tranchée en amont plutôt que devinée, (2) la règle
Props-vs-ValidateContract, détectée et corrigée avant qu'elle ne se propage
en Phase 3, et (3) le premier usage projet de lecture croisée de champ en
Signal Forms (`ctx.valueOf`), vérifié dans les types du package avant
d'écrire le code plutôt que supposé. Comme pour les modules précédents, la
classification automatique du source a servi de point de départ, pas de
vérité à exécuter sans lecture directe.
