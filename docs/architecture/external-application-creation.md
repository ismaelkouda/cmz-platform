# Workspace et shells extérieurs — EXT-01, premier point de relecture

Ce changement vise les contrôles T1 à T18 du contrat approuvé. Les preuves
doivent être exécutées avant de conclure à l'autonomie. Les contrôles de
production T19 à T28 sont reportés, ainsi que la configuration Git/GitHub et
l'évolution du produit, par la décision du propriétaire du 2026-10-15 à 10:49.
La qualification du socle reste distincte de la livraison d'une application.

## Deux racines

L'atelier possède les outils, schémas et versions qualifiées. Le produit possède
ses configurations Nx/Bun, dépendances, entrées et applications. `--target-root`
est absolu, physique et explicite. Aucune destination n'est déduite du
répertoire courant. Les dépôts, worktrees, ancêtres, descendants et liens sont
refusés ; un produit possédé peut être repris après son propre `git init`. Les
outils ne créent ni Git ni remote.

## Préparation et plan

Consulter `bun run prepare:application-workspace --explain`.

```sh
bun run prepare:application-workspace --target-root /chemin/absolu/produit --profiles angular-pwa,react-spa --github-repository equipe/produit --review-owner relecteur --dry-run
bun run prepare:application-workspace --target-root /chemin/absolu/produit --profiles angular-pwa,react-spa --github-repository equipe/produit --review-owner relecteur --apply <plan_id>
```

Ces exemples ne sont pas des commandes PRÊTES. L'opérateur autorisé utilise les
plans et commandes relus pour son projet.

Le preview n'écrit ni destination, ni verrou, ni candidat. Le plan lie les
racines, profils, identités publiques, sources des outils, versions exactes et
fichiers. Les références `catalog:` sont résolues depuis le verrou et les
paquets matérialisés de la base. Le runtime Architect de Nx est explicitement
déclaré depuis le paquet transitif déjà présent dans cette base.

Apply publie uniquement les fichiers techniques, sous verrou commun. Le marqueur
`.cmz/application-workspace.json` contient leur inventaire exact et les
répertoires `apps` et `descriptions`. Il ne déclare pas une compilation réussie.
Les répertoires vides n'ajoutent aucun fichier `.gitkeep` implicite. Un marqueur
seul ne permet pas d'adopter un arbre : les octets des fichiers possédés sont
comparés à son inventaire initial. La provenance de l'outil courant appartient
au plan et au reçu, sans devenir une condition de propriété.

Ce marqueur contient une identité portable, sans racine physique. Deux lieux
gardent les mêmes fichiers et la même identité, mais des plans de destination
distincts. Déplacer un produit impose donc un nouveau plan. Aucun marqueur ne
peut autoriser une écriture dans la racine des outils, ses parents ou enfants.

Le préparateur fournit un verrou candidat complet depuis la fermeture du verrou
source, avec ses records intacts et les surcharges actives du manifeste. Les
surcharges absentes de la fermeture ne sont pas recopiées. Les références de
catalogues et les workspaces de l'atelier n'entrent pas dans ce verrou.

L'opérateur autorisé installe avec
`bun install --frozen-lockfile --ignore-scripts`. Aucun install n'est déclenché
par prepare ou create-app. Le candidat doit être accepté par Bun deux fois sans
changement d'octets, sur les trois profils Angular, React et union, sur Mac et
Linux. Un rejet bloque ; aucune résolution libre de repli. La preuve native
reste à exécuter après revue.

La fermeture réutilise dependencyClosureState sans modifier le résolveur
partagé. Une vue en mémoire applique les surcharges plates de Bun. Le seul pair
optionnel résiduel autorisé, @nx/vitest vers vitest, est décrit par ses
identités exactes et ses empreintes source dans le plan. Aucune version ni
empreinte globale de verrou n'est codée en dur. La qualification vérifie le
snapshot sémantique initial du produit, ses exécutables et sa fermeture
complète. Les contre-tests retirent les surcharges et l'exception pour vérifier
le refus.

Les écarts hérités de nanoid/postcss, undici/jsdom, fast-uri/ajv et Nx/Vitest ne
sont pas une preuve de compatibilité. Leur qualification et le futur lot
ATELIER-DEPS-COMPAT-01 restent distincts. Une mise à jour technique du produit
exigera UPDATE-WORKSPACE-01 : plan relu et transaction. L'évolution n'est pas
implémentée dans ce premier point.

Le job de preuve Linux `External application shells` s'exécute dans la CI. Son
contexte est déclaré obligatoire dans `.github/branch-protection.main.json` et
figure parmi les contrôles requis de `main`. Ce fichier ne modifie pas à lui
seul la protection réelle de GitHub : son application reste un acte séparé du
propriétaire.

## Entrées du produit et shells

### Compiler les sources fournies — EXT-03a

Un projet peut fournir directement une définition backend structurée, une
description OpenAPI ou une collection Postman admissible. Aucune capture HAR,
qualification Redocly ou connexion à un exemple particulier n'est nécessaire.
Les champs, accès, permissions, réponses et statuts proviennent de ces sources ;
une source incomplète est refusée, jamais complétée par supposition.

Les deux compilateurs acceptent `--target-root <absolu-canonique>`. L'espace
doit déjà être possédé par EXT-01. Les schémas et outils viennent de l'atelier ;
définitions, briefs, snapshots et sorties sont relatifs à l'espace choisi.
`descriptions/` est une convention, sans recherche de secours dans l'atelier.
Une valeur absente, une option répétée, une traversée, un lien ou une collision
avec le namespace technique provoque un refus.

