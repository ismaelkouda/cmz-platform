# ADR-0068 — Publier C5 dans une application de preuve réelle

- **Statut :** accepté
- **Date :** 2026-09-25
- **Décision :** remplacer la fixture C5 temporaire comme preuve d'intégration
  par une conception approuvée, un shell Angular versionné et une composition
  recompilable depuis des artefacts adressés par contenu

## Contexte

C5f prouvait l'exécution de `users-list + profiles-select + create-user`, mais
uniquement dans un répertoire temporaire. Son contrat de page portait un hash de
design fictif. C5g-2 pouvait donc prouver la liaison interne du plan au work
order sans démontrer que ce même plan provenait d'une application publiée.

La première tentative de publication réelle a aussi révélé une contradiction
masquée par la fixture :

- `application-design` exigeait que `data_binding.model_id` soit le modèle de
  corps de réponse `users-list-page-wire` ;
- le plan `list-query` attendait la collection interne `users-list-items-wire` ;
- aucun document ne pouvait satisfaire les deux règles sans mentir sur la forme
  réseau.

Commencer la page visible dans cet état aurait obligé le réalisateur à deviner
où se trouvent les items de la page.

## Décision

### 1. Projection de données explicite

Un `data_binding` peut déclarer un `source_path` borné. Chaque segment doit
traverser un champ objet qui référence explicitement un autre modèle backend. Le
modèle terminal doit être exactement `model_id`.

Pour C5 :

```json
{
    "model_id": "users-list-items-wire",
    "source_path": ["data"]
}
```

Le planner vérifie en plus que cette projection correspond au `items_field` du
modèle d'exécution paginé. Une liste directe exige un chemin vide ; un résultat
d'action ne peut pas utiliser cette projection.

Cette règle est indépendante de Laravel : `data`, `content` ou tout autre nom
est accepté seulement lorsqu'il est déclaré par le contrat backend et par la
définition `list-query`.

### 2. Application de preuve versionnée

Le dépôt publie désormais :

- la demande bornée sous `examples/users-management-proof/` ;
- la conception canonique approuvée sous `designs/` ;
- le shell standard `apps/users-management-proof/` ;
- les trois modèles d'exécution et le plan C5 recompilables ;
- la composition Angular générée dans l'application.

La page du shell reste volontairement le placeholder standard. La présence de la
composition ne vaut ni réalisation visuelle ni raccord de production.

### 3. Preuve de non-dérive

Un test dédié recompile les trois primitives et le plan depuis les définitions
et le vrai contrat de page, puis compare leurs octets aux artefacts versionnés.
Il vérifie aussi :

- les refus de projection absente ou erronée ;
- la publication sans diff de la composition ;
- la préparation d'un work order portant le plan exact ;
- l'absence explicite de preuve visuelle à ce stade.

Le shell et toute la composition passent `ngc`, build production, lint et test.

## Conséquences

- C5 ne dépend plus d'un contrat temporaire ou d'un hash fictif pour préparer sa
  réalisation.
- Une page réseau paginée et une liste directe restent deux formes explicites ;
  aucun framework backend n'est détecté par heuristique.
- Le coût ajouté reste un exemple versionné et quatre tests ciblés ; aucun
  runtime, transport, cache, bus ou dépendance n'est introduit.
- Les artefacts générés restent du code Angular ordinaire, lisible et
  supprimable sans rendre l'application dépendante du générateur à l'exécution.

## Hors périmètre

- référence visuelle desktop/mobile et manifeste `presentation-evidence` ;
- permission fine de l'action `create` ;
- ouverture et fermeture du formulaire, notifications et conservation après
  erreur ;
- accessibilité de la page réalisée et comparaison visuelle ;
- configuration réelle du host, de l'identité et des URLs d'environnement.

La permission `create` est un bloqueur contractuel distinct : le modèle actuel
ne représente que l'accès de page. Elle devra recevoir une autorité explicite
avant que le composant final ne masque, désactive ou exécute l'action.
