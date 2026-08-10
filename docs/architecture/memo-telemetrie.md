# Mémo d'investigation — branchement d'un collecteur de télémétrie

**Statut : mémo factuel, aucun fournisseur recommandé. Décision réservée à
un humain.**

Date : 2026-08-10.

## 1. Implémentation actuelle de `LoggerPort`

Port abstrait : `libs/shared/domain/src/lib/ports/logger.port.ts` —
4 méthodes (`debug`, `info`, `warn`, `error`), `error` acceptant l'objet
d'erreur brut (`unknown`, pas converti en `string`) pour laisser
l'adaptateur choisir sa sérialisation.

Adaptateur câblé aujourd'hui :
`libs/shared/browser/src/lib/logger/console-logger.adapter.ts`
(`ConsoleLoggerAdapter`) — écrit sur `console.debug/info/warn/error` avec
un préfixe horodaté (`[ISO date] [LEVEL] message`), **aucune sortie
réseau**.

Câblage : `apps/backoffice-angular/src/app/app.config.ts` ligne 90 —

```typescript
{ provide: LoggerPort, useExisting: ConsoleLoggerAdapter },
```

**Seul consommateur réel du port** (vérifié :
`grep -rn "inject(LoggerPort)" libs/ apps/` → 1 résultat) :
`libs/core/src/lib/error-handling/global-error-handler.ts`
(`GlobalErrorHandler`, implémente `ErrorHandler` d'Angular, appelle
`logger.error('Erreur non capturée', error, { source:
'GlobalErrorHandler' })`).

**Correction apportée à la documentation existante en produisant ce
mémo** : la docstring de `logger.port.ts` affirmait jusqu'ici que
`error.interceptor.ts` (`@cmz/shared-data`) consommait aussi ce port —
vérifié faux en lisant le fichier (`libs/shared/data/src/lib/interceptors/
error.interceptor.ts` normalise les échecs de transport HTTP en
`DomainError` mais n'appelle `LoggerPort` nulle part) et confirmé par la
recherche `grep` ci-dessus, qui ne retourne qu'un seul résultat. La
docstring a été corrigée en conséquence (pas seulement notée ici) — voir
`libs/shared/domain/src/lib/ports/logger.port.ts`. **Conséquence pour ce
mémo : aujourd'hui, seules les erreurs qui remontent jusqu'à
`GlobalErrorHandler` (exceptions non capturées de template/change
detection, rejets de promesse et erreurs `window` non gérés via
`provideBrowserGlobalErrorListeners()`) seraient visibles d'un futur
collecteur. Les échecs HTTP gérés par `error.interceptor.ts` (401, réseau
inatteignable, 4xx/5xx serveur) ne passent actuellement par aucun point de
journalisation — ils sont convertis en `DomainError` et traités par la
boucle de feedback utilisateur (toasts), pas journalisés.**

## 2. Ce qu'impliquerait le branchement d'un collecteur externe

Le point d'extension prévu est déjà en place et ne nécessite de modifier
ni `LoggerPort` ni `GlobalErrorHandler` :

1. **Créer un nouvel adaptateur** dans `libs/shared/browser/src/lib/logger/`
   (même dossier que `console-logger.adapter.ts`), par exemple
   `sentry-logger.adapter.ts` ou `otel-logger.adapter.ts` selon le
   collecteur choisi, implémentant les 4 méthodes de `LoggerPort` avec la
   même signature exacte.
2. **Changer une seule ligne de câblage** dans `app.config.ts` :
   `{ provide: LoggerPort, useExisting: ConsoleLoggerAdapter }` →
   `{ provide: LoggerPort, useExisting: <NouvelAdaptateur> }` (ou une
   factory si le SDK du collecteur a besoin d'une initialisation
   asynchrone au démarrage — à vérifier selon le SDK retenu).
3. **Étendre la couverture au-delà de `GlobalErrorHandler`** si le besoin
   est de capturer aussi les échecs HTTP (§1) : cela impliquerait d'ajouter
   un appel à `LoggerPort` dans `error.interceptor.ts`, un changement
   distinct de "brancher un collecteur" — actuellement hors du périmètre
   du port tel qu'utilisé.
4. **Tests existants à ne pas casser** :
   `console-logger.adapter.spec.ts` teste l'adaptateur actuel — un nouvel
   adaptateur nécessiterait ses propres tests unitaires sur le même
   modèle, sans modifier ceux de `ConsoleLoggerAdapter` (qui resterait
   l'adaptateur de secours en développement local, `LoggerPort` restant un
   port interchangeable par environnement).

Aucun SDK de collecteur (Sentry, OpenTelemetry, ou autre) n'est présent
dans `package.json` aujourd'hui — son ajout serait la première dépendance
externe de ce type dans le dépôt.

## 3. Contraintes CSP (`connect-src`)

**Constat vérifié, pas supposé :** ce dépôt ne définit aujourd'hui
**aucune Content-Security-Policy** — ni balise `<meta
http-equiv="Content-Security-Policy">` dans
`apps/backoffice-angular/src/index.html` (fichier lu intégralement : head
minimal, `env.js` chargé en script classique, aucune balise CSP), ni
fichier de configuration serveur/proxy dans ce dépôt qui en poserait une
(recherche `grep -rl "connect-src\|Content-Security-Policy"` sur tout le
dépôt, hors `node_modules` → seule occurrence : la mention textuelle dans
le docstring de `logger.port.ts` lui-même, pas une politique réelle).

**Conséquence factuelle :** si une CSP est appliquée pour cette
application, elle l'est en dehors de ce dépôt (reverse proxy, CDN,
configuration d'infrastructure non versionnée ici) — invérifiable depuis
le code source seul. Deux cas possibles, à trancher par un humain ayant
visibilité sur l'infrastructure de déploiement :

- **Si aucune CSP n'est appliquée nulle part** : brancher un collecteur
  n'a besoin d'aucun ajustement `connect-src` particulier, mais introduit
  une nouvelle destination réseau non gouvernée par une politique
  quelconque — point à considérer indépendamment du choix du collecteur.
- **Si une CSP existe en dehors de ce dépôt** : `connect-src` devrait être
  étendu avec le domaine exact du endpoint d'ingestion du collecteur
  choisi (par exemple `*.sentry.io` pour Sentry, l'URL du collecteur OTLP
  pour OpenTelemetry) — le domaine précis dépend du fournisseur retenu,
  non tranché ici.

## 4. Ce que ce mémo ne fait pas

Aucun fournisseur (Sentry, OpenTelemetry, Datadog, ou autre) n'est
recommandé. Le choix est un arbitrage coût/fonctionnalités/hébergement des
données (pertinent au vu de l'inventaire de données personnelles,
`docs/architecture/memo-donnees-personnelles.md` — un collecteur qui
capture le contexte d'erreur pourrait involontairement transmettre des
données personnelles si le contexte d'erreur inclut des champs comme
`initiatorPhone` ou une identité `ActorEntity`, point à vérifier
explicitement lors du choix, pas traité ici).
