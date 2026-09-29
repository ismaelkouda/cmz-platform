# ADR-0074 — Filtres progressifs par blocs actifs sur fenêtres medium et expanded

- **Statut :** Proposed
- **Date :** 2026-09-29

## Contexte

ADR-0073 a établi un état unique `draft`/`applied`, un side sheet modal en
fenêtre `medium` et un supporting pane non modal en fenêtre `expanded`. Sa
réalisation C5 affiche actuellement les contrôles secondaires en sections
métier. Cette organisation est lisible avec trois critères, mais occupe tout le
panneau quand le contrat en fournit une dizaine ou davantage.

Trois captures tierces fournies le 2026-09-29 montrent une autre interaction :
le panneau commence par `Ajouter un filtre`, permet de rechercher un champ,
puis matérialise chaque critère choisi dans un bloc indépendant. Les captures
servent uniquement à observer ce parcours. Elles ne sont ni une preuve produit,
ni une licence, ni un actif à publier dans le dépôt.

## Options envisagées

### Option A — Conserver tous les contrôles directement visibles

- avantage : accès immédiat lorsque les critères sont peu nombreux ;
- limites : densité croissante, défilement important et mauvaise capacité à
  représenter quinze critères sans transformer le panneau en long formulaire.

### Option B — Reproduire entièrement le panneau et la grille de la référence

- avantage : beaucoup de fonctions disponibles immédiatement ;
- limites : recherche globale, filtres de colonnes, panneau avancé, regroupement
  et choix des colonnes se concurrencent ; adoption implicite d'une dépendance
  Enterprise ; complexité et accessibilité disproportionnées pour C5.

### Option C — Conserver les conteneurs C5 et introduire un filtre progressif

- avantage : le même contenu s'insère dans le side sheet `medium` et le pane
  `expanded`, tandis que seuls les critères utiles occupent de la place ;
- limite : ajout, suppression, ordre, focus et distinction brouillon/appliqué
  demandent des oracles supplémentaires.

## Décision proposée

**Option C.** Le compact conserve le parcours à deux niveaux d'ADR-0073. Sur
`medium` et `expanded`, le corps du panneau devient une composition progressive
de critères :

1. les critères présents dans le brouillon sont affichés sous forme de blocs ;
2. `Ajouter un filtre` ouvre un sélecteur recherchable quand le volume le
   justifie ;
3. le sélecteur ne propose que les critères fournis par le contrat de
   présentation et non encore présents, sauf répétition explicitement permise ;
4. choisir un critère ajoute son bloc et place le focus sur son premier contrôle
   sans effectuer de requête ;
5. chaque bloc peut être replié ou supprimé sans requête ;
6. `Réinitialiser` et `Appliquer` restent dans le footer fixe défini par
   ADR-0073.

Un bloc actif est une représentation du **brouillon** dans le panneau. Il ne
doit jamais être présenté comme appliqué avant `Appliquer`. Hors du panneau, les
chips restent la représentation compacte des seuls filtres réellement
appliqués.

Le nombre de critères ne déclenche pas seul cette présentation dans le moteur
générique. Une page simple peut garder des champs directs ; une page dense peut
recevoir le profil progressif après décision de conception explicite. C5 sert à
prouver ce profil, pas à le rendre universel.

## Anatomie obligatoire d'un bloc

Chaque bloc expose :

- le libellé métier stable du critère ;
- un résumé de la valeur brouillon lorsque le bloc est replié ;
- un vrai bouton d'expansion avec `aria-expanded` et `aria-controls` ;
- un vrai bouton de suppression portant le nom du critère ;
- le contrôle typé fourni par le contrat : texte, booléen, choix, date, nombre
  ou référence distante ;
- le message de validation associé au contrôle, lorsqu'il existe.

Le bloc n'embarque ni tri, ni opérateur `ET/OU`, ni comparaison avancée si le
contrat ne les définit pas. L'ordre visuel est stable. Une erreur ouvre le bloc
concerné ; un filtre déjà appliqué puis modifié reste identifiable comme
modification brouillon sans annoncer une nouvelle valeur appliquée.

## Comportement adaptatif

### Medium

- le contenu vit dans le side sheet modal existant, borné à `420–480px` ;
- le panneau recouvre la liste au lieu de la comprimer ;
- backdrop, arrière-plan inerte, focus borné, Échap et restitution du focus
  restent obligatoires ;
