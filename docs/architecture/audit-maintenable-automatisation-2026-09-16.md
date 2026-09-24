# Audit de maintenabilité — automatisation de création et d'ajout de bibliothèques

- **Date :** 2026-09-16
- **Statut :** audit Staff terminé ; SIMPL-1…6 implémentés ; SIMPL-7 engagé
- **Périmètre :** `create-app`, `add-library`, `create-module` et leurs gates CI
- **Question :** le socle limite-t-il l'action humaine sans devenir opaque,
  incompréhensible ou trop coûteux à maintenir ?

## Verdict exécutif

Le socle protège correctement des risques réels : écrasement de fichiers,
exécution de schematics tiers, dérive du lockfile, publication interrompue et
sortie non compilable. Ces garanties ne doivent pas être supprimées en bloc.

En revanche, le parcours `add-library` mélange deux opérations de risques très
différents :

1. **qualifier** une nouvelle bibliothèque, une nouvelle version ou une nouvelle
   recette potentiellement hostile ;
2. **appliquer** à une app une recette déjà qualifiée et approuvée.

Le chemin courant fait payer au second cas presque toute la complexité du
premier. C'est la cause principale du coût de maintenance et de CI. La
plateforme est sûre, mais sa frontière d'abstraction n'est pas au bon endroit.

Décision de cet audit :

- conserver les preuves profondes dans une **voie de qualification rare** ;
- construire une **voie d'application courante déterministe et lisible** ;
- retirer la voie LLM d'installation, aujourd'hui sans consommateur réel ;
- ne plus exécuter les validations profondes de bibliothèques sur une PR sans
  impact ;
- soumettre `list-query` 2.0 et toute nouvelle automatisation au budget de
  complexité défini dans ce document.

Ce verdict ne demande pas de réécrire immédiatement tout le socle. Il interdit
en revanche de l'étendre dans sa forme actuelle.

## Objectif corrigé

L'objectif n'est pas « automatiser tout ce qui est techniquement automatisable
». Il est :

> produire avec peu d'actions humaines du code Angular/Nx standard, lisible,
> modifiable et réparable sans dépendre de la connaissance du générateur.

La complexité nécessaire doit vivre dans une frontière stable. Elle ne doit ni
se répandre dans chaque commande, ni être rejouée sur chaque PR, ni rendre le
diagnostic dépendant de plusieurs machines d'états et d'empreintes opaques.

## Méthode et preuves

L'audit a inspecté les points d'entrée, leurs dépendances directes, les états
persistés, les contrats, les tests et le workflow CI. Les mesures sont
reproductibles avec `wc -l`, `git ls-files` et `rg` sur le commit de fusion de
la PR #69 (`eead028`).

### Volume observé

| Périmètre                                         |                                                                                  Mesure | Lecture                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------------: | ---------------------------------------------------------------------- |
| `create-app`                                      |                                 93 lignes de CLI + 359 de publication + 573 de renderer | taille encore maîtrisable ; sortie Angular standard                    |
| `create-module`                                   | 776 lignes de commande + 1 759 lignes de briques de transaction/configuration partagées | coût élevé, en partie justifié par les mutations racine et le rollback |
| `tools/library-setup/` hors tests et harnais E2E  |                                                                7 715 lignes, 18 modules | cœur de production disproportionné pour trois bibliothèques réelles    |
| tests `tools/library-setup/*.test.mjs`            |                                                               5 480 lignes, 17 fichiers | forte preuve, mais surface de changement très large                    |
| commandes et checks racine liés aux bibliothèques |                                                                            1 037 lignes | deuxième couche d'orchestration autour du cœur                         |
| tests racine liés aux bibliothèques               |                                                                            1 679 lignes | duplication de niveaux de preuve à relire                              |
| contrats `conventions/libraries/`                 |                                                                   1 226 lignes, 11 JSON | plusieurs autorités à maintenir ensemble                               |
| ADR, plan runtime et documentation de conventions |                                                                            2 021 lignes | impossible à utiliser comme runbook humain quotidien                   |
| harnais E2E `create-app → add-library`            |                                                                              338 lignes | preuve utile mais coûteuse                                             |

Le périmètre direct `add-library` représente donc **au moins 19 496 lignes** de
code, tests, contrats et documentation, sans compter l'app de qualification ni
toutes les fixtures. La suite expose au moins **183 tests ou sous-tests**.

