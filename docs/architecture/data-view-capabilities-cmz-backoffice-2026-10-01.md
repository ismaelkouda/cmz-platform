# Exploiter `cmz-backoffice` comme corpus de capacités de vues de données

- **Date :** 2026-10-01
- **Décision :**
  [ADR-0078](../adr/0078-vues-de-donnees-par-capacites-optionnelles.md)
- **Périmètre audité :** `ismaelkouda/cmz-backoffice`, branche `feat/config`
- **Commit distant vérifié :** `f064d1d8e50190cd33e9ace096d51710d2474f2f`
- **Nature :** audit de conception et plan d'exploitation ; aucune copie de
  code, aucune modification du pin `legacy.lock.json`

## 1. Résumé exécutif

Le composant source est utile comme **mémoire de besoins réels**. Il ne doit pas
être réutilisé comme fondation technique.

Sa cinquantaine de consommateurs empêche la plateforme de sur-apprendre la seule
page C5. Ses défauts montrent en parallèle la limite à ne pas franchir : un
composant de table ne doit pas posséder transport, permissions, métier,
formatage, export, sélection, édition et responsive dans la même unité.

La valeur extraite est donc triple :

1. inventaire de capacités déjà rencontrées ;
2. matrice de scénarios pour les futurs oracles ;
3. contre-exemple architectural pour borner la généralisation.

## 2. Méthode et faits observés

L'audit a lu le composant, son template, ses styles, ses sous-composants
d'actions, ses contrats et des usages représentatifs : utilisateurs, sélection
de participants, seuils SLA et workflows.

### 2.1 Surface et fan-in

| Mesure                                  |               Valeur observée |
| --------------------------------------- | ----------------------------: |
| consommateurs `<app-table>`             |                            50 |
| cœur TS + HTML + SCSS                   |                  1 458 lignes |
| cœur + dropdown + barre d'actions       |                  2 013 lignes |
| configurations avec `__index`           |                            58 |
| colonnes `__action`                     |                            21 |
| colonnes `__actionDropdown`             |                            26 |
| colonnes `__selection`                  |                            10 |
| branches métier codées dans le template | 16, hors 4 champs structurels |
| occurrences `any` dans le contrôleur    |                            36 |
| sélecteurs `::ng-deep` dans les styles  |                            66 |
| tests `*.spec.ts` sous `src`            |                             0 |

### 2.2 Vérifications exécutées

- installation figée `bun install --frozen-lockfile` : succès ;
- TypeScript `tsc --noEmit` : succès, car il ne vérifie pas les templates ;
- lint ciblé : zéro erreur, 40 avertissements, principalement `any` ;
- build Angular : abort natif `134` sans diagnostic exploitable dans le sandbox,
  donc non utilisé comme preuve contre le composant ;
- test CI : impossible à démarrer, `karma.conf.js` utilise CommonJS alors que
  `package.json` déclare `type: module` ;
- compilation Angular ad hoc avec `strictTemplates: true` : échec, notamment
  contrat `actions` absent, mode de sélection `saisie` incompatible, input
  `status` requis mais non fourni et `tooltip` absent du type public.

Ces constats n'annulent pas la valeur fonctionnelle du corpus. Ils interdisent
en revanche de présenter le code comme une base réutilisable sûre.

## 3. Capacités extraites

### 3.1 Socle à modéliser en premier

| Capacité                                 | Propriétaire                        | Activation          |
| ---------------------------------------- | ----------------------------------- | ------------------- |
| identité stable de ligne                 | contrat de vue lié au modèle        | explicite           |
| colonnes et valeurs                      | présentation                        | explicite           |
| loading, empty, error, stale             | composition de page                 | explicite           |
| recherche et filtres serveur             | `list-query`                        | selon définition    |
| tri serveur ou local                     | `list-query` + présentation         | par colonne         |
| pagination ou chargement progressif      | `list-query` + stratégie de fenêtre | exclusifs par rendu |
| barre d'actions                          | présentation + `action-request`     | action par action   |
| actions de ligne                         | présentation + `action-request`     | action par action   |
| permissions et raisons d'indisponibilité | port d'autorisation/presenter       | par action          |
| invalidation après succès                | plan de page                        | noms de nœuds       |

### 3.2 Extensions prouvées, mais non nécessaires à tout écran

- sélection simple ou multiple ;
- action collective sur la sélection ;
- lien ou navigation dans une cellule ;
- cellule checkbox ou radio ;
- badge ou statut sémantique ;
- image ou média ;
- copie explicite d'une valeur ;
- détail de ligne par dialogue, panneau ou route ;
- export ;
- édition transactionnelle avec restauration ;
- réordonnancement ;
- grille interactive 2D.

Chaque élément reste absent du runtime tant qu'une définition ne l'active pas.

### 3.3 Capacités non démontrées par le composant source

Le source ne fournit pas réellement de cellule radio générique, de cellule lien
générique ni de détail de ligne générique. Il fournit des indices utiles
(sélection, actions, navigation dans les parents), pas une implémentation à
reprendre.

