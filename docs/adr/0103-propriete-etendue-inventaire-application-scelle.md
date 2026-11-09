# ADR-0103 — Propriété étendue : inventaire d'application scellé et mis à jour sous plan

- **Statut :** Accepted
- **Date :** 2026-11-09
- **Décideur produit :** Ismael, propriétaire de `cmz-platform` (principe validé
  le 2026-11-09 : « extension du modèle de propriété validée, avec une ADR »)
- **Complète :**
  [ADR-0102](./0102-atelier-reutilisable-et-preuves-independantes.md) pour le
  produit extérieur ; ne remplace aucune décision.

## Contexte

Un produit extérieur créé par `create-app --target-root` appartient à l'atelier
fichier par fichier. `verifyWorkspaceRoot` exige que chaque `apps/<app>` soit
exactement l'inventaire `generated_files` de son `.cmz/app-manifest.json`. Le
premier fichier qu'un générateur ajouterait après la coque rend donc le produit
« étranger », et toute commande extérieure suivante est refusée.

Deux faits fixent le problème :

1. `.cmz/app-manifest.json` est **déjà** le registre des fichiers possédés d'une
   application. Un second registre dupliquerait cet inventaire.
2. Ce registre n'est scellé par rien. Il est lu dans le produit et ajouté à
   l'inventaire depuis lui-même. Un manifeste édité à la main, qui liste un
   fichier ajouté avec sa bonne empreinte, passe aujourd'hui tous les contrôles.
   « Rien n'est adopté en silence » est donc un objectif, pas un acquis.

Les incréments suivants (commandes, lectures, composition, réalisation de page)
doivent publier des fichiers dans une application existante et remplacer de
façon déclarée ses pages d'attente. Ils ont besoin d'une seule primitive sûre,
réutilisée par tous.

Contrainte : l'atelier ne garde aucun état sur un produit, et le produit n'a
aucun secret. Tout contrôle que l'atelier exécute peut être recalculé par
quelqu'un qui lit son code.

## Options envisagées

### Option A — Registre de publications séparé (`.cmz/publications/`)

- Avantages : historique lisible, une entrée par publication.
- Inconvénients : duplique `generated_files` ; deux sources de vérité ; ne ferme
  pas l'auto-déclaration du manifeste existant.

### Option B — Sceaux des applications dans le marqueur d'espace

- Avantages : un seul fichier racine scelle toutes les applications.
- Inconvénients : le marqueur et l'application changent dans deux transactions
  distinctes ; une interruption laisse un état incohérent. `workspace_id`
  changerait à chaque publication, alors qu'il est l'identité stable du produit.
  Aucun gain de solidité : le marqueur est lui aussi un fichier du produit.

### Option C — Fichier de sceaux à la racine du produit

- Avantages : le marqueur et `workspace_id` restent stables.
- Inconvénients : même problème de double transaction ; un sceau supprimé ramène
  silencieusement à l'état non scellé.

### Option D — Manifeste d'application scellé et publié avec l'application

- Avantages : registre unique ; le sceau et les fichiers changent dans la même
  transaction de répertoire ; `workspace_id` reste stable ; un sceau absent ou
  retiré est refusé.
- Inconvénients : un format de manifeste propre au mode extérieur.

## Décision

Option D. En mode extérieur seulement, `apps/<app>/.cmz/app-manifest.json` porte
un bloc `ownership` :

- `workspace_id` du produit ;
- `shell_tree_sha256` : l'empreinte de l'inventaire créé par `create-app` ;
- `publications` : la liste ordonnée des publications acceptées. Chacune donne
  son `plan_id`, son outil et, par fichier, `added` ou `replaced`, avec octets
  et empreinte ; un remplacement garde aussi l'empreinte d'avant ;
- `seal_sha256` : l'empreinte canonique de tout le manifeste, ce champ excepté.

