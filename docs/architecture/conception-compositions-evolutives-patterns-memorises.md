# Conception — compositions évolutives, patterns mémorisés et régénération non destructive

- **Statut :** direction d'architecture acceptée, non entièrement implémentée
- **Date de référence :** 2026-08-16
- **Périmètre initial :** applications métier data-centric, cibles Angular et
  ReactJS
- **Décision multi-stack :** plateforme multi-stack, renderers strictement
  séparés, applications générées mono-stack
- **Décisions normatives parentes :**
  [ADR-0029](../adr/0029-perimetre-capacites-plateforme-generation.md),
  [ADR-0030](../adr/0030-ir-canonique-et-profils-cibles.md),
  [ADR-0031](../adr/0031-graphe-execution-et-manifests-composition.md)

## 0. Résumé exécutif

La plateforme doit permettre de décrire une application métier comme une
composition de données, règles, opérations, comportements et intentions de
présentation, puis de produire plusieurs cibles techniques depuis cette même
signification.

La décision centrale est la suivante :

> Toute fonctionnalité générée possède une composition persistée et
> reproductible. Une composition démontrée comme réutilisable peut être promue
> en pattern versionné. Un pattern nommé reste une composition mémorisée, jamais
> une famille obligatoire du noyau.

La stratégie de cibles est également actée :

> **Plateforme multi-stack, renderers strictement séparés, applications générées
> mono-stack.**

Le core, les modèles canoniques, le planner, les compositions et les scénarios
métier sont communs. Chaque stack possède son profil, son renderer et ses
Oracles propres. Une sortie générée choisit une seule stack et ne mélange jamais
Angular et ReactJS.

`action-request`, `workflow-action`, `crud-entity` et `read-only-view` sont donc
des références historiques ou des recettes utiles. Ils ne constituent ni une
liste exhaustive de fonctionnalités, ni des branches légitimes du core.

La preuve décisive attendue est une évolution simultanée et non destructive :

1. reprendre une composition mémorisée ;
2. modifier ses données, permissions, comportements et présentation ;
3. régénérer Angular et ReactJS ;
4. préserver les extensions humaines ;
5. ne modifier ni le core, ni le planner, ni les renderers ;
6. réussir un Oracle métier commun aux deux cibles.

Cette preuve n'existe pas encore. Les vertical slices actuelles démontrent une
génération multi-source/multi-stack bornée, mais leurs schémas, compilateurs et
renderers restent spécialisés par composition de référence.

## 1. Problème à résoudre

Un générateur classique sait produire un ensemble de fichiers à partir d'un
template. Il devient fragile dès que :

- le besoin ne correspond plus exactement au template ;
- plusieurs sources décrivent partiellement ou contradictoirement le même
  produit ;
- le comportement doit rester identique entre plusieurs stacks ;
- une fonctionnalité déjà générée évolue sur plusieurs axes ;
- des développeurs ont ajouté des extensions qui ne doivent pas être écrasées ;
- une recette réutilisable évolue sans casser ses consommateurs existants.

La plateforme recherchée doit traiter l'application comme un système
reproductible, pas comme une archive de fichiers copiés. Elle mémorise la
connaissance qui a produit le code : sources, faits, décisions, modèles,
composition, versions, résultats d'Oracle et artefacts.

## 2. Objectif produit

Dans l'enveloppe d'ADR-0029, un auteur doit pouvoir :

1. fournir une ou plusieurs sources d'intention ;
2. résoudre les inconnues ou contradictions qui empêchent la génération ;
3. construire une composition nouvelle ou instancier un pattern existant ;
4. choisir Angular, ReactJS ou les deux ;
5. prévisualiser le plan et l'impact avant toute écriture ;
6. générer et vérifier les artefacts ;
7. ajouter du code d'extension dans des frontières protégées ;
8. modifier ultérieurement plusieurs dimensions de la fonctionnalité ;
9. régénérer sans perdre les extensions ni réinterpréter manuellement le besoin.

La promesse n'est pas de déduire des règles métier absentes. L'humain reste
responsable des choix irréductibles : autorité des sources, règles, permissions,
cas limites, contrats d'intégration, arbitrages UX et acceptation des
migrations.

## 3. Non-objectifs

Cette conception ne promet pas :

- la génération universelle de tout type de logiciel ;
- l'invention autonome d'un métier à partir d'une description vague ;
- la fusion automatique de code manuel arbitraire dans des fichiers générés ;
- l'équivalence avec un backend non observé et non contracté ;
- l'absence de revue humaine pour une migration cassante ;
- la promotion automatique de chaque composition en pattern public ;
- un `Custom` non typé utilisé comme échappatoire normale ;
- l'ajout d'une nouvelle stack avant preuve de stabilité de la matrice web.

### 3.1 Options évaluées et décisions

| Option                                                                         | Décision | Motif                                                                                                   |
| ------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------- |
| Ajouter une famille et un générateur pour chaque nouveau besoin                | Rejetée  | Transforme les exemples en taxonomie fermée et multiplie schémas, CLI, renderers et Oracles spécialisés |
| Enregistrer seulement les patterns jugés réutilisables                         | Rejetée  | Perd la provenance et empêche de reproduire ou modifier les fonctionnalités non promues                 |
| Promouvoir immédiatement toute composition comme pattern public                | Rejetée  | Produit un catalogue de variantes presque identiques, sans contrat stable ni signal de réutilisation    |
| Persister toute composition et promouvoir séparément les abstractions prouvées | Retenue  | Sépare l'obligation de mémoire de la décision de standardisation                                        |
| Autoriser du code humain dans les fichiers générés puis fusionner le texte     | Rejetée  | Rend la propriété ambiguë et la régénération dépendante d'heuristiques fragiles                         |
| Séparer artefacts générés et extensions humaines par contrats                  | Retenue  | Rend la non-destruction testable par propriété et par hash                                              |
| Faire interpréter directement chaque pattern par les renderers                 | Rejetée  | Force chaque cible à connaître le catalogue métier et recrée un coût `patterns × cibles`                |
| Introduire un planner commun et un plan d'artefacts neutre                     | Retenue  | Permet aux renderers de dépendre de responsabilités stables plutôt que de noms de recettes              |
| Construire une représentation universelle du code de toutes les stacks         | Rejetée  | Déplace les particularités des frameworks dans une méta-syntaxe plus complexe que les renderers         |
| Étendre immédiatement la preuve à une nouvelle stack                           | Différée | N'aide pas à résoudre l'évolution non destructive et augmente la surface avant stabilisation du core    |

