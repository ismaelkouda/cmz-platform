# C5 ADAPT-6b — proposition visuelle des filtres adaptatifs

- **Statut :** historique — rejeté comme référence courante le 2026-09-30
- **Autorité :** `historical-only`, absente du manifeste actif après PRES-AUTH-1
- **Page :** `page_6666666666666666`
- **Route :** `/settings-security/users`
- **Date de production :** 2026-09-28
- **Décision source :**
  [ADR-0073](../../../../docs/adr/0073-filtrage-adaptatif-par-panneau-unique.md)

> **Correction d'autorité du 2026-09-30 :** le porteur produit rejette
> explicitement l'ensemble du dossier `filter-candidates/` comme référence
> courante. L'approbation et les empreintes de 2026-09-28 restent ci-dessous
> uniquement comme trace historique. Aucun fichier de ce dossier ne peut guider
> un nouveau work order ou une réalisation. PRES-AUTH-1 retire du manifeste les
> identifiants `compact-filter-summary` et `compact-filter-detail`. Le dossier
> distinct `progressive-filter-candidates/` n'est pas concerné par cette
> correction.

## 1. Objet et frontière

Ce lot matérialise la décision ADAPT-6a avant toute modification du runtime. Il
permet de relire ensemble le bottom sheet `compact`, le side sheet `medium` et
le supporting pane `expanded`.

Quatre images sont nécessaires pour trois classes de fenêtre : le parcours
`compact` comporte un sommaire et un détail qui se remplacent dans le **même**
bottom sheet. Une seule capture mobile aurait laissé cette transition
essentielle sans preuve visuelle.

Le lot ne modifie :

- ni la page Angular ;
- ni les contrats `list-query`, `action-request` ou de composition ;
- ni les endpoints, paramètres, options, permissions ou erreurs métier ;
- ni le manifeste `presentation-evidence`, réservé aux ressources approuvées ;
- ni les dépendances de l'application.

Les captures tierces ayant nourri la discussion ne sont ni copiées ni
versionnées. Les SVG sont des créations déterministes propres au dépôt. Le
porteur produit a approuvé leur disposition, puis Soumaila a approuvé le commit
exact `81dd77e3633eada14fc1940f4a0c1cb4338aec87`. La PR #130 a été fusionnée
dans `9b1792c9afbb31c906c69af9068a6d2e498ca043` et la CI post-fusion
`36471376072` est verte. ADAPT-6c peut donc publier les PNG exacts ; les SVG
restent des sources éditables sans autorité runtime.

## 2. Ressources approuvées

| Classe     | Fichier PNG                          | État                               | Viewport    | Octets | SHA-256                                                            |
| ---------- | ------------------------------------ | ---------------------------------- | ----------- | -----: | ------------------------------------------------------------------ |
| `compact`  | `compact-filter-list.proposed.png`   | sommaire du bottom sheet           | 390 × 844   | 34 192 | `6dc0b706dd0fcf2526d489a0ce63533a60de4ad1f70ea946d01c27a990753e44` |
| `compact`  | `compact-filter-detail.proposed.png` | détail `Statut` dans le même sheet | 390 × 844   | 32 034 | `7d8bf42fa6c0a828e77c9b60f7da5cc6d33140dbffb7d7b9ffa8a22340049719` |
| `medium`   | `medium-filters.proposed.png`        | side sheet modal                   | 1024 × 768  | 61 384 | `222a9fdf6b0117af68362e854dc21f86b7b53d294dd97d9e4482e9de130ed8e0` |
| `expanded` | `expanded-filters.proposed.png`      | pane persistant non modal          | 1440 × 1024 | 88 132 | `6154ffcd008ad3ccdd4d1c52388fcc612b93a9940d51f0e6fe3f5ee5c8180c3c` |

