# Module `report-states` — Plan de reconstruction Big Tech (META / Google Rigor)

- **Créé :** 2026-07-28
- **Statut :** **Module IR clôturé** (2026-07-31) — corpus 187 paires, 8
  chaînes, Meta 12/12. Oracle Tier 1 vert (build, test, lint, corpus). Voir
  [`report-states-meta-verification.md`](./audits/report-states-meta-verification.md)
  et assumption [A-2026-07-31-04](../seos/Assumptions-Register.md).

---

## 🏛️ 1. Analyse & Archétype du Module

Le module `report-states` regroupe l'historique et la gestion des signalements
selon leurs jalons de traitement :

1. **`approved` (`demandes recevables`)** : Signalements validés et déclarés
   recevables.
2. **`evaluated` (`signalements évalués`)** : Signalements ayant fait l'objet
   d'une évaluation technique/terrain.
3. **`closed` (`signalements clôturés`)** : Signalements dont le traitement a
   été finalisé et clôturé.
4. **`rejected` (`demandes non recevables`)** : Signalements rejetés ou non
   recevables.
5. **`downloads` (`exports & téléchargements`)** : Centre d'export et de
   téléchargement d'états (Shapefile, Excel).

---

## 📦 2. Scaffolding Nx (`libs/report-states/`)

Le module sera découpé en **4 packages Nx strictement isolés** :

```
libs/report-states/
├── domain/       # @cmz/report-states-domain (Entities, Enums, Value Objects, Repository Ports)
├── data/         # @cmz/report-states-data (Endpoints, DTOs, Mappers, APIs, Repositories Impl)
├── application/  # @cmz/report-states-application (Use-Cases, Façades & Signal State)
└── ui/           # @cmz/report-states-ui (PageComponents, Table Components, Routes)
```

---

## 🔑 3. Contrat d'Endpoints (`report-states.endpoints.ts`)

L'ensemble des routes HTTP est isolé dans le fichier de contrat canonique :

```ts
// libs/report-states/data/src/lib/endpoints/report-states.endpoints.ts
export const REPORT_STATES_ENDPOINTS = {
    APPROVE: 'requests/approved',
    EVALUATE: 'finalizations/evaluated',
    CLOSE: 'finalizations',
    REJECT: 'requests/rejected',
    DOWNLOAD: 'exports',
    DETAILS_REPORT_STATES: 'requests',
} as const;
```

---

## 🌍 4. Clés i18n (`fr.translation.ts`)

Isolation complète sous le namespace `REPORT_STATES` dans
`apps/backoffice-angular/src/app/i18n/fr.translation.ts` pour couvrir les 5
sous-pages (`APPROVE`, `EVALUATE`, `CLOSE`, `REJECT`, `DOWNLOAD`).

---

## 📅 5. Plan d'Exécution en 8 Phases

1. **Phase 1 : Analyse & Spécification** — Audit des 5 sous-volets, définition
   des DTOs, Mappers et Façades. ✅
2. **Phase 2 : Scaffolding Nx & Configuration** — Création des 4 packages Nx
   `@cmz/report-states-*`, mise à jour de `tsconfig.base.json` et
   `eslint.config.mjs` avec le tag `scope:report-states`. ✅
3. **Phase 3 : Domaine (`@cmz/report-states-domain`)** — Enum
   `ReportStateSection`, entités et contrats de repositories
   `ReportStatesRepository`. ✅
4. **Phase 4 : Data (`@cmz/report-states-data`)** —
   `report-states.endpoints.ts`, DTOs, Mappers, APIs et
   `ReportStatesRepositoryImpl`. ✅
5. **Phase 5 : Application (`@cmz/report-states-application`)** — Use-cases et
   façades concrètes (`ApproveFacade`, `EvaluateFacade`, `CloseFacade`,
   `RejectFacade`, `DownloadFacade`). ✅
6. **Phase 6 : UI (`@cmz/report-states-ui`)** — 5 PageComponents et
   `REPORT_STATES_ROUTES`. ✅
7. **Phase 7 : Câblage App, i18n & Mock Server** — Composition Root
   `provideReportStates()`, `app.routes.ts`, dictionnaire i18n
   `fr.translation.ts`, et mock server. ✅
8. **Phase 8 : Oracle de Vérification Stricte & Livraison** — Verification
   `tsc --noEmit`, `eslint --max-warnings=0`, `ngc --strictTemplates`, Smoke
   test `curl` & Commit Git. ✅