### 3.2 Erreurs de raisonnement à prévenir

Les revues doivent rechercher explicitement les dérives suivantes :

- **confusion exemple/type** : une vertical slice réussie devient par habitude
  une catégorie du modèle ;
- **optimisation locale** : les tests d'un générateur spécialisé deviennent
  verts alors que l'invariant de composabilité régresse ;
- **mesure de substitution** : le nombre de familles supportées remplace la
  mesure « nouvelle composition sans changement du core » ;
- **biais de sunk cost** : une abstraction insuffisante est conservée parce que
  ses renderers et tests sont déjà coûteux ;
- **généralisation prématurée** : un seul cas produit une primitive ou un
  pattern public ;
- **échappatoire normalisée** : `Custom` ou une extension non typée devient le
  chemin habituel ;
- **confusion compilation/comportement** : une sortie compilable est présentée
  comme sémantiquement équivalente ;
- **confusion cible/core** : une convention Angular/Nx remonte dans le modèle
  canonique parce qu'elle simplifie temporairement le premier renderer.

## 4. Terminologie normative

### 4.1 Composition instance

Définition complète et immuable d'une fonctionnalité précise dans une
application précise. Elle référence les modèles canoniques, le graphe
d'exécution, l'intention de présentation, les paramètres et les extensions.

Toute fonctionnalité générée possède une composition instance persistée.

### 4.2 Composition mémorisée

Composition instance conservée avec son manifest afin d'être rejouée, auditée,
comparée ou modifiée. « Mémorisée » implique persistance et reproductibilité,
pas réutilisabilité universelle.

### 4.3 Candidat pattern

Composition dont une partie semble réutilisable et dont les invariants et points
de variation commencent à être extraits. Elle reste expérimentale et ne porte
pas encore une garantie de compatibilité publique.

### 4.4 Pattern promu

Composition paramétrée, versionnée, documentée et vérifiée sur des contextes
métier indépendants. Elle possède un owner, un contrat de variation, une suite
d'Oracles et une politique de migration.

### 4.5 Pattern mémorisé

Nom pratique désignant un candidat ou un pattern promu enregistré dans le
catalogue. Son nom accélère la découverte ; il ne lui donne aucun privilège dans
le core.

### 4.6 Registre de compositions

Stockage content-addressed des définitions, versions, relations de dérivation,
manifests et états de cycle de vie. Le registre est distinct du catalogue de
patterns promus.

### 4.7 Planner

Composant déterministe qui transforme les modèles canoniques et une composition
normalisée en plan d'artefacts neutre. Il ne produit pas directement du code de
framework.

### 4.8 Plan d'artefacts

Description cible-neutre des responsabilités à matérialiser : modèles,
validation, autorisation, client d'intégration, contrôleur d'exécution, vue,
navigation, ports d'extension, tests et configuration.

### 4.9 Renderer

Projection d'un plan d'artefacts vers un profil cible. Les identifiants
techniques initiaux restent `angular-nx` et `react-typescript`; les noms
utilisateur sont Angular et ReactJS.

### 4.10 Extension humaine

Code écrit hors des zones appartenant au générateur et raccordé par un contrat
explicite. Une extension ne doit pas être analysée puis fusionnée textuellement
dans un fichier généré.

## 5. Invariants d'architecture

Les invariants suivants sont bloquants :

1. Le core ne branche jamais sur un nom de pattern tel que `action-request` ou
   `workflow-action`.
2. Le core ne contient aucun chemin, import, décorateur ou convention Angular,
   ReactJS, Figma ou SEOS.
3. Un adaptateur source ne connaît aucune convention de cible.
4. Un renderer n'inspecte jamais la source d'origine.
5. Une composition ad hoc passe par les mêmes contrats et Oracles qu'un pattern
   promu.
6. Toute sortie générée est reliée à une composition, des sources, des décisions
   et des versions d'outillage.
7. Toute génération est déterministe à entrées et versions identiques.
8. Les inconnues et contradictions ne sont jamais transformées silencieusement
   en valeurs par défaut.
9. Les extensions sont protégées par propriété d'artefact, pas par heuristique
   de fusion textuelle.
10. Une évolution cassante crée une nouvelle version et une migration explicite.
11. Une capacité non interprétée par un renderer provoque un refus avant
    écriture.
12. Une fonctionnalité n'est pas promue parce qu'elle compile, mais parce que
    son comportement est vérifié.

## 6. Architecture logique

```text
Sources partielles
    │
    ▼
Evidence Model
    │ faits, provenance, confiance, inconnues, contradictions
    ▼
Semantic Model
    │ types, opérations, règles, permissions, erreurs, intégrations
    ├─────────────────────────────┐
    ▼                             ▼
Behavior Model               Presentation Intent
    │ graphe, états, politiques   │ vues, navigation, interactions, a11y
    └──────────────┬──────────────┘
                   ▼
          Composition normalisée
                   │
                   ▼
          Planner déterministe
                   │
                   ▼
            Plan d'artefacts
              ┌────┴────┐
              ▼         ▼
           Angular   ReactJS
              └────┬────┘
                   ▼
                 Oracle
                   │
                   ▼
       Manifest + registre + résultats
```

### 6.1 Décision de partition multi-stack

La plateforme conserve un front-end et un middle-end de compilation communs,
puis délègue la matérialisation à un backend strictement propre à chaque stack.