Ce volume n'est pas mauvais par nature. Il devient un problème parce que trois
bibliothèques réelles seulement sont gouvernées : Transloco, Angular Material et
Tailwind.

### Coût CI observé

Sur la PR #69, sans modification fonctionnelle du système de bibliothèques :

| Job                                                      |                     Durée |
| -------------------------------------------------------- | ------------------------: |
| `Library integration (create-app → Material → Tailwind)` |                2 min 58 s |
| isolation Linux                                          |                      57 s |
| isolation macOS                                          |                      32 s |
| `Garde-fous socle`                                       |                5 min 36 s |
| pipeline complet, 17 jobs                                | environ 6 min 33 s de mur |

Les trois jobs dédiés aux bibliothèques consomment à eux seuls environ **4 min
27 s de calcul** à chaque PR. Ils n'ont aucun filtre d'impact. Le check
structurel `check:library-setup` tourne en plus dans `Garde-fous socle`.

La réduction récente du corpus SEOS à 13 s sur une PR sans impact démontre que
la stratégie correcte existe déjà dans le dépôt : contexte bloquant toujours
présent, contrôle rapide toujours exécuté, preuve profonde conditionnée par les
fichiers réellement touchés et rejouée périodiquement.

## Cartographie du parcours actuel

```text
application-design
       │
       ▼
create-app
  plan SHA → candidat → ngc → publication → build + lint
       │
       ▼
commit humain obligatoire
       │
       ▼
add-library (9 étapes)
  préconditions
  → contrats + matrice exacte
  → matérialisation complète du tree Git
  → résolution Bun confinée
  → schematic/script/LLM confiné
  → preuves ngc/build/CSS/Chromium
  → plan + change-set + empreintes
  → commit candidat + journal de publication Git
  → synchronisation node_modules du dépôt réel
       │
       ▼
create-module
  journal → génération → mutation config racine
  → bun install → gates globales → build/lint → gel lockfile
```

Le diagnostic d'un échec `add-library` peut traverser :

- les 9 étapes visibles ;
- le bail candidat à 5 états ;
- le journal de publication à 5 phases ;
- l'état `candidate` ou `verified` de la matrice ;
- le manifeste `.cmz/libraries.json` de l'app ;
- éventuellement le journal LLM ;
- les profils de sandbox `resolution`, `execution` et `renderer` ;
- la synchronisation finale du `node_modules` réel.

Chaque mécanisme est défendable isolément. Leur présence simultanée dans le
chemin courant dépasse cependant ce qu'un développeur doit comprendre pour
ajouter une bibliothèque déjà approuvée.

## Analyse par commande

### 1. `create-app` — conserver, simplifier l'expérience

**Forces**

- crée uniquement un nouveau répertoire ; aucun écrasement silencieux ;
- valide le design et ses dépendances avant écriture ;
- génère du code Angular/PWA ordinaire ;
- vérifie `ngc`, build et lint ;
- sait reprendre un arbre déjà publié uniquement s'il est identique.

**Coût accidentel**

- le chemin nominal exige deux invocations : `--dry-run`, puis
  `--apply <plan_id>` ;
- le hash est utile à l'audit mais devient une action humaine obligatoire pour
  une opération additive déjà protégée contre l'écrasement ;
- le message d'échec n'expose pas un résumé structuré des fichiers et de la
  commande de reprise.

**Cible**

- une seule commande nominale applique le plan fraîchement calculé ;
- `--dry-run` reste facultatif pour une revue préalable ;
- `--expect-plan` reste disponible pour les usages CI sensibles ;
- la sortie affiche : phase, fichiers créés, validations exécutées et action de
  reprise éventuelle.

### 2. `add-library` — séparer qualification et application

**Forces**

- ferme réellement l'exécution de code tiers ;
- prouve l'intégrité du lockfile et des dépendances ;
- teste compilation, build, CSS et coexistence navigateur ;
- protège les interruptions de publication et les écritures concurrentes ;
- ne publie qu'un état déjà vérifié.

**Complexité accidentelle**

- une bibliothèque déjà qualifiée repasse par un workspace complet, le
  confinement OS et les preuves de qualification ;
- toutes les sources non-test de `tools/library-setup/` entrent dans une seule
  empreinte de runner : un correctif de lint sans effet fonctionnel a déjà
  périmé les trois matrices et forcé leur requalification ;
