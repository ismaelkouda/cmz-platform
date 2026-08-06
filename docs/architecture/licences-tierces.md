# Licences tierces — état vérifié

> **Document vivant, corrigé sur place** (`docs/README.md`) : ce n'est pas un
> avis juridique — c'est un inventaire technique factuel des licences
> déclarées par les paquets tiers, à faire relire par le porteur métier/
> juridique avant toute décision (cf. [`LICENSE`](../../LICENSE)).

## Méthode

```bash
npx license-checker-rseidelsohn --production --json --out licenses-production.json
npx license-checker-rseidelsohn --summary
```

`license-checker-rseidelsohn` lit le champ `license` déclaré par chaque
paquet résolu dans `node_modules` (pas une supposition à partir du nom du
paquet). Rejoué le 2026-08-03.

## Dépendances de production (ce qui est réellement livré au navigateur)

**13 paquets, tous à licence permissive — aucune licence copyleft (GPL/AGPL/
LGPL/MPL) détectée :**

| Paquet | Version | Licence | Obligation pratique |
| --- | --- | --- | --- |
| `@angular/common`, `@angular/compiler`, `@angular/core`, `@angular/forms`, `@angular/platform-browser`, `@angular/router` | 22.0.7 | MIT | Conserver la notice de copyright |
| `date-fns` | 4.4.0 | MIT | Conserver la notice de copyright |
| `exceljs` | 4.4.0 | MIT | Conserver la notice de copyright |
| `i18next` | 26.3.6 | MIT | Conserver la notice de copyright |
| `ol` (OpenLayers) | 10.10.0 | BSD-2-Clause | Conserver la notice de copyright dans la doc/l'à-propos |
| `rxjs` | 7.8.2 | Apache-2.0 | Conserver la notice ; licence de brevet explicite (généralement favorable en entreprise) |
| `tslib` | 2.8.1 | 0BSD | Aucune (licence sans condition) |
| `@cmz/source` | 0.0.0 | `UNLICENSED` | Ce dépôt lui-même — cohérent avec `"private": true` |

**Correction d'un constat périmé** (audit-workspace-2026-08-02-addendum.md,
P1-N2) : `sweetalert2` y était cité comme dépendance à vérifier — **vérifié
et infirmé** : absent de `package.json`, absent de `node_modules`, aucune
occurrence dans le code source. L'espace de noms i18n `SWEET_ALERT.*`
(`fr.translation.ts`) est un héritage de convention de nommage du legacy, pas
un import du paquet npm — ce projet ne dépend pas de `sweetalert2`.

## Ensemble du dépôt (production + outillage de build)

46 paquets résolus au total : 40 MIT, 3 Apache-2.0, 1 BSD-2-Clause, 1 0BSD, 1
`UNLICENSED` (ce dépôt). Aucune licence copyleft, aucune licence non
identifiée (`UNKNOWN`).

## Ce que ce document ne tranche pas

- **Ce n'est pas une revue juridique.** Une licence permissive n'élimine pas
  une obligation d'attribution (MIT/BSD/Apache exigent toutes de conserver la
  notice de copyright — à vérifier que `about`/mentions légales le fait, hors
  périmètre technique de ce document).
- **Le corpus de recherche** (`corpus/*.pairs.jsonl`) et **les outils SEOS
  tiers** (portage prévu, chantier J-8/J-9/J-10, pas encore fait) ont un
  régime de licence distinct, non couvert ici — voir
  [`LICENSE`](../../LICENSE).
- **Pas de garantie de fraîcheur automatique** : ce fichier n'est pas
  régénéré par un job CI (contrairement à `STATUS.md`/`README.md`, marqueurs
  `BEGIN:GENERATED`) — à rejouer manuellement avant chaque revue de
  dépendances majeure, ou à outiller (`check:licenses` dans `tools/`, non
  fait) si la fréquence de dérive le justifie.