```sh
node tools/compile-backend-contract.mjs --target-root /chemin/absolu/produit --definition descriptions/api.definition.json --out descriptions/api.backend-contract.json --adapter structured --dry-run
node tools/compile-backend-contract.mjs --target-root /chemin/absolu/produit --definition descriptions/api.definition.json --out descriptions/api.backend-contract.json --adapter structured --apply <plan_id_backend>
node tools/compile-application-design.mjs --target-root /chemin/absolu/produit --source descriptions/app.source.json --out descriptions/app.json --dry-run
node tools/compile-application-design.mjs --target-root /chemin/absolu/produit --source descriptions/app.source.json --out descriptions/app.json --apply <plan_id_design>
```

Le Node utilisé est celui de la base qualifiée. Pour une source OpenAPI ou
Postman, choisir explicitement `--adapter openapi` ou `--adapter postman`. Le
design référence les contrats publiés et leurs empreintes exactes. Les rôles
reference et target restent distincts ; un contrat reference ne pilote pas la
réalisation, et planned ne devient pas implemented ou verified-live.

Le plan affiche `mode`, son identifiant et les empreintes de source et de
sortie. En extérieur, il indique aussi `workspace_id` et `context_sha256`.
L'empreinte lie l'identité physique, la propriété, les outils/schémas et la
fermeture des entrées ; le même contenu dans un autre espace ne réutilise pas ce
plan. Une modification après preview exige un nouveau plan. Les identités
physiques restent dans le contexte privé, pas dans le contrat canonique publié.

Dry-run n'écrit ni sortie, ni candidat, ni verrou. Apply reconfronte le plan
sous le verrou existant de génération, publie par la primitive documentaire
exclusive et contrôle à nouveau le contexte. Une sortie étrangère est conservée
et refusée. Un candidat exact peut être repris avec le même plan ; aucun
écrasement forcé. Les verrous documentaires utilisent le namespace de travail
d'EXT-01 sous apps, sans créer d'application. Sans target-root, les identifiants
de plan et contenus canoniques du mode atelier sont conservés.

Les tests de compilation utilisent deux jeux déclarés fictifs : notes (source
Postman de référence et cible structurée publique, une page) et Clean Street
(cible structurée bearer, navigation et deux pages). Ils vérifient les CLI,
racines, dépendances, collisions et refus sémantiques. Ils n'établissent aucune
connexion réelle ni qualification native d'une cible.

La preuve de consommation du shell garde quatre résultats distincts : notes et
Clean Street, chacun sur Angular et React. Leurs designs d'origine déclarent
shell-only : React les refuse. Les cellules communes de shell utilisent une
variante technique explicitement déclarée avec offline_policy none, et publient
ce changement dans leur reçu. Aucun support PWA React ni adaptation silencieuse
du contrat d'un projet réel n'est déduit. Les vrais
compilateurs/build/lint/tests doivent réussir sur des installations déjà
qualifiées ; les fixtures de seules métadonnées ne prouvent pas ces cellules.
Aucun install n'est implicite.

Le lot compile des documents et les fait consommer par des shells. Il ne livre
pas à lui seul une page métier, une session, une API vivante ou la chaîne
d'acquisition d'observations privées d'EXT-03b.

### Inspecter les projections structurelles — premier incrément EXT-03b

L’inspection lit une sélection explicite et des projections locales déjà
assainies. Elle ne contacte aucun service et ne compile aucun contrat. La
capacité générique fonctionne avec des données fictives indépendantes ; une
acquisition propre à un projet garde ses prérequis et son autorisation séparés.

```sh
node tools/inspect-runtime-observations.mjs --target-root /chemin/absolu/produit --selection descriptions/inspection.selection.json
```

Cet exemple exige une revue et une admission avant exécution. Le produit doit
porter un marqueur EXT-01 cohérent et les fichiers possédés doivent encore
correspondre à son inventaire. La racine absolue et physique reste extérieure à
l’atelier, hors ancêtres Git ; son propre Git est admis. L’inspection n’adopte
ni ne modifie le produit. Les chemins techniques, traversées, liens et fichiers
spéciaux sont refusés. Aucune installation, recherche de secours, écriture ou
option de publication n’est proposée.

Le schéma `observation-evidence.schema.json` distingue trois documents fermés :

- `observation-selection` : sources par id, chemin relatif et SHA-256 ; faits
  par id, source, opération, cas, JSON Pointer et forme attendue ;
- `observation-projection` : origine `fixture` ou `declared-observation`, date
  UTC déclarée, alias de contexte, opérations avec méthode et chemin relatif,
  cas avec statut HTTP, catégorie de contenu et forme structurelle ;
- `observation-inventory` : empreinte de sélection, identité du workspace,
  sources relues, faits résolus et inconnues explicites. La qualification vaut
  uniquement `structural-only` et `network_verified` vaut toujours `false`.

Les formes sont `absent`, `null`, `scalar` (type JSON), `object` (liste de
champs nommés et de formes) ou `array` (longueur et formes des éléments). Ce ne
sont pas les valeurs des réponses. URL d’origine, query, headers, cookies, corps
brut, texte libre de réponse et statut `verified-live` ne font pas partie du
contrat. Un nom de champ ou alias doit déjà être assaini : l’outil n’est pas un
anonymiseur et ne garantit pas l’absence universelle de secrets dans un nom
admis. L’origine et la date restent des déclarations, pas une authentification.

