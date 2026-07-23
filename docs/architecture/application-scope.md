# Couches `shared-application` et `shared-infra` — état

- **Dernière mise à jour :** 2026-07-22

## `@cmz/shared-infra`

Briques techniques (storage, crypto…), sans logique métier.

| Service               | Techno                       | Notes                                                                                                                                                                                                                                                                                                             |
| --------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EncodingDataService` | **Web Crypto API** (AES-GCM) | Remplace `crypto-js` (**natif, aucun install**). Stockage **synchrone** ; chiffrement **asynchrone** (`crypto.subtle` l'impose) → API scindée `save`/`get` (clair) vs `saveEncrypted`/`getEncrypted` (chiffré). `console.error` du source non reproduit. Caveat sécurité documenté (clé embarquée = obfuscation). |

## `@cmz/shared-application`

Orchestration du domaine ; dépend de `shared-domain` / `shared-infra`.

| Service                     | Dépendances                  | État                                                                                                                         |
| --------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `ErrorHandlerRegistry`      | `shared-domain`              | ✅ dispatch + `registerDefault` (33 handlers → 2)                                                                            |
| `SessionService`            | `shared-infra`               | ✅ n'utilise que le stockage **synchrone**                                                                                   |
| `PermissionActionsService`  | `shared-infra`               | ✅ lecture **chiffrée async** (`getEncrypted`) : signal init vide puis rempli, `can()` réactif                               |
| `StorePathsService`         | `shared-infra`               | ✅ `signal` + async ; défauts corrigés (`OnInit`/`OnDestroy` morts sur service root supprimés, double injection dédupliquée) |
| `route-context`             | `@angular/router` + types UI | ➡️ couche **ui/app** (dépend du `Router`)                                                                                    |
| `notifications-initializer` | —                            | ❌ **mort** (corps commenté) — non reproduit                                                                                 |

`permissionsActions` et `paths_data` sont stockés **chiffrés**
(`saveData(...,true)` côté login). Web Crypto rend leur lecture **asynchrone** :
les signaux s'initialisent vides puis se remplissent après déchiffrement.