- le chemin LLM représente 652 lignes de production et 611 lignes de tests,
  alors qu'aucune recette réelle n'utilise `llm-then-verified` et qu'aucun
  adaptateur fournisseur n'est livré ;
- la documentation opérationnelle est dispersée entre trois ADR, un plan de 1
  019 lignes, les recettes et les schémas ;
- les preuves profondes tournent sur toutes les PR, même sans impact.

**Cible à deux voies**

| Voie          | Quand                                                        | Garanties                                                                                                                    |
| ------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| qualification | nouvelle bibliothèque, version, recette, oracle ou politique | candidat complet, sandbox, preuves runtime, navigateur, promotion humaine                                                    |
| application   | piste déjà qualifiée et inchangée                            | transformations déterministes possédées par la plateforme, installation sans scripts, build/lint/test de l'app, diff lisible |

La voie d'application ne doit lancer ni LLM, ni code vendeur, ni navigateur. La
qualification doit produire un adaptateur ou change-set déterministe versionné,
relu et rejouable. L'application de cet artefact ne requiert alors plus une
frontière de menace équivalente à celle d'un schematic inconnu.

### 3. `create-module` — conserver le rollback, réduire la portée

**Forces**

- possède explicitement sa sortie et refuse tout écrasement ;
- protège les cinq fichiers racine qu'il peut modifier ;
- rollback automatique et reprise après interruption ;
- code généré standard, buildable et lintable hors du générateur ;
- cycle création/retrait prouvé.

**Coût accidentel**

- la création dépend de modules nommés `retire-module-*`, ce qui rend la lecture
  conceptuellement trompeuse ;
- la commande exécute des contrôles globaux déjà rejoués en CI, alors que le
  risque immédiat porte surtout sur les projets créés et les cinq fichiers
  modifiés ;
- `bun install` puis `bun install --frozen-lockfile` sont tous deux dans le
  parcours nominal ;
- le journal stocke beaucoup de représentations et d'empreintes que seul le code
  sait interpréter.

**Cible**

- conserver un journal unique et les trois états actuels tant que la commande
  modifie la configuration racine ;
- renommer/extracter les primitives réellement communes sous un vocabulaire
  `workspace-transaction`, sans créer un framework générique avant un second
  consommateur prouvé ;
- limiter les validations locales aux sorties et fichiers touchés ; laisser les
  contrôles globaux à la CI ;
- ajouter un diagnostic `--explain <module>` lisible avant toute refonte de la
  transaction ;
- ne pas étendre cette commande pour `list-query` 2.0 avant stabilisation de son
  contrat.

## Classification des mécanismes

### Indispensables dans le chemin courant

- validation fermée des entrées et chemins ;
- refus d'écrasement et préconditions sur les fichiers modifiés ;
- versions exactes via catalog et lockfile ;
- `bun install --ignore-scripts` ;
- génération de code Angular/Nx standard ;
- build, lint et tests ciblés ;
- diff final lisible ;
- rollback automatique des fichiers que la commande possède ;
- messages indiquant phase, cible et reprise.

### À réserver à la qualification rare

- matérialisation du tree Git complet ;
- double backend de confinement macOS/Docker ;
- exécution d'un schematic ou script tiers ;
- navigateur Chromium épinglé et preuve de coexistence CSS ;
- matrice `candidate → verified` ;
- promotion et attestation du vecteur exact d'outillage ;
- suites adversariales complètes ;
- tests de durabilité multi-filesystem.

### À simplifier ou découpler

- empreinte globale de tout `tools/library-setup/` ;
- handshake obligatoire `dry-run → plan hash → apply` de `create-app` ;
- gates globales dans `create-module` ;
- documentation opérationnelle dispersée ;
- validations profondes exécutées sur toute PR.

### À retirer

- `llm-then-verified` et son runner tant qu'aucune recette et aucun fournisseur
  réels ne l'utilisent ;
- toute nouvelle abstraction générique créée seulement pour un futur possible ;
- tout oracle dupliqué qui n'apporte pas une classe de panne distincte.

## Budget de complexité obligatoire

Ce budget s'applique à `list-query` 2.0, `action-request` 2.0, au futur
`page-execution-plan` et aux commandes de workspace.