Un fait est accepté seulement si le hash correspond aux octets lus, le pointeur
résout un nœud propre, son opération et son cas correspondent et la forme est
exactement égale à l’assertion. JSON Pointer suit RFC 6901 : `~1` puis `~0`,
indices canoniques sans zéro initial, aucune normalisation Unicode, référence
absente refusée. Les faits sélectionnent une forme sous
`/operations/N/cases/N/shape`, puis éventuellement `items/N` ou
`fields/N/shape`. Une absence déclarée est un nœud `absent` ; un pointeur
inexistant n’en est jamais une preuve.

Les cas restent séparés. `null` laisse le type non nul inconnu, un tableau vide
laisse le type d’élément inconnu, `absent` ne prouve pas un champ optionnel.
Permissions, champs requis, exhaustivité, authenticité réseau et fenêtre de
validité ne sont pas établis par l’inspection. Réécrire de façon cohérente une
fiction et sa sélection peut rester indétectable ; aucun reçu de réseau vivant
n’est produit.

Les plafonds sont fixes : 64 Kio par sélection ou projection, huit sources, 64
faits, huit opérations par source, seize cas par opération, 32 champs ou
éléments par forme, huit niveaux de formes. Les documents ont aussi un plafond
lexical de 24 niveaux et 4 096 unités structurelles avant parsing, puis 4 096
nœuds, 24 niveaux et 1 024 caractères par chaîne avant validation récursive. Ces
limites se cumulent. Le marqueur est limité à 512 Kio, son inventaire à 128
fichiers, chaque fichier possédé à 1 Mio et leur total à 8 Mio.

Le préfiltre de ressources admet le flux à doubles guillemets d’un document JSON
et refuse les constructions YAML par indentation, tags ou alias. Le parseur
structuré existant conserve la responsabilité de la syntaxe et des clés uniques.
Les plafonds de fichier sont contrôlés avant lecture ; la lecture sur
descripteur ne dépasse jamais le plafond plus un octet de détection. Les
identités physiques et les métadonnées du fichier sont confrontées avant et
après. Les plafonds ne sont pas des valeurs métier.

stdout reçoit uniquement l’inventaire complet et canonique après réussite. Un
refus ne publie aucun inventaire partiel ; stderr reçoit un code fixe `OBS_*`,
sans message, cause, stack ni chemin issu d’une erreur native. Les tests
utilisent une sentinelle fictive dans des entrées rejetées pour vérifier cette
frontière, notamment les erreurs détaillées du parseur.

Les deux jeux structurels fictifs et la CLI sont exercés par
`runtime-observation-evidence.test.mjs`, découvert par la suite native
existante. Ils ne prouvent ni capture, ni backend, ni provenance réseau.
L’inventaire reste incompatible avec les entrées des compilateurs historiques.
Reçu indépendant, validité, liaison privée et sous-ensemble compilable restent
des incréments ultérieurs ; ce premier mécanisme ne clôt pas EXT-03 ni sa voie
d’acquisition.

### Générer le shell depuis les documents compilés

Les designs, sources et snapshots restent à leurs chemins relatifs déclarés dans
le produit. `descriptions/` est une convention, pas un emplacement de secours.
Traversée, lien, empreinte fausse ou collision avec un fichier technique réservé
sont refusés. Aucun fichier manquant n'est cherché dans l'atelier. Les entrées
ne sont ni recopiées ni réécrites par la création.

```sh
bun run create-app --target-root /chemin/absolu/produit --design descriptions/app.json --experience web --app produit-angular --profile angular-pwa --dry-run
bun run create-app --target-root /chemin/absolu/produit --design descriptions/app.json --experience web --app produit-angular --profile angular-pwa --expect-plan <plan_id>
```

Le mode extérieur exige le plan revu. Chaque profil conserve son rendu natif,
son routing, sa garde et ses contrats de page. Ses configurations TS, lint,
test, Vite, caches et dist sont locales au produit. Angular utilise OnPush et
Angular ESLint ; React utilise React/Vite/Vitest et ses hooks. Aucune couche UI,
état ou traduction commune n'est introduite.

La compilation emploie les fichiers exécutables réellement installés dans le
produit, appelés par Node absolu ; aucun `bunx`/`npx` ne télécharge un manque.
Le résultat `created` exige compilation native, build production, lint zéro
warning, tests et revérification de l'arbre. Le résultat ne certifie aucune
session, règle métier, API vivante, exploitation ou protection GitHub.

Sans `--target-root`, le rendu et les identifiants historiques restent
inchangés. Le test T16 compare les deux renderers au code du commit
`3f5922287a6bda7c477e9b304136f14b9ae4c177` ; le commit doit être disponible.

## Ownership et reprise

Le candidat d'app est sous `apps/.<app>.external-candidate-<plan_id>/`. Un
candidat partiel connu est complété sans supprimer de fichier. Un candidat ou
une sortie contenant un fichier étranger est conservé et refusé. Un échec après
publication remet seulement un arbre encore exact en candidat ; une dérive
empêche ce déplacement.

Une interruption peut laisser le verrou. La reprise utilise la récupération
existante de `generation-transaction.mjs` et revérifie le même plan. Elle ne
déplace pas le workspace, les entrées ou une autre app. Modifier une entrée, un
outil, le verrou ou une configuration périme le plan ; aucune option force. Un
commentaire dans l'outil ne retire pas la propriété du produit : un nouveau plan
vérifie son snapshot intact, sans réécrire les fichiers selon un renderer plus
récent. Aucune migration ou adoption silencieuse n'est autorisée.

