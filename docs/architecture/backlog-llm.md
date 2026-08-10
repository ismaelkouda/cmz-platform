# Backlog exécutable — cmz-platform

- **Généré :** 2026-08-10, à partir de `taches-restantes.md` (journal d'audit
  narratif — source du raisonnement et des preuves, non destiné à
  l'exécution directe).
- **Destinataire :** agent LLM exécutant les tâches une à une, sans contexte
  de conversation préalable.
- **Règles de lecture pour l'agent qui exécute ce fichier :**
  1. Chaque tâche est autonome : ne pas supposer de contexte au-delà de ce
     qui est écrit dans la tâche elle-même.
  2. Exécuter les tâches dans l'ordre des sections (P0 avant P1 avant P2).
     Au sein d'une section, l'ordre n'a pas d'importance sauf mention
     contraire.
  3. Une tâche est terminée seulement quand son "Critère de succès" est
     vérifié par une commande ou une inspection reproductible — pas sur
     déclaration.
  4. Ne pas modifier de fichier hors de la liste "Fichiers concernés" sans
     que la tâche le demande explicitement.
  5. Si une tâche s'avère impossible à réaliser telle qu'écrite (fichier
     déplacé, prérequis manquant), arrêter cette tâche, ne pas improviser
     de solution alternative non décrite, et signaler le blocage.
  6. Les tâches marquées **[MÉMO]** ne demandent pas de coder une solution :
     elles demandent de produire un document d'options pour qu'un humain
     tranche ensuite. Ne jamais choisir à la place de l'humain sur ces
     tâches, même si une option semble évidente.

---

## P0 — bloquant, à traiter en premier

### P0-1 — Étendre `pathsGuard` aux routes non protégées ou documenter l'exemption

**Constat :** dans `apps/backoffice-angular/src/app/app.routes.ts`, seules 4
routes (`report-states`, `processing`, `requests`, `finalization`, lignes
61-94) ont `canActivate: [pathsGuard]`. Les routes suivantes n'ont **aucune**
garde au-delà de l'authentification générale (`authGuard` sur le parent) :
`equipments/types`, `equipments/list`, `territorial-structures/regions`,
`territorial-structures/departments`, `territorial-structures/municipalities`,
`coverage-areas/site-groups`, `coverage-areas/mobile-networks`,
`coverage-areas/optical-fiber-networks`, `coverage-areas/radio-relay-links`,
`team-organization/participants`, `team-organization/teams`,
`team-organization/agents-performances`, `team-organization/daily-goal`,
`content-management/home`, `content-management/slide`,
`content-management/news`, `content-management/legal-notice`,
`content-management/privacy-policy`, `content-management/terms-use`,
`settings-security/users`, `settings-security/profiles-permissions`,
`settings-security/access-logs`, `communication/messaging`,
`communication/notifications`.

**Fichiers concernés :**
- `apps/backoffice-angular/src/app/app.routes.ts` (seul fichier à modifier)
- `apps/backoffice-angular/src/app/guards/paths.guard.ts` (lire seulement,
  ne pas modifier)
- `apps/backoffice-angular/src/app/guards/paths.guard.spec.ts` (lire
  seulement, ne pas modifier)

**Exemple exact de la modification à reproduire.** Une route déjà correcte
(ne pas y toucher, c'est le modèle à copier) ressemble à ceci dans
`app.routes.ts` :

```typescript
{
    path: 'report-states',
    canActivate: [pathsGuard],
    loadChildren: () =>
        import('@cmz/report-states-ui').then(
            (m) => m.REPORT_STATES_ROUTES
        ),
},
```

Une route à corriger ressemble actuellement à ceci (sans la ligne
`canActivate`) :

```typescript
{
    path: 'equipments/types',
    loadChildren: () =>
        import('@cmz/administrative-infrastructure-ui').then(
            (m) => m.INFRASTRUCTURE_TYPE_ROUTES
        ),
},
```

**Instruction, étape par étape :**
1. Ouvrir `apps/backoffice-angular/src/app/app.routes.ts`.
2. Pour chacune des 24 routes listées dans "Constat" ci-dessus, trouver le
   bloc `{ path: '<segment>', loadChildren: ... }` correspondant (le
   `path` doit correspondre exactement à un des 24 segments listés,
   exemple `'equipments/types'`).
3. Dans ce bloc, ajouter une ligne `canActivate: [pathsGuard],`
   immédiatement après la ligne `path: '...',` et avant la ligne
   `loadChildren:`. Ne rien changer d'autre dans le bloc (ne pas toucher à
   `loadChildren`, ne pas toucher aux routes enfants imbriquées comme
   celles de `territorial-structures/regions`).
4. Vérifier qu'`import { pathsGuard } from './guards/paths.guard';` est
   déjà présent en haut du fichier (c'est le cas — ne pas l'ajouter une
   deuxième fois).
5. Ne modifier aucun autre fichier.
6. Exécuter `bunx nx run backoffice-angular:test`.
7. Si des tests échouent avec une erreur liée à `StorePathsService` ou
   `paths()` non défini pour une des 24 routes touchées, ouvrir le fichier
   de test qui échoue et ajouter un mock de `StorePathsService` identique
   à celui utilisé dans `paths.guard.spec.ts` (chercher
   `StorePathsService` dans ce fichier pour voir le modèle exact). Ne pas
   inventer un mock différent.
8. Si un test échoue pour une raison différente de `StorePathsService`,
   arrêter et signaler le blocage sans tenter de corriger autre chose.

**Critère de succès (vérifier les 3 dans l'ordre) :**
1. `grep -c "canActivate: \[pathsGuard\]" apps/backoffice-angular/src/app/app.routes.ts`
   retourne `28` (4 routes déjà correctes + 24 nouvelles).
2. `bunx nx run backoffice-angular:test` se termine sans échec.
3. `bunx nx run backoffice-angular:build` se termine sans erreur.

---

### P0-2 — Corriger le générateur corpus `crud-entity.mjs` (chemin legacy non vérifié)

**Constat :** `tools/corpus/crud-entity.mjs` génère pour chaque paire un
champ `legacy` avec la valeur littérale `legacy/${module}/${item.node}`
(exemple : `legacy/content-management/crud-props`) sans jamais vérifier
que ce chemin existe réellement dans le dépôt legacy référencé par
`SEOS_LEGACY_ROOT`. Ce comportement diffère de `tools/corpus/read-only-view.mjs`,
qui résout un vrai chemin de fichier (exemple :
`src/presentation/pages/dashboard/domain/entities/dashboard.entity.ts`) et
vérifie son existence avant de l'inclure. `tools/corpus/backfill-legacy-ref.mjs`
attache ensuite un `legacy_ref.commit` réel à toutes les paires sans
distinction, y compris celles au chemin `legacy` non vérifié — ce qui donne
une fausse impression de traçabilité vérifiée sur 726 paires réparties dans
10 modules (`administrative-boundary`, `administrative-infrastructure`,
`communication`, `content-management`, `coverage-areas`,
`settings-security`, `team-organization`, `authentication`, `core`,
`shared`).

**Fichiers concernés :**
- `tools/corpus/crud-entity.mjs`
- `tools/corpus/legacy-root.mjs` (fonction `requireLegacyRoot` déjà
  disponible, à réutiliser — ne pas la modifier)
- `corpus/administrative-boundary.pairs.jsonl`,
  `corpus/administrative-infrastructure.pairs.jsonl`,
  `corpus/communication.pairs.jsonl`, `corpus/content-management.pairs.jsonl`,
  `corpus/coverage-areas.pairs.jsonl`, `corpus/settings-security.pairs.jsonl`,
  `corpus/team-organization.pairs.jsonl`, `corpus/authentication.pairs.jsonl`,
  `corpus/core.pairs.jsonl`, `corpus/shared.pairs.jsonl` (régénérés par le
  script, ne pas éditer à la main)

**Bloc de code exact actuellement présent dans `crud-entity.mjs` (fonction
qui construit les paires, boucle `for (const item of nodesToPaths)`), à
localiser avant de modifier quoi que ce soit :**

```javascript
        pairs.push({
            id: pairId,
            legacy: `legacy/${module}/${item.node}`,
            nx: exists ? item.rel : null,
            chain_id: chain.id,
            node: item.node,
            pattern: 'crud-entity',
            module,
            layer: item.layer,
            status: exists ? 'verified' : 'n/a',
            oracle: exists ? layerOracles(module, item.layer) : [],
            verified_at: new Date().toISOString().split('T')[0],
            notes: exists
                ? `Vérifié par l'Oracle Nx Tier 1 pour ${entity}`
                : `Fichier non requis ou optionnel pour ${entity}`,
        });
