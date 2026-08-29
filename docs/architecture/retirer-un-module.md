# Retirer un module — `retire-module.mjs` / `check-no-orphan-references.mjs`

## Pourquoi ces scripts existent

La vision du projet est de minimiser l'action humaine. Avant le
2026-08-29, retirer un module du repo (dernier cas réel : `newsletter`,
un POC écrit à la main pour concevoir le pattern port/token du
générateur layered) exigeait un audit manuel — grep ad hoc dans `apps/`,
`libs/`, `tools/`, `docs/`, puis relecture ligne par ligne de
`eslint.config.mjs`, `tsconfig.base.json`, `knip.json`, `package.json`.

Cet audit manuel a été refait deux fois pour le retrait de `newsletter`,
et un fichier (`transloco.config.ts`, une référence à
`apps/newsletter-test/public/i18n/`) est passé au travers les deux
fois — trouvé seulement après avoir écrit `check-no-orphan-references.mjs`
et l'avoir fait tourner sur le résultat supposé complet. C'est la preuve
directe que l'audit manuel, même fait avec soin, n'est pas fiable pour
cette opération : elle doit produire une preuve mécanique, pas reposer
sur la mémoire de qui l'exécute.

## `tools/check-no-orphan-references.mjs`

Vérifie qu'un nom de module retiré ne laisse plus aucune trace dans le
repo, hors mentions historiques explicitement documentées.

```bash
node tools/check-no-orphan-references.mjs --module <nom>
```

Deux mécanismes d'exemption, volontairement distincts :

- `--allow <chemin>` : le fichier contient une mention **historique**
  (ex: un ADR qui explique qu'un pattern a été conçu via un POC depuis
  retiré). Le script vérifie que le fichier contient réellement un mot
  de justification (« retiré », « supprimé », « POC »…) à proximité du
  nom du module — une allowlist qui ne justifie rien est rejetée.
- `--allow-active-fixture <chemin>` : le nom reste un **identifiant
  technique actif** (ex: `sources/newsletter-subscribe.definition.json`,
  une fixture de test du générateur qui porte ce nom par coïncidence,
  indépendamment de l'app supprimée). Aucune justification de retrait
  n'est exigée ici — au contraire, ce mécanisme documente que le nom
  n'est PAS mort.

Exit 1 si une référence non exemptée est trouvée. Voir le docstring du
script pour le détail des motifs recherchés (nom brut, alias
`@cmz/<module>-*`, tags `scope:<module>*`).

## `tools/retire-module.mjs`

Un retrait complet est **deux commandes séparées**, pas une seule — et
ce n'est pas arbitraire : après la commande 1, le scope du module
(`apps/<nom>*`, `libs/<nom>*`) n'existe plus sur le filesystem. Toute
tentative de faire tenir « suppression + finalisation » dans une seule
invocation échouerait mécaniquement à la résolution de scope de la
seconde moitié, avant même d'atteindre la logique de finalisation.
Entre les deux commandes, l'étape humaine (édition de config) modifie
`package.json` — c'est cette modification que la commande 2 doit
détecter, et elle ne peut le faire qu'en comparant contre `HEAD`, pas
contre un état capturé plus tôt dans le même run.

### Commande 1 — retrait

```bash
node tools/retire-module.mjs --module <nom> [--dry-run]
```

Étapes automatiques (dérivées du filesystem, aucune déclaration séparée
à maintenir — même principe que `check-project-names.mjs`) :

1. Résout le scope réel (`apps/<nom>*`, `libs/<nom>*`).
2. Vérifie la fermeture transitive : refuse le retrait si un package
   HORS de ce scope importe un alias `@cmz/<nom>-*` (le module a un
   vrai consommateur, ce n'est pas un POC isolé).
3. Supprime les fichiers.
4. Relance `check-project-names`/`check-declared-deps` pour confirmer
   que le graphe reste cohérent.
5. Rapporte les lignes de config à traiter à la main, et s'arrête là —
   n'appelle **pas** `check-no-orphan-references.mjs` (les fichiers de
   config ne sont pas encore nettoyés, le check échouerait pour rien).

Étape volontairement **non automatisée** : le nettoyage de
`eslint.config.mjs` / `tsconfig.base.json` / `knip.json` /
`package.json`. Ces fichiers sont du JavaScript/JSON à la main sans
marqueurs structurés — les éditer par regex serait le genre de
fragilité qui peut corrompre silencieusement une config critique. Le
script **rapporte** les lignes concernées (fichier + numéro de ligne +
contenu) ; l'édition reste un geste humain ciblé, avec diff visible.

### Commande 2 — finalisation

Une fois le rapport de l'étape 5 traité à la main :

```bash
node tools/retire-module.mjs --finalize --module <nom> [--skip-install]
```

Ne touche plus au filesystem des apps/libs (déjà supprimé). Deux
actions :

1. Compare `package.json` actuel contre `git show HEAD:package.json`.
   S'il a changé (cas typique : une dépendance devenue inutile a été
   retirée pendant le nettoyage de config), lance `bun install` pour
   garder `bun.lock` synchronisé — sinon `bun install
   --frozen-lockfile` casse en CI. `--skip-install` désactive cet
   appel (utile si `bun` n'est pas disponible dans l'environnement
   courant) ; le script avertit alors qu'il faut lancer `bun install`
   manuellement avant de committer.
2. Appelle `check-no-orphan-references.mjs` et affiche son verdict. Un
   retrait n'est jamais « terminé » selon le jugement de
   `retire-module.mjs` lui-même — c'est un outil indépendant qui
   tranche.

## Limite connue / piste d'amélioration

Le nettoyage de config reste un geste humain. Une évolution possible,
si ce genre de retrait devient fréquent : délimiter les blocs générés
(`depConstraints`, alias `paths`, entrées `knip.json`) par des
commentaires `// AUTO-GENERATED:<module> START/END` au moment où un
module est créé par `tools/generator-platform/`, pour que
`retire-module.mjs` puisse les retirer mécaniquement plutôt que de se
contenter de les rapporter. Non fait au 2026-08-29 : aucun module créé
par le générateur ne pose actuellement ces marqueurs, et les ajouter
rétroactivement à tous les modules existants aurait été hors périmètre
de ce chantier.
