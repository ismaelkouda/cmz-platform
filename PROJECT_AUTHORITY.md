# Autorité produit et guide de démarrage — cmz-platform

> Point d'entrée obligatoire pour toute personne ou tout agent qui découvre le
> dépôt. Ce document fixe le cap courant, l'ordre des autorités et les règles de
> travail. Il ne remplace pas la lecture du code et des contrats concernés par
> une tâche.

## 1. Ordre d'autorité

En cas de contradiction, utiliser cet ordre :

1. demande explicite actuelle du propriétaire du produit ;
2. contrats, schémas et garde-fous exécutables présents sur la base Git de
   travail ;
3. ADR `Accepted` non supersédé ;
4. [ADR-0094](./docs/adr/0094-cap-produit-interne-remplacement-progressif-et-cibles-web.md)
   pour le cap produit ;
5. [matrice de capacités](./docs/architecture/generation-platform-capability-matrix.md)
   pour les claims techniques ;
6. [feuille de route courante](./docs/architecture/feuille-de-route.md) pour
   l'ordre des prochains travaux ;
7. documents d'architecture spécialisés ;
8. audits, mémos, `taches-restantes.md`, corpus et Git pour l'historique.

Un statut GitHub, une version, une PR ou un résultat CI est une donnée vivante :
il faut la vérifier. Une note « fait localement » ne prouve ni un commit, ni une
PR, ni une fusion, ni une CI verte.

## 2. Mission du produit

Le dépôt construit un **atelier interne assisté par IA** pour produire nos
propres applications métier data-centric : backoffices, CRUD, vues de données,
commandes et workflows. Une application produite doit rester du code standard,
lisible, testable, débogable et modifiable sans connaître le générateur.

```text
besoin métier confirmé
→ sources et contrats versionnés
→ conception applicative validée
→ plan déterministe
→ réalisation UI bornée par un LLM
→ compilation, tests et oracles
→ revue humaine
→ publication contrôlée
```

La conversation aide à concevoir ; elle n'est jamais la source de vérité. Les
artefacts versionnés, leurs preuves et les décisions validées le sont.

### Cap confirmé par le propriétaire

- usage interne d'abord ;
- publication en ligne possible lorsque l'exploitation est prête ;
- aucun claim actuel de SaaS public multi-locataire ;
- remplacement progressif du legacy en production ;
- première application réelle : **signalement de zone non couverte** ;
- le propriétaire possède les données de ce produit : demander les faits
  manquants au lieu de les inventer ;
- Angular et React sont deux cibles produit ;
- une sortie est mono-stack et idiomatique à sa cible.

Toute formulation antérieure présentant SEOS comme finalité, le backoffice
reconstruit comme « golden reference » universel, React comme simple POC ou la
nature produit comme entièrement indécise est historique.

## 3. Ce que le dépôt n'est pas

- un générateur universel de tout type de logiciel ;
- un système autorisé à inventer des règles métier absentes ;
- une preuve qu'un backend réel fonctionne parce qu'un mock passe ;
- un moteur mélangeant Angular et React dans la même application ;
- un SaaS public déjà sécurisé, modéré, facturé et opéré ;
- un système autonome qui fusionne ou déploie sans revue ;
- un runtime propriétaire obligatoire pour les applications produites ;
- un corpus de fine-tuning : le corpus SEOS est un inventaire historique de
  correspondances et décisions.

## 4. Rôle du legacy, de SEOS et de C5

Le legacy sert temporairement à observer des contrats, comportements,
permissions et cas limites. Il ne doit pas imposer sa structure, ses
bibliothèques, ses défauts ou sa présentation aux nouvelles applications.

Le code Angular reconstruit sert à la migration progressive et à la comparaison.
La preuve C5 « Gestion des utilisateurs » éprouve `list-query`,
`action-request`, leur composition et la réalisation d'une page. Elle n'est pas
la première application produit.

Avant de retirer une fonctionnalité legacy :

1. identifier les comportements encore utiles ;
2. les encoder dans des contrats et tests indépendants du legacy ;
3. vérifier la nouvelle tranche contre le backend et les usages réels ;
4. déployer progressivement avec une stratégie de retour arrière ;
5. retirer seulement les consommateurs devenus inutiles.

L'issue #64 gouverne la dernière promotion humaine de la preuve de composition.
L'archivage du corpus et la réduction de ses jobs CI constituent un changement
séparé après cette clôture.

À la date de l'ADR-0094, C5 React possède le chargement progressif et le filtre
Compact à deux niveaux. Le FAB de création est la dernière parité Compact
explicitement ouverte par l'ADR-0093. Cette finition UI ne doit pas être
confondue avec la promotion des primitives de composition.

## 5. Architecture actuelle

### 5.1 Chaîne applicative

Les artefacts centraux sont :

- `backend-contract` : opérations, modèles, sécurité, provenance et cycle de vie
  du backend ;
