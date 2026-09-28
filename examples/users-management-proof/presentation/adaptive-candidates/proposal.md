# C5 ADAPT-4 — proposition de composition adaptative

- **Statut :** Approved — décision produit, revue et fusion de la PR #124
- **Autorité :** `presentation-only` après publication par ADAPT-4b
- **Page :** `page_6666666666666666`
- **Route :** `/settings-security/users`
- **Date de production :** 2026-09-28

## 1. Objet et frontière du lot

Ce dossier rend simultanément comparables les trois compositions demandées par
l'audit ADAPT-2 : `compact`, `medium` et `expanded`. Il ne modifie ni la page
Angular, ni un contrat API, ni la composition `list-query` + `action-request`,
ni les dépendances UI.

Les PNG sont des wireframes basse fidélité approuvés après décision humaine. Les
SVG sont leurs sources éditables et déterministes. Aucun de ces fichiers n'est
une baseline Chromium, une implémentation accessible ou une preuve de
comportement. Le porteur produit a approuvé la disposition, le FAB compact et la
conservation de `updated_at`. Soumaila a ensuite approuvé le commit exact
`292c1debbdaa9bb56a2f14a5062fa6830ac8c5b9` et fusionné la PR #124 dans le commit
`3b8e3d60cef66afd528a5bd8869c55f9efeffe13`. Les 17 contrôles de la PR et la CI
post-fusion sont verts. ADAPT-4b peut donc lier les PNG exacts au manifeste
`presentation-evidence` ; les SVG restent des sources éditables sans autorité
runtime.

## 2. Ressources approuvées

| Classe     | Fichier PNG                    | État                              | Viewport    |  Octets | SHA-256                                                            |
| ---------- | ------------------------------ | --------------------------------- | ----------- | ------: | ------------------------------------------------------------------ |
| `compact`  | `compact-ready.proposed.png`   | liste `ready`, création fermée    | 390 × 844   |  48 279 | `18a08587a9ef143540287d273ae89ea55c4b3f27ec95b1d5486e3dec3c843b07` |
| `medium`   | `medium-create.proposed.png`   | création ouverte, liste conservée | 1024 × 768  |  66 545 | `50d6cb12140ce3a55edea0459540cace6569af77494b641f339a74d8162c2252` |
| `expanded` | `expanded-create.proposed.png` | création ouverte, liste conservée | 1440 × 1024 | 100 767 | `b2216c0fb5e0b6647ffb49e5d24dce5db1e37ff6394ed0f3c1711bcd8c8462f9` |

| Source SVG                     | Octets | SHA-256                                                            |
| ------------------------------ | -----: | ------------------------------------------------------------------ |
| `compact-ready.proposed.svg`   |  3 940 | `58c431cf0b0400a2e9e0174fe695621321bc86ee0a0c87b17b2181b4fba052a2` |
| `medium-create.proposed.svg`   |  5 787 | `2fa6e881cdef51b23857db002ea7ce7e76a1b00ff8036a34b68df4d7d83da9f5` |
| `expanded-create.proposed.svg` |  6 526 | `cf751d018e4d1aae955be71b686b6c3217bde25867e9378ae6b0d0ac55148fca` |

Les identités et adresses sont synthétiques ; `example.invalid` est réservé aux
exemples. Les PNG ont été rendus depuis les SVG avec Playwright `1.62.1`, le
Chromium local verrouillé et les viewports indiqués. Deux rendus consécutifs
doivent conserver les mêmes empreintes avant soumission.

## 3. Décisions approuvées, classe par classe

### 3.1 `compact` — liste prioritaire et FAB étendu

- La recherche reste toujours visible ; les filtres secondaires restent sous le
  disclosure déjà réalisé et ne perdent pas `Appliquer` ou `Effacer`.
- L'action unique de création devient un FAB **étendu et libellé**, ancré au
  scaffold. Elle n'est ni dupliquée dans le heading, ni réduite à une icône.
- Le contenu réserve l'espace inférieur et la safe area : pagination, carte et
  focus ne peuvent pas être recouverts par le FAB.
- La création continue d'ouvrir une tâche plein écran modale ; le wireframe
  `ready` ne redessine pas cet état déjà couvert par la référence historique.
- `updated_at` apparaît en information secondaire sur la carte. La proposition
  choisit la parité conservatrice plutôt qu'une perte silencieuse par rapport au
  tableau.

La création est la seule action d'écriture du brief C5 et peut donc être
confirmée comme action principale de cette vue. Sa fréquence ne découle pas du
verbe `create`. L'approbation produit de ce candidat signifie explicitement que
la création doit rester disponible pendant le défilement **pour C5 seulement**.
Elle ne crée jamais une règle de générateur `create -> FAB`.

### 3.2 `medium` — side sheet temporaire et modal

- La liste reste le contexte principal et demeure visible derrière un backdrop,
  mais elle est inerte tant que la création est ouverte.
- Le panneau de 480 px est temporaire, prend le focus, borne la tabulation,
  accepte `Échap` et restitue ensuite le focus à l'unique déclencheur.
- Le bouton du heading visible sous le backdrop n'est pas une seconde action
  active : le futur DOM reste unique et l'arrière-plan modal est inerte.
- La hauteur de 768 px garde les champs et actions opérables. Une hauteur trop
  faible doit conserver cette modalité et permettre le scroll interne ; elle ne
  doit pas forcer deux panes exigus.

