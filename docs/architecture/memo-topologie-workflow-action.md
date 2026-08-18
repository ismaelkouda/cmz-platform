# Mémo d'investigation — généraliser `workflow-action` à une topologie variable

**Statut : mémo factuel, aucune recommandation tranchée. Décision réservée à
un humain.**

Date : 2026-08-18. Fait suite à PLAT-4bis (généralisation du vocabulaire de
`workflow-action`, close le même jour) et à la question posée sur la
couverture du claim « plateforme générique » (`generation-platform-capability-matrix.md`
§6) par un cas structurellement différent, pas seulement un vocabulaire
différent.

## 1. État actuel

PLAT-4bis a prouvé que le moteur `workflow-action` dérive son **vocabulaire**
(noms d'opérations, de permissions, d'états) de la définition, plutôt que de
comparer à des constantes littérales (`take`/`qualify`/`export`). Cette
généralisation n'a jamais touché la **topologie** : le moteur reste borné à
exactement 3 rôles structurels fixes — une transition d'entrée sans branche
(`entry`), une transition de décision à 2 branches accept/reject
(`decision`), un export asynchrone à 2 branches rows-found/no-rows
(`export`).

Trois fichiers portent cette contrainte, avec des niveaux de rigidité très
différents :

### 1.1 `core/workflow-action-model.mjs` (IR / Behavior Model) — déjà générique

`validateWorkflowBehavior` ne suppose aucun nombre fixe d'opérations, ni de
rôle nommé. La contrainte des 3 rôles est explicitement déléguée à
`workflow-action-authoring.mjs` (commentaire lignes 162-166 : « la présence
des 3 rôles structurels est vérifiée par `validateWorkflowActionDefinition`,
pas de contrainte littérale ici »). **Ce fichier n'a besoin d'aucun
changement** pour accepter une topologie différente — il accepte déjà
`operations` de longueur arbitraire.

### 1.2 `core/workflow-action-authoring.mjs` (validateur) — rigide mais localisé

```js
invariant(
    definition.operations.length === 3,
    'operations must declare exactly 3 entries'
);
// ...
for (const role of ['entry', 'decision', 'export']) {
    invariant(roles.has(role), `operations must include one operation for role ${role}`);
}
```

(lignes 99-122). `detectRole` (lignes 83-92) ne reconnaît que 3 formes
possibles — aucune quatrième forme n'existe même en théorie dans le code
actuel. Le schéma JSON sous-jacent
(`schemas/workflow-action-definition.schema.json`) n'impose en revanche
**aucune** limite sur `operations` (`minItems: 1`, pas de `maxItems`) : la
rigidité est entièrement dans le validateur TypeScript, pas dans le contrat
JSON Schema. Un changement ici est **localisé et mécanique** : remplacer
« exactement 1 candidat par rôle parmi 3 » par « au moins 1 `entry`, N ≥ 1
`decision` enchaînées, 1 `export` », et faire correspondre chaque `decision`
à l'état d'entrée de la suivante.

### 1.3 `renderers/workflow-shared.mjs` (codegen) — le vrai point dur

Ce fichier ne boucle pas sur les rôles : il génère un **gabarit TypeScript à
emplacements fixes**, un par rôle, en un seul template littéral
(`renderWorkflowEngine`, ~200 lignes). Concrètement :

- une seule méthode privée générée par rôle : `${entryMethod}`,
  `${decisionMethod}`, `${exportMethod}` (une seule occurrence de chaque nom
  dans le template) ;