| Axe               | Budget                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| interface humaine | une commande nominale ; `--dry-run` facultatif ; reprise automatique avant commande manuelle                                   |
| étapes nominales  | quatre phases visibles maximum : vérifier, appliquer, valider, finaliser                                                       |
| état persistant   | un journal maximum par commande ; aucun état si l'opération est purement additive et atomique                                  |
| autorités         | une source canonique par contrat ; toute projection est générée ou vérifiée                                                    |
| code produit      | Angular/Nx standard ; aucun runtime propriétaire requis pour fonctionner                                                       |
| diagnostic        | toute erreur nomme la phase, la cible, la cause et l'action sûre suivante                                                      |
| exécution tierce  | interdite dans la voie courante ; confinée dans une voie de qualification explicite                                            |
| CI                | contrôle rapide toujours présent ; preuve profonde seulement si sa surface de risque change, plus nightly                      |
| extension         | pas de DSL, schéma ou machine d'états supplémentaire sans cas réel et ADR                                                      |
| taille            | au-delà de 1 000 lignes ou 5 modules de production pour une nouvelle capacité, revue de simplification obligatoire avant merge |

Les nombres ne sont pas des objectifs à contourner en découpant artificiellement
les fichiers. Ce sont des seuils de revue : au-delà, l'auteur doit démontrer que
la complexité correspond à une menace ou un besoin actuel, pas hypothétique.

## Plan d'exécution ordonné

### SIMPL-1 — CI proportionnelle à l'impact — P0, S

**Implémenté le 2026-09-16.** Les trois contextes requis conservent exactement
leurs noms et existent sur toute PR. Un sélecteur Node sans dépendance calcule
séparément l'impact `isolation` et `integration` depuis le diff Git ; une erreur
de diff échoue au lieu d'autoriser silencieusement un skip. Checkout et
sélection restent toujours exécutés, tandis que Bun, l'installation et les
preuves profondes sont conditionnés. Le contrat statique `check:library-setup`
reste toujours bloquant dans `Garde-fous socle`.

La surface est fermée sur les fichiers unitaires de `create-app`, ouverte par
préfixe sur toute nouvelle recette, matrice ou source de `tools/library-setup/`,
et inclut les versions (`package.json`, `bun.lock`), la politique, la
configuration Nx/TypeScript/formatage et les deux workflows qui portent cette
décision. Une matrice Linux/macOS et l'E2E complet sont ajoutés au nightly
existant sans condition d'impact. Deux suites machine vérifient le classifieur
et la structure des workflows ; retirer une condition, un contexte, un profil,
le déclenchement manuel/nightly ou une entrée déclarée les fait échouer.

- garder les trois contextes GitHub stables ;
- ajouter un détecteur d'impact comme celui du corpus ;
- toujours exécuter les contrats rapides ;
- exécuter isolation et E2E profond seulement si changent : recettes, matrices,
  politique, `add-library`, `create-app`, runtime proofs, lockfile ou versions
  d'outillage concernées ;
- conserver une passe nightly profonde.

**Sortie :** une PR documentaire ou applicative sans impact bibliothèque ne
lance plus les trois preuves profondes ; une mutation ciblée les déclenche et un
test de politique tue les faux négatifs.

### SIMPL-2 — Retirer la voie LLM dormante — fait le 2026-09-16

- supprimer `llm-then-verified` du schéma ;
- supprimer runner, fixture et tests dédiés ;
- refuser explicitement toute ancienne recette de cette forme ;
- documenter qu'une réintroduction exige un fournisseur réel et un nouvel ADR.

**Sortie :** aucune recette valide ne référence la voie ; gates et CI vertes ;
réduction d'au moins 1 263 lignes de code/tests directs.

**Réalisation :** le troisième bras du schéma, le runner, sa fixture fournisseur
et sa suite dédiée ont été supprimés. Le cœur `add-library` ne possède plus de
paramètre, de branche, de sortie d'audit ni d'entrée de plan LLM. Une ancienne
recette est refusée par un diagnostic stable avant exécution, avec les deux
méthodes encore admises et les conditions de réintroduction. Les trois fichiers
directs supprimés représentaient **1 312 lignes**, au-delà du seuil de sortie.
Les pistes Angular Material, Tailwind et Transloco ont été repassées en
`candidate`, puis requalifiées une par une par le vrai parcours isolé et leurs
preuves runtime avant de retrouver `verified`.

### SIMPL-3 — Découpler l'empreinte de qualification — fait le 2026-09-16

- remplacer le hash global du dossier par la liste fermée des sources qui
  influencent réellement chaque preuve ;
