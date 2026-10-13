# Licences tierces — état vérifié

> **Document vivant, corrigé sur place** (`docs/README.md`) : ce n'est pas un
> avis juridique — c'est un inventaire technique factuel des licences
> déclarées par les paquets tiers, à faire relire par le porteur métier/
> juridique avant toute décision (cf. [`LICENSE`](../../LICENSE)).

## Méthode

```bash
npx --yes license-checker-rseidelsohn@4.3.0 --production --json --out licenses-production.json
npx --yes license-checker-rseidelsohn@4.3.0 --summary
```

`license-checker-rseidelsohn` lit le champ `license` déclaré par chaque
paquet résolu dans `node_modules` (pas une supposition à partir du nom du
paquet). Rejoué le 2026-10-12 après les montées Playwright 1.64.0 et Vite
8.3.4, puis l'ajout de la police de test DejaVu Sans 5.3.0.

## Dépendances de production (ce qui est réellement livré au navigateur)

**17 paquets tiers, tous à licence permissive — aucune licence copyleft (GPL/AGPL/
LGPL/MPL) détectée :**

| Paquet | Version | Licence | Obligation pratique |
| --- | --- | --- | --- |
| `@angular/common`, `@angular/compiler`, `@angular/core`, `@angular/forms`, `@angular/localize`, `@angular/platform-browser`, `@angular/router` | 22.2.0 | MIT | Conserver la notice de copyright |
| `@angular/aria`, `@angular/cdk`, `@angular/material` | 22.2.1 | MIT | Conserver la notice de copyright |
| `date-fns` | 4.4.0 | MIT | Conserver la notice de copyright |
| `exceljs` | 4.4.0 | MIT | Conserver la notice de copyright |
| `i18next` | 26.3.6 | MIT | Conserver la notice de copyright |
| `ol` (OpenLayers) | 10.10.0 | BSD-2-Clause | Conserver la notice de copyright dans la doc/l'à-propos |
| `react-router` | 8.4.0 | MIT | Conserver la notice de copyright |
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
2026-09-30) est corrigé — `axe-core` (MPL-2.0, devDependency ajoutée le
2026-08-04, gate a11y T12-8) manquait, la relecture manuelle n'ayant jamais
été rejouée depuis son ajout. C'est exactement la dérive que ce document
annonçait lui-même comme possible (« pas de garantie de fraîcheur
automatique », section précédente) — corrigée en l'outillant (`check:
licenses`, ci-dessous), pas seulement en mettant à jour le chiffre une fois
de plus.

80 paquets résolus au total : 66 MIT, 6 Apache-2.0, 1 BSD-2-Clause, 3 ISC,
1 0BSD, 1 **OFL-1.1** (`@fontsource/dejavu-sans@5.3.0`), 1 **MPL-2.0**
(`axe-core@4.13.0`) et 1 `UNLICENSED` (ce dépôt). Aucune licence non
permissive **côté production** ; les deux exceptions concernent uniquement
l'outillage et les tests, jamais le livrable navigateur — voir les décisions
documentées ci-dessous.

### Exception documentée — `axe-core` (MPL-2.0)

`axe-core@4.13.0` est une devDependency utilisée uniquement par la suite de
tests d'accessibilité (T12-8, gate CI a11y) — jamais importée par
`apps/backoffice-angular` ni bundlée dans `dist/`. MPL-2.0 est un copyleft
« faible » (obligations limitées aux fichiers du paquet lui-même modifiés,
pas de contamination du code appelant) ; en usage devDependency non
redistribué, aucune obligation ne s'applique au code de ce dépôt. Exception
déclarée nominativement dans `tools/check-licenses.mjs`
(`DEV_ONLY_EXCEPTIONS`) — invalidée automatiquement si `axe-core` migrait
un jour vers une dépendance de production.

### Exception documentée — `@fontsource/dejavu-sans` (OFL-1.1)

`@fontsource/dejavu-sans@5.3.0` est une devDependency utilisée uniquement par
deux preuves Playwright de reflow React C5. Les deux WOFF2 requis sont lus par
le processus de test, vérifiés par SHA-256 puis injectés dans la page de test ;
ils ne sont importés par aucun fichier produit et ne figurent pas dans le
bundle navigateur.

Le manifeste npm déclare `OFL-1.1` ; c'est cette métadonnée que relève la gate
automatique. Le fichier `LICENSE` réellement livré par le paquet contient
toutefois les notices historiques Bitstream Vera et Arev, et indique que les
modifications DejaVu sont dans le domaine public. Toute redistribution des
fichiers de police doit donc conserver ce fichier et ses notices complètes,
notamment les conditions relatives aux noms réservés, aux modifications et à
la vente de la police seule. Cette distinction entre métadonnée SPDX et texte
embarqué est volontaire : ni un humain ni un LLM ne doit déduire les
obligations juridiques du seul identifiant retourné par l'outil.

L'exception nominative reste déclarée dans `tools/check-licenses.mjs`
(`DEV_ONLY_EXCEPTIONS`) et est automatiquement refusée si le paquet migre vers
les dépendances de production.

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