## 4. Classification d'adoption

| Niveau               | Traitement                             | Exemples                                                    |
| -------------------- | -------------------------------------- | ----------------------------------------------------------- |
| P0 — C5 réel         | oracle puis réalisation locale         | toolbar, actions de ligne, activation optionnelle           |
| P1 — second cas réel | contrat commun puis primitive partagée | sélection, export, cellule interactive                      |
| P2 — différé         | nouvel audit dédié                     | édition en ligne, reorder, média, virtualisation            |
| rejeté               | ne jamais promouvoir                   | champ magique, métier dans la table, tout activé par défaut |

Une première occurrence autorise une réalisation dans la fonctionnalité. Deux
occurrences indépendantes avec les mêmes invariants autorisent la candidature au
design system. Cette règle évite à la fois duplication systématique et
abstraction spéculative.

## 5. Frontières contractuelles

### 5.1 `list-query`

`list-query` décrit :

- source et méthode de lecture ;
- paramètres ;
- forme de réponse et cardinalité prise en charge ;
- pagination ;
- tri et filtres acceptés par le backend ;
- identité des éléments si observable.

Il ne décrit pas la position d'un bouton, un dialogue ou la géométrie desktop.

### 5.2 `action-request`

`action-request` décrit :

- opération et payload ;
- permission ;
- états de soumission ;
- erreur métier ;
- confirmation éventuelle ;
- effets après succès ;
- invalidations nommées.

Il ne décide pas si l'action apparaît inline, dans un menu ou au clic de ligne.

### 5.3 Plan et présentation de page

Le plan relie les identifiants de nœuds. La présentation choisit :

- table, cartes ou liste selon la fenêtre ;
- colonnes visibles ;
- raccourcis de filtre ;
- placement inline ou overflow des actions ;
- activation de ligne ;
- surface de détail éventuelle.

`data-view` reste dans cet audit un terme descriptif de cette composition. Il ne
crée pas une quatrième primitive à côté de `list-query`, `action-request` et
`page-execution-plan`.

## 6. Modèle conceptuel minimal

Le futur contrat devra pouvoir exprimer la forme suivante sans l'imposer dès ce
lot documentaire :

```json
{
    "identity": { "path": "id" },
    "columns": [
        { "id": "index", "renderer": { "kind": "index" } },
        {
            "id": "email",
            "value_path": "email",
            "renderer": { "kind": "text" },
            "sorting": { "mode": "server", "parameter": "email" }
        },
        { "id": "status", "renderer": { "kind": "status" } },
        { "id": "actions", "renderer": { "kind": "actions" } }
    ],
    "row_activation": null,
    "selection": null
}
```

Ce JSON est illustratif. Aucun champ ne devient normatif avant un schéma, des
fixtures positives/négatives et une preuve Angular/React.

## 7. Règles d'interaction non négociables

1. Une ligne sans `row_activation` n'a ni curseur d'action, ni tabindex, ni
   message annonçant une consultation.
2. Une checkbox ou un radio modifie uniquement la sélection.
3. Un lien exécute uniquement sa navigation.
4. Un bouton ou menu exécute uniquement son `action-request`.
5. Les contrôles internes ne propagent pas l'activation de ligne.
6. Une ligne activable possède un nom accessible et une commande clavier
   déterministe.
7. Le détail peut être absent même si la ligne contient beaucoup de champs ; la
   décision appartient à la fonctionnalité.
8. Inversement, le nombre de champs ne suffit pas seul à imposer un dialogue :
   fréquence, comparaison, sécurité et tâche utilisateur comptent aussi.

## 8. Table sémantique ou grille interactive

| Besoin                                    | Rendu recommandé                        |
| ----------------------------------------- | --------------------------------------- |
| lecture avec quelques boutons/liens       | table HTML ; contrôles dans le flux Tab |
| tri/filtre d'en-tête                      | table HTML avec boutons et `aria-sort`  |
| édition ou navigation cellule par cellule | Angular Aria Grid en Angular            |
| forte densité et virtualisation mesurée   | évaluation data-grid séparée            |

Ajouter `role=grid` seul est interdit : le W3C exige alors focus composite et
navigation avec les flèches, Home/End et cas d'édition. Le composant source est
un précédent utile précisément parce qu'il rend visible cette erreur.

## 9. Matrice d'oracles cible

| Scénario            | Oracle minimal                                               |
| ------------------- | ------------------------------------------------------------ |
| lecture simple      | sémantique table, headers, empty/loading/error               |
| toolbar partielle   | ordre, permission, disabled reason, absence des autres       |
| actions de ligne    | action correcte, pas de double déclenchement                 |
| overflow            | menu clavier, focus restitué, action identifiable            |
| ligne non activable | aucun tabindex/cursor/handler implicite                      |
| ligne activable     | souris, Enter/Espace selon contrat, focus restitué           |
| sélection           | identité stable, partiel/tout, changement de page            |
| invalidation        | succès distant avant un rafraîchissement nommé unique        |
| édition             | snapshot, mono-vol, confirm, rollback et erreur              |
| responsive          | même intention, DOM interactif unique, aucun appel au resize |
| grille              | flèches, Home/End, entrée/sortie d'édition, lecteur d'écran  |