- tester qu'un changement cosmétique ou un autre oracle ne périme pas une piste
  indépendante ;
- tester que toute source sémantique pertinente la périme encore.

**Réalisation :** l'empreinte globale de `tools/library-setup/` est remplacée
par un manifeste fermé et visible dans chaque attestation. Il combine les
sources communes de la qualification et les seules sources des oracles exigés
par la piste. Les implémentations Material, Tailwind, Transloco, build et
coexistence sont isolées par fichier ; changer l'oracle Transloco ne périme donc
plus Material. Une acceptance sans déclaration de sources échoue avant de
produire une preuve. Le schéma d'attestation `1.2.0` conserve le digest compact
`runner` et expose aussi chaque entrée de `runner_sources` avec son SHA-256 pour
la revue humaine.

Les tests prouvent les deux directions : une source hors exécution ou un oracle
étranger ne change pas le digest, tandis qu'une fixture propre ou une source
commune le change. Angular Material, Tailwind et Transloco ont ensuite été
repassés en `candidate` et requalifiés par leurs vrais builds et oracles isolés
avant de retrouver `verified`.

### SIMPL-4 — Séparer qualification et application — P0, L

- produire un adaptateur déterministe lors de la qualification ;
- appliquer cet adaptateur sans code tiers sur une app ;
- garder installation sans scripts, diff, build/lint/test ciblés et rollback ;
- mesurer le nombre de modules traversés, le temps et les erreurs avant/après.

**Sortie :** le chemin courant dépend d'au plus six modules de production et ne
lance ni sandbox, ni navigateur, ni promotion.

**Réalisation (2026-09-17) :** la promotion exécute encore la recette vendeuse
confinée, mais elle construit aussi un candidat distinct avec l'adaptateur
plateforme et fait porter les preuves runtime sur cette sortie réellement
consommée. L'attestation `1.3.0` lie l'adaptateur, ses entrées et le change-set
observé. Les trois pistes ont été requalifiées par leurs vrais oracles Angular
22 avant de redevenir `verified`.

La CLI courante traverse exactement **3 modules de production** (test statique
fail-closed), contre au moins 18 auparavant. Elle ne charge ni recette, sandbox,
navigateur, runtime proof, ni promotion. Elle travaille dans un worktree Git
jetable, exécute une installation gelée sans scripts, puis les targets
build/lint/test de l'app et ne publie que son diff par fast-forward. Un échec
avant publication laisse la branche et le worktree principal intacts.

Mesure comparable du harnais `create-app → Material → Tailwind` sur la même
machine : **2 min 58 s avant**, **1 min 44 s après**, soit environ **42 %** de
temps mur en moins. Le chemin après séparation exécute pourtant trois checks
ciblés par ajout. Les diagnostics visibles passent de 9 phases mêlant deux
niveaux de risque à 8 phases linéaires, dont aucune ne concerne un sandbox, un
navigateur ou une promotion.

### SIMPL-5 — Rendre les commandes explicables — fait le 2026-09-17

`create-app`, `add-library` et `create-module` acceptent désormais `--explain`
seul. La commande imprime un contrat JSON fermé `1.0.0` sans demander les
arguments nominaux, sans inspecter le workspace et sans écrire. Une source de
vérité commune décrit pour chaque commande : invocations, fichiers créés,
modifiés, protégés et temporaires, phases ordonnées, checks, journal, verrou et
stratégie de reprise ou d'abandon.

La gate `check:command-explanations`, câblée directement dans la CI et dans
`check:all`, exécute les trois CLI depuis un dossier vide, exige la sortie
déterministe issue de cette source versionnée, vérifie l'absence d'effet de
bord, le schéma fermé, les phases et la cohérence de la reprise. Le
[runbook humain](./runbook-commandes-creation.md) couvre les trois parcours en
138 lignes ; un test bloque tout dépassement de 200 lignes.

### SIMPL-6 — Simplifier `create-app` et borner `create-module` — fait le 2026-09-17

`create-app` publie désormais directement dans sa voie nominale. `--dry-run`
reste disponible sans écriture et `--expect-plan <plan_id>` permet d'imposer la
fraîcheur d'un plan préalablement relu ; l'ancien détour obligatoire par
`--apply` est rejeté explicitement. Le résultat nominal est un JSON fermé qui
expose statut, phase finale, plan, sortie, fichiers, validations et reprise.