```text
Sources et preuves
        ↓
IR canonique commune
        ↓
Composition + graphe + présentation
        ↓
Planner commun
        ↓
Artifact Plan neutre
        ├── Renderer Angular  → application Angular
        └── Renderer ReactJS  → application ReactJS
```

Cette décision implique :

1. les données, règles, permissions, états, comportements et intentions de
   présentation appartiennent au chemin commun ;
2. les fichiers, frameworks, mécanismes de réactivité, injection, routing, build
   et tests propres à une stack appartiennent à son renderer et à son profil ;
3. aucune condition `if target === angular|reactjs` n'est admise dans le core ou
   le planner ;
4. aucune sémantique métier n'est dupliquée dans les renderers ;
5. une application générée sélectionne un seul profil cible ;
6. produire les deux cibles signifie effectuer deux compilations indépendantes
   du même plan, pas construire une application hybride ;
7. les Oracles métier communs comparent les comportements observables, tandis
   que les Oracles cibles vérifient les contraintes techniques propres à chaque
   stack ;
8. aucune troisième stack n'est ajoutée avant réussite du test directeur et de
   la falsification par une composition comportementale complexe.

Le partage recherché porte sur la signification, les contrats, le plan et les
preuves. Il ne force pas le partage du code runtime entre Angular et ReactJS.

### 6.2 Alternatives rejetées

#### Plateforme mono-stack Angular

Rejetée comme direction courante. Elle simplifierait le court terme mais
supprimerait le contradicteur ReactJS qui révèle les fuites de framework dans le
core. Angular reste néanmoins le golden reference industriel.

#### Générateurs Angular et ReactJS totalement indépendants

Rejetés. Ils dupliqueraient ingestion, sémantique, règles, planification et
scénarios métier, avec un coût proportionnel aux sources, compositions et
cibles.

#### Renderer universel ou runtime partagé obligatoire

Rejeté. Les stacks possèdent des modèles d'exécution et conventions légitimes
différents. Les contraindre derrière une représentation de code universelle
déplacerait leur complexité dans le core.

#### Application hybride Angular et ReactJS

Hors objectif. Le multi-stack concerne la capacité de compiler une même
signification vers plusieurs cibles, pas le mélange de frameworks dans une même
sortie.

### 6.3 Critères de réévaluation

La scission en plateformes mono-stack devra être réexaminée si les preuves
montrent durablement que :

- le core ou le planner doit brancher sur la cible ;
- l'Artifact Plan devient une copie des concepts Angular ou ReactJS ;
- les deux cibles exigent des concepts sémantiques incompatibles dans l'IR ;
- chaque nouvelle composition réintroduit deux implémentations métier ;
- les scénarios métier observables ne peuvent pas être partagés ;
- le coût du socle commun dépasse durablement celui de générateurs spécialisés.

La décision ne sera pas révisée sur la base d'une difficulté locale dans un
renderer. Elle exige une contradiction répétée du contrat commun après
séparation correcte des responsabilités.

## 7. Contrat de composition

Une composition ne contient pas du code de framework. Elle référence des
éléments canoniques par identifiant stable.

Exemple indicatif, non encore contractuel :

```json
{
    "schema_version": "1.0.0",
    "composition_id": "support.submit-request",
    "composition_version": "1.0.0",
    "semantic_model_ref": "semantic:sha256:...",
    "behavior_model_ref": "behavior:sha256:...",
    "presentation_intent_ref": "presentation:sha256:...",
    "pattern": {
        "id": "action-request",
        "version": "2.0.0"
    },
    "parameters": {
        "operation_ref": "operation.submit-support-request",
        "success_view_ref": "view.support-confirmation"
    },
    "extension_slots": [
        {
            "id": "after-success",
            "contract_ref": "contract.after-operation-success"
        }
    ]
}
```

Le champ `pattern` est optionnel. Une composition inline sans pattern reste
pleinement légitime et vérifiable.

## 8. Graphe d'exécution

Le Behavior Model suit ADR-0031. Il décrit au minimum :

- nœuds d'opération référencés par identifiant stable ;
- liaisons de données typées ;
- arêtes `next`, `success`, `failure`, `condition`, `compensate` ;
- gardes d'état et d'autorisation ;
- préconditions et postconditions ;
- erreurs attendues, réparables et terminales ;
- politiques de timeout, retry, backoff, concurrence, idempotence et annulation
  ;
- modes de livraison request/response, job, callback, subscription ou stream ;
- effets observables et ordre requis des effets.

Les noms métier comme `take` ou `approve` appartiennent au Semantic Model. Le
renderer ne leur associe aucun comportement implicite. Il interprète des types
de nœuds et des contrats, jamais une chaîne métier particulière.

## 9. Presentation Intent

La présentation est une dimension canonique distincte. Elle exprime :

- hiérarchie des vues ;
- navigation et routes logiques ;
- contenu et libellés référencés ;
- champs visibles, éditables ou masqués ;
- groupements, étapes et ordre de saisie ;
- actions disponibles et conditions d'affichage ;
- états de chargement, vide, succès et erreur ;
- accessibilité et navigation clavier ;
- responsive intent ;
- références de design tokens ;
- liens entre événements d'interface et opérations sémantiques.

Elle ne doit contenir ni composant Angular, ni hook ReactJS, ni classe CSS
propre à une cible.

Une modification `formulaire simple → parcours en étapes` doit pouvoir changer
le Presentation Intent et certaines arêtes d'interaction sans réécrire les types
métier ou l'intégration HTTP.

## 10. Mémoire et cycle de vie

### 10.1 États

```text
draft
  → validated-composition
  → generated-instance
  → candidate-pattern
  → promoted-pattern
  → deprecated
  → retired
```

Une composition peut rester indéfiniment une `generated-instance`. La promotion
n'est pas nécessaire à sa conservation.

### 10.2 Promotion

Une promotion exige :

- réutilisation ou validation sur des contextes métier indépendants ;
- invariants clairement séparés des paramètres ;
- absence de noms accidentellement liés au premier domaine ;
- modèle de variation typé ;
- comportement comparable entre les cibles supportées ;
- mutations significatives tuées par l'Oracle ;
- documentation auteur ;
- owner et politique de dépréciation ;
- migration définie si un consommateur antérieur existe.

