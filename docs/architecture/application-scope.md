# Couche `shared-application` — état

- **Dernière mise à jour :** 2026-07-22

`@cmz/shared-application` orchestre le domaine. Elle dépend de `shared-domain`
(et pourra dépendre de `shared-data`/`shared-infra`), jamais l'inverse.

## Généré

| Service                | Dépendances     | Notes                                                                                                                                                                                                                                                              |
| ---------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ErrorHandlerRegistry` | `shared-domain` | Dispatch générique + **handler par défaut** (`registerDefault`) — la couche UI enregistre le défaut ; seules les exceptions ont un handler propre (cf. [`error.contract`](../../contracts/error.contract.md)). Normalisé `@Injectable`→`@Service`, code simplifié. |

## Bloqué — en attente de `shared-infra` (et d'approbation d'install)

Ces services `application` **injectent `EncodingDataService`** (chiffrement via
`crypto-js` + `localStorage`) ou d'autres briques d'infra :

| Service                     | Bloqueur                                              |
| --------------------------- | ----------------------------------------------------- |
| `session`                   | `EncodingDataService` (crypto-js), `localStorage`     |
| `permission-actions`        | `EncodingDataService`                                 |
| `store-paths`               | `EncodingDataService`                                 |
| `route-context`             | `@angular/router` + types UI (`RouteContextType`)     |
| `notifications-initializer` | **mort** (corps entièrement commenté) — non reproduit |

**Prérequis** : bâtir `@cmz/shared-infra` avec `EncodingDataService`, ce qui
exige d'installer `crypto-js` — **approbation utilisateur requise** avant tout
`bun add` (règle projet). Tant que ce n'est pas fait, ces services restent en
attente.
