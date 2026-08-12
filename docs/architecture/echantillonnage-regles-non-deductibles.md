# Échantillonnage corpus — taux de règles métier non déductibles

- **Date :** 2026-08-12
- **Contexte :** `poc-few-shot-legacy-nx.md` (2026-08-11) avait trouvé un
  cas concret de règle métier absente du legacy sur une seule chaîne
  (`requests.queues.list`) et recommandait explicitement, avant tout
  investissement dans le chantier N-2/N-3/N-5 : *« un humain devrait
  échantillonner un nombre plus large de paires déjà `verified` du
  corpus [...] et compter combien d'entre elles encodent une règle
  absente du legacy »*. Ce document exécute cette recommandation.
- **Objectif :** remplacer une généralisation à partir d'un seul cas par
  un chiffre mesuré sur plusieurs modules, pour arbitrer entre les
  options de faisabilité de la génération semi-autonome (cf. discussion
  du même jour sur les niveaux A/B/C d'automatisation).

## Méthode

1. Inventaire de toutes les paires `status: "verified"` du corpus
   (`corpus/*.pairs.jsonl`, 17 fichiers).
2. Sélection d'un échantillon de 8 chaînes couvrant les deux archétypes
   clôturés (`workflow-action`, `read-only-view`) sur des modules
   distincts, dont 1 déjà connue (`requests.queues.list`, POC précédent)
   et 7 nouvelles.
3. Pour chaque chaîne : lecture directe des fichiers legacy réels
   (`cmz-backoffice-frontend`, commit `cb15bf80`, pin `legacy.lock.json`)
   et comparaison avec le fichier Nx cible déjà vérifié — **pas
   d'invocation de modèle**, même méthode que le POC précédent (lecture
   comparée suffit à trancher).

Important : `oracle_report.mode` des paires du corpus est
`"structural-only"` (confirmé en lisant une paire complète) — le JSONL
ne contient ni code ni diff (ADR-0019). Chaque chaîne a donc nécessité
une lecture directe des fichiers source des deux dépôts, pas une analyse
du corpus seul.

## Inventaire complet — répartition verified/total par module

| Module | Verified | Total | Statut pattern |
| --- | --- | --- | --- |
| `dashboard` | 18 | 25 | `read-only-view` — clôturé |
| `finalization` | 92 | 126 | `workflow-action` — clôturé |
| `interactive-map` | 21 | 28 | `read-only-view` — clôturé |
| `monitoring` | 41 | 51 | `read-only-view` — clôturé |
| `processing` | 117 | 156 | `workflow-action` — clôturé |
| `report-states` | 137 | 187 | `workflow-action` — clôturé |
| `reporting` | 41 | 51 | `read-only-view` — clôturé |
| `requests` | 118 | 157 | `workflow-action` — clôturé |
| *(9 autres modules)* | 0 | 594 | non couverts par un pattern v0+ |

**585 paires `verified` sur 1330 totales**, concentrées sur les 8 modules
des deux seuls patterns actuellement clôturés. Les 9 autres modules
(`authentication`, `settings-security`, `shared`, `core`,
`team-organization`, `administrative-*`, `communication`,
`content-management`, `coverage-areas`) n'ont aucune paire vérifiée —
donc aucune base de mesure pour eux avec cette méthode.

44 chaînes distinctes existent au total sur les 8 modules vérifiés.
L'échantillon couvre 8 chaînes, soit ~18 % du total — indicatif, pas
exhaustif.

## Résultat par chaîne échantillonnée

| Chaîne | Fichier examiné | Constat | Catégorie |
| --- | --- | --- | --- |
| `requests.queues.list` *(POC précédent)* | `queues-filter.entity.ts` | `resolveOpenEndedEndDate` absente de tout le legacy de la chaîne | **3 — non déductible** |
| `finalization.queues.list` | `queues-filter.entity.ts` | Même règle absente ; confirmé aussi absente de `DatePeriod.create` (VO partagé) | **3 — non déductible** |
| `processing.tasks.list` | `tasks-filter.entity.ts` | Même règle absente, même structure legacy (classe simple, pas de résolution de date ouverte) | **3 — non déductible** |
| `report-states.approve.list` | `approve-filter.entity.ts` | La règle **existe déjà en legacy** (`contract.startDate && !contract.endDate ? new Date() : contract.endDate`, ligne 6-7) — migration = généralisation en fonction partagée, pas invention | **2 — déductible du fichier lui-même** |
| `monitoring.jobs.view` | `jobs.mapper.ts` | Mapping `section → champ DTO` invisible dans le fichier seul, déductible seulement en comparant les 4 mappers legacy (`node`/`services`/`resources`/`jobs`) entre eux ; un `console.log` de debug retiré (décision non écrite) | **2 — déductible avec contexte multi-fichier** |
| `interactive-map.visualization.view` | `map.entity.ts` | Traduction mécanique pure (fusion en `GrafanaLinkEntity`, structure identique) | **1 — mécanique** |
| `reporting.report.view` | `reports.entity.ts` | Idem — même fusion, même structure | **1 — mécanique** |
| `dashboard.view` | `dashboard-filter.vo.ts` | Règle de validation (`period < 1`) déjà présente en legacy, seul le style change (classe → fonction + validator séparé) | **2 — déductible du fichier lui-même** |

