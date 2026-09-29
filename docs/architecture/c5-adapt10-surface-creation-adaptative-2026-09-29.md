# C5 ADAPT-10 — surface de création adaptative

- **Statut :** décision produit approuvée le 2026-09-29 ; revue technique du lot
  documentaire requise
- **Périmètre :** placement, dimensionnement, focus, validation et cycle réseau
  du formulaire de création C5
- **Hors périmètre :** runtime dans ce lot, filtres ADAPT-8, contrat API,
  primitive générique, dépendance UI
- **Décision structurante :**
  [ADR-0076 accepté](../adr/0076-surface-creation-adaptative-bornee-par-contenu.md)

## 1. Pourquoi ce chantier est séparé

Le filtre et la création peuvent partager une silhouette — header, corps, footer
— sans partager leur comportement. Un filtre progressif `medium`/`expanded` est
non modal et manipule un brouillon réversible. Une création engage un
formulaire, une validation et un POST ; elle doit isoler la tâche et protéger
les valeurs saisies.

ADAPT-10 ne modifie donc pas ADAPT-8. Il remplace uniquement la décision de
placement historique du formulaire C5 et garde le runtime inchangé tant que les
références et les oracles ne sont pas approuvés.

## 2. Audit factuel du runtime actuel

La page Angular 22.0.7 utilise déjà Signal Forms et possède de bons invariants :

- modèle unique conservé pendant l'ouverture ;
- contrôles désactivés pendant le POST ;
- erreur email distante rendue inline et globalement ;
- brouillon conservé après erreur ;
- succès suivi d'une fermeture, d'un refresh de liste et d'un retour du focus ;
- resize sans requête et permission de création fail-closed.

Les écarts avec la décision approuvée sont précis :

1. le tiroir est étroit, pleine hauteur et à une colonne partout ;
2. `expanded` rend la création persistante et comprime la liste ;
3. `expanded` ne possède ni modalité, ni focus trap, ni fermeture par `Escape` ;
4. le panneau entier défile au lieu de séparer header, corps et footer ;
5. le DOM place `Prénom` avant `Nom` ;
6. le header montre un texte `Fermer` redondant ;
7. le bouton `Créer` est désactivé quand le formulaire est invalide, ce qui
   empêche la soumission de révéler et focaliser la première erreur ;
8. aucun abandon de brouillon modifié n'est confirmé ;
9. les tests et anciennes références imposent encore cette géométrie historique.

Le lot de décision ne corrige aucun de ces écarts. Il les transforme en critères
de preuve, puis les oracles devront d'abord échouer pour leur cause exacte sur
`main`.

## 3. Anatomie commune et géométrie propre à la création

La surface survole la liste sans modifier ses colonnes, son viewport ou son
`scrollLeft`. Le fond visible devient inerte. Le dialogue contient :

```text
┌ Créer un utilisateur                         × ┐  header fixe
│ Tous les champs sont obligatoires.             │
├────────────────────────────────────────────────┤
│ Nom                 Prénom                     │
│ Email                                          │  corps seul scrollable
│ Téléphone           Profil                     │
├────────────────────────────────────────────────┤
│ Annuler                                 Créer   │  footer fixe
└────────────────────────────────────────────────┘
```

Le contenu détermine la taille naturelle, puis la fenêtre impose ses bornes. La
surface ne conserve pas artificiellement `100dvh` quand le formulaire tient dans
moins d'espace. Si le contenu dépasse la hauteur utile, seul le corps défile.

### Compact

- task sheet ancrée en bas et pleine largeur ;
- une seule colonne ;
- hauteur naturelle jusqu'à la hauteur disponible ;
- header et footer restent visibles avec clavier virtuel et safe area ;
- aucun scroll horizontal à 320 CSS px ou à 200 % de zoom.

### Medium

- dialogue latéral droit superposé au workspace ;
- une colonne pour C5 ;
- largeur candidate C5 de 520 à 640 px, réduite si l'espace utile l'exige ;
- aucune compression de la liste sous-jacente.

### Expanded

- dialogue levité centré dans le viewport, toujours modal ;
- deux colonnes au maximum ;
- largeur candidate C5 de 640 à 760 px ;
- `Email` occupe les deux colonnes ;
- repli immédiat en une colonne si la largeur réellement utile ne permet plus
  les labels, erreurs et contrôles sans collision.

Les valeurs doivent être éprouvées par les références, le zoom et les
frontières. Elles ne sont ni des tokens universels, ni des seuils dérivés d'un
type d'appareil.

Le placement change volontairement entre `medium` et `expanded`. À droite,
`medium` garde une relation spatiale avec le déclencheur sans manquer de
largeur. Au centre, `expanded` rend explicite qu'il s'agit d'une tâche modale et
non du panneau de filtres intégré au tableau. Ce changement de géométrie ne doit
jamais recréer le formulaire : seule sa présentation change.

## 4. Ordre, champs et extensibilité

L'ordre canonique unique est :

1. Nom ;
2. Prénom ;
3. Email ;
4. Téléphone ;
5. Profil.

Il reste identique dans le DOM, la navigation clavier, les messages d'erreur et
la disposition visuelle. Le deux-colonnes est un mapping explicite du contrat de
présentation C5 : `Nom | Prénom`, `Email` pleine largeur, `Téléphone | Profil`.

Le moteur ne doit pas appliquer une grille `auto-fit` à tout formulaire. Une
future page pourra choisir d'autres spans après décision de présentation.
Au-delà de deux colonnes, ou lorsqu'un formulaire devient long, multi-étapes ou
fortement dépendant, une route dédiée est préférée à l'agrandissement illimité
du dialogue.

