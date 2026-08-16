# Matrice de capacités — plateforme de génération

- **Date de référence :** 2026-08-14
- **Décision normative :**
  [ADR-0029](../adr/0029-perimetre-capacites-plateforme-generation.md)
- **Objet :** séparer explicitement la vision, les prototypes et les capacités
  reproductibles. Ce document est vivant ; les ADR fixent les décisions.

## 1. Règle de communication

Une capacité n'est annoncée comme supportée que si elle est reproductible dans
ce dépôt, versionnée, exécutée en CI et couverte par un oracle proportionné à
son risque.

Les niveaux de maturité sont :

| Niveau | Nom                   | Critère minimal                                     |
| ------ | --------------------- | --------------------------------------------------- |
| M0     | Intention             | Idée ou backlog, aucun contrat                      |
| M1     | Conception            | Contrat documenté, aucune exécution reproductible   |
| M2     | Prototype             | Un cas exécuté, hors CI ou encore couplé            |
| M3     | Reproductible         | Code dans le dépôt, déterministe, CI verte          |
| M4     | Validé sémantiquement | Équivalence/comportement testé, mutations détectées |

Le niveau de la plateforme est le minimum de ses maillons, pas le maximum de
l'un d'eux.

## 2. Enveloppe initiale

### Inclus

- applications métier data-centric ;
- backoffices et frontends administratifs ;
- CRUD, commandes one-shot, vues composites et workflows ;
- cibles web TypeScript en première preuve ;
- mobile natif après validation de la matrice web.

### Non revendiqué

- génération universelle de tout logiciel ;
- systèmes embarqués, moteurs de données, jeux ou calcul scientifique ;
- déduction autonome de règles métier absentes des sources ;
- équivalence fonctionnelle automatique sans contrats ou observations ;
- support d'une stack sur la seule base d'un document ou d'un POC externe.

## 3. Sources

| Source                 | Faits utiles                                         | État réel                                   | Niveau |
| ---------------------- | ---------------------------------------------------- | ------------------------------------------- | :----: |
| Legacy TypeScript SEOS | structure, code, conventions, comportements partiels | auth AST + workflow `requests` borné        |   M2   |
| Spécification JSON     | types, règles, opérations, contrats                  | auth + support + workflow déclaratif        |   M2   |
| OpenAPI                | contrats wire, erreurs, endpoints                    | DTO inférés du TS ; pas de pipeline OpenAPI |   M1   |
| Figma                  | structure UI, tokens, composants, contenu            | conception uniquement                       |   M1   |
| Description textuelle  | intentions et règles déclarées                       | consommation manuelle par agent             |   M0   |
| Tests/traces runtime   | comportements observables et cas limites             | Oracle local des sorties ; pas d'adaptateur |   M0   |

Une source produit des faits partiels avec provenance et confiance. Elle ne
produit jamais directement des chemins ou classes d'une cible.

## 4. Noyau et orchestration

| Capacité                              | État réel                                          | Niveau |
| ------------------------------------- | -------------------------------------------------- | :----: |
| Evidence model avec provenance/fusion | auth + workflow, preuves séparées par source       |   M2   |
| Semantic model source/cible neutre    | auth + `support`, validés et câblés en CI          |   M2   |
| Behavior graph typé                   | `requests` : états, gardes, branches, topologies   |   M2   |
| Presentation intent neutre            | conception Figma uniquement                        |   M1   |
| Manifest de génération                | responsabilités, ownership et politiques persistés |   M2   |
| Planner déterministe                  | Artifact Plan neutre partagé par les deux cibles   |   M2   |
| Change Set / dry-run                  | create/replace/preserve/delete/unchanged + drift   |   M2   |
| Publication sur sortie existante      | apply lié au Change Set + verrou + rollback        |   M2   |
| Reprise après interruption            | APFS local qualifié ; matrice APFS/ext4 câblée     |   M2   |
| Extension humaine typée               | `after-success`, runtime + conservation par hash   |   M2   |
| Repair sous contraintes               | méthode documentée, partiellement exercée          |   M2   |

`docs/architecture/patterns/pattern-core.schema.json` est un profil structurel
Angular/Nx transitoire, pas le semantic model de cette table.

La tranche `action-request` de PLAT-1 et ses deux adaptateurs PLAT-2 sont
versionnés sous
[`tools/generator-platform`](../../tools/generator-platform/README.md). Elle
sépare initialement 14 sources de code content-addressed, 12 faits observés, 3
inconnues, 2 décisions et un modèle canonique de 3 commandes. PLAT-2 ajoute une
policy humaine versionnée et une spécification structurée : les Evidence Models
vérifiés comptent respectivement 15 sources côté legacy et 2 côté spécification.
Les deux chemins convergent sur la même observation normalisée et le même hash
d'IR. La définition déclarative `support` démontre en plus la réutilisation du
pipeline sur une autre composition présentant la même forme d'exécution, sans
vocabulaire d'authentification généré. Elle n'ajoute pas une troisième source
équivalente à la matrice `authentication` et ne crée pas une famille du core.

PLAT-4 ajoute deux chemins indépendants vers le workflow réel
`requests-details` + export : l'adaptateur borné du code et une définition JSON
versionnée. Leurs Evidence Models restent distincts et leurs Behavior Models
convergent par égalité profonde. La commande auteur génère les deux cibles pour
cette composition fermée ; elle ne revendique pas les workflows arbitraires.
Cette indépendance est technique : la définition formalise le comportement déjà
connu du code, elle ne constitue pas une seconde autorité métier.