Les oracles vérifient l'absence des capacités non déclarées, pas seulement le
fonctionnement des capacités présentes.

## 10. Preuves visuelles approuvées à préserver

Le porteur produit a validé six rendus sous
`__screenshots__/users-management-proof/adapt8e-design-review/`. Ce répertoire
et `test-results/` sont ignorés par Git : les octets existent localement mais ne
constituent pas encore une autorité durable.

| Fichier                                  | SHA-256                                                            |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `adapt8e-expanded-v7.png`                | `f8ede8421ca54e023a6195c4e64506fbb9c1aec78ce6eef6ac3ce48ef9363ea9` |
| `adapt8e-medium-v7.png`                  | `ef31c67a96e430fcfd40505708b85ec5f1f38f59e34ca72c2338403d4f4c6229` |
| `adapt8e-expanded-actions-closed-v1.png` | `25d284d9ec7a2e77977e876177f03a6433a2558e35c7a9496ffbd569bd92262f` |
| `adapt8e-expanded-actions-open-v1.png`   | `2b7af0446303d006137d937ba157cea10d5aadfdf57d8058975a4aa2f533ce18` |
| `adapt8e-medium-actions-closed-v1.png`   | `ea854e32aa799663c11ac14bf967df150720c47c50fae3ee4714bb27da32e8e4` |
| `adapt8e-medium-actions-open-v1.png`     | `b737ded91c2555710626ce86a363a6817b3e11155004ce1e5dd38e5629787599` |

Ces fichiers ne doivent être ni nettoyés ni remplacés avant leur reproduction
déterministe sous le plafond de poids et leur publication content-addressed. Le
hash documente l'identité approuvée ; il ne rend pas le stockage durable.

## 11. Séquence de travail retenue

### DATA-VIEW-0 — présent lot

- accepter ADR-0078 ;
- conserver l'audit, les preuves et les exclusions ;
- fermer administrativement ADAPT-8d2/8e après fusion de #168/#171 ;
- ne modifier aucun runtime.

### ADAPT-11a — prochaine tranche, références

- reconstruire les six visuels approuvés depuis une source déterministe ;
- respecter le plafond de 1 Mo par fichier ;
- publier chemins, dimensions, usages et SHA-256 ;
- préserver les autorités progressives et création déjà actives ;
- aucun runtime dans cette tranche.

### ADAPT-11b — oracles futurs

- toolbar `Créer`, `Rafraîchir`, `Exporter`, `Filtres` ;
- colonne d'actions fixe et menu éventuel ;
- panneau de filtres borné entre header et scrollbar ;
- défilement horizontal arrêté avant actions ou filtre ;
- aucun dialogue ou clic de ligne imposé ;
- signatures historiques bornées, sans `skip` ni `todo`.

### ADAPT-11c — réalisation C5

- recalculer le work order après fusion des oracles ;
- réaliser seulement les capacités demandées par C5 ;
- Angular natif/Aria/Material avant custom selon ADR-0077 ;
- prouver build, lint, tests, Playwright, a11y, bundle et confinement.

### DATA-VIEW-1 — extraction générique ultérieure

- choisir au moins un second écran indépendant ;
- comparer les invariants réellement communs ;
- proposer seulement alors schéma, registry de renderers et primitive partagée ;
- tester Angular et React avant promotion.

## 12. Critères de non-régression architecturale

La suite est refusée si elle :

- modifie `list-query` pour encoder un placement visuel ;
- modifie `action-request` pour encoder une bibliothèque UI ;
- ajoute une dépendance à `cmz-backoffice` ;
- copie le switch métier du composant source ;
- rend toutes les lignes, colonnes ou actions interactives par défaut ;
- publie un schéma universel avant les fixtures et oracles ;
- transforme les images locales en baseline sans source reproductible ;
- étend le composant partagé sur la seule preuve C5.

## 13. Références

- [Table source auditée](https://github.com/ismaelkouda/cmz-backoffice/blob/f064d1d8e50190cd33e9ace096d51710d2474f2f/src/shared/components/table/table.component.ts)
- [Template source audité](https://github.com/ismaelkouda/cmz-backoffice/blob/f064d1d8e50190cd33e9ace096d51710d2474f2f/src/shared/components/table/table.component.html)
- [Angular Aria Grid](https://angular.dev/guide/aria/grid)
- [Angular Style Guide](https://angular.dev/style-guide)
- [WAI-ARIA APG — Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- [WAI-ARIA APG — Table](https://www.w3.org/WAI/ARIA/apg/patterns/table/)
- [Angular Material Table](https://material.angular.dev/components/table/overview)
- [UI officielle avant custom](./ui-angular-officiel-avant-custom-2026-10-01.md)
- [Filtres progressifs C5](./c5-adapt8-filtres-progressifs-desktop-medium-2026-09-29.md)
