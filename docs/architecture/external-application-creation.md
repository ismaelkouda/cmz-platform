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

Le job de preuve Linux est câblé dans le candidat mais n'a pas encore été
exécuté. Son contexte obligatoire `External application shells` est déclaré dans
`.github/branch-protection.main.json`. Cette déclaration ne modifie pas la
protection réelle de GitHub : son application reste un acte séparé du
propriétaire après la fusion.

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
