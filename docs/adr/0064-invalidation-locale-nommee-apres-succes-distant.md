# ADR-0064 — L’invalidation locale est nommée et suit le succès distant

- **Statut :** Accepted
- **Date :** 2026-09-25

## Contexte

Le plan de page savait transporter un tableau `invalidates`, mais la conception
ne pouvait nommer aucune cible et le planner refusait donc toute politique
`caller-declared`. Le cas C5 exige qu’une création réussie recharge
`users-list`, sans recharger les autres queries et sans rien rejouer après une
erreur du POST.

Une action ne doit pas connaître une façade Angular ni inventer une invalidation
globale. La coordination appartient à la composition de page, qui possède déjà
les instances de queries et de commandes concernées.

## Décision

Une action backend de l’`application-design` peut déclarer
`invalidates_load_ids`. Chaque valeur est l’ID exact d’un `load` de la même
page. Le champ est facultatif pour préserver les conceptions sans invalidation.

Le planner applique les règles fermées suivantes :

- une politique `none` interdit toute cible ;
- une politique `caller-declared` exige au moins une cible ;
- chaque cible doit résoudre un nœud query de la page ;
- les cibles sont uniques, triées et recopiées dans le `page-execution-plan` ;
- la capacité `action.invalidation.caller-declared@1` doit être négociée par le
  renderer.

Le renderer Angular conserve l’action primitive sans effet caché et génère un
wrapper dans `PageComposition`. Ce wrapper expose le même état, résultat, erreur
et `submit`, puis appelle `reload()` uniquement sur les queries nommées après
l’émission de succès de la commande. Une erreur, une validation locale ou un
double submit ne déclenche aucune invalidation.

Le renderer autonome `action-request` continue de refuser `caller-declared` :
sans composition appelante, il ne possède pas les cibles et ne peut pas
prétendre les exécuter.

## Preuve

Les tests du planner couvrent le chemin positif et refusent : cible absente,
cible inconnue et cible déclarée avec une politique `none`.

L’oracle Angular externe exécute le code généré sur le host réel de test. Il
prouve :

1. POST réussi, puis seul le GET nommé est relancé avec bypass du cache ;
2. aucune autre query de la page n’est relancée ;
3. POST en erreur, donc aucun GET ;
4. double submit refusé sans second POST ni invalidation anticipée ;
5. publication et typecheck de la composition toujours déterministes.

La suite Angular passe à 61 tests.

## Conséquences

- La causalité `commande réussie -> query locale nommée` est explicite et
  vérifiable.
- Le code généré reste lisible : un `tap` et un appel `reload()` ciblé, sans bus
  d’événements, store ou cache parallèle.
- Le cas C5 peut maintenant composer les primitives réelles `users-list`,
  `profiles-select` et `create-user`.

## Revue de simplification

Le lot ajoute zéro dépendance, zéro runtime partagé, zéro transport, zéro cache,
zéro publisher et zéro mécanisme de replay. Il étend le schéma existant, le
planner existant et le composition root existant.

## Limites

- Ce lot prouve une invalidation de query présente dans la composition courante.
  Il ne prétend pas invalider une query située uniquement sur une autre page.
- L’invalidation inter-page est une proposition distincte, pas une décision de
  ce lot. Elle nécessiterait au minimum une identité canonique de query au
  niveau projet, une preuve d’existence, une politique de cache périmé et un
  oracle de navigation. Elle ne sera pas implémentée sans décision explicite.
- La fixture d’oracle réutilise encore l’action bornée déjà prouvée. Le prochain
  lot doit compiler les trois primitives C5 réelles avant de revendiquer
  `create-user -> users-list` de bout en bout.
- React ne possède pas encore de renderer de composition de page ; aucune parité
  d’invalidation React n’est revendiquée.

## Références

- [ADR-0058](./0058-page-execution-plan-reference-les-primitives-v2.md)
- [ADR-0059](./0059-composition-angular-materialise-les-noeuds-du-plan.md)
- [ADR-0060](./0060-oracle-angular-externe-execute-la-composition-nxn.md)
- [C5 — entrée externe « Gestion des utilisateurs »](../architecture/c5-entree-externe-gestion-utilisateurs-2026-09-25.md)
- [Audit de maintenabilité](../architecture/audit-maintenable-automatisation-2026-09-16.md)
