# Module `authentication` — plan de reconstruction

- **Créé :** 2026-07-27
- **Statut :** plan (avant Phase 1)
- **Gabarit de référence :** `module-administrative-boundary.md` (Phase 08) pour
  la méthode ; **mais un archétype différent** — cf. § Pourquoi ce module est un
  test différent.
- **Contrats d'archétype :** [`archetypes/`](./archetypes/README.md) — le
  verdict après `administrative-boundary` valide l'approche pour le pattern
  **CRUD**. Ce module teste le **second pattern** annoncé par
  `plan-d-execution.md` (Phase 07, Lot 1) : `action-request` — une opération
  unique (login, mot de passe oublié, réinitialisation), pas une liste + CRUD.

## Pourquoi ce module est un test différent

`administrative-infrastructure` et `administrative-boundary` sont tous les deux
des entités **CRUD** (liste paginée + filtre + find-one + select +
create/update/delete). `authentication` n'a **aucune** de ces formes : 3
opérations indépendantes (`login`, `forgot-password`, `reset-password`), chacune
un aller-retour requête → réponse unique, sans pagination, sans select, sans
mutation au sens CRUD. C'est le pattern que `plan-d-execution.md` (§ Phase 07,
Lot 1) désigne comme « **action-request** », à valider avant de généraliser aux
domaines suivants.

## Périmètre (source : `presentation/pages/authentication`, 96 fichiers)

Trois opérations, structure identique par opération (domain/application/
infrastructure/presentation/di — CQRS complet dans le source) :

- **login** — `email, password` →
  `{ user: CurrentUser, token: AuthToken, message? }`. La seule opération qui
  **retourne réellement** une session (utilisée ensuite pour peupler le stockage
  et rediriger vers le dashboard).
- **forgot-password** — `email` → `{ user, token, message? }` **dans le
  source**, mais le composant (`forgot-password.component.ts`) ne lit jamais
  `.user`/`.token` : il ne fait que vérifier la présence d'une réponse pour
  afficher l'écran « email envoyé ». → **incohérence source à corriger** (cf.
  décision 1 ci-dessous).
