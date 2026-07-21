# Revue de socle — avant Phase 02

- **Date :** 2026-07-21
- **Portée :** état du monorepo à l'issue de la [Phase 01](../phases/phase-01-squelette-nx.md), et enseignements tirés de l'analyse du projet d'origine `cmz-backoffice-frontend`
- **Objet :** identifier ce qui doit être tranché ou corrigé **avant** de générer l'application Angular

## Synthèse

| Sévérité | Nombre | Doivent être traités |
| --- | --- | --- |
| 🔴 Bloquant | 3 | Avant la Phase 02 |
| 🟠 Critique | 4 | Avant la Phase 03, mais la décision conditionne la Phase 02 |
| 🟡 Amélioration | 5 | Au fil de l'eau |
| ⚪️ Observation | 5 | À intégrer au plan des phases ultérieures |

---

## 🔴 Bloquants

### B1 — Git n'est pas initialisé

Le workspace a été créé avec `--no-git`. Sans dépôt Git :

- `nx affected` est inopérant (il compare à une base Git) — or c'est la raison
  d'être principale de Nx sur un monorepo ;
- aucun historique, donc aucun retour en arrière possible pendant la migration ;
- `nx graph` fonctionne, mais tout le reste de l'outillage incrémental non.

**Action :** `git init`, premier commit du squelette, et définir la branche de
référence (`main`) que `nx affected` utilisera comme base.

### B2 — Aucune version de Node ni de bun n'est contraintes

Le `package.json` racine ne déclare ni `engines` ni `packageManager`. Le projet
d'origine déclarait pourtant `"packageManager": "bun@1.3.8"`.

C'est un risque concret, et déjà matérialisé côté source : le `.gitlab-ci.yml`
d'origine fixe `NODE_VERSION: 18` tandis que son `Dockerfile` part de `node:22`.
Angular 21 exige Node ≥ 20 — la CI d'origine est donc configurée sur une version
incompatible avec la stack qu'elle est censée construire.

**Action :** déclarer `engines.node`, `packageManager` (bun épinglé) et ajouter
un `.nvmrc`, pour que poste de dev, CI et image Docker convergent.

### B3 — La licence déclarée est probablement fausse

Le `package.json` généré porte `"license": "MIT"` (valeur par défaut de Nx),
alors qu'il s'agit d'un applicatif métier propriétaire (ANSUT / Connect My Zone).
Aucun fichier `LICENSE` n'existe pour la confirmer ou l'infirmer.

**Action :** remplacer par `"UNLICENSED"` (ou la licence réelle). Coût nul
maintenant, ambigu juridiquement si on laisse traîner.

---

## 🟠 Critiques

### C1 — Nx ne lira pas les imports TypeScript pour construire le graphe

C'est le point le plus structurant de cette revue.

Le preset `npm` hérité par `nx.json` contient exactement ceci :

```json
{ "pluginsConfig": { "@nx/js": { "analyzeSourceFiles": false } } }
```

Autrement dit, **Nx ne construit le graphe de dépendances qu'à partir des
`package.json`**, jamais à partir des `import` du code.

Or le projet d'origine repose massivement sur des alias de chemins TypeScript :

```json
"paths": {
  "@app/*": ["./src/app/*"],        "@core/*": ["./src/core/*"],
  "@shared/*": ["./src/shared/*"],  "@presentation/*": ["./src/presentation/*"],
  "@pages/*": ["./src/presentation/pages/*"], ...
}
```

Si on transpose ces alias tels quels en Phase 03, Nx verra des packages **sans
aucune dépendance entre eux**. Conséquences directes : `nx affected` renverra de
faux négatifs (une modification du domaine ne déclenchera pas la reconstruction
des features qui en dépendent), et le cache servira des résultats périmés. Un
monorepo dont le graphe est faux est pire qu'un monorepo sans Nx : il donne une
fausse confiance.

**Deux stratégies possibles, à trancher avant la Phase 03 :**