### 10.3 Refus de promotion

Une composition n'est pas promue si :

- elle n'a qu'un usage et aucune variation démontrée ;
- ses paramètres exposent directement des détails du renderer ;
- elle exige une extension non typée pour fonctionner normalement ;
- son contrat est plus difficile à utiliser que sa composition explicite ;
- elle masque des règles métier propres à un seul domaine ;
- ses sorties divergent sémantiquement entre Angular et ReactJS.

### 10.4 Identité et immutabilité

Une version publiée est immuable. Toute modification de contenu produit un
nouveau hash. Un nom humain peut pointer vers une version, mais le manifest
référence toujours l'identité immutable.

## 11. Modèle de variation

Un pattern expose uniquement des points de variation déclarés.

Exemples :

- références de types d'entrée et de sortie ;
- contraintes de champ ;
- mode d'accès et permissions ;
- opération d'intégration ;
- branches facultatives ;
- effets après succès ou échec ;
- vue de succès ;
- route suivante ;
- politiques d'exécution ;
- slots d'extension.

Chaque variation possède :

- un type ;
- une valeur par défaut seulement si elle est sémantiquement sûre ;
- des contraintes ;
- une documentation ;
- une incidence déclarée sur les modèles et artefacts ;
- des tests de compatibilité.

L'ajout répété de booléens constitue un signal de mauvaise abstraction. Une
variation structurelle importante doit devenir une sous-composition ou une
nouvelle version, pas une combinaison incontrôlable de flags.

## 12. Classification des changements

### 12.1 Changement paramétrique compatible

Exemples : libellé, route logique, type déjà accepté par un slot, permission
remplacée par une permission de même contrat.

Il crée une nouvelle composition instance, sans nécessairement créer une
nouvelle version majeure du pattern.

### 12.2 Changement structurel compatible

Exemples : ajout d'un champ optionnel, ajout d'une branche facultative prévue,
ajout d'une vue dans un slot extensible.

Il peut exiger une version mineure du pattern et une régénération ciblée.

### 12.3 Changement comportemental cassant

Exemples : rendre un champ obligatoire, modifier une transition autorisée,
changer l'ordre d'effets observables, supprimer une permission ou une branche.

Il exige une nouvelle version majeure, une analyse d'impact et une migration
acceptée explicitement.

### 12.4 Changement de renderer

Une amélioration propre à Angular ou ReactJS ne modifie pas la composition. Le
manifest enregistre la nouvelle version du renderer et les nouveaux hashes de
sortie.

### 12.5 Changement de source

Une source modifiée produit de nouvelles preuves. La plateforme recalcule les
modèles affectés avant de proposer un changement de composition. Une nouvelle
observation ne remplace jamais silencieusement une décision humaine existante.

## 13. Changement simultané multi-axes

Une évolution peut toucher dans la même opération :

- le Semantic Model : données, contraintes, opérations ou permissions ;
- le Behavior Model : nœuds, arêtes, gardes, erreurs ou politiques ;
- le Presentation Intent : vues, étapes, interactions ou navigation ;
- les intégrations : endpoint, transport ou mapping wire ;
- les extensions : ajout ou retrait d'un slot, jamais réécriture de son code.

La plateforme construit un `Change Set` canonique. Chaque modification contient
:

- ancienne et nouvelle référence ;
- justification ;
- preuves concernées ;
- compatibilité estimée ;
- consommateurs affectés ;
- artefacts à créer, modifier ou retirer ;
- Oracles à rejouer ;
- décision humaine requise, le cas échéant.

Le changement n'est appliqué qu'après validation du Change Set et du plan
d'artefacts différentiel.

## 14. Planner et analyse d'impact

Le planner reçoit exclusivement :

- les modèles canoniques validés ;
- la composition normalisée ;
- un profil de capacité cible versionné ;
- éventuellement le manifest précédent pour une régénération.

Il produit :

- les responsabilités logiques à matérialiser ;
- leurs dépendances ;
- leurs propriétaires ;
- les capacités renderer requises ;
- les artefacts attendus ;
- les artefacts obsolètes ;
- les slots d'extension ;
- les Oracles nécessaires ;
- un diagnostic des capacités manquantes.

Le planner échoue avant rendu si une capacité requise n'est pas supportée par
une cible demandée.

## 15. Contrat du plan d'artefacts

Exemples de responsabilités neutres :

| Responsabilité         | Rôle                                             |
| ---------------------- | ------------------------------------------------ |
| `domain-model`         | représenter un type métier                       |
| `input-validator`      | vérifier les contraintes déclarées               |
| `authorization-guard`  | appliquer un contrat de permission               |
| `integration-client`   | invoquer un port externe                         |
| `execution-controller` | interpréter le graphe d'une fonctionnalité       |
| `state-projection`     | exposer l'état utile à la présentation           |
| `view`                 | matérialiser une intention de présentation       |
| `navigation-binding`   | relier une interaction à une destination logique |
| `extension-contract`   | déclarer un point d'extension protégé            |
| `behavior-test`        | vérifier un scénario canonique                   |

Un renderer déclare les responsabilités et variantes qu'il sait matérialiser. Il
ne reçoit pas une composition dont certaines capacités sont ignorées.

## 16. Contrat des renderers

Un renderer doit :

- être une fonction déterministe de l'Artifact Plan et du profil cible ;
- refuser les responsabilités inconnues ;
- produire un inventaire exhaustif des fichiers ;
- déclarer les versions de framework et d'outillage attendues ;
- séparer les zones générées des extensions ;
- émettre les tests cibles nécessaires ;
- ne jamais consulter le nom d'un pattern pour choisir un comportement ;
- ne jamais consulter les sources d'origine ;
- ne pas compenser silencieusement une information absente du plan.

Correspondances indicatives :

