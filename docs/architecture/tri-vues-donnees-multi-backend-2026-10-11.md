# Tri des vues de données — guide multi-backend et multi-cible

- **Date de vérification :** 2026-10-13
- **Statut :** guide d'architecture en vigueur ; le tri client C5 est réalisé en
  Angular depuis le 2026-10-13, sans promotion de capacité ; React et le tri
  serveur restent à réaliser
- **Décision :**
  [ADR-0100](../adr/0100-tri-vues-donnees-modes-none-client-server.md)
- **Cibles :** Angular Material et React natif
- **Backends :** contrat explicite, sans déduction depuis Laravel, Django,
  Spring, .NET, Rust ou un autre framework

## 1. But et règle de lecture

Ce guide permet à un humain ou à un LLM de concevoir un tri sans recommencer la
recherche et sans inventer le contrat du backend. Il sépare quatre questions :

1. la vue a-t-elle une capacité de tri ?
2. quelle collection est réellement triée ?
3. quelle valeur et quel comparateur appartiennent à chaque colonne ?
4. quel codec wire le backend réel accepte-t-il ?

Une réponse inconnue ne reçoit pas de valeur plausible : le mode reste `none`.
Les exemples JSON sont des modèles conceptuels non normatifs. Ils ne deviennent
ni schéma ni API publique avant un lot dédié avec fixtures et oracles.

## 2. Choisir le mode sans ambiguïté

| Situation prouvée                                | Mode         | Portée                | Effet réseau au clic |
| ------------------------------------------------ | ------------ | --------------------- | -------------------- |
| aucune décision métier ou données insuffisantes  | `none`       | aucune                | aucun                |
| collection complète et bornée dans le navigateur | `client`     | `complete-collection` | aucun                |
| une page distante visible dans le navigateur     | `client`     | `current-page`        | aucun                |
| API réelle acceptant champ et direction          | `server`     | collection distante   | une nouvelle lecture |
| fragments progressifs ou fenêtre distante        | `none` en V1 | indéfinie             | aucun tri            |

`client/current-page` n'est pas une approximation de `server`. C'est une
fonction distincte et limitée : elle réordonne uniquement les lignes visibles de
la réponse courante. Cette portée est exposée aux technologies d'assistance
lorsque le tri est actif ; aucune mention visuelle dédiée n'est exigée. Dette
acceptée par le propriétaire le 2026-10-13 après examen en Medium et Expanded :
à l'écran, rien ne distingue nécessairement ce tri d'un tri global. Le pied de
liste conserve la plage affichée.

## 3. Modèle conceptuel candidat

### 3.1 Tri client

```json
{
    "sorting": {
        "mode": "client",
        "scope": "current-page",
        "default": null,
        "columns": [
            {
                "column_id": "name",
                "value_path": "name",
                "comparator": {
                    "kind": "text",
                    "locale": "fr",
                    "nulls": "last"
                }
            }
        ]
    }
}
```

Le traitement des accents n'est pas déduit de la locale. La décision acceptée
impose une comparaison insensible à la casse ; la réalisation Angular fixe le
comportement avec
`Intl.Collator('fr', { usage: 'sort', sensitivity: 'accent' })` et des vecteurs
explicites. En particulier, la valeur `base` ignore à la fois la casse et les
accents et ne doit pas être présentée comme une simple option de casse.

### 3.2 Intention de tri serveur

```json
{
    "sorting": {
        "mode": "server",
        "codec_id": "backend-contract:users-v1",
        "columns": [
            {
                "column_id": "lastName",
                "field_id": "lastName"
            }
        ]
    },
    "requested_sort": {
        "terms": [{ "field_id": "lastName", "direction": "asc" }]
    }
}
```

`field_id` est un identifiant canonique allowlisté. Ce n'est ni un nom de
colonne SQL, ni nécessairement le paramètre envoyé sur le réseau. `codec_id`
référence le contrat réel ; il n'est jamais choisi d'après le framework.

### 3.3 Union future fermée

Le futur schéma devra représenter une union discriminée et fermée :

- `{ "mode": "none" }` ;
- `{ "mode": "client", "scope": "complete-collection" | "current-page", … }` ;
- `{ "mode": "server", "codec_id": …, … }`.