1. **Dépendances déclarées** — chaque package liste ses packages internes en
   `"workspace:*"` dans son `package.json`, et les imports passent par le nom du
   package (`@cmz/shared-domain`) et non par un alias. C'est l'usage canonique
   du mode package-based, le graphe est exact et explicite. Coût : une
   déclaration à maintenir par dépendance, et une réécriture des imports lors de
   la migration.
2. **Réactiver `analyzeSourceFiles: true`** dans `nx.json`. Nx déduit alors le
   graphe des imports. Plus proche des habitudes du projet d'origine, mais on
   perd la frontière explicite qui fait l'intérêt du package-based.

Recommandation : **option 1**, quitte à automatiser la réécriture des imports
lors de la migration. C'est elle qui rend les frontières entre couches
(domain → data → application → ui → feature) réellement opposables.

### C2 — Le nom du monorepo contredit son ambition

Le workspace s'appelle `cmz-backoffice-angular` et son package racine
`@cmz-backoffice-angular/source`. Or il est destiné à héberger React,
React Native, Kotlin, Swift, PHP, Spring Boot, Rust et Grafana.

Dans six mois, un package Rust vivra dans un dépôt nommé « angular ». Le nom
apparaîtra dans l'URL du dépôt, les scopes npm, les images Docker, les jobs de
CI et les imports de chaque package — le renommer coûtera alors bien plus que
les cinq minutes qu'il coûte aujourd'hui.

**Suggestion :** renommer le workspace en `cmz-platform` (ou `cmz-monorepo`) et
adopter le scope `@cmz/*` pour les packages : `@cmz/backoffice-angular`,
`@cmz/shared-domain`, `@cmz/api-spring`… Le nom de la *stack* appartient au
package, pas au dépôt.

### C3 — Une structure `packages/*` plate vieillira mal

Aujourd'hui, le seul emplacement prévu est `packages/*`. À neuf stacks et
plusieurs dizaines de packages, une liste plate devient illisible et ne dit rien
du rôle de chaque élément.

Trois conventions possibles :

| Convention | Exemple | Remarque |
| --- | --- | --- |
| Plate (actuelle) | `packages/backoffice-angular` | Simple, mais ne distingue ni la stack ni la nature du package |
| `apps/` + `libs/` | `apps/backoffice-angular`, `libs/shared-domain` | Convention Nx la plus répandue ; distingue le déployable du réutilisable |
| Par stack | `packages/angular/backoffice`, `packages/rust/ingest` | Isole les stacks, mais éclate les libs transverses |

**Suggestion :** `apps/` + `libs/`, avec la stack portée par le nom du package
et par les tags Nx. C'est la distinction la plus utile au quotidien (« qu'est-ce
qui se déploie ? ») et la mieux supportée par l'outillage. À décider maintenant :
changer de convention après la Phase 03 impliquerait de déplacer chaque package
et de réécrire ses références.

### C4 — Aucune politique de versions entre packages

C'est la contrepartie assumée du mode package-based
([ADR-0001](../adr/0001-monorepo-nx-package-based.md)), mais elle reste à
outiller. Rien n'empêche aujourd'hui deux packages d'embarquer deux versions
d'Angular ou de TypeScript — avec, à la clé, des erreurs de compilation
incompréhensibles et deux copies du framework dans le bundle final.

**Suggestion :** poser dès la Phase 02 une règle de version unique pour le socle
(Angular, TypeScript, RxJS, Nx), et l'outiller — via le *catalog* de bun, qui
centralise les versions à la racine, ou à défaut par une vérification en CI.

---

## 🟡 Améliorations

### A1 — Fichiers de socle manquants

`.editorconfig`, `.gitattributes`, `.nvmrc`, configuration Prettier racine.

Le `.gitattributes` n'est pas un détail de confort ici : le projet d'origine
contient un script PowerShell (`scripts/generate-structure.ps1`), signe d'un
environnement de développement mixte Windows/macOS. Sans normalisation des fins
de ligne, les différences CRLF/LF pollueront les diffs et déclencheront de faux
positifs sur `nx affected`.

### A2 — Aucune convention de commit ni de branche

