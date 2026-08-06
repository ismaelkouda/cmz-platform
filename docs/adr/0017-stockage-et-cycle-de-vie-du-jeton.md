# ADR-0017 — Stockage et cycle de vie du jeton de session

- **Statut :** Proposed
- **Date :** 2026-08-03

## Contexte

Le chantier I (`audit-workspace-2026-08-02-addendum.md`, I-1 à I-10 ;
`audit-workspace-2026-08-03.md`, §7) a câblé l'attache du jeton
(`authInterceptor`), sa garde de route (`authGuard`) et durci son
obfuscation côté stockage (`StoragePort.saveObfuscated`/`getObfuscated`,
PBKDF2 100 000 itérations) — mais **sans jamais trancher, par écrit, ce que
le projet accepte comme risque résiduel** sur le jeton lui-même. C'est
l'objet de cet ADR : documenter l'état réel, pas en créer un nouveau.

**Ce qui existe aujourd'hui, vérifié dans le code, pas supposé :**

- `AuthToken` (`libs/shared/domain/src/lib/interfaces/current-user.interface.ts`) :
  `{ value: string; expiresAt: string }`. **Aucun champ de refresh token.**
  Recherche exhaustive (`grep -ri refresh libs/authentication`) : **0
  occurrence** dans tout le module authentication — ni endpoint, ni DTO, ni
  logique de renouvellement. Le backend (`api-services.mazone-test.ansut.ci`,
  environnement de test communiqué le 2026-08-03) ne fournit, à la
  connaissance de ce dépôt, qu'un jeton unique à durée de vie fixe.
- **Stockage** : `SessionService` (`libs/shared/application`) tient le
  jeton en mémoire (`signal<AuthToken | null>`) et le persiste via
  `StoragePort.saveObfuscated` → `BrowserStorageAdapter`
  (`libs/shared/browser`) : AES-GCM, clé dérivée par PBKDF2-SHA256
  (100 000 itérations) d'une passphrase **présente dans le bundle client**
  (`OBFUSCATION_PASSPHRASE`, `browser-storage.adapter.ts`). C'est une
  obfuscation contre l'inspection occasionnelle (devtools), **pas une
  confidentialité réelle** : quiconque lit le bundle JS peut dériver la même
  clé et déchiffrer — documenté explicitement dans `storage.port.ts` depuis
  I-9.
- **Expiration** : `authGuard` (`apps/backoffice-angular/src/app/guards/
  auth.guard.ts`) compare `token.expiresAt` à `Date.now()` côté client, à
  chaque navigation. Aucune vérification côté serveur au-delà du 401 standard
  sur chaque requête API.
- **Révocation** : `errorInterceptor` (`libs/shared/data`) convertit tout 401
  en `UnauthorizedError`, routée vers `UiFeedbackService`, qui appelle
  `SessionService.clear()` (jeton effacé + rechargement de page). C'est la
  **seule** voie de révocation côté client — il n'existe aucune liste de
  révocation, aucun mécanisme de déconnexion forcée à distance (« déconnecter
  cet appareil ») visible dans le code exploré.
- **CSP** (`deploy/csp.template.conf`, I-14/I-15) réduit la probabilité qu'un
  script tiers injecté lise ce jeton (`script-src 'self'`), mais ne l'élimine
  pas : toute XSS de premier niveau (dans le code de ce dépôt lui-même,
  pas un script tiers) contourne la CSP aussi facilement qu'elle contourne
  l'obfuscation.

## Options envisagées

### Option A — Statu quo formalisé : jeton unique, obfusqué, sans refresh

Garder le mécanisme actuel tel quel, documenter ses limites et les critères
qui déclencheraient une révision plutôt que de les laisser implicites.

- Avantages : aucun changement de code ; correspond exactement au contrat
  backend existant (un seul jeton, pas de refresh côté serveur) ; l'app ne
  peut pas promettre un mécanisme que le backend ne supporte pas.
- Inconvénients : la fenêtre d'exposition en cas de vol de jeton = la durée
  de vie complète de `expiresAt`, sans possibilité de révoquer plus tôt
  côté client (le backend pourrait avoir sa propre liste de révocation —
  hors visibilité de ce dépôt frontend).

### Option B — Cookie `HttpOnly` + `SameSite`

