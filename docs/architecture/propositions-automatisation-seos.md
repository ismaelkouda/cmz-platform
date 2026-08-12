# Propositions d'automatisation SEOS — Option B cadrée

- **Date :** 2026-08-12
- **Décision actée :** Option B (LLM + Oracle en boucle Generate-Verify-
  Repair), jamais l'option C (génération autonome sans pattern), avec un
  garde-fou explicite calibré sur le taux mesuré de règles non
  déductibles (`echantillonnage-regles-non-deductibles.md` : 37 %
  mécanique, 37 % déductible avec contexte multi-fichier, 25 % non
  déductible).
- **Référence externe validée :** Google, *Migrating Code At Scale With
  LLMs At Google* (arXiv 2504.09691) — mécanisme de catégorisation par
  confiance + chaîne de validations ordonnée + arrêt sans forçage +
  revue humaine systématique, appliqué ici à notre pipeline Phase 08
  déjà écrit (`generation-from-patterns.md`).
- **Ce que ce document fait :** décliner la décision en propositions
  concrètes, chacune avec son périmètre exact, ses contraintes, un
  exemple ancré dans un vrai fichier du projet, et son coût
  d'implémentation. Pas un choix supplémentaire à faire — une
  consolidation de ce qui découle du choix déjà fait.

## Rappel du mécanisme Google, tel que transposé ici

| Étape Google | Équivalent SEOS proposé |
| --- | --- |
| Catégorisation par confiance (not-migrated / irrelevant / relevant / left-over) | Classification des nœuds corpus par motif à risque avant génération (proposition 1) |
| Chaîne de validations ordonnée, bon marché → coûteux, arrêt sans forçage | Oracle Phase 08 déjà étagé (build → lint → corpus → tier2 → templates), à instrumenter pour arrêter sur les motifs à risque (proposition 2) |
| "Left-over" remonté à un humain qui configure la règle pour la prochaine passe | Registre de motifs à risque versionné, enrichi à chaque cas trouvé (proposition 3) |
| Revue humaine systématique de 100 % des changements avant soumission | Déjà le cas dans Phase 08 (§7, "Revue Meta scorecard") — proposition 4 le rend explicite au niveau du nœud, pas seulement du module |

---

## Proposition 1 — Registre de motifs à risque (pré-génération)

**Ce que c'est :** avant de lancer la génération d'un nœud corpus, le
classer selon des motifs connus pour être statistiquement associés à une
règle non déductible — repérés directement par notre échantillonnage.

**Motifs identifiés à ce stade (2 trouvés sur 8 chaînes, extensible) :**

1. *Résolution de plage de dates ouverte* — tout `filter-entity` dont le
   contrat porte `startDate`/`endDate` optionnels. Exemple concret :
   `finalization/queues-finalization-filter.entity.ts` et
   `processing/tasks-processing-filter.entity.ts` encodent tous deux
   `resolveOpenEndedEndDate` (`libs/shared/domain/src/lib/utils/
   resolve-open-ended-end-date.util.ts`), une règle absente de tout le
   legacy de ces deux chaînes. Un générateur qui verrait seulement
   `queues-filter.entity.ts` (legacy) ne produirait jamais cette ligne.
2. *Mapping dérivé de la comparaison inter-fichiers* — tout mapper dont
   le legacy a plusieurs variantes proches (ex. `node.mapper.ts`,
   `services.mapper.ts`, `resources.mapper.ts`, `jobs.mapper.ts` dans
   `monitoring`) fusionnées en une seule classe paramétrée côté Nx
   (`GrafanaDashboardMapper` + `MONITORING_SECTION_FIELD`). Le mapping
   n'est visible qu'en lisant les 4 fichiers ensemble, jamais un seul.

**Contrainte :** ce registre ne prédit pas, il classe a posteriori des
motifs déjà vus. Un nouveau type de règle non couverte par le registre
ne sera pas détecté — ce n'est pas un filet de sécurité complet, juste
un premier tri qui couvre les cas déjà rencontrés (comme les
catégorizeurs Google, qui sont eux-mêmes des règles empiriques,
pas une preuve formelle).

**Coût :** faible — un fichier JSON de motifs (regex sur noms de champs
de contrat, ex. `/startDate|endDate/`, ou sur la présence de plusieurs
fichiers legacy de même famille), consulté avant chaque génération de
nœud. Extension naturelle de `docs/architecture/patterns/*.pattern.json`
qui a déjà une section `constraints` (H-3) — ce registre serait une
nouvelle contrainte du même type, pas un nouveau système.

