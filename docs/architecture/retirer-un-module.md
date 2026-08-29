# Retirer un module — `retire-module.mjs` / `check-no-orphan-references.mjs`

## Pourquoi ces scripts existent

La vision du projet est de minimiser l'action humaine. Avant le 2026-08-29,
retirer un module du repo (dernier cas réel : `newsletter`, un POC écrit à la
main pour concevoir le pattern port/token du générateur layered) exigeait un
audit manuel — grep ad hoc dans `apps/`, `libs/`, `tools/`, `docs/`, puis
relecture ligne par ligne de `eslint.config.mjs`, `tsconfig.base.json`,
`knip.json`, `package.json`.

Cet audit manuel a été refait deux fois pour le retrait de `newsletter`, et un
fichier (`transloco.config.ts`, une référence à
`apps/newsletter-test/public/i18n/`) est passé au travers les deux fois — trouvé
seulement après avoir écrit `check-no-orphan-references.mjs` et l'avoir fait
tourner sur le résultat supposé complet. C'est la preuve directe que l'audit
manuel, même fait avec soin, n'est pas fiable pour cette opération : elle doit
produire une preuve mécanique, pas reposer sur la mémoire de qui l'exécute.

## `tools/check-no-orphan-references.mjs`

Vérifie qu'un nom de module retiré ne laisse plus aucune trace dans le repo,
hors mentions historiques explicitement documentées.

```bash
node tools/check-no-orphan-references.mjs --module <nom>
```

Deux mécanismes d'exemption, volontairement distincts :

- `--allow <chemin>` : le fichier contient une mention **historique** (ex: un
  ADR qui explique qu'un pattern a été conçu via un POC depuis retiré). Le
  script vérifie que le fichier contient réellement un mot de justification («
  retiré », « supprimé », « POC »…) à proximité du nom du module — une allowlist
  qui ne justifie rien est rejetée.
- `--allow-active-fixture <chemin>` : le nom reste un **identifiant technique
  actif** (ex: `sources/newsletter-subscribe.definition.json`, une fixture de
  test du générateur qui porte ce nom par coïncidence, indépendamment de l'app
  supprimée). Aucune justification de retrait n'est exigée ici — au contraire,
  ce mécanisme documente que le nom n'est PAS mort.

Exit 1 si une référence non exemptée est trouvée. Voir le docstring du script
pour le détail des motifs recherchés (nom brut, alias `@cmz/<module>-*`, tags
`scope:<module>*`).

## `tools/retire-module.mjs`

Un retrait complet utilise **deux commandes séparées** parce qu'une étape
d'édition des configurations écrites à la main reste nécessaire entre les deux.
Le script conserve automatiquement l'état de l'opération sous
`.nx/retire-module/<nom>/` : hash initial de `package.json`, exemptions et
sauvegarde des racines retirées. La seconde commande reprend cet état ; aucun
argument déjà fourni n'est à ressaisir.

Ce stockage évite deux défauts importants : comparer à `HEAD` pouvait attribuer
au retrait une modification préexistante et sans rapport de `package.json`, et
une suppression physique immédiate pouvait perdre des fichiers non suivis par
git si un garde-fou échouait ensuite.

### Commande 1 — retrait

```bash
node tools/retire-module.mjs --module <nom> [--dry-run] \
  [--allow <fichier>] [--allow-active-fixture <fichier>]
```

Étapes automatiques (dérivées du filesystem, aucune déclaration séparée à
maintenir — même principe que `check-project-names.mjs`) :

1. Résout le scope réel (`apps/<nom>*`, `libs/<nom>*`).
2. Vérifie la fermeture transitive : refuse le retrait si un package HORS de ce
   scope importe un alias `@cmz/<nom>-*` (le module a un vrai consommateur, ce
   n'est pas un POC isolé).
3. Déplace les racines sous `.nx/retire-module/<nom>/removed/`. Pour git, elles
   sont retirées du workspace, mais restent récupérables jusqu'à la
   finalisation, y compris si elles n'étaient pas suivies.
4. Relance `check-project-names`/`check-declared-deps` pour confirmer que le
   graphe reste cohérent. En cas d'échec, restaure automatiquement les racines
   avant de sortir en erreur.
5. Rapporte les lignes de config à traiter à la main, et s'arrête là — n'appelle
   **pas** `check-no-orphan-references.mjs` (les fichiers de config ne sont pas
   encore nettoyés, le check échouerait pour rien).

Étape volontairement **non automatisée** : le nettoyage de `eslint.config.mjs` /
`tsconfig.base.json` / `knip.json` / `package.json`. Ces fichiers sont du
JavaScript/JSON à la main sans marqueurs structurés — les éditer par regex
serait le genre de fragilité qui peut corrompre silencieusement une config
critique. Le script **rapporte** les lignes concernées (fichier + numéro de
ligne + contenu) ; l'édition reste un geste humain ciblé, avec diff visible.

Les mentions historiques et fixtures actives peuvent être déclarées avec
`--allow` et `--allow-active-fixture`. Ces options ont le même contrat que dans
`check-no-orphan-references.mjs` et sont mémorisées dans l'état du retrait pour
la commande de finalisation.

### Commande 2 — finalisation

Une fois le rapport de l'étape 5 traité à la main :

```bash
node tools/retire-module.mjs --finalize --module <nom> [--skip-install]
```

Ne touche plus au filesystem des apps/libs (déjà mis à l'écart). Trois actions :

1. Compare `package.json` actuel au hash capturé au début de **ce retrait**.
   S'il a changé (cas typique : une dépendance devenue inutile a été retirée
   pendant le nettoyage de config), lance `bun install` dans la même commande
   pour garder `bun.lock` synchronisé — sinon `bun install --frozen-lockfile`
   casse en CI. `--skip-install` désactive cet appel ; le script avertit alors
   qu'il faut lancer `bun install` manuellement.
2. Reprend les exemptions mémorisées, appelle `check-no-orphan-references.mjs`
   et affiche son verdict. Un retrait n'est jamais « terminé » selon le jugement
   de `retire-module.mjs` lui-même — c'est un outil indépendant qui tranche.
3. Supprime la sauvegarde transactionnelle seulement après le succès de la
   preuve finale. En cas d'échec, l'état et la sauvegarde restent disponibles
   pour corriger puis relancer `--finalize`.

## Limite connue / piste d'amélioration

Le nettoyage de config reste un geste humain. Une évolution possible, si ce
genre de retrait devient fréquent : délimiter les blocs générés
(`depConstraints`, alias `paths`, entrées `knip.json`) par des commentaires
`// AUTO-GENERATED:<module> START/END` au moment où un module est créé par
`tools/generator-platform/`, pour que `retire-module.mjs` puisse les retirer
mécaniquement plutôt que de se contenter de les rapporter. Non fait au
2026-08-29 : aucun module créé par le générateur ne pose actuellement ces
marqueurs, et les ajouter rétroactivement à tous les modules existants aurait
été hors périmètre de ce chantier.