Un `kind: string`, un mode absent interprété comme client ou un objet mêlant
client et serveur doivent être refusés.

## 4. Invariants communs

- un seul mode par collection rendue ;
- une colonne est non triable par défaut ;
- mono-tri visible en V1 ; cycle `asc → desc → none` ;
- l'état neutre appartient au cycle : aucune croix séparée ;
- le libellé et l'icône forment une seule cible interactive ;
- la flèche est décorative et cachée aux technologies d'assistance ;
- une seule colonne expose une direction active `ascending` ou `descending` ;
- l'ordre appliqué et l'intention en attente ne sont jamais confondus ;
- le tableau source n'est pas muté ;
- deux valeurs égales conservent leur ordre d'entrée ;
- `Réinitialiser` efface recherche, filtres et tri explicite, puis relance la
  lecture avec des paramètres de recherche et de filtre vides. En mode client,
  aucun tri n'est envoyé sur le réseau et la nouvelle réponse devient l'ordre
  reçu ;
- un rechargement, lorsqu'il existe, conserve le tri ;
- un champ absent de l'allowlist n'est ni trié ni transmis.

Une vue avec quelques boutons de tri reste une table HTML. Elle ne reçoit pas
`role="grid"` sans sélection ou navigation cellulaire 2D complète.

## 5. Tri client

### 5.1 Portée

`complete-collection` exige une collection complète, bornée et prouvée.
`current-page` exige une pagination explicite et une page visible cohérente. Il
est interdit de trier indépendamment :

- chaque fragment d'un chargement progressif ;
- chaque fenêtre d'une virtualisation distante ;
- un mélange de lignes anciennes et de réponse entrante.

Avant d'introduire une virtualisation, le volume réel, la mémoire, le coût de
rendu et les classes de fenêtre sont mesurés. La virtualisation n'est ni un
prérequis du tri ni une optimisation ajoutée sans seuil observé.

Une nouvelle page, recherche, filtre ou rechargement conserve l'état de tri et
réapplique le comparateur à la nouvelle réponse. Aucun de ces invariants ne
transforme la portée locale en ordre global.

### 5.2 Comparateurs fermés

| Type            | Valeur comparée             | Règle minimale                                       |
| --------------- | --------------------------- | ---------------------------------------------------- |
| `text`          | texte source                | `Intl.Collator` avec locale et sensibilité déclarées |
| `number`        | nombre source               | comparaison numérique, jamais lexicographique        |
| `date`          | date/instant source valide  | valeur temporelle, jamais le libellé formaté         |
| `display-label` | libellé localisé affiché    | collation de la locale d'affichage                   |
| métier          | valeur explicitement mappée | registre fermé et test dédié                         |

La position des valeurs absentes appartient au contrat. `nulls-last` signifie
qu'elles restent en dernier en ordre ascendant **et** descendant ; multiplier un
résultat de comparaison naïf par `-1` ne suffit pas. Les valeurs invalides
suivent une règle distincte ou provoquent un échec de décodage : elles ne sont
pas silencieusement assimilées à `null`.

Une projection non mutante utilise `toSorted()` ou copie avant `sort()`. Un
`useMemo` React est une optimisation après mesure, jamais une condition de
justesse. Un `computed` Angular exprime la projection ; il ne doit pas modifier
le signal contenant la réponse.

### 5.3 État initial et retour à l'état neutre du tri

Conserver un snapshot de l'ordre reçu permet le troisième état `none`. La
suppression du tri restaure cet ordre pour la réponse courante. Elle ne prétend
pas connaître un ordre antérieur à la réponse du backend.

## 6. Tri serveur différé

### 6.1 Deux états, pas un optimisme trompeur

- `requestedSort` : intention la plus récente de l'utilisateur ;
- `appliedSort` : ordre correspondant aux lignes actuellement affichées.

Si les anciennes lignes restent visibles pendant la requête, `aria-sort`
continue à décrire `appliedSort`. L'intention en attente est annoncée
séparément. Au succès, lignes et tri appliqué changent atomiquement. À l'échec,
les lignes et le tri appliqué précédents restent cohérents et l'erreur est
annoncée.

Le flux est latest-wins : toute requête supplantée est annulée ou son résultat
est ignoré par identité. Un changement ou une suppression de tri repart à
l'origine de pagination.

