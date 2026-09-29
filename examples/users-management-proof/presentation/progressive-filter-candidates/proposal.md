# C5 ADAPT-8b — recherche et filtres intégrés au tableau

- **Statut :** Approved — validation produit du 2026-09-29
- **Autorité :** `presentation-only` après publication par ADAPT-8c
- **Page :** `page_6666666666666666`
- **Route :** `/settings-security/users`
- **Date :** 2026-09-29
- **Décision source :**
  [ADR-0074](../../../../docs/adr/0074-filtres-progressifs-par-blocs-actifs.md)

## 1. Résultat matérialisé

Le lot représente une seule surface de travail tabulaire :

- la recherche combinée se trouve dans la barre interne du tableau, à gauche du
  bouton `Filtres` ;
- le panneau s'ouvre sous cette barre, à droite et au-dessus des colonnes ;
- la largeur des colonnes ne change pas ;
- le bord gauche du panneau fixe la limite droite visible du viewport et du rail
  horizontal ;
- une seconde ligne d'en-tête expose des raccourcis uniquement pour les
  paramètres réellement supportés par C5 ;
- le footer `Réinitialiser / Filtrer` reste fixe pendant que les blocs défilent.

Les captures externes ayant inspiré le parcours restent non suivies et ne sont
pas incluses dans ce lot.

## 2. Ressources candidates

| Classe     | État              | PNG                                      | Viewport    | Octets | SHA-256                                                            |
| ---------- | ----------------- | ---------------------------------------- | ----------- | -----: | ------------------------------------------------------------------ |
| `medium`   | aucun filtre      | `medium-empty.proposed.png`              | 1024 × 768  | 51 217 | `a6e2b73b149b06c7090c0d03b2fc02f89aaf0960ec3af13fd924ae746e9e0a01` |
| `medium`   | un filtre         | `medium-one-filter.proposed.png`         | 1024 × 768  | 59 877 | `efc918c2341aafa00d289afc8ec98eacea01b30eb41ef5b492db14eb629d7cbd` |
| `medium`   | plusieurs filtres | `medium-multiple-filters.proposed.png`   | 1024 × 768  | 59 512 | `24f4e8829ec742cbf61862cf050a9d96c20b057ba30a39d09116f18ca804dd8c` |
| `expanded` | aucun filtre      | `expanded-empty.proposed.png`            | 1440 × 1024 | 68 000 | `16a60e4b488dcf8a91eea59bda7606c07c4f4986d99bcd89c69bd10ceee86fd3` |
| `expanded` | un filtre         | `expanded-one-filter.proposed.png`       | 1440 × 1024 | 71 582 | `a3dadbb9196022d680fb2649ee126a2030f99730e2ace7a7516dd730114725e8` |
| `expanded` | plusieurs filtres | `expanded-multiple-filters.proposed.png` | 1440 × 1024 | 71 484 | `36143bf636ac40dcf2c03a6d4d55bfe3418d5c869f8a712c118c3003bc6be5a5` |

| Source SVG                               | Octets | SHA-256                                                            |
| ---------------------------------------- | -----: | ------------------------------------------------------------------ |
| `medium-empty.proposed.svg`              |  4 703 | `31f91e2f3004f6f115f9a8422575268722b4870a55923dbd3cde1f7eb6dc6c02` |
| `medium-one-filter.proposed.svg`         |  5 235 | `45fd1b7577611b3dc09a61d731ae042e5baafce6c38869db936b7df79088767b` |
| `medium-multiple-filters.proposed.svg`   |  5 783 | `2641273d6518c93469500f103b062166362ae874d58d65aeb01d611369d66f31` |
| `expanded-empty.proposed.svg`            |  5 053 | `88877c7f32c512d39783a642aa8c4879aa2b342917705ec26d458438448213cd` |
| `expanded-one-filter.proposed.svg`       |  5 589 | `731c55196068fc79dc6c77b8e88ebebd4ba201f19ee9b4c0492d9d032aa7efeb` |
| `expanded-multiple-filters.proposed.svg` |  6 139 | `571d6de48115c87442f007817f8bbd282b837e5064128f56db4f3be0777caec6` |

Un second rendu Chromium indépendant reproduit les six PNG à l'identique, octet
par octet.

## 3. Raccourcis contractuels

Le contrat C5 ne permet pas un filtre indépendant pour chaque colonne.