| Plan neutre        | Angular                                 | ReactJS                                |
| ------------------ | --------------------------------------- | -------------------------------------- |
| état de formulaire | mécanisme Angular déclaré par le profil | hook/state déclaré par le profil       |
| autorisation       | guard ou service cible                  | boundary, hook ou service cible        |
| contrôleur         | service injectable                      | controller/hook explicite              |
| intégration        | client injectable                       | client explicite                       |
| extension          | token/port cible                        | dépendance, contexte ou port explicite |

Ces choix appartiennent au profil et au renderer, jamais à l'IR canonique.

## 17. Propriété des artefacts

Chaque artefact possède exactement un owner :

### 17.1 `generator-owned`

Le fichier peut être remplacé intégralement. Toute modification humaine directe
est refusée ou signalée comme dérive.

### 17.2 `human-owned`

Le générateur ne crée éventuellement qu'un squelette initial. Après création, il
ne modifie plus le fichier.

### 17.3 `configuration-owned`

Le contenu est déclaratif, validé par schéma et modifiable par l'auteur. Il est
consommé, pas régénéré depuis du code cible.

### 17.4 `external-owned`

Contrat ou artefact provenant d'un système externe. Il est référencé par hash et
provenance, jamais modifié.

Les fichiers à propriété mixte sont interdits par défaut. Leur fusion fiable
nécessiterait une représentation structurelle, un protocole de conflits et une
politique par langage ; elle n'est pas admise comme mécanisme initial.

## 18. Extensions humaines

Les extensions passent par des contrats stables. Le contrat canonique reste
indépendant du langage ; l'extrait suivant illustre seulement une
matérialisation TypeScript possible dans une cible web :

```typescript
export interface OperationExtension<TInput, TOutput> {
    beforeExecute?(input: TInput): Promise<TInput>;
    afterSuccess?(output: TOutput): Promise<void>;
    afterFailure?(error: unknown): Promise<void>;
}
```

Le contrat canonique décrit la sémantique du slot. Chaque renderer matérialise
son raccordement selon la cible.

La première matérialisation livrée est volontairement étroite : `after-success`
reçoit l'identifiant de l'opération et son résultat typé. Elle s'exécute après
les règles et effets canoniques, mais avant la publication du succès par le
raccord cible. Une erreur est propagée ; aucun timeout propre au slot n'est
encore implémenté. Pour `workflow-action`, les issues d'export `no-data` et
`failed` ne sont pas des succès et ne déclenchent pas le slot. Cette limite
devra être modélisée avant d'ajouter des politiques d'erreur ou de reprise plus
riches.

Règles :

- une extension ne peut pas contourner silencieusement une permission ou une
  précondition canonique ;
- son ordre relatif aux nœuds du graphe est explicite ;
- ses erreurs et timeouts ont une politique déclarée ;
- son absence a une sémantique définie ;
- son fichier et son hash sont enregistrés comme `human-owned` ;
- le dry-run capture le hash du contenu humain réellement observé et planifie le
  même hash avant/après ; la future publication devra revérifier ce hash pour
  détecter une modification concurrente ;
- un changement de contrat d'extension est traité comme une migration.

## 19. Algorithme de régénération

Une régénération suit l'ordre suivant :

1. charger la composition et son manifest précédent ;
2. résoudre les références immuables ;
3. ingérer les nouvelles preuves ;
4. recalculer les modèles canoniques affectés ;
5. refuser les contradictions non arbitrées ;
6. appliquer les changements dans une nouvelle composition immutable ;
7. valider la composition et le graphe ;
8. calculer le Change Set ;
9. produire le plan d'artefacts différentiel ;
10. vérifier les capacités de chaque renderer ;
11. vérifier la propriété et les hashes des artefacts existants ;
12. rendre dans un espace temporaire ;
13. compiler et exécuter les Oracles dans cet espace ;
14. comparer les scénarios communs entre Angular et ReactJS ;
15. publier atomiquement les artefacts générés ;
16. ne jamais écraser les artefacts humains ;
17. persister le nouveau manifest et les résultats.

Tout échec avant publication laisse la version précédente intacte.

## 20. Manifest de composition

Le manifest complète ADR-0031. Il contient au minimum :

- identité et version de la composition ;
- état du cycle de vie ;
- références et hashes des sources ;
- faits, décisions et inconnues résolues pertinentes ;
- versions et hashes des modèles canoniques ;
- pattern éventuel et paramètres résolus ;
- graphe normalisé ;
- versions du planner et des profils ;
- version de chaque renderer ;
- plan d'artefacts ;
- propriétaire de chaque artefact ;
- hashes avant et après régénération ;
- inventaire des extensions et hashes observés ;
- résultats des Oracles ;
- lien vers le manifest parent lors d'une évolution ;
- migration appliquée et approbation humaine éventuelle.

Le manifest actuel de la plateforme ne satisfait pas encore ce contrat complet.

## 21. Déterminisme et reproductibilité

À entrées et versions identiques :

- la normalisation produit le même modèle ;
- le planner produit le même plan ;
- les renderers produisent les mêmes octets ;
- les Oracles produisent les mêmes résultats hors données explicitement non
  déterministes ;
- les timestamps d'exécution ne participent pas aux hashes de contenu ;
- l'ordre des objets et collections non sémantiques est canonique.

Le replay d'un manifest historique doit soit reproduire les artefacts, soit
échouer avec un diagnostic précis de dépendance indisponible. Il ne doit jamais
basculer silencieusement vers une version récente.

## 22. Oracles

### 22.1 Oracle de modèle

Vérifie les schémas, références, identifiants, types, contradictions,
permissions, états et invariants.

### 22.2 Oracle de graphe

Vérifie les nœuds atteignables, branches terminales, erreurs, transitions,
politiques, ordre d'effets et propriétés d'annulation/idempotence déclarées.

### 22.3 Oracle de planner

Vérifie la couverture des responsabilités, l'absence de fuite de framework et la
stabilité du plan.

### 22.4 Oracle cible

Vérifie compilation, lint, tests, conventions, accessibilité et contraintes
propres à Angular ou ReactJS.