Le tri appliqué, les filtres et l'identité de pagination participent à la clé de
cache et de déduplication. Deux lectures qui diffèrent sur l'un de ces éléments
ne partagent ni résultat, ni requête en vol, ni curseur.

### 6.2 Ordre total et pagination

Le backend ajoute un départage unique stable lorsque le champ principal peut
être égal, par exemple `updated_at desc, id asc`. Le même ordre et les mêmes
filtres s'appliquent à toutes les pages. Un curseur est opaque : le client ne le
reconstruit pas et ne mélange pas des curseurs créés sous des tris différents.

### 6.3 Sécurité

- allowlist fermée des identifiants de champs et directions ;
- mapping serveur vers les propriétés ORM/SQL ;
- aucune concaténation d'un identifiant utilisateur dans une requête ;
- champ ou direction non supporté : erreur structurée prévue par le contrat,
  jamais silence ni fallback ;
- codec sélectionné explicitement par le `backend-contract`.

`MatTableDataSource`, `Array.sort()` ou tout autre outil local ne peut pas
simuler ce mode. Sans codec déclaré et API réelle qualifiée, la vue reste `none`
ou utilise explicitement un mode `client` avec sa portée honnête.

## 7. Dialectes officiels observés

Consultation : 2026-10-11. Ces écritures sont des exemples d'API, jamais un
défaut universel.

| Source officielle         | Paramètre observé    | Exemple                                | Portée de l'observation                     |
| ------------------------- | -------------------- | -------------------------------------- | ------------------------------------------- |
| Google AIP-132            | `order_by`           | `order_by=foo desc,bar`                | recommandation Google pour méthodes List    |
| JSON:API 1.1              | `sort`               | `sort=-created,title`                  | convention JSON:API, `-` = descendant       |
| OData                     | `$orderby`           | `$orderby=ReleaseDate asc,Rating desc` | option de requête OData                     |
| Microsoft Graph           | `$orderby`           | `$orderby=name desc`                   | paramètre Graph conforme à OData            |
| Azure REST API Guidelines | `orderby`            | `orderby=name desc`                    | règle Azure sans préfixe `$`                |
| Spring Data REST          | `sort` répétable     | `sort=name,desc`                       | convention de Spring Data REST              |
| Django REST Framework     | `ordering`           | `ordering=-username`                   | `OrderingFilter`, champs à allowlister      |
| GitHub REST               | `sort` + `direction` | `sort=updated&direction=desc`          | endpoints qui déclarent ces deux paramètres |

Une API Laravel peut utiliser OData ; une API Spring peut utiliser JSON:API ;
une API Rust peut exposer un codec propriétaire. Le framework ne prouve jamais
le dialecte. Une documentation ou un schéma OpenAPI du service réel doit le
déclarer.

## 8. Réalisation Angular Material

### 8.1 Primitive officielle

La cible Angular réalisée utilise `MatSort` et `MatSortHeader` sur la table HTML
existante. `matSortChange` met à jour l'état signal ; la projection `computed`
applique le comparateur C5. `sortActionDescription` décrit l'action disponible
et `LiveAnnouncer` annonce le résultat une seule fois.

La table ne devient pas `MatTable` et n'adopte pas `MatTableDataSource` par
principe. Une preuve isolée pourrait réévaluer ce choix si elle démontre moins
de complexité sans conversion structurelle, perte d'i18n, régression visuelle ou
dépassement de budget.

Le lot mesure le bundle de production avant et après l'ajout du tri. Tout
dépassement d'un budget existant arrête le lot sans relever ce budget. Il
vérifie aussi l'apparence réelle de la flèche avec les tokens et le thème
effectivement chargés par l'application. Une personnalisation d'icône n'est
envisagée qu'après ce prototype et une validation visuelle, jamais par
anticipation.

Rectification factuelle de la proposition initiale : en 22.2.1,
`MatTableDataSource._orderData` passe une copie superficielle (`data.slice()`) à
`sortData`. Son comparateur par défaut reste insuffisant pour la collation
française, les libellés localisés et `nulls-last`, mais il ne trie pas le
tableau source fourni.

### 8.2 Écart ARIA version-exact

