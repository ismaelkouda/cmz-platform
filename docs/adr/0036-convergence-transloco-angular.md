# ADR-0036 — Convergence de tout l'Angular du repo sur Transloco

- **Statut :** Accepted
- **Date :** 2026-08-27

## Contexte

ADR-0024 avait tranché de découpler `TranslationPort` (interface pure) de
son jeton d'injection Angular, motivé par un futur adaptateur React sur le
même contrat portable (`I18nextTranslationService` comme adaptateur Angular
sur i18next, moteur agnostique). Ce mécanisme était en place dans
`backoffice-angular` : **101 fichiers** consommateurs mesurés
(`inject(TRANSLATION_PORT)`), un bundle FR de ~3087 lignes réparti en 5
packs TypeScript imbriqués, mono-langue (FR uniquement — aucun sélecteur de
langue n'a jamais été câblé en UI malgré l'infrastructure multilingue).

En parallèle, deux apps de test (`newsletter-test` en Angular,
`newsletter` en React) ont été bâties avec **Transloco** (Angular) et
**react-i18next** (React) — voir
[`i18n-generator-scope.md`](../architecture/i18n-generator-scope.md) — sur
décision explicite de l'utilisateur, motivée par la facilité d'automatisation
(schematic Nx officiel `@jsverse/transloco:ng-add`) et la minimisation de
l'action humaine. Cette décision créait une divergence assumée et
documentée : deux mécanismes i18n Angular coexistant dans le même repo
(`i18next`/`TranslationPort` dans `backoffice-angular`, Transloco dans
`newsletter-test`).

Cette coexistence n'était pas destinée à durer indéfiniment —
`i18n-generator-scope.md` la documentait explicitement comme « une décision
future distincte, pas actée » quant à sa consolidation. L'utilisateur a
tranché cette question : **Angular doit utiliser Transloco**, sans
exception, y compris dans `backoffice-angular`.

## Options envisagées

### Option A — Ne rien migrer, documenter la coexistence comme durable

- Avantages : aucun risque de régression sur les 101 sites de
  `backoffice-angular`, déjà en état de marche.
- Inconvénients : deux mécanismes i18n Angular actifs dans le même repo,
  contradictoire avec l'objectif d'un unique golden reference Angular/Nx
  cohérent. Rejeté explicitement par l'utilisateur.

### Option B — Migrer `newsletter-test` vers `TranslationPort`/i18next

- Avantages : aligne le POC sur le pattern déjà établi en production
  (ADR-0024), zéro migration sur `backoffice-angular`.
- Inconvénients : perd le bénéfice explicitement recherché par le choix
  initial de Transloco (schematic Nx officiel, moins d'action humaine).
  Rejeté explicitement par l'utilisateur.

### Option C — Migrer `backoffice-angular` vers Transloco (101 fichiers)

- Avantages : un seul mécanisme i18n Angular dans tout le repo. Transloco
  reste le choix motivé par l'automatisation (schematic officiel) partout,
  cohérent avec la direction déjà prise sur les apps de test.
- Inconvénients : migration de grande ampleur (101 fichiers consommateurs,
  ~3087 lignes de traduction à convertir, composition root à réécrire) —
  risque de régression si non vérifié rigoureusement à chaque étape.

## Décision

**Option C.** `backoffice-angular` migre intégralement de
`TranslationPort`/i18next vers Transloco. `TranslationPort`,
`TRANSLATION_PORT`, `I18nextTranslationService` et `provideI18n()` sont
**supprimés** du repo — pas dépréciés, pas laissés en parallèle. Transloco
devient l'unique mécanisme i18n pour tout Angular de ce repo.

## Justification

L'utilisateur a explicitement qualifié `backoffice-angular` de terrain
d'exercice technique (« un projet jetable tout comme ce qu'on fait
actuellement ») plutôt que d'un système de production à protéger à tout
prix — la priorité est la maîtrise du concept et la cohérence de la
plateforme, pas la prudence extrême qu'imposerait un vrai chantier de prod
irréversible. Une migration mécanique bien vérifiée (build + lint + test à
chaque étape) est le choix cohérent avec cette posture, plutôt qu'une
migration progressive étalée par petits lots.