```

**Instruction, étape par étape :**
1. Ouvrir `tools/corpus/crud-entity.mjs` et localiser exactement le bloc
   ci-dessus (recherche du texte `legacy: \`legacy/${module}/${item.node}\`,`).
2. Remplacer ce bloc entier par la version suivante — seules les lignes
   `legacy`, `status` et `notes` changent, le reste (`nx`, `chain_id`,
   `node`, `pattern`, `module`, `layer`, `oracle`, `verified_at`) reste
   identique à l'original :

```javascript
        pairs.push({
            id: pairId,
            legacy: null,
            nx: exists ? item.rel : null,
            chain_id: chain.id,
            node: item.node,
            pattern: 'crud-entity',
            module,
            layer: item.layer,
            status: 'n/a',
            oracle: exists ? layerOracles(module, item.layer) : [],
            verified_at: new Date().toISOString().split('T')[0],
            notes: 'Correspondance legacy non vérifiable — voir docs/architecture/backlog-llm.md P0-2',
        });
```

3. Ne modifier aucune autre partie du fichier. Ne pas toucher à
   `tools/corpus/legacy-root.mjs` ni à `tools/corpus/read-only-view.mjs`.
4. Régénérer les fichiers corpus avec la commande exacte :
   `bun run corpus:all` (définie dans `package.json`, ligne
   `"corpus:all": "node tools/corpus/emit-all.mjs --verify --structural-only"`
   — fonctionne sans `SEOS_LEGACY_ROOT` défini, ce qui est attendu pour
   cette tâche).
5. Vérifier que les 10 fichiers listés dans "Fichiers concernés" ont bien
   été modifiés par la commande (`git status corpus/`).