- `WorkflowCommand` (le type d'union généré) a exactement 3 branches, une par
  rôle (lignes 114-126) ;
- `${decisionMethod}` a une logique de branchement binaire câblée en dur
  (`accepted`/`rejected`, une seule paire), pas une boucle sur un tableau de
  décisions ;
- l'état de sortie d'une décision (`accepted.to`/`rejected.to`) est
  directement l'état repris par le contexte suivant — avec 2 décisions
  enchaînées, il faudrait que la sortie de la décision N devienne l'état
  d'entrée validé par la décision N+1, ce qui n'existe dans aucune structure
  de données actuelle du renderer ;
- `validateQualification` est écrite une fois, pour une seule paire de
  règles, pas paramétrée par décision.

Générer du code pour N décisions enchaînées demanderait de transformer ce
gabarit statique en **génération procédurale** (boucle sur un tableau de
rôles `decision`, noms de méthode et de type dérivés par index ou id,
enchaînement d'état entre décisions consécutives déclaré explicitement plutôt
qu'implicite). C'est une réécriture de la fonction, pas une extension
additive.

### 1.4 `core/workflow-runtime-oracle.mjs` (Oracle d'exécution) — même problème, miroir du renderer

`resolveRoles` (lignes 29-50) retourne un objet à 5 clés fixes (`entry`,
`decision`, `exportOperation`, `accepted`, `rejected`), pas une structure
pouvant représenter N décisions. `assertWorkflowOracle` (lignes 126-325)
exerce des scénarios écrits pour cette forme précise : un scénario
accept/reject unique, un fixture de contexte à un seul `qualificationStatus`.
Prouver N décisions enchaînées demanderait de nouveaux scénarios (accepter à
l'étape 1 puis rejeter à l'étape 2, par exemple) et une structure de contexte
qui garde trace de l'état de chaque décision traversée — pas seulement d'un
statut de qualification unique.

## 2. Ce qu'impliquerait la généralisation

### Design cible envisageable (non tranché)

- **IR (`workflow-action-model.mjs`)** : aucun changement.
- **Validateur** : remplacer la contrainte « exactement entry+decision+export »
  par « exactement 1 `entry`, N ≥ 1 `decision` (formant une chaîne d'états
  valide de `entry.to` à `export.from`), exactement 1 `export` ». Effort
  localisé, risque faible (le message d'erreur change, le comportement sur
  `requests-workflow`/`content-moderation-workflow` — tous deux à 1 seule
  décision — doit rester identique par construction si N=1 est traité comme
  cas particulier de N=k).
- **Renderer** : remplacer les 3 méthodes nommées par une boucle générative
  sur un tableau de `decision`, avec un type `WorkflowCommand` à N+2
  branches au lieu de 3, un enchaînement d'état explicite entre décisions
  consécutives déclaré dans le modèle (probablement un nouveau champ sur
  `branch`, ex. `next_decision_id`, ou une convention d'ordre par position
  dans le tableau `operations`). Effort substantiel — c'est une réécriture
  du cœur du générateur de code, pas une extension.
- **Oracle** : généraliser `resolveRoles`/`buildBaseContext` pour retourner
  un tableau de décisions plutôt que 2 clés fixes, ajouter des scénarios de
  test couvrant l'enchaînement (accept étape 1 → decision étape 2 accessible ;
  reject étape 1 → étape 2 jamais atteinte). Effort substantiel, couplé au
  renderer (l'Oracle teste le code que le renderer génère).

### Estimation d'effort

Comparable en ampleur à PLAT-4bis dans son ensemble (qui a touché 4 fichiers
cœur avec baseline de non-régression à chaque étape, sur une session
longue) : le validateur est un changement mineur, mais renderer + Oracle
représentent une réécriture de leur logique centrale, pas une extension de
règle. Une estimation raisonnable est **L à XL**, pas un ajustement rapide.

### Risque de régression

`requests-workflow` (production réelle, golden reference SEOS) et
`content-moderation-workflow` (fixture de non-régression permanente,
`content-moderation-workflow.test.mjs`) utilisent tous deux exactement 1
décision. Toute généralisation doit conserver leur comportement identique
(mêmes hash de manifest si possible, sinon re-vérification complète des deux
suites). Le risque principal n'est pas l'échec immédiat mais une régression
silencieuse sur le cas N=1 pendant la généralisation vers N variable — la
même classe de risque que celle déjà rencontrée pendant PLAT-4bis (l'Oracle
testé contre un modèle muté au lieu de l'original, corrigée avant commit).

## 3. Options si la généralisation est engagée

Aucune des options suivantes n'est recommandée ici.

**Option A — Généraliser complètement (validateur + renderer + Oracle) pour
N décisions arbitraires.** Avantage : ferme réellement le gap topologique,
preuve la plus forte du claim générique. Inconvénient : effort L/XL, risque
de régression le plus élevé sur le code déjà en production, aucun cas réel
connu dans ce dépôt n'a aujourd'hui besoin de plus d'une décision (le besoin
reste hypothétique, pas observé).

**Option B — Généraliser seulement à un nombre fixe connu à l'avance (ex.
exactement 2 décisions, comme un 4ᵉ rôle nommé plutôt qu'un tableau
variable).** Avantage : effort plus proche de PLAT-4bis (M/L), réutilise le
patron « rôle détecté par forme » déjà en place. Inconvénient : ne prouve
pas la généricité pour un nombre arbitraire de décisions — juste un cas
biplus, une preuve plus faible du claim « générique ».

**Option C — Ne pas généraliser la topologie maintenant ; documenter la
limite dans la matrice de capacités et chercher un cas réel avant
d'engager l'effort.** Avantage : aucun risque de régression, effort nul
immédiat. Inconvénient : le claim « plateforme générique » reste borné à
une seule topologie prouvée ; le gap identifié dans ce mémo reste ouvert
indéfiniment sans date de traitement.

## 4. Référence

Voir aussi `generation-platform-capability-matrix.md` §4/§9 (gap « budget
d'extensions hors modèle », distinct de celui-ci) et
`taches-restantes.md`, entrée PLAT-4bis, pour le détail de la
généralisation déjà faite sur le vocabulaire (mais pas la topologie).
