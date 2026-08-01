# Module `dashboard` — plan de reconstruction

- **Créé :** 2026-07-28
- **Statut :** livré, **validation technique complète** — **Module IR clôturé**
  (corpus 25 paires, Meta 12/12, sous-graphe `aggregated_stats_view`). 1 entité
  (lecture seule, objet unique agrégé — pas de liste). Phases 1 à 8 complètes.
  `tsc --noEmit` + `eslint --max-warnings=0` clean sur les 4 libs et sur l'app ;
  `ngc --strictTemplates` clean (0 erreur), confirmé significatif : la page est
  désormais la redirection par défaut de l'app (`''` → `dashboard`), donc
  atteinte par le compilateur dès la Phase 6. Mock backend testé via `curl`.
- **Gabarit de référence :** `module-communication.md` pour l'archétype général
  ; `access-logs` (`settings-security`) pour le précédent « entité 100% lecture
  seule, `ResourceFacade` plutôt que `Collection`/ `Paginated` ».

## Forme métier

```ts
interface DashboardProps {
    totalReports: number;
    reportsByType: Record<ReportType, number>; // ABI/ZOB/CPS/CPO
    totalReportsPending: number;
    totalReportsInProcessing: number;
    totalReportsRejected: number;
    totalReportsFinalized: number;
    totalReportsEvaluated: number;
    treatmentRate: number;
    completionRate: number;
    averageTreatmentTime: number;
    responseTime: number;
    lastRefreshAt: string;
}
```