PLAT-5F possède désormais un contrat exécutable de durabilité. Il accepte
uniquement APFS/macOS et ext4/Linux locaux, vérifie le type réel par `statfs`,
exerce les primitives de publication, puis tue réellement un processus enfant
après chacun des deux renommages critiques. ADR-0035 tranche le modèle lecteur :
la sortie est inactive pendant la génération et activée seulement après succès ;
les lecteurs externes concurrents ne sont pas supportés en v1. APFS est qualifié
localement. La capacité reste M2 jusqu'à la première matrice CI verte sur
`macos-14`/APFS et `ubuntu-24.04`/ext4.

## 5. Cibles

| Cible                | État réel                                        |             Niveau              |
| -------------------- | ------------------------------------------------ | :-----------------------------: |
| Angular              | action-request + workflow-action, mutants locaux | M2 ; M4 après première CI verte |
| ReactJS              | action-request + workflow-action, mutants locaux | M2 ; M4 après première CI verte |
| React Native         | intention                                        |               M0                |
| Kotlin/Compose       | POC interrompu par environnement                 |               M1                |
| Swift/SwiftUI        | POC interrompu par environnement                 |               M1                |
| Autres stacks citées | aucun renderer ni oracle                         |               M0                |

Un renderer supporté doit consommer uniquement l'IR canonique et un profil cible
versionné. Il ne doit pas inspecter la source d'origine.

## 6. Gates de promotion

### Claim « multi-source »

- deux adaptateurs exécutables dans le dépôt ;
- faits munis de provenance ;
- contradictions représentées et arbitrées explicitement ;
- entrées sémantiquement équivalentes comparables au niveau de l'IR ;
- aucune convention cible dans les sorties des adaptateurs.

### Claim « multi-stack »

- deux renderers dans le dépôt et la CI ;
- même IR consommée sans branchement sur la source ;
- sorties déterministes pour une version donnée ;
- oracle cible propre à chaque stack ;
- scénarios métier communs réussis sur les deux sorties.

### Claim « plateforme générique » dans l'enveloppe initiale

- matrice 2 sources × 2 cibles entièrement reproductible ;
- `action-request` et `workflow-action` couverts ;
- une mutation métier volontaire détectée par l'Oracle ;
- manifests et hashes de génération persistés ;
- aucune dépendance Angular, React, Figma ou SEOS dans le core ;
- budget d'extensions hors modèle mesuré et non masqué par `Custom`.

## 7. Matrice de preuve initiale

| Source / cible                            |       Angular        |       ReactJS        |
| ----------------------------------------- | :------------------: | :------------------: |
| Définition déclarative `support`          | `action-request` M2  | `action-request` M2  |
| Spécification structurée `authentication` | `action-request` M2  | `action-request` M2  |
| Legacy TypeScript `authentication`        | `action-request` M2  | `action-request` M2  |
| Définition structurée `requests-workflow` | `workflow-action` M2 | `workflow-action` M2 |
| Legacy TypeScript `requests` borné        | `workflow-action` M2 | `workflow-action` M2 |

Les profils techniques sous-jacents sont `angular-nx` et `react-typescript`. Le
runtime généré des deux colonnes passe le même Oracle local de validation,
transport, accès public, ordre des effets de session et erreurs. Les mutations
de contrainte, session et accès sont tuées sur les deux cibles. Voir
[`validation-runtime-action-request.md`](./validation-runtime-action-request.md).
Cette preuve ne promeut pas les lignes avant une CI verte et ne vaut pas
adaptateur de traces runtime pour les sources. Une CI verte ferait franchir M3
et satisferait les critères M4 de cette seule tranche.

Le workflow utilise un Oracle distinct pour les états, permissions, branches de
qualification et attente de l'export asynchrone. Ses mutants sont tués
localement sur les deux cibles. Voir
[`validation-runtime-workflow-action.md`](./validation-runtime-workflow-action.md).

Ordre des vertical slices :

1. `action-request` pour valider ingestion, IR, manifest et deux renderers ;
2. `workflow-action` pour falsifier le modèle avec états, branches, permissions
   et exécution asynchrone.

Figma n'entre dans cette matrice qu'après sa réussite. Il alimente alors le
`Presentation intent` et doit être fusionné avec une source sémantique.

## 8. Métriques de décision

Mesurer au minimum :

- temps jusqu'au premier build correct ;
- temps de revue humaine ;
- nombre de faits inconnus ou contradictoires ;
- nombre d'itérations de réparation ;
- taux d'extensions hors modèle ;
- défauts sémantiques détectés avant/après génération ;
- stabilité des hashes à entrée identique ;
- branchements spécifiques source/cible introduits dans le core.

Le projet doit être reconsidéré si le core change à chaque adaptateur/renderer,
si les extensions deviennent la voie normale, ou si le coût de spécification et
de revue dépasse durablement celui d'un générateur spécialisé.

## 9. État synthétique actuel

> **Maturité globale : M1–M2.** Le dépôt livre une matrice locale 2×2 sur la
> composition de référence `action-request` et la composition contradictoire
> `workflow-action`, exécutées sur Angular et ReactJS avec IR/Behavior Model
> séparés, manifests et mutants détectés. Le claim plateforme reste refusé avant
> une CI verte et avant validation du contrat workflow sur un second domaine
> réel présentant des variations.
