# Revue de socle — avant Phase 02

- **Date :** 2026-07-21
- **Portée :** état du monorepo à l'issue de la [Phase 01](../phases/phase-01-squelette-nx.md), et enseignements tirés de l'analyse du projet d'origine `cmz-backoffice-frontend`
- **Objet :** identifier ce qui doit être tranché ou corrigé **avant** de générer l'application Angular


> **Mise à jour du 2026-07-21** — les points bloquants (B1–B3) et critiques
> (C1–C4) relevés par cette revue ont tous été traités. Ils ont été retirés de
> ce document ; les décisions qu'ils ont produites sont consignées dans les
> [ADR-0003](../adr/0003-nommage-et-structure-du-monorepo.md),
> [ADR-0004](../adr/0004-graphe-de-dependances-declarees.md) et
> [ADR-0005](../adr/0005-politique-de-version-unique.md), et leur application
> dans les phases [01b](../phases/phase-01b-corrections-socle.md) et
> [01c](../phases/phase-01c-politique-de-versions.md).
>
> Les points ci-dessous sont ceux qui **restent ouverts**.

## Synthèse

| Sévérité | Nombre | Doivent être traités |
| --- | --- | --- |
| 🟡 Amélioration | 3 ouverts, 2 traités | Au fil de l'eau |
| ⚪️ Observation | 5 | À intégrer au plan des phases ultérieures |

---

## 🟡 Améliorations

### A1 — Fichiers de socle manquants — ✅ partiellement traité

`.editorconfig`, `.gitattributes` et `.nvmrc` ont été ajoutés en
[Phase 01b](../phases/phase-01b-corrections-socle.md).

Le `.gitattributes` n'était pas un détail de confort : le projet d'origine
contient un script PowerShell (`scripts/generate-structure.ps1`), signe d'un
environnement de développement mixte Windows/macOS. Sans normalisation des fins
de ligne, les différences CRLF/LF auraient pollué les diffs et déclenché de faux
positifs sur `nx affected`.

**Reste ouvert :** la configuration Prettier racine, rattachée à la Phase 05
avec le reste de l'outillage de qualité.

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

### A5 — Prérequis absents du `README.md` — ✅ traité

Le `README.md` documente désormais la plage Node exigée et la version de bun,
alignées sur `engines` et `packageManager`
([Phase 01b](../phases/phase-01b-corrections-socle.md)).

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
