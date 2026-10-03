# Évaluer une interface générée — place éventuelle de JEV

- **Date :** 2026-10-03
- **Statut :** analyse Staff ; aucun outil ni gate JEV autorisé par ce document
- **Périmètre :** interface réalisée par un LLM depuis une preuve de
  présentation Figma, capture, wireframe ou design structuré
- **Question :** JEV peut-il juger les résidus visuels, techniques et
  architecturaux que les oracles déterministes du dépôt ne savent pas
  entièrement couvrir ?

## Verdict exécutif

**Le problème est réel, mais il contient deux évaluations différentes.**

Les oracles actuels savent prouver la compilation, les contrats, les
comportements, l'accessibilité mécanique et plusieurs invariants de mise en
page. Ils ne savent pas complètement déterminer si le rendu produit :

- préserve la hiérarchie et l'intention de la référence ;
- reste lisible, équilibré et compréhensible ;
- adapte correctement cette intention aux viewports non dessinés ;
- utilise la bonne densité et la bonne importance relative des actions ;
- constitue une interprétation acceptable plutôt qu'une copie pixel parfaite.

Ils ne déterminent pas non plus entièrement si le LLM a réalisé cette interface
avec le meilleur moyen disponible : primitive HTML ou Angular native,
composant Material, motif Angular Aria, CDK, Tailwind, composant existant ou
code spécifique. Une implémentation peut compiler, passer les tests et rester
inutilement complexe, dupliquer une règle conceptuelle, mélanger des
responsabilités ou ajouter une abstraction sans variation réelle.

JEV reçoit officiellement un `state` texte ou JSON et des questions typées. Il
ne reçoit pas les images, ne rend pas de constat localisé et ne peut pas voir ce
qu'un extracteur en amont a omis. Lui transmettre seulement les chemins ou les
hashes de deux PNG ne lui donne aucune information visuelle.

Sur la piste visuelle, son utilité plausible est donc **en aval d'un observateur
visuel** : JEV peut transformer un dossier d'écarts structuré en quelques
décisions étroites, probabilisées et comparables dans le temps.

Sur la piste code et outillage, JEV peut lire un état textuel borné : work order,
diff pertinent, dépendances, primitives disponibles, règles officielles
versionnées, traces d'outils et résultats des gates. Il peut alors estimer des
risques atomiques comme le contournement injustifié d'une primitive native ou
une abstraction tournée uniquement vers un futur hypothétique. Cette piste est
plus directement compatible avec JEV, mais reste probabiliste et contextuelle.

Les deux pistes ne produisent jamais une note globale de qualité. JEV ne doit ni
approuver une interface, ni bloquer seul une fusion.

La décision actuelle est :

1. reconnaître deux angles morts résiduels : fidélité visuelle et pertinence de
   la réalisation technique ;
2. conserver deux scorecards indépendantes afin qu'un bon rendu ne masque pas
   un mauvais code, et inversement ;
3. ne pas présenter JEV comme un modèle multimodal ;
4. définir des dossiers de preuve provider-neutral avant tout client JEV ;
5. comparer en laboratoire son apport marginal au juge multimodal, au reviewer
   de code outillé et à la revue humaine ;
6. ne rien installer dans la CI tant que cette comparaison n'existe pas.

## Ce que couvre déjà l'oracle

Pour chaque état et viewport déclarés, la chaîne peut produire ou vérifier de
façon reproductible :

- le build, le démarrage et l'absence d'erreur runtime ;
- les interactions, requêtes, transitions et états attendus ;
- l'arbre d'accessibilité, les noms, rôles, focus et parcours clavier ;
- la présence ou l'absence d'éléments obligatoires ;
- les breakpoints, débordements, superpositions et zones rognées mesurables ;
- les dimensions, positions et styles calculés de points d'ancrage déclarés ;
- les tokens, composants officiels et contraintes du design system encodables ;
- des comparaisons de captures dans un environnement de rendu identique ;
- les versions réellement épinglées, imports, dépendances ajoutées et frontières
  Nx ;
- les interdictions mécaniques du profil Angular, le code mort, les duplications
  syntaxiques et les budgets de taille.

