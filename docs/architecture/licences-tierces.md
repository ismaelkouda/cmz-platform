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

**Correction (2026-08-11, T6-2)** : le compte ci-dessous (rejoué le
2026-08-03) est corrigé — `axe-core` (MPL-2.0, devDependency ajoutée le
2026-08-04, gate a11y T12-8) manquait, la relecture manuelle n'ayant jamais
été rejouée depuis son ajout. C'est exactement la dérive que ce document
annonçait lui-même comme possible (« pas de garantie de fraîcheur
automatique », section précédente) — corrigée en l'outillant (`check:
licenses`, ci-dessous), pas seulement en mettant à jour le chiffre une fois
de plus.

54 paquets résolus au total : 43 MIT, 5 Apache-2.0, 1 BSD-2-Clause, 1
BSD-3-Clause, 1 ISC, 1 0BSD, 1 **MPL-2.0** (`axe-core@4.12.1`), 1
`UNLICENSED` (ce dépôt). Aucune licence copyleft **côté production** ; une
seule licence copyleft faible (MPL-2.0, fichier par fichier) côté
outillage, jamais bundlée dans le livrable navigateur — voir §
« Exception documentée » ci-dessous.

### Exception documentée — `axe-core` (MPL-2.0)

`axe-core@4.12.1` est une devDependency utilisée uniquement par la suite de
tests d'accessibilité (T12-8, gate CI a11y) — jamais importée par
`apps/backoffice-angular` ni bundlée dans `dist/`. MPL-2.0 est un copyleft
« faible » (obligations limitées aux fichiers du paquet lui-même modifiés,
pas de contamination du code appelant) ; en usage devDependency non
redistribué, aucune obligation ne s'applique au code de ce dépôt. Exception
déclarée nominativement dans `tools/check-licenses.mjs`
(`DEV_ONLY_EXCEPTIONS`) — invalidée automatiquement si `axe-core` migrait
un jour vers une dépendance de production.

## Automatisation (T6-2)

Ce document reste la référence lisible par un humain, mais n'est plus la
seule barrière : `tools/check-licenses.mjs` (`bun run check:licenses`, job
CI bloquant `licenses`) rejoue `license-checker-rseidelsohn` à chaque build
et échoue si (1) une dépendance de **production** a une licence non
permissive, ou (2) une dépendance **quelconque** (prod ou dev) a une
licence copyleft/inconnue non explicitement documentée dans
`DEV_ONLY_EXCEPTIONS`. Un nouveau paquet copyleft ne peut donc plus dériver
silencieusement — il fait échouer la CI et force une décision explicite
(ajout justifié à l'allowlist, ou refus de la dépendance).

## Ce que ce document ne tranche pas

- **Ce n'est pas une revue juridique.** Une licence permissive n'élimine pas
  une obligation d'attribution (MIT/BSD/Apache exigent toutes de conserver la
  notice de copyright — à vérifier que `about`/mentions légales le fait, hors
  périmètre technique de ce document).
- **Le corpus de recherche** (`corpus/*.pairs.jsonl`) et **les outils SEOS
  tiers** (portage prévu, chantier J-8/J-9/J-10, pas encore fait) ont un
  régime de licence distinct, non couvert ici — voir
  [`LICENSE`](../../LICENSE).
- **Le code du legacy** (`cmz-backoffice-frontend`) n'est pas un paquet
  tiers résolu par `node_modules` — il est hors périmètre de cet inventaire.
  Sa titularité est clarifiée séparément par
  [ADR-0023](../adr/0023-titularite-des-droits-sur-le-legacy.md).
- **Ce tableau détaillé** (paquets de production listés un par un,
  ci-dessus) reste à rejouer manuellement pour une revue humaine complète —
  seul le comptage/la classification par licence est désormais garanti à
  jour par la CI, pas la liste nominative de ce document.
