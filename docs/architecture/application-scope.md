# Couches `shared-application` et `shared-browser` — état

- **Dernière mise à jour :** 2026-07-26

## `@cmz/shared-browser` (ex-`shared-infra`)

Adaptateurs navigateur, sans logique métier. **`shared-infra` a été supprimée**
(lib morte : ne contenait que `EncodingDataService`, sans importeur) ; son rôle
est repris par `shared-browser` derrière un **port domaine**.

| Élément                 | Techno                                        | Notes                                                                                                                                                                                                                                              |
| ----------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StoragePort`           | abstract (`@cmz/shared-domain`)               | Contrat de stockage neutre : `save`/`get`/`remove`/`hasKey` (clair) + `saveEncrypted`/`getEncrypted`/`removeKeysWithPrefix`/`clearEncrypted` (chiffré). Le domaine/application n'en dépend que par abstraction.                                    |
| `BrowserStorageAdapter` | **Web Crypto API** (AES-GCM) + `localStorage` | `implements StoragePort` dans `shared-browser` (`type:browser`). Chiffrement **asynchrone** (`crypto.subtle`) ; stockage synchrone. Câblé au **root** (`app.config`, `useExisting`). Caveat sécurité : clé embarquée = obfuscation, pas un secret. |

## `@cmz/shared-application`

Orchestration du domaine ; dépend de `shared-domain` (dont **`StoragePort`**) —
**jamais** de `shared-browser` (règle `type:application` ↛ `type:browser`). Le
stockage concret est injecté au root.

| Service                     | Dépendances                     | État                                                                                                                         |
| --------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `ErrorHandlerRegistry`      | `shared-domain`                 | ✅ dispatch + `registerDefault` (33 handlers → 2)                                                                            |
| `SessionService`            | `StoragePort` (`shared-domain`) | ✅ n'utilise que le stockage **synchrone**                                                                                   |
| `PermissionActionsService`  | `StoragePort` (`shared-domain`) | ✅ lecture **chiffrée async** (`getEncrypted`) : signal init vide puis rempli, `can()` réactif                               |
| `StorePathsService`         | `StoragePort` (`shared-domain`) | ✅ `signal` + async ; défauts corrigés (`OnInit`/`OnDestroy` morts sur service root supprimés, double injection dédupliquée) |
| `route-context`             | `@angular/router` + types UI    | ➡️ couche **ui/app** (dépend du `Router`)                                                                                    |
| `notifications-initializer` | —                               | ❌ **mort** (corps commenté) — non reproduit                                                                                 |

`permissionsActions` et `paths_data` sont stockés **chiffrés** (`saveEncrypted`
côté login). Web Crypto rend leur lecture **asynchrone** : les signaux
s'initialisent vides puis se remplissent après déchiffrement.