Ces constats restent prioritaires : lorsqu'une attente peut être exprimée comme
un invariant explicite, elle doit devenir une assertion déterministe plutôt
qu'une question adressée à un modèle.

Les comparaisons pixel Playwright restent utiles contre une régression d'un
golden déjà accepté. Elles ne prouvent toutefois pas à elles seules qu'une
première traduction Figma → code est bonne. Elles sont aussi sensibles au
navigateur, au système, aux polices et au matériel ; référence et rendu doivent
donc être capturés dans le même environnement épinglé.

## Les résidus qui exigent encore du jugement

### Piste A — résultat visuel et adaptatif

Après les contrôles déterministes, les questions suivantes restent
contextuelles :

- la hiérarchie visuelle communique-t-elle le bon ordre de lecture ?
- l'action primaire est-elle identifiable sans écraser les actions secondaires ?
- une différence géométrique est-elle une adaptation légitime ou une perte
  d'intention ?
- la densité reste-t-elle exploitable lorsque les données réelles sont plus
  longues que celles de la maquette ?
- le passage expanded → medium → compact conserve-t-il les priorités plutôt que
  de simplement réduire les dimensions ?
- une interface conforme aux pixels demeure-t-elle néanmoins confuse ?

Ces questions portent sur **la fidélité sémantique de présentation**.

### Piste B — code, choix des primitives et outils employés

Après les contrôles statiques, il subsiste des arbitrages que le diff seul ne
transforme pas automatiquement en faits :

- une primitive officielle disponible a-t-elle été contournée sans raison liée
  au contrat visuel ou au comportement ?
- le code spécifique est-il plus simple que la primitive ou l'abstraction qu'il
  remplace sur ce cas précis ?
- une nouvelle dépendance apporte-t-elle une capacité absente du socle ?
- la duplication observée représente-t-elle le même concept ou seulement deux
  syntaxes ressemblantes ?
- le composant possède-t-il plusieurs raisons indépendantes de changer ?
- l'abstraction répond-elle à une seconde variation réelle ou seulement à une
  anticipation ?
- les outils utilisés ont-ils fourni des preuves pertinentes, ou seulement une
  activité abondante sans effet sur la qualité ?

Cette piste reçoit une scorecard distincte. KISS, DRY, YAGNI et SOLID ne sont
pas additionnés : ils peuvent se contredire et plusieurs ne sont pas applicables
à un diff donné.

## Architecture d'évaluation correcte

```text
preuve de présentation approuvée et immuable
  + contrat de page et états attendus
  + rendu navigateur réel par état et viewport
                │
                ▼
extracteurs déterministes
  pixels, DOM/ARIA, géométrie, styles, tokens, overflow
                │
                ▼
observateur visuel multimodal ou humain
  constats localisés et structurés, jamais verdict libre
                │
                ▼
dossier d'évaluation adressé par contenu
                │
                ├── revue humaine avec images et overlays
                │
                └── JEV optionnel en shadow
                    décisions étroites + probabilités
```

Cette séparation empêche deux confusions :

- **observer** une image n'est pas **décider** de la gravité d'un écart ;
- un jugement probabiliste n'est pas une **preuve** de fidélité.

### 1. Autorité visuelle

L'autorité reste le `presentation-evidence` approuvé d'ADR-0066 : sources
locales, hashées, bornées par page, état et viewport, avec l'autorité
`presentation-only`. Une URL Figma vivante ou une nouvelle capture récupérée au
moment de la CI ne peut pas changer la référence silencieusement.

Pour une source Figma structurée, le snapshot doit conserver autant que
possible : frames, composants, variables, Auto Layout, noms sémantiques,
annotations et mappings Code Connect. Figma indique lui-même que ce contexte
aide l'agent à interpréter le design mais ne constitue pas du code de production
canonique.

### 2. Rendu réel comparable

Le rendu candidat doit employer :

- le même état métier et les mêmes données figées ;
- le viewport et le ratio de pixels déclarés ;
- une horloge, des animations, des polices et un navigateur épinglés ;
- le même thème, la même locale et les mêmes préférences utilisateur ;
- une preuve distincte pour chaque état significatif.