**Critère de succès (les 2 vérifiés) :**
1. `grep -rn '"legacy":"legacy/' corpus/administrative-boundary.pairs.jsonl
   corpus/administrative-infrastructure.pairs.jsonl
   corpus/communication.pairs.jsonl corpus/content-management.pairs.jsonl
   corpus/coverage-areas.pairs.jsonl corpus/settings-security.pairs.jsonl
   corpus/team-organization.pairs.jsonl corpus/authentication.pairs.jsonl
   corpus/core.pairs.jsonl corpus/shared.pairs.jsonl` ne retourne aucun
   résultat (plus aucune ligne avec l'ancien format de placeholder).
   → Vérifié : 0 résultat.
2. `node tools/corpus/validate-pair-schema.mjs` se termine sans erreur.
   → Vérifié : `OK — 1510 object(s), 18 file(s)`.

**Historique de résolution (2026-08-10) :** le critère 2 a d'abord
échoué (800 lignes en échec, y compris hors périmètre crud-entity) à
cause d'un défaut préexistant de `docs/architecture/corpus/pair.schema.json`,
non introduit par cette tâche mais qui empêchait son critère de succès
de passer : `id` interdisait `:` (or tous les ids crud-entity utilisent
`chain_id::node`) et `legacy` n'acceptait pas `null` (or c'est
exactement la valeur que cette tâche écrit). Corrigé dans le même
changement (voir `taches-restantes.md` T12-18b, statut **fait**) :
pattern `id` élargi, type `legacy` élargi à `["string","null"]`, et
champ `section` (découvert manquant au passage) ajouté au schéma.
Non-régression vérifiée : `bunx nx run-many -t build --all` (72/72),
`-t lint --all` (72/72), `-t test` sur les 18 modules fonctionnels +
shared + core (tous verts).

---

## P1 — important, à traiter après le P0

### P1-1 — Factoriser la duplication `report-states` ↔ `requests` (fiche "details")

**Constat :** `ReportStatesDetailsEntity`
(`libs/report-states/domain/src/lib/entities/report-states-details.entity.ts`)
et `RequestsDetailsEntity`
(`libs/requests/domain/src/lib/entities/requests-details.entity.ts`) sont
identiques ligne pour ligne après renommage des identifiants. Il en va de
même pour les fichiers de permissions
(`report-states-details-permissions.util.ts` /
`requests-details-permissions.util.ts`), les fichiers de qualification VO,
et les composants dialog UI
(`report-states-details-dialog.component.ts` /
`requests-details-dialog.component.ts`, template HTML identique). Cette
duplication a déjà causé une divergence réelle (voir P1-2 ci-dessous).

**Fichiers concernés (lecture pour comparaison) :**
- `libs/report-states/domain/src/lib/entities/report-states-details.entity.ts`
- `libs/requests/domain/src/lib/entities/requests-details.entity.ts`
- `libs/report-states/domain/src/lib/utils/report-states-details-permissions.util.ts`
- `libs/requests/domain/src/lib/utils/requests-details-permissions.util.ts`
- `libs/report-states/ui/src/lib/features/report-states-details-dialog.component.ts`
- `libs/requests/ui/src/lib/features/requests-details-dialog.component.ts`

**Instruction :** ceci est une tâche de conception architecturale
(introduire une lib `@cmz/shared-workflow` ou équivalent) qui dépasse une
correction ponctuelle. **Ne pas entreprendre la factorisation elle-même
sans validation préalable.** À la place, produire un document
`docs/architecture/factorisation-details-workflow.md` qui liste
précisément : (1) tous les fichiers dupliqués entre `report-states` et
`requests` pour la fonctionnalité "details" (domain + data + application +
ui), avec chemins exacts ; (2) les différences réelles trouvées entre les
deux copies (au-delà du renommage) ; (3) une proposition concrète de
structure pour une lib partagée (nom, couches, ce qui resterait spécifique
à chaque module). Ne pas modifier le code existant dans cette tâche.

**Critère de succès :** le fichier
`docs/architecture/factorisation-details-workflow.md` existe et contient
les 3 sections demandées avec des chemins de fichiers vérifiables.

---

### P1-2 — Corriger la fuite de namespace i18n dans `report-states`

**Constat :** dans le module `report-states`, la fonctionnalité "details"
(dialog, formulaire de qualification, value object) utilise des clés de
traduction préfixées `REQUESTS.DETAILS.*` au lieu de
`REPORT_STATES.DETAILS.*`, alors que le reste du module utilise
correctement le préfixe `REPORT_STATES.*`. Ceci provient d'un copier-coller
du module `requests` sans renommage complet des clés.

**Fichiers concernés (contiennent des clés `REQUESTS.DETAILS.*` à
corriger) :**
- `libs/report-states/domain/src/lib/value-objects/report-states-details-qualification.vo.ts`
- `libs/report-states/domain/src/lib/value-objects/report-states-details-take.vo.ts`
- `libs/report-states/domain/src/lib/value-objects/report-states-details-filter.vo.ts`
- `libs/report-states/ui/src/lib/features/report-states-details-dialog.component.ts`
- `libs/report-states/ui/src/lib/features/report-states-details-edit-fields.component.ts`
- `libs/report-states/ui/src/lib/features/report-states-details-qualification-form.component.ts`
- `libs/report-states/ui/src/lib/constants/report-states-details-callback-type.constant.ts`
- `libs/report-states/ui/src/lib/constants/report-states-details-status-label.constant.ts`
- `libs/report-states/ui/src/lib/constants/report-states-details-tab.constant.ts`
- `libs/report-states/ui/src/lib/constants/report-states-details-reject-motif.constant.ts`

