# Câbler Tailwind dans une nouvelle app Angular ou React

> **Pour tout Agent IA / LLM lisant ce document sans contexte préalable de la
> session qui l'a produit** : ce document explique un outil précis
> (`tools/scaffold-tailwind.mjs`), le problème qu'il résout, pourquoi il est
> conçu comme il l'est, et surtout **comment interpréter chacune de ses
> sorties possibles**. Lis-le en entier avant d'utiliser le script ou de le
> modifier.

## Le problème que ce document résout

Ce repo utilise Tailwind CSS 4 (`tailwindcss` + `@tailwindcss/postcss`,
version verrouillée dans `bun.lock`). Ni le générateur `@nx/angular:application`
ni `@nx/react:application` (Nx 23.1.0, vérifié le 2026-08-27) n'ont de flag
natif pour activer Tailwind. Configurer Tailwind dans une nouvelle app exige
donc 3 gestes manuels après la génération Nx :

1. Créer un fichier `.postcssrc.json` qui active le plugin `@tailwindcss/postcss`.
2. Créer un fichier `src/tailwind.css` qui importe Tailwind et déclare le
   périmètre de scan des classes utilitaires (`@source`).
3. Câbler ce fichier CSS dans le pipeline de build de l'app — différemment
   selon le framework : pour Angular, l'ajouter au tableau `styles` de
   `project.json` ; pour React/Vite, l'importer explicitement dans le point
   d'entrée (`main.tsx`), car Vite n'assemble le CSS que via les imports JS/TS,
   pas via une liste déclarative comme Angular.

Fait une fois à la main sur deux apps de ce repo (`backoffice-angular`,
`newsletter-test` pour Angular ; `newsletter` pour React), c'est une tâche
répétitive, mécanique, et donc un candidat naturel à l'outillage — mais avec
un piège : coder en dur le contenu de ces 3 fichiers dans un générateur créerait
une dette qui se révèle silencieusement le jour où Tailwind ou Nx change de
mécanisme.

## Pourquoi ce script lit des apps de référence plutôt que d'utiliser des templates figés

Tailwind a déjà changé de mécanisme de configuration une fois : la version 3
utilisait un fichier `tailwind.config.js` en JavaScript et des directives
`@tailwind base/components/utilities` dans le CSS ; la version 4 (celle de ce
repo) a remplacé tout ça par `@import 'tailwindcss'` et un bloc `@theme` en
CSS pur, sans fichier de config JS. Un template figé écrit aujourd'hui pour
Tailwind 4 casserait silencieusement — ou pire, produirait un fichier qui
compile mais n'a plus le comportement attendu — si une future version change
encore la syntaxe.

Ce script prend donc le parti de **dériver le contenu depuis une app de
référence réelle et fonctionnelle du repo**, à chaque exécution, plutôt que de
porter lui-même la vérité sur "à quoi ressemble une config Tailwind valide".
Ça déplace la responsabilité de rester à jour vers les apps de référence
elles-mêmes (`backoffice-angular`, `newsletter-test`, `newsletter`), qui de
toute façon doivent rester fonctionnelles pour d'autres raisons. Le script
reste alors correct tant qu'au moins une app de référence par framework existe
et fonctionne — sans qu'on ait besoin de le réécrire à chaque évolution de
l'écosystème.

**Contrepartie explicite** : si Nx intègre un jour Tailwind nativement dans
`@nx/angular:application`/`@nx/react:application`, ou si Tailwind abandonne le
mécanisme PostCSS, ce script devient obsolète — pas cassé, obsolète. Voir la
section suivante sur comment il est censé le détecter lui-même.

## Comment lire les sorties du script

Le script imprime une ligne par action, préfixée `CREATE` ou `UPDATE`, et
termine soit par un résumé `✔`, soit par un échec `✖` avec un message
explicatif. **Chaque échec est volontaire** : le script préfère s'arrêter et
demander une décision humaine plutôt que deviner et produire un fichier
probablement incorrect. Ne contourne jamais un échec de ce script en modifiant
son code pour qu'il "passe quand même" sans comprendre la cause — c'est
exactement le antipattern que ce repo interdit ailleurs (pas de `--no-verify`,
pas de bypass caché de vérification).

Cas de sortie à connaître :

- **`.postcssrc.json existe déjà`** — le script ne réécrit jamais une config
  existante. Si tu veux régénérer, supprime le fichier manuellement d'abord,
  après avoir vérifié pourquoi tu veux le faire.
- **`build <app> déjà vert avant toute modification`** puis poursuite normale
  — ce n'est PAS un signal d'alarme. C'est juste que le build passait déjà
  (l'app n'a simplement pas encore de classe Tailwind à tester). Le script
  continue normalement.