| Source SVG                           | Octets | SHA-256                                                            |
| ------------------------------------ | -----: | ------------------------------------------------------------------ |
| `compact-filter-list.proposed.svg`   |  3 503 | `fcb26980df02b189f1a26131d1aa93c3d36746e47929869adf8a4f7926b75d29` |
| `compact-filter-detail.proposed.svg` |  3 306 | `1df2f1fec1e03a927364a90226b2f21edc4b45e0d6dc5a7b64f059984a42a04a` |
| `medium-filters.proposed.svg`        |  4 615 | `d2a5be8ea638d1d9b9749fac9bcfcc55773c5f56ef01da11e6b532b5a01d230e` |
| `expanded-filters.proposed.svg`      |  5 555 | `601ef8af3cb0caf606da93ae294cc015e8d522734a1484587f0007dba02a8d52` |

Les PNG ont été rendus depuis les SVG avec le Chromium Playwright verrouillé du
workspace, sans ressource distante. Un second rendu indépendant produit des
fichiers identiques octet par octet pour les quatre images.

## 3. Décisions approuvées et rendues visibles

### 3.1 Compact — bottom sheet et navigation interne

- le panneau commence à `y = 169px` et mesure `675px` dans un viewport de
  `844px`, soit moins de `80dvh` ;
- le sommaire montre une ligne activable par filtre avec libellé, valeur
  brouillon et chevron ;
- activer `Statut` remplace uniquement le header et le corps du même panneau ;
- `Retour` conserve le brouillon et revient au sommaire ;
- `Réinitialiser` et `Appliquer` restent dans un footer fixe, côte à côte et
  au-dessus de la safe area ;
- fermer abandonne le brouillon ; ni la sélection, ni Retour, ni Réinitialiser
  ne lancent une requête.

Les radios du dessin expriment un choix unique court. Elles ne prescrivent pas
une bibliothèque ni une implémentation DOM particulière ; les oracles runtime
devront vérifier le pattern accessible réellement choisi.

### 3.2 Medium — side sheet temporaire

- le panneau mesure exactement `480px`, borne haute autorisée par ADAPT-6a ;
- la liste reste visible comme contexte mais reçoit un backdrop et doit devenir
  inerte ;
- les trois critères contractuels sont visibles directement dans une section
  `Essentiels` ;
- le header et le footer restent fixes, seul le corps pourra défiler ;
- fermer sans appliquer doit abandonner le brouillon et restituer le focus au
  déclencheur `Filtres (n)`.

L'image ne prouve ni le focus trap, ni Échap, ni `inert`. Elle rend leur
nécessité non ambiguë ; les tests navigateur en apporteront la preuve.

### 3.3 Expanded — supporting pane persistant

- le pane mesure `424px`, donc reste dans la borne C5 `360–440px` ;
- la liste conserve `896px` de largeur utile et un gutter de `24px` ;
- aucun backdrop n'est présent : liste, pagination, chips et filtres restent
  simultanément opérables ;
- le bouton chevron replie le pane sans effacer l'état ;
- le footer reste dans le pane, sans recouvrir son corps ;
- les chips représentent exclusivement les valeurs déjà appliquées.

Le mode `expanded` demeure conditionné par la largeur **et** la hauteur utiles.
Le visuel ne transforme pas `1200px` en breakpoint universel de plateforme.

## 4. Capacité à environ quinze filtres

Les références n'inventent pas douze critères que le contrat C5 ne fournit pas.
Elles montrent les trois critères réels et un emplacement replié intitulé
`Autres critères contractuels`.

Lorsqu'un futur contrat apporte réellement une quinzaine de champs :

1. trois à cinq critères fréquents restent dans `Essentiels` ;
2. les autres sont répartis par sens métier, jamais par type technique ou
   framework backend ;
3. les sections inactives peuvent être repliées ; une section avec valeur active
   ou erreur s'ouvre automatiquement ;
4. le corps du panneau défile indépendamment ; header et footer restent visibles
   ;
5. le formulaire conserve un seul `draftFilters` quelle que soit la classe de
   fenêtre ;