Les primitives de verrouillage et d'identité Git partagées sont extraites dans
`workspace-transaction.mjs`. Le chemin historique du verrou reste inchangé afin
de préserver la reprise des transactions interrompues. Les modules communs de
configuration, plan et graphe portent désormais le vocabulaire neutre
`module-lifecycle-*` ; `create-module` ne dépend plus d'un fichier nommé pour le
retrait.

Le chemin nominal de `create-module` installe une seule fois avec
`--ignore-scripts`, puis limite build, lint et Prettier aux projets et fichiers
créés. Les audits globaux de noms, targets et dépendances ne sont plus répétés
localement : un test fail-closed prouve qu'ils restent des steps directes et
bloquantes de la CI. Les états durables `planned`, `generated`, `configured`, le
rollback et les reprises `--resume` / `--abort` sont conservés. Les deux
commandes respectent désormais un budget de quatre phases visibles.

### SIMPL-7 — Appliquer le budget aux compositions v2 — P0, continu

Précondition opérationnelle soldée le 2026-09-22 : le Nightly ne scanne plus
implicitement tout le dépôt avec Tailwind. Le CSS de production est borné aux
`@source` applicatifs explicites, l'oracle de coexistence Material/Tailwind crée
et nettoie sa sonde dans la source avant compilation, et les deux pistes ont été
requalifiées. Le run GitHub Actions `35741801394` est vert sur ses quatre jobs.
Cette correction préserve la séparation décidée par l'audit : le build courant
reste simple ; les preuves navigateur et d'isolation restent dans la
qualification rare et le Nightly.

La conception de `list-query` 2.0 commence par le contrat backend et son
migrateur. Elle ne doit pas répliquer le modèle `add-library` : pas de nouveau
framework transactionnel, pas de voie LLM, pas de preuve profonde sur PR sans
impact, pas de runtime propriétaire dans le code généré.

Premier incrément engagé le 2026-09-22 : schéma fermé `list-query` `2.0.0`,
référence content-addressed au `backend-contract`, mapping DTO → read model et
politiques d'exécution explicites. Le migrateur v1 → v2 est une transformation
pure à une commande, idempotente, sans journal et sans écrasement ; il bloque
sur toute décision absente ou divergence avec l'autorité backend. Ce lot ne
promet pas encore de runtime v2 : compilation, adaptateur host et oracles des
deux cas actifs restent les prochains incréments.

Mesure avant review : **1 830 lignes ajoutées au total**, dont **858 lignes de
production contractuelle** (`core` 467 + CLI 181 + schéma 210) réparties sur
deux modules exécutables. Le lot reste donc sous le seuil SIMPL de 1 000 lignes
ou cinq modules de production ; les 972 autres lignes sont les fixtures
avant/décisions/backend/après, les tests mutants et la documentation de
décision. Cette mesure devra être recalculée à chaque incrément v2.

Deuxième incrément engagé le 2026-09-22 : la v2 compile désormais vers un modèle
d'exécution interne target-neutral qui sépare port, transport, DTO wire,
décodage strict, read model, contrôleur et échecs. La migration appelle ce
compilateur avant écriture ; il ne reste donc pas un outil dormant. La surface
de production v2 cumulée atteint **1 233 lignes** et déclenche la revue de
simplification exigée par le budget. ADR-0048 conserve trois modules et un
schéma, refuse paramètres et modèles imbriqués faute de second cas réel, et
n'ajoute ni CLI, ni renderer, ni journal, ni runtime framework.

Troisième incrément engagé le 2026-09-23 : le renderer Angular est exécuté par
un oracle natif contre le vrai `ResourceFacade` et les vrais intercepteurs
d'authentification, d'erreur et de cache du backoffice. Le cas actif
`site-group-select` prouve le mapping DTO wire → read model, le décodage strict,
les six états, le reload avec bypass cache, la conservation des données après un
échec et l'annulation latest-wins. Une deuxième query publique prouve qu'aucun
Bearer n'est envoyé. Le renderer refuse tout type ou politique sans oracle au
lieu d'annoncer une généralité hypothétique.

La mesure cumulée atteint **1 840 lignes de production**, sept modules
exécutables et un schéma. ADR-0049 consigne la revue obligatoire : aucun runtime
propriétaire, CLI, journal ou état persistant supplémentaire ; les sorties
Angular restent éphémères et compilées. `list-query` reste `experimental` :
paramètres et modèles imbriqués, parité React, publication durable et
réalisation de page restent à prouver.

