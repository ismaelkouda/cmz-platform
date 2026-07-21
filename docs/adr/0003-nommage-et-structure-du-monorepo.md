# ADR-0003 — Nommage et structure du monorepo

- **Statut :** Accepted
- **Date :** 2026-07-21
- **Phase concernée :** [Phase 01b](../phases/phase-01b-corrections-socle.md)
- **Origine :** points C2 et C3 de la
  [revue de socle du 2026-07-21](../reviews/2026-07-21-revue-socle-avant-phase-02.md)

## Contexte

Le workspace généré en Phase 01 s'appelait `cmz-backoffice-angular`, avec le
package racine `@cmz-backoffice-angular/source` et une unique zone `packages/*`.

Ce nommage reflète le premier chantier (le back-office Angular), pas la vocation
du dépôt : il est destiné à héberger React, React Native, Kotlin, Swift, PHP,
Spring Boot, Rust et Grafana. Le nom du dépôt se propage à l'URL Git, aux scopes
npm, aux images Docker, aux jobs de CI et aux imports de chaque package — le
corriger devient coûteux dès qu'un package existe.

La structure devait être arrêtée pour les mêmes raisons : déplacer des packages
après coup impose de réécrire toutes leurs références.

## Options envisagées

### Nommage

| Option                             | Évaluation                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| Conserver `cmz-backoffice-angular` | Un package Rust vivrait à terme dans un dépôt nommé « angular »               |
| `cmz-platform`                     | Neutre vis-à-vis des technologies, décrit ce que le dépôt contient réellement |
| `cmz-monorepo`                     | Neutre également, mais décrit le contenant plutôt que le produit              |

### Structure

| Option                   | Évaluation                                                                   |
| ------------------------ | ---------------------------------------------------------------------------- |
| `packages/*` plat        | Simple, mais ne distingue ni la nature ni la stack ; illisible à l'échelle   |
| `apps/` + `libs/`        | Sépare le déployable du réutilisable ; convention Nx la mieux outillée       |
| `packages/<stack>/<nom>` | Bon cloisonnement par technologie, mais éclate les bibliothèques transverses |

## Décision

- Le dépôt s'appelle **`cmz-platform`**, le package racine **`@cmz/source`**, et
  tous les packages adoptent le scope **`@cmz/*`**.
- La structure retenue est **`apps/` + `libs/`**, déclarée à la fois dans les
  _workspaces_ bun et dans `workspaceLayout` de `nx.json`.
- La technologie d'un package est portée par **son nom**
  (`@cmz/backoffice-angular`, `@cmz/api-spring`, `@cmz/ingest-rust`) et par ses
  **tags Nx**, jamais par l'arborescence.

## Justification

La distinction utile au quotidien est « qu'est-ce qui se déploie ? » — c'est
celle que `apps/` + `libs/` matérialise, et elle reste pertinente quelle que
soit la technologie : une application Spring Boot est une _app_, un module de
domaine partagé est une _lib_. Un découpage par stack, à l'inverse, obligerait à
choisir un dossier arbitraire pour toute bibliothèque transverse.

Quant au nommage, le coût de la décision est asymétrique : quelques minutes
aujourd'hui, une migration transverse plus tard.

## Conséquences

### Positives

- Le dépôt peut accueillir n'importe quelle technologie sans incohérence de nom.
- Le scope `@cmz/*` est court, cohérent, et prêt pour une éventuelle
  publication.
- `apps/` + `libs/` est la convention attendue par la majorité des générateurs
  Nx.

### Négatives / dette acceptée

- Les packages non-JS (Kotlin, Swift, Rust, PHP) vivront eux aussi sous `apps/`
  ou `libs/`, ce qui peut surprendre : ces dossiers ne sont pas réservés à
  l'écosystème npm. À expliciter dans la documentation d'architecture.

### Points à réévaluer

- Si le nombre de packages rend `libs/` difficile à parcourir, envisager un
  niveau de regroupement par domaine (`libs/backoffice/…`, `libs/shared/…`)
  plutôt qu'un regroupement par technologie.

## Références

- [Revue de socle du 2026-07-21, points C2 et C3](../reviews/2026-07-21-revue-socle-avant-phase-02.md)
