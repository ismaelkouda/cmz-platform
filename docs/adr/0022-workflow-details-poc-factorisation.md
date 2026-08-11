# ADR-0022 — Factorisation `details` report-states/requests : exécution du POC (ADR-0020 Option B)

- **Statut :** Accepted
- **Date :** 2026-08-11

## Contexte

ADR-0020 avait tranché en faveur de l'Option A (isolation `scope:*`) pour les
4 modules `workflow-action`, tout en documentant explicitement les conditions
de réouverture : « rouvrir cette décision en faveur de l'Option B si la
mesure O-1/O-2, suivie dans le temps, montre une dérive réelle (correction
faite dans un module, manquante dans un autre, détectée en production ou en
revue) ».

Cette condition s'est produite : T1-5 (`taches-restantes.md`, 2026-08-10) a
documenté un incident concret — 5 clés i18n `REQUESTS.DETAILS.*` oubliées
dans `report-states` lors d'un copier-coller antérieur (cf. T13-10), preuve
que la dérive de correction n'était pas hypothétique. `docs/architecture/
factorisation-details-workflow.md` (P1-1, 2026-08-10) avait par ailleurs déjà
produit l'inventaire exhaustif : sur les 58 fichiers `report-states`↔
`requests` de la fonctionnalité « details », 45 étaient strictement
identiques modulo nom de module et 10 ne différaient que par du formatage
Prettier — 55/58 (95 %) de duplication pure, 3 différences réelles
documentées et non bloquantes.

Décision utilisateur (2026-08-11) : exécuter le POC sur `report-states`/
`requests` uniquement (pas `processing`/`finalization`, non concernés par
cet incident — ils utilisent `treat`, pas `approve`/`reject`), avec le
paramètre variable (préfixe des clés i18n d'erreur `REPORT_STATES.*` vs
`REQUESTS.*`) injecté explicitement en argument plutôt que fusionné en une
clé générique ou dupliqué en wrapper opaque — préservant les clés i18n
existantes (`fr-pack-04.ts`/`fr-pack-05.ts`) sans migration de traduction.

## Décision

**Extraction du sous-graphe domaine « details » vers `libs/workflow-details/
domain` (`@cmz/workflow-details-domain`)**, nouveau scope `scope:workflow-
details` (kernel dédié, pas `scope:shared` — cohérent avec la proposition
§3.1 du mémo, pour ne pas mélanger un concept propre au workflow de
traitement de signalement avec le kernel générique `ActorEntity` etc.).

Portée effective (domain uniquement, conforme au mémo §3.3 « repository non
unifié en première itération ») :

- **Migrés vers `@cmz/workflow-details-domain`** : `WorkflowDetailsEntity`,
  `WorkflowDetails{Approve,Reject,Take}Entity`, `workflowDetailsFilterEntity`,
  enums `WorkflowDetailsStatus`/`WorkflowDetailsQualificationState`,
  contracts (`Filter`/`Take`/`Qualification`), props, interface timestamp,
  utils purs (`permissions`, `label`, `workflow-timestamps` — zéro paramètre
  module, logique 100 % identique), VOs (`filter`/`take`/`qualification` —
  **paramétrées par `modulePrefix: string`**, seul point de variation réel).
- **Restent par module** (non migrés) : le port repository (`Report
  StatesDetailsRepository extends WorkflowDetailsRepositoryBase` — classe
  distincte pour un token Angular DI distinct ; deux `provide:
  WorkflowDetailsRepositoryBase` dans le même injecteur racine s'écraseraient
  silencieusement l'un l'autre), toute la couche data (DTOs/mappers/
  repository-impl/sources — endpoints réels différents), toute la couche
  application (use-cases/façades — RBAC/façades à invalider différentes par
  module, cf. mémo §2.1), toute la couche UI.
- **Ré-exporté sous les noms historiques** depuis `libs/{report-states,
  requests}/domain/src/index.ts` (`export { WorkflowDetailsEntity as
  ReportStatesDetailsEntity } from '@cmz/workflow-details-domain'`, etc.) —
  **aucun fichier data/application/ui n'a dû changer de nom d'import**. Seuls
  2 fichiers application (`{module}-details.use-case.ts`) et 2 fichiers UI
  (`{module}-details-dialog.component.ts`) ont dû ajouter le `modulePrefix`
  explicite aux 4 appels VO/factory qui en ont besoin.

`@vitest/coverage-v8@4.1.10` installé au passage (T11-7 suite, même session)
— sans lien direct mais nécessaire pour que `nx test` avec couverture
fonctionne sur la nouvelle lib.

## Justification

Voir ADR-0020 pour la comparaison complète Option A/B — non répétée ici.
Élément déterminant supplémentaire par rapport à ADR-0020 : le paramètre
variable (préfixe i18n) n'exigeait **aucune** parametrisation runtime pour
95 % du sous-graphe (entités, contrats, enums, utils purs) — seules 3
value-objects avaient besoin d'un `modulePrefix`. Le risque « couplage
partagé rigide » qu'ADR-0020 attribuait à l'Option B (« un changement de
générique dans `shared-workflow` doit rester compatible avec les 4
consommateurs simultanément ») est donc resté marginal en pratique pour ce
sous-graphe précis.

## Conséquences

### Positives

- Taux de duplication de famille (`family-duplication-metrics.json`,
  H-4/O-1) : **29,6 % → 28,1 %** (mesuré, `check:duplicates --family
  --record`) — baisse réelle malgré le périmètre volontairement restreint à
  2 des 4 modules.
- Classe de bug de l'incident T1-5 (clé i18n oubliée lors d'un copier-coller)
  structurellement éliminée pour ce sous-graphe : il n'y a plus de copie à
  synchroniser manuellement pour les 12 fichiers domaine migrés.
- Zéro fichier data/application/ui renommé côté consommateur — la
  ré-exportation sous les noms historiques a limité le rayon d'impact aux
  couches domain + 4 call sites explicites (2 use-cases, 2 composants UI).

### Négatives / dette acceptée

- `processing`/`finalization` non couverts — la duplication family-wide
  reste à 28,1 %, pas proche de 0 (choix explicite, scope POC).
- Le port repository, la couche data, la couche application et la couche UI
  restent dupliquées modulo nom de module entre `report-states`/`requests`
  (non traité — cf. mémo §3.3, risque DI et RBAC différent jugés non triviaux
  pour une première itération).

### Points à réévaluer

- Si `processing`/`finalization` développent un jour un incident de dérive
  comparable à T1-5 : évaluer l'extension du même patron (`workflow-details`
  ne les couvre pas aujourd'hui, ils gardent `treat`, pas `approve`/
  `reject`).
- Si la couche data/application/ui de `report-states`/`requests` montre à
  son tour une dérive de correction mesurée : reconsidérer leur
  factorisation, indépendamment de cet ADR (nouvelle décision, nouveau
  risque DI/RBAC à trancher).

## Effet collatéral découvert et corrigé (hors périmètre ADR-0020/0022)

En exécutant `emit-pairs.mjs {report-states,requests} --verify` pour
vérifier l'absence de régression corpus SEOS après migration, un nœud corpus
préexistant et non lié (`details-edit-fields`) s'est révélé périmé : son
`nx` path pointait vers un fichier supprimé par le commit `b3d812c`
(« refactor(forms): migrate qualification forms to Signal Forms », antérieur
à cette session) qui avait fusionné `*-edit-fields.component.ts` dans
`*-qualification-form.component.ts` sans régénération du corpus. Corrigé
dans `tools/corpus/mapping-nodes-3.mjs` (nœud marqué `n/a`, absorbé) — sans
rapport avec la factorisation `workflow-details` elle-même, mais bloquant la
vérification `corpus:ci` tant que non corrigé.

## Références

- ADR-0020 — décision initiale (Option A + garde-fou mesuré), conditions de
  réouverture.
- `docs/architecture/factorisation-details-workflow.md` — inventaire
  exhaustif ayant servi de plan d'exécution à ce POC.
- `docs/architecture/taches-restantes.md` — T1-3/T1-4/T1-5.
- `libs/workflow-details/domain/` — code produit.
- `tools/corpus/mapping-helpers.mjs` (`detailsDomainNxPath`) — bascule de
  chemin corpus pour les modules migrés.