- header et footer sont fixes, la pile de blocs défile seule.

### Expanded

- le même contenu vit dans le supporting pane persistant `360–440px` ;
- la liste conserve sa largeur minimale et reste opérable ;
- aucun backdrop, `aria-modal` ou piège de focus n'est permis ;
- si la largeur utile devient insuffisante, le conteneur repasse en mode
  temporaire sans recréer les blocs ni émettre de requête.

Les seuils sont déterminés par la largeur utile de la liste et du panneau, pas
par un nom d'appareil. Les valeurs C5 ne deviennent pas des constantes du
générateur.

## Invariants

- un seul état `draftFilters` et un seul ensemble de contrôles traversent
  `medium ↔ expanded` ;
- ajout, édition, repli, suppression brouillon, reset et resize émettent zéro
  requête ;
- `Appliquer` produit au plus un GET et remet la pagination à la première page ;
- fermer le side sheet sans appliquer abandonne le brouillon ;
- les chips extérieures ne reflètent jamais une valeur brouillon ;
- le sélecteur de champs ne révèle aucun paramètre absent du contrat ;
- un filtre distant ne charge pas une liste non bornée et prévoit chargement,
  vide, erreur et recherche serveur lorsque le contrat l'exige ;
- aucun contrôle de filtre n'est dupliqué ou seulement caché lors d'un resize ;
- la recherche principale reste distincte et visible hors du panneau ;
- le tableau ne reçoit ni tri local, ni regroupement, ni choix de colonnes sans
  capacité métier et backend explicite.

## Conséquences

### Positives

- une dizaine ou une quinzaine de critères n'occupe plus l'espace tant qu'ils
  ne sont pas utilisés ;
- les critères actifs et leurs erreurs sont localisés visuellement ;
- Medium et Desktop partagent le même modèle sans partager la modalité ;
- la mise en page reste compatible avec un backend Spring Boot, Laravel, .NET,
  Django ou autre, car elle dépend du contrat canonique et non du framework.

### Négatives et coût assumé

- la page C5 exige de nouvelles preuves de présentation et de nouveaux oracles
  avant modification du runtime ;
- la gestion du focus est plus riche qu'un formulaire statique ;
- les filtres directs restent préférables sur certaines pages simples ;
- aucune primitive partagée ne sera extraite avant un second cas réel.

## Non-décisions

- aucune adoption d'AG Grid ou d'une autre bibliothèque de grille ;
- aucune copie de son style ou de ses captures ;
- aucun changement du parcours compact ;
- aucun tri, groupement, export, édition de cellule ou sélection de colonnes ;
- aucun seuil universel imposé à toutes les pages ;
- aucune synchronisation URL ou vue enregistrée sans besoin produit.

## Preuves exigées avant réalisation

1. références visuelles propres au dépôt pour `medium` et `expanded` ;
2. revue humaine de la densité, de l'ordre et des états vide/actif/erreur ;
3. oracles navigateur écrits avant le runtime et échouant pour la cause attendue
   sur `main` ;
4. absence de GET pendant le travail sur le brouillon ;
5. un GET maximum à l'application et à la suppression d'une chip appliquée ;
6. focus correct après ajout, repli, suppression, fermeture et resize ;
7. preuve à quinze critères synthétiques sans inventer de contrat métier C5 ;
8. zoom `200%`, hauteur courte, clavier seul et lecteur d'écran ;
9. largeur minimale de la liste préservée et footer toujours opérable ;
10. inspection des octets finaux par revue humaine avant fusion.

## Références

- [ADR-0073 — panneau unique et état brouillon](./0073-filtrage-adaptatif-par-panneau-unique.md)
- [AG Grid — Tool Panels](https://www.ag-grid.com/angular-data-grid/tool-panel/)
- [AG Grid — New Filters Tool Panel](https://www.ag-grid.com/javascript-data-grid/tool-panel-filters-new/)
- [AG Grid — filtrage serveur groupé](https://www.ag-grid.com/angular-data-grid/server-side-model-filtering/)
- [AG Grid — accessibilité](https://www.ag-grid.com/angular-data-grid/accessibility/)
- [Material 3 — side sheets](https://m3.material.io/components/side-sheets/overview)
- [Material 3 — canonical layouts](https://m3.material.io/foundations/layout/canonical-examples/overview)
- [Angular Material — sidenav](https://material.angular.dev/components/sidenav/overview)