WAI-ARIA 1.2 recommande d'appliquer `aria-sort` à un seul header ; l'exemple APG
le retire des headers inactifs. `MatSortHeader` 22.2.1 retourne au contraire
`aria-sort="none"` pour chaque header inactif, comportement couvert par son test
officiel. `none` signifie qu'aucun tri n'est appliqué à cette colonne.

La réalisation :

- ne touche pas aux membres privés de Material ;
- ne réécrit pas l'attribut après rendu ;
- compte exactement zéro ou un `ascending|descending` ;
- vérifie l'arbre accessible et les annonces avec NVDA et VoiceOver ;
- s'arrête pour arbitrage si l'expérience devient ambiguë ou répétitive.

État au 2026-10-13 : l'essai VoiceOver réel est concluant sur le nom, la
description et l'annonce du tri croissant ; NVDA et Safari ne sont pas testés.
Le détail et les limites sont dans ADR-0100, « Réalisations UI ».

## 9. Réalisation React native

La cible React n'ajoute aucune bibliothèque de table :

- bouton HTML dans chaque `th` triable ;
- état contrôlé `{ columnId, direction } | null` ;
- projection non mutante des lignes ;
- `aria-sort` uniquement sur le `th` actif, conformément à l'APG ;
- région live commune pour le résultat ;
- mêmes vecteurs de comparaison et mêmes limites de portée qu'Angular.

L'identité sémantique n'impose pas un DOM identique à Angular Material. Les
oracles vérifient les comportements et l'accessibilité propres à la cible.

## 10. Accessibilité et interaction

- libellé et flèche ont une seule cible clavier ;
- Enter et Espace activent la primitive ;
- le focus reste sur le header après le tri ;
- l'indicateur est compréhensible sans couleur seule ;
- le contour de focus reste visible en contraste forcé ;
- la direction active est annoncée une fois, sans relire le tableau ;
- en `current-page`, action et annonce disent « lignes affichées » ;
- aucune mention visuelle dédiée de la portée locale n'est exigée ;
- loading, vide, erreur et données périmées gardent les headers et ne falsifient
  pas la direction appliquée ;
- le zoom et le changement de classe de fenêtre ne perdent ni état ni focus.

Cette absence de mention visible est une décision générique du propriétaire du
2026-10-13, prise après examen de la forme proposée en Medium et Expanded. Elle
ne transforme pas `current-page` en tri global : descriptions et annonces
continuent à dire « lignes affichées ». L'ambiguïté visuelle restante est une
dette acceptée.

Pour C5, FOCUS-03 impose une cible visible d'au moins `48 × 48 CSS px` dans les
trois classes de disposition. Cette règle locale n'est pas généralisée à tout
produit.

## 11. Profil cible C5 — Angular réalisé, React restant

| Colonne     | Triable | Comparateur                       |
| ----------- | ------- | --------------------------------- |
| `#`         | non     | rang d'affichage                  |
| Nom         | oui     | texte, locale `fr`, casse ignorée |
| Prénom      | oui     | texte, locale `fr`, casse ignorée |
| Email       | oui     | texte, locale `fr`, casse ignorée |
| Profil      | oui     | libellé localisé affiché          |
| Rôle        | oui     | libellé localisé affiché          |
| Statut      | oui     | libellé localisé affiché          |
| Mise à jour | oui     | valeur date brute                 |

Règles C5 : `client/current-page`, `nulls-last`, stabilité sur égalité, zéro
requête au clic, état conservé sur page/recherche/filtre/rechargement. Compact
V1 reste sans tri car ses pages sont ajoutées progressivement.

Les colonnes, la locale et les comparateurs de cette table ne deviennent pas des
constantes du générateur. L'ancien oracle qui exigeait zéro contrôle de tri est
remplacé côté Angular par les oracles du lot ; React reste sans cette capacité
jusqu'à sa réalisation dédiée.

## 12. États à concevoir

| État               | Attente minimale                                |
| ------------------ | ----------------------------------------------- |
| prêt               | direction et lignes cohérentes                  |
| chargement initial | headers visibles, aucune direction fictive      |
| attente serveur    | tri appliqué distinct de l'intention en attente |
| vide               | headers conservés, message dans le corps        |
| erreur             | headers conservés, ordre précédent cohérent     |
| données périmées   | état explicite, pas de mélange silencieux       |
| reset              | relit avec paramètres vides, nouvel ordre reçu  |
| changement rapide  | latest-wins, focus stable, une annonce utile    |

