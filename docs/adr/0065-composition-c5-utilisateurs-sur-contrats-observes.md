# ADR-0065 — Composer C5 sur les trois contrats utilisateurs observés

- **Statut :** Accepted
- **Date :** 2026-09-25
- **Décideurs :** équipe plateforme CMZ

## Contexte

C5e prouvait l’invalidation locale nommée sur une composition générique. Cette
preuve ne suffisait pas à revendiquer le cas « Gestion des utilisateurs » : il
manquait encore la query des profils et la vraie commande de création à cinq
champs.

Le backend historique expose aussi deux formes de succès différentes :

- les lectures utilisent une enveloppe `{ error, message, data }` ;
- `POST settings-and-security/users/store` retourne directement
  `{ error, message }`.

Ajouter artificiellement `data` au second contrat aurait rendu l’oracle vert au
prix d’un mensonge sur le wire.

## Décision

La page C5 compose désormais exactement :

- `users-list`, query paginée ;
- `profiles-select`, query de tableau simple ;
- `create-user`, commande authentifiée à cinq champs requis qui invalide
  uniquement `users-list` après succès distant.

Le contrat backend nomme explicitement la réponse directe
`status-object`. Cette forme possède seulement `error_field` et
`message_field`; le schéma et le validateur refusent notamment qu’un
`data_field` lui soit ajouté.

Le renderer de commande reste fermé par défaut sur le cas public mono-champ.
La composition Angular ouvre explicitement et ensemble les seules capacités
requises par C5 : Bearer fourni par le host, champs string requis, réponse
`status-object` et invalidation déclarée par l’appelant. Elle ne fabrique ni
transport, ni authentification, ni notification.

L’oracle générique antérieur est conservé. Un second oracle natif Angular
exécute la composition utilisateurs sur le vrai host de test et observe le
réseau.

## Garanties prouvées

- Les quatre nouveaux artefacts passent leurs schémas, références de hash et
  snapshots de provenance.
- Les deux GET transportent le Bearer du host et sont décodés selon leurs deux
  formes réelles, page et tableau.
- Le POST envoie exactement les cinq champs snake_case observés.
- Un succès recharge `users-list` avec bypass du cache sans recharger
  `profiles-select`.
- Une erreur métier déclarée, une entrée invalide ou un double submit ne
  provoquent aucune invalidation anticipée.
- La destruction du scope annule les deux lectures en vol.

## Limites conservées

- Ce lot produit le composition root, pas encore le composant visuel.
- La permission `create`, la fermeture du formulaire, les notifications et
  l’accessibilité appartiennent au prochain lot UI.
- Le code stable de l’erreur « email déjà existant » n’est toujours pas
  inventé ; seul le message serveur observé est propagé.
- L’invalidation inter-page reste hors périmètre.

## Conséquences

La plateforme possède maintenant une preuve exécutable du cœur technique C5
sur les contrats SEOS observés, sans dépendre de ses classes historiques. Le
prochain incrément peut construire une page Angular ordinaire au-dessus de ce
composition root sans rouvrir le transport ni la coordination des appels.
