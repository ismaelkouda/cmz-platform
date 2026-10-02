# C5 ADAPT-11a — références durables de vue de données

- **Statut :** intention produit approuvée ; reconstruction déterministe soumise
  à revue technique
- **Autorité :** `presentation-only` après fusion d'ADAPT-11a
- **Page :** `page_6666666666666666`
- **Route :** `/settings-security/users`
- **Date :** 2026-10-02
- **Décision source :**
  [ADR-0078](../../../../docs/adr/0078-vues-de-donnees-par-capacites-optionnelles.md)

## 1. But du lot

Ce dossier rend durables les six intentions visuelles validées pendant la revue
de la vue de données C5. Les PNG originaux dépassent le plafond de 1 Mo et sont
conservés localement dans un répertoire ignoré ; ils ne pouvaient donc pas
devenir une autorité Git fiable.

La reconstruction conserve les décisions produit :

- recherche à gauche et actions globales à droite ;
- ordre `Créer`, `Rafraîchir`, `Exporter`, `Filtres` ;
- raccourcis de filtres synchronisés sous les en-têtes ;
- colonne `Actions` optionnelle, fixe et distincte du contenu défilant ;
- panneau de filtres superposé à droite, borné entre les en-têtes et le rail de
  défilement ;
- dernière donnée défilante arrêtée avant `Actions`, ou avant le panneau quand
  celui-ci est ouvert ;
- mêmes principes en fenêtres `medium` et `expanded`.

## 2. Ressources publiables

| Classe     | Capacité                   | PNG                                              | Viewport    |  Octets | SHA-256                                                            |
| ---------- | -------------------------- | ------------------------------------------------ | ----------- | ------: | ------------------------------------------------------------------ |
| `expanded` | filtres ouverts            | `expanded-filter-workspace.proposed.png`         | 1484 × 1060 | 193 173 | `575ff6852a78f87fdd71fc410d431bce21fcd93862350c8c8d78b5bca48d956b` |
| `expanded` | actions, filtres fermés    | `expanded-row-actions.proposed.png`              | 1484 × 1060 | 202 433 | `74ad0b3cf192e83b8449d02833e3daab1494a24255c6cda6a027046a3282366f` |
| `expanded` | actions et filtres ouverts | `expanded-row-actions-with-filters.proposed.png` | 1484 × 1060 | 200 739 | `2d7469accf8168355e0211ea297dc7dd5bed2cdd35162089a95572fab26800a9` |
| `medium`   | filtres ouverts            | `medium-filter-workspace.proposed.png`           | 1448 × 1086 | 177 681 | `5bef46e5dbd63f9ba53a616dd36dd9d7bcd7fa19419fa60870dbc4d8bf40ef82` |
| `medium`   | actions, filtres fermés    | `medium-row-actions.proposed.png`                | 1448 × 1086 | 203 125 | `1765b15cabc9dc4faefe6949820a7c16035bf7b6ebe68741c4f2fe9d134e1675` |
| `medium`   | actions et filtres ouverts | `medium-row-actions-with-filters.proposed.png`   | 1448 × 1086 | 192 198 | `eed7ca5124e0e9900796aa219e9f0aa6861ffb0ac745f56663744095fc22a8ec` |

Chaque PNG reste très inférieur au plafond bloquant de 1 Mo.

| Source reproductible   | Octets | SHA-256                                                            |
| ---------------------- | -----: | ------------------------------------------------------------------ |
| `mockup.proposed.html` | 28 493 | `2b35e6a51d0892a7b5129749d1706ffe4d24648eb309833b1b13e930412bdf6d` |
| `render.mjs`           |  2 691 | `a57e2213393943611ef5e1885609c377ad65af6aac821c34f0e02e6f73e75330` |

Le rendu utilise Playwright `1.62.1`, Chromium verrouillé, le ratio de pixel
`1`, le mode clair, les animations désactivées et les dimensions exactes
ci-dessus. Un second rendu indépendant a reproduit les six empreintes à
l'identique.

## 3. Matrice déterministe

