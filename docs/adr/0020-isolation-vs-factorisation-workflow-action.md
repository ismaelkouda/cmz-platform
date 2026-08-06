# ADR-0020 — Famille `workflow-action` : isolation `scope:*` vs factorisation

- **Statut :** Accepted
- **Date :** 2026-08-03

## Contexte

`audit-workspace-2026-08-02-revue-finale.md` (P1-25) a comparé les 4 modules
`workflow-action` (`processing`, `requests`, `finalization`, `report-states`)
**modulo substitution du nom de module**, commentaires et espaces
normalisés :

| Mesure | Valeur |
| --- | ---: |
| Fichiers analysés | **539** |
| Groupes quasi-identiques inter-modules | **99** |
| Fichiers redondants (au-delà du premier) | **159 → 29,5 %** |

Exemples à 4 copies : `*-details-filter-api.dto.ts`,
`*-details-take-api.dto.ts`, `*-details-filter.contract.ts`,
`*-details-take.contract.ts` — le même fichier, à un renommage de module
près, dans les 4 libs.

`check-duplicate-files.mjs` (garde-fou existant, H-3) ne voit **aucun** de
ces 159 fichiers : il compare des fichiers **byte-identiques**, et un nom de
module différent à l'intérieur du fichier (imports, noms de classe, chaînes
littérales) suffit à casser le hash. La duplication de famille est donc
**invisible au garde-fou actuel** — pas absente, juste non mesurée (ce que
O-1/O-2 corrigent séparément, voir ci-dessous).

Deux lectures opposées de ce même chiffre sont également défendables :

1. **C'est une frontière de scope, pas une duplication à éliminer.**
   `nx.json`/ESLint imposent `scope:<module>` (ADR-0003, ADR-0004) :
   `processing` ne doit **jamais** importer de `requests`. Un fichier
   « dupliqué » entre les deux, aujourd'hui, ne crée **aucune dépendance
   inter-module** — c'est le prix payé pour que les 4 modules restent
   déployables, testables et évolutifs indépendamment (confirmé par
   `docs/architecture/analyse-du-projet-source.md` : « 12 domaines sur 18
   sans aucune dépendance sortante » est présenté comme *la* force
   structurante du projet source).
2. **C'est une dette de génération, à factoriser.** 159 fichiers qui ne
   diffèrent que par un nom de module sont, par définition, un seul concept
   généré 4 fois. Chaque bug corrigé dans l'un devra être recherché et
   corrigé dans les 3 autres à la main — aucun outil ne le garantit
   aujourd'hui (`check-duplicate-files.mjs` ne les voit pas, cf. ci-dessus).

## Options envisagées

### Option A — Isolation stricte, dupliquer est le contrat

Garder les 4 libs totalement indépendantes ; la ressemblance entre modules
est acceptée comme le coût du découplage, pas comme un défaut. Documenter
`workflow-action.pattern.json` comme émettant délibérément un fichier par
module, sans référence croisée.

- Avantages : 0 changement de code ; préserve exactement la propriété
  mesurée comme la plus précieuse du projet source (indépendance de
  domaine) ; aucun risque de créer, par erreur, un couplage `scope:*`
  interdit en tentant de factoriser.
- Inconvénients : la dérive de correction (bug fixé dans un module, oublié
  dans les 3 autres) reste un risque réel et non outillé — le générateur
  SEOS, s'il régénère un jour ces modules, propagerait la correction
  partout ; mais toute correction manuelle post-génération ne le ferait pas.

### Option B — Factoriser dans `@cmz/shared-workflow`

Extraire les 99 groupes quasi-identiques vers une lib transverse
(`WorkflowQueueFacade<TItem,TFilter>`, `WorkflowTakeUseCase<T>`, génériques
paramétrés — chantier O-3/O-4 de la revue finale, sur le modèle de
`PaginatedResourceFacade` déjà existant dans `shared-application`), que les
4 modules `workflow-action` consomment.

- Avantages : élimine la dérive de correction par construction (un seul
  endroit à corriger) ; réduit le volume réel du dépôt (159 fichiers en
  moins à terme) ; cohérent avec le principe déjà appliqué à
  `PaginatedResourceFacade`/`ResourceFacade` (généricité transverse dans
  `shared-application`, pas dupliquée par module).
