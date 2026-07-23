# Couches `shared-application` et `shared-infra` — état

- **Dernière mise à jour :** 2026-07-22

## `@cmz/shared-infra`

Briques techniques (storage, crypto…), sans logique métier.

| Service               | Techno                       | Notes                                                                                                                                                                                                                                                                                                             |
| --------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EncodingDataService` | **Web Crypto API** (AES-GCM) | Remplace `crypto-js` (**natif, aucun install**). Stockage **synchrone** ; chiffrement **asynchrone** (`crypto.subtle` l'impose) → API scindée `save`/`get` (clair) vs `saveEncrypted`/`getEncrypted` (chiffré). `console.error` du source non reproduit. Caveat sécurité documenté (clé embarquée = obfuscation). |

## `@cmz/shared-application`

Orchestration du domaine ; dépend de `shared-domain` / `shared-infra`.

| Service                     | Dépendances                  | État                                                                                                                          |
| --------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `ErrorHandlerRegistry`      | `shared-domain`              | ✅ dispatch + `registerDefault` (33 handlers → 2)                                                                             |
| `SessionService`            | `shared-infra`               | ✅ n'utilise que le stockage **synchrone**                                                                                    |
| `permission-actions`        | `shared-infra`               | ⏳ lit via `getData` (potentiellement chiffré → `getEncrypted` **async**) : à adapter (le `signal` d'init doit gérer l'async) |
| `store-paths`               | `shared-infra`               | ⏳ idem `permission-actions`                                                                                                  |
| `route-context`             | `@angular/router` + types UI | ➡️ couche **ui/app** (dépend du `Router`)                                                                                     |
| `notifications-initializer` | —                            | ❌ **mort** (corps commenté) — non reproduit                                                                                  |

Le passage à Web Crypto rend les lectures chiffrées **asynchrones** : les
services qui initialisaient un `signal` depuis une lecture synchrone
(`permission-actions`, `store-paths`) doivent être adaptés (init async /
resolver). À traiter à leur génération.