Le projet d'origine utilisait Husky + lint-staged. À reprendre au niveau du
monorepo (Phase 05), avec une convention de commit explicite — d'autant plus
utile que `nx affected` s'appuie sur l'historique.

### A3 — Nx Cloud désactivé

Choix assumé en Phase 01. À reconsidérer en Phase 06 : sans cache distribué,
chaque agent de CI reconstruit tout. Sur un monorepo de cette taille, l'écart
devient vite significatif.

### A4 — Pas de `CODEOWNERS`

Sur un monorepo multi-stack et multi-équipes, c'est le mécanisme qui évite
qu'une modification du domaine partagé passe sans relecture par l'équipe qui en
est responsable.

### A5 — Le `README.md` du workspace ne mentionne pas les prérequis exacts

Il indique « bun 1.3.x » mais pas la version de Node attendue. À compléter en
même temps que B2.

---

## ⚪️ Observations sur le projet d'origine

Ces points ne bloquent pas le monorepo, mais doivent être traités **pendant** la
migration plutôt que reproduits à l'identique.

### O1 — Le `.gitignore` d'origine est sans effet sur les fichiers déjà suivis

`.gitignore` liste `/tools/env`, `/src/environments` et `/src/assets/config`,
mais `git ls-files` confirme que ces fichiers **sont bien suivis par Git** — ils
ont été ajoutés avant la règle d'exclusion, qui ne s'applique donc pas à eux.

La configuration runtime versionnée (`tools/env/config.js`, `src/assets/config/env.js`)
expose les URL des services internes. **Aucun secret n'a été détecté** — pas de
clé d'API, de jeton ni de mot de passe, uniquement des URL et des paramètres
d'apparence. La gravité est donc limitée, mais le `.gitignore` donne une fausse
impression de protection : quiconque y ajouterait une clé la publierait sans
s'en rendre compte.

**Action pour le monorepo :** décider explicitement de ce qui est versionné, et
si un fichier de configuration doit être exclu, l'exclure réellement
(`git rm --cached`) plutôt que de compter sur une règle inopérante.

### O2 — Le mécanisme de configuration d'origine est un bon pattern à conserver

`generate-env.js` produit un `src/assets/config/env.js` qui alimente
`window.__env` **au démarrage**, et non à la compilation. C'est le bon modèle :
une seule image Docker se déploie sur tous les environnements, la configuration
étant injectée au lancement. À reprendre en Phase 06 — en sortant simplement les
valeurs du dépôt.

### O3 — Ne pas reproduire le poids du dépôt d'origine

`src/assets.zip` (9,9 Mo) est versionné, et le dépôt Git pèse 87 Mo. Un binaire
committé reste dans l'historique pour toujours et se télécharge à chaque clone.
La migration est l'occasion de ne pas le réintroduire.

### O4 — Les tests end-to-end sont à réécrire, pas à migrer

L'existant repose sur Protractor, abandonné depuis Angular 12. Il n'y a rien à
transposer : la Phase 05 doit prévoir une réécriture (Playwright ou Cypress).

### O5 — Le volume conditionne la stratégie de la Phase 07

4 003 fichiers TypeScript, 149 composants, 18 domaines fonctionnels. La
migration page par page est de loin la phase la plus lourde. Elle demandera son
propre document : ordre de migration (en commençant par les domaines les moins
couplés), définition de « migré », et méthode de vérification fonctionnelle
par rapport à l'application d'origine.

---

## Décisions attendues avant la Phase 02

| # | Décision | Impact si reportée |
| --- | --- | --- |
| C2 | Nom du workspace et scope des packages | Renommage coûteux dès que le premier package existe |
| C3 | Convention de dossiers (`apps/`+`libs/` ou `packages/*`) | Déplacement de tous les packages et de leurs références |
| C1 | Stratégie de graphe (dépendances déclarées ou analyse des sources) | `nx affected` et le cache deviennent faux dès le premier découpage |

Les points B1, B2 et B3 sont des corrections sans arbitrage : ils peuvent être
appliqués immédiatement.