**Instruction :** dans chacun de ces fichiers, remplacer chaque occurrence
littérale de préfixe de clé `REQUESTS.DETAILS.` par `REPORT_STATES.DETAILS.`
(remplacement textuel exact de la sous-chaîne, ne pas toucher au reste de
la clé après le préfixe). Ne pas modifier les fichiers équivalents du
module `requests` (qui utilisent légitimement `REQUESTS.DETAILS.*`).
Vérifier ensuite qu'un catalogue de traduction existe pour ces nouvelles
clés `REPORT_STATES.DETAILS.*` — si le projet a un fichier de traductions
centralisé (rechercher un fichier contenant des clés `REPORT_STATES.` déjà
existantes, probablement un fichier `.ts` ou `.json` de traduction), y
ajouter les clés manquantes en dupliquant leur valeur depuis les clés
`REQUESTS.DETAILS.` équivalentes.

**Critère de succès :** `grep -rn "REQUESTS.DETAILS" libs/report-states/`
ne retourne aucun résultat ; `bun run check:i18n` (ou la commande
équivalente définie dans `package.json`) ne signale aucune clé manquante
introduite par ce changement.

**Historique de résolution (2026-08-10) :** la liste "Fichiers concernés"
ci-dessus était incomplète — le grep exhaustif
(`grep -rln "REQUESTS.DETAILS" libs/report-states/`) a trouvé **15**
fichiers, pas 10 : 5 manquaient (`report-states-details-location-panel.component.ts`,
`report-states-details-photos-panel.component.ts`,
`report-states-details-info-panel.component.ts`,
`report-states-details-qualification.vo.spec.ts`,
`report-states-details-filter.vo.spec.ts`). Les deux `.spec.ts` manquants
assertent sur les chaînes exactes lancées par les `.vo.ts` correspondants
(`toThrow('REQUESTS.DETAILS...')`) — les omettre aurait cassé leurs tests
après correction des `.vo.ts`. Les 15 fichiers ont été corrigés. Catalogue
de traduction identifié : `apps/backoffice-angular/src/app/i18n/fr/fr-pack-04.ts`
(bloc `REPORT_STATES`, `fr-pack-05.ts` contient le bloc `REQUESTS` source).
Bloc `DETAILS` dupliqué depuis `REQUESTS.DETAILS` (valeurs identiques, pas
de réécriture). Vérifié : `grep -rn "REQUESTS.DETAILS" libs/report-states/`
→ 0 résultat ; `bun run check:i18n` → « 0 clé référencée sans définition »
(255 clés non référencées signalées, catégorie d'avertissement
préexistante et sans rapport) ; `bunx nx run report-states-domain:test`
et les tests report-states application/data → tous verts (44 tests, y
compris les `.vo.spec.ts` modifiés). Découverte annexe hors périmètre,
non corrigée ici : `report-states-details-status-label.constant.ts`
(lignes 8-17, non listées dans "Fichiers concernés" et non couvertes par
le préfixe `REQUESTS.DETAILS.`) utilise `REQUESTS.ALL.FILTER.*` sans
équivalent `REPORT_STATES.ALL.FILTER.*` — même classe de bug, préfixe
différent, documenté séparément dans `taches-restantes.md` T12-22.

---

### P1-3 — Confirmer le format réel de `CurrentUser.paths` et sécuriser `pathsGuard`

**Constat :** `pathsGuard`
(`apps/backoffice-angular/src/app/guards/paths.guard.ts`) compare
`route.routeConfig?.path` (un segment nu, exemple `"report-states"`) contre
les valeurs du tableau `paths` retourné par le backend au login. Le fichier
de test `libs/authentication/data/src/lib/mappers/current-user.mapper.spec.ts`
utilise une fixture avec des chemins absolus (`'/admin'`, `'/admin/users'`),
ce qui est un format incompatible avec la comparaison faite par le guard.
Personne n'a confirmé contre une vraie réponse serveur quel format est
réellement utilisé.

**Fichiers concernés :**
- `apps/backoffice-angular/src/app/guards/paths.guard.ts` (lecture seule,
  ne pas modifier la logique de comparaison sans confirmation du format)
- `libs/authentication/data/src/lib/mappers/current-user.mapper.spec.ts`

**Instruction :** cette tâche nécessite un accès à une réponse serveur
réelle de login (environnement de staging), qu'un agent LLM ne peut pas
obtenir seul. **Ne pas deviner le format et ne pas modifier `paths.guard.ts`
sans preuve.** À la place : (1) corriger le commentaire dans
`current-user.mapper.spec.ts` pour indiquer explicitement, en commentaire
au-dessus de la fixture `paths`, que ce format (`'/admin'`) est un choix
arbitraire de test non confirmé contre une vraie réponse serveur, et qu'il
ne doit pas être utilisé comme référence par un futur développeur ; (2)
produire un document `docs/architecture/verification-format-paths.md`
décrivant précisément ce qu'il faut vérifier en staging (se connecter,
inspecter la réponse JSON du endpoint de login, comparer le format du
champ `paths` avec les segments de route utilisés par `pathsGuard`) et
quelles actions corriger selon le résultat.

**Critère de succès :** le commentaire d'avertissement est présent
au-dessus de la fixture `paths` dans `current-user.mapper.spec.ts` ; le
fichier `docs/architecture/verification-format-paths.md` existe avec les
étapes de vérification décrites.

---

### P1-4 — Ajouter les tests manquants sur les use-cases `report-states`

