# ADR-0090 — Réaliser la surface C5 React par work order gouverné

- **Statut :** Accepted
- **Date :** 2026-10-08
- **Décideurs :** équipe plateforme CMZ

## Contexte

Les ADR-0086 à ADR-0089 ont livré séparément le profil React, la composition C5,
son host borné, la couture navigateur et le pipeline de réalisation ciblé par
profil. La page visible restait volontairement vide. Écrire directement une UI
aurait contourné le plan d'exécution, la preuve de présentation, l'allowlist de
fichiers et les oracles confinés.

Le premier work order réel a aussi révélé deux contraintes de plateforme :

- les sélecteurs de preuve calculés dynamiquement ne sont pas démontrables par
  l'oracle statique ;
- `--runnerConfig` appartient au builder officiel Angular, mais n'est pas une
  option du CLI Vitest utilisé directement par React.

## Décision

La surface `page_6666666666666666` de `apps/users-management-react-proof` est
réalisée exclusivement sous le work order lié au contrat C5, au plan d'exécution
et à la preuve de présentation. Les fichiers de présentation sont limités à la
page, son SCSS Module, son test, sa preuve et deux sous-composants nommés pour
les filtres et la création.

La page :

- consomme uniquement la composition et le host générés ;
- déclenche les deux GET déclarés au montage ;
- présente la liste, la recherche, les filtres brouillon/appliqués, le
  rafraîchissement et la pagination contractuelle ;
- désactive la création sans `users.create` et revérifie la permission dans la
  composition avant le POST ;
- valide les champs, place le focus sur la première erreur, conserve le dialogue
  et les valeurs sur erreur serveur, puis ferme, notifie et laisse
  l'invalidation nommée recharger la liste après succès ;
- utilise HTML natif, hooks React, Tailwind qualifié et SCSS Modules, sans
  bibliothèque de formulaire, de query, de store ou de widgets ajoutée ;
- n'invente ni export, ni action de ligne, ni tri, ni endpoint supplémentaire.

Les identifiants couverts par `realization-evidence.json` restent littéraux dans
le JSX. Les URLs présentes dans les tests sont composées à partir de segments :
les assertions continuent à comparer les valeurs exactes sans être confondues
avec un accès réseau écrit dans la présentation.

La configuration de test appartient désormais au profil :

- Angular déclare le `runnerConfig` supporté par `@angular/build:unit-test` dans
  son `project.json` ;
- React borne Vite à `127.0.0.1` dans son `vite.config.mts` ;
- l'oracle commun exécute seulement la cible Nx et n'injecte plus une option
  spécifique à un framework.

Les renderers produisent ces configurations pour les futures applications ; il
ne s'agit pas d'une correction manuelle limitée aux preuves existantes.

## Preuves

- work order C5 content-addressed avec plan d'exécution et preuve de
  présentation ;
- contrôle statique sans accès réseau direct, endpoint de présentation ou
  sélecteur manquant ;
- 36 tests React : accès, host et cinq scénarios de page ;
- tests Angular et React réels via leurs configurations natives ;
- tests de régression du runner et des deux renderers ;
- oracle confiné vert : compilation, build production, lint et tests ;
- `check:application-pipeline` vert.

## Conséquences et limites

La plateforme possède maintenant une première surface C5 React reliée à sa
composition, sans copier le HTML Angular ni créer une abstraction UI commune.
Cette preuve ferme l'absence de présentation signalée par ADR-0088.

Elle ne prouve pas encore le rendu dans un vrai navigateur aux trois tailles,
les screenshots de référence, axe, le focus réel du dialogue sous Chromium,
VoiceOver/NVDA, le zoom/reflow multi-OS ou un appel live SEOS. Ces preuves sont
la tranche suivante et aucune parité produit M4 n'est déclarée avant elles.

## Références

- [ADR-0086 — Profil React natif minimal](./0086-profil-react-natif-minimal.md)
- [ADR-0087 — Contrat host React](./0087-contrat-host-react-pour-composition-de-page.md)
- [ADR-0088 — Réalisation de page ciblée par profil](./0088-realisation-page-ciblee-par-profil.md)
- [ADR-0089 — Montage navigateur React par host public fermé](./0089-montage-navigateur-react-par-host-public-ferme.md)
