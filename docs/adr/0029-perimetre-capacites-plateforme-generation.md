# ADR-0029 — Périmètre de capacités de la plateforme de génération

- **Statut :** Accepted
- **Date :** 2026-08-14
- **Supersède :**
  [ADR-0026](./0026-reorientation-objectif-generation-generique.md)

## Contexte

ADR-0026 a correctement réorienté le dépôt au-delà de la seule migration
SEOS→Angular. Sa formulation « n'importe quelle source vers n'importe quelle
stack » ne définit toutefois aucune frontière vérifiable.

Une maquette, un OpenAPI, un legacy, une spécification textuelle et des traces
d'exécution ne fournissent pas les mêmes faits. De même, Angular, React, Swift,
Kotlin, un système embarqué ou un moteur de données ne partagent pas une cible
architecturale suffisamment homogène pour être couverts honnêtement par une
promesse universelle.

Les preuves disponibles sont plus étroites :

- SEOS→Angular est une implémentation de référence volumineuse, dont la
  conformité structurelle est fortement instrumentée ;
- le POC React hors dépôt montre que le principe build/lint/test peut être
  transposé, mais ne fournit pas un renderer reproductible en CI ;
- Figma→code est une conception non implémentée ;
- Kotlin/Swift est un essai interrompu, non une capacité validée ;
- l'équivalence fonctionnelle de la génération SEOS reste à établir en Phase 09.

La direction doit donc rester ambitieuse sans transformer une extensibilité
souhaitée en capacité livrée.

## Options envisagées

### Option A — Conserver la promesse universelle d'ADR-0026

- Avantages : vision simple à communiquer ; aucune limite déclarée.
- Inconvénients : objectif non falsifiable ; priorisation impossible ; risque de
  sur-abstraction ; aucun critère objectif pour déclarer une source ou une stack
  supportée.

### Option B — Plateforme extensible dans une enveloppe de capacités déclarée

- Avantages : ambition conservée ; claims vérifiables ; ordre d'investissement
  explicite ; possibilité d'ajouter des sources et cibles sans les prétendre
  supportées avant preuve.
- Inconvénients : portée initiale plus étroite ; obligation de maintenir une
  matrice de capacités et des critères de promotion.

### Option C — Revenir à une migration SEOS→Angular uniquement

- Avantages : périmètre minimal et immédiatement productif.
- Inconvénients : abandon prématuré des enseignements cross-stack ; ne permet
  pas de tester si les investissements de génération sont réutilisables.

## Décision

**Option B.** Le dépôt construit une **plateforme extensible de compilation de
spécifications applicatives**, initialement bornée aux applications métier
data-centric : backoffices, CRUD, vues analytiques et workflows.

La plateforme fusionne des preuves issues de sources déclarées vers une
représentation canonique, puis produit des artefacts pour des cibles
explicitement supportées. Une source ou une cible n'est annoncée comme supportée
qu'après satisfaction des gates de la matrice de capacités.

Ordre initial :

1. **Sources :** spécification structurée versionnée et legacy TypeScript.
2. **Cibles utilisateur :** Angular et ReactJS. Les identifiants techniques
   internes des profils restent `angular-nx` et `react-typescript`.
3. **Preuve :** deux vertical slices — `action-request`, puis `workflow-action`.
4. **Source partielle suivante :** Figma, limitée à l'intention de présentation.
5. **Cibles suivantes :** Kotlin/Swift après réussite de la matrice web 2×2.

SEOS/Angular reste le **golden reference**, le terrain de mesure et un livrable
produit. Il n'est ni abandonné ni relégué derrière des POC spéculatifs.

La source de vérité vivante sur la maturité est
[`generation-platform-capability-matrix.md`](../architecture/generation-platform-capability-matrix.md).

## Justification

Cette décision transforme un quantificateur universel impossible à démontrer en
contrat extensible et falsifiable. Elle conserve la valeur de la réorientation
sans confondre architecture prévue et produit livré.

Le domaine initial correspond aux preuves déjà présentes dans le dépôt. Il est
assez large pour tester CRUD, requêtes, commandes et workflows, mais assez borné
pour définir des critères de réussite et d'arrêt.

La minimisation de l'action humaine reste un objectif d'optimisation, non une
fin absolue. Elle sera mesurée à correction constante : temps de revue, nombre
d'ambiguïtés, itérations de réparation et défauts sémantiques échappés.

## Conséquences

### Positives

- Les claims deviennent alignés sur les preuves reproductibles.
- La Phase 09 SEOS et le vertical slice plateforme se renforcent mutuellement.
- Figma, React et mobile reçoivent un ordre d'investissement explicite.
- Une nouvelle source ou stack peut être ajoutée sans élargir silencieusement le
  contrat produit.

### Négatives / dette acceptée

- Les documents qui répètent « n'importe quelle source/stack » doivent être
  requalifiés ou pointer vers cet ADR.
- Le POC React doit être rapatrié sous une forme reproductible avant d'être
  compté comme renderer supporté.
- La matrice 2×2 et les tests d'équivalence n'existent pas encore.

### Points à réévaluer

- Superséder cette décision si deux vertical slices réels montrent que le coût
  du core partagé dépasse durablement celui de générateurs spécialisés.
- Élargir l'enveloppe au-delà des applications métier data-centric seulement
  après une preuve contradictoire sur un domaine réellement différent.
- Suspendre la plateforme si chaque nouvelle source ou cible exige des
  branchements dans le core plutôt qu'un adaptateur ou renderer isolé.

## Références

- [ADR-0026](./0026-reorientation-objectif-generation-generique.md) — décision
  supersédée : réorientation initiale non bornée.
- [ADR-0030](./0030-ir-canonique-et-profils-cibles.md) — frontière entre IR et
  profils cibles.
- [ADR-0031](./0031-graphe-execution-et-manifests-composition.md) — exécution et
  traçabilité des compositions.
- [`audit-generation-generique-multi-source-multi-stack-2026-08-14.md`](../architecture/audit-generation-generique-multi-source-multi-stack-2026-08-14.md)
  — mesures ayant motivé la consolidation.
