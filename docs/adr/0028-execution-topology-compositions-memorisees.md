# ADR-0028 — `execution_topology` comme axe ouvert + compositions mémorisées plutôt que primitives

- **Statut :** Accepted
- **Date :** 2026-08-13
- **Complète :**
  [ADR-0027](./0027-noyau-verbes-structurels-catalogue-ouvert-patterns.md) (ne
  le contredit pas — ADR-0027 reste Accepted tel quel)

## Contexte

ADR-0027 a acté un noyau de 5 verbes structurels (Collection, Entity,
Transition, Composite Read, Custom) et un catalogue ouvert de compositions
nommées (`docs/architecture/patterns/*.pattern.json`). Deux approfondissements
ont eu lieu immédiatement après son acceptation, avant toute implémentation de
T2-6/T2-8, remettant en question un point non structurant du texte d'ADR-0027
sans jamais contredire sa décision centrale (le noyau à 5 verbes).

**Premier approfondissement — recherche complémentaire sur CQS/CQRS.** ADR-0027
citait trois précédents (Google AIP, Kubernetes CRD, design tokens). Une
recherche complémentaire a fait émerger un précédent plus ancien et plus
fondamental : le principe de séparation Command/Query de Bertrand Meyer (1988,
langage Eiffel) et son extension architecturale CQRS par Greg Young (2010). Ce
principe classe les opérations par leur **nature** (Query : lit, sans effet de
bord — Command : écrit, produit un effet), un axe orthogonal à ce que les 5
verbes d'ADR-0027 capturent réellement (la **forme** de la donnée manipulée :
liste, objet unique, agrégat composite).

Une matrice nature × forme a été testée contre 4 cas réels ou plausibles dans ce
dépôt :

1. **Workflow séquentiel** (`workflow-action`, take→treat→approve/reject, déjà
   présent dans le dépôt) — la matrice classe correctement chaque Command
   individuel, mais perd l'information d'ordre et de précondition entre eux, qui
   est la substance même de ce que `workflow-action` modélise.
2. **Upload de fichier** — un Command sans ressource pré-existante, protocole de
   transport différent (multipart), souvent progressif — la matrice le case dans
   la même catégorie qu'un `Create` classique, en perdant toute la différence
   pratique.
3. **Export batch asynchrone** (`workflow-action`, sous-graphe `list_export`,
   `requests_only: true`, déjà présent dans le dépôt) — un Command déclenché
   immédiatement mais dont le résultat arrive plus tard (fire-and-forget +
   callback), une topologie que ni « atomique » ni « séquentiel à préconditions
   métier » ne décrit fidèlement.
4. **Autocomplete/typeahead** — une Query dont chaque nouvelle frappe doit
   annuler la précédente (course de requêtes), une sémantique de flux continu
   avec annulation, pas un appel unique à réponse stable.

Conclusion du test : ajouter une 3ᵉ dimension au noyau lui-même (topologie
d'exécution) aurait reproduit exactement le défaut qu'ADR-0027 corrige — une
taxonomie qui grossit sans fin à mesure qu'on teste de nouveaux cas (atomique,
séquentiel, async, streaming, et le prochain cas en trouvera sûrement un 5ᵉ). La
bonne réponse, alignée sur la même doctrine qu'AIP-136 (« custom methods » comme
échappatoire hors du noyau) et Kubernetes (`status.conditions` comme extension
hors du noyau `spec`), est de sortir cette information du noyau : une métadonnée
séparée et délibérément ouverte, pas un axe de plus dans la classification
centrale.

