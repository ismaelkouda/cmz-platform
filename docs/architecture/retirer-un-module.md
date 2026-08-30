# Cycle de vie automatisé d’un module

## Contrat

La création et le retrait d’un module sont des transactions de workspace, pas
des listes d’étapes humaines. Les commandes nominales sont :

```bash
bun run create-module --definition <action-request.definition.json>
bun run retire-module --module <nom>
```

Le cycle est fermé par `tools/module-lifecycle.test.mjs` : il publie réellement
les trois projets Angular générés, conserve leurs `project.json`, les câble, les
retire avec la commande de production, puis exige le retour octet pour octet des
cinq fichiers protégés. Aucun hook `NODE_ENV=test` ni variable de bypass
n’existe dans les scripts de production.

## Création — `tools/create-module.mjs`

La source de vérité est une définition validée par la plateforme de génération.
La table de composition fermée accepte `action-request`
(domain/data/application) et `list-query` (domain/data) ; tout `kind` inconnu
échoue avant écriture. `feature.id` détermine exclusivement le scope Nx, les
packages et la racine `libs/<module>`.

```bash
node tools/create-module.mjs --definition <fichier.json> [--dry-run]
node tools/create-module.mjs --resume --module <nom>
node tools/create-module.mjs --abort --module <nom>
```

La commande :

1. refuse une sortie existante, une transaction de retrait concurrente et la
   recréation implicite d’un module possédant un tombstone ;
2. journalise l’identité Git, les octets/hash de la définition et les
   contenus/hashes de `eslint.config.mjs`, `tsconfig.base.json`, `knip.json`,
   `package.json` et `bun.lock` sous `.cmz/create-module-transactions/` ; le
   générateur lit exclusivement un snapshot immuable de ces octets, jamais le
   fichier externe après la planification ;
3. publie atomiquement les targets Angular correspondant exactement au `kind` au
   moyen du moteur de publication durable existant ;
4. reconstruit le plan depuis les `project.json` réellement publiés et exige
   exactement une racine, les identités Nx attendues et le tag `scope:<module>`
   ;
5. calcule puis applique des transformations syntaxiques ciblées : une
   contrainte Nx dans `eslint.config.mjs` et les aliases attendus dans
   `tsconfig.base.json`, sans reformater les autres octets ;
6. exécute `bun install`, les checks de noms, targets et dépendances, build et
   lint sur les projets exacts, exige que le graphe Nx contienne exactement tous
   les `project.json` Git visibles et que l’arbre généré soit canonique
   Prettier, puis termine par `bun install --frozen-lockfile` ;
7. supprime le journal seulement après tous les succès.

Le hash de propriété de la sortie est calculé sur l’inventaire Git canonique
(fichiers suivis et non suivis non ignorés). Les liens de workspaces créés par
Bun sous des `node_modules` ignorés ne peuvent donc ni modifier la preuve ni
être suivis. Un `SIGKILL` laisse un état `planned`, `generated` ou `configured`
validable et reprenable. Une erreur normale restaure automatiquement sortie,
configurations et lockfile. Le rollback valide la propriété puis renomme
atomiquement la sortie dans le journal avant de l’effacer ; une dérive
extérieure ambiguë conserve le journal au lieu d’écraser le travail.

## Retrait — `tools/retire-module.mjs`

```bash
node tools/retire-module.mjs --module <nom> [--dry-run] \
  [--historical-reference <chemin>::<occurrence-sha256>::<raison>] \
  [--active-reference <chemin>::<occurrence-sha256>::<raison>]
node tools/retire-module.mjs --finalize --module <nom>
node tools/retire-module.mjs --resume --module <nom>
node tools/retire-module.mjs --abort --module <nom>
```

Le retrait :

1. construit un plan déterministe depuis l’inventaire Git `apps/`/`libs/` et le
   tag Nx exact `scope:<module>` ; aucun préfixe de dossier ne sélectionne un
   projet ;
2. refuse les métadonnées ambiguës, les entrées Git spéciales, les liens non
   ignorés et tout conteneur mélangeant plusieurs scopes ;
3. exige une fermeture entrante vide dans le graphe Nx complet et dans toutes
   les sources Git visibles hors des racines retirées ;
4. déplace les racines par renommage sous
   `.cmz/retire-module-transactions/<module>/removed/`, avec journal atomique et
   hash de chaque fichier ou lien en tant qu’objet, sans suivre sa cible ;