### 22.5 Oracle métier commun

Exécute les mêmes scénarios observables sur les deux cibles. Il compare le
comportement, pas la structure des fichiers.

### 22.6 Oracle de non-destruction

Insère ou observe une extension humaine, régénère, puis vérifie :

- hash inchangé de l'extension ;
- raccordement toujours valide ;
- absence d'écriture hors des artefacts `generator-owned` ;
- retrait contrôlé des artefacts devenus obsolètes ;
- rollback complet en cas d'échec.

### 22.7 Mutations

Les mutations doivent couvrir au moins :

- permission supprimée ;
- garde d'état supprimée ;
- branche inversée ;
- effet déplacé avant une validation ;
- opération asynchrone non attendue ;
- erreur terminale traitée comme succès ;
- extension écrasée ;
- renderer ignorant une responsabilité ;
- manifest ne reflétant pas un changement de sortie.

## 23. Sécurité

La composition et le graphe deviennent des entrées de compilation et doivent
être traités comme non fiables.

Contrôles requis :

- validation stricte et `additionalProperties: false` aux frontières natives ;
- extensions namespacées et schématisées ;
- chemins de sortie normalisés, sans traversal ;
- aucune exécution de code provenant directement d'une spécification ;
- allowlist de capacités renderer ;
- secrets exclus des modèles et manifests ;
- permissions refusées par défaut lorsqu'elles sont inconnues ;
- traçabilité de toute décision humaine modifiant une règle de sécurité ;
- signature ou mécanisme d'intégrité pour les patterns distribués hors dépôt ;
- publication atomique après Oracle uniquement.

## 24. Gouvernance des patterns

Chaque pattern promu déclare :

- identifiant et version ;
- owner ;
- statut ;
- objectif et non-objectifs ;
- invariants ;
- paramètres ;
- sous-compositions ;
- slots d'extension ;
- capacités renderer requises ;
- domaines de validation ;
- Oracles et mutants ;
- compatibilité ;
- migrations disponibles ;
- date ou condition de réévaluation.

Une revue de promotion répond explicitement :

1. quelle duplication réelle est supprimée ;
2. quelles variations ont été observées ;
3. quelles règles restent propres aux domaines sources ;
4. pourquoi une sous-composition existante ne suffit pas ;
5. comment le pattern échoue lorsque son contrat n'est pas satisfait ;
6. comment il évoluera sans casser ses consommateurs.

## 25. Expérience auteur

L'auteur ne choisit pas obligatoirement une famille. Il peut :

- partir d'une composition vide ;
- rechercher un pattern par capacités et non seulement par nom ;
- instancier un pattern ;
- combiner plusieurs sous-compositions ;
- visualiser les données, permissions, graphe et présentation ;
- obtenir des diagnostics sur les inconnues ;
- prévisualiser les impacts ;
- exécuter un dry-run ;
- accepter une migration ;
- publier une nouvelle composition.

Les diagnostics citent l'identifiant canonique, la source et la correction
attendue. « Composition non supportée » sans détail n'est pas un diagnostic
acceptable.

## 26. État réel au 2026-08-16

### Disponible localement

- Evidence et Semantic Models sur la tranche `action-request` ;
- Evidence et Behavior Models séparés sur le workflow `requests` ;
- convergence de sources structurées et legacy sur ces cas bornés ;
- génération Angular et ReactJS ;
- manifests de sortie avec hashes ;
- compilation stricte ;
- Oracles runtime et mutations ciblées ;
- refus d'écrasement des répertoires de sortie par les CLI actuelles.

### Non disponible

- schéma générique de composition instance ;
- registre et cycle de vie des compositions ;
- promotion automatisée ou gouvernée des patterns ;
- Presentation Intent exécutable ;
- planner commun produisant un plan d'artefacts neutre ;
- graphe ADR-0031 complet et générique ;
- renderers indépendants des compositions de référence ;
- propriété d'artefact et slots d'extension ;
- régénération incrémentale ;
- migration de pattern ;
- Oracle de non-destruction ;
- test simultané données + permissions + graphe + présentation.

### Dette architecturale actuelle

- schémas auteur distincts `action-request` et `workflow-action` ;
- CLI distinctes ;
- compilateurs distincts ;
- renderers distincts ;
- règles et opérations `requests` codées dans le contrat workflow borné ;
- manifest incomplet au regard d'ADR-0031 ;
- absence de frontière vérifiée pour les extensions humaines.

Ces artefacts restent utiles comme références et Oracles. Ils ne doivent pas
devenir le modèle reproductible « un schéma, un compilateur et un renderer par
nouveau besoin ».

## 27. Stratégie de migration

### Étape A — Geler l'expansion spécialisée

- ne pas ajouter de nouvelle pseudo-famille au core ;
- ne pas ajouter de renderer par pattern ;
- ne pas supprimer les preuves existantes ;
- figer les hashes et scénarios comme baseline.

**Sortie :** baseline reproductible et dette explicitement inventoriée.

### Étape B — Écrire le test d'acceptation rouge

Créer une fixture contenant :

- composition initiale ;
- extension humaine ;
- changement simultané des quatre modèles ;
- attentes Angular et ReactJS ;
- interdiction de modifier core/planner/renderers pendant le test.

**Sortie :** échec reproductible démontrant le gap actuel.

### Étape C — Contrat de propriété et manifest

- définir les owners d'artefacts ;
- étendre le manifest ;
- ajouter le contrôle de hash des extensions ;
- rendre la publication transactionnelle.

**Sortie :** régénération impossible si une écriture humaine non reconnue serait
perdue.

### Étape D — Composition et Presentation Intent minimaux

- formaliser les schémas ;
- normaliser une composition simple ;
- représenter un formulaire, ses états et sa navigation ;
- conserver les inconnues et décisions.

**Sortie :** une composition sans nom de famille est validable.

### Étape E — Planner commun

- produire un plan d'artefacts neutre ;
- introduire la négociation de capacités ;
- rendre les deux renderers consommateurs du même plan ;
- empêcher tout branchement sur le nom du pattern.

