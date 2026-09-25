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

Onzième incrément engagé le 2026-09-24 : `action-request` v2 est désormais
publié par l'unique commande `generate:action-request` et les primitives
transactionnelles existantes. La sélection v1/v2 repose sur le
`schema_version`; la v2 persiste son vrai modèle d'exécution et son plan, puis
matérialise Angular et React avec le même hash d'entrée. Les sorties v1 plates
et en couches restent inchangées ; les cibles v2 en couches échouent fermées.

La preuve disque couvre création, stabilité exacte de 14 artefacts, dry-run
sans écriture et application d'une évolution par son identifiant relu. La
définition est lue une seule fois, ce qui évite une divergence entre détection
de version et compilation. L'incrément ajoute **67 lignes nettes de production**
dans deux modules existants ; la surface v2 atteint **2 859 lignes**. ADR-0057
consigne la revue : aucun module, schéma, CLI, renderer, runtime, journal,
verrou, cache ou abstraction de commandes supplémentaire. Le prochain travail
est le `page-execution-plan` et son composition root N×N.

Douzième incrément engagé le 2026-09-24 : le premier lot C2 compile un
`page-execution-plan` target-neutral depuis le contrat de page et les modèles
v2 content-addressed. Chaque query et commande devient une instance stable avec
son état local, ses inputs typés et sa primitive exacte. Chaque sortie nomme son
`producer_node_id` ; une référence par opération ambiguë échoue fermée. L'union
canonique des capacités fournit la future négociation avec le host.

La preuve assemble deux queries réelles, dont une paramétrée, et une commande
réelle. Elle couvre aussi replay indépendant, hash périmé, primitive absente,
accès insuffisant, producteur ambigu et invalidation inexprimable. Le lot ajoute
**1 141 lignes de production contractuelle** : un cœur de 749 lignes et un
schéma de 392 lignes. ADR-0058 consigne la revue obligatoire. Aucun CLI,
publisher, renderer, runtime, cache, journal, verrou ou dépendance n'est ajouté.
Reste à générer le composition root puis à observer les deux GET et le POST dans
un même host hermétique.

Treizième incrément engagé le 2026-09-24 : C3 matérialise une cible Angular
depuis le `page-execution-plan`. Chaque nœud réutilise son renderer v2 dans un
répertoire isolé ; le composition root ajoute seulement un service de page, ses
providers et son API publique. Les bindings host sont fermés, les capacités
sont négociées contre une allowlist indépendante et toutes les références sont
relues avec leurs SHA-256 avant le type-check strict.

La commande `generate:page-composition` réutilise sans variante le publisher
transactionnel existant. Le lot ajoute **654 lignes de production
contractuelle**, sans nouveau runtime, transport, cache, journal, verrou ou
publisher. ADR-0059 porte la revue de simplification. C4 reste le prochain
incrément : oracle externe hermétique observant réellement deux GET et un POST.

Quatorzième incrément engagé le 2026-09-24 : C4 instancie exactement la sortie
C3 depuis un spec Angular externe. Le host réel fournit DI, `HttpClient` et les
intercepteurs auth/erreur/cache ; seul le backend réseau est remplacé par
`HttpTestingController`, sans socket ni secret. Cinq scénarios observent deux
GET et un POST, l'isolation d'une panne partielle, le retry ciblé, les
annulations `latest-wins` et à la destruction, ainsi que le rejet du double
submit sans invalidation cachée.

Le lot ajoute **zéro ligne de runtime de production**. La fixture C3 volumineuse
a seulement été déplacée vers un support de test partagé ; le raccord reste
dans le préparateur de tests natifs existant. Aucun transport, orchestrateur,
cache, schéma, publisher, journal, verrou ou dépendance n'est ajouté. ADR-0060
porte la revue. Les politiques positives encore fermées ne sont pas simulées :
C5 reste le vertical slice représentatif, puis C6 la promotion humaine.

Quinzième incrément C5 engagé le 2026-09-25 : une demande libre d'utilisateur
externe a été figée avant toute consultation du corpus, puis comparée à la vraie
gestion des utilisateurs SEOS. L'utilisateur a retenu la reproduction exacte du
cas historique : deux queries (`users-list`, `profiles-select`) et une commande
(`create-user`), avec pagination, filtres, permission, notification et
invalidation ciblée. Une première baseline Angular exécutable traverse les
vraies couches domain/data/application et observe le HTTP via le seul mock
réseau. Ses trois scénarios couvrent GET paginé et mapping, POST réussi suivi du
rechargement exact, puis POST en échec sans rechargement ni perte de liste.

