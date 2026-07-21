# ADR-0003 — Nommage et structure du monorepo

- **Statut :** Accepted
- **Date :** 2026-07-21

## Contexte

Le nom du dépôt et l'emplacement des packages devaient être arrêtés **avant que
le premier package n'existe** : ils se propagent à l'URL Git, aux scopes npm,
aux images Docker, aux jobs de CI et aux imports de chaque package. Les corriger
ensuite impose de déplacer chaque package et de réécrire ses références.

Le premier chantier est le back-office Angular, mais le dépôt est destiné à
héberger React, React Native, Kotlin, Swift, PHP, Spring Boot, Rust et Grafana.
Un nom qui reflète le premier chantier vieillirait mal.

## Options envisagées

### Nommage

| Option                                                 | Évaluation                                                                    |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Nom lié à la première stack (`cmz-backoffice-angular`) | Un package Rust vivrait à terme dans un dépôt nommé « angular »               |
| `cmz-platform`                                         | Neutre vis-à-vis des technologies, décrit ce que le dépôt contient réellement |
| `cmz-monorepo`                                         | Neutre également, mais décrit le contenant plutôt que le produit              |

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

- [analyse du projet source](../architecture/analyse-du-projet-source.md)