Le HTML ne reçoit que deux paramètres fermés :

| PNG                                              | `layout`   | `mode`           |
| ------------------------------------------------ | ---------- | ---------------- |
| `expanded-filter-workspace.proposed.png`         | `expanded` | `filters`        |
| `expanded-row-actions.proposed.png`              | `expanded` | `actions-closed` |
| `expanded-row-actions-with-filters.proposed.png` | `expanded` | `actions-open`   |
| `medium-filter-workspace.proposed.png`           | `medium`   | `filters`        |
| `medium-row-actions.proposed.png`                | `medium`   | `actions-closed` |
| `medium-row-actions-with-filters.proposed.png`   | `medium`   | `actions-open`   |

La régénération exige volontairement la variable
`CMZ_WRITE_PRESENTATION_REFERENCES=1` afin qu'un test ou une consultation ne
réécrive jamais implicitement les autorités visuelles.

## 4. Correspondance avec les validations locales

Les six originaux approuvés restent préservés sous
`__screenshots__/users-management-proof/adapt8e-design-review/`. Leurs hashes
sont consignés dans
[`data-view-capabilities-cmz-backoffice-2026-10-01.md`](../../../../docs/architecture/data-view-capabilities-cmz-backoffice-2026-10-01.md).

| Original local                           | Reconstruction durable                           |
| ---------------------------------------- | ------------------------------------------------ |
| `adapt8e-expanded-v7.png`                | `expanded-filter-workspace.proposed.png`         |
| `adapt8e-expanded-actions-closed-v1.png` | `expanded-row-actions.proposed.png`              |
| `adapt8e-expanded-actions-open-v1.png`   | `expanded-row-actions-with-filters.proposed.png` |
| `adapt8e-medium-v7.png`                  | `medium-filter-workspace.proposed.png`           |
| `adapt8e-medium-actions-closed-v1.png`   | `medium-row-actions.proposed.png`                |
| `adapt8e-medium-actions-open-v1.png`     | `medium-row-actions-with-filters.proposed.png`   |

La reconstruction n'affirme pas une identité de pixels avec les originaux. Elle
matérialise la même intention dans une source lisible, modifiable et rejouable.
Les originaux ne doivent être supprimés qu'après fusion et vérification de la CI
post-fusion d'ADAPT-11a.

## 5. Frontières de preuve

Ces images fixent la composition et les états visibles. Elles ne prouvent pas :

- la sémantique HTML réelle du runtime ;
- la navigation clavier et la restitution du focus ;
- les permissions des actions ;
- l'unicité d'un POST ou d'un rafraîchissement ;
- la synchronisation effective entre raccourcis et panneau ;
- le défilement, le resize ou l'inertie mesurés dans le navigateur produit.

Ces garanties appartiennent aux oracles ADAPT-11b puis à la réalisation
ADAPT-11c. Le HTML de ce dossier n'est ni un composant Angular, ni une primitive
de plateforme, ni une implémentation à copier dans le runtime.

## 6. Refus de revue

Soumaila doit refuser ce lot si :

1. un fichier Angular, un contrat API, un work order ou une dépendance change ;
2. une ressource dépasse 1 Mo ou ne correspond pas au hash déclaré ;
3. le rendu n'est pas reproductible depuis le HTML et le script versionnés ;
4. les références progressives ou de création déjà actives disparaissent ;
5. les trois captures externes non suivies entrent dans le commit ;
6. une ligne, une action ou un filtre devient obligatoire pour toute vue ;
7. ces wireframes sont présentés comme preuve d'accessibilité ou de réseau.

## 7. Suite autorisée

Après revue, fusion et CI post-fusion :

1. ADAPT-11b écrit les oracles futurs de toolbar, actions de ligne, panneau,
   scroll et activation de ligne optionnelle ;
2. les échecs doivent être bornés aux signatures historiques exactes, sans
   `skip` ni `todo` ;
3. ADAPT-11c recalcule ensuite le work order et réalise seulement les capacités
   C5 demandées ;
4. DATA-VIEW-1 reste différé jusqu'à un second cas indépendant.