Depuis X1, une publication dans une application existante utilise deux autres
répertoires de travail : le candidat
`apps/.<app>.publication-candidate-<plan_id>/` et l'arbre mis de côté
`apps/.<app>.previous-candidate-<plan_id>/`. Sa reprise est propre à
`application-publication.mjs` ; elle n'utilise pas le journal de
`generation-transaction.mjs`. Tant que l'un de ces répertoires existe, toute
autre commande extérieure sur le produit est refusée
(`interrupted publication pending for app <app>; recover it first`). Seules
passent la reprise explicite `recoverApplicationPublication`, qui prend le
verrou de l'application, et la publication relue de cette même application, qui
reprend d'abord. La reprise annule l'état interrompu s'il est exact ; sinon elle
le refuse comme ambigu et laisse tout en place pour une inspection locale.

## Qualification séparée des tests de fichiers

`test:external-application-shells` teste plans, chemins, marqueurs, refus,
exclusivité, rollback et interruption réelle d'un processus. Certains tests
négatifs utilisent seulement les métadonnées des dépendances et un runner
injecté : ils ne prouvent aucune compilation.

`check:external-application-shells` exige une racine de laboratoire neuve,
durable et hors dépôt. Il installe réellement ses paquets et son navigateur
épinglé, puis exécute les outils de chaque produit via `runConfined` :

- Mac : backend `macos`, Node/Bun extérieurs, HOME et cache possédés ;
- Linux CI : backend `docker` et images de la politique par digest ;
- execution : aucun accès atelier, aucun montage de ses dépendances, réseau
  fermé ; seuls serveur et navigateur partagent leur loopback de rendu ;
- résolution : phase distincte, registre de paquets explicite ;
- deux produits fictifs A et B, chacun installé indépendamment ;
- compilation réelle des contrats backend puis de la conception par les CLI avec
  `--target-root`, sans injection de conception compilée ;
- quatre cellules A/B × Angular/React, avec compilation, build, lint, tests,
  arbre généré et déclarations de routes vérifiés ;
- les deux apps du produit B sont ensuite reprises ;
- mutations de type, template, any, console, warning, test, configuration,
  paquet, entrée, poids, titre visible et garde ; rouge puis vert restauré.

Les sondes tentent réellement lecture/résolution depuis l'atelier et écriture
hors candidat. Le navigateur observe titre, route publique et refus de route
protégée, sans requête extérieure. Son oracle désactive le service worker : il
ne prouve pas le fonctionnement offline. Les contrôles trois moteurs et
accessibilité restent à T25.

Les données viennent de fixtures déclarées fictives. L'instrumentation est
inventoriée/hashée puis retirée uniquement si ses octets sont encore exacts. Le
laboratoire reste disponible. Le rapport est `report.txt`, sans copie
d'environnement, HAR, trace ou JSON de test. En cas de défaut inattendu, arrêter
et analyser ; ne pas relancer ni assouplir le contrôle.

Les cellules utilisent `CMZ_EXT03A_NATIVE_CELL` et `CMZ_EXT03A_NATIVE_ROOT`. Le
job leur fournit un contexte de preuve pour employer le confinement natif ; le
mode autonome reste disponible sur un produit possédé et installé. Le rapport
conserve l’empreinte et la durée de chaque cellule. Les contrats A (Postman et
définition structurée) et B (définition structurée indépendante) restent
déclaratifs ; aucun backend réel n’est appelé. La variante technique
`offline_policy: none` est explicite, sans qualification PWA.

La CI contient une exécution Linux dédiée, limitée à 45 minutes, et un reçu
texte limité. Ce câblage n'est pas une CI exécutée. La preuve Mac reste
distincte. Toute page montrée au propriétaire nécessite ensuite les
builds/serveurs lancés par lui et une revue visuelle avant/après dans son
navigateur.

## Réponses observées : modèles candidats R1

`compileRuntimeObservationModels({ targetRoot, mappingPath })`, exporté par
`adapters/runtime-observation-adapter.mjs`, réutilise l'inspecteur structurel et
les projections de requêtes OpenAPI. Il retourne un
`observation-model-candidate` **reference / structural-only**, avec
`network_verified:false`. Il ne publie pas un contrat backend complet.

Le mapping est une `observation-model-selection` version1.1.0, dans le schéma
`observation-evidence.schema.json`. Il référence, par chemins relatifs et
SHA-256, une sélection d'observations v1, un sous-ensemble OpenAPI et un
complément `observation-model-annotations` v1.1. Ce complément contient les
modèles déclarés, avec required/nullable explicites pour chaque champ, et les
références privées de provenance. Le fragment source est lu sous borne,
empreinte et lignes contrôlées, sans interprétation du langage. Ces références
établissent une identité de déclaration, pas sa véracité ni une authenticité
réseau.

L'adaptateur vérifie les formes observées contre ces déclarations : présence,
nullabilité, types et items. Un null ou tableau vide sans complément n'est pas
compilable. Les cas sont liés par méthode, chemin d'opération, identifiant,
statut et média ; le base-path est explicite et distinct d'une origine privée.
Chaque modèle/champ conserve ses preuves déclarées et les observations
effectivement disponibles. Les seuls modèles atteignables sont sélectionnés ;
une dépendance absente ou cyclique et un conflit refusent la compilation
entière.

