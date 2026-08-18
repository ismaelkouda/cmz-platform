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
| Evidence model avec provenance/fusion | auth + workflow, preuves séparées par source, CI verte 2026-08-17 |   M4   |
| Semantic model source/cible neutre    | auth + `support`, validés et câblés en CI, verte 2026-08-17        |   M4   |
| Behavior graph typé                   | `requests` : états, gardes, branches, topologies, CI verte         |   M4   |
| Presentation intent neutre            | conception Figma uniquement                                        |   M1   |
| Manifest de génération                | responsabilités, ownership, politiques, CI verte 2026-08-17        |   M4   |
| Planner déterministe                  | Artifact Plan neutre partagé, CI verte 2026-08-17                  |   M4   |
| Change Set / dry-run                  | create/replace/preserve/delete/unchanged + drift, CI verte         |   M4   |
| Publication sur sortie existante      | apply lié au Change Set + verrou + rollback, CI verte              |   M4   |
| Reprise après interruption            | matrice CI APFS/ext4 verte 2026-08-17                              |   M3   |
| Extension humaine typée               | `after-success`, runtime + conservation par hash, CI verte         |   M4   |
| Garde runtime de permissions          | Angular + ReactJS, refus avant effet externe, CI verte             |   M4   |
| Repair sous contraintes               | méthode documentée, partiellement exercée                          |   M2   |

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

**Mise à jour 2026-08-18 (PLAT-4bis)** : le gap « second domaine `workflow-action`
réel » cité par les versions précédentes de ce document est fermé. Le moteur
(compilateur `core/workflow-action-authoring.mjs`, IR
`core/workflow-action-model.mjs`, codegen `renderers/workflow-shared.mjs`, Oracle
`core/workflow-runtime-oracle.mjs`) a été généralisé pour dériver son vocabulaire
d'opérations/permissions/statuts de la définition elle-même (détection des 3
rôles structurels par forme — `entry`/`decision`/`export` — plutôt que par
comparaison à des ids littéraux `take`/`qualify`/`export`), et non plus
seulement `feature.id`/`feature.name`. Preuve : une définition indépendante
hors legacy, vocabulaire disjoint (`claim`/`moderate`/`remove`/`export`, états
`submitted/under-review/published/removed`,
`tools/generator-platform/sources/content-moderation-workflow.definition.json`),
compile, génère Angular + ReactJS, type-check strict des deux arbres, passe
l'Oracle runtime complet (permission refusée, garde d'état, branches
accept/reject, callback asynchrone), et détecte une mutation du graphe sur les
deux cibles — fixture de non-régression permanente
(`tools/generator-platform/content-moderation-workflow.test.mjs`). CI réelle
confirmée verte après correctif d'un appelant `assertWorkflowOracle` manqué par
la vérification locale
(`https://github.com/ismaelkouda/cmz-platform/actions/runs/32136111520/job/95707805436`,
commit `f73d5fa`). Voir `taches-restantes.md`, entrée PLAT-4bis, pour le détail
complet (4 fichiers généralisés un à la fois, baseline 30/30 revérifiée après
chacun, 161/161 tests core, angle mort stack-tests découvert et fermé).
**Ce que ceci ne prouve pas encore** : `action-request` (contrairement à
`workflow-action`) n'a, lui, jamais eu de second domaine construit spécifiquement
pour prouver sa généricité au sens strict — `support`/`authentication` partagent
déjà la même forme d'exécution documentée ci-dessus (« elle n'ajoute pas une
troisième source équivalente à la matrice `authentication` »). Et le « budget
d'extensions hors modèle » exigé par le claim § 6 n'a jamais été mesuré nulle
part dans ce dépôt — un gap distinct, non touché par PLAT-4bis.