6. aucune grille horizontale de quinze champs n'est admise au-dessus de la
   liste.

Cette capacité relève de la structure de présentation. Elle n'autorise pas le
générateur à produire des critères, options ou paramètres absents de la
définition métier.

## 5. État, réseau et résumé

- l'ouverture copie `appliedFilters` vers `draftFilters` sans GET ;
- les contrôles écrivent uniquement dans le brouillon ;
- `Réinitialiser` remet le brouillon aux valeurs par défaut sans GET ;
- `Appliquer` valide le brouillon et produit au plus un GET à la page 1 ;
- fermer sans appliquer restaure visuellement les valeurs appliquées ;
- un resize conserve brouillon, valeurs appliquées, focus pertinent et état
  d'ouverture, sans GET ;
- `Filtres (n)` et les chips comptent uniquement les filtres secondaires
  appliqués, jamais les modifications non validées ;
- la recherche principale reste hors du panneau et conserve son comportement
  contractuel existant.

## 6. Ce que l'approbation a décidé — et n'a pas décidé

L'approbation produit a décidé pour C5 :

- la composition visuelle des quatre états ;
- la navigation compacte dans un panneau unique ;
- le placement commun `Réinitialiser` puis `Appliquer` ;
- la modalité temporaire `medium` et la non-modalité `expanded` ;
- le refus d'inventer des champs afin de démontrer artificiellement la densité.

Elle n'a pas décidé :

- la conformité accessibilité ou réseau, qui exige le runtime ;
- une règle universelle pour toutes les applications ;
- l'adoption d'Angular Material ou d'une autre bibliothèque ;
- les animations finales ou une baseline de régression visuelle ;
- un nouvel endpoint, un tri ou une option métier ;
- l'extraction d'un composant partagé avant un second cas réel.

## 7. Points contrôlés par Soumaila

La revue devait refuser le lot si l'un de ces points était ambigu ou faux :

1. le détail compact ressemble à une seconde modale empilée ;
2. le bottom sheet dépasse `80dvh` ou masque ses actions ;
3. Retour semble appliquer, perdre ou réinitialiser le brouillon ;
4. Réinitialiser paraît déclencher immédiatement une requête ;
5. le `medium` paraît non modal ou laisse l'arrière-plan opérable ;
6. l'`expanded` paraît modal, possède un backdrop ou comprime la liste sous son
   minimum ;
7. les chips paraissent refléter le brouillon plutôt que les valeurs appliquées
   ;
8. le dossier invente des filtres, options ou tris absents du contrat ;
9. les images sont présentées comme preuve d'accessibilité ;
10. un pixel C5 est présenté comme une constante universelle du générateur.

## 8. Suite autorisée après publication ADAPT-6c

1. écrire les oracles comportementaux ADAPT-6 et constater leur échec exact sur
   `main` ;
2. régénérer le work order content-addressed depuis ce nouveau `main` ;
3. réaliser uniquement les fichiers autorisés ;
4. exécuter tests Angular, navigateur, accessibilité, géométrie, resize et
   silence réseau ;
5. produire les captures du vrai runtime pour la revue finale.

## 9. Références

- [Décision ADAPT-6a](../../../../docs/architecture/c5-adapt6-filtres-multi-fenetres-2026-09-28.md)
- [ADR-0073](../../../../docs/adr/0073-filtrage-adaptatif-par-panneau-unique.md)
- [Doctrine UI adaptative](../../../../docs/architecture/ui-adaptative-references-officielles.md)
- [Material 3 — side sheets](https://m3.material.io/components/side-sheets/overview)
- [Android — supporting pane](https://developer.android.com/develop/adaptive-apps/guides/build-a-supporting-pane-layout)
- [Angular Material — sidenav](https://material.angular.dev/components/sidenav/overview)
- [WAI-ARIA — dialog modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [WCAG 2.2 — Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum)
