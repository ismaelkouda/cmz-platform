# Gestion de l'enveloppe de réponse API (analyse critique senior)

- **Dernière mise à jour :** 2026-07-23

## Problème (source + reconstruction initiale)

Les 4 bases de mappers (`simple`/`paginated`/`array`/`message-response`)
contenaient chacune une méthode `validateResponse` **copiée-collée** qui, en cas
d'erreur d'enveloppe, levait un **`ApiError`**. Trois défauts :

1. **Duplication** × 4 (DRY).
2. **Mauvaise couche** : dé-emballer/valider l'enveloppe
   `{error, message, data}` n'est pas le rôle d'un mapper (transformation pure)
   mais de la couche source.
3. **Bug d'intégration** 🔴 : `ApiError` est un `operational-error` **sans
   `messageKey`**, or le handler par défaut de la boucle d'erreurs fait
   `translate(error.messageKey)`. Un `ApiError` y arrivait →
   `translate(undefined)` → **toast vide**. Aucun handler `ApiError` n'était
   enregistré.

## Décision (option 1 + 2)

- **Mappers purs** : `mapFromDto` ne fait plus que
  `mapItemFromDto(unwrapResponse(dto))`. Plus de `validateResponse`, plus
  d'`ApiError`.
- **Un dé-emballeur unique** `unwrapResponse` / `assertResponseOk`
  ([`shared-data/utils/unwrap-response.util.ts`](../../libs/shared/data/src/lib/utils/unwrap-response.util.ts))
  :
    - `dto.error` → **`ServerResponseError`** (domain-error ; `messageKey` =
      message serveur → traduit si clé i18n connue, **affiché tel quel** sinon
      via le passthrough i18next). **Rendu correctement** par la boucle.
    - data absente → **`UnknownError`** (domain-error générique, rendu correct).
    - sinon → `data`.

Ainsi la validation d'enveloppe est **conservée** (elle est pertinente) mais
**au bon endroit** et via des `DomainError` qui s'affichent — les 3 défauts sont
réglés d'un coup.

## `ApiError` désormais

`ApiError` (operational-error) n'est **plus** utilisé pour la validation de
réponse. Il reste disponible pour de vraies erreurs de transport côté **source**
(ex. `ApiError.fetchFailed` en cas d'échec réseau/parse) ; si un tel `ApiError`
peut remonter à la boucle, enregistrer alors un handler dédié (utilisant
`error.message`, pas `messageKey`). À faire au cas par cas en Phase 07.