Ce lot ne prétend pas encore réaliser C5 : il ajoute **zéro ligne de runtime de
production** et rend mesurables les écarts à fermer. `list-query` v2 doit encore
porter pagination et query parameters ; le plan doit exprimer l'invalidation
positive nommée ; l'oracle UI doit prouver fermeture/conservation du formulaire,
permission et accessibilité. L'erreur « email déjà existant » reste non typée
tant qu'aucune enveloppe backend stable n'est observée. Détails :
[`c5-entree-externe-gestion-utilisateurs-2026-09-25.md`](./c5-entree-externe-gestion-utilisateurs-2026-09-25.md).

Seizième incrément C5b engagé le 2026-09-25 : `list-query` v2 compile désormais
les cinq query parameters du cas utilisateurs (`string`, `integer`, `boolean`,
requis ou facultatifs) et un résultat page. Le modèle neutre passe en `1.2.0` et
sépare les noms wire de quatre rôles canoniques (`currentPage`, `lastPage`,
`pageSize`, `totalItems`). La fixture SEOS conserve ses noms observés ; une
mutation de type Spring Data prouve que le noyau ne contient aucun branchement
Laravel, Spring, .NET ou Django. Les formes non requises restent refusées.

« Liste » reste un rôle métier, pas une hypothèse de sérialisation. Le modèle
d'exécution distingue le tableau direct de la page. Les objets conteneurs, maps
ou projections voisines devront ajouter une variante explicite à partir d'un
cas réel ; aucun objet n'est deviné comme collection via son nom ou son backend.

Contre-exemple réel conservé : `requests-details` retourne un objet unique sous
`SimpleResponseDto<RequestsDetailsItemApiDto>` et le mappe vers un seul
`RequestsDetailsEntity`. Ce GET est une lecture à cardinalité `one`, pas une
liste. Avant toute implémentation, QUERY-1 devra comparer une généralisation
`read-query` (`one`, `many`, `page`) à un profil `detail-query` mince, avec la
contrainte de réutiliser le transport, le cache, les erreurs et le contrôleur
existants plutôt que créer une automatisation parallèle.

Le lot n'ajoute aucun runtime, transport, CLI, cache, journal, verrou ou
dépendance. Les renderers Angular et React rejettent explicitement la pagination
tant que leurs oracles dédiés ne l'exécutent pas. ADR-0061 consigne la décision.
L'invalidation positive et la composition C5 restent ouvertes.

Dix-septième incrément C5c engagé le 2026-09-25 : le renderer Angular exécute
désormais la page et les query parameters déjà compilés par C5b. La sortie
réutilise `HttpClient`, `HttpParams`, les intercepteurs du host et
`ResourceFacade`; aucun runtime paginé parallèle n'est introduit. Les
paramètres `string`, `integer` et `boolean` sont validés avant le réseau, les
optionnels absents sont omis et les noms wire restent issus du contrat.

Le résultat généré expose une page canonique et ses items. Les champs de page
non projetés sont tolérés, conformément au contrat C5 qui ne revendique qu'une
projection des métadonnées Laravel ; les items conservent en revanche leur
politique stricte de rejet des champs inconnus. Cette distinction est explicite
et testée, pas déduite du framework backend.

Un oracle Angular externe ajoute neuf scénarios sur le vrai host de test : URL
encodée, auth/cache, omission des filtres, mapping, état vide, rejet avant HTTP,
payload invalide avec chemin wire, reload avec donnée conservée et annulation
`latest-wins`. La suite Angular passe à 59/59. React reste fermé sur cette
capacité et son test de refus reste vert. Le lot ajoute zéro dépendance, cache,
orchestrateur, journal, publisher ou runtime partagé ; ADR-0062 porte la revue.
Restent la parité React, l'invalidation positive et la composition C5.

Dix-huitième incrément C5d engagé le 2026-09-25 : le renderer React exécute
désormais la même page et les mêmes paramètres query depuis le modèle neutre
C5b. Le client conserve le `ListQueryFetchPort` du host ; il valide et encode
les paramètres avant l'appel, puis transmet service, auth/cache, refresh et
signal d'annulation sans ajouter de transport privé.