| Zone ou colonne      | Paramètre        | Projection candidate                   |
| -------------------- | ---------------- | -------------------------------------- |
| Nom, prénom et email | `search` combiné | recherche dans la barre du tableau     |
| Profil               | `profile`        | select sous le titre `Profil`          |
| Rôle                 | `role`           | select sous le titre `Rôle`            |
| Statut               | `is_active`      | select sous le titre `Statut`          |
| Mise à jour          | aucun            | cellule volontairement non interactive |

Les colonnes sans paramètre individuel ne reçoivent ni contrôle décoratif, ni
filtre local appliqué seulement à la page courante.

## 4. Un état, plusieurs projections

Les contrôles de colonnes représentent les valeurs **appliquées**. Les blocs du
panneau représentent les valeurs du **brouillon** :

- dans l'état `un filtre`, le raccourci affiche `Inactif`, tandis que le bloc
  montre la modification brouillon `Actif` ;
- dans l'état `plusieurs filtres`, les raccourcis montrent `Rôle = Agent` et
  `Statut = Actif`, tandis que `Profil B` est seulement marqué `AJOUTÉ` dans le
  brouillon ;
- la recherche, les raccourcis, les chips et le panneau devront être des
  projections du même modèle, jamais quatre moteurs indépendants.

## 5. Interactions proposées pour les futurs oracles

- `Entrée` dans la recherche applique `search`, remet la pagination à `1` et
  émet au plus un GET ;
- changer `Profil`, `Rôle` ou `Statut` applique immédiatement le raccourci,
  remet la pagination à `1` et émet au plus un GET ;
- ouvrir le panneau copie l'état appliqué vers le brouillon sans réseau ;
- manipuler les blocs reste silencieux ;
- `Filtrer` publie le brouillon en une fois et émet au plus un GET ;
- fermer sans filtrer abandonne le brouillon ;
- ouvrir, fermer, scroller ou redimensionner n'émet aucun GET.

## 6. Contraintes de superposition

- le tableau conserve ses largeurs de colonnes et son `scrollLeft` ;
- seul son viewport visible s'arrête au bord gauche du panneau ;
- les contrôles recouverts ne restent pas atteignables au clavier ;
- le panneau ne recouvre jamais la barre recherche/`Filtres` ;
- la ligne des raccourcis reste alignée avec les titres pendant le scroll
  horizontal ;
- le corps du panneau défile indépendamment du footer.

## 7. Refus de la revue

La proposition doit être refusée si :

1. la recherche revient au-dessus ou en dehors du tableau ;
2. un champ individuel apparaît sous `Nom`, `Prénom`, `Email` ou `Mise à jour`
   sans nouveau contrat backend ;
3. un raccourci possède un état distinct du panneau et des chips ;
4. une valeur brouillon apparaît comme déjà appliquée ;
5. le tableau filtre localement la seule page reçue du serveur ;
6. l'ouverture du panneau redimensionne les colonnes ou perd le scroll ;
7. un contrôle masqué derrière le panneau reste focusable ;
8. une dépendance AG Grid est ajoutée implicitement ;
9. les captures externes sont committées ;
10. ces images sont présentées comme preuve runtime ou accessibilité.

## 8. Suite autorisée après validation produit

1. publier les empreintes exactes dans le manifeste — ADAPT-8c en cours ;
2. écrire les oracles de géométrie, état partagé, focus, réseau et scroll —
   ADAPT-8d ;
3. constater leur échec exact sur `main` ;
4. recalculer le work order et réaliser le runtime borné — ADAPT-8e ;
5. produire les captures du vrai navigateur, faire relire, fusionner et vérifier
   la CI post-fusion — ADAPT-8f.

## 9. Références

- [Décision ADAPT-8](../../../../docs/architecture/c5-adapt8-filtres-progressifs-desktop-medium-2026-09-29.md)
- [ADR-0074](../../../../docs/adr/0074-filtres-progressifs-par-blocs-actifs.md)
- [AG Grid — Floating Filters](https://www.ag-grid.com/javascript-data-grid/floating-filters/)
- [AG Grid — Quick Filter](https://www.ag-grid.com/javascript-data-grid/filter-quick/)
- [AG Grid — Server-side filtering](https://www.ag-grid.com/javascript-data-grid/server-side-model-filtering/)
