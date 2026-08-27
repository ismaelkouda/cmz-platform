# Câbler une lib générée (action-request) dans une app Angular

> **Pour tout Agent IA / LLM lisant ce document sans contexte préalable de la
> session qui l'a produit** : ce document explique un outil précis
> (`tools/scaffold-lib-wiring.mjs`), le problème qu'il résout, pourquoi il est
> conçu comme il l'est, et surtout **comment interpréter chacune de ses sorties
> possibles**. Lis-le en entier avant d'utiliser le script ou de le modifier.

## Le problème que ce document résout

`tools/generator-platform/` produit une lib (`libs/<nom>/angular/...`) à partir
d'un `*.definition.json` (vocabulaire `action-request`). Cette lib ne sert à
rien tant qu'elle n'est pas câblée dans une vraie app. Câbler
`libs/newsletter/angular` dans `apps/newsletter-test` à la main (2026-08-27) a
demandé 4 gestes :

1. Ajouter une entrée `@cmz/<nom>-angular` dans `tsconfig.base.json`.
2. Importer `ActionRequestClient`/`ActionRequestCommands` et les déclarer dans
   le tableau `providers` de `app.config.ts`, avec le token
   `ACTION_REQUEST_BASE_URL`.
3. Fixer la vraie URL du backend (ou d'un mock local).
4. Écrire un composant consommateur (formulaire, gestion des états
   idle/pending/success/error, wording, mise en page).

Les gestes 1 et 2 sont mécaniquement dérivables du contenu déjà généré (les noms
de méthodes et de champs existent dans `action-request-commands.ts` et
`models.ts` — nul besoin de les redemander à un humain). Les gestes 3 et 4
exigent une décision humaine (quelle infra réelle, quelle UX) — ce script les
laisse **délibérément** hors de son périmètre.

## Frontières de couche — le garde-fou non négociable

Ce repo applique des règles de dépendance strictes entre couches Nx (`domain` →
`data` → `application` → `ui`, 0 import framework en `domain`, 0 import
cross-domaine — voir `CLAUDE.md`, `eslint.config.mjs` `depConstraints`). Une lib
générée par `action-request` est un point d'intégration terminal : elle est
faite pour être consommée par une **app** (point d'orchestration final), jamais
par une lib métier intermédiaire (`type:domain`, `type:application`, etc.), sous
peine de percer ces frontières de façon injectée automatiquement — donc
invisible en revue si personne ne la cherche activement.

C'est pourquoi `assertTargetIsApp()` est la toute première étape du script : il
lit `apps/<app>/project.json` et échoue explicitement si le tag Nx `type:app`
est absent. Ce garde-fou ne se contourne jamais — si un jour ce script doit
câbler une lib dans autre chose qu'une app, c'est une décision architecturale à
part entière, pas un flag à ajouter.

## Pourquoi ce script parse le contenu généré plutôt que de coder en dur "newsletter"

Le seul cas réel traité à ce jour est `newsletter` (`SubscribeNewsletterInput` →
`subscribeNewsletter()` → `NewsletterSubscriptionResult`). Un script qui
connaîtrait ces noms en dur ne fonctionnerait que pour ce cas précis et
casserait silencieusement — ou pire, produirait un câblage incorrect qui compile
— sur la prochaine lib générée.

Le script lit donc dynamiquement :

- `action-request-commands.ts` pour connaître les vraies méthodes exposées
  (regex sur la forme `<nom>(input: <Type>): Observable<<Type>>`).
- `models.ts` pour connaître les vrais champs du type d'input.

**Piège réel rencontré pendant les tests** : la première version de la regex sur
`action-request-commands.ts` supposait une signature sur une seule ligne. Le
code réellement généré est reformaté par prettier en plusieurs lignes
(`méthode(\n    input: Type\n): Observable<Type>`), donc la regex initiale ne
trouvait aucune méthode et échouait à tort. Corrigé en tolérant les espaces/
retours à la ligne entre les tokens. **Retenir de cet épisode** : ne jamais
supposer une forme de code source sans l'avoir vérifiée sur le fichier réel
généré — prettier reformate, et "ça marchait sur mon exemple à la main" n'est
pas une preuve suffisante.

## Comment lire les sorties du script

Le script imprime une ligne par action, préfixée `SKIP`, `CREATE` ou `UPDATE`,
et termine soit par un résumé `✔` rappelant les 2 gestes restants (URL backend,
composant consommateur), soit par un échec `✖` explicite. **Chaque échec est
volontaire** — ce script préfère s'arrêter plutôt que de deviner. Ne contourne
jamais un échec en modifiant le script pour qu'il "passe quand même" sans
comprendre la cause.

Cas de sortie à connaître :

- **`apps/<app>/project.json introuvable`** — le nom d'app passé à `--app`
  n'existe pas sous `apps/`. Vérifie l'orthographe ; ce script ne cherche jamais
  dans `libs/`.
- **`n'a pas le tag "type:app"`** — garde-fou de frontière déclenché (voir
  section dédiée ci-dessus). Ne jamais forcer le passage — comprendre d'abord
  pourquoi la cible visée n'est pas une vraie app.
- **`<fichier> introuvable`** sous `libs/<lib>/angular/src/` — la lib n'a pas la
  structure attendue (`models.ts`, `action-request-client.ts`,
  `action-request-commands.ts`, `index.ts`). Soit le nom de lib est faux, soit
  `generate-action-request.mjs` a changé de structure de sortie — dans ce
  dernier cas, adapte ce script, ne suppose pas un chemin par défaut.
- **`Aucune méthode reconnue dans action-request-commands.ts`** — la forme du
  code généré par le renderer a changé (voir l'épisode multi-ligne ci-dessus,
  déjà corrigé une fois). Si ça se reproduit avec un nouveau format, il faut à
  nouveau ajuster la regex après avoir lu le fichier réel.
- **`Interface <Type> introuvable dans models.ts`** — le contrat de la lib a
  changé de forme. Vérifie manuellement avant de continuer.
- **`SKIP ... (déjà présent — rien à faire)`** — idempotence volontaire :
  relancer le script sur une app déjà câblée ne duplique jamais une entrée
  tsconfig ni un bloc de providers. C'est le comportement normal, pas une
  alerte.
- **`motif "providers: [" introuvable`** — la forme de `app.config.ts` a changé
  (par exemple si une future version d'Angular ou d'Nx génère un fichier de
  configuration différent). Câble les providers manuellement et adapte le
  script.
- **Formatage de la sortie `app.config.ts`** — le script insère le nouveau bloc
  de providers juste avant le contenu existant du tableau, avec ses propres
  retours à la ligne, mais **ne reformate pas le reste du fichier**. Le résultat
  est syntaxiquement valide et compile, mais peut contenir des entrées
  pré-existantes du tableau restées sur une seule ligne à côté des nouvelles
  entrées. C'est cosmétique : `prettier --write` (ou le hook de pre-commit s'il
  en exécute un) normalise ça. Ne pas confondre avec une vraie régression.

## Bug réel rencontré et corrigé pendant les tests (camelCase / retours à la ligne)

Une première version de `wireAppConfig()` utilisait `pascalCase()` pour nommer
la constante d'URL backend, produisant `NewsletterBaseUrl` (majuscule initiale)
au lieu de la convention `camelCase` attendue pour une constante locale. Elle
collait aussi le nouveau bloc de providers directement contre le contenu
existant du tableau sans retour à la ligne, produisant une sortie du type
`ActionRequestCommands,provideBrowserGlobalErrorListeners()...` sur une seule
ligne. Les deux bugs n'ont été détectés qu'en lisant le fichier réel généré sur
une app jetable (`apps/wiring-test-tmp`) — un `node --check` (vérification de
syntaxe seule) ne les aurait pas révélés. Corrigé en ajoutant un helper
`camelCase()` dédié et en construisant les chaînes insérées avec des `\n`
explicites. **Retenir de cet épisode** : un script qui génère du code doit être
vérifié en lisant sa sortie réelle, jamais sur la seule base d'un "ça s'exécute
sans erreur."

## Ce que ce script ne fait délibérément pas

- Il ne fixe jamais la vraie URL du backend — il pose un placeholder explicite
  (`http://localhost:0000`) marqué d'un commentaire `TODO`, jamais une valeur
  devinée qui pourrait passer inaperçue.
- Il n'écrit jamais le contenu réel du composant consommateur (formulaire,
  wording, mise en page, gestion des états). C'est un choix produit/UX qui reste
  une décision humaine (ou d'un LLM avec le contexte du produit), jamais une
  automatisation aveugle.
- Il ne reformate pas le fichier `app.config.ts` au-delà de son insertion — voir
  la note sur le formatage cosmétique ci-dessus.
- Il ne devine jamais une structure de fichier absente ou différente de celle
  attendue — il s'arrête et explique pourquoi, systématiquement, à l'image de la
  discipline déjà appliquée dans
  [`scaffold-tailwind-apps.md`](./scaffold-tailwind-apps.md).

## Usage

```bash
node tools/scaffold-lib-wiring.mjs --lib <nom-libs> --app <nom-app>
```

Exemple :

```bash
node tools/scaffold-lib-wiring.mjs --lib newsletter --app newsletter-test
```

Après exécution : fixer la vraie URL backend dans `app.config.ts` (ou pointer
vers un mock local, voir par exemple
`apps/newsletter-test/src/mock/newsletter-mock-server.mjs`), écrire ou adapter
le composant consommateur, puis vérifier visuellement dans le navigateur — un
`tsc --noEmit` clean ne suffit pas à lui seul à garantir que le formulaire
fonctionne réellement (même discipline que celle établie pour Tailwind : voir la
note du 2026-08-27 dans
[`scaffold-tailwind-apps.md`](./scaffold-tailwind-apps.md) sur les faux positifs
d'un pipeline apparemment fonctionnel).

## Historique

Écrit le 2026-08-27, après le câblage manuel de `libs/newsletter/angular` dans
`apps/newsletter-test` (premier cas réel de `generator-platform` matérialisé et
câblé bout-en-bout dans ce repo). Testé deux fois sur une app jetable
(`apps/wiring-test-tmp`, supprimée après vérification) — deux bugs réels trouvés
et corrigés pendant ces tests (regex multi-ligne, camelCase/ retours à la
ligne), documentés ci-dessus pour éviter de les redécouvrir à l'aveugle sur un
futur cas. Voir aussi [`scaffold-tailwind-apps.md`](./scaffold-tailwind-apps.md)
pour l'outil frère (même discipline anti-devinette, même problème de fond :
automatiser un geste répétitif sans lui faire porter une vérité qui peut devenir
fausse).