Les skeletons occupent le corps des colonnes. Ils ne remplacent pas les headers
et ne portent aucune valeur de tri.

## 13. Preuves exigées avant promotion

### Contrat

- validation positive des trois modes ;
- refus du mode absent, de la portée absente et d'une colonne non allowlistée ;
- mutation tuant `current-page` sur fragments progressifs ;
- aucun codec backend déduit du framework.

### Comparateurs

- accents, casse et locale ;
- nombres et dates brutes ;
- libellés localisés ;
- valeurs absentes dans les deux directions ;
- stabilité des égalités ;
- reset et conservation sur nouvelle réponse.

### Navigateur et accessibilité

- sept boutons C5 et aucun autre en Medium/Expanded ; aucun en Compact ;
- cycle complet et zéro requête au clic ;
- direction active, description d'action et annonce live ;
- portée locale exposée par la description et l'annonce aux technologies
  d'assistance, sans bandeau visible ;
- clavier, focus, zoom, contraste forcé et arbre accessible ;
- cibles C5 d'au moins `48 × 48 CSS px` dans les trois dispositions, avec une
  mutation qui fait échouer FOCUS-03 quand cette dimension est réduite ;
- NVDA et VoiceOver réels pour le comportement Material `none` ;
- captures Medium/Expanded soumises au propriétaire.

Au 2026-10-13, la réalisation Angular C5 dispose de l'essai VoiceOver réel et
des captures validées, pas de l'essai NVDA : cette preuve reste due avant
promotion.

### Serveur futur

- codec positif et négatif contre le contrat réel ;
- mapping allowlisté, erreur structurée, aucune concaténation ;
- ordre total avec ex aequo ;
- pages sans doublon ni absence ;
- latest-wins, annulation et restauration après erreur.

Une mutation doit faire échouer au moins un oracle pour chaque invariant
critique. Un test vert sans mutation négative ne prouve pas que la règle est
effectivement surveillée.

## 14. Sources officielles consultées

Toutes consultées le 2026-10-11 :

- [Google AIP-132 — `order_by`](https://google.aip.dev/132)
- [Google AIP-158 — pagination et page tokens](https://google.aip.dev/158)
- [JSON:API 1.1 — `sort`](https://jsonapi.org/format/#fetching-sorting)
- [OData — `$orderby`](https://learn.microsoft.com/en-us/odata/concepts/queryoptions-overview)
- [Microsoft Graph — `$orderby`](https://learn.microsoft.com/en-us/graph/query-parameters#orderby-parameter)
- [Azure REST API Guidelines — `orderby`](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#orderby)
- [Spring Data REST — `sort`](https://docs.spring.io/spring-data/rest/reference/paging-and-sorting.html)
- [Django REST Framework — `ordering`](https://www.django-rest-framework.org/api-guide/filtering/#orderingfilter)
- [GitHub REST — `sort` et `direction`](https://docs.github.com/en/rest/repos/repos#list-organization-repositories)
- [OWASP — allow-list input validation](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html#defense-option-3-allow-list-input-validation)
- [Angular Material — Sort](https://material.angular.dev/components/sort/overview)
- [Angular Material 22.2.1 — `sort-header.ts`](https://github.com/angular/components/blob/v22.2.1/src/material/sort/sort-header.ts)
- [Angular Material 22.2.1 — `sort.spec.ts`](https://github.com/angular/components/blob/v22.2.1/src/material/sort/sort.spec.ts)
- [Angular — signals](https://angular.dev/guide/signals)
- [React — `useMemo`](https://react.dev/reference/react/useMemo)
- [ECMA-402 — objets `Intl.Collator`](https://tc39.es/ecma402/#collator-objects)
- [ECMAScript — `Array.prototype.toSorted`](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.tosorted)
- [WAI-ARIA 1.2 — `aria-sort`](https://www.w3.org/TR/wai-aria-1.2/#aria-sort)
- [WAI-ARIA APG — sortable table](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/)