**Limite topologique documentée, non traitée par décision (2026-08-18,
PLAT-4ter)** : PLAT-4bis a généralisé le **vocabulaire** de `workflow-action`
(noms d'opérations/permissions/états), jamais sa **topologie** — le moteur
reste borné à exactement 3 rôles structurels fixes (`entry`/`decision`/
`export`), avec au plus 1 `decision`. Investigation complète des 3 fichiers
concernés (voir
[`memo-topologie-workflow-action.md`](./memo-topologie-workflow-action.md)) :
l'IR (`core/workflow-action-model.mjs`) est déjà générique ; le validateur
est rigide mais localisé et peu risqué à changer ; le renderer
(`renderers/workflow-shared.mjs`) et l'Oracle
(`core/workflow-runtime-oracle.mjs`) sont en revanche des gabarits
TypeScript à emplacements fixes (une méthode `decisionMethod` unique câblée
en dur dans un template littéral), pas une boucle sur un tableau de
décisions — généraliser à N décisions enchaînées serait une réécriture du
cœur du générateur, d'ampleur comparable à PLAT-4bis entier.
**Décision (2026-08-18)** : ne pas engager cette généralisation maintenant.
Vérifié factuellement (pas supposé) : les 3 définitions `workflow-action`
existantes dans ce dépôt (`requests-workflow`, `content-moderation-workflow`,
et les 4 modules SEOS family-dup `finalization`/`processing`/
`report-states`/`requests`) ont chacune exactement 1 décision — aucun cas
réel, legacy ou synthétique, n'exige aujourd'hui une chaîne de décisions.
Conforme à ADR-0029 (§ Décision, « preuve avant extension ») et au principe
déjà appliqué par ce dépôt (ne jamais transformer une extensibilité
souhaitée en capacité livrée sans preuve) : une réécriture L/XL du
générateur, avec risque de régression sur `requests-workflow` (production)
et `content-moderation-workflow` (fixture close), contre zéro cas d'usage
observé, est de la sur-ingénierie spéculative — pas de la rigueur.
**Condition de sortie explicite** : rouvrir ce chantier dès qu'une
définition `workflow-action` réelle (legacy ou spécification) exige
factuellement plus d'une décision enchaînée — pas avant. Ce gap reste donc
listé comme non couvert par le claim « plateforme générique » (§6), par
choix documenté, pas par oubli.

PLAT-5F possède un contrat exécutable de durabilité. Il accepte uniquement
APFS/macOS et ext4/Linux locaux, vérifie le type réel par `statfs`, exerce les
primitives de publication, puis tue réellement un processus enfant après
chacun des deux renommages critiques. ADR-0035 tranche le modèle lecteur : la
sortie est inactive pendant la génération et activée seulement après succès ;
les lecteurs externes concurrents ne sont pas supportés en v1. **Mise à jour
2026-08-17 (OPS-19/PLAT-6)** : la matrice CI bloquante `macos-14`/APFS +
`ubuntu-24.04`/ext4 est verte pour la première fois
(`https://github.com/ismaelkouda/cmz-platform/actions/runs/32046594949`,
commit `24729f3`) — la seule condition posée pour la promotion M3
(`taches-restantes.md`, entrée PLAT-5F : « seule action restante avant
promotion M3 : obtenir la première exécution verte de cette matrice externe »)
est remplie. Capacité promue M3.

PLAT-5G matérialise les permissions du Semantic Model dans les frontières
d'exécution `action-request`. Angular et ReactJS exigent un port hôte, évaluent
toutes les permissions au moment réel de l'exécution et renvoient
`permission_denied` avant HTTP/fetch en cas de manque. Le gate directeur, les
tests natifs propres aux deux stacks et les mutants de contournement sont verts
localement. Cette capacité reste un contrôle applicatif : l'autorité backend
doit appliquer les mêmes règles indépendamment.

## 5. Cibles

| Cible                | État réel                                                            |             Niveau              |
| -------------------- | --------------------------------------------------------------------- | :-----------------------------: |
| Angular              | action-request + workflow-action, mutants locaux, CI verte 2026-08-17 |                M4                |
| ReactJS              | action-request + workflow-action, mutants locaux, CI verte 2026-08-17 |                M4                |
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

> **Mise à jour 2026-08-17 (OPS-19/PLAT-6)** : première exécution verte de
> `ci.yml` confirmée sur `main`
> (`https://github.com/ismaelkouda/cmz-platform/actions/runs/32046594949`,
> commit `24729f3`, 22m14s). `check:generator-platform` fait partie du job
> `guardrails`, bloquant en tête de pipeline — un run global vert implique
> qu'il est passé. Les 5 lignes ci-dessous franchissent donc M3 et
> satisfont les critères M4 « de cette seule tranche », comme la phrase
> normative ci-dessous le prévoyait déjà avant cette date. Ce n'est **pas**
> une promotion M4 de la plateforme entière : le second domaine réel de
> PLAT-4 et la validation sémantique globale (§9) restent des conditions
> distinctes, non remplies par cette seule CI verte.

| Source / cible                            |       Angular        |       ReactJS        |
| ----------------------------------------- | :------------------: | :------------------: |
| Définition déclarative `support`          | `action-request` M4  | `action-request` M4  |
| Spécification structurée `authentication` | `action-request` M4  | `action-request` M4  |
| Legacy TypeScript `authentication`        | `action-request` M4  | `action-request` M4  |
| Définition structurée `requests-workflow` | `workflow-action` M4 | `workflow-action` M4 |
| Legacy TypeScript `requests` borné        | `workflow-action` M4 | `workflow-action` M4 |

Les profils techniques sous-jacents sont `angular-nx` et `react-typescript`. Le
runtime généré des deux colonnes passe le même Oracle local de validation,
transport, accès public, ordre des effets de session et erreurs. Les mutations
de contrainte, session et accès sont tuées sur les deux cibles. Voir
[`validation-runtime-action-request.md`](./validation-runtime-action-request.md).
Cette preuve ne vaut pas adaptateur de traces runtime pour les sources. La
condition normative posée ici (« une CI verte ferait franchir M3 et
satisferait les critères M4 de cette seule tranche ») est désormais remplie
— voir la note de mise à jour au-dessus du tableau.

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

> **Maturité globale : M0–M1 (minimum de tous les maillons, §1).**
> **Mise à jour 2026-08-17 (OPS-19/PLAT-6)** : la matrice `action-request` +
> `workflow-action` sur Angular/ReactJS (§7, `tools/generator-platform`)
> franchit désormais M3/M4 — première exécution `ci.yml` verte confirmée
> (`https://github.com/ismaelkouda/cmz-platform/actions/runs/32046594949`,
> commit `24729f3`), condition normative posée depuis PLAT-1/PLAT-3/PLAT-5F.
> Cette tranche precise n'est plus « refusée avant CI verte ».
> **Mise à jour 2026-08-18 (PLAT-4bis)** : le second domaine `workflow-action`
> réel (`content-moderation-workflow`, vocabulaire disjoint de `requests-workflow`,
> voir §4) est prouvé et confirmé par CI réelle — ce gap précis, cité par la
> version précédente de cette note, est fermé. La maturité **globale de la
> plateforme** reste néanmoins tirée vers le bas par les maillons non encore
> promus, minimum au sens strict du §1 : `Presentation intent neutre` (M1,
> conception Figma uniquement), `OpenAPI`/`Description textuelle`/`Tests
> runtime` (M0–M1, §3), `Repair sous contraintes` (M2, exercice partiel). Le
> claim « plateforme générique » (§6) exige aussi un **budget d'extensions
> hors modèle mesuré et non masqué par `Custom`** — cette mesure n'a jamais été
> produite dans ce dépôt, sur aucune tranche, et reste donc le gap concret le
> plus proche pour ce claim maintenant que le second domaine `workflow-action`
> est acquis. Ne pas confondre la promotion d'une tranche prouvée avec la
> promotion de l'enveloppe entière.
