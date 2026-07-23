# ADR-0012 — Stratégie cross-framework (Angular + React)

- **Statut :** Accepted
- **Date :** 2026-07-22

## Contexte

Le dépôt hébergera Angular **puis** React (entre autres). Pour ne pas se
disperser, les briques transverses doivent, autant que possible, être choisies
**framework-agnostic** — réutilisables tel quel côté React.

Le projet source s'appuie sur des libs **Angular-only** : `ngx-translate`/
`@jsverse/transloco` (i18n), `ngx-toastr` (toasts), `primeng` (composants),
`moment` (dates, déprécié).

## Décision

### Libs transverses (agnostiques)

| Besoin                                | Remplacé                  | Retenu (agnostique)                                              | Adaptateur par framework                         |
| ------------------------------------- | ------------------------- | ---------------------------------------------------------------- | ------------------------------------------------ |
| i18n                                  | Transloco / ngx-translate | **i18next** (`26.3.6`)                                           | `angular-i18next` / `react-i18next` (dans l'app) |
| dates                                 | moment                    | **date-fns**                                                     | — (agnostique)                                   |
| toasts                                | ngx-toastr                | **Sonner** — `ngx-sonner` 3.1.0 (Angular ≥19) / `sonner` (React) | par framework (même UX)                          |
| modales                               | sweetalert2               | **SweetAlert2** (`11.26.25`, vanilla)                            | — (agnostique)                                   |
| composants (TreeNode, MessageService) | primeng                   | **abandonné du partagé**                                         | composants **par framework**                     |

Une **component library ne se partage pas** entre Angular et React : `primeng`
sort du kernel. Les types empruntés (`TreeNode`) deviennent des interfaces
maison.

### Pattern Ports & Adapters

Le `shared` définit des **ports** (abstractions agnostiques : `TranslationPort`,
plus tard `NotificationPort`). Les **moteurs** agnostiques (i18next, date-fns,
SweetAlert2) et le **liant framework** (DI, rendu) sont des **adaptateurs** —
placés de façon à respecter le DAG (pas de cycle `application ↔ infra`).

## Périmètre réel de réutilisation React (honnête)

Seuls **`shared-domain`** et **`shared-constants`** sont **framework-purs**
(aucun `@angular`). `shared-data`/`application`/`ui`/`infra` portent
`@Service`/`@Pipe`/`inject` → **liés Angular**. Une vraie réutilisation React de
ces couches imposera de **découpler la DI** (classes/fonctions agnostiques + DI
fournie par chaque framework).

**Dette actée / à réévaluer** : extraire un cœur agnostique (logique des
mappers, services) séparé du décorateur `@Service`, quand la partie React
démarrera. Non résolu ici — signalé pour ne pas le découvrir trop tard.

## Conséquences

- **i18next** (`26.3.6`), **SweetAlert2** (`11.26.25`) et **ngx-sonner**
  (`3.1.0`) au catalog ; adaptateurs après `bun install`. `date-fns` : décidé,
  install à venir.
- **Ports** définis (agnostiques) : `TranslationPort`, `NotificationPort`
  (toasts/Sonner), `ConfirmDialogPort` (modales/SweetAlert2).
- `primeng`/`ngx-toastr`/`Transloco` **ne seront pas** ajoutés au partagé.
- Le `TranslationPort` est un contrat agnostique ; l'implémentation i18next et
  le liant Angular restent des adaptateurs.

## Références

- [ADR-0005 versions du socle](./0005-versions-du-socle.md) — catalog / version
  unique
- [ui-scope](../architecture/ui-scope.md),
  [application-scope](../architecture/application-scope.md)