Le backend pose le jeton dans un cookie `HttpOnly; Secure; SameSite=Strict`
plutôt que de le renvoyer dans le corps de la réponse JSON ; le navigateur
l'attache automatiquement, invisible au JS (donc invulnérable au vol par
XSS).

- Avantages : élimine la classe de risque « vol de jeton par XSS » — le JS
  ne peut jamais lire un cookie `HttpOnly`, obfusqué ou pas.
- Inconvénients : **l'app et l'API sont sur des origines différentes**
  (`backoffice.*` vs `api-services.mazone-test.ansut.ci`) — un cookie
  cross-origin exige `SameSite=None` (donc plus de protection CSRF
  automatique par `SameSite`, il faudrait un jeton CSRF séparé) et une
  coopération CORS avec `credentials: 'include'` côté backend. C'est un
  changement d'architecture **côté backend**, hors du périmètre que ce dépôt
  frontend peut trancher unilatéralement.

### Option C — Access token court + refresh token en rotation

Le backend émet un access token de courte durée (ex. 15 min) et un refresh
token, avec rotation à chaque utilisation ; le frontend renouvelle
silencieusement l'access token avant expiration.

- Avantages : réduit drastiquement la fenêtre d'exposition d'un access token
  volé ; pratique reconnue pour les SPA (OWASP, OAuth2 BCP).
- Inconvénients : **nécessite un endpoint de refresh côté backend qui
  n'existe pas aujourd'hui** (recherche exhaustive, 0 occurrence). Implémenter
  la rotation côté frontend sans le support backend correspondant serait un
  simulacre, pas une protection réelle.

## Décision

**Option A pour l'instant**, formalisée plutôt qu'implicite — avec deux
actions de suivi qui ne sont **pas** des décisions de ce dépôt frontend seul :
demander au porteur backend (1) un endpoint de refresh token (Option C, la
cible recommandée à moyen terme) et (2) d'évaluer si l'API peut un jour
poser un cookie `HttpOnly` (Option B), si l'architecture cross-origine
actuelle est amenée à changer.

## Justification

Aucune des deux meilleures options (B, C) n'est unilatéralement décidable
depuis le code frontend : toutes deux demandent un changement de contrat
backend que ce dépôt ne contrôle pas. Prétendre les implémenter côté
frontend seul (ex. un faux mécanisme de refresh qui ne fait que re-décoder
le même jeton) créerait une fausse impression de sécurité, pire que
d'assumer honnêtement la limite actuelle. L'obfuscation (I-9/I-10), la garde
de route (I-5/I-6), la CSP (I-14/I-15) et la vérification d'origine avant
`bypassSecurityTrustResourceUrl` (`TrustedOriginPort`) réduisent déjà,
mesurablement, les vecteurs by lesquels un jeton pourrait fuiter — ce qui
reste, structurellement, c'est la durée de vie fixe et l'absence de
révocation fine, qui ne se corrigent pas par du code frontend.

## Conséquences

### Positives

- Aucune régression : le mécanisme actuel continue de fonctionner exactement
  comme avant cet ADR.
- La limite est désormais écrite, datée, et attribuable — un futur audit
  n'aura plus à la redécouvrir depuis zéro.

### Négatives / dette acceptée

- Un jeton volé (XSS de premier niveau dans ce dépôt, poste compromis, ou
  extraction du bundle + lecture du storage) reste valide jusqu'à
  `expiresAt`, sans mécanisme de révocation anticipée côté client.
- L'obfuscation (I-9/I-10) protège contre l'inspection occasionnelle, pas
  contre un attaquant qui lit le bundle JS — ce n'est pas nouveau, mais cet
  ADR le rend explicite au niveau architecture plutôt que dans un seul
  commentaire de code.

### Points à réévaluer

- Si le backend expose un endpoint de refresh token : reconsidérer
  immédiatement en faveur de l'Option C.
- Si un incident de vol de session survient : reconsidérer en urgence,
  quelle que soit l'option retenue alors.
- Si l'architecture cross-origine actuelle (app et API sur des domaines
  différents) change un jour vers un déploiement same-origin : l'Option B
  redevient réalisable sans les compromis `SameSite=None`/CSRF.

## Références

- `audit-workspace-2026-08-02-addendum.md` (I-1 à I-11).
- `audit-workspace-2026-08-03.md`, §7 (I-1 à I-10, I-12 à I-15, `SafeUrlPipe`).
- [OWASP — Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
- [IETF — OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics) (rotation de refresh token).