Sans ces contrôles, l'évaluateur mesure principalement le bruit du harnais.

### 3. Dossier de preuve provider-neutral

Le format exact reste à décider, mais son contenu minimal serait :

```json
{
  "reference": {
    "presentation_id": "presentation_...",
    "source_id": "expanded-ready",
    "sha256": "...",
    "viewport": { "width": 1440, "height": 1024, "pixel_ratio": 1 }
  },
  "actual": {
    "run_id": "run_...",
    "sha256": "...",
    "browser_profile": "chromium-pinned"
  },
  "deterministic_findings": [
    {
      "rule_id": "no-horizontal-overflow",
      "outcome": "pass",
      "evidence": "viewport:1440x1024"
    }
  ],
  "visual_observations": [
    {
      "observation_id": "obs_...",
      "category": "visual-hierarchy",
      "claim": "secondary action dominates the primary action",
      "reference_region": [1180, 28, 1320, 76],
      "actual_region": [1040, 20, 1400, 92],
      "observer": "multimodal-model-or-human",
      "confidence": 0.78
    }
  ]
}
```

Chaque constat doit indiquer sa provenance et sa région. Un résumé sans preuve
localisable est insuffisant pour corriger l'interface et difficile à auditer.

### 4. Observateur multimodal

Une capture ou un frame Figma exige un modèle qui accepte réellement les images
ou une inspection humaine. Cet observateur compare référence et rendu, puis
émet un vocabulaire fermé de constats, par exemple :

- `missing-content` ;
- `visual-hierarchy` ;
- `spacing-density` ;
- `alignment-grouping` ;
- `responsive-intent` ;
- `component-substitution` ;
- `readability` ;
- `unsupported-observation`.

Il doit pouvoir répondre `unknown` et pointer les zones comparées. Ses constats
sont des **candidats**, pas des faits, jusqu'à confirmation mécanique ou humaine.

### 5. JEV comme arbitre étroit optionnel

JEV ne recevrait que le dossier JSON assaini, sans image, code complet, secret
ou instruction issue de la source. Un seul appel pourrait répondre à plusieurs
questions indépendantes :

- `primary_hierarchy_lost` — probabilité que les constats fournis montrent une
  perte de hiérarchie de l'action primaire ;
- `responsive_intent` — choix fermé entre `preserved`, `partially_preserved`,
  `lost` et `insufficient_evidence` ;
- `divergence_severity` — `none`, `minor`, `major` ou `critical` selon des
  critères versionnés ;
- `human_review_priority` — rang de priorité, pas note de qualité ;
- `evidence_sufficient` — probabilité que les preuves fournies permettent même
  de rendre le jugement demandé.

JEV apporte ici trois propriétés potentiellement utiles : réponse typée,
distribution de probabilités et modèle épinglable. Il ne produit cependant ni
explication, ni citation, ni localisation supplémentaire. Il est donc utile
seulement si son arbitrage est plus stable ou moins coûteux que demander le même
verdict au modèle multimodal qui a déjà observé les images.

## Piste B — architecture de l'évaluation du code et des outils

```text
work order et règles applicables à la version épinglée
  + diff borné et graphe des imports
  + dépendances et composants disponibles
  + journal factuel des outils utilisés
  + résultats des gates déterministes
                │
                ▼
dossier de réalisation adressé par contenu
                │
                ├── reviewer de code outillé
                │     diagnostic expliqué, lignes et règle citées
                │
                ├── revue humaine
                │     compromis et acceptation
                │
                └── JEV optionnel en shadow
                      questions atomiques applicables au diff
```

### Versions et documentation officielle

« Dernières normes » ne signifie pas charger le web courant pendant chaque CI.
Le verdict deviendrait non reproductible et pourrait viser une version que le
dépôt n'utilise pas. La source d'autorité est :

1. le catalogue et le lockfile réellement fusionnés ;
2. la documentation officielle applicable à ces versions ;
3. une règle locale versionnée avec identifiant, source, version vérifiée et
   tests lorsqu'elle est mécanisable ;
