# ADR-0038 — Nature de produit : exposition publique et multi-location

- **Statut :** Proposed — décision de nature, délibérément non tranchée
- **Date :** 2026-08-29

## Contexte

[ADR-0037](./0037-plateforme-intention-utilisateur-vers-application.md)
décrit un pipeline qui traduit du langage naturel en `.definition.json`
compilable, pour un utilisateur déjà titulaire d'un accès à ce dépôt. Sa
première rédaction visait initialement un public non authentifié — un
inconnu décrit un besoin sur un site, obtient une application hébergée,
la cite par identifiant. Une revue croisée a établi que cette ambition
mélangeait un problème de compilateur (résolu par ADR-0037) avec un
problème d'exploitation de produit, de nature entièrement différente, qui
mérite sa propre décision plutôt que de rester un paragraphe de « dette
acceptée » dans un document sur le flux de génération.

Ce document existe pour poser cette question de nature **explicitement**,
conformément au précédent déjà posé par ADR-0026 (« une reformulation qui
change la finalité déclarée du projet entier » ne peut pas rester enfouie
ailleurs), sans prétendre y répondre aujourd'hui.

### Ce que « devenir un produit public multi-locataire » impliquerait concrètement

Un site où un inconnu non authentifié tape du texte et obtient une
application hébergée, citable, modifiable, exige au minimum :