Sous-ensemble R1 : types primitifs string/integer/number/boolean, objets et
tableaux via modèles déclarés, requêtes OpenAPI à composants locaux simples. Les
descriptions de sortie sont fixes ; ni examples/default, enum ou pattern des
requêtes, ni servers, métadonnées privées ou contenu capturé ne sont recopiés.
Une contrainte non supportée est refusée, jamais supprimée silencieusement. La
nouvelle voie exige une déclaration explicite de sécurité : une absence de
security ne devient pas un accès public. Les requirements explicitement vides
restent publics ; l'application effective des permissions reste inconnue. Les
conventions historiques du compilateur OpenAPI complet restent inchangées.

Tous les fichiers de données passent par les bornes de l'inspecteur avant
parsing, les chemins physiques et les pointeurs propres RFC6901. Les diagnostics
sont des codes OBS_* fermés, sans message du parseur ni valeur de source. Deux
corpus synthétiques distincts sont exercés par
`runtime-observation-adapter.test.mjs`, découvert par la gate core existante.
Ces tests n'établissent aucune observation d'un réseau vivant.

R2 devra raccorder ce candidat au compilateur complet et à une origine privée
injectée au runtime, puis vérifier application-design séparément. R3 devra
qualifier l'acquisition réelle, sa portée et sa validité, et la consommation des
sorties CAPTURE. Ni une étiquette declared-code, ni une image/date/empreinte
déclarée, ni une fixture ne permettent à R1 de produire verified-live. Une page
réelle attend son contrat complet, ses compléments déclarés relus et ses
preuves.

Les tables à clés dynamiques sont hors du sous-ensemble R1. Leur nature doit
être fournie par la source complémentaire ; les noms aperçus dans un échantillon
ne deviennent pas des propriétés fixes. Une déclaration map/additionalProperties
est refusée par R1 et exige un raccord ultérieur expressément revu.

La nouvelle voie refuse aussi les contraintes OpenAPI non représentées (par
exemple format email, exclusiveMinimum), incompatibles avec le type ou
contradictoires. Les formats date/date-time/uuid/binary restent projetés par la
primitive native. Ce refus de perte s'applique à R1 ; il ne modifie pas le
comportement historique du compilateur complet.

## R2 — contrat depuis des observations et compléments sourcés

L'adaptateur `runtime-observation` de `compile-backend-contract.mjs` reçoit une
sélection explicite `observed-backend-definition` 1.2.0, un `--target-root`
détenu par l'application et un `--private-root` physique, distinct et de
mode 0700. Il n'acquiert aucune réponse et n'appelle aucun service. La sélection
épingle les empreintes de l'OpenAPI privé, d'une liaison runtime, des témoins
structurels et des déclarations avec fragments de code. Chaque réponse
sélectionne exactement une opération, un statut, un cas et un pointeur de
structure.

La source OpenAPI complète est lue sous un plafond de 1 Mio, après contrôle du
volume déclaré, puis précontrôle de 131072 tokens, 32768 nœuds et profondeur32.
Le parseur natif est utilisé ; aucun parsing streaming n'est revendiqué. Seules
les opérations sélectionnées et leurs composants de requête/sécurité
atteignables sont extraits. L'extrait conserve les pointeurs RFC6901 et
l'empreinte de la source complète. Il est limité à64Kio,8opérations,32modèles.
Les sources réelles auth229287 et base-settings483822 octets ont motivé cette
séparation des budgets ; leur volume ne devient pas un quota de routes dans
l'IR. Une nouvelle source hors plafond exige une revue, pas une hausse
implicite. Les limites de données des versions R1 1.0/1.1 restent inchangées.
Seule la lecture des schémas installés dispose de son budget propre
de32768nœuds.

Publication en quatre plans distincts, recalculés sous le verrou existant :

1. `--snapshot openapi --out <snapshots.openapi> --dry-run`, puis
   `--apply <pin>` ;
2. même procédure pour `observations` ;
3. même procédure pour `declarations` ;
4. sans `--snapshot`, plan puis publication du contrat backend.

Le quatrième plan vérifie physiquement les trois capsules publiées. Leur absence
ou leur dérive bloque la compilation. Aucun répertoire partiellement publié
n'est déclaré consommable et aucune atomicité entre les quatre publications
n'est revendiquée. Les empreintes privées et leurs identités ferment le contexte
recalculé ; le plan public ne donne ni chemin privé ni origine. La publication
emploie les mêmes primitives de documents, sans écrasement d'un contenu
différent.

Le contrat backend1.1 conserve le format1.0. Une propriété `format: email` exige
un champ string ; le binding action-request doit porter la règle native email.
Un modèle object peut déclarer `additional_properties` avec un type canonique,
notamment array<string> pour une table dynamique. Les clés observées ne
deviennent pas des champs fixes. L'ouverture d'une requête OpenAPI n'est pas
transformée en fermeture : une absence de `additionalProperties` reste
explicitement ouverte. La primitive `null` représente null seul ; les
consommateurs action-request qui ne savent pas l'exploiter refusent au lieu de
produire unknown/json.

Les témoins version1.2 donnent une couverture complète de leurs éléments, avec
les propriétés optionnelles observées et les tableaux vides explicites. Leurs
required/nullable/items viennent toujours des déclarations sourcées. La
vérification suit le témoin fini et borné, même avec un graphe de modèles
récursif. Une map a au plus128entrées et conserve des types de valeurs, sans
recopier ses clés.