4. une exception explicite et relue lorsqu'une recommandation n'est pas adaptée
   au contexte produit.

Ce dépôt cible actuellement Angular `22.2.0`, Angular Aria/Material/CDK
`22.2.1` et Tailwind `4.1.13`. Le profil
[`angular-22.profile.json`](../../conventions/angular-22.profile.json) lie déjà
les choix volatils à Angular 22. Une veille séparée peut détecter une nouvelle
version officielle et proposer une PR de mise à jour ; elle ne change jamais la
règle d'une PR applicative en cours.

Le dossier transmis à un évaluateur contient uniquement les règles pertinentes,
identifiées et paraphrasées avec leur provenance. Il ne copie pas toute la
documentation et ne demande pas à JEV de connaître implicitement la version du
framework.

Une future règle consommable par un LLM ou un évaluateur devra au minimum
déclarer :

```text
rule_id
écosystème et plage de versions applicable
source officielle et date de vérification
énoncé normatif paraphrasé
conditions d'applicabilité et exceptions
mode de preuve : déterministe | probabiliste | humain
identifiant de la règle remplacée, le cas échéant
```

La veille suit le chemin `source officielle → analyse d'applicabilité → PR du
profil → tests → revue humaine`. L'upgrade d'une bibliothèque et l'upgrade des
règles qui la gouvernent sont corrélées, sans être appliquées silencieusement
par un job planifié.

### Hiérarchie des moyens à vérifier

Le jugement ne récompense pas le nombre d'outils. Il vérifie si le LLM a choisi
le moyen **minimal, officiel et suffisant** selon ADR-0077 :

1. HTML et CSS natifs pour un contrôle simple ;
2. Angular core, forms et router ;
3. Angular Material pour une UI Material adoptée, ou Angular Aria pour un motif
   WAI-ARIA headless au visuel propre ;
4. Angular CDK pour une primitive bas niveau réellement manquante ;
5. Tailwind ou styles de composant scopés pour la géométrie et la présentation ;
6. composant ou code spécifique seulement lorsque les options précédentes ne
   couvrent pas le contrat.

Une solution custom n'est pas une faute par nature. Elle doit être justifiée par
un écart concret : contrat visuel incompatible, comportement absent, coût de la
primitive disproportionné ou preuve de régression. Inversement, ajouter
Material, Aria ou CDK à un élément que HTML couvre déjà est aussi une dérive.

### Journal factuel des outils

Le journal de réalisation conserve seulement les faits auditables :

- identifiant, version et fournisseur de l'agent ;
- work order et règles fournis, adressés par hash ;
- outils appelés : Figma MCP, documentation, recherche locale, générateur,
  navigateur, tests, formatteur ou migration ;
- versions et paramètres non secrets des outils ;
- artefacts lus ou produits, hashes et résultats ;
- commandes/gates exécutées, statut, durée et diagnostics ;
- dépendances ajoutées, retirées ou mises à jour ;
- éventuelles dérogations déclarées.

Ce journal provient de l'orchestrateur et du dépôt, pas d'une auto-déclaration
du LLM. Il ne stocke ni chaîne de pensée, ni raisonnement privé, ni secret. Une
absence de trace signifie `unknown`, pas « outil non utilisé ».

Le journal sert à répondre à des questions précises : le LLM a-t-il consulté la
référence Figma exacte ? a-t-il lancé le rendu au bon viewport ? a-t-il utilisé
la primitive officielle annoncée ? a-t-il ajouté une dépendance alors que la
capacité existait ? Il ne sert pas à mesurer la productivité au nombre d'appels.

### Applicabilité des principes de conception

Chaque principe possède un prérequis. L'évaluateur doit d'abord établir
`applicable`, `not_applicable` ou `insufficient_evidence`, puis seulement
examiner un risque.