Objet agrégé unique (pas d'entité paginée) — `DashboardRepository` n'a qu'une
méthode `execute(filter, options?)`, filtrée par `period` (fenêtre glissante en
jours : 7/30/60/90). `DashboardFacade` étend `ResourceFacade` (même archétype
que `MessagingFindOneFacade`), pas `Collection`/`PaginatedResourceFacade`.

### Champs retirés (confirmés morts par grep sur tout le repo source)

`partialOperatorReports`/`whiteZoneReports`/`partialSignalReports`/
`noInternetReports` (top-level, remplacés par `reportsByType`),
`pendingReports`/`approvedReports`/`rejectedReports`/`inTreatmentReports`/
`closedReports`/`totalActive` (getter dérivé), `approvalRate`. Aucun de ces
champs n'est lu par `DashboardPageComponent`, y compris dans
`performanceStatistics` (calculé côté source mais jamais rendu dans le template
— cf. décision « section performance complétée » ci-dessous).

### `reportsByType: Record<ReportType, number>`

Remplace 4 champs séparés (`total_cpo_reports`/`total_zob_reports`/
`total_cps_reports`/`total_abi_reports`) dont les noms domaine source
(`partialOperatorReports` etc.) ne faisaient que paraphraser l'acronyme sans
ajouter de sens. Réutilise le kernel `ReportType` (`@cmz/shared- domain`), déjà
posé et déjà consommé ailleurs (filtres `messaging`/etc.) — même réflexe que
`TypeReport` sur `communication/notifications`.

### Bug source corrigé : décalage `totalReportsInProcessing`/`totalReportsRejected`

Le mapper source alimentait `totalReportsInProcessing` avec
`dto.total_request_report_rejected` et `totalReportsProcessed` (renommé ici
`totalReportsRejected`) avec `dto.total_reports_in_processing` — un décalage
d'un cran entre 3 champs wire et 2 champs domaine. **Aucun champ wire ne
représente réellement des signalements « traités »** : le seul champ restant
après correction du décalage désigne des signalements REJETÉS
(`total_request_report_rejected`). Corrigé par correspondance de nom
(`total_reports_in_processing` → `totalReportsInProcessing`,
`total_request_report_rejected` → `totalReportsRejected`) plutôt que de
position. Conséquence UI : la carte anciennement « TREATED » (icône « cog » qui
tournait, couleur `warning`) devient « REJECTED » (icône « times-circle »,
couleur `danger`) ; la carte « IN_PROGRESS » récupère l'icône « cog qui tourne »
qui lui correspond mieux sémantiquement que `pi-times`/`danger` (hérité de
l'ancien décalage).

### `totalReports` : `number`, pas `string`

Le mapper source applique `separatorThousands` (formatage de présentation)
directement dans la couche data — un concern qui n'a rien à faire hors de l'UI.
Corrigé : la valeur reste numérique jusqu'à l'UI, qui applique
`ThousandsSeparatorPipe` (kernel `@cmz/shared-ui`, jamais consommé jusqu'ici —
1er vrai consommateur).

## Décisions actées

- **Section « performance » complétée, pas juste reprise** — le source calculait
  `performanceStatistics` (`treatmentRate`/`completionRate`/
  `averageTreatmentTime`/`responseTime`) dans
  `DashboardPageComponent.generateStatistics()`, mais son template HTML
  n'affichait que `typeStatistics`/`taskStatusStatistics` : la section n'était
  JAMAIS rendue. Les données sont correctes et la logique de formatage
  (`%`/`j`/`h`) déjà écrite — traité comme une fonctionnalité oubliée à
  l'intégration plutôt qu'une section désactivée volontairement, donc complétée
  (le template la rend désormais).
- **Cartes task-status cliquables** — navigation vers les modules workflow /
  `report-states` reconstruits ; sémantique corrigée vs legacy.
- **Redirection par défaut de l'app changée** (`'' → 'dashboard'`, remplace
  `'equipments/types'`) — ce dernier n'était qu'un choix par défaut faute
  d'accueil reconstruit ; un tableau de bord est le point d'entrée naturel d'un
  back-office. Décision prise et documentée en commentaire plutôt que soumise en
  question : changement d'une ligne, trivialement réversible, et laisser un
  tableau de bord fonctionnel inatteignable par défaut aurait été le pire des
  deux choix.
- **`InvalidPeriodError` aligné sur `DomainError`** (`code`/`messageKey`/
  `statusCode`), pas la classe `Error` nue `InvalidFilterError` du source —
  cohérence avec `GenericRequiredError`/`TypeRequiredError` du reste du
  monorepo.
- **Libellés de période réels** — le source affichait la valeur brute
  (`'7'`/`'30'`/`'60'`/`'90'`) comme libellé du sélecteur (`period.const.ts` :
  `label === value`), pas un vrai texte. Corrigé avec de vraies clés i18n (« 7
  derniers jours », etc.).
- **1er skeleton de chargement du monorepo** — reconstruit sans PrimeNG
  (`animate-pulse` Tailwind + tokens `--cmz-*`), un seul gabarit de section
  répété (5/5/4 cartes) plutôt que la duplication HTML du source.

## Phases

1. **Scaffolding Nx** — 4 libs, tags `scope:dashboard` (isolation classique :
   dépend seulement de lui-même + `scope:shared`, pas de dépendance cross-scope
   contrairement à `communication`). ✅
2. **Domaine** — `Period` (enum wire-first + guard), `DashboardProps` nettoyé
   (champs morts retirés, `reportsByType` introduit, bug de décalage documenté
   et corrigé), `InvalidPeriodError`, validateur + vo, `DashboardRepository`
   (port, `execute()` unique). ✅
3. **Data** — `DashboardItemApiDto` (wire fidèle, mix snake_case/ camelCase
   confirmé dans le source), `DashboardMapper` (correction du décalage par
   correspondance de nom), `DashboardApi` sur `REPORT_API_URL` (1er module à
   l'utiliser), `DashboardRepositoryImpl`. ✅
4. **Application** — `DashboardUseCase` (defer + vo) + `DashboardFacade`
   (`ResourceFacade`, objet unique). ✅
5. **UI** — `DashboardPresenter` (3 sections de cartes),
   `ThousandsSeparatorPipe` (1er consommateur), `DashboardSkeletonComponent`
   (1er skeleton du monorepo), `DashboardPageComponent` (sélecteur de période,
   bouton actualiser, 3 sections de cartes — dont la section performance
   complétée). ✅
6. **Câblage app + i18n** — route `dashboard` + redirection par défaut changée,
   `provideDashboard()`, namespace `DASHBOARD.*` dans `fr.translation.ts`. ✅
7. **Mock backend** — nouveau marqueur `report/` dans `rel()` (1er module sur
   `REPORT_API_URL`) ; `GET report/statistics` retourne un objet unique dont
   `last_refresh_at` est recalculé à chaque requête (le bouton « actualiser »
   montre une vraie différence). Pas de filtrage sur `period` (précédent
   constant sur tout le fichier). Testé via `curl`. ✅
8. **Validation & livraison** — `tsc --noEmit` + `eslint --max-warnings=0` clean
   sur les 4 libs + l'app + `tools/mock- server.mjs`. `ngc --strictTemplates`
   clean (0 erreur) — significatif dès la Phase 6 puisque `dashboard` est
   désormais la page d'accueil par défaut, donc immédiatement atteinte par le
   compilateur. ✅

## Bilan réel

Module le plus petit du projet en nombre de fichiers, mais avec une densité de
décisions inhabituelle pour sa taille : un vrai bug de décalage de mapping (3
champs wire pour 2 champs domaine) qui change le sens d'une carte utilisateur («
traité » devient « rejeté »), une section entière de l'UI source jamais branchée
et complétée plutôt que reproduite à l'identique, et une décision de portée
applicative (changer la route par défaut de tout l'app) prise et documentée
plutôt que silencieusement appliquée ou reportée. Premier module sans dépendance
cross-scope (`scope:dashboard` isolé, contrairement à `communication` →
`administrative-boundary`) et premiers consommateurs réels de deux utilitaires
kernel jusque-là posés sans usage (`ThousandsSeparatorPipe`, `REPORT_API_URL`).