- `application-design` : audiences, expériences, routes, pages, données,
  actions, états et accessibilité ;
- shell d'application : Angular ou React, sans métier inventé ;
- `list-query` v2 : lecture, paramètres, décodage, cache, concurrence et états ;
- `action-request` v2 : validation, mutation, permission, erreurs, résultat et
  invalidation ;
- `page-execution-plan` : lie N lectures et N actions indépendantes sans
  recopier leurs contrats ;
- work order de page : périmètre de fichiers et contrat de réalisation accordés
  au LLM ;
- oracles : contrats, code cible, navigateur et comportements revendiqués.

Le code déterministe vit sous `tools/generator-platform/`. Les exemples et les
applications de preuve ne créent pas une capacité : ils démontrent un claim
précis.

### 5.2 Place de `workflow-action`

`workflow-action` reste un modèle d'orchestration ordonnée, séparé du plan de
page courant. Il ne devient pas un troisième nœud générique ajouté par défaut.
Une liaison à une page exigera un cas produit réel, un contrat explicite et des
oracles adaptés. Une action ponctuelle reste `action-request`.

### 5.3 Neutralité backend

Une liste peut être un tableau direct, une page ou une projection explicitement
décrite. Laravel, Spring Boot, .NET, Django ou une API propriétaire sont des
sources possibles. Aucun nom comme `data`, `content`, `items` ou `results` ne
déclenche une heuristique cachée.

Les URL d'environnement sont injectées au runtime. Les URL de test historiques
visibles dans le `Dockerfile` ne donnent pas l'autorisation d'appeler le
backend. Tout test vivant exige une décision explicite, des identifiants fournis
hors Git, une portée minimale et commence en lecture seule.

## 6. Frontière d'autorité du LLM

Le LLM peut :

- transformer une demande en définition candidate ;
- proposer des mappings et rendre les inconnues visibles ;
- produire une page dans l'allowlist d'un work order ;
- expliquer un échec et réparer sa cause ;
- préparer une migration et son diff.

Le LLM ne peut pas :

- décider une règle métier, une permission ou un endpoint non fourni ;
- élargir seul un schéma ou une allowlist pour rendre un test vert ;
- présenter une supposition comme une observation ;
- transformer une capture en autorité backend ou comportementale ;
- fusionner, publier ou appeler un service réel sans l'autorité correspondante.

Toujours distinguer : **confirmé**, **observé**, **déduit**, **proposé** et
**inconnu**.

## 7. Règles de réalisation

### 7.1 Natif et officiel avant custom

Chercher d'abord la primitive officielle de la version installée. Ne pas
transposer une API d'une version future ni une convention d'une autre stack.

- Angular : Angular, CDK, Angular Aria, Angular Material, `@angular/localize`,
  signaux et formulaires officiels selon le besoin.
- React : React, React DOM, hooks, React Router et primitives web. Redux,
  Zustand, TanStack Query, une bibliothèque de formulaire, React Aria ou une
  bibliothèque UI exigent chacun un problème démontré et une qualification.
- Style : réutiliser les tokens du dépôt ; Tailwind et SCSS sont
  complémentaires. Le CSS custom ne réimplémente pas un comportement accessible
  déjà couvert par une primitive officielle.

Une primitive partagée n'est promue qu'après deux usages indépendants, un
contrat stable et des oracles communs. Un cas unique peut garder une solution
locale lisible.

### 7.2 Interface adaptative

Une capture ou un fichier Figma porte l'intention visuelle ; les contrats
portent le comportement et les données ; les normes officielles portent les
interactions et l'accessibilité. Aucun ne remplace les autres.

- raisonner par espace utile et contenu, pas par nom d'appareil ;
- préférer HTML sémantique et navigation clavier aux rôles ARIA avancés ;
- une table reste une table tant qu'une grille interactive 2D n'est pas requise
  ;
- filtres, actions, consultation de ligne, sélection, export et création sont
  des capacités optionnelles ;
- une ligne n'est cliquable que si une action de ligne est déclarée ;
- les contrôles internes d'une ligne ne déclenchent jamais son action ;
- dialogue, panneau, sheet ou page sont choisis selon la tâche, l'espace, le
  risque et le contenu, pas selon une table figée de breakpoints ;
- une image devient une baseline seulement après validation humaine explicite et
  provenance cataloguée.

Lire les références officielles consolidées dans
[`ui-adaptative-references-officielles.md`](./docs/architecture/ui-adaptative-references-officielles.md)
et l'inventaire de capacités dans
[`data-view-capabilities-cmz-backoffice-2026-10-01.md`](./docs/architecture/data-view-capabilities-cmz-backoffice-2026-10-01.md).

## 8. Discipline d'ingénierie

### Avant de modifier