| Principe | Question utile et bornée | Erreur à éviter |
| --- | --- | --- |
| KISS | le diff ajoute-t-il des mécanismes sans nécessité démontrée par le work order ? | confondre peu de lignes et simplicité du système |
| YAGNI | une branche, extension ou configuration ne sert-elle qu'une variation future non demandée ? | interdire une extension déjà exigée par deux cas réels |
| DRY | la même règle métier ou décision change-t-elle à plusieurs endroits ? | abstraire deux fragments seulement similaires visuellement |
| SRP | l'unité modifiée possède-t-elle plusieurs raisons indépendantes de changer ? | exiger un fichier ou composant par fonction |
| OCP | une frontière stable avec variations réelles est-elle modifiée par branches répétées ? | créer une stratégie pour un seul cas hypothétique |
| LSP | existe-t-il réellement des implémentations substituables avec un contrat comportemental ? | déduire une violation d'une simple forme TypeScript |
| ISP | plusieurs consommateurs sont-ils forcés de dépendre de capacités inutiles ? | fragmenter une interface locale à consommateur unique |
| DIP | une politique de haut niveau dépend-elle d'un détail externe volatil qui mérite un port ? | ajouter un port autour de toute fonction ou composant local |

Cette matrice empêche un reviewer probabiliste de fabriquer de « bonnes
pratiques » hors contexte. DRY peut céder devant KISS/YAGNI ; OCP ne prime pas
sur l'absence de variation ; un composant de présentation local n'a pas besoin
de démontrer LSP, ISP et DIP.

### Dossier de réalisation provider-neutral

Le format exact reste à décider. Il doit au minimum relier :

```json
{
  "task": { "work_order_id": "...", "acceptance_ids": ["..."] },
  "versions": {
    "angular": "22.2.0",
    "angular_aria": "22.2.1",
    "angular_material": "22.2.1",
    "tailwind": "4.1.13"
  },
  "applicable_rules": [
    {
      "rule_id": "angular22.ui.native-first",
      "source": "ADR-0077",
      "evidence_refs": ["diff:file:line", "import-graph:node"]
    }
  ],
  "tool_events": [
    {
      "tool_id": "browser-render",
      "version": "pinned",
      "outcome": "success",
      "artifact_refs": ["sha256:..."]
    }
  ],
  "deterministic_results": [{ "gate_id": "lint", "outcome": "pass" }],
  "diff_evidence": [{ "file": "...", "lines": [42, 71] }],
  "waivers": []
}
```

Le dossier ne contient pas le dépôt entier. Un producteur déterministe résout
le graphe minimal des fichiers concernés, rattache les règles applicables et
refuse les preuves ambiguës. Les contenus issus de Figma, commentaires et noms
de fichiers restent non fiables et ne peuvent pas devenir des instructions.

### Questions JEV admissibles pour cette piste

Les questions possibles restent fermées et indépendantes :

- `native_primitive_bypassed` — une primitive déclarée applicable paraît-elle
  contournée sans justification fournie ?
- `custom_code_justification` — `supported`, `weak`, `missing` ou
  `not_applicable` ;
- `dependency_delta_necessary` — les capacités requises sont-elles absentes du
  socle décrit ?
- `future_only_abstraction` — probabilité que l'abstraction ne serve qu'un cas
  futur non demandé ;
- `responsibility_mixing_risk` — plusieurs raisons indépendantes de changer
  sont-elles démontrées par les éléments fournis ?
- `conceptual_duplication_risk` — les occurrences référencées portent-elles la
  même décision plutôt qu'une ressemblance syntaxique ?
- `evidence_sufficient` — les éléments permettent-ils de juger la question ?
- `human_review_priority` — priorité de revue de cette zone bornée.

JEV ne découvrira pas seul les lignes ni les règles. Les `evidence_refs` sont
produites avant son appel et restent visibles dans le rapport. Un reviewer de
code outillé demeure préférable pour expliquer le problème et proposer une
correction ; JEV n'est évalué que comme signal indépendant de tri et de
calibration.

### Scorecard attendue, sans moyenne trompeuse

« Noter » signifie attribuer un résultat **par axe atomique**, jamais fabriquer
un `82/100` à partir de critères incompatibles. Chaque ligne de scorecard porte :

```json
{
  "axis": "native-primitive-selection",
  "scope": "user-filter.component.ts:40-96",
  "applicability": "applicable",
  "verdict": "probable-deviation",
  "severity": "major",
  "confidence": 0.81,
  "evidence_refs": ["rule:angular22.ui.native-first", "diff:..."],
  "authority": "probabilistic-shadow"
}
```