**Exemple concret de contenu du registre :**

```json
{
  "risk_patterns": [
    {
      "id": "R-1-open-ended-date-range",
      "trigger": "contract field names include startDate/endDate as optional",
      "action": "flag_for_human_review",
      "known_cases": ["requests.queues.list", "finalization.queues.list", "processing.tasks.list"],
      "counter_example": "report-states.approve.list (regle deja presente en legacy — pas un ajout)"
    },
    {
      "id": "R-2-cross-file-mapping",
      "trigger": "legacy has >=3 sibling files matching same naming pattern (e.g. */jobs.mapper.ts, */node.mapper.ts)",
      "action": "require_multi_file_context_before_generation",
      "known_cases": ["monitoring.jobs.view"]
    }
  ]
}
```

---

## Proposition 2 — Oracle à arrêt dur sur motif à risque (pendant G-V-R)

**Ce que c'est :** dans la boucle Generate-Verify-Repair de Phase 08
(§3, déjà écrite), ajouter une étape de vérification *avant* le tier 1
build, calquée sur la chaîne Google (succès → whitespace-only → parse
AST → **punt check** → build → test). Le "punt check" est l'idée la
plus transposable : Google redemande au LLM lui-même si son changement
était nécessaire, comme garde-fou contre les faux positifs — on
propose un équivalent : après génération, redemander explicitement "cette
règle a-t-elle été déduite d'un fichier legacy réel, ou inventée ?" et
exiger une citation du fichier source pour toute règle non triviale.

**Différence clé avec Google :** leur cas (migration de type int32→int64)
n'a pratiquement aucun risque de catégorie 3 (règle métier absente) —
c'est une transformation syntaxique quasi mécanique. Notre corpus a 25 %
de cas où même le "punt check" échouerait, parce que la bonne réponse
n'existe dans aucun fichier à citer. D'où la proposition 1 en amont :
sur un nœud marqué à risque par le registre, la boucle G-V-R s'arrête
**avant** génération, pas seulement après échec de vérification.

**Exemple concret d'arrêt attendu :** génération de
`libs/settings-security/domain/src/lib/entities/[nouveau-module]-filter.
entity.ts` à partir d'un legacy dont le contrat a `startDate`/`endDate`.
Le registre (proposition 1) déclenche R-1 avant toute génération.
L'agent doit soit (a) trouver un fichier legacy — n'importe où dans le
module, pas seulement le fichier miroir direct — qui contient déjà la
règle `resolveOpenEndedEndDate` ou équivalent (comme dans
`report-states.approve`, contre-exemple trouvé dans l'échantillonnage),
soit (b) s'arrêter et remonter la question à un humain : "ce module a-t-
il, comme `finalization`/`processing`, besoin de la règle partagée sans
qu'elle soit présente dans son legacy ?"

**Coût :** moyen — nécessite d'instrumenter le prompt de génération pour
inclure le "punt check" et le registre de motifs, plus une politique
d'arrêt explicite (pas de "best effort" silencieux). Techniquement,
c'est une modification du prompt et de l'orchestration, pas un nouveau
composant Oracle — les tiers 1/2 de `generation-from-patterns.md` §4
restent inchangés en aval.

---

## Proposition 3 — Registre de motifs enrichi à chaque nouvel écart trouvé

**Ce que c'est :** transposition directe de la catégorie "left-over"
Google — chaque fois qu'un humain résout un cas remonté par la
proposition 2, le motif qui l'a déclenché (ou un nouveau motif si
aucun ne correspondait) est ajouté ou affiné dans le registre de la
proposition 1, pour que la même famille de règle soit détectée
automatiquement la prochaine fois.

**Exemple concret :** si un futur module a un filtre avec un champ
`activeUntil`/`suspendedFrom` (pas `startDate`/`endDate` mais même
sémantique de plage ouverte), et qu'un humain découvre la même règle
manquante, le registre R-1 est étendu pour capturer aussi ce nommage —
exactement comme Google documente que ses développeurs "dictent" via
configuration si une position `left-over` doit rejoindre `not-migrated`
ou `irrelevant` pour la prochaine exécution nocturne (§3.2).