1. vérifier l'état Git, la branche, le commit de base et les worktrees ;
2. préserver tous les changements non liés de l'utilisateur ;
3. lire les fichiers concernés, leur configuration et leurs tests ;
4. vérifier la version installée avant toute recherche externe ;
5. rechercher les précédents et la cause racine ;
6. annoncer toute hypothèse susceptible de changer le résultat ;
7. utiliser un worktree isolé pour un chantier indépendant si l'arbre est sale.

### Pendant la réalisation

- petits incréments cohérents sans fragmenter artificiellement une même preuve ;
- aucune écriture hors du périmètre d'un work order ;
- aucune dépendance avant audit de valeur, version, sécurité, licence, poids,
  maintenance et alternatives natives ;
- aucune commande forcée, `--no-verify`, baisse de gate ou relance aveugle ;
- une panne récurrente reçoit une correction de cause racine et un test de
  non-régression ;
- KISS, DRY, YAGNI et SOLID réduisent le coût total ; ils ne justifient pas une
  multiplication de couches.

### Preuve proportionnée

| Claim               | Preuve minimale                                                         |
| ------------------- | ----------------------------------------------------------------------- |
| contrat valide      | schéma + invariants négatifs                                            |
| code cible valide   | type-check/compilation + lint                                           |
| comportement        | test runtime observant l'effet et mutation crédible tuée                |
| intégration         | vrai graphe et vrais adaptateurs internes                               |
| interface           | navigateur, clavier, focus, reflow, états et revue visuelle             |
| accessibilité       | sémantique + outillage + clavier ; lecteur d'écran humain si revendiqué |
| publication         | candidat isolé, diff, rollback/reprise, CI depuis clone propre          |
| support multi-stack | preuve séparée pour chaque stack annoncée                               |

Un test vert ne prouve que ce qu'il a exercé. Un avertissement Nx Cloud local
lié aux identifiants ne doit pas être confondu avec un échec du code ou de la CI
distante.

## 9. Git, revue et fusion

- branche dédiée et PR ciblée ;
- historique linéaire et `main` protégé ;
- approbation indépendante avec droit d'écriture ;
- le dernier pousseur ne peut pas approuver son propre changement ;
- assigner et demander la revue à `soumailakouda` lorsque sa revue est requise ;
- après un nouveau push, vérifier que l'approbation est encore valide ;
- ne pas fusionner tant qu'une gate est rouge ou en cours ;
- après fusion, vérifier le run `main`, pas uniquement celui de la PR.

Rapporter séparément : commit/push, revue demandée, approbation, fusion et CI
post-fusion. Ces états ne sont pas interchangeables.

## 10. Démarrer une application réelle

Lire [LLM_APP_BUILDER.md](./LLM_APP_BUILDER.md), puis :

1. obtenir un brief métier court ;
2. collecter les sources backend sans les réinterpréter ;
3. compiler le contrat backend ;
4. compiler la conception applicative ;
5. choisir explicitement `angular-pwa` ou `react-spa` ;
6. créer le shell ;
7. préparer et réaliser une seule page ;
8. vérifier cette page de bout en bout ;
9. faire valider avant la page suivante.

Pour « signalement de zone non couverte », ne copier ni la carte de pages ni les
règles SEOS. Interroger le propriétaire sur le résultat principal, les acteurs,
les données, les autorisations, le premier parcours et les critères
d'acceptation. Il possède les données : une inconnue est une question, pas un
prétexte pour inventer.

## 11. Clôturer la preuve de composition (#64)

La preuve technique C5 existe. La clôture demande encore une revue de promotion
:

1. matrice critère de #64 → artefact → test → résultat CI ;
2. revue humaine de l'équivalence observable et des limites ;
3. enregistrement distinct des compositions v2, avec maturité par cible ;
4. synchronisation de #64, de la matrice et de la feuille de route ;
5. PR verte et approbation indépendante ;
6. seulement ensuite, fermeture de #64.

La parité React est un objectif produit distinct. Elle ne bloque pas
rétroactivement #64 si l'issue ne l'exige pas ; un claim « Angular + React »
exige en revanche les preuves des deux cibles. Le retrait du corpus vient dans
une PR séparée après cette clôture.

## 12. Carte documentaire

| Besoin                     | Autorité                                             |
| -------------------------- | ---------------------------------------------------- |
| finalité produit           | ADR-0094 + ce document                               |
| construire une application | `LLM_APP_BUILDER.md`                                 |
| capacité revendiquée       | matrice de capacités + tests/CI                      |
| ordre du travail           | feuille de route courante                            |
| décision technique         | ADR accepté non supersédé                            |
| état mécanique             | `STATUS.md` généré                                   |
| preuve de composition      | issue #64 + artefacts C5                             |
| historique détaillé        | `LLM_CONTEXT.md`, `taches-restantes.md`, audits, Git |

`LLM_CONTEXT.md` et `taches-restantes.md` sont conservés pour la traçabilité et
les blocs générés historiques. Ils ne sont plus les sources du cap ni de la
priorité courante. Un document daté décrit son époque ; il ne peut pas annuler
une décision plus récente.
