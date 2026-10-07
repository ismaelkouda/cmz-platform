# Câblage Tailwind qualifié pour Angular et React

> Référence vivante pour un humain ou un LLM. Ne recopier aucune configuration
> depuis la mémoire, une ancienne application ou un article. La recette, la
> matrice de compatibilité et l'adaptateur qualifié du dépôt sont normatifs.

## 1. Résultat recherché

Tailwind est une capacité **opt-in**. `create-app` crée un shell natif sans lui
donner une prétention visuelle. Une application ne peut déclarer Tailwind dans
son manifeste `.cmz/libraries.json` qu'après :

1. qualification de la combinaison exacte framework/build/Tailwind ;
2. preuves runtime dans un candidat isolé ;
3. application de l'adaptateur qualifié ;
4. build, lint et tests de l'application cible ;
5. publication atomique d'un Change Set revu.

La présence des paquets à la racine ne constitue jamais une autorisation
d'utilisation dans une application.

## 2. Deux pipelines officiels, pas un faux dénominateur commun

### Angular

- plugin officiel `@tailwindcss/postcss` dans `.postcssrc.json` ;
- feuille globale `src/tailwind.css` déclarée dans `project.json` ;
- sources bornées à l'application cible ;
- coexistence avec Angular Material prouvée sur le CSS compilé et dans un vrai
  navigateur.

L'adaptateur Angular dérive la forme PostCSS et la feuille de référence depuis
`apps/backoffice-angular`, puis remplace uniquement la source applicative.

### React + Vite

- plugin officiel `@tailwindcss/vite` dans `vite.config.mts` ;
- feuille globale `src/tailwind.css` importée avant `styles.scss` dans
  `main.tsx` ;
- template versionné `conventions/libraries/react/tailwind.template.css` ;
- sources bornées au dossier `src` de l'application.

Le pipeline React n'ajoute ni `.postcssrc.json`, ni configuration copiée
d'Angular. Tailwind recommande son plugin Vite pour ce contexte. Tailwind 4
n'est pas utilisé comme préprocesseur Sass : les imports/directives Tailwind
restent dans un fichier CSS distinct.

## 3. Répartition Tailwind / SCSS

- Tailwind : espacements usuels, flex/grid, tailles, couleurs et états simples
  lisibles directement dans le JSX ou le template.
- SCSS Modules : structure locale complexe, sélecteurs relationnels, animations
  ou états dont une longue chaîne de classes réduirait la compréhension.
- CSS global : imports du moteur, tokens et thème uniquement ; aucun style
  métier spécifique à une page.

Le choix est local à la responsabilité du style. Il ne faut ni réécrire en SCSS
ce qu'un utilitaire exprime clairement, ni transformer le JSX en mur de classes
pour éviter un module SCSS justifié.

## 4. Thème partagé et portée du scan

`conventions/presentation/tailwind-theme.css` porte les tokens Tailwind communs
et leur projection en variables CSS `--cmz-*`. Angular et React importent cette
même source : les valeurs ne sont pas dupliquées dans les applications.

Chaque feuille utilise `source(none)` puis déclare ses sources explicitement.
Cette borne évite qu'une classe présente dans le corpus, les tests, les
documents ou une autre application gonfle silencieusement le CSS produit.

Une bibliothèque Nx externe à l'application n'est ajoutée au scan que si :

1. l'application l'importe réellement ;
2. elle contient des classes Tailwind qui doivent être produites ;
3. l'adaptateur et ses preuves sont mis à jour puis requalifiés.

Ne jamais remplacer cette décision par un glob couvrant tout le monorepo.

## 5. Voie normale d'installation

Après qualification d'une piste candidate :

```bash
bun run add-library --app <app> --library tailwind --dry-run
bun run add-library --app <app> --library tailwind \
  --expect-plan <library-plan:sha256>
```

Le dry-run construit un candidat jetable, applique l'adaptateur, installe le
lockfile sans scripts, demande à Nx ses targets résolues — y compris les targets
Vite inférées — puis exécute build, lint et tests. Le plan atteste les fichiers
créés **et** modifiés. L'application finale recalcule exactement ce plan avant
publication fast-forward.

Une erreur de piste, de version, d'empreinte, de target ou de Change Set est un
arrêt de sécurité. Elle ne doit pas être contournée par une édition manuelle.

## 6. Qualification d'une nouvelle combinaison

Les autorités sont :

- recette : `conventions/libraries/<plateforme>/tailwind.setup.json` ;
- compatibilité : `conventions/libraries/<plateforme>/tailwind.compat.json` ;
- adaptateur : `tools/library-setup/qualified-adapters.mjs` ;
- transformation pure : `tools/scaffold-tailwind-core.mjs` ;
- oracles : `tools/library-setup/runtime-proofs.mjs` et ses modules.

Une nouvelle version commence avec une piste `candidate`. La promotion doit être
exécutée dans un clone propre avec un vrai répertoire `.git` :

```bash
bun run promote-library-compatibility -- \
  --app <application-temoin> --library tailwind
```

Les preuves minimales sont :

- une classe sentinelle produit une règle CSS réelle ;
- le build production réussit hors réseau ;
- pour Angular avec Material, ordre de cascade et rendu combiné sont observés
  dans un vrai moteur navigateur.

Une promotion ne modifie que la matrice de compatibilité. L'application à une
cible réelle reste une opération séparée.

## 7. Outil de référence bas niveau

`tools/scaffold-tailwind.mjs` expose la transformation pure pour la maintenance
et les tests de l'adaptateur :

```bash
node tools/scaffold-tailwind.mjs \
  --app <app> \
  --reference angular|react \
  --tailwind-version <version-exacte>
```

Ce script n'est pas la voie produit : il n'effectue ni qualification, ni
attestation du plan, ni publication transactionnelle. Pour une application du
dépôt, utiliser `add-library`.

## 8. Échecs à interpréter, jamais à masquer

- fichier cible déjà présent : état hors manifeste ou application déjà
  configurée ; comprendre avant toute suppression ;
- motif `main.tsx` ou `vite.config.mts` absent : le scaffold React a changé ;
  réévaluer l'adaptateur avec la documentation officielle ;
- `build.options.styles` absent côté Angular : la structure Nx/Angular a changé
  ; ne pas deviner une cible ;
- piste `candidate` ou attestation périmée : rejouer la qualification profonde ;
- target Nx absente : corriger le contrat du projet, pas réduire les checks ;
- plan différent au second passage : le HEAD ou la transformation a dérivé ;
  revoir le nouveau plan.

## 9. État qualifié au 2026-10-07

- Angular 22 + Tailwind 4.3.3 via `@tailwindcss/postcss` : vérifié ;
- Angular Material 22.2.1 + Tailwind 4.3.3 : coexistence vérifiée ;
- React 19.3.0 + Vite 8 + Tailwind 4.3.3 via `@tailwindcss/vite` : vérifié ;
- `apps/users-management-react-proof` : Tailwind appliqué par plan gouverné,
  avec build, lint et tests verts.

Les versions effectives restent celles de `package.json` et `bun.lock`. Cette
section décrit l'attestation courante ; elle n'autorise jamais une future mise à
jour sans nouvelle qualification.