Quatrième incrément livré le 2026-09-23 : le second cas actif
`tasks-actions-processing-type` ouvre uniquement la forme réellement observée :
un binding `reportUniqId → path:id`, chaîne obligatoire non vide et encodée
comme un segment, ainsi qu'un tableau non nullable de chaînes bornées à
`mtn|orange|moov`. Le modèle d'exécution passe en `1.1.0`. Les paramètres
query/header, plusieurs paths, paramètres optionnels, tableaux ouverts,
récursifs ou d'objets restent refusés.

L'oracle Angular natif vérifie URL encodée, Bearer et cache du host, mapping du
tableau, rejet d'un opérateur inconnu, rejet avant HTTP d'un identifiant vide,
reload et annulation latest-wins lors d'un changement d'identifiant. La surface
v2 cumulée mesurée sur le même périmètre atteint **2 231 lignes de production**
(+391) ; le validateur backend existant reçoit +9 lignes nettes et aucun module,
schéma, CLI ou runtime supplémentaire n'est créé. ADR-0050 consigne la revue.
À ce stade restaient la décision/parité React, la publication durable et la
réalisation de page composée.

Cinquième incrément engagé le 2026-09-23 : les deux cas actifs et la query
publique sont désormais rendus et exécutés sous React 19 depuis le même modèle
compilé. Faute de host React réel dans le dépôt, le client généré délègue URL,
authentification, cache et transport à un port hôte explicite ; il ne crée ni
intercepteur, ni token, ni cache parallèle. Les hooks générés prouvent les six
états, le reload, la conservation des données, les erreurs métier et HTTP,
l'annulation latest-wins et l'annulation au démontage.

L'arrivée du second renderer justifie seulement maintenant l'extraction des
modèles, du décodeur, du path et des validations fail-closed dans un module
target-neutral. Les cycles de vie restent propres à Angular et React. La
surface v2 cumulée atteint **2 649 lignes de production** (+418 nettes) et neuf
modules exécutables ; aucun schéma, CLI, journal, cache ou runtime propriétaire
n'est ajouté. ADR-0051 consigne la décision et la revue. `list-query` v2 reste
`experimental` : restent la publication durable, puis la réalisation d'une
page composée N `list-query` + N `action-request`.

Sixième incrément engagé le 2026-09-23 : la sortie v2 existante est désormais
publiée par l'unique commande `generate:list-query` et le moteur transactionnel
historique. Le schéma auteur sélectionne explicitement le chemin v1 ou v2 ; le
control plane v2 persiste le vrai modèle d'exécution et son plan, jamais un IR
v1 factice. Les deux cibles partagent le même hash d'entrée et de plan, puis
reçoivent leurs manifests d'ownership et de contenu.

Le type-check de publication résout maintenant les alias officiels du
`tsconfig.base.json`, ce qui vérifie les vrais ports Angular sans alias privé et
refuse toujours une dépendance inconnue. Une évolution exige le change-set exact
d'un dry-run ; verrou, journal, rollback, reprise et limites APFS/ext4 restent
ceux d'ADR-0035. L'incrément ajoute **210 lignes nettes de production** sans
nouveau module exécutable, schéma, CLI, journal ou runtime ; la surface v2
cumulée atteint **2 859 lignes**. ADR-0052 consigne la décision. Reste la page
composée N `list-query` + N `action-request` ; la capacité reste
`experimental`.

Septième incrément engagé le 2026-09-23 : `action-request` v2 possède désormais
sa frontière auteur fermée et son migrateur v1 → v2. Comme `list-query` v2, la
définition référence le `backend-contract` par identité, version et SHA-256 au
lieu de redéclarer transport, accès, auth, enveloppe et DTO. Concurrence, retry,
idempotence, invalidation et effet local post-succès deviennent des décisions
explicites ; retry manuel et parallélisme sont refusés sans idempotence host.

La migration `support` est exacte, déterministe, idempotente et sans
écrasement. Une seconde preuve confronte directement le contrat au cas Angular
actif `forgot-password`, à ses sources, DTO, enveloppe et `SKIP_AUTH`, tout en
distinguant honnêtement « client implémenté » de « serveur vérifié live ».
L'incrément représente **1 141 lignes de production contractuelle**, deux
modules exécutables et un schéma ; ADR-0053 consigne la revue SIMPL obligatoire.
Il n'ajoute ni renderer, runtime, cache, journal, verrou, LLM ou publication.
`action-request` v2 reste donc `experimental`. Les prochains lots sont son
compilateur neutre, son host/oracle Angular, la parité React et sa publication ;
le `page-execution-plan` ne commence qu'après ces contrats runtime stabilisés.

