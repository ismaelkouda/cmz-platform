# ADR-0061 — Les pages et paramètres `list-query` restent backend-neutres

- **Statut :** Accepted
- **Date :** 2026-09-25

## Contexte

La baseline C5 « Gestion des utilisateurs » exige cinq paramètres de query et
une réponse paginée imbriquée. Le cas observé emploie les noms wire Laravel
`data`, `current_page`, `last_page`, `per_page` et `total`. Les encoder dans le
noyau rendrait pourtant la plateforme impropre à un backend Spring Boot, .NET,
Django ou à une API maison exposant d'autres noms et enveloppes.

Le compilateur v2 ne prouvait jusque-là qu'une collection directe, sans
pagination, et au plus un path string obligatoire. Étendre immédiatement les
renderers par symétrie aurait annoncé un comportement runtime sans oracle.

Le terme métier « liste » n'impose pas une forme JSON unique. Selon le contrat,
une lecture peut exposer un tableau direct, une page, un objet contenant une
collection, une map indexée ou une autre projection. La plateforme ne doit ni
ramener toutes ces formes à Laravel, ni traiter tout objet comme une liste.

## Décision

Le contrat auteur peut maintenant décrire un résultat `page` en associant :

- le champ wire contenant les items ;
- quatre rôles canoniques : `currentPage`, `lastPage`, `pageSize` et
  `totalItems` ;
- chacun de ces rôles au nom exact fourni par le backend.

Le modèle d'exécution neutre passe en `1.2.0`. Il conserve séparément les noms
wire et les rôles canoniques. Les paramètres query acceptés par ce lot sont
bornés aux primitives `string`, `integer` et `boolean`, requises ou
facultatives, avec leurs contraintes compatibles. Les headers, nombres non
entiers, objets, tableaux, mélange path/query et plusieurs path parameters
restent refusés.

Le résultat du modèle d'exécution est discriminé. Les deux seules variantes
prouvées à cette date sont `list` pour un tableau direct et `page` pour la page
C5. Une future collection enveloppée dans un objet devra déclarer un autre
discriminateur et le champ exact portant les items ; elle ne sera jamais déduite
du nom `data`, de l'URL ou du framework backend.

Une lecture d'objet unique est un autre cas. SEOS en fournit déjà une preuve :
`RequestsDetailsApi.execute()` effectue un GET par `uniq_id`, reçoit
`SimpleResponseDto<RequestsDetailsItemApiDto>` puis le repository produit un
seul `RequestsDetailsEntity`. Cette forme a une cardinalité `one`; elle ne doit
pas être maquillée en liste. Un audit séparé décidera si le socle doit généraliser
la primitive en `read-query` (`one`, `many`, `page`) ou exposer un profil
`detail-query` mince réutilisant le même transport et le même contrôleur.

La fixture SEOS conserve ses noms Laravel parce qu'ils constituent la preuve
observée, pas parce que le noyau les connaît. Un test remplace ces noms par une
forme de type Spring Data (`content`, `number`, `totalPages`, `size`,
`totalElements`) et obtient le même modèle canonique sans branchement de
framework.

Les renderers Angular et React refusent explicitement ce résultat paginé tant
qu'un oracle runtime propre à chaque cible n'existe pas. C5b est donc une
capacité contractuelle et de compilation, pas encore une capacité UI ou HTTP
exécutable.

## Conséquences

- Un changement de framework backend modifie le contrat et ses mappings wire,
  pas le compilateur central.
- Les conventions de pagination ne sont pas déduites depuis un nom de framework
  ou une URL.
- La définition reste content-addressed : toute évolution du contrat backend
  invalide son SHA-256 et exige une recompilation explicite.
- La prochaine étape doit implémenter puis exécuter séparément le rendu Angular
  et React avant d'autoriser cette page dans une composition C5.

## Revue de simplification

Le lot réutilise le schéma `list-query` v2, le compilateur et les validateurs
existants. Il n'ajoute aucun générateur, transport, runtime, cache, journal,
verrou, CLI ou dépendance. Deux fixtures versionnées portent la preuve SEOS.

## Limites

- Les quatre métadonnées canoniques sont toutes obligatoires et entières.
- Les variantes cursor-based, offset/limit sans total, infinite scroll et pages
  nullables ne sont pas ouvertes sans cas réel.
- Les objets conteneurs, maps indexées et objets uniques ne sont pas assimilés
  à un tableau : chaque forme attend son contrat et son oracle propres.
- Le cas objet unique `requests-details` est observé mais pas encore généré ;
  aucune seconde pile de transport, cache ou état ne sera acceptée pour le
  prendre en charge.
- Aucun renderer ne consomme encore le résultat `page`.
- L'invalidation `create-user -> users-list` reste le lot C5 suivant.

## Références

- [ADR-0047](./0047-list-query-v2-reference-backend-et-migration-explicite.md)
- [ADR-0048](./0048-list-query-v2-modele-execution-neutre.md)
- [C5 — entrée externe « Gestion des utilisateurs »](../architecture/c5-entree-externe-gestion-utilisateurs-2026-09-25.md)
- [Audit de maintenabilité](../architecture/audit-maintenable-automatisation-2026-09-16.md)