`create-app --target-root` écrit ce bloc avec une liste de publications vide.
Une nouvelle primitive, `planApplicationPublication` puis
`publishApplicationPublication`, est la **seule** voie pour changer l'inventaire
d'une application extérieure.

À chaque commande extérieure, `verifyWorkspaceRoot` exige pour chaque
application :

1. un bloc `ownership` présent, lié au `workspace_id` du produit ;
2. un sceau égal au recalcul ;
3. un inventaire expliqué par ses publications : en annulant les publications de
   la dernière à la première, on retrouve exactement `shell_tree_sha256` ;
4. des publications dans leurs zones ;
5. un arbre égal à l'inventaire, octet pour octet, comme aujourd'hui.

Zones d'une publication :

- **ajout** : sous `src/app/generated/`, ou sous `src/app/pages/<page>/` pour
  une page dont le contrat `.cmz/pages/<page>.json` est dans l'inventaire ;
- **remplacement** : un fichier de coque sous `src/app/pages/<page>/`, ou un
  fichier ajouté par une publication antérieure ;
- tout le reste est refusé : configurations, session, routes, `.cmz/`, contrats
  de page, et toute suppression.

La publication suit le modèle de `create-app` : plan relu obligatoire
(`expectedPlanId`), verrou, plan recalculé sous verrou, candidat complet au même
niveau que l'application, compilation par les binaires du produit, échange
atomique de répertoires, puis build, lint, tests, `check-workspace` et poids des
sources. En cas d'échec, l'arbre précédent est restauré seulement si le nouvel
arbre est encore exactement celui du plan. Une publication interrompue est
reprise sous verrou. Le plan lie l'espace, l'installation, le manifeste courant
(sceau compris), l'outil et chaque fichier publié.

## Justification

L'option D ferme la faille constatée : modifier `generated_files` sans
recalculer le sceau, retirer le sceau, ajouter un fichier non expliqué par une
publication ou sortir des zones sont tous refusés. Elle garde une seule source
de vérité et une seule transaction par publication. Elle ne change ni le
marqueur, ni `workspace_id`, ni le mode atelier.

**Ce que le sceau ne fait pas.** Sans secret ni état extérieur, un acteur qui
reproduit délibérément le calcul du sceau peut forger un manifeste cohérent. Le
sceau empêche l'adoption **par erreur ou en silence**, par un outil ou par une
modification partielle. La forge délibérée reste visible dans le Git du produit,
où `.cmz/app-manifest.json` change, et relève de la revue. Le LLM qui réalise
une page n'y a pas accès : son bon de travail limite les fichiers qu'il peut
écrire.

## Conséquences

### Positives

- Les générateurs extérieurs (commandes, lectures, composition, réalisation)
  publient par une seule primitive, avec les mêmes garanties que la coque.
- La page d'attente est remplacée de façon déclarée, avec son empreinte d'avant.
- L'historique des publications est lisible dans le produit.

### Négatives / dette acceptée

- **Rupture pour les produits existants :** une application extérieure créée
  avant cette décision n'a pas de sceau et sera refusée. Il faut la recréer.
  Aucune adoption automatique n'est proposée, car elle rouvrirait la faille.
- Le format du manifeste diffère entre le mode atelier et le mode extérieur.
- Aucune suppression de fichier n'est possible ; elle exigera une décision
  distincte.
- Les zones produit à la racine (par exemple `.github/` ou l'état des bons de
  travail) restent refusées ; elles seront décidées avec leur premier usage.

### Points à réévaluer

- Si un produit doit être protégé contre une forge délibérée, il faudra un
  ancrage extérieur (signature, Git protégé, registre distant).
- Si la liste des publications devient longue, l'annulation complète à chaque
  commande pourra être remplacée par un point de contrôle scellé.

## Références

- `tools/generator-platform/core/application-workspace.mjs`
  (`verifyWorkspaceRoot`)
- `tools/generator-platform/core/application-ownership.mjs`
- `tools/generator-platform/core/application-publication.mjs`
- `docs/architecture/external-application-creation.md`