Le remplacement s'est avéré mécaniquement sûr car `TranslationPort.translate(key,
params?)` et `TranslocoService.translate(key, params?)` partagent une
signature identique — aucun site d'appel `this.i18n.translate(...)` n'a dû
être réécrit, seul le token/type d'injection a changé
(`inject(TRANSLATION_PORT)` → `inject(TranslocoService)`). Un codemod a
traité 98 des 101 fichiers automatiquement ; les 3 exceptions (import par
chemin relatif au lieu de l'alias `@cmz/shared-application`, un service
`UiFeedbackService` injectant directement `I18nextTranslationService` par
classe plutôt que via le port, et des specs mockant le token) ont été
corrigées manuellement après audit.

## Conséquences

### Positives

- Un seul mécanisme i18n Angular dans tout le repo — plus de divergence à
  arbitrer ou à expliquer à un futur lecteur du code.
- Le schematic officiel `@jsverse/transloco:ng-add` devient la voie
  d'installation standard pour toute future app Angular du repo, cohérent
  entre `newsletter-test` et `backoffice-angular`.
- `check-framework-purity.mjs` (garde-fou `type:domain`/`type:constants`)
  n'est pas affecté : `libs/shared/application` (où vit désormais l'import
  direct de `TranslocoService` dans `collection-resource.facade.ts` et
  `ui-feedback.service.ts`) est taguée `type:application`, hors du
  périmètre de ce garde-fou — vérifié explicitement avant migration.
- Migration vérifiée par un cycle complet réel : `nx run
  backoffice-angular:build` (production, `ngc --strictTemplates` inclus),
  `nx run backoffice-angular:lint` (`--max-warnings=0`), `nx run
  backoffice-angular:test` (14 fichiers, 57 tests, tous verts).

### Négatives / dette acceptée

- `libs/shared/application` (`type:application`) importe désormais
  directement `@jsverse/transloco`, une dépendance framework concrète,
  plutôt qu'une interface portable comme le préconisait le principe général
  d'ADR-0024. C'est un compromis assumé : le bénéfice de portabilité
  React n'a jamais été réalisé en pratique (aucun adaptateur React sur
  `TranslationPort` n'a jamais existé), et le coût de maintenir
  l'indirection interface+token pour un bénéfice hypothétique n'était plus
  jugé justifié une fois la décision de converger sur Transloco actée.
- `backoffice-angular` reste mono-langue (FR uniquement) après migration —
  la migration a porté sur le mécanisme, pas sur l'ajout d'une deuxième
  langue. `newsletter-test` reste la seule app avec un vrai sélecteur de
  langue FR/EN câblé en UI.
- Le bundle FR de `backoffice-angular` (1846 clés) est désormais un fichier
  JSON unique de ~3000 lignes (`public/i18n/fr.json`), converti
  mécaniquement depuis les 5 packs TypeScript ≤800 lignes chacun — pas
  redécoupé en scopes Transloco (`TRANSLOCO_SCOPE`) à la date de cette
  décision. Redécouper en scopes par domaine métier reste possible plus
  tard si la taille du fichier unique devient un problème réel (chargement,
  lisibilité), mais n'a pas été fait ici faute de besoin démontré.

### Points à réévaluer

- Si `react-i18next` (déjà en place sur `newsletter`) devait un jour
  partager un contrat de traduction avec Angular (ex. clés communes,
  synchronisation de traductions), il faudra concevoir cette portabilité
  au niveau du contenu JSON (déjà partiellement compatible — même syntaxe
  `{{var}}`), pas au niveau du mécanisme d'injection Angular : ADR-0024
  avait raison sur le principe (jeton de classe Angular non portable), seul
  son bénéfice concret ne s'est jamais matérialisé ici.
- Si `backoffice-angular` doit un jour ajouter une deuxième langue en
  production, le fichier `fr.json` monolithique pourrait justifier un
  découpage en scopes Transloco par domaine (`TRANSLOCO_SCOPE`, chargement
  à la demande par route) plutôt qu'un chargement complet à chaque visite.

## Références

- [ADR-0024](./0024-decouplage-di-ports-shared.md) — décision remplacée
  pour le port `TranslationPort` (les 7 autres ports du Chantier Q restent
  inchangés, cette ADR ne les concerne pas).
- [`i18n-generator-scope.md`](../architecture/i18n-generator-scope.md) —
  pattern de référence Transloco/react-i18next, pièges rencontrés
  (assets Vite vs Angular, schematic `@Injectable`), audit de conformité
  version-spécifique (Angular 22.0.7, React 19.2.8).
- [Doc officielle Transloco](https://jsverse.gitbook.io/transloco) — schematic
  `ng-add`, Translation API, Signals API (`translateSignal`, `activeLang`).