- **reset-password** — `token, email, password, confirmPassword` →
  `{ user, token, message? }` **dans le source**, mais le composant ne fait que
  rediriger vers `/login` sur succès (pas d'auto-login). Même incohérence que
  `forgot-password`.

Endpoints (constante data, `AUTH_API_URL` déjà présent dans `@cmz/core`) :
`login`, `forgot-password`, `reset-password`.

## Ce que le kernel a déjà — et qui change le chiffrage

Contrairement aux deux premiers modules, une bonne partie du support kernel
existe **déjà**, posée par la Phase 05 en anticipation de ce module (`grep`
confirmé, pas une supposition) :

| Pièce                                                                                                                                                     | Lib                              | État                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EmailRequiredError`, `PasswordRequiredError`, `InvalidEmailError`, `ConfirmPasswordRequiredError`, `ConfirmPasswordNoMatchError`, `GenericRequiredError` | `shared-domain`                  | **Prêtes**, mêmes classes que dans le source (import identique)                                                                                         |
| `isValidEmail`, `isMatchConfirmPassword`                                                                                                                  | `shared-domain`                  | **Prêts**                                                                                                                                               |
| `AccountLockedError`, `UnauthorizedError`, `ServerResponseError`, `UnknownError`                                                                          | `shared-domain`                  | **Prêtes** — erreurs HTTP/serveur déjà typées                                                                                                           |
| `StoragePort` (`save`, `saveEncrypted`, `getEncrypted`, `removeKeysWithPrefix`, `clearEncrypted`)                                                         | `shared-domain`/`shared-browser` | **Prêt**, déjà consommé par `PermissionActionsService`                                                                                                  |
| `PermissionActionsService`                                                                                                                                | `shared-application`             | **Prêt**, lit déjà `getEncrypted('permissionsActions')` — **vide aujourd'hui**, en attente que `login` l'alimente                                       |
| `SessionService`                                                                                                                                          | `shared-application`             | **Partiel** : `clear()` existe (déclenché par `UnauthorizedError` dans `UiFeedbackService`), **`save()` manque** — à ajouter, pas à réinventer ailleurs |
| `UiFeedbackService`                                                                                                                                       | `shared-ui`                      | **Prêt** : handler par défaut (toast `messageKey` traduit) + handler `UnauthorizedError` (toast + `session.clear()`) déjà branchés                      |
| `ResourceFacade<TData, TParams>`                                                                                                                          | `shared-application`             | **Réutilisable tel quel** pour les 3 opérations (cf. décision 4) — **pas de nouvelle façade à créer**                                                   |
| `unwrapResponse` / `assertResponseOk`, `SimpleResponseMapper`                                                                                             | `shared-data`                    | **Prêts**, `ServerResponseError` porte déjà le message serveur en passthrough i18next                                                                   |
| `AUTH_API_URL`                                                                                                                                            | `@cmz/core`                      | **Prêt**                                                                                                                                                |
| `COMMON_FORM_VALIDATORS`                                                                                                                                  | `shared-ui`                      | **Prêt**                                                                                                                                                |

**Conséquence directe** : ce module coûte structurellement moins cher que prévu
par le plan d'origine — la majorité du kernel `action-request` est déjà posée,
il ne manque que la consommation (validators/repositories/facades/UI) et un seul
ajout kernel (`SessionService.save()`).

## Hors périmètre (confirmé par lecture du source, pas une supposition)

Le guard de route (`core/guard/auth.guard.ts`, `unauth.guard.ts`,
`PagesGuard.ts`) et l'intercepteur HTTP
(`core/interceptors/auth.interceptor.ts`, attache le `Bearer token`) vivent
**hors** de `presentation/pages/authentication/` dans le source — ce sont des
fichiers de `core/`, donc relevant de la Phase 05c (`@cmz/core`), pas de ce
module. **Ne pas les construire ici** : ce module fournit la façade `login` qui
**écrit** la session (`SessionService.save`) ; la **lecture** de cette session
par un guard/intercepteur est un travail `@cmz/core` séparé, à faire quand ce
sous-lot sera traité. Le payoff immédiat sans eux : `PermissionActionsService`
devient réel dès que `login` écrit dans le storage — pas besoin d'attendre le
guard pour avoir un bénéfice mesurable.

`AppCustomizationService` (logo/nom d'app) et `EncodingDataService` (remplacé
par `StoragePort`) ne sont pas dans le kernel actuel — décision 6.

## Décisions d'ingénieur (non-reproduction) — à appliquer

1. **`forgot-password`/`reset-password` ne retournent pas de session.** Le
   composant source n'utilise jamais `.user`/`.token` pour ces deux opérations
   (vérifié dans `forgot-password.component.ts` et `reset-password.component.ts`
   : seule la présence d'une réponse compte). → props/entity/DTO réduits à
   `{ message: string }` pour ces deux opérations ; **seul `login`** garde
   `{ user: CurrentUser, token: AuthToken, message? }`. Ne pas dupliquer la
   forme `login` par copier-coller.
2. **CQRS dégénéré supprimé — même principe qu'en Phase 07/08.** Le source a
   `commands-bus` + `commands-handlers` + `commands-mappers` + `commands` +
   `application/dto` + `di/*-par-opération` pour **une seule** implémentation
   par « bus » (le `dispatch()` fait un `instanceof` vers un unique handler —
   aucune polymorphie réelle). → chaîne **façade → use-case → repository
   (port)**, comme pour
   `administrative-infrastructure`/`administrative-boundary`. Pas de
   command/bus/handler/mapper/dto applicatif, pas de `di/` par opération (un
   seul `provideAuthentication()`).
3. **Pas de nouvelle façade kernel — `ResourceFacade<TEntity, TParams>`
   convient.** Une opération `action-request` est un aller-retour unique : poser
   les paramètres validés déclenche le fetch via `rxResource` (`setParams`), la
   vue lit `value()`/`isLoading()`/`error()`. C'est exactement ce que
   `ResourceFacade` fait déjà (utilisé pour les selects dans
   `administrative-boundary`) — inutile d'inventer une `ActionFacade`. Chaque
   soumission de formulaire construit un **nouvel objet** contract (nouvelle
   référence), ce qui redéclenche `rxResource` même en cas de resoumission des
   mêmes valeurs après une erreur (pas de piège d'égalité de référence).
4. **`SessionService.save()` à ajouter dans `shared-application`, pas dans le
   module.** Le kernel a déjà `SessionService.clear()` (Phase 05,
   pré-positionné). Le module `login` (facade, via un `effect()` sur `value()`)
   appelle `sessionService.save(user, token, permissions)` au succès —
   symétrique à `clear()`, dans le même service kernel, pas un service dupliqué
   dans `authentication-application`. Écrit via `StoragePort.saveEncrypted` avec
   les clés déjà lues par `PermissionActionsService` (`permissionsActions`) et
   par `clear()` (`token_data`, `user_data`).
5. **`CurrentUser`/`AuthToken`/`UserPermissions` manquent dans le kernel — à
   ajouter à `@cmz/shared-domain`.** Ce ne sont pas des concepts du module
   `authentication` seul : `PermissionActionsService`, un futur guard, et tout
   composant affichant l'utilisateur courant en ont besoin. → nouvelles
   interfaces kernel (`interfaces/current-user.interface.ts`), pas des types
   internes au module.
6. **Erreurs de validation : réutiliser les types kernel existants, pas
   `GenericRequiredError` par défaut.** `email`/`password`/`confirmPassword`
   sont des concepts déjà typés dans le kernel
   (`EmailRequiredError`/`InvalidEmailError`/`PasswordRequiredError`/
   `ConfirmPasswordRequiredError`/`ConfirmPasswordNoMatchError`, mêmes classes
   que le source importe). `GenericRequiredError` reste réservé au seul champ
   sans type dédié : `token` (reset-password), exactement comme le source. Note
   pour usage futur : `GenericRequiredError.messageKey` est **fixe**
   (`'COMMON.ERROR.REQUIRED'`) — l'argument du constructeur n'alimente que
   `.message` (fallback debug), pas la clé traduite. Sans conséquence ici
   (garde-fou de dernier recours derrière la validation Signal Forms côté écran,
   jamais réellement déclenché en usage normal), mais **à garder en tête** : la
   convention `GenericRequiredError('<NS>....')` documentée dans
   `archetypes/domain.md` ne personnalise pas le toast si ce chemin est un jour
   atteint sans passer par le formulaire. Observation, pas un correctif à faire
   ici (modules déjà livrés, hors périmètre de ce plan).
7. **Formulaires en Signal Forms, pas `FormBuilder`/`ReactiveFormsModule`.** Le
   source utilise l'API Reactive Forms classique (Angular 21). Le reste de
   `cmz-platform` est signal-first (`form()`, `[formField]`, `required()`,
   `disabled()`) — traduction directe attendue, pas une déviation : mêmes règles
   de validation (email pattern, password minlength 8, required), mêmes messages
   d'erreur par champ.
8. **Pas d'`AppCustomizationService`/branding dans ce module.** Le logo/nom
   d'app affichés sur les écrans d'auth ne sont pas dans le kernel actuel et ne
   sont pas au cœur de l'authentification — soit un texte fixe (« CMZ Backoffice
   »), soit un token de config minimal si trivial à ajouter ; jugé au moment de
   la Phase 5 UI, pas un service à construire ici.
9. **Guard/intercepteur hors périmètre (cf. § Hors périmètre).** Routes
   publiques (`login`, `forgot-password`, `reset-password`) accessibles sans
   garde pour l'instant — la protection des routes `territorial-structures/*`
   etc. reste un travail `@cmz/core` séparé (Phase 05c/06), pas ce plan.

## Phase 1 — Scaffolding Nx (4 libs)

- [ ] Générer `libs/authentication/{domain,data,application,ui}`
      (`@cmz/authentication-{domain,data,application,ui}`).
- [ ] `project.json` tags : `scope:authentication` +
      `type:{domain,data,application,ui}`.
- [ ] `tsconfig.base.json` : 4 paths `@cmz/authentication-*`.
- [ ] Barrels vides.
- [ ] `eslint.config.mjs` : ajouter le bloc
      `scope:authentication → [self,     scope:shared]`.

## Phase 2 — Domaine (`-domain`)

D'abord, **ajout kernel** (`@cmz/shared-domain`, pas dans le module) :

- [ ] `interfaces/current-user.interface.ts` — `CurrentUser`, `AuthToken`,
      `UserPermissions` (fidèles au source, cf. § Périmètre).

Puis par opération **O ∈ {login, forgot-password, reset-password}** :

- [ ] `props/<O>.props.ts` — `{ user, token, message? }` pour `login` seulement
      ; `{ message: string }` pour `forgot-password`/ `reset-password` (décision
      1).
- [ ] `entities/<O>-response.entity.ts` — pattern props + getters.
- [ ] `contracts/<O>-request.contract.ts` + `.validate-contract.ts` : `login`
      (`email?/password?`), `forgot-password` (`email?`), `reset-password`
      (`token?/email?/password?/confirmPassword?`).
- [ ] `validators/<O>-request.validator.ts` — réutilise les types kernel
      (décision 6) : email/password/confirmPassword typés,
      `GenericRequiredError` pour `token` seul.
- [ ] `value-objects/<O>-request.vo.ts` — point d'entrée validation, comme
      l'archétype CRUD.
- [ ] `repositories/<O>.repository.ts` — port abstrait,
      `execute(validContract):     Observable<XResponseEntity>`.
- [ ] Barrel + `ngc` domaine pur.

## Phase 3 — Data (`-data`)

- [ ] `endpoints/authentication.endpoints.ts` (`login`, `forgot-password`,
      `reset-password`).
- [ ] `dtos/<O>-request-api.dto.ts` + `<O>-response-api.dto.ts`
      (`SimpleResponseDto`).
- [ ] `mappers/<O>-request.mapper.ts` (contrat validé → DTO wire) +
      `<O>-response.mapper.ts` (`SimpleResponseMapper`).
- [ ] `sources/<O>.api.ts` — `HttpClient` + `AUTH_API_URL` (pas
      `SETTINGS_API_URL`).
- [ ] `repositories/<O>.repository.impl.ts`.
- [ ] `package.json` deps = imports réels ; barrel ; `ngc`.

## Phase 4 — Application (`-application`)

D'abord, **ajout kernel** (`@cmz/shared-application`, pas dans le module) :

- [ ] `SessionService.save(user, token, permissions)` — symétrique à `clear()`
      existant, écrit via `StoragePort.saveEncrypted` (clés `user_data`,
      `token_data`, `permissionsActions` — mêmes clés que
      `PermissionActionsService`/`clear()` lisent déjà).

Puis par opération :

- [ ] `use-cases/<O>.use-case.ts` —
      `defer(() => repository.execute(xVo(contract)))`.
- [ ] `facades/<O>.facade.ts` — étend
      `ResourceFacade<XResponseEntity,     XRequestValidateContract>`
      (décision 3) ; **seule `LoginFacade`** ajoute un `effect()` appelant
      `sessionService.save(...)` sur succès.
- [ ] Barrel ; `ngc`.

## Phase 5 — UI (`-ui`)

- [ ] `constants/<O>-form-keys.constant.ts`,
      `<O>-form-error-messages.constant.ts`.
- [ ] `stores/<O>-form.store.ts` — Signal Forms (décision 7), mêmes règles que
      le source (email pattern, password minlength 8, required).
- [ ] `features/<O>.component.ts` (+ template) — soumission → `facade`,
      redirection sur succès (`login` → dashboard, `forgot-password` → écran «
      email envoyé », `reset-password` → `/login`).
- [ ] `authentication.routes.ts` — 3 routes publiques + redirect par défaut vers
      `login` (pas de guard, décision 9).
- [ ] `providers/` composition-root : `provideAuthentication()` (1 seul, pas 1
      par opération — décision 2).
- [ ] Barrel ; `ngc --strictTemplates`.

## Phase 6 — Câblage app + i18n

- [ ] `app.config.ts` : `...provideAuthentication()`.
- [ ] `app.routes.ts` : route `login`/`forgot-password`/`reset-password` (lazy,
      sans garde).
- [ ] i18n : namespace `AUTHENTICATION.{LOGIN,FORGOT_PASSWORD,RESET_PASSWORD}.*`
      **et** ajouter les clés `COMMON.EMAIL.REQUIRED`,
      `COMMON.EMAIL.INVALID_FORMAT`, `COMMON.PASSWORD.REQUIRED`,
      `COMMON.CONFIRM_PASSWORD.REQUIRED`, `COMMON.CONFIRM_PASSWORD.NO_MATCH`,
      `COMMON.ERROR.REQUIRED` — ce sont les `messageKey` fixes des erreurs
      kernel (décision 6), absentes du bundle FR actuel, à vérifier avant de les
      considérer déjà couvertes.

## Phase 7 — Mock backend

- [ ] Étendre `tools/mock-server.mjs` : `POST login` (email/password fixes de
      test → `{user, token, message}` ; mauvais identifiants →
      `{error:true, message:"..."}`), `POST forgot-password` (→ `{message}`),
      `POST reset-password` (token/email attendus → `{message}` ou erreur si
      token invalide).

## Phase 8 — Validation & livraison

- [ ] `ngc --strictTemplates` vert (4 libs + app).
- [ ] Boundaries 0 violation, `deps = imports`.
- [ ] `npx nx lint` + `npx nx serve` (poste macOS, cf. limite sandbox Linux
      documentée en Phase 08 d'`administrative-boundary`).
- [ ] Smoke test : login (succès → session écrite, `PermissionActionsService`
      non vide ; échec → toast) + forgot-password (→ écran succès) +
      reset-password (→ redirect login).
- [ ] Commits conventionnels par couche.
- [ ] Mettre ce document à jour (statut fait + écarts réels).