L'orchestrateur fournit l'axe, le périmètre et les références. JEV fournit
uniquement la décision fermée et sa distribution ; il ne doit pas être crédité
d'une explication qu'il n'a pas produite. `not_applicable`, `unknown` et
`insufficient_evidence` sont des résultats normaux, pas des échecs à convertir
en zéro.

Le tableau de bord peut afficher couverture, constats par gravité et confiance,
mais aucune moyenne ne décide de la fusion. Sur un corpus de nombreuses
réalisations, la plateforme peut en revanche mesurer la qualité du **processus
LLM** : taux d'acceptation sans correction, défauts échappés, rework, recours
injustifié au custom, stabilité et coût. Cette mesure sert à comparer modèles,
prompts et work orders ; le code d'une PR conserve la même barre de qualité,
quel que soit son auteur.

## Ce que JEV ne doit jamais noter

Les questions suivantes sont volontairement interdites :

- « l'interface est-elle belle ? » ;
- « la page est-elle Staff quality ? » ;
- « est-elle conforme à toutes les bonnes pratiques ? » ;
- « respecte-t-elle SOLID ? » sans test préalable d'applicabilité ;
- « les outils ont-ils été bien utilisés ? » sans événements et critères
  versionnés ;
- « donne une note globale sur 100 » ;
- « cette PR peut-elle être fusionnée ? ».

Elles n'ont ni critères falsifiables, ni localisation, ni action corrective
unique. Un score composite peut rester stable tout en masquant la disparition
d'une action essentielle. Les verdicts visuels doivent rester séparés par état,
viewport, catégorie et gravité. Les verdicts de réalisation restent séparés par
règle, zone du diff, applicabilité et preuve.

## Comparaison obligatoire avant adoption

Le laboratoire visuel doit comparer aveuglément, sur les mêmes paires
référence/rendu :

| Variante | Contenu |
| --- | --- |
| A | oracles déterministes + revue humaine |
| B | A + constats du modèle multimodal |
| C | B + décisions JEV sur le dossier structuré |

La variante C n'est retenue que si JEV apporte un gain marginal mesuré par
rapport à B :

- meilleur rappel des écarts importants déjà étiquetés ;
- faux positifs acceptables par catégorie ;
- calibration exploitable des probabilités ;
- stabilité entre répétitions avec le même modèle épinglé ;
- réduction nette du temps de tri ou de revue ;
- résistance aux textes malveillants présents dans les captures et annotations.

Si B égale ou dépasse C, JEV est supprimé de ce flux. Ajouter un second modèle
qui reformule la décision du premier sans gain mesurable violerait KISS et
ADR-0080.

Le corpus doit contenir des écarts intentionnels et non intentionnels, les états
nominal, chargement, vide, erreur et interaction, ainsi que compact, medium et
expanded. Les étiquettes humaines sont fixées avant l'exécution des modèles et
les cas de calibration sont séparés des cas de validation.

Le laboratoire de réalisation compare séparément :

| Variante | Contenu |
| --- | --- |
| D | gates déterministes + revue humaine |
| E | D + reviewer de code outillé produisant diagnostics et lignes |
| F | E + décisions JEV sur le dossier de réalisation |

La variante F doit trouver des risques pertinents manqués par E, mieux calibrer
la priorité ou réduire le temps de revue. Si elle ne fait que répéter un lint,
un diagnostic du reviewer ou une règle du profil, elle est rejetée. Les corpus
visuel et code restent distincts : une moyenne commune détruirait
l'interprétabilité des résultats.

## Place dans la CI

Même après un POC concluant, le séquencement resterait :

1. les gates déterministes bloquent les violations certaines ;
2. le harnais capture les preuves visuelles, le diff borné, les versions et le
   journal factuel des outils dans un environnement épinglé ;
3. l'évaluation probabiliste s'exécute en shadow ou hors chemin critique ;
4. le rapport sépare la scorecard visuelle de la scorecard de réalisation et
   affiche images, overlays, lignes, règles, constats et probabilités ;