- Inconvénients : `@cmz/shared-workflow` deviendrait un point de couplage
  entre les 4 modules — pas un couplage **inter-domaine** direct (ils ne
  s'importeraient toujours pas entre eux), mais un point de rigidité
  partagé : un changement de générique dans `shared-workflow` doit rester
  compatible avec les 4 consommateurs simultanément, l'inverse du
  découplage actuel. Effort **L** (O-3) + **M** (O-4), non trivial.

## Décision

**Option A pour les 4 modules déjà livrés, avec un garde-fou ajouté plutôt
qu'une factorisation rétroactive.** L'indépendance de domaine mesurée
(0 dépendance inter-domaine sur 12/18 modules, `analyse-du-projet-source.md`)
est une propriété structurante explicitement voulue par ce projet — la
défaire pour économiser 159 fichiers reviendrait à échanger un avantage
architectural mesuré contre un gain de maintenance non mesuré. **Ce que ce
choix accepte comme dette est rendu visible plutôt qu'invisible** :

1. **O-1/O-2 traités** (voir `tools/check-duplicate-files.mjs` et
   `docs/architecture/audit-workspace-2026-08-03.md`, §7) — la duplication
   de famille modulo renommage est désormais **mesurée** (elle ne l'était
   pas avant cet ADR), publiée, et sert de base à toute décision future de
   factorisation ciblée.
2. **O-3/O-4 (factorisation effective) restent ouverts, non traités par
   cet ADR** — l'Option B n'est pas rejetée, elle est **différée** : elle
   deviendra pertinente si la mesure de O-1/O-2 montre une dérive réelle
   (un bug corrigé dans un module et pas dans les 3 autres), pas par
   anticipation.

## Justification

Les deux options sont défendables — ce que l'audit note explicitement
(« les deux sont défendables, l'implicite ne l'est pas »). Ce qui manquait
n'était pas un choix technique meilleur qu'un autre dans l'absolu, mais une
**décision écrite** : sans cet ADR, un futur contributeur pourrait
factoriser de bonne foi en pensant corriger une dette, et recréer sans le
vouloir un couplage entre les 4 modules `workflow-action` — ou, à l'inverse,
laisser une dérive de correction s'installer en pensant que la duplication
est un non-sujet déjà tranché. Nommer le compromis (isolation choisie,
risque de dérive accepté et désormais mesuré) referme cette ambiguïté.

## Conséquences

### Positives

- L'indépendance de domaine — la propriété la plus structurante mesurée du
  projet source — reste intacte pour les 4 modules `workflow-action`.
- La dette qu'elle implique (dérive de correction) est désormais **mesurée**
  (O-1/O-2) plutôt que supposée absente parce qu'invisible au garde-fou
  précédent.

### Négatives / dette acceptée

- 159 fichiers quasi-identiques restent dupliqués entre les 4 modules —
  accepté explicitement comme le coût de l'isolation, pas comme un défaut
  à corriger dans l'immédiat.
- Toute correction de bug touchant un de ces 99 groupes doit être répliquée
  manuellement dans les 3 autres modules jusqu'à ce que O-3/O-4 soit
  éventuellement engagé — aucun outil ne le fait aujourd'hui à la place
  d'un relecteur humain.

### Points à réévaluer

- Si la mesure O-1/O-2, suivie dans le temps, montre une dérive réelle
  (correction faite dans un module, manquante dans un autre, détectée en
  production ou en revue) : rouvrir cette décision en faveur de l'Option B
  (O-3/O-4).
- Si le générateur `workflow-action` (Phase 08) est un jour capable
  d'émettre directement depuis `@cmz/shared-workflow` sans dupliquer les 99
  groupes à l'émission : le coût de l'Option B change de nature (elle
  devient gratuite à la génération, pas une refonte manuelle) — reconsidérer
  alors indépendamment de la dérive observée.

## Références

- `audit-workspace-2026-08-02-revue-finale.md`, §3 (P1-25), chantier O
  (O-1 à O-6).
- `docs/architecture/analyse-du-projet-source.md` — mesure de
  l'indépendance de domaine (12/18 sans dépendance sortante).
- ADR-0003 (nommage et structure), ADR-0004 (graphe de dépendances
  déclarées) — les invariants `scope:*` que ce choix préserve.
- `docs/architecture/patterns/workflow-action.pattern.json`.
- `tools/check-duplicate-files.mjs` — étendu par O-1 (voir §7 de
  `audit-workspace-2026-08-03.md`).