**Contrainte honnête :** ceci ne réduit jamais le taux de cas
*réellement* non déductibles (catégorie 3, 25 % mesuré) — ça réduit
seulement le taux de cas non déductibles *non détectés à l'avance*. La
distinction est importante : le registre ne rend rien automatiquement
déductible, il rend visible ce qui ne l'est pas, plus tôt dans le
processus (avant génération plutôt qu'après une revue humaine coûteuse).

**Coût :** quasi nul — c'est un processus, pas un outil : chaque
résolution manuelle d'un cas remonté alimente un fichier déjà existant
(proposition 1).

---

## Proposition 4 — Rendre explicite la revue humaine déjà prévue, au niveau du nœud

**Constat :** `generation-from-patterns.md` §7 a déjà une ligne "Revue
Meta scorecard" côté humain, et §4 exige un Oracle vert avant livraison
— mais la granularité actuelle est le **module**, pas le **nœud**. Ce que
Google fait de façon plus fine : chaque fichier individuellement modifié
passe par une revue visuelle avant regroupement en changement soumis
(§3.3, dernier paragraphe) — la revue n'attend pas la fin du module
entier.

**Proposition :** pour les nœuds marqués à risque par la proposition 1
(qu'ils aient été résolus automatiquement via citation legacy, ou
remontés), exiger une mention explicite dans le corpus émis
(`corpus/<module>.pairs.jsonl`) — un champ additionnel, par exemple
`risk_flag: "R-1-open-ended-date-range"` et `resolution: "cited-legacy-
file"` ou `resolution: "human-decision"` — pour que la revue Meta
scorecard sache quels nœuds exigent une attention accrue, plutôt que de
traiter tout le module uniformément.

**Exemple concret :** la paire déjà existante
`report-states.approve.filter-entity` (dans
`corpus/report-states.pairs.jsonl`) pourrait porter
`risk_flag: "R-1-open-ended-end-date"`, `resolution: "cited-legacy-file"`
(puisqu'on a confirmé que la règle existe déjà dans
`approve-filter.entity.ts`) — documentant que ce nœud, bien qu'à risque
par motif, a été résolu par déduction réelle et non par une
supervision humaine ponctuelle. À l'inverse,
`finalization.queues.filter-entity` porterait `resolution: "human-
decision"` puisque rien dans son legacy ne justifie la règle.

**Coût :** faible — extension du schéma `pair.schema.json` déjà en
place (ADR mentionné dans le corpus), pas un nouveau système de
tracking.

---

## Ce qui reste hors périmètre de ces 4 propositions (limites honnêtes)

- **Aucune de ces propositions ne réduit le taux de 25 % mesuré.** Elles
  réduisent le coût de le détecter et le rendent visible plus tôt — pas
  plus.
- **L'échantillon reste petit** (8/44 chaînes, ~18 %) — ces propositions
  s'appuient sur les 2 motifs trouvés jusqu'ici ; étendre l'échantillon
  aux 44 chaînes (ou aux 9 modules non encore vérifiés) pourrait révéler
  d'autres motifs non couverts par le registre actuel.
- **Aucune automatisation n'élimine la revue humaine finale**, conforme
  à la pratique Google (100 % des changements revus) et Meta
  (CodemodService : "review of every automated diff without exception").
  Ce n'est pas une prudence locale — c'est la norme observée chez les
  deux seuls acteurs ayant publié en détail sur ce type de problème à
  cette échelle.
- **Le coût réel d'exécution** (appels modèle par nœud, taux de succès
  du "punt check" sur notre corpus) n'a jamais été mesuré empiriquement
  — contrairement à Google qui rapporte des chiffres sur 12 mois et 595
  changements réels. La prochaine étape naturelle, si cette direction
  est retenue, serait un test réel sur un petit nombre de nœuds de
  catégorie 1 (mécanique pur, ex. `interactive-map.visualization` ou
  `reporting.report`), avant d'étendre à des nœuds de catégorie 2/3.

## Références

- [`echantillonnage-regles-non-deductibles.md`](./echantillonnage-regles-non-deductibles.md) — chiffres 37/37/25 à l'origine du calibrage.
- [`poc-few-shot-legacy-nx.md`](./poc-few-shot-legacy-nx.md) — premier cas isolé.
- [`generation-from-patterns.md`](./generation-from-patterns.md) — pipeline Phase 08 existant, sur lequel ces propositions se greffent.
- [`patterns/README.md`](./patterns/README.md) — mécanisme `constraints` (H-3) réutilisé comme modèle pour le registre de motifs.
- Google, *Migrating Code At Scale With LLMs At Google*, arXiv:2504.09691 (2025) — mécanisme source des propositions 1, 2, 4.
- Meta, CodemodService (cité via recherche web, 2026-08-12) — confirmation de la norme "revue de 100 % des diffs automatisés, sans exception".
