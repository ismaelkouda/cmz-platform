# ADR-0026 — Réorientation de l'objectif : système de génération générique multi-source/multi-stack

- **Statut :** Accepted
- **Date :** 2026-08-12

## Contexte

Depuis son lancement, ce dépôt a été cadré comme un projet de **migration** :
reconstruire fidèlement `cmz-backoffice-frontend` (système legacy "SEOS") en
Angular 22, avec une rigueur d'ingénierie « big tech » (Meta/Google) —
architecture hexagonale stricte, oracle Generate-Verify-Repair, documentation
vivante, minimisation de l'action humaine. C'est le cadrage que portent
`LLM_CONTEXT.md`, `README.md` racine, `CLAUDE.md` et la plupart des documents
de `docs/architecture/` antérieurs au 2026-08-12.

En parallèle, deux expérimentations ont été menées :

- Un **POC React+TS** hors dépôt (`docs/architecture/strategie-cross-stack-revue.md`,
  ROAD-3c) a prouvé que l'Oracle (build/lint/test/intégration) et les patterns
  SEOS (isolation en couches, contrats par rôle, contraintes H-3/H-4) sont des
  **standards de conception indépendants de la source d'entrée** — pas des
  outils de traduction legacy. L'Oracle a détecté de vraies violations sur du
  code React généré sans qu'aucun legacy n'existe derrière.
- Un **POC mobile natif** (Kotlin/Swift) a été tenté et mis en pause pour une
  raison d'environnement (accès réseau du sandbox, pas un désaccord de fond)
  — `docs/seos/poc-mobile-bloque-acces-sandbox.md`.

Ces deux expérimentations, combinées à l'ambition multi-plateforme déjà
documentée dans ADR-0001/ADR-0003 (React, React Native, Kotlin, Swift, PHP,
Spring Boot, Rust, Grafana cités nommément comme cibles futures du monorepo),
ont amené le porteur du projet à reformuler explicitement l'objectif le
2026-08-12, dans `docs/architecture/conception-pipeline-figma-vers-code.md`
(§ intro) :

> « ne pas se limiter à rendre le legacy conforme à un standard — concevoir
> **tout projet, quelle que soit la stack, quelle que soit la source**
> (legacy, maquette, description), en minimisant autant que possible l'action
> humaine, les données/règles métier restant fournies par un humain. »

Cette reformulation n'était documentée que dans un document de conception
(`docs/architecture/`, cycle de vie « vivant, corrigé sur place ») alors
qu'il s'agit d'une décision structurante au sens strict de la convention ADR
de ce dépôt (`docs/adr/README.md`) : elle change la finalité déclarée du
projet entier, pas un détail technique. Aucun des documents CŒUR
(`LLM_CONTEXT.md`, `README.md`, `CLAUDE.md`) ne la reflétait — risque concret
qu'un futur agent ou un nouveau modèle, lisant uniquement ces points d'entrée,
reparte avec l'ancien cadrage étroit sans jamais savoir que l'objectif a été
élargi.

## Options envisagées

### Option A — Ne rien acter formellement, laisser le document de conception seul porter la réorientation

- Avantages : aucun effort de rédaction supplémentaire.
- Inconvénients : pas de source figée à référencer ; le document de
  conception vit dans un dossier au cycle de vie « corrigé sur place », donc
  moins fiable comme point d'ancrage permanent qu'un ADR ; les documents CŒUR
  restent silencieux sur la réorientation, risque de perte de contexte
  documenté par l'audit du 2026-08-13 (LLM_CONTEXT.md, CLAUDE.md, README.md
  racine tous classés « obsolète silencieux » sur ce point précis).

### Option B — Acter la réorientation par un ADR dédié + faire rayonner un pointeur vers ce document depuis les points d'entrée CŒUR

- Avantages : source unique et figée (convention ADR = jamais amendée sur le
  fond) ; cohérent avec la propre convention du dépôt (`docs/adr/README.md` —
  « un ADR documente une décision structurante ») ; les points d'entrée CŒUR
  (LLM_CONTEXT.md, README.md, CLAUDE.md, docs/README.md) restent courts et
  renvoient vers cette source unique plutôt que de dupliquer le contenu.
- Inconvénients : un document de plus à maintenir en cohérence si la
  réorientation devait elle-même évoluer (mitigé par le mécanisme standard
  ADR : `Superseded by ADR-XXXX`).

## Décision

