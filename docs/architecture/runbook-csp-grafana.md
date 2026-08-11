# Runbook — CSP `frame-src` & iframe Grafana embarquée

**Statut : runbook opérationnel (T4-6/T10-5, `docs/architecture/taches-restantes.md`).**
Date : 2026-08-11.

## 1. Pourquoi cette variable existe

Les modules `reporting` et `monitoring` embarquent des tableaux de bord
Grafana dans une iframe (`GrafanaEmbedComponent`, `@cmz/shared-ui`). L'URL de
cette iframe (`grafanaLink`) **vient de la réponse backend**, jamais d'une
constante de code — rien dans le code source ne fixe l'origine réelle de
Grafana pour un environnement donné (dev, staging, prod peuvent chacun
pointer vers une instance Grafana différente).

Sans une origine explicitement autorisée, deux barrières bloquent l'iframe :

1. **CSP `frame-src`** (en-tête HTTP, `deploy/csp.template.conf`) — barrière
   réseau/navigateur.
2. **`TrustedOriginPort`** (`libs/shared/domain/src/lib/ports/
   trusted-origin.port.ts`, adaptateur `TrustedOriginAdapter` dans
   `@cmz/core`) — barrière applicative, consultée par `SafeUrlPipe`
   (`libs/shared/ui`) avant tout appel à
   `DomSanitizer.bypassSecurityTrustResourceUrl`.

Les deux échouent **fermées par construction** : tant que l'origine Grafana
n'est pas renseignée, l'iframe reste bloquée plutôt que de s'ouvrir à
n'importe quelle origine par défaut. C'est un choix délibéré (audit
`audit-workspace-2026-08-03.md`, I-14/I-15) — jamais de repli permissif, y
compris avant que l'opérateur n'ait eu le temps de configurer
l'environnement.

## 2. Une seule variable pour les deux barrières

Les deux mécanismes sont alimentés par **la même variable d'environnement**,
positionnée une seule fois au déploiement :

```
CMZ_CSP_FRAME_SRC=https://grafana.example.org
```

`deploy/docker-entrypoint.sh` la consomme de deux façons distinctes :

- Injectée telle quelle dans `deploy/csp.template.conf` (`envsubst`) →
  écrit l'en-tête `Content-Security-Policy` (`frame-src 'self'
  https://grafana.example.org; …`) dans
  `/etc/nginx/conf.d/csp.conf`.
- Convertie en JSON (`CMZ_TRUSTED_FRAME_ORIGINS_JSON`) et injectée dans
  `deploy/env.template.js.in` → devient `window.__env.trustedFrameOrigins`
  (lu par `APP_CONFIG`, ADR-0007), consommé par `TrustedOriginAdapter`.

Plusieurs origines peuvent être listées, séparées par un espace (la boucle
shell de `docker-entrypoint.sh` découpe sur les espaces) :

```
CMZ_CSP_FRAME_SRC="https://grafana-prod.example.org https://grafana-dr.example.org"
```

## 3. Procédure de déploiement

1. Identifier l'origine réelle de Grafana pour l'environnement cible
   (schéma + hôte + port exact — pas de chemin, pas de wildcard).
2. Positionner `CMZ_CSP_FRAME_SRC` dans l'environnement du conteneur
   (variable Docker/Kubernetes, même mécanisme que
   `CMZ_AUTHENTICATION_URL`/`CMZ_REPORT_URL`/etc.).
3. Démarrer le conteneur. `docker-entrypoint.sh` logue la valeur effective :

   ```
   cmz: wrote CSP → /etc/nginx/conf.d/csp.conf (connect-src=…; frame-src=<none — Grafana iframe bloquée si non renseigné>)
   ```

   Si le message affiche `<none — …>`, la variable n'est pas positionnée :
   l'iframe restera bloquée par design, pas un bug à corriger côté code.
4. **Ne jamais** positionner `CMZ_CSP_FRAME_SRC=*` : les deux barrières
   acceptent une liste d'origines explicites, jamais un joker. `SafeUrlPipe`
   compare l'origine exacte (`new URL(url).origin`) à la liste — un joker
   dans `trustedFrameOrigins` ne matcherait de toute façon aucune origine
   réelle (`allowed.includes(origin)`, pas de logique de pattern).

## 4. Vérification post-déploiement

- **En-tête CSP réel** :
  `curl -sI https://<host>/ | grep -i content-security-policy` doit
  contenir `frame-src 'self' https://grafana.example.org`.
- **Config runtime JS** : `curl -s https://<host>/env.js | grep
  trustedFrameOrigins` doit contenir la même origine, au format JSON
  (`trustedFrameOrigins: ["https://grafana.example.org"]`).
- **Comportement applicatif** : ouvrir une page `reporting`/`monitoring`
  avec un tableau de bord Grafana. Si l'origine n'est pas reconnue,
  `SafeUrlPipe` logue `console.warn('[SafeUrlPipe] Origine non autorisée
  pour une iframe, bloquée : …')` et `GrafanaEmbedComponent` affiche l'état
  d'erreur existant au lieu d'une iframe vide — jamais une iframe sans
  `src` silencieuse.
- **`nginx -t`** : exécuté par le conteneur au démarrage échoue si
  `csp.conf` généré est syntaxiquement invalide (ex. `envsubst` mal
  configuré) — vérifier les logs de démarrage du conteneur si le service ne
  démarre pas après un changement de cette variable.

## 5. Ce que ce runbook ne couvre pas

- Le choix de l'origine Grafana elle-même (dépend de l'infrastructure de
  déploiement, hors dépôt).
- La rotation/révocation d'une origine compromise — recharger le conteneur
  avec la nouvelle valeur suffit côté CSP/app, mais toute session déjà
  ouverte avec l'ancienne configuration en mémoire (SPA déjà chargée) ne
  sera mise à jour qu'au prochain rechargement complet de la page.
- `frame-ancestors 'none'` (protection contre le clickjacking de
  l'application elle-même, distincte de `frame-src`) — déjà fixé en dur
  dans `csp.template.conf`, non paramétrable, hors périmètre de ce
  runbook.

## 6. Correction de documentation apportée en produisant ce runbook

Le commentaire de `deploy/csp.template.conf` affirmait que `SafeUrlPipe`
« appelle `bypassSecurityTrustResourceUrl` sur `grafanaLink` sans aucune
vérification d'origine » et présentait cela comme une faille **non
résolue**. Vérifié faux en lisant le code actuel de `SafeUrlPipe` et de
`TrustedOriginPort`/`TrustedOriginAdapter` : la vérification d'origine a
déjà été ajoutée (même référence d'audit, I-14/I-15) — le commentaire
n'avait simplement pas été mis à jour après le correctif. Corrigé dans
`deploy/csp.template.conf` pour refléter l'état réel du code plutôt que de
laisser une note de sécurité obsolète en tête d'un fichier de configuration
sensible.