Le hook expose page et items, conserve la dernière page pendant reload ou
erreur, réutilise le dernier input et maintient `latest-wins` via
`AbortController` et numéro de séquence. Les lignes de validation communes sont
rendues par un helper partagé ; sérialisation et cycle de vie restent propres à
chaque framework. Un oracle React natif ajoute neuf scénarios et porte la suite
à 53/53 ; la régression Angular reste à 59/59. Aucun runtime, cache,
orchestrateur, publisher ou dépendance n'est ajouté. ADR-0063 porte la revue.
Restent l'invalidation positive nommée puis la composition C5 complète.

Dix-neuvième incrément C5e engagé le 2026-09-25 : la conception nomme désormais
les `load` locaux invalidés par une action backend. Le planner confronte cette
déclaration à la politique `action-request` : `none` interdit les cibles,
`caller-declared` en exige au moins une, et toute cible doit résoudre une query
de la page. Le plan conserve les IDs triés et négocie la capacité
`action.invalidation.caller-declared@1`.

La composition Angular encapsule la façade de commande et recharge seulement
les queries nommées après succès distant. L'oracle externe prouve le bypass du
cache, l'absence de reload des autres queries, zéro reload après erreur et zéro
invalidation anticipée lors d'un double submit. La suite Angular passe à 61/61.
Le renderer autonome de commande reste fail-closed, car il n'a aucun caller
capable de résoudre les cibles. Zéro dépendance, runtime partagé, bus, store ou
cache parallèle n'est ajouté ; ADR-0064 porte la revue.

Une invalidation de query située hors de la page a été proposée puis séparée de
ce lot : elle reste une option à décider, pas un ordre d'implémentation. Elle
demanderait une identité de query et une politique de péremption au niveau
projet. Reste la composition C5 réelle
`users-list + profiles-select + create-user`, puis l'UI/a11y.

Vingtième incrément C5f engagé le 2026-09-25 : le composition root Angular
assemble maintenant les trois primitives utilisateurs réellement observées.
Deux contrats versionnés ajoutent la query `profiles-select` et la commande
authentifiée `create-user` à cinq champs, sans importer les classes SEOS. La
réponse directe `{ error, message }` reçoit une forme `status-object` fermée ;
un mutant avec un faux `data_field` est rejeté.

L'ancien oracle générique n'est pas remplacé. Un second oracle C5 traverse le
vrai host Angular et prouve les deux GET, l'auth Bearer, les mappings page et
tableau, le POST snake_case, le reload exclusif de `users-list` après succès,
zéro invalidation sur erreur/validation/double submit et l'annulation à la
destruction. La suite Angular passe à 67/67. Aucun transport, cache, bus,
runtime partagé ou dépendance n'est ajouté. Restent le composant visible, la
permission `create`, les notifications, la fermeture/conservation du formulaire
et l'accessibilité ; ADR-0065.

Vingt-et-unième incrément C5g-0/1 engagé le 2026-09-25 : la réalisation UI
reste déléguée au LLM sans introduire de renderer visuel universel. Un contrat
fermé `presentation-evidence` fige toute référence de présentation locale par
type, taille et SHA-256, la lie à une page et à ses états exacts, et lui impose
l'autorité `presentation-only` ainsi que le statut `untrusted-content`.

Le work order passe en `2.0.0` et incorpore la preuve ou l'absence explicite de
preuve dans son identité content-addressed. Préparation et vérification refusent
une preuve brouillon, étrangère, ambiguë, symbolique, modifiée ou mal typée.
Zéro adaptateur Figma, dépendance, runtime UI ou choix esthétique n'est ajouté.
Restent une référence visuelle C5 approuvée, la page Angular ordinaire,
l'oracle comportemental/a11y puis la comparaison visuelle ; ADR-0066.

Vingt-deuxième incrément C5g-2 engagé le 2026-09-25 : un audit pré-UI a montré
que le work order ne transportait pas le `page-execution-plan` produit et
prouvé en C5f. Une réalisation pouvait donc compiler tout en inventant son
raccord runtime.

Le work order passe en `3.0.0` et accepte un plan optionnel. Avant liaison, le
plan, le contrat publié et chaque primitive content-addressed sont relus sans
symlink, puis le plan est recompilé et comparé exactement. La vérification
rejoue la même preuve avant les oracles. Sans plan, l'absence est explicite et
interdit de revendiquer une intégration runtime générée. Zéro runtime,
dépendance ou abstraction UI n'est ajouté. Restent la publication C5 dans une
app de preuve, une référence visuelle approuvée, la page Angular, l'a11y et
l'oracle visuel ; ADR-0067.

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
