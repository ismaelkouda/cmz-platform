# Contrats d'archétype — extraits du module de référence

- **Créé :** 2026-07-26
- **Source** : `libs/administrative-infrastructure/{domain,data,application,ui}`
  (module validé `ngc --strictTemplates` + `nx serve`, Phase 07).
- **But** : formaliser ce qu'on applique déjà par jugement à chaque nouveau
  module, pour le tester explicitement sur un cas plus dur
  (`administrative-boundary` : 3 entités hiérarchiques, relations, vues
  imbriquées) **avant** d'investir dans l'automatisation lourde (Phase 04 —
  `extract-pattern.js`/`check-pattern.js`/adaptateur SEOS, dépôt tiers non
  installé ici).

## Ce que c'est — et ce que ce n'est pas

**C'est** une déclinaison scopée du tableau « contrat d'archétype » du plan
d'exécution (§ Phase 07) : pour chaque **rôle de fichier**, on fixe son rôle
DDD/CQRS, sa règle mécanique (invariant vérifiable), l'extrait de convention
Angular 22 attendu, et un pointeur vers le fichier de référence exact. Le
squelette de chaque fichier est **déterministe** (dérivé du contrat) ; seul le
contenu métier change d'un module/d'une entité à l'autre.

**Ce n'est pas** la Phase 04 officielle : pas de mineur (`extract-pattern.js`)
qui découvre la structure depuis le source Angular 21, pas de `check-pattern.js`
scorant 106/106 contre un schéma versionné, pas d'adaptateur AST (ts-morph) qui
distribue automatiquement en libs. Ces outils dépendent d'un dépôt tiers SEOS
non installé dans ce monorepo (décision D1). Ici, l'IA (agissant sous ces
contrats) est le générateur ; la vérification structurelle se fait par les mêmes
moyens qu'aujourd'hui (`ngc --strictTemplates`, audit de boundaries sur imports
réels, `deps = imports`) — pas encore par un score automatisé.

## Comment lire les contrats

Chaque fichier ci-dessous couvre une couche et liste ses archétypes dans l'ordre
de production (domaine → data → application → ui). Pour chaque archétype :

| Élément               | Contenu                                                                 |
| --------------------- | ----------------------------------------------------------------------- |
| **Rôle DDD/CQRS**     | Ce que le fichier fait dans l'architecture                              |
| **Règle mécanique**   | Invariant vérifiable, indépendant du métier                             |
| **Squelette**         | Forme générique du fichier (trous = contenu métier)                     |
| **Référence**         | Fichier exact du module `administrative-infrastructure` dont c'est issu |
| **Variantes connues** | Cas où le contrat a déjà dû être adapté (documentées, pas des bugs)     |

## Fichiers

- [`domain.md`](./domain.md) — props, entity, contract/validate-contract,
  validator, value-object, repository-port, filter-entity, enum wire-first.
- [`data.md`](./data.md) — endpoints, dto, response-mapper, command-mapper,
  api-source, repository-impl.
- [`application.md`](./application.md) — use-case, facade (Collection/Resource).
- [`ui.md`](./ui.md) — constants (form-keys/filter-keys/table/status-label),
  vm-props + presenter, filter-store, form-store, feature component, routes,
  composition-root providers.

## Boucle d'application (par fichier, par entité)

1. Identifier le rôle du fichier → ouvrir le contrat correspondant.
2. Vérifier la **règle mécanique** contre la réalité de l'entité (ex. « pas de
   toggle » pour `region`/`department`/`municipality` → omettre l'archétype
   enable/disable, pas le vider de son contenu).
3. Remplir le squelette avec le contenu métier de l'entité (noms, champs,
   validations, endpoints).
4. Si la réalité de l'entité force un écart au contrat (ex. `code` requis,
   relations `{id,name}`) : **documenter la variante dans le contrat**, ne pas
   improviser en silence — c'est ce qui rend le contrat réutilisable pour
   l'entité suivante.
5. Valider : `ngc --strictTemplates` + audit boundaries + `deps = imports`.

## Verdict à documenter après `administrative-boundary`

Une fois le module construit sous ces contrats, noter ici si l'hypothèse tient :
les contrats ont-ils survécu sans modification substantielle au cas plus dur
(hiérarchie, relations, vues imbriquées) ? Si oui → argument fort pour étendre
l'approche aux domaines suivants avant d'investir dans la Phase 04. Si non → les
points de rupture précis deviennent les premières entrées du futur profil de
convention / des futurs contrats d'archétype officiels.

**Statut : en attente de test (module `administrative-boundary`).**