Huitième incrément engagé le 2026-09-24 : `action-request` v2 compile désormais
la définition et les octets backend exacts vers un modèle d'exécution neutre.
Le modèle sépare port métier, payload wire, transport, réponse wire, résultat,
authentification, contrôleur et échecs. L'accès public résout l'authentification
à `omit` ; les accès protégés conservent les schémas exacts fournis par le host.

La réussite distante est une frontière de commit : un effet local qui échoue
ensuite produit `committed-with-local-error`, autorise uniquement
`retry-post-success` et interdit de rejouer la mutation distante. La migration
compile désormais avant d'écrire. La surface v2 atteint **1 777 lignes de
production** (+636), trois modules exécutables et un schéma. ADR-0054 consigne
la revue obligatoire ; aucun renderer, runtime, nouveau CLI, journal, lock,
cache ou modèle persistant n'est ajouté. Restent le host/oracle Angular, la
parité React et la publication durable avant le plan composé.

Neuvième incrément engagé le 2026-09-24 : `forgot-password` traverse désormais
le modèle neutre, un renderer Angular borné et le runtime réel du host. Les six
artefacts générés sont formatés, type-checkés et exécutés sous Angular 22 avec
`TestBed`, `HttpTestingController`, les intercepteurs auth/erreur et les tokens
publics du workspace. La validation précède HTTP, l'action publique omet le
Bearer, le payload et la réponse sont stricts, et le contrôleur refuse une
double soumission sans perturber la commande active.

La surface v2 atteint **2 436 lignes de production** (+659 en comptant les 25
lignes nettes du catalogue/schema d'artefacts), six modules exécutables et le
schéma auteur. ADR-0055 consigne la revue : aucun runtime, CLI, journal, verrou,
cache ou format persistant supplémentaire ; la sortie reste du code Angular
ordinaire et l'oracle est éphémère. Toutes les formes non requises par le cas
actif échouent fermées. Restent la parité React et la publication durable avant
le `page-execution-plan` N×N.

Dixième incrément engagé le 2026-09-24 : `action-request` v2 possède désormais
une cible React issue du même modèle compilé et du même plan qu'Angular. Faute
de host React réel dans le dépôt, le client délègue transport, URL et
authentification à un port explicite. Le hook React réel prouve validation avant
transport, payload et réponse stricts, résultat, erreurs, statut exact et rejet
de la double soumission.

Une mutation n'est volontairement pas présentée comme annulable au démontage :
le hook cesse seulement ses mises à jour React et laisse la promesse retourner
le résultat au caller. L'arrivée du second renderer extrait modèles, validation,
décodage et garde fail-closed, mais pas les lifecycles ni les transports. La
surface v2 atteint **2 792 lignes de production** (+356 nettes), huit modules
exécutables et un schéma. ADR-0056 consigne la revue ; aucun runtime, schéma,
CLI, journal, verrou ou cache supplémentaire n'est ajouté. Reste la publication
durable avant le `page-execution-plan` N×N.

## Ce qui n'est pas décidé par cet audit

- aucune garantie de sécurité existante n'est supprimée avant son remplacement
  prouvé ;
- ADR-0042 reste applicable à l'implémentation actuelle jusqu'à livraison de la
  séparation des voies ;
- les seuils de budget n'imposent pas une réécriture totale préalable au travail
  produit ;
- `list-query` v1 et `action-request` v1 restent `experimental` ;
- la suppression du corpus SEOS n'est pas couverte ici.

## Critère de réussite global

Un développeur qui ne connaît pas le générateur doit pouvoir :

1. prédire les fichiers qui vont changer ;
2. lancer une seule commande nominale ;
3. lire le diff comme du code Angular/Nx ordinaire ;
4. comprendre un échec depuis le message et un runbook court ;
5. corriger manuellement la sortie sans rendre l'application dépendante du
   générateur ;
6. réserver les mécanismes de sécurité lourds aux moments où du code ou une
   configuration non encore approuvés entrent réellement dans le système.

La plateforme sera alors solide **et** habitable par des humains.