Le résultat est un contrat `reference`, avec sources au même statut, et une
qualification structurelle seulement. Une fixture ne prouve aucun réseau, un
complément ne qualifie pas toutes les branches et un hash n'interprète pas le
code. La compilation application-design reste distincte ; un backend reference
ne peut pas piloter une implémentation cible par promotion implicite. La
qualification vivante et la décision de cycle de vie restent des étapes relues.

## Adoption explicite d'un contrat de référence

Un contrat observé `reference` ne devient pas implicitement une cible de
`application-design`, même pour une conception en brouillon. L'option
`--adapter structured --adopt-reference` permet une déclaration distincte :
l'application prévoit de consommer le graphe exact d'une référence, au statut
`planned`. Elle ne prouve ni l'implémentation ni un backend vivant. La voie
structured 1.0 historique et l'adaptateur runtime-observation restent inchangés.

La définition d'adoption est un `backend-contract-definition` 1.1 fermé à six
clés : `schema_version`, `kind`, `contract`, `source`, `basis`, `decision`.
`contract` déclare explicitement `id`, `title`, `version`, `description` et
`status: planned`. `source` contient seulement un identifiant distinct et
`authority: declared`. `basis` et `decision` contiennent chacun un
`snapshot_uri` relatif et un `sha256`. La base est un contrat canonique 1.0 ou
1.1, au statut `reference`, dont toutes les sources restent observationnelles.
La décision est un document source JSON non vide, versionné et épinglé ; son
contenu ne déclenche aucune approbation automatique. La définition déclarée et
la revue explicite du plan portent la décision d'adoption.

Exemple de séquence, dans une racine de compilation privée déjà préparée :

```sh
node tools/compile-backend-contract.mjs \
  --adapter structured --adopt-reference --target-root "$racine_privee" \
  --definition descriptions/auth.adoption.json \
  --out descriptions/auth.target.backend.json --dry-run
```

Après revue du plan, reprendre les mêmes arguments avec `--apply <plan_id>`. La
sortie est un nouveau fichier ; elle ne remplace ni la référence, ni la
définition, ni la décision, ni une capsule. La reprise du même plan est
idempotente par le protocole natif de publication. Sans `--adopt-reference`, la
nouvelle variante est refusée. Le mode exige une racine externe et refuse les
options privées ou de snapshot de runtime-observation.

Le delta canonique est fermé : identité et version déclarées, statut `planned`
des entités, nouvelle source `manual / declared / planned`, preuves d'adoption
résolvant `/basis` et `/decision` dans la définition. Méthodes, routes, types,
nullabilité, maps typées, format email, permissions, réponses et alias runtime
restent ceux de la base. Toutes les sources et preuves observées sont conservées
; aucune ne devient `implemented` ou `verified-live`.

Le mode est choisi avant toute lecture de la définition. Le lecteur borné
existant limite la définition et la décision à 64 Kio chacune, la base à 1 Mio,
les capsules à 64 Kio chacune, au plus 16 sources de référence et 2 Mio
d'intrants uniques au total. Le précontrôle structurel du lecteur R2 précède le
parseur natif ; ses budgets ne sont pas relevés. Les capsules sont hashées comme
sources, sans interprétation de leur contenu. Les tables du schéma sont chargées
par la primitive native sans prototype. Les rejets sont des diagnostics `OBS_*`
fixes, sans message de parseur ou valeur de source.

Le contexte de compilation ferme les empreintes et identités de la base, de la
décision, de la définition, des capsules et du code et des schémas natifs. Il
est recalculé sous le verrou existant avant publication. Une dérive rend le plan
relu périmé ; elle ne permet ni de remplacer la source ni de poursuivre une
publication sur un plan ancien. Le design doit ensuite référencer le nouveau
fichier `planned` et son empreinte réelle. Les preuves d'usage, d'interface et
de réseau vivant demeurent des étapes distinctes.

## Session déclarée, actions typées et coque Angular

L’option `application-design` 1.1 ajoute une session explicite à une expérience
web. Les conceptions 1.0 restent valides avec leurs limites. Le producteur de
session référence une page, son action backend, son statut de succès et le
modèle canonique exact. Les pointeurs RFC6901 désignent le jeton, le sujet, le
menu, les chemins permis et, si nécessaire, une source textuelle de permissions.
Un nom de champ, un rôle, un booléen `is_admin` ou un item de menu n’invente
aucune autorisation. Les opérations protégées déclarent leurs identités,
méthodes, chemins et schémas de sécurité ; la validation les confronte au
backend ciblé et vérifie leur couverture.

Les étapes ordonnées déclarent un prédicat `is-null` ou `is-true`, une page et
un producteur de complétion. Acquitter une étape ne modifie pas la valeur
serveur du résultat initial. L’effet `clear-and-reconnect` efface la session et
renvoie vers la reconnexion. Une condition de résultat booléenne peut être
requise avant cet effet. Le sujet peut être optionnel dans une réponse de
challenge ; établir la session exige néanmoins le sujet et un jeton valides. Les
champs d’étape sont requis dans ce sujet décodé. Une réponse 200 sans ces
valeurs n’établit aucune session ; le parcours interactif de second facteur
reste hors du périmètre rendu.

`action-request` 2.1 produit un modèle d’exécution 1.1. Cette variante autorise
les graphes de résultats finis : objets fermés, tableaux, maps typées, champs
optionnels ou nullables et primitive `null`. Le corps absent est explicite et
n’envoie ni objet vide ni en-tête de contenu. Les anciennes variantes 2.0/1.0
conservent leurs règles. Les budgets de modèles, champs, profondeur, octets et
parcours sont appliqués avant lecture ou décodage récursif. Le téléchargement
réseau avant réception n’est pas borné par cette capacité.