5. un reviewer humain distinct accepte ou demande la correction.

Une panne JEV, un timeout, une entrée invalide ou une confiance insuffisante
produit `neutral`. Aucun appel externe ne transforme une PR rouge en verte, ne
remplace l'approbation et ne met à jour un golden automatiquement.

## Web Codegen Scorer : précédent, pas dépendance candidate

Le Web Codegen Scorer de l'équipe Angular reste un précédent intéressant : il
combinait build, runtime, accessibilité, sécurité, bonnes pratiques, captures et
autorating pour comparer des modèles, prompts et configurations. Son dépôt
officiel a toutefois été archivé le 11 septembre 2026 et est désormais en
lecture seule.

Il peut informer la conception de notre laboratoire, mais ne doit plus être
présenté comme un outil actif à installer ou comme une autorité maintenue. Son
archivage renforce l'exigence d'un format provider-neutral, simple et
supprimable.

## Direction recommandée

À court terme :

1. ne pas installer JEV dans la CI ;
2. conserver les références approuvées déjà liées au
   `presentation-evidence` ;
3. produire des captures réelles et déterministes pour les mêmes états et
   viewports ;
4. formaliser un journal minimal des outils et un dossier de réalisation sans
   stocker de raisonnement privé ;
5. formaliser les dossiers d'évaluation visuelle et technique indépendants du
   fournisseur ;
6. mesurer deux baselines humaines et déterministes séparées ;
7. tester un observateur multimodal sur la piste visuelle et un reviewer outillé
   sur la piste code ;
8. seulement après, mesurer l'apport additionnel de JEV en replay/shadow sur
   chacune des pistes.

Le premier livrable utile n'est donc pas un client JEV. C'est une paire fiable
**référence approuvée ↔ rendu réel** et un triplet traçable **work order ↔ outils
et règles ↔ diff**, accompagnés de preuves comparables. Sans eux, aucun juge —
humain, multimodal, reviewer de code ou JEV — ne peut être correctement évalué.

## Mise en œuvre pilote — paire visuelle C5

Le premier cas comparable est désormais décrit par
`designs/users-management-proof.visual-evaluation.json` : l'état
`medium-create-invalid` relie une source approuvée du
`presentation-evidence` au scénario Playwright exact qui produit le même état au
même viewport `1024 × 768`.

Le collecteur provider-neutral :

- refuse une référence absente, modifiée ou non visuelle ;
- exige l'identité exacte des viewports et dimensions PNG ;
- refuse un scénario renommé, une capture absente ou plusieurs captures de même
  nom ;
- consigne les SHA-256, tailles, chemins et versions de rendu ;
- publie uniquement le statut `captured-unreviewed` et une revue
  `pending-human-review` ;
- n'émet ni score, ni verdict, ni correction, ni appel à un fournisseur.

Après le scénario Playwright, le dossier se reconstruit localement avec :

```bash
node tools/generator-platform/collect-visual-evaluation.mjs
```

La CI assemble le dossier après le passage Playwright puis conserve ensemble la
capture réelle et `visual-evaluation.bundle.json`. Le lot pilote ne couvre
volontairement qu'un état dont l'équivalence métier est établie. Une référence
historique supersédée, un état voisin ou une capture au bon viewport ne doivent
jamais être appariés par simple ressemblance. L'extension à d'autres états exige
donc un scénario runtime équivalent et une revue explicite de la paire.

Cette mise en œuvre ferme le problème de provenance et de comparabilité ; elle
ne ferme pas encore celui du jugement visuel. La prochaine étape est de définir
et mesurer une baseline de revue humaine sur ces dossiers, avant tout observateur
multimodal ou expérimentation JEV.

## Protocole pilote — accessibilité, mise en page et jugement humain

Le second incrément couple désormais le cas `medium-create-invalid` à un
protocole de revue explicite sans demander à un modèle de réinterpréter les
faits mesurables. Le protocole
`designs/users-management-proof.visual-review.json` sépare trois modes de
preuve :

- `deterministic` pour un fait qui doit être affirmé par le navigateur et qui
  bloque la collecte s'il échoue ;