**Sortie :** une responsabilité ajoutée au plan est soit rendue sur les deux
cibles, soit refusée avant génération.

### Étape F — Migration d'`action-request`

- exprimer les cas actuels comme compositions ;
- préserver les Oracles et mutants ;
- comparer les comportements ;
- conserver temporairement l'ancien chemin comme référence.

**Sortie :** parité vérifiée sans renderer `action-request` spécialisé.

### Étape G — Évolution simultanée non destructive

- modifier données, permissions, graphe et présentation ;
- conserver l'extension ;
- générer Angular et ReactJS ;
- passer tous les Oracles.

**Sortie :** test directeur vert sans modification du core ou des renderers.

### Étape H — Falsification avec `workflow-action`

- migrer états, branches, permissions et export asynchrone ;
- introduire une variation réelle d'un second domaine ;
- vérifier qu'aucun nom `take`, `qualify` ou `export` n'est requis par le
  renderer ;
- tuer les mutants existants et nouveaux.

**Sortie :** le modèle résiste à une composition comportementale complexe.

### Étape I — Retrait contrôlé

- déprécier les compilateurs et renderers spécialisés ;
- migrer les commandes auteur vers une CLI commune ;
- fournir des diagnostics de migration ;
- supprimer seulement après parité et CI verte.

**Sortie :** un seul pipeline de composition supporté.

## 28. Test directeur détaillé

### État initial

Une fonctionnalité de demande contient :

- un formulaire simple ;
- des champs métier ;
- un accès public ;
- une validation ;
- un appel request/response ;
- une vue de succès ;
- une extension humaine `afterSuccess`.

### Changement demandé

- ajouter un champ et une contrainte ;
- rendre l'accès authentifié avec permission ;
- ajouter une confirmation avant l'appel ;
- ajouter une branche d'erreur métier ;
- transformer le formulaire en parcours à étapes ;
- changer la navigation de succès ;
- conserver l'extension sans la modifier.

### Assertions

- les modèles canoniques changent uniquement sur les axes concernés ;
- le Change Set expose toutes les modifications ;
- le planner identifie les artefacts affectés ;
- les capacités Angular et ReactJS sont vérifiées avant rendu ;
- les deux arbres sont déterministes ;
- l'extension conserve son hash ;
- les scénarios communs ont les mêmes résultats observables ;
- les artefacts obsolètes sont retirés seulement s'ils sont `generator-owned` ;
- le manifest parent reste rejouable ;
- aucune modification du core, planner ou renderer n'est présente dans le diff
  du test.

## 29. Critères de refus et d'arrêt

L'orientation doit être réévaluée si :

- chaque composition nouvelle exige une modification du core ;
- les renderers accumulent des conditions sur des noms de patterns ;
- le plan d'artefacts devient une copie déguisée d'Angular ou de ReactJS ;
- les extensions hors modèle deviennent la voie normale ;
- une régénération exige une fusion textuelle fragile ;
- les sorties multi-stack ne peuvent pas partager un Oracle métier ;
- le coût de spécification et de revue dépasse durablement celui d'une
  implémentation spécialisée ;
- le registre accumule des patterns non utilisés et non maintenus ;
- les migrations ne permettent pas de rejouer les versions historiques ;
- une cible doit ignorer une partie du graphe pour générer.

## 30. Métriques de décision

Les mesures doivent être produites par des artefacts exécutables, conformément à
la politique documentaire du dépôt :

- temps entre modification de composition et sortie vérifiée ;
- temps de revue humaine ;
- nombre d'inconnues et contradictions ;
- surface du core modifiée par nouvelle composition ;
- surface des renderers modifiée par nouvelle composition ;
- taux de réutilisation des patterns promus ;
- nombre de compositions persistées mais non promues ;
- nombre de migrations réussies ou refusées ;
- taux d'extensions préservées ;
- défauts détectés par les Oracles et mutations ;
- stabilité des hashes ;
- coût comparé à une implémentation spécialisée.

Aucun chiffre de maturité ne doit être promu à partir d'un seul scénario local.

## 31. Organisation et responsabilités

### Principal Engineer

- maintient les invariants ;
- arbitre les frontières du core ;
- approuve les changements de modèle et critères d'arrêt ;
- refuse les généralisations sans preuve.

### Équipe IR et schémas

- maintient Evidence, Semantic, Behavior et Presentation ;
- garantit versionnement, provenance et migrations ;
- fournit les validateurs et normalisations.

### Équipe planner

- maintient l'analyse d'impact ;
- produit l'Artifact Plan ;
- garantit l'indépendance aux frameworks ;
- gère la négociation de capacités.

### Équipes cibles Angular et ReactJS

- implémentent les profils et renderers ;
- maintiennent les Oracles propres à la cible ;
- n'introduisent aucune sémantique métier implicite.

### Équipe vérification

- maintient les scénarios communs ;
- construit mutants et Oracles de non-destruction ;
- contrôle déterminisme, replay et compatibilité.

### Developer Experience

- maintient l'expérience auteur ;
- produit diagnostics, visualisation du Change Set et dry-run ;
- rend les migrations compréhensibles et auditables.

## 32. Séquence de revue

Toute modification structurante suit :

1. problème et preuve réelle ;
2. options et contre-exemples ;
3. impact sur les invariants ;
4. test falsifiable ;
5. prototype minimal ;
6. Oracle et mutations ;
7. revue multi-cible ;
8. décision ADR si la frontière normative change ;
9. migration ;
10. documentation et gate CI.

Une discussion d'architecture n'est pas considérée comme terminée tant que sa
conclusion n'est pas reliée à un test, une responsabilité et un critère de
sortie.

## 33. Questions ouvertes

Les points suivants doivent être décidés par preuve pendant l'implémentation :

