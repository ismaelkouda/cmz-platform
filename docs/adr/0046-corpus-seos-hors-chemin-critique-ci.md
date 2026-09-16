# ADR-0046 — Corpus SEOS hors du chemin critique des changements ordinaires

- **Statut :** Accepted
- **Date :** 2026-09-15

## Contexte

Le corpus SEOS est un index de correspondances et de décisions d'architecture,
pas un jeu d'apprentissage ni la source de vérité de la plateforme générique
(ADR-0019). Il reste utile pendant la reproduction de SEOS avec les primitives
`list-query`, `action-request` et leur composition, mais le job PR historique
rejouait les 18 modules séquentiellement.

Mesure sur la PR #67 : le job `Corpus SEOS — structural-only` a duré **11 min 59
s**. Tous les autres contrôles de second niveau étaient terminés en moins d'une
minute après `guardrails`; le corpus déterminait donc presque seul la latence
finale. Cette passe répétait build, lint, tests et détection de doublons déjà
couverts par `nx affected` et les jobs spécialisés. De plus, son mode
`--structural-only` ne consulte pas le legacy et la CI PR ne comparait pas la
sortie régénérée au corpus committé.

## Décision

Le contexte GitHub obligatoire est conservé sans changement de nom afin de ne
créer aucune fenêtre de contournement de la protection de `main`.

Sur chaque PR et push `main`, il exécute un contrat rapide qui vérifie :

1. le schéma de chaque ligne JSONL ;
2. l'unicité globale des identifiants ;
3. la concordance `fichier ↔ module` ;
4. la concordance du pin `legacy_ref` avec `legacy.lock.json` lorsqu'il existe ;
5. l'existence de chaque chemin Nx et son confinement dans le workspace, liens
   symboliques compris.

La passe coûteuse `bun run corpus:ci` s'ajoute uniquement si le diff touche :

- `corpus/**` ;
- `tools/corpus/**` ;
- le schéma de paire ;
- `legacy.lock.json` ;
- `nx.json` ou un `project.json` de bibliothèque, car les tags/cibles pilotent
  les gates par module ;
- le câblage du job dans `ci.yml` ;
- ou les scripts corpus/legacy de `package.json`.

Une dépendance modifiée dans `package.json` sans changement de ces scripts ne
déclenche pas le corpus : la compatibilité Nx/build/test reste l'autorité de
l'Oracle `nx affected`.

Le workflow `corpus-full`, qui vérifie réellement les chemins legacy, reste
automatique après fusion d'un changement touchant ses sources de vérité et reste
lançable manuellement. Il ne tourne plus après chaque push applicatif sur
`main`.

## Conséquences

- Une PR ordinaire conserve un contrôle corpus bloquant, mais sans installation
  des dépendances ni processus Nx.
- Un fichier Nx référencé supprimé, déplacé ou remplacé par un lien sortant
  échoue immédiatement, même si `corpus/**` n'a pas été modifié.
- Toute modification du générateur ou des données rejoue encore la validation
  historique complète.
- Les builds, lints et tests comportementaux restent bloquants via les jobs
  canoniques de la plateforme, sans duplication par module SEOS.
- Le corpus reste transitoire : après extraction des scénarios de
  caractérisation vers les primitives génériques, son archivage pourra faire
  l'objet d'une décision séparée.

## Alternatives rejetées

### Supprimer immédiatement tout contrôle corpus

Trop tôt : les scénarios SEOS servent encore de référence à la reproduction et
les chemins committés pourraient dériver silencieusement.

### Garder les 18 modules sur chaque PR

Le coût est disproportionné et les oracles de code sont redondants avec la CI
canonique. Cela ralentit toutes les contributions sans augmenter la confiance
sur la plateforme générique.

### Utiliser uniquement un filtre `paths` GitHub sur le job requis

Un workflow ou job entièrement omis peut laisser un contexte requis absent. Le
job doit toujours exister et conclure ; seule sa step profonde est
conditionnelle.