Le chargeur CLI applique une borne commune de **65 536 octets (64 Kio)** aux
définitions d’action 1.0, 2.0 et 2.1, avant parsing. Au-delà, le fichier est
refusé avec un code fixe, sans recopier son contenu dans les diagnostics. Cette
borne de lecture s’ajoute aux règles historiques ; leur compatibilité est
vérifiée séparément par les suites existantes. Un test CLI permanent couvre la
frontière de lecture et l’absence de fuite pour les trois versions.

Les réponses d’erreur sont celles déclarées sur chaque opération du contrat
backend. La sélection observée 1.3 est un opt-in : un 400 absent d’OpenAPI exige
`observed-only` et des témoins PHP/capture concordants. Cette déclaration ne
modifie pas l’OpenAPI brut, ne transforme pas une erreur en succès et ne prouve
pas un backend vivant. La sélection 1.2 et ses succès restent distincts.
L’action contrôle le statut et le corps typé, borne les messages textuels et lie
les erreurs aux seuls champs déclarés. Les erreurs inconnues deviennent des
diagnostics génériques ; aucun corps brut ou rejet du parseur n’est exposé.

Le plan de page 1.1 lie la capsule et les effets à leurs sources sous empreinte.
Il peut contenir seulement une commande ou seulement une lecture dans cette
variante. La liaison recompile le plan entier depuis les documents référencés.
Un binding Angular 1.1 fournit explicitement le module et le jeton
`APPLICATION_SESSION`. Le résultat d’un producteur de session est consommé après
décodage ; il n’est pas exposé comme état public de la composition.

La coque Angular produit un store mémoire à signaux readonly, une garde
fonctionnelle, un intercepteur HttpClient, un menu et la navigation. Les URL des
services sont liées par `SESSION_ENDPOINTS`, sans URL de banc embarquée. Les
contextes natifs, dont l’unique `SKIP_AUTH`, sont copiés avec leurs sources et
empreintes. Le Bearer est limité aux origines, méthodes et chemins déclarés. Les
requêtes protégées interdisent cache et redirection ; 401 courant efface la
session, 403 la conserve. Les générations de session et de façade empêchent
qu’une réponse tardive restaure des données d’un ancien sujet. Aucun stockage
persistant n’est utilisé ; un rechargement nécessite une reconnexion.

Le menu intersecte les chemins serveur et les routes générées, applique la
politique de permission déclarée et retire les groupes vides. Les chemins
externes, ambigus, encodés ou traversants sont refusés. Le rendu utilise des
liens et groupes HTML natifs, un lien d’évitement, un panneau responsive et une
cible de focus après navigation. Les libellés sont interpolés comme texte. La
réalisation des pages métier doit consommer la composition et les erreurs par
champ ; une façade isolée ne prouve pas cette consommation.

Les nouveaux tests sont découverts par les gates core et Angular existantes.
Deux domaines de fixture portent des noms et ordres d’étapes différents. Leurs
formulaires consommateurs montent les fichiers produits et le catalogue passe
par la composition de lecture native. Ces fixtures ne constituent aucune preuve
réseau, aucune promotion `verified-live` et aucune application métier livrée.
Les résultats de tests, le build de la sortie, le clavier et le reflow en
navigateur ainsi que la revue visuelle restent des preuves distinctes à exécuter
sur les images relues. Les nouvelles capacités sont explicitement refusées dans
les trois rendus React ; la régression React historique reste requise et aucune
parité n’est revendiquée.

## Coque Angular avec session en extérieur — X0

Une conception `application-design` 1.1 avec session passe par le même
`create-app --target-root` que les autres coques : plan revu, verrou, candidat,
compilation `ngc`, build production, lint, tests et `check-workspace` avec les
seuls exécutables installés dans le produit. Aucune option, aucun schéma et
aucun rendu de page nouveaux ne sont introduits ; seul le test de garde décrit
ci-dessous s'ajoute à la coque, en mode extérieur.

En mode extérieur seulement, la coque avec session porte
`src/app/session/session.guard.spec.ts`. La cible native `test` du produit exige
au moins un test, et la coque avec session retire `access.guard.spec.ts`. Ce
test vérifie que les pages publiques restent ouvertes et que les autres pages,
comme une donnée de route inconnue, redirigent vers la reconnexion sans session.
Le mode atelier ne lance pas cette cible ; son rendu reste inchangé.

Les entrées restent dans le produit, ici sous `descriptions/` : source déclarée,
contrat backend, brief et conception. La fermeture du plan contient exactement
ces fichiers. Les modèles d’exécution, plans de page et contrats du fixture en
mémoire ne sont pas copiés : la coque produit ses propres contrats de page.

`test:external-application-shells` couvre, sur les deux domaines fictifs
`observatory` et `equipment-hire` :

- le plan, sa fermeture d’entrées, l’absence de tout module `@cmz/` (`from`,
  import nu, `import()` ou `require`) et d’URL de service du contrat dans les
  fichiers produits ;
- la garde de session sur chaque route et la redirection par défaut vers la
  reconnexion ;
- `create-app --dry-run` puis la publication du plan relu, sans écriture pendant
  la prévisualisation et avec les binaires du produit seulement ;
- le test de garde présent en mode extérieur et absent en mode atelier.

Quatre contre-tests ne tournent que sur un domaine, le refus ne dépendant pas du
domaine :