**Constat :** dans `libs/report-states/application/src/lib/use-cases/`, les
fichiers `close-report-states.use-case.ts`,
`download-report-states.use-case.ts`, `evaluate-report-states.use-case.ts`
et `reject-report-states.use-case.ts` n'ont pas de fichier `.spec.ts`
associé, contrairement à `approve-report-states.use-case.ts` qui en a un
(`approve-report-states.use-case.spec.ts`). Les 5 use-cases suivent
exactement le même schéma (méthodes `execute` et `export`, délégation au
repository via `defer`).

**Fichiers concernés :**
- `libs/report-states/application/src/lib/use-cases/approve-report-states.use-case.spec.ts`
  (modèle à suivre, ne pas modifier)
- `libs/report-states/application/src/lib/use-cases/close-report-states.use-case.ts`
- `libs/report-states/application/src/lib/use-cases/download-report-states.use-case.ts`
- `libs/report-states/application/src/lib/use-cases/evaluate-report-states.use-case.ts`
- `libs/report-states/application/src/lib/use-cases/reject-report-states.use-case.ts`

**Instruction :** créer 4 nouveaux fichiers `.spec.ts` (un par use-case
listé), chacun dans le même dossier que le fichier `.ts` correspondant, en
suivant exactement la structure de
`approve-report-states.use-case.spec.ts` : un test qui vérifie que
`execute` délègue au repository avec le filtre validé, un test qui vérifie
la propagation d'erreur via `defer`, et un test qui vérifie que `export`
délègue au repository. Adapter les noms de classes, types et entités
d'exemple à chaque module concerné (`CloseReportStates*`,
`DownloadReportStates*`, `EvaluateReportStates*`, `RejectReportStates*`).

**Critère de succès :** les 4 nouveaux fichiers `.spec.ts` existent ;
`bunx nx run report-states-application:test` passe avec tous les tests
verts, y compris les nouveaux.

---

### P1-5 — Clarifier et tester le cas croisé reject/qualification

**Constat :** dans `libs/report-states/domain/src/lib/utils/report-states-details-permissions.util.ts`
et son équivalent `libs/requests/domain/src/lib/utils/requests-details-permissions.util.ts`,
la fonction `*PermissionsReject` autorise le rejet dès que `status ===
IN_PROGRESS`, sans vérifier `qualificationState` — alors que
`*PermissionsQualify` exige `qualificationState === PENDING`. Aucun test
existant ne couvre le cas où on tente un rejet alors que
`qualificationState` vaut déjà `COMPLETED`.

**Fichiers concernés :**
- `libs/report-states/domain/src/lib/utils/report-states-details-permissions.util.spec.ts`
- `libs/requests/domain/src/lib/utils/requests-details-permissions.util.spec.ts`

**Instruction :** ne pas modifier le comportement de
`*PermissionsReject` (l'absence de condition sur `qualificationState`
semble être un choix voulu, reproduit identiquement dans les deux
modules). Ajouter dans chacun des deux fichiers de test un cas explicite :
vérifier que `*PermissionsReject` retourne `true` quand `status ===
IN_PROGRESS` et `permission === true`, **même si** `qualificationState`
vaut `COMPLETED` — avec un commentaire dans le test expliquant que ce
comportement est intentionnel (le rejet reste possible même après
qualification complétée) et documenté ici pour éviter qu'une future
modification le change par erreur en pensant corriger un bug.

**Critère de succès :** les deux fichiers de test contiennent le nouveau
cas ; `bunx nx run report-states-domain:test` et `bunx nx run
requests-domain:test` passent.

---

## P2 — amélioration, à traiter après P0 et P1

### P2-1 — Aligner les 3 composants dérogeant à la convention Signal Forms

**Constat :** 48 fichiers du projet utilisent l'API Signal Forms
(`@angular/forms/signals`, composant `FormField` via `@cmz/shared-ui`
`FieldComponent`). 3 fichiers dérogent à cette convention et utilisent
`ReactiveFormsModule`/`FormGroup` directement :
`report-states-details-edit-fields.component.ts`,
`requests-details-edit-fields.component.ts`,
`tasks-actions-processing-form-dialog.component.ts`.

**Fichiers concernés :**
- `libs/report-states/ui/src/lib/features/report-states-details-edit-fields.component.ts`
- `libs/requests/ui/src/lib/features/requests-details-edit-fields.component.ts`
- `libs/processing/ui/src/lib/features/tasks-actions-processing-form-dialog.component.ts`
- Exemple de référence Signal Forms à suivre :
  `libs/communication/ui/src/lib/features/messaging-form.component.ts`

**Instruction :** avant de migrer ces 3 fichiers, vérifier s'il existe une
raison technique documentée de ne pas utiliser Signal Forms pour des
formulaires en dialog modal (chercher un commentaire dans ces 3 fichiers
ou dans les fichiers de la lib `@cmz/shared-ui` liés à `FieldComponent`).
Si aucune raison n'est trouvée, migrer les 3 composants vers Signal Forms
en suivant le modèle de `messaging-form.component.ts` (remplacer
`FormGroup`/`FormControl` par la structure de store Signal Forms
équivalente). Si une raison technique réelle empêche la migration
(exemple : `FieldComponent` ne supporte pas un type de champ utilisé ici),
ne pas migrer et ajouter un commentaire au-dessus de la déclaration du
composant expliquant pourquoi ce fichier reste sur `ReactiveFormsModule`.

**Critère de succès :** soit les 3 fichiers utilisent Signal Forms et
`bunx nx run <projet>:test` passe pour chacun des 3 modules concernés,
soit chacun des 3 fichiers a un commentaire explicite justifiant
l'exception.

