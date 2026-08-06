# Couches `shared-application` et `shared-browser` — état

- **Dernière mise à jour :** 2026-08-03 — renommage `*Encrypted` → `*Obfuscated`
  (audit P1-18/I-9, `audit-workspace-2026-08-03.md` §7) et ajout du signal de
  jeton dans `SessionService` (I-1/I-2, même section).

## `@cmz/shared-browser` (ex-`shared-infra`)

Adaptateurs navigateur, sans logique métier. **`shared-infra` a été supprimée**
(lib morte : ne contenait que `EncodingDataService`, sans importeur) ; son rôle
est repris par `shared-browser` derrière un **port domaine**.

### Réservé au composition root (audit D-5 / P2-18)

`@cmz/shared-browser` (`type:browser`) n'est importable **que** depuis
`type:app` (`apps/backoffice-angular`, typiquement `app.config.ts` et providers).
Les couches `application` / `ui` / `data` / `domain` dépendent des ports
(`StoragePort`, etc. dans `@cmz/shared-domain`), jamais de l'adaptateur
concret. Règle ESLint : seule la contrainte `sourceTag: 'type:app'` liste
`type:browser` — plus de joker `*` ([ADR-0003 §5c](../adr/0003-nommage-et-structure.md)).

| Élément                 | Techno                                        | Notes                                                                                                                                                                                                                                              |
| ----------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StoragePort`           | abstract (`@cmz/shared-domain`)               | Contrat de stockage neutre : `save`/`get`/`remove`/`hasKey` (clair) + `saveObfuscated`/`getObfuscated`/`removeKeysWithPrefix`/`clearObfuscated` (obfusqué). Le domaine/application n'en dépend que par abstraction. **Nommage corrigé le 2026-08-03** (ex-`*Encrypted`) : le nom ne doit pas promettre une confidentialité que la clé embarquée dans le bundle ne peut pas fournir. |
| `BrowserStorageAdapter` | **Web Crypto API** (AES-GCM/PBKDF2) + `localStorage` | `implements StoragePort` dans `shared-browser` (`type:browser`). Obfuscation **asynchrone** (`crypto.subtle`, dérivation PBKDF2 100k itérations depuis le 2026-08-03) ; stockage synchrone. Câblé au **root** (`app.config`, `useExisting`). Caveat sécurité, documenté dans le fichier lui-même : clé embarquée = obfuscation, jamais un secret opposable à qui lit le bundle. |

## `@cmz/shared-application`

Orchestration du domaine ; dépend de `shared-domain` (dont **`StoragePort`**) —
**jamais** de `shared-browser` (règle `type:application` ↛ `type:browser`). Le
stockage concret est injecté au root.

| Service                     | Dépendances                     | État                                                                                                                         |
| --------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `ErrorHandlerRegistry`      | `shared-domain`                 | ✅ dispatch + `registerDefault` (33 handlers → 2)                                                                            |
| `SessionService`            | `StoragePort` (`shared-domain`) | ✅ écrit user/token/permissions en obfusqué ; expose depuis le 2026-08-03 un `signal<AuthToken \| null>` (`token`) chargé async au démarrage — consommé par `authInterceptor`/`authGuard` (composition root, chantier I-1/I-5) |
| `PermissionActionsService`  | `StoragePort` (`shared-domain`) | ✅ lecture **obfusquée async** (`getObfuscated`) : signal init vide puis rempli, `can()` réactif                             |
| `StorePathsService`         | `StoragePort` (`shared-domain`) | ✅ `signal` + async ; défauts corrigés (`OnInit`/`OnDestroy` morts sur service root supprimés, double injection dédupliquée) |
| `route-context`             | `@angular/router` + types UI    | ➡️ couche **ui/app** (dépend du `Router`)                                                                                    |
| `notifications-initializer` | —                               | ❌ **mort** (corps commenté) — non reproduit                                                                                 |

`permissionsActions`, `paths_data` et le jeton (`token_data`) sont stockés
**obfusqués** (`saveObfuscated` côté login). Web Crypto rend leur lecture
**asynchrone** : les signaux s'initialisent vides puis se remplissent après
déobfuscation — même limite assumée pour `authGuard`/`permissionGuard` que pour
`PermissionActionsService`/`StorePathsService` : un signal encore vide est un
refus, jamais un défaut permissif.
