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

`commitDirectoryTransaction` (`generation-transaction.mjs`) n'est pas réutilisé
pour l'échange : il place l'arbre précédent dans `previous`, à côté du candidat.
Pour un candidat au niveau de `apps/`, ce nom pourrait être celui d'une
application, et il échapperait au motif toléré et ignoré par Git des répertoires
de travail. La publication garde donc ses deux répertoires nommés par le plan et
sa propre reprise.

## Décision

Option D. En mode extérieur seulement, `apps/<app>/.cmz/app-manifest.json` porte
un bloc `ownership` :

- `workspace_id` du produit ;
- `shell_tree_sha256` : l'empreinte de l'inventaire créé par `create-app` ;
- `publications` : la liste ordonnée des publications acceptées. Chacune donne
  son `plan_id`, son outil et, par fichier, `added` ou `replaced`, avec octets
  et empreinte ; un remplacement garde aussi l'empreinte d'avant ;
- `seal_sha256` : l'empreinte canonique de tout le manifeste, ce champ excepté.

Les outils admis forment une liste fermée : `compile:page-execution-plan` (X3),
`generate:action-request`, `generate:list-query`, `generate:page-composition` et
`page-realization`.

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
sources. En cas d'échec, l'arbre mis de côté revient toujours, même si l'échange
s'est arrêté entre ses deux renommages : l'application n'est jamais laissée
absente. Le nouvel arbre n'est déplacé que s'il est encore exactement celui du
plan ; sinon tout reste en place. Le plan lie l'espace, l'installation, le
manifeste courant (sceau compris), l'outil et chaque fichier publié.

Une publication interrompue laisse `apps/.<app>.publication-candidate-<plan>` ou
`apps/.<app>.previous-candidate-<plan>`. Tant que l'un d'eux existe,
`verifyWorkspaceRoot` refuse **toute autre commande extérieure** sur le produit
: un arbre dont les contrôles n'ont pas fini n'est adopté par aucune commande.
Seules passent la reprise explicite
`recover:application-publication --target-root <absolu> --app <app>`
(`recoverApplicationPublication`), qui prend le verrou de l'application, et la
publication relue de cette même application, qui reprend d'abord. La reprise
annule l'état interrompu s'il est exact ; sinon elle le refuse comme ambigu et
conserve tout pour une inspection locale. Sans plan, la reprise explicite ne
retire qu'un candidat complet selon son propre manifeste ; un candidat partiel
n'est retiré que par la publication relue du même plan. Une publication en cours
sur une autre application rend ce cas transitoirement ambigu : il suffit de
relancer après elle. En cas de refus, la commande nomme le premier écart, en
chemin relatif au produit ; plusieurs sauvegardes ou candidats pour la même
application sont toujours refusés. La reprise ne vérifie que la cohérence de
chaque arbre avec son propre manifeste : elle ne revérifie ni l'appartenance à
l'espace (`workspace_id`) ni la racine. Un arbre mis de côté forgé mais cohérent
serait remis en place ; c'est la forge que cette décision exclut déjà.

L'exception de reprise est un second paramètre interne (`recoveringApp`) de
fonctions exportées. Un oracle statique de
`external-application-recovery.test.mjs` limite son usage aux modules du
planificateur d'espace, de la vérification de la racine et de la publication.
Cet oracle est lexical : il repère le **mot** dans les `.mjs` de `tools/`, pas
la propriété. Il rend visible en revue toute extension du passe-droit ; une
construction délibérée du nom l'éviterait, ce qui relève de la forge déjà
exclue.

## Justification

L'option D ferme la faille constatée : modifier `generated_files` sans
recalculer le sceau, retirer le sceau, ajouter un fichier non expliqué par une
publication ou sortir des zones sont tous refusés. Elle garde une seule source
de vérité et une seule transaction par publication. Elle ne change ni le
marqueur, ni `workspace_id`, ni le mode atelier.

**Ce que le sceau ne fait pas.** Le sceau empêche l'adoption **par erreur ou en
silence**, par un outil ou par une modification partielle. Il n'authentifie rien
:

- **la forge est bon marché.** Sans secret ni état extérieur, le calcul est
  public : `computeOwnershipSeal` est une fonction exportée de l'atelier. Écrire
  le fichier, l'inventaire, un enregistrement en zone légale et appeler cette
  fonction suffit, en quelques lignes. Le test « limite connue » de
  `external-application-publication.test.mjs` montre qu'une telle forge passe ;
- **`tool` et `plan_id` sont déclaratifs.** Ils ne sont jamais revérifiés après
  coup, et `plan_id` lie une installation qui ne peut pas être recalculée plus
  tard. Le registre enregistre **quels octets** ont été publiés et dans quelles
  zones, pas **quel outil** les a produits ; l'historique est une trace, pas une
  preuve ;
- **la visibilité dans le Git du produit est une hypothèse.** Elle suppose un
  produit versionné et relu, ce que l'atelier ne vérifie pas ;
- **le `check-workspace` du produit ne vérifie pas le sceau.** Il contrôle les
  empreintes de `generated_files`. La CI du produit accepte donc un manifeste
  édité à la main ; seule une commande de l'atelier le refuse.