- **Le script devrait un jour détecter que Tailwind fonctionne déjà sans sa
  config** (mécanisme actuellement best-effort, voir le commentaire de
  `warnIfTailwindAlreadyActive` dans le script) — si tu observes un
  comportement qui suggère que Tailwind s'active nativement dans une app
  fraîchement générée (classes qui rendent visuellement sans qu'aucun
  `.postcssrc.json` n'existe), **ne lance pas ce script dessus**. C'est le
  signal que l'écosystème Nx/Tailwind a changé et que ce script — ainsi que ce
  document — doivent être révisés, pas contournés.
- **`Les apps de référence <framework> divergent sur .postcssrc.json`** — deux
  apps de référence candidates (ex: `newsletter-test` et `backoffice-angular`
  pour Angular) ont des configs différentes. Le script refuse de choisir
  arbitrairement. Il faut d'abord comprendre pourquoi elles divergent (une des
  deux a-t-elle été mise à jour sans répercuter l'autre ? est-ce intentionnel ?)
  avant de relancer.
- **`Impossible de résoudre la version réelle de tailwindcss depuis bun.lock`**
  — ce repo utilise les "catalogs" Bun workspaces (`package.json` déclare
  `tailwindcss: "catalog:"`, pas un numéro de version direct). Le script
  résout la vraie version depuis `bun.lock` par un motif regex fragile face à
  un changement de format. Si ce message apparaît, le format de `bun.lock` a
  probablement changé — inspecte-le manuellement et corrige
  `readInstalledTailwindVersion()` dans le script.
- **`targets.build.options.styles n'est pas un tableau`** (Angular) — la forme
  de `project.json` a changé. Attention : ce n'est pas hypothétique, ça
  arrive réellement dans ce repo : les apps React générées par
  `@nx/react:application` avec Nx 23 ont un `project.json` avec `targets: {}`
  vide (les cibles sont *inférées* depuis `vite.config.mts` par un plugin Nx,
  pas déclarées explicitement). Si Angular adopte un jour ce même modèle de
  "targets inférés", ce script cessera de fonctionner pour Angular aussi et
  devra être adapté.
- **`motif "import App from ..." introuvable`** (React) — la forme du point
  d'entrée généré a changé. Concrètement vécu dans ce repo : le flag
  `--useReactRouter` du générateur `@nx/react:application` produit un
  `main.tsx` de forme complètement différente (mode "framework" SSR avec son
  propre `package.json`/`node_modules` local, incompatible avec ce script tel
  que conçu). Ce script suppose une app React **SPA classique** (générée sans
  `--useReactRouter`, avec `react-router-dom` en dépendance simple).

## Ce que ce script ne fait délibérément pas

- Il ne détecte pas automatiquement le framework de l'app cible — `--reference`
  est un argument obligatoire et explicite, pour éviter toute ambiguïté
  silencieuse.
- Il ne gère pas les apps React générées avec `--useReactRouter` (mode
  "framework" SSR de React Router). Ce mode change trop de choses (présence
  d'un `package.json`/`node_modules` local, forme différente du point
  d'entrée) pour être couvert par la même logique que le mode SPA classique.
- Il ne tente jamais de deviner une correction quand une hypothèse structurelle
  échoue — il s'arrête et explique pourquoi, systématiquement.

## Usage

```bash
node tools/scaffold-tailwind.mjs --app <nom-app> --reference angular|react
```

L'app cible doit déjà exister (générée via `nx g @nx/angular:application` ou
`nx g @nx/react:application`, cette dernière **sans** `--useReactRouter`).
Après exécution, vérifie toujours visuellement : lance le serveur de dev de
l'app, ajoute une classe Tailwind arbitraire à un composant, confirme qu'elle
rend bien avant de committer. Un build vert ou une taille de bundle CSS
plausible ne suffisent pas à eux seuls — voir la découverte faite le
2026-08-27 sur ce même chantier, où une classe échouait silencieusement à
s'appliquer malgré un pipeline apparemment fonctionnel côté outillage.

## Historique

Écrit le 2026-08-27, après avoir câblé Tailwind manuellement sur deux apps de
test créées dans ce repo (`newsletter-test`, Angular ; `newsletter`, React) —
les deux premières apps non-legacy jamais matérialisées dans `apps/` de ce
repo, créées pour éprouver `tools/generator-platform/` sur un cas réel
(`newsletter-subscribe.definition.json`, vocabulaire `action-request`). Voir
[`generation-from-patterns.md`](./generation-from-patterns.md) pour le contexte
plus large du moteur de génération que ces apps de test visent à challenger.