**Option B.** Cet ADR acte formellement la réorientation de l'objectif du
projet : ce dépôt n'a plus pour seule finalité la migration de SEOS vers
Angular 22, mais la conception d'un **système de génération générique**
capable de produire du code conforme à partir de n'importe quelle source
(legacy, maquette Figma, description texte) et vers n'importe quelle stack
cible, avec l'action humaine réduite au strict irréductible (règles métier,
cas limites, contrats d'intégration — cf. couche 3 de
`docs/architecture/conception-pipeline-figma-vers-code.md`). SEOS/Angular
devient un **cas d'usage particulier** de ce système, pas sa finalité.

Document de conception associé (référence normative pour le détail du
pipeline en 4 couches) :
[`docs/architecture/conception-pipeline-figma-vers-code.md`](../architecture/conception-pipeline-figma-vers-code.md).

## Justification

Le POC React et l'architecture de l'Oracle ont démontré empiriquement que la
partie la plus coûteuse et la plus mature du travail déjà produit (isolation
en couches vérifiée mécaniquement, patterns par rôle, oracle multi-niveaux)
n'a en réalité aucune dépendance structurelle à SEOS ou à Angular — elle est
réutilisable telle quelle pour toute source et toute stack cible. Continuer à
présenter le projet comme une migration SEOS→Angular sous-vendrait ce qui a
réellement été construit et orienterait mal les décisions futures
(priorisation, choix d'outillage, communication).

## Conséquences

### Positives

- Le travail déjà produit sur l'Oracle, les patterns, et la rigueur
  d'ingénierie reste intégralement valide et prend une valeur plus large : il
  sert désormais n'importe quelle génération, pas seulement SEOS.
- Clarifie pourquoi des POC hors du périmètre Angular strict (React, mobile)
  sont légitimes et alignés avec l'objectif, pas des digressions.
- Fournit un point d'ancrage stable pour tout futur agent ou modèle qui
  reprendrait ce travail sans mémoire de session.

### Négatives / dette acceptée

- Les documents antérieurs au 2026-08-12 qui cadrent le projet strictement
  comme « migration SEOS→Angular » (`docs/architecture/feuille-de-route.md`,
  `plan-d-execution.md`, `strategie-de-reconstruction.md`, et une majorité
  des documents `module-*.md`) restent corrects **pour le cas d'usage SEOS
  spécifiquement**, mais ne sont plus représentatifs de l'objectif du dépôt
  dans son ensemble. Ils ne sont pas réécrits (travail historique volumineux,
  toujours exact à leur propre échelle) mais reçoivent une note de tête
  pointant vers cet ADR, plutôt qu'une réécriture complète.
- Le pipeline Figma→code (couches 1-3) reste une **conception non
  implémentée** — cet ADR acte l'objectif, pas un système livré. Les critères
  de passage à l'implémentation (§7 du document de conception) restent le
  seul chemin légitime vers du code réel sur ce sujet.

### Points à réévaluer

- Si le pipeline Figma→code (ou un pipeline équivalent pour une autre source)
  passe effectivement les 4 critères de §7 de son document de conception et
  entre en implémentation, cet ADR devrait être complété (pas remplacé) par
  un ADR dédié à l'implémentation elle-même.
- Si l'expérience prouve que la généricité multi-source ajoute plus de
  complexité qu'elle n'apporte de valeur (aucun deuxième cas d'usage réel
  après SEOS dans un délai raisonnable), cette décision devrait être révisée
  et potentiellement `Superseded`.

## Références

- [`docs/architecture/conception-pipeline-figma-vers-code.md`](../architecture/conception-pipeline-figma-vers-code.md) — conception détaillée du pipeline 4 couches, non implémentée.
- [`docs/architecture/strategie-cross-stack-revue.md`](../architecture/strategie-cross-stack-revue.md) — POC React+TS, preuve empirique de l'indépendance de l'Oracle à la stack.
- [`docs/seos/poc-mobile-bloque-acces-sandbox.md`](../seos/poc-mobile-bloque-acces-sandbox.md) — POC mobile Kotlin/Swift, en pause (environnement, pas désaccord de fond).
- [ADR-0001](./0001-monorepo-nx-package-based.md), [ADR-0003](./0003-nommage-et-structure.md) — ambition multi-plateforme déjà actée antérieurement (React, React Native, Kotlin, Swift, PHP, Spring Boot, Rust).
- [ADR-0009](./0009-reconstruction-pilotee-par-patterns.md), [ADR-0012](./0012-strategie-cross-framework.md) — décisions antérieures, toujours valides pour le cas d'usage SEOS/Angular+React spécifiquement, désormais un sous-ensemble de cet ADR.
- Audit exhaustif des `.md`/`README` du dépôt (2026-08-13, session courante) — a confirmé qu'aucun ADR n'actait encore cette réorientation, et identifié les documents CŒUR à corriger en conséquence.