**Historique de résolution (2026-08-10) :** vérification de l'API
`@angular/forms/signals` (types `FieldTree<T>`/`schema()`) : aucun blocage
technique dur — `FieldTree` est générique et supporte en principe la
composition (sous-formulaire passé à un enfant), et les cases à
cocher/dates ont déjà un précédent Signal Forms fonctionnel dans le repo
(`teams-form.component.ts`, `slide-form.component.ts`). Décision par
fichier :
- `tasks-actions-processing-form-dialog.component.ts` **migré** vers Signal
  Forms (nouveau store `tasks-actions-processing-form.store.ts`, pattern
  `messaging-form.store.ts`). Un problème réel a été détecté et corrigé
  pendant la migration, pas seulement documenté : l'attribut natif
  `maxlength="255"` sur le `<textarea>` du template original est **interdit**
  par le compilateur Angular sur un nœud `[formField]` (erreur NG8022,
  vérifiée via `ngc --strictTemplates`) — remplacé par une règle `validate()`
  déclarative équivalente (`DESCRIPTION_MAX_LENGTH`) plus la clé i18n
  `COMMON.VALIDATION.MAX_LENGTH` (absente du catalogue, ajoutée dans
  `fr-pack-01.ts`). Vérifié : `ngc --strictTemplates` sur
  `apps/backoffice-angular` → 0 erreur sur ce fichier ; `tsc --noEmit` sur
  les 4 projets `scope:processing` → succès ; `eslint --max-warnings=0` → 0
  warning ; `check:i18n` → 0 clé manquante ; tests `scope:processing`
  (domain 14, application 14, data 16 = 44/44) → tous verts.
- `report-states-details-edit-fields.component.ts` et
  `requests-details-edit-fields.component.ts` **non migrés**, avec
  commentaire d'exception ajouté au-dessus de la déclaration du composant
  (raison vérifiable, pas une esquive) : (1) chacun reçoit un `FormGroup`
  complet en `@Input` depuis son formulaire parent
  (`*-qualification-form.component.ts`) — composition de sous-formulaire
  vers un composant enfant à sélecteur séparé, un pattern sans aucun
  précédent parmi les 48 composants déjà migrés ; (2) le formulaire parent
  bascule ses validateurs de façon impérative selon 3 points d'interaction
  (`decision`, `approvalType`, visibilité de `editFields`) sur 9+ champs
  plus 2 validateurs cross-champs, une complexité supérieure à tout schéma
  Signal Forms existant dans le repo. Migration en bloc (parent + enfant)
  recommandée comme item de backlog séparé. `tsc --noEmit` sur les 8
  projets `scope:report-states,scope:requests` → succès ; `eslint
  --max-warnings=0` sur les 2 fichiers → 0 warning.

---

### P2-2 — Évaluer la nécessité d'une politique d'éviction pour les caches mapper

**Constat :** 67 fichiers mapper à travers le monorepo déclarent chacun
indépendamment un `entityCache = new Map<string, Entity>()` sans politique
d'éviction (pas de taille maximale, pas de LRU). Ce n'est pas une fuite
mémoire permanente (`SessionService.clear()` déclenche un rechargement
complet de page qui efface la mémoire JS), mais la croissance pendant une
session active longue n'a jamais été mesurée. Les classes de base
`SimpleResponseMapper` et `PaginatedMapper`
(`libs/shared/data/src/lib/mappers/base/`) ne fournissent aucune
infrastructure de cache commune — chaque mapper réimplémente son propre
`Map`.

**Fichiers concernés (échantillon représentatif, la liste complète des 67
fichiers peut être obtenue avec `grep -rl "entityCache = new Map"
libs/`) :**
- `libs/shared/data/src/lib/mappers/base/simple-response.mapper.ts`
- `libs/shared/data/src/lib/mappers/base/paginated-response.mapper.ts`
- `libs/report-states/data/src/lib/mappers/report-states-details.mapper.ts`
  (exemple de mapper avec cache)

**Instruction :** ne pas modifier les 67 mappers individuellement sans
décision préalable sur l'approche. Produire un document
`docs/architecture/politique-cache-mappers.md` qui : (1) liste le nombre
exact de fichiers concernés (exécuter `grep -rl "entityCache = new Map"
libs/ | wc -l` et inclure le résultat) ; (2) propose une conception
concrète pour une classe de base `CachedEntityMapper<TEntity, TDto>` avec
une taille maximale configurable et une stratégie d'éviction LRU ; (3)
n'implémente rien — laisse la décision de migrer les 67 fichiers à une
tâche ultérieure une fois la conception validée.

**Critère de succès :** le fichier
`docs/architecture/politique-cache-mappers.md` existe avec les 3 éléments
demandés, dont le compte exact de fichiers concernés.

**Historique de résolution (2026-08-10) :** mémo produit. Compte confirmé à
67 (répartition par module vérifiée via `grep | sed | sort | uniq -c`, pas
estimée). Découverte substantielle en écrivant le mémo, qui change la
conception proposée : le cache n'est **pas d'abord un cache de
performance** mais un mécanisme de **stabilité de référence** pour la
détection de changements Angular — les 67 mappers appellent tous
`entity.with(props)` sur un hit (vérifié : `for f in $(grep -rl
"entityCache = new Map" libs/); do grep -q ".with(props)" "$f" || echo
"$f"; done` → aucune sortie, 0 exception), et `.with()` renvoie la **même
référence** si `updatedAt`/`uniqId` sont inchangés (vérifié sur
`ReportStatesDetailsEntity.with()`). Un cache générique qui ignorerait ce
contrat casserait la fraîcheur des données. Conception recommandée :
composition (`LruEntityCache<TEntity>` injectée à la place du `new Map()`
actuel) plutôt qu'une nouvelle classe de base parallèle, pour limiter le
diff par mapper à quelques lignes sur les 67 fichiers d'une future
migration. Rien implémenté, conformément à l'instruction.