- `human` pour une appréciation visuelle qui reste en attente d'une personne ;
- `hybrid` lorsque le navigateur prouve la présence mécanique et que la
  lisibilité de sa présentation exige encore une revue.

Le scénario qui produit la capture écrit maintenant, dans le même répertoire,
une preuve JSON de version `1.0.0`. Pour l'état invalide Medium, elle consigne :

- le rôle, le nom accessible, `aria-modal` et l'arrière-plan inerte ;
- l'absence de POST, l'alerte, les cinq erreurs et le focus sur `Nom` ;
- la stabilité de la liste, la largeur réelle du dialogue et ses bornes
  `520–640 px`, sa présence dans le viewport et sa hauteur bornée ;
- l'absence de débordement horizontal du document ;
- la présence d'un résumé textuel et de cinq messages visibles, sans prétendre
  que ces faits prouvent à eux seuls leur bonne lisibilité.

Le collecteur refuse une preuve absente, détachée de la capture, mal formée,
liée à un autre cas ou viewport, incomplète, dupliquée ou en échec sur un
critère bloquant. Il refuse également un critère inconnu, une source de règle
ambiguë et toute politique locale dont le SHA-256 a dérivé. Le plan et le bundle
passent en `2.0.0`, car ces preuves et le protocole sont désormais obligatoires.

Le bundle expose chaque question avec son mode, ses sources et deux résultats
séparés : `deterministic_outcome` et `human_outcome`. Les quatre critères
mécaniques et la partie mécanique du critère hybride doivent être `pass` ; la
hiérarchie, la lisibilité finale du retour d'erreur et la fidélité sémantique
restent `pending`. Tant qu'un de ces jugements humains manque, la politique
interdit le statut `approved`.

Il n'existe toujours ni moyenne, ni note sur 100, ni appel réseau, ni client JEV
et ni décision automatique de fusion. Cet incrément construit la baseline dont
un futur évaluateur devra démontrer qu'il améliore le coût ou la cohérence.
L'étape suivante n'est pas d'ajouter un modèle : elle consiste à faire appliquer
ce protocole humain au premier couple, conserver le résultat comme vérité de
comparaison, puis n'ajouter que des états dont l'équivalence métier est établie.

## Références officielles

- [JEV — API de décision](https://jev-ai.org/docs/)
- [JEV — contrat des décisions](https://jev-ai.org/docs/decisions/)
- [JEV — modèles et limites de contexte](https://jev-ai.org/docs/models/)
- [Figma MCP — introduction](https://developers.figma.com/docs/figma-mcp-server/)
- [Figma — le serveur fournit du contexte, pas du code de production](https://developers.figma.com/docs/figma-mcp-server/server-returning-web-code/)
- [Figma — structurer un fichier pour une meilleure traduction](https://developers.figma.com/docs/figma-mcp-server/structure-figma-file/)
- [Playwright — comparaisons visuelles](https://playwright.dev/docs/test-snapshots)
- [Playwright — snapshots d'accessibilité](https://playwright.dev/docs/aria-snapshots)
- [Angular — développer avec l'IA](https://angular.dev/ai/develop-with-ai)
- [Angular — style guide](https://angular.dev/style-guide)
- [Angular — Agent Skills officielles](https://angular.dev/ai/agent-skills)
- [Angular — versions et releases](https://angular.dev/reference/releases)
- [Angular — Web Codegen Scorer archivé](https://github.com/angular/web-codegen-scorer)
- [ADR-0077 — UI Angular officielle avant custom](../adr/0077-ui-angular-officielle-avant-custom.md)
- [ADR-0039 — frontière conception/réalisation LLM](../adr/0039-frontiere-contractuelle-conception-realisation-llm.md)
- [ADR-0066 — preuve de présentation bornée](../adr/0066-preuve-presentation-bornee-pour-realisation-llm.md)
- [ADR-0079 — JEV en replay/shadow](../adr/0079-jev-evaluateur-probabiliste-replay-shadow.md)
- [ADR-0080 — valeur avant automatisation](../adr/0080-prouver-la-valeur-avant-nouvelle-automatisation.md)