- format physique et politique de rétention du registre ;
- granularité exacte des plans d'artefacts ;
- stratégie de signature des patterns distribués ;
- politique de compatibilité des slots d'extension ;
- représentation minimale du Presentation Intent ;
- protocole de migration entre versions de composition ;
- gestion des suppressions d'artefacts générés encore référencés manuellement ;
- niveau d'isolation transactionnelle lors d'une génération multi-cible ;
- seuil de preuve requis pour promouvoir un candidat pattern ;
- visualisation auteur du graphe et du Change Set.

Ces questions ne doivent pas être résolues par des valeurs arbitraires dans le
core. Chaque décision doit être liée à un cas réel et à un test contradictoire.

## 34. Conclusion

Le produit recherché n'est pas une collection de générateurs par famille. C'est
un compilateur de spécifications applicatives, doté d'une mémoire cumulative et
d'une capacité d'évolution contrôlée.

La mémoire correcte comporte deux engagements complémentaires :

1. **ne rien perdre** — toute composition générée reste persistée, reproductible
   et modifiable ;
2. **ne pas tout standardiser** — seules les compositions suffisamment prouvées
   deviennent des patterns publics et versionnés.

La flexibilité correcte ne signifie pas accepter n'importe quelle structure.
Elle signifie pouvoir composer et faire évoluer des contrats typés, puis refuser
précisément ce qu'une cible ne sait pas encore garantir.

La prochaine preuve utile n'est donc pas une nouvelle famille ou une nouvelle
stack. C'est la réussite du test directeur d'évolution simultanée et non
destructive sur Angular et ReactJS.

## 35. Baseline exécutable du test directeur

Le contrat exécutable est versionné dans
[`evolvable-composition.contract.json`](../../tools/generator-platform/acceptance/evolvable-composition.contract.json).
La sonde associée se lance avec :

```bash
bun run probe:composition-evolution
```

Cette sonde est un **gate de caractérisation**, pas une déclaration de réussite
du produit. Elle vérifie deux ensembles exacts :

- les capacités déjà présentes ne doivent pas régresser ;
- les lacunes connues ne doivent ni disparaître silencieusement, ni être
  renommées pour masquer un écart.

La baseline du 16 août 2026 prouve actuellement :

- l'ajout d'une donnée requise dans le modèle canonique et dans les types des
  deux cibles ;
- le passage simultané du contrat d'accès vers `authorized` avec une permission
  dans le modèle canonique ;
- le rendu et la compilation séparés d'Angular et ReactJS depuis le même hash
  sémantique ;
- l'absence d'import ReactJS dans la sortie Angular et d'import Angular dans la
  sortie ReactJS ;
- un Artifact Plan canonique, déterministe et indépendant des stacks, consommé
  par les deux renderers ;
- le rattachement exhaustif de chaque fichier à une responsabilité logique, avec
  `owner: generator-owned` et `write_policy: replace` dans le manifest 1.1 ;
- un dry-run déterministe qui classe les artefacts en `create`, `replace`,
  `delete` ou `unchanged`, refuse le drift et ne modifie aucun fichier.
- une application explicite liée à l'identifiant du Change Set revu sur une
  sortie existante, préparée dans un répertoire candidat, recompilée,
  replanifiée contre l'état vivant et publiée sous verrou avec rollback ; les
  extensions Angular et ReactJS survivent octet par octet et leur hash observé
  devient le hash du nouveau manifest ;
- un journal synchronisé et une reprise déterministe des états interrompus : la
  version précédente est restaurée ou la nouvelle version est acceptée après
  vérification de tous les hashes.

Elle expose sans ambiguïté les lacunes suivantes :

- le graphe comportemental n'est pas accepté par le contrat auteur
  `action-request` ;
- le Presentation Intent n'est pas accepté ;
- la permission canonique n'est pas encore matérialisée comme garde runtime par
  les deux renderers ;
- aucune composition instance autonome n'est persistée avec la sortie ;
- la publication v1 suit le contrat `offline-activation` d'ADR-0035 : aucun
  lecteur externe concurrent n'est supporté pendant la commande ; APFS/macOS et
  ext4/Linux locaux sont les seuls stockages acceptés, contrôlés par `statfs`.
  Le `SIGKILL` réel est prouvé aux deux points critiques et la matrice CI dédiée
  doit encore produire sa première exécution externe verte.

Par conséquent, la réponse actuelle au test directeur complet est **non**. La
plateforme possède une première tranche multi-cible utile, mais elle ne
satisfait pas encore l'invariant d'évolution simultanée et non destructive.

### Ordre d'implémentation retenu

Le chemin critique part de la propriété des artefacts, car tester une extension
avant de savoir qui peut écrire chaque fichier produirait une garantie illusoire
:

1. ~~schéma minimal d'Artifact Plan indépendant des stacks~~ — livré ;
2. ~~ownership `generator-owned` et politique `replace` dans les manifests~~ —
   livré ; les autres owners/politiques ne seront activés qu'avec leur Oracle ;
3. ~~dry-run et refus déterministe du drift d'un artefact généré~~ — livré ;
4. ~~slot `after-success` humain, séparé physiquement et conservé par hash~~ —
   livré pour `action-request` et `workflow-action` sur Angular et ReactJS ;
5. ~~publication temporaire et transactionnelle sur une sortie existante~~ —
   livrée avec liaison au Change Set revu, validation candidate, replanification
   anti-TOCTOU, verrou exclusif, rollback, journal synchronisé et reprise
   déterministe, y compris sous `SIGKILL` réel ; le contrat borné de lecteurs et
   de stockage est fixé par ADR-0035, et sa matrice CI est bloquante ;
6. garde runtime de permission partagée par scénario, propre à chaque stack ;
7. intégration du Behavior Graph et du Presentation Intent ;
8. promotion du contrat directeur en gate bloquant seulement quand
   `expected_gaps` devient vide.

Chaque tranche doit retirer exactement une lacune du contrat ou expliquer
explicitement pourquoi plusieurs lacunes sont atomiquement liées. Ajouter une
nouvelle composition mémorisée ou une troisième stack avant cette fermeture ne
constitue pas un progrès sur le risque principal.