---

### P2-3 — Documenter la convention `@Service()` vs `@Injectable()`

**Constat :** 554 fichiers utilisent le décorateur `@Service()` (services,
mappers, facades, use-cases, repositories) tandis que 41 fichiers,
exclusivement des `*-filter.store.ts` dans les couches UI, utilisent
`@Injectable()` sans `providedIn`. Aucune règle ESLint ni documentation
n'impose ou n'explique cette distinction.

**Fichiers concernés :**
- `eslint.config.mjs` (à consulter, ne pas nécessairement modifier)
- `LLM_CONTEXT.md` (emplacement probable pour documenter la convention)
- Exemple de fichier `@Injectable()` :
  `libs/report-states/ui/src/lib/stores/approve-report-states-filter.store.ts`

**Instruction :** ajouter dans `LLM_CONTEXT.md` une section courte
documentant explicitement : `@Service()` est utilisé pour tout ce qui est
injecté au niveau applicatif standard (services, mappers, facades,
use-cases, repositories) ; `@Injectable()` sans `providedIn` est réservé
aux stores de filtre fournis localement via `providers: [XxxFilterStore]`
au niveau du composant de page (durée de vie liée au composant, pas
singleton root). Si cette explication ne correspond pas à la réalité du
code après vérification (relire 2-3 exemples de chaque catégorie pour
confirmer), ajuster la description en conséquence plutôt que d'imposer
cette hypothèse.

**Critère de succès :** `LLM_CONTEXT.md` contient une section décrivant la
distinction `@Service()` / `@Injectable()` avec au moins un exemple de
chaque.

**Historique de résolution (2026-08-10) :** le constat initial contenait
deux erreurs factuelles, corrigées après vérification (pas supposées) :
(1) le compte `@Injectable()` est **66**, pas 41
(`grep -rl "@Injectable()" libs/ apps/ | wc -l`) ; (2) ces 66 fichiers ne
sont **pas exclusivement** des `*-filter.store.ts` — 42 sont des
`*-filter.store.ts`, 24 sont des `*-form.store.ts` (`grep -c
"\-filter\.store\.ts$"` / `"\-form\.store\.ts$"` sur la même liste = 42 +
24 = 66, aucun fichier hors de ces deux patterns). Le compte `@Service()`
(555, pas 554) et la nature auto-provided du décorateur ont aussi été
vérifiés directement dans les typings Angular 22
(`node_modules/@angular/core` : `Service` a `autoProvided` vrai par
défaut). Confirmé sur 2 exemples concrets que les stores `@Injectable()`
sont bien fournis via `providers: [...]` sur le composant de page/dialog
propriétaire, jamais en root. Section ajoutée dans `LLM_CONTEXT.md` §2
avec les chiffres corrigés.

---

### P2-4 — Retirer le duplicata trivial `GrafanaDashboardEntity`/`MapEntity`

**Constat :** la classe `{ grafanaLink: string }` avec constructeur
identique est dupliquée 3 fois : `GrafanaDashboardEntity` dans
`libs/monitoring/domain/src/lib/entities/grafana-dashboard.entity.ts`,
`GrafanaDashboardEntity` dans
`libs/reporting/domain/src/lib/entities/grafana-dashboard.entity.ts`, et
`MapEntity` dans
`libs/interactive-map/domain/src/lib/entities/map.entity.ts`.

**Fichiers concernés :**
- `libs/monitoring/domain/src/lib/entities/grafana-dashboard.entity.ts`
- `libs/reporting/domain/src/lib/entities/grafana-dashboard.entity.ts`
- `libs/interactive-map/domain/src/lib/entities/map.entity.ts`
- `libs/shared/domain/src/index.ts` (point d'export si une lib partagée
  existe déjà)

**Instruction :** vérifier d'abord si `libs/shared/domain` a déjà un
répertoire `entities/` avec des exports d'entités transversales similaires
(chercher avec `find libs/shared/domain -type d -name entities`). Si oui,
créer une entité `GrafanaLinkEntity` (ou nom cohérent avec les conventions
déjà présentes dans `shared/domain/entities`) dans ce répertoire, l'exporter
depuis `libs/shared/domain/src/index.ts`, puis remplacer les 3 usages
locaux par un import de cette entité partagée, en supprimant les 3
fichiers originaux et en mettant à jour tous les imports qui les
référençaient (rechercher avec `grep -rl "GrafanaDashboardEntity\|MapEntity"
libs/`). Si `libs/shared/domain` n'a pas de conteneur logique adapté pour
ce type d'entité, ne pas créer de nouvelle structure sans validation — dans
ce cas, ne rien changer et noter dans un commentaire au-dessus de chacune
des 3 classes qu'un duplicata existe ailleurs, avec le chemin exact des 2
autres copies.

**Critère de succès :** soit les 3 classes sont remplacées par un import
unique depuis `@cmz/shared-domain` et `bunx nx run-many -t build` passe
pour les 3 modules concernés, soit les 3 fichiers ont chacun un commentaire
croisé référençant les 2 autres emplacements.