Le wireframe exprime une sémantique de dialogue, pas le choix automatique de
`MatDrawer` ou `MatDialog`. Angular Material/CDK restent soumis à leur adoption
explicite.

### 3.3 `expanded` — panneau persistant sans modalité

- La liste et la tâche de création sont placées côte à côte avec une proportion
  proche de 70/30, des minima et maxima de contenu et un gutter stable.
- Il n'existe ni backdrop, ni arrière-plan inerte, ni `aria-modal`, ni piège de
  focus. Liste, filtres, pagination et formulaire restent tous opérables.
- L'action de création n'est pas dupliquée dans le heading pendant que le
  panneau est ouvert. La fermeture/annulation restitue un point de focus
  logique.
- Les filtres se réorganisent d'après la largeur du pane principal, et non la
  largeur totale de la fenêtre.
- La largeur utile est bornée ; l'ultra-wide n'étire pas indéfiniment le tableau
  ou les champs.

Le seuil initial `>= 1200px` reste une hypothèse de contenu à calibrer. Il n'est
ni une détection d'appareil ni une copie des classes Android en pixels CSS.

## 4. Invariants communs à la future réalisation

1. Une seule composition, une seule query, une seule action et un seul
   formulaire survivent aux changements de classe.
2. Un resize ne produit aucun GET, POST, reset, invalidation ou perte d'état.
3. Une action interactive n'existe qu'une fois dans le DOM ; le layout la
   repositionne ou change son mode sans créer un double contrôle caché.
4. Le mode temporaire est modal ; le mode persistant ne l'est jamais.
5. Filtres, page, résultats, valeurs, erreurs, soumission et focus sont
   conservés pendant `compact -> medium -> expanded -> compact`.
6. `updated_at` reste présent dans les trois projections tant qu'une décision
   produit explicite ne le classe pas comme enrichissement non essentiel.
7. L'autorisation `users.create` gouverne la présence de l'action et du panneau
   dans chaque classe ; un wireframe n'accorde aucun droit.
8. Aucun élément fixe ou sticky ne masque le contenu ou le focus, conformément à
   WCAG 2.2 SC 2.4.11.

## 5. Ce que l'approbation a décidé — et n'a pas décidé

L'approbation produit de ce dossier a décidé pour C5 :

- création visible au scroll en compact via un FAB étendu ;
- conservation de `updated_at` dans les cartes ;
- tâche modale temporaire en `medium` ;
- tâche persistante non modale en `expanded`.

Elle n'a pas décidé :

- une règle universelle de générateur ou un breakpoint universel ;
- l'adoption d'Angular Material ;
- les pixels finaux, les animations ou la baseline visuelle ;
- les contrats métier, endpoints, payloads, permissions ou erreurs ;
- la conformité accessibilité, qui exige encore des oracles runtime.

## 6. Points contrôlés par Soumaila

La revue devait refuser le lot si l'une des conditions suivantes n'était pas
claire dans les trois images et ce dossier :

1. le FAB compact peut recouvrir un résultat, la pagination ou un focus ;
2. `updated_at` disparaît silencieusement d'une projection ;
3. le panneau `medium` paraît persistant ou laisse l'arrière-plan opérable ;
4. le panneau `expanded` paraît modal ou réduit la liste sous son minimum ;
5. une action de création paraît dupliquée ;
6. le changement de classe suppose une recréation des opérations métier ;
7. une valeur Android en `dp` est traitée comme un pixel Web imposé ;
8. le dossier prétend valider l'accessibilité par l'image seule.

La revue technique a confirmé la cohérence et la réalisabilité. Elle ne remplace
pas la décision produit explicite déjà donnée sur le FAB et `updated_at`.

## 7. Suite autorisée après publication ADAPT-4b

1. régénérer depuis `main` un work order content-addressed qui reçoit les trois
   sources ;
2. écrire d'abord les oracles de modalité, focus, resize, permission,
   non-recouvrement et absence de réseau ;
3. vérifier l'échec attendu de ces oracles sur `main` ;
4. seulement alors modifier les cinq fichiers Angular autorisés ;
5. exécuter la matrice fonctionnelle, accessibilité et resize ;
6. produire des captures du vrai navigateur, les faire relire, puis calibrer la
   baseline dans un lot séparé.

## 8. Références officielles

- [Material 3 — FAB](https://m3.material.io/components/floating-action-button/overview)
- [Material 3 — canonical layouts](https://m3.material.io/foundations/layout/canonical-examples/overview)
- [Android — canonical layouts](https://developer.android.com/develop/adaptive-apps/guides/canonical-layouts)
- [Android — supporting pane](https://developer.android.com/develop/adaptive-apps/guides/build-a-supporting-pane-layout)
- [Android — adaptive do's and don'ts](https://developer.android.com/develop/adaptive-apps/guides/adaptive-dos-and-donts)
- [Angular Material — sidenav](https://material.angular.dev/components/sidenav/overview)
- [Angular Material — dialog](https://material.angular.dev/components/dialog/overview)
- [W3C — Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum)
- [ADR-0072](../../../../docs/adr/0072-ui-adaptative-guidee-par-m3-et-apis-officielles.md)
- [Audit ADAPT-2](../../../../docs/architecture/c5-adapt2-audit-placement-multifenetre-2026-09-28.md)