## 5. États et interactions à rendre visibles

### Vierge

- focus initial sur `Nom` ;
- fermeture directe par croix, `Annuler` ou `Escape` ;
- retour du focus sur le déclencheur.

### Invalide

- `Créer` reste activable hors POST ;
- la soumission n'émet aucun POST ;
- tous les champs concernés deviennent touchés ;
- le premier champ invalide reçoit le focus ;
- chaque erreur est textuelle, associée à son contrôle et annoncée.

### Brouillon modifié

- croix, `Annuler` et `Escape` ouvrent la même confirmation d'abandon ;
- poursuivre restaure le focus dans le formulaire ;
- abandonner ferme et restitue le focus au déclencheur ;
- la confirmation elle-même respecte la modalité et ne détruit pas le brouillon.

### Soumission

- une seule requête peut être en vol ;
- les actions incompatibles sont indisponibles sans perdre les valeurs ;
- l'état est perceptible et annoncé sans déplacer arbitrairement le focus.

### Conflit email

- le message apparaît sous `Email` et dans une annonce globale ;
- `Email` reçoit le focus ;
- nom, prénom, téléphone et profil restent inchangés ;
- corriger puis resoumettre est possible sans rouvrir la surface.

### Succès

- fermeture du dialogue ;
- exactement un reset/refresh de la liste selon sa projection active ;
- notification de succès ;
- retour du focus au déclencheur de création.

## 6. Matrice de preuve minimale

| Preuve                      | Compact | Medium | Expanded |
| --------------------------- | :-----: | :----: | :------: |
| état vierge                 |    ✓    |   ✓    |    ✓     |
| ordre et géométrie          |    ✓    |   ✓    |    ✓     |
| modalité et retour focus    |    ✓    |   ✓    |    ✓     |
| resize avec brouillon       |    ↔    |   ↔    |    ↔     |
| invalidation sans POST      |    ✓    |   ✓    |    ✓     |
| conflit email conservé      |    ✓    |   ✓    |    ✓     |
| soumission mono-vol         |    ✓    |   ✓    |    ✓     |
| hauteur courte / zoom       |    ✓    |   ✓    |    ✓     |
| clavier virtuel / safe area |    ✓    |   —    |    —     |
| liste non redimensionnée    |    ✓    |   ✓    |    ✓     |

Une capture ne prouve ni le réseau, ni le focus, ni l'inertie. Les références
servent à approuver l'intention visuelle ; Playwright, tests Angular et
inspection DOM prouvent les comportements.

## 7. Points de refus de la revue

Soumaila doit refuser un lot ultérieur si :

1. `expanded` redevient non modal ou redimensionne la liste ;
2. une classe de fenêtre recrée le formulaire ou ses contrôles ;
3. le resize perd une valeur, une erreur, le focus ou déclenche le réseau ;
4. header ou footer défile hors de portée ;
5. le dialogue introduit un scroll horizontal à 320 CSS px ou à 200 % ;
6. l'ordre DOM diffère de l'ordre visuel ;
7. un submit invalide déclenche un POST ou ne focalise pas la première erreur ;
8. une erreur distante efface le brouillon ;
9. un double clic produit deux créations ou un succès plusieurs refreshs ;
10. `aria-modal` est posé sans inertie réelle et focus borné ;
11. le filtre et la création sont forcés dans un composant partagé prématuré ;
12. une largeur C5 est promue en constante universelle ;
13. une dépendance UI, le contrat API ou le work order change dans un lot de
    décision ou de référence ;
14. les trois captures tierces non suivies sont committées.

## 8. Séquence de réalisation

1. **ADAPT-10a** : faire relire et fusionner la présente décision et ADR-0076.
2. **ADAPT-10b** : produire des références déterministes Compact, Medium et
   Expanded couvrant état vierge, invalide, conflit email, soumission et clavier
   compact.
3. **ADAPT-10c** : obtenir l'approbation produit puis publier exactement les
   octets approuvés ; superséder les anciennes autorités de création.
4. **ADAPT-10d** : écrire les oracles comportementaux en échec attendu strict
   sur l'interface historique, sans `skip` ni runtime modifié.
5. **ADAPT-10e** : recalculer le work order depuis le nouveau `main`, modifier
   seulement les fichiers autorisés et convertir les échecs en succès réels.
6. **ADAPT-10f** : produire les captures navigateur réelles, faire relire les
   octets finaux, fusionner et vérifier la CI post-fusion.

ADAPT-8d reste un chantier indépendant : décider la création ne termine pas les
oracles du panneau de filtres.

## 9. Références

- [ADR-0076 accepté](../adr/0076-surface-creation-adaptative-bornee-par-contenu.md)
- [ADR-0072 — UI adaptative](../adr/0072-ui-adaptative-guidee-par-m3-et-apis-officielles.md)
- [Entrée externe C5](./c5-entree-externe-gestion-utilisateurs-2026-09-25.md)
- [ADAPT-8 — filtres progressifs](./c5-adapt8-filtres-progressifs-desktop-medium-2026-09-29.md)
- [Material 3 — canonical layouts](https://m3.material.io/foundations/layout/canonical-examples/overview)
- [Material 3 — dialogs](https://m3.material.io/components/dialogs/guidelines)
- [Angular Material — dialog](https://material.angular.dev/components/dialog/overview)
- [Angular CDK — accessibility](https://material.angular.dev/cdk/a11y/overview)
- [WAI-ARIA APG — modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [WCAG — reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow)
- [WCAG 2.2 — error identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification)