- une **authentification utilisateur** (créer un compte, retrouver ses
  pages, empêcher qu'un tiers modifie la page de quelqu'un d'autre) ;
- une **isolation d'hébergement par locataire** — le code généré pour
  l'utilisateur A ne doit ni être visible ni modifiable par l'utilisateur
  B, et aucun des deux ne doit pouvoir affecter le golden reference
  SEOS/CMZ en production s'il cohabite dans le même arbre source ;
- une **infrastructure de service actif en continu** (backend API, base
  de données de registre, service de déploiement) — ce dépôt n'en a
  aujourd'hui aucune ; le travail démontré ici est du génie compilateur
  (IR, renderers, Oracles), pas de l'exploitation SaaS ;
- une **modération de contenu et une détection d'abus avant publication**
  — Proofpoint documente que Lovable, le précédent le plus proche, a été
  exploité pour héberger des sites de phishing fonctionnels en un ou deux
  prompts sur un plan public gratuit, et n'a ajouté ses garde-fous
  qu'après l'abus documenté ;
- une **limitation de fréquence anti-abus**, une **astreinte de
  sécurité**, et une clarification de la **responsabilité légale** sur du
  contenu généré publié sous le nom de domaine de l'opérateur ;
- un **modèle économique** couvrant le coût récurrent : hébergement,
  inférence LLM répétée (ADR-0037 §2 échantillonne N ≥ 3 interprétations
  par génération), modération, support en cas d'abus signalé.

### Ce que ce dépôt possède, et ce qu'il ne possède pas

Ce dépôt a démontré, de façon répétée et vérifiable, une compétence en
compilation de spécifications : IR canonique multi-axes (ADR-0030), graphe
d'exécution typé (ADR-0031), propriété d'artefacts et transactions
atomiques (ADR-0033, ADR-0035), oracles de vérification (build/lint/test,
`check-pattern-nx`, `run-isolation-oracle.mjs`). Aucun de ces éléments
n'est un service : chacun s'exécute localement, sur un seul arbre, pour un
utilisateur qui a déjà un accès de confiance au dépôt.

Ce dépôt ne possède, à la date de ce document : aucun backend de service
actif en continu, aucune base de données de production, aucun service
d'authentification utilisateur, aucun pipeline de modération de contenu,
aucun compte d'hébergement dédié à du contenu tiers, aucune astreinte de
sécurité formalisée. L'environnement de développement lui-même est
documenté ailleurs dans ce dépôt comme sandboxé et à accès réseau limité
(causes de blocage déjà rencontrées sur PLAT-5F, le job SAST, le POC
Kotlin/Swift interrompu) — un indice supplémentaire, pas une preuve à lui
seul, que la construction et l'exploitation continue d'un service public
depuis ce contexte ne sont pas qu'une question de volume de code à écrire.

## Options envisagées

### Option A — Devenir un produit public, hébergé et opéré depuis ce dépôt

- Avantages : réutilise directement le code de compilation déjà écrit ;
  un seul dépôt à maintenir.
- Inconvénients : fait cohabiter du code généré par des inconnus non
  authentifiés avec le golden reference SEOS/CMZ en production, dans le
  même arbre git, la même CI, le même historique — un problème de
  frontière de confiance, pas un détail d'architecture ; exige de
  construire de zéro toute l'infrastructure de service listée ci-dessus,
  hors du métier démontré par ce dépôt ; le socle transactionnel
  ADR-0033/ADR-0035 devrait être reconçu au-delà de son domaine de
  validité prouvé (un seul arbre de confiance, sans lecteur externe
  concurrent).

### Option B — Rester un compilateur interne, indéfiniment

- Avantages : cohérent avec le métier démontré et l'infrastructure
  existante ; aucun risque d'abus public à gérer ; ADR-0037 suffit
  intégralement à ce périmètre.
- Inconvénients : ferme la porte à l'ambition initiale exprimée pour ce
  besoin (permettre à une personne non-initiée d'utiliser directement la
  plateforme) sans jamais la reconsidérer.

### Option C — Séparer le produit public du compilateur, comme un consommateur externe

- Avantages : le compilateur (`tools/generator-platform/`) devient une
  dépendance publiée et versionnée, consommée par un produit distinct
  (dépôt séparé, frontière de confiance séparée, propre CI, propre
  décision de ressourcing) — même principe que celui déjà acté par
  ADR-0034 (core partagé, sorties/renderers séparés) transposé au niveau
  produit plutôt qu'au niveau renderer ; permet de construire
  l'infrastructure de service sans jamais mélanger son cycle de vie avec
  celui du golden reference SEOS/CMZ ; le produit public peut évoluer
  (changer d'hébergeur, de modèle de facturation, de politique de
  modération) sans toucher au compilateur, et inversement.
- Inconvénients : nécessite un nouveau dépôt, une nouvelle décision de
  ressourcing (qui opère la modération, qui répond en cas d'abus signalé,
  quel budget d'hébergement et d'inférence répétée) avant tout code ;
  duplique une partie de la CI et de la gouvernance déjà en place ici.

## Décision

**Non tranchée.** Ce document existe pour que la question soit posée
explicitement plutôt que résolue implicitement par le silence, comme
c'était le cas dans la première version d'ADR-0037. Si cette ambition se
confirme, l'Option C est la piste la plus cohérente avec les principes
déjà appliqués ailleurs dans ce dépôt (ADR-0034), mais son adoption
formelle exige une discussion de ressourcing préalable qui n'a pas eu
lieu — modération, astreinte, budget d'hébergement et d'inférence,
responsabilité légale — pas seulement une décision d'architecture
logicielle.

## Justification

Une décision de nature de produit ne se tranche pas par défaut à
l'intérieur d'un document sur le flux de génération, pour les mêmes
raisons qu'ADR-0026 a déjà établies pour un changement de finalité
déclarée du projet entier : les conséquences engagent des ressources,
une responsabilité et une gouvernance qui débordent largement du
périmètre de la décision technique qui les a d'abord fait apparaître.
Laisser cette question ouverte plutôt que la trancher par défaut est,
dans ce cas précis, la décision la plus rigoureuse disponible : trancher
prématurément dans un sens ou dans l'autre, sans la discussion de
ressourcing qu'elle exige, serait moins honnête que de la nommer non
résolue.

## Conséquences

### Positives

- ADR-0037 peut avancer et être implémenté sans attendre la résolution de
  cette question, puisqu'il ne dépend d'aucune de ses réponses possibles.
- La question reste visible et traçable plutôt que redécouverte après
  coup par un incident (le mode d'apparition documenté chez le précédent
  Lovable/phishing).
- Si l'ambition se confirme un jour, ce document fournit déjà l'inventaire
  des exigences réelles (auth, isolation, modération, budget) plutôt que
  de repartir de zéro.

### Négatives / dette acceptée

- L'ambition initiale d'un site public pour utilisateur non-initié reste,
  pour l'instant, non réalisée — seule sa partie compilateur (ADR-0037)
  avance.
- Ce document ne fixe aucun calendrier de réévaluation ; il pourrait
  rester non tranché indéfiniment sans déclencheur explicite.

### Points à réévaluer

- Si un besoin métier concret et non hypothétique de public externe
  apparaît (un utilisateur réel, nommé, avec une demande documentée —
  pas une extrapolation), rouvrir ce document avec la discussion de
  ressourcing qui manque aujourd'hui plutôt que de la contourner.
- Si l'Option C est un jour engagée, vérifier d'abord que le compilateur
  (`tools/generator-platform/`) peut réellement être consommé comme
  dépendance externe versionnée sans réécriture majeure — ce point n'est
  pas vérifié par ce document.

## Références

- [ADR-0026](./0026-reorientation-objectif-generation-generique.md) —
  précédent : une reformulation qui change la finalité déclarée du projet
  ne reste pas enfouie dans un autre document.
- [ADR-0029](./0029-perimetre-capacites-plateforme-generation.md) —
  périmètre de capacités actuel, strictement compilateur.
- [ADR-0033](./0033-propriete-artefacts-regeneration-non-destructive.md)
  et [ADR-0034](./0034-plateforme-multi-stack-renderers-separes-sorties-mono-stack.md)
  — principe de séparation core/sorties, transposé ici au niveau produit
  (Option C).
- [ADR-0035](./0035-contrat-durabilite-publication-generation.md) —
  contrat de durabilité borné explicitement à un seul arbre sans lecteur
  externe concurrent, incompatible tel quel avec l'Option A.
- [ADR-0037](./0037-plateforme-intention-utilisateur-vers-application.md)
  — pipeline de génération dont ce document extrait la question de
  nature de produit.
- Proofpoint — « Cybercriminals Abuse AI Website Creation App For
  Phishing » — précédent d'abus documenté sur l'outil le plus proche.