5. retire structurellement les attaches de configuration. ESLint et les paths
   TypeScript sont transformés via l’AST TypeScript ; `knip.json` et
   `package.json` ne sont réécrits que si une entrée exacte est réellement
   supprimée ; le journal contient les hashes de l’état initial et de l’état
   nettoyé exact, de sorte qu’une reprise ou un abort refuse toute troisième
   version ;
6. relance les checks de noms/dépendances, puis régénère **toujours** `bun.lock`
   avec `bun install` parce que le graphe des workspaces a changé, même si le
   `package.json` racine est identique ;
7. exige ensuite `bun install --frozen-lockfile`, un graphe Nx post-retrait
   complet et valide, et la preuve indépendante d’absence d’orphelins ;
8. ne détruit la sauvegarde transactionnelle qu’après le succès final.

Le couple ajout/retrait des attaches ESLint et TypeScript est testé comme une
inversion octet pour octet. `--abort` restaure également `bun.lock` et le
tombstone à leur état initial, mais refuse d’écraser une configuration ou un
tombstone qui ne correspond à aucun hash journalisé. Le hash du tombstone créé
est persisté avant l’effacement de la transaction. `--finalize` ne sert qu’à
reprendre une preuve externe échouée ; le chemin nominal enchaîne toutes les
phases.

## Preuve d’orphelins — `tools/check-no-orphan-references.mjs`

```bash
node tools/check-no-orphan-references.mjs --module <nom>
node tools/check-no-orphan-references.mjs --module <nom> \
  --update-tombstone docs/architecture/removed-modules/<nom>.json \
  --active-reference <chemin>::<occurrence-sha256>::<raison>
```

Le check inspecte sans filtre d’extension tous les fichiers suivis et tous les
fichiers non suivis non ignorés, y compris dotfiles, corpus, lockfiles, contenus
binaires et UTF-16. Il cherche les formes kebab, snake, camel et Pascal,
contrôle les liens sans les suivre et échoue fermé si Git ou une entrée de
l’inventaire est illisible.

Une référence conservée est approuvée par occurrence, jamais par fichier. Son
identité SHA-256 lie le chemin, la position logique, le motif, le match, la
ligne et le contexte. La syntaxe est obligatoirement :

```text
chemin::occurrence-sha256::raison
```

Le tombstone canonique `docs/architecture/removed-modules/<module>.json`
conserve ces identités et leur catégorie (`historical` ou `active`). Une seconde
occurrence dans le même fichier, un déplacement, une modification de contexte,
un ID périmé ou une classification dupliquée échoue. Les anciennes allowlists de
fichier entier sont interdites. Les tombstones canoniques sont validés comme
preuves structurées puis sortis du corpus lexical afin qu’un registre ne crée
pas récursivement des références dans un autre registre. Tout autre fichier, y
compris `corpus/`, reste scanné sans filtre d’extension.

L’actualisation conserve uniquement les identités encore exactes et exige une
classification explicite pour chaque occurrence nouvelle. Elle abandonne les
identités périmées seulement dans ce mode dédié et remplace le fichier si son
hash initial est toujours inchangé ; une évolution concurrente fait échouer
l’opération.

Après un retrait réussi, `retire-module` exécute automatiquement
`check-removed-module-tombstones.mjs --prune-stale`. Cette réconciliation
supprime uniquement les identités devenues périmées, conserve toutes les
occurrences encore exactes et échoue si une nouvelle occurrence non classifiée
apparaît. `--resume` enchaîne également la finalisation lorsqu’un retrait est
déjà dans l’état `awaiting-finalize` : aucune seconde commande manuelle n’est
requise dans le chemin nominal.

Si une unique définition canonique
`tools/generator-platform/sources/*.definition.json` possède exactement le
`feature.id` retiré, elle reste la preuve déclarative historique du projet. Le
script valide sa structure et inscrit séparément chaque occurrence exacte dans
le tombstone ; cette règle ne blanchit ni le reste du fichier ni aucun autre
fichier. Le tombstone bloque ensuite toute recréation implicite.

## Gates permanentes

`bun run check:retire-module` exécute les tests unitaires, adversariaux,
transactionnels et le cycle création→retrait, puis valide tous les tombstones
committés. Cette gate fait partie de `check:all`.