## Chiffres

Sur les 8 chaînes échantillonnées :

- **3/8 (37 %)** — catégorie 1, traduction mécanique, aucune règle à
  déduire.
- **3/8 (37 %)** — catégorie 2, règle présente dans le legacy mais pas
  dans le fichier isolé qu'on montrerait naïvement à un modèle ;
  déductible avec le bon niveau de contexte (fichier voisin, ou
  comparaison de plusieurs fichiers de la même famille).
- **2/8 (25 %)** — catégorie 3, règle absente de tout le legacy de la
  chaîne, ajoutée pendant les revues humaines de la migration,
  non déductible quel que soit le contexte fourni.

## Correction par rapport au POC précédent

Le POC du 2026-08-11 avait trouvé un seul cas (`resolveOpenEndedEndDate`
sur `requests.queues.list`) et conclu que cette règle était absente de
*tout* le legacy. L'échantillonnage confirme ce cas précis sur 2 chaînes
supplémentaires (`finalization.queues.list`, `processing.tasks.list`),
**mais** trouve aussi un contre-exemple direct : `report-states.approve`
a la même forme de règle ("date de fin ouverte") **déjà présente** dans
son fichier legacy. La règle n'est donc pas universellement absente du
projet — elle existait déjà dans certains modules legacy et a été
généralisée en fonction partagée (`resolveOpenEndedEndDate`,
`@cmz/shared-domain`) lors de la migration, précisément pour éviter que
`report-states` la garde dupliquée alors que `finalization`/`processing`
ne l'avaient pas.

Ceci ne contredit pas le constat de fond (persistant sur 2 chaînes sur
3 dans la même famille) mais nuance la généralisation : le taux de règles
non déductibles n'est pas ~100 % comme un seul cas isolé pourrait le
suggérer, et n'est pas non plus négligeable — il se situe, sur cet
échantillon, entre 25 % (non déductible même avec tout le contexte) et
62 % (en comptant aussi les cas déductibles seulement avec du contexte
multi-fichier, que naïvement un prompt few-shot fichier-par-fichier ne
fournirait pas).

## Conséquence pour la décision d'automatisation (niveaux A/B/C)

- Le taux mesuré élimine l'option C (génération autonome de bout en
  bout, sans pattern imposé) : avec 25-62 % de cas nécessitant du
  contexte que le système ne peut pas connaître a priori, l'absence de
  pattern imposé ne ferait qu'aggraver le problème déjà critique.
- Il confirme que l'option B (LLM + Oracle en boucle Generate-Verify-
  Repair) reste jouable **uniquement** avec un garde-fou explicite : les
  motifs à risque identifiés ici sont **repérables à l'avance** avant
  génération — filtres de plage de dates (`startDate`/`endDate`),
  mappings qui nécessitent de comparer plusieurs fichiers de la même
  famille entre eux. Un premier filtre statique sur ces motifs, forçant
  un arrêt et une remontée humaine plutôt qu'une génération forcée,
  couvrirait la majorité des cas à risque trouvés ici sans bloquer les
  ~37 % de cas purement mécaniques.
- Recommandation avant d'investir dans une boucle G-V-R réelle : étendre
  cet échantillon aux 44 chaînes complètes (pas seulement 8) pour
  affiner ce chiffre avant de dimensionner l'effort — l'échantillon
  actuel reste petit (8/44, ~18 %) et peut sur- ou sous-estimer le taux
  réel.

## Limites de cette mesure

- Échantillon non exhaustif (8/44 chaînes, ~18 %) — un chiffre indicatif,
  pas une preuve statistique.
- Ne couvre que les 8 modules déjà clôturés (`workflow-action`,
  `read-only-view`) — les 9 modules sans paire `verified`
  (`settings-security`, `authentication`, etc.) n'ont aucune base de
  mesure comparable à ce stade.
- La distinction catégorie 2 vs catégorie 3 dépend du niveau de contexte
  qu'on suppose disponible au moment de la génération (un seul fichier ?
  tout le module ? tout le legacy ?) — les chiffres ci-dessus donnent les
  deux bornes plutôt qu'un seul nombre pour rester honnête sur cette
  ambiguïté.

## Références

- [`poc-few-shot-legacy-nx.md`](./poc-few-shot-legacy-nx.md) — POC
  initial, cas unique, recommandation exécutée ici.
- [ADR-0019](../adr/0019-nature-du-corpus-seos.md) — nature du corpus
  (`structural-only`, 0 code/diff réel dans le JSONL).
- `legacy.lock.json` — pin du commit legacy utilisé pour toutes les
  lectures (`cb15bf80fa072e12e9d4fce4b9236abe6ac78058`).
