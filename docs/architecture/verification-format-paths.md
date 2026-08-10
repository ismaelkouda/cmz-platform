# Vérification du format réel de `CurrentUser.paths`

- **Généré :** 2026-08-10, en exécution de la tâche P1-3 de
  `docs/architecture/backlog-llm.md`.
- **Pourquoi ce document existe :** un agent LLM ne peut pas se connecter
  à un environnement de staging ni observer une vraie réponse serveur.
  Cette vérification nécessite un accès humain. Ce document décrit
  précisément quoi vérifier et quoi faire selon le résultat — il ne
  tranche rien lui-même.

## 1. Constat (code actuel, vérifié 2026-08-10)

- `pathsGuard` (`apps/backoffice-angular/src/app/guards/paths.guard.ts`,
  ligne 60-63) compare `route.routeConfig?.path` — un **segment de route
  nu, sans slash** (exemple : `"report-states"`, `"equipments/types"`) —
  contre le tableau retourné par `StorePathsService.paths()`.
- `StorePathsService.paths()` est alimenté par `SessionService.save()`
  (`libs/shared/application/src/lib/services/session.service.ts`, ligne
  83 : `await this.storePaths.setPaths(user.paths)`), où `user.paths`
  provient directement de `CurrentUserApiDto.paths: string[]`
  (`libs/authentication/data/src/lib/dtos/current-user-api.dto.ts`,
  ligne 35) — le champ brut du wire de login, sans transformation
  (`current-user.mapper.ts` ligne 46 : `paths: dto.paths` — passage
  direct, aucun parsing).
- Le fichier de test `current-user.mapper.spec.ts` utilise une fixture
  `paths: ['/admin', '/admin/users']` — **chemins absolus avec slash**,
  un format structurellement différent du segment nu attendu par
  `pathsGuard`. Ce fixture est un choix arbitraire de l'auteur du test,
  non tiré d'une réponse serveur réelle (confirmé : aucune fixture,
  mock, ni réponse serveur capturée n'a été trouvée dans ce dépôt ni
  documentée comme référence — voir le commentaire déjà présent dans
  `paths.guard.ts` lignes 37-49, qui documente lui-même cette
  incertitude comme un choix assumé mais non vérifié).
- **Personne n'a confirmé contre une vraie réponse serveur** lequel des
  deux formats (segment nu vs chemin absolu) — ni même un troisième
  format possible (chemin absolu incluant ou non les sous-routes) —
  correspond à la réalité du backend.

## 2. Ce qu'il faut vérifier en staging

1. Se connecter à l'application avec un compte réel (staging ou
   environnement disposant de vraies données de session) via le
   endpoint de login utilisé par `authentication-data`
   (`libs/authentication/data/src/lib/sources/*.api.ts` — identifier le
   endpoint exact appelé, généralement `POST /auth/login` ou équivalent).
2. Inspecter la réponse JSON brute du endpoint de login (onglet réseau
   du navigateur, ou capture côté serveur) et localiser le champ
   `paths` dans le payload `CurrentUser` retourné.
3. Noter la forme exacte des chaînes du tableau `paths` : par exemple
   `"report-states"` (segment nu), `"/report-states"` (chemin absolu),
   `"/backoffice/report-states"` (chemin préfixé), ou une autre
   structure (objets avec un champ `path`, hiérarchie imbriquée, etc.).
4. Vérifier si les sous-routes (ex. `report-states/approve/123`) sont
   listées individuellement dans `paths`, ou seulement les pages
   top-level de menu — ceci conditionne si la comparaison doit se faire
   sur `route.routeConfig?.path` (segment top-level, ce que fait le code
   actuel) ou sur un autre niveau de l'arborescence de route Angular.
5. Répéter avec au moins 2 comptes de profils différents (un profil
   restreint, un profil administrateur) pour vérifier que le format est
   stable et ne dépend pas du contenu métier des permissions.

## 3. Actions selon le résultat

### Cas A — le format réel est un segment nu (ex. `"report-states"`), cohérent avec le code actuel de `pathsGuard`

- Aucune modification de `paths.guard.ts` n'est nécessaire.
- Corriger uniquement la fixture de test dans
  `current-user.mapper.spec.ts` pour refléter le format confirmé (elle
  restera un exemple représentatif, mais ne sera plus un format
  arbitraire non vérifié) — remplacer `['/admin', '/admin/users']` par
  des segments nus représentatifs, et retirer le commentaire
  d'avertissement ajouté par la tâche P1-3 (il n'aura plus lieu d'être).
- Mettre à jour le commentaire de `paths.guard.ts` (lignes 37-49) pour
  remplacer « à confirmer contre une vraie réponse de connexion avant
  mise en production » par une confirmation datée, avec référence au
  ticket ou à la vérification effectuée.

### Cas B — le format réel est un chemin absolu (ex. `"/report-states"`)

- `pathsGuard` doit être corrigé : comparer contre `route.routeConfig?.path`
  préfixé d'un `/` (ou dériver `state.url` au niveau du premier segment
  seulement, pas le chemin complet, pour éviter de casser sur les
  sous-routes comme documenté dans le commentaire existant du guard).
- Mettre à jour `paths.guard.spec.ts` en conséquence (actuellement ses
  fixtures utilisent, comme le reste du code, des segments nus — à
  vérifier au moment de la correction).
- Mettre à jour la fixture de `current-user.mapper.spec.ts` pour
  qu'elle reste représentative du format confirmé (elle l'est déjà dans
  ce cas, le commentaire d'avertissement ajouté par P1-3 doit alors être
  retiré).

### Cas C — le format réel est autre chose (objets structurés, hiérarchie, préfixe applicatif)

- Ne pas improviser une correction ad hoc. Documenter le format exact
  observé (avec un extrait anonymisé de la réponse réelle, sans données
  personnelles) dans un nouveau ticket, et concevoir la comparaison de
  `pathsGuard` en fonction de la structure réelle plutôt que d'adapter
  le format existant par approximation.

## 4. Ce que ce document ne fait pas

Ce document ne modifie pas `paths.guard.ts` ni sa logique de
comparaison — conformément à l'instruction P1-3, cette modification ne
doit être faite qu'après confirmation du format réel, jamais par
supposition.