---

## Mémos d'investigation (décision humaine requise après production du mémo)

Ces tâches ne doivent **jamais** aboutir à une décision prise par l'agent.
L'agent produit un document d'options factuel ; un humain lit ce document et
tranche séparément. Ne pas choisir une option "par défaut" dans le mémo.

### MÉMO-1 — Schéma d'API source de vérité (OpenAPI)

**Constat :** le monorepo n'a pas de schéma OpenAPI (ou équivalent)
versionné qui ferait autorité sur la forme des DTOs, des endpoints et du
mock-server. Les DTOs sont actuellement maintenus manuellement dans
`libs/*/data/src/lib/dtos/`.

**Instruction [MÉMO] :** produire `docs/architecture/memo-openapi.md`
décrivant : (1) l'état actuel (comment les DTOs sont définis et maintenus
aujourd'hui, avec exemples de chemins) ; (2) ce qu'impliquerait
concrètement l'introduction d'un schéma OpenAPI versionné dans ce dépôt
(où le stocker, quel outil pourrait générer les DTOs à partir de ce
schéma, quel impact sur `tools/mock-server`) ; (3) les options possibles
si le schéma OpenAPI ne peut pas être obtenu du backend (écrire un schéma
a posteriori en rétro-ingénierie des DTOs existants, ou une autre
approche) avec les avantages/inconvénients de chaque option, sans en
recommander une.

**Critère de succès :** le mémo existe avec les 3 sections, sans
recommandation finale tranchée.

---

### MÉMO-2 — Cadrage réglementaire des données personnelles

**Constat :** le projet manipule des données personnelles (identité,
localisation, contacts) sans cadrage réglementaire écrit (rétention,
minimisation, base légale).

**Instruction [MÉMO] :** produire `docs/architecture/memo-donnees-personnelles.md`
listant, par une recherche dans le code (`grep -rn` sur les entités
domain), tous les champs actuellement collectés qui constituent des
données personnelles (nom, téléphone, position géographique, photo, etc.),
avec le module et le fichier où chaque champ est défini. Ne pas proposer
de politique de rétention ni de conformité — se limiter à l'inventaire
factuel des champs trouvés, qui servira de base à un humain pour cadrer la
politique.

**Critère de succès :** le mémo liste au moins les champs des modules
`report-states`, `requests`, `processing`, `finalization`,
`administrative-boundary`, avec chemin de fichier exact pour chacun.

---

### MÉMO-3 — Choix d'un collecteur de télémétrie

**Constat :** `GlobalErrorHandler`
(`libs/core/src/lib/error-handling/global-error-handler.ts`) délègue à
`LoggerPort` mais aucun collecteur externe (Sentry, OpenTelemetry, etc.)
n'est branché derrière ce port.

**Instruction [MÉMO] :** produire `docs/architecture/memo-telemetrie.md`
décrivant : (1) l'implémentation actuelle de `LoggerPort` (chemin exact de
l'adapter console actuel) ; (2) ce qu'impliquerait le branchement d'un
collecteur externe à cet endroit précis (quel fichier créer, quelle
interface respecter pour rester compatible avec `LoggerPort` sans le
modifier) ; (3) les contraintes CSP (`connect-src`) à ajuster selon le
collecteur choisi, sans recommander un fournisseur en particulier.

**Critère de succès :** le mémo existe avec les 3 sections, sans
fournisseur recommandé.

---

## Ce qui n'est PAS dans ce fichier (et pourquoi)

- **Tâches déjà vérifiées faites** (contrôle exclusion via lecture directe
  du code, pas sur la seule foi de `taches-restantes.md`) : gate `knip`
  bloquant en CI, `check:i18n` bloquant en CI, suppression de la référence
  à `tools/eslint-rules`, contrats `component.contract.md`/
  `route.contract.md`, extension du schéma `pair.schema.json` avec
  `oracle_report`, `check:dev-permissions-prod` câblé en CI, secret
  scanning gitleaks en CI, tests e2e RBAC (`rbac-paths.spec.ts`), suite
  Playwright installée avec job `e2e-smoke`, tests unitaires
  dashboard/monitoring/reporting/interactive-map, cibles `test` câblées
  pour `settings-security`, gate a11y exécuté en CI. Ces items ne
  nécessitent aucune action.
- **Décisions d'architecture non tranchées** (scinder `libs/shared/ui`,
  fixer un seuil de dette de duplication, choisir une stratégie de
  synthèse par apprentissage automatique pour le corpus) : retirées de ce
  backlog tant qu'aucune décision n'a été prise. Elles restent documentées
  dans `taches-restantes.md` sous les identifiants T1-2, T1-3, T13-6.
- **Tâches bloquées sur un accès humain à un environnement externe**
  (tests e2e réels contre un serveur de staging, revue humaine du ton de
  ~320 traductions automatiques, second relecteur CODEOWNERS) : retirées
  de ce backlog, un agent ne peut pas les exécuter. Elles restent
  documentées dans `taches-restantes.md` sous OPS-4, T5-1, T12-7, T13-7.
- **Items produit hors socle technique** (parité fonctionnelle
  multi-onglets, export Excel, carte interactive avancée, etc., section
  "P2 métier" de `taches-restantes.md`) : hors du périmètre de rigueur
  technique visé par ce backlog.

---

*Source du raisonnement et des preuves détaillées pour chaque item :
`docs/architecture/taches-restantes.md`.*