**Deuxième approfondissement — la composition, pas le pattern nommé, est l'unité
atomique.** En observant que `crud-entity` est déjà une composition de 3
instances de verbes (`Entity`, `Collection`, `Collection/select`) et que
`workflow-action`, une fois son schéma corrigé pour refléter ses 6 sous-graphes
réels (`list_volet`, `list_export`, `details`, `details_permissions`,
`details_qualification`, `tasks_actions`), en compte 8, une question plus
structurante se pose : si un verbe peut apparaître plusieurs fois et dans
n'importe quel ordre au sein d'une composition, quel est le rôle réel des
fichiers `*.pattern.json` nommés ? Sont-ils une brique obligatoire du système
(il faut nécessairement rentrer dans l'un des N noms existants), ou un raccourci
mémorisé pour des combinaisons déjà rencontrées et validées ?

Le parallèle avec Kubernetes est direct : l'API server ne connaît pas une liste
fermée de types de ressources — il connaît un schéma de schéma (la définition
d'un CRD) et sait vérifier n'importe quelle instance contre lui, qu'elle porte
un nom déjà répandu (`Deployment`, `Service`) ou un nom inventé pour un besoin
ponctuel (`MyCustomResource`). Traiter les fichiers `*.pattern.json` nommés
comme la seule unité que le système sait vérifier reproduirait, un niveau plus
haut, exactement le défaut de fermeture qu'ADR-0027 a déjà corrigé une fois pour
les verbes eux-mêmes.

## Options envisagées

### Option A — Garder les fichiers `.pattern.json` nommés comme unité obligatoire de vérification

`check-pattern-nx.mjs` continue de n'accepter qu'un fichier `.pattern.json`
existant en argument ; toute nouvelle combinaison de verbes doit d'abord être
formalisée en un nouveau fichier nommé avant de pouvoir être vérifiée.

- Avantages : aucun changement supplémentaire à l'outillage déjà généralisé sous
  T2-6 ; chaque composition vérifiée est nécessairement documentée et tracée
  dans un fichier versionné.
- Inconvénients : reproduit la même rigidité que la liste fermée à 4/71 patterns
  dénoncée par ADR-0027 — une combinaison légitime mais rare devrait attendre la
  création d'un fichier nommé avant de pouvoir être vérifiée par l'oracle,
  freinant exactement le genre d'usage ad hoc qu'un système de génération
  générique doit permettre.

### Option B — La composition (nommée ou inline) devient l'unité atomique de vérification

Un fichier `.pattern.json` nommé devient un **cas particulier** de composition —
celui qu'on a pris la peine de documenter et sourcer parce qu'il revient souvent
— jamais la seule forme que l'oracle sait comprendre. L'oracle de vérification
(`check-pattern-nx.mjs`) doit, à terme, savoir vérifier une composition déclarée
à la volée (inline), pas seulement une composition chargée depuis un fichier
nommé existant.

- Avantages : cohérent jusqu'au bout avec le principe « catalogue ouvert »
  d'ADR-0027 — nommer une composition devient une commodité, pas une condition
  de légitimité ; aligné sur le précédent Kubernetes CRD (le noyau vérifie une
  forme, pas une liste de noms).
- Inconvénients : capacité non exercée aujourd'hui par aucun besoin réel du
  dépôt (tous les modules existants rentrent déjà dans les 4 patterns nommés) —
  l'implémenter maintenant serait spéculatif, contraire à la doctrine déjà en
  vigueur dans ce dépôt (cf. `extension_candidates` de
  `crud-entity.pattern.json`, §153-160 : un champ trouvé sur un seul module a
  été explicitement « non promu au cœur canonique » faute de deuxième preuve —
  la même discipline s'applique ici, à l'échelle de l'outillage).

## Décision

**Option B, avec mise en œuvre différée sur son dernier point.** Trois décisions
actées ensemble :

1. **`execution_topology`** devient un champ optionnel, ouvert (non fermé à une
   liste fixe), attaché à chaque instance de `composition` — orthogonal au
   verbe, jamais fusionné avec lui. Déjà implémenté dans
   `docs/architecture/patterns/pattern-core.schema.json`
   (`$defs.executionTopology`) et appliqué à `workflow-action.pattern.json` (8
   instances, topologies `atomic`/`sequential`/`async_callback` selon le
   sous-graphe réel).
2. **Les fichiers `.pattern.json` nommés sont requalifiés comme « compositions
   mémorisées »** : un sous-ensemble commode et sourcé de l'espace des
   compositions possibles (verbes × variantes × `execution_topology`), jamais la
   seule voie légitime pour générer un module conforme. Ce changement est
   documentaire — aucun fichier existant n'est renommé ni restructuré, seul le
   langage utilisé pour les décrire change (dans ce document et dans
   `taches-restantes.md`).
3. **`check-pattern-nx.mjs` devra, un jour, vérifier une composition déclarée
   inline** (sans fichier `.pattern.json` nommé préalable) — **acté par écrit,
   non implémenté maintenant.** Différé jusqu'à ce qu'un module réel du dépôt
   ait un besoin de composition qui ne rentre dans aucun des patterns déjà
   nommés — même discipline que `extension_candidates`. Tant que ce cas ne s'est
   pas produit, coder cette capacité serait spéculatif.

## Justification

Le premier point est un raffinement direct validé empiriquement contre 4 cas
(dont 2 déjà présents dans le code du dépôt, pas hypothétiques) — refuser de
l'acter reviendrait à ignorer un défaut réel déjà détecté sur du code existant
(`workflow-action` avait bien 6 sous-graphes non représentés dans la composition
initiale).

Le deuxième point est une clarification de statut, sans coût d'implémentation ni
risque de régression — il rend explicite ce qui était déjà vrai structurellement
(un `.pattern.json` est mécaniquement une liste d'instances de verbes, rien de
plus) sans changer aucun comportement observé.

Le troisième point suit la discipline qu'un ingénieur senior applique par défaut
: une capacité générique n'est codée que lorsqu'un deuxième cas réel la réclame,
jamais sur la base d'un unique cas hypothétique produit en discussion. Ce dépôt
applique déjà cette discipline ailleurs (`extension_candidates`) ; l'appliquer
ici aussi évite d'ajouter du code non exercé, donc non vérifiable empiriquement,
à un système qui se veut entièrement vérifiable par l'oracle.

## Conséquences

### Positives

- Le noyau de verbes reste à 5, stable, sans avoir dû choisir entre « ignorer un
  vrai défaut détecté » et « faire regonfler le noyau » — `execution_topology`
  absorbe la variété réelle sans jamais toucher au registre `CORE_VERBS`.
- `workflow-action.pattern.json` reflète désormais fidèlement ses 6 sous-graphes
  réels dans `composition` (contre 1 seule instance `transition` fourre-tout
  avant ce complément) — corrige un défaut de modélisation introduit lors de
  l'implémentation initiale de T2-6, avant qu'il ne soit jamais consommé par un
  outil aval.
- Le vocabulaire « composition mémorisée » clarifie, pour tout futur agent ou
  humain, que créer un nouveau `.pattern.json` nommé n'est jamais un prérequis
  bloquant pour utiliser une combinaison de verbes légitime — lève une ambiguïté
  qu'ADR-0027 laissait ouverte.

### Négatives / dette acceptée

- La vérification de composition inline reste un travail non fait — un besoin
  réel qui se présenterait avant l'implémentation de ce point devrait
  temporairement contourner l'oracle automatisé (vérification manuelle), jusqu'à
  ce que ce point soit levé.
- Deux ADR (0027 et 0028) doivent désormais être lus ensemble pour avoir l'état
  complet de la décision sur les patterns — mitigé par le pointeur explicite en
  tête de ce document et par la mise à jour de `taches-restantes.md`.

### Points à réévaluer

- Dès qu'un module réel a besoin d'une composition qui ne correspond à aucun
  `.pattern.json` existant, implémenter le point 3 (vérification inline dans
  `check-pattern-nx.mjs`) plutôt que de créer un nouveau fichier nommé par
  réflexe — c'est le test qui validera si la distinction
  composition/pattern-nommé était la bonne architecture ou une sur-ingénierie
  non nécessaire.
- Si `execution_topology` reste sur une seule valeur (`atomic`) pour tous les
  modules pendant une longue période, reconsidérer si le champ apporte une
  valeur réelle ou s'il s'agit d'une anticipation prématurée.

## Références

- [ADR-0027](./0027-noyau-verbes-structurels-catalogue-ouvert-patterns.md) —
  décision complétée par ce document, reste Accepted et non contredite.
- [ADR-0020](./0020-isolation-vs-factorisation-workflow-action.md), complété par
  [ADR-0022](./0022-workflow-details-poc-factorisation.md) — précédent direct de
  ce dépôt pour « un ADR qui complète un ADR accepté sans le remplacer ».
- `docs/architecture/patterns/pattern-core.schema.json` — implémentation de
  `execution_topology` (`$defs.executionTopology`).
- `docs/architecture/patterns/workflow-action.pattern.json` — composition
  corrigée à 8 instances reflétant les 6 sous-graphes réels
  (`subgraphs`/`chains`).
- `docs/architecture/patterns/crud-entity.pattern.json`, §`extension_candidates`
  — précédent de doctrine dans ce dépôt pour différer une généralisation tant
  qu'une seule preuve existe.
- [Command–query separation — Wikipedia](https://en.wikipedia.org/wiki/Command%E2%80%93query_separation)
  — principe de Bertrand Meyer (1988, Eiffel).
- [Martin Fowler — CQRS](https://martinfowler.com/bliki/CQRS.html) — extension
  architecturale par Greg Young (2010).
- [AIP-136 — Custom methods](https://google.aip.dev/136) — précédent
  d'échappatoire hors noyau déjà cité par ADR-0027, réutilisé ici pour justifier
  `execution_topology` hors du noyau de verbes.