- `observatory` : refus d’un plan transféré à un produit aux entrées identiques,
  puis d’une entrée modifiée après relecture ;
- `equipment-hire` : refus React (`APP_SESSION_REACT_UNSUPPORTED`), en API comme
  en CLI, sans écriture, puis état d’entrée du modèle de propriété : un fichier
  ajouté à la main dans la coque bloque toute commande suivante.

Ces tests utilisent un runner injecté et ne prouvent aucune compilation.
`check:external-application-shells` ajoute une coque avec session dans chacun
des produits A et B déjà installés, puis exécute réellement la chaîne native. Le
navigateur vérifie la page d’entrée publique, le titre, le refus de la page
d’arrivée sans session, la redirection vers la connexion, celle d’une route
inconnue et l’absence de requête extérieure. La mutation qui retire la garde
doit rendre ce contrôle rouge, puis vert après restauration exacte.

Limites : aucune page métier réalisée, aucun appel backend, aucune connexion
réussie, aucune étape d’authentification parcourue et aucune parité React. Le
service worker est bloqué pendant l’oracle ; aucune qualification hors ligne
n’est revendiquée.

## Inventaire scellé et publications sous plan — X1

[ADR-0103](../adr/0103-propriete-etendue-inventaire-application-scelle.md) étend
la propriété d’une application extérieure au-delà de la coque. Le registre reste
`apps/<app>/.cmz/app-manifest.json`. En mode extérieur, `create-app` y ajoute un
bloc `ownership` : identité du produit, empreinte de l’inventaire de la coque,
publications acceptées et sceau. Le mode atelier ne change pas.

Chaque commande extérieure vérifie, pour chaque application, que le sceau est
présent, lié au produit et égal au recalcul. Elle vérifie aussi qu’en annulant
les publications on retrouve exactement la coque, que chaque publication est
restée dans ses zones et que l’arbre est égal à l’inventaire, octet pour octet.
Une application extérieure créée avant X1 n’a pas de sceau : elle est refusée et
doit être recréée.

`planApplicationPublication` puis `publishApplicationPublication` sont la seule
voie pour changer cet inventaire :

- ajout sous `src/app/generated/`, ou dans le dossier d’une page dont le contrat
  `.cmz/pages/<page>.json` existe ;
- remplacement d’un fichier de page de la coque ou d’un fichier déjà publié,
  avec l’empreinte d’avant ;
- aucun autre chemin, aucune suppression, aucun outil hors de la liste fermée
  (`generate:action-request`, `generate:list-query`,
  `generate:page-composition`, `page-realization`).

La publication exige le plan relu. Elle recalcule ce plan sous verrou et prépare
un candidat complet à côté de l’application. Elle le compile avec les binaires
du produit, échange les deux répertoires, puis lance build, lint, tests,
`check-workspace` et le contrôle de poids. En cas d’échec, l’arbre mis de côté
revient toujours, même si l’échange s’est arrêté entre ses deux renommages :
l’application n’est jamais laissée absente. Le nouvel arbre n’est déplacé que
s’il est encore exact ; sinon tout reste en place. Une publication interrompue
bloque toute autre commande extérieure jusqu’à sa reprise (section « Ownership
et reprise »). La reprise l’annule si l’état interrompu est exact ; sinon elle
la refuse et conserve tout. Rejouer un plan déjà publié ne change rien et le dit
(`replayed`).

`external-application-publication.test.mjs` couvre, sur les deux domaines
fictifs, le sceau de création, l’ajout et le remplacement acceptés et une
seconde publication enchaînée. Il couvre aussi les refus : plan absent, périmé
ou rejoué, zones non déclarées, fichier ajouté à la main, octet modifié, dossier
racine non déclaré, registre falsifié (inventaire édité, sceau retiré, sceau
recalculé sans publication, publication inventée hors zone, autre produit),
échec à chaque phase, échec entre les deux renommages, arbre altéré après
l’échange, octet modifié à longueur égale, reprise d’une interruption, blocage
des autres commandes tant qu’elle n’est pas reprise et application non scellée.
Un test nommé « limite connue » montre qu’une forge complète, sceau recalculé,
passe. Le runner injecté ne prouve aucune compilation.
`check:external-application-shells` publie, dans chaque coque avec session des
produits A et B, une sortie sous `generated/` puis le remplacement d’une page
qui la consomme. Il exécute réellement la chaîne native et rejoue les refus «
fichier ajouté à la main » et « registre falsifié » sur le produit installé.

Limites :

- le sceau n’utilise aucun secret. `computeOwnershipSeal` est une fonction
  exportée de l’atelier : une forge complète coûte quelques lignes et passe ;
- `tool` et `plan_id` d’une publication sont déclaratifs. Le registre prouve
  quels octets ont été publiés, pas quel outil les a produits ;
- la forge n’est visible que si le Git du produit est versionné et relu, ce que
  l’atelier ne vérifie pas. Le `check-workspace` du produit contrôle les
  empreintes de l’inventaire, pas le sceau ;
- la primitive publie du texte UTF-8 seulement ; un actif binaire exigera une
  extension ;
- une commande à la fois par produit est supposée : le verrou est par
  application ;
- une application créée avant X1 se recrée : supprimer `apps/<app>` dans le
  produit (le marqueur ne liste pas les applications), puis relancer
  `create-app --target-root` ;
- les contenus publiés par la preuve sont fictifs : aucun générateur réel n’est
  encore branché sur cette primitive.