Le LLM qui réalisera une page n'aura pas accès au manifeste (X4) : son bon de
travail limitera les fichiers qu'il peut écrire. Pour la réalisation de page, la
barrière est ce bon de travail, la relecture du diff, et deux mécanismes qui ne
dépendent pas du réalisateur (X4-sécurité) : les commandes du produit confinées,
et la politique de sécurité de contenu de la coque.

## Conséquences

### Positives

- Les générateurs extérieurs (commandes, lectures, composition, réalisation)
  publient par une seule primitive, avec les mêmes garanties que la coque.
- La page d'attente est remplacée de façon déclarée, avec son empreinte d'avant.
- L'historique des publications est lisible dans le produit.

### Négatives / dette acceptée

- **Rupture pour les produits existants :** une application extérieure créée
  avant cette décision n'a pas de sceau et sera refusée, ainsi que toute
  commande extérieure sur son produit. Pour la recréer : supprimer `apps/<app>`
  dans le produit (le marqueur d'espace ne liste pas les applications, rien
  d'autre à changer), puis relancer `create-app --target-root`. Aucune adoption
  automatique n'est proposée, car elle rouvrirait la faille.
- **Une commande à la fois par produit** est supposée : le verrou est par
  application, alors que `verifyWorkspaceRoot`, `check-workspace` et le contrôle
  de poids lisent tout le produit. Une publication en cours est visible par ses
  répertoires de travail et bloque les autres commandes, mais deux commandes
  lancées ensemble ne sont pas sérialisées.
- **Création de coque interrompue (X0), limite connue :** `create-app` publie la
  coque par `commitDirectoryTransaction`, sans répertoire de travail après la
  publication. Si le processus s'arrête après cette publication et avant la fin
  des contrôles natifs, l'application est en place, scellée et exacte, mais rien
  ne signale que ses contrôles n'ont pas fini : les autres commandes
  l'acceptent. Relancer le même `create-app --expect-plan <plan_id>` reprend et
  termine ces contrôles. Fermer cette fenêtre demande un marqueur durable propre
  à `create-app`, donc un changement de son protocole de reprise ; ce n'est pas
  fait dans ce lot. Avant la publication, un candidat
  `apps/.<app>.external-candidate-<plan>` abandonné est toléré en silence par
  les autres commandes : l'application reste absente pour elles, et la relance
  du même `create-app` reprend ce candidat.
- **Texte seulement :** la primitive lit et écrit du texte UTF-8. Un actif
  binaire (icône, image) exigera une extension.
- Le format du manifeste diffère entre le mode atelier et le mode extérieur.
- Aucune suppression de fichier n'est possible ; elle exigera une décision
  distincte. Conséquence : une sortie renommée (par exemple une commande dont
  l'identifiant change) laisse son ancien répertoire et ses entrées de registre
  ; une suppression sous plan est à décider dans un incrément ultérieur.
- Les zones produit à la racine (par exemple `.github/` ou l'état des bons de
  travail) restent refusées ; elles seront décidées avec leur premier usage.
- **Page réalisée (X4) :** le répertoire d'une page déclarée,
  `src/app/pages/<page>/`, est admis comme préfixe couvert, en plus de
  `src/app/generated/**`. La page d'attente y est remplacée par l'outil
  `page-realization` ; le bon de travail est publié sous `generated/`, le
  brouillon du réalisateur reste hors de l'application, dans `descriptions/`.
- **Sécurité de la page réalisée (X4-sécurité) :** toute commande lancée dans le
  produit (compilateur, build, lint, tests, contrôle d'espace) tourne dans le
  bac à sable des oracles du mode atelier (`runConfined`, profil `execution`) :
  aucun réseau, environnement propre, HOME jetable, lecture limitée au produit,
  écriture limitée aux caches. La coque Angular extérieure génère sa politique
  de sécurité de contenu (`src/index.html` et
  `deploy/content-security-policy.conf`), possédée et scellée ;
  `connect-src 'self'` suit la topologie à une seule origine retenue par le
  propriétaire. La coque ne se republie pas : un produit créé avant X4-sécurité
  ne reçoit la politique qu'en recréant son application, comme ci-dessus.
- **Aucune dépendance entre publications dans la primitive :** une commande
  republiée ne sait pas, par le registre seul, quelles pages la consomment. Les
  outils l'exposent eux-mêmes : `generate:action-request` nomme les pages dont
  le plan publié référence son modèle (`dependent_pages`), et les commandes de
  page refusent un plan devenu périmé. Une page réalisée y est marquée
  (`realization: true`) : son bon de travail est à préparer à nouveau.

### Points à réévaluer

- Si un produit doit être protégé contre une forge délibérée, il faudra un
  ancrage extérieur (signature, Git protégé, registre distant).
- Si la liste des publications devient longue, l'annulation complète à chaque
  commande pourra être remplacée par un point de contrôle scellé.

## Références

- `tools/generator-platform/core/application-workspace-root.mjs`
  (`verifyWorkspaceRoot`)
- `tools/recover-application-publication.mjs`
- `tools/generator-platform/core/application-ownership.mjs`
- `tools/generator-platform/core/application-publication.mjs`
- `docs/architecture/external-application-creation.md`
