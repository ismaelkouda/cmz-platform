# Sécurisation de `page-realization` — C0

## Statut

Implémenté et prouvé localement le 2026-09-15. La promotion reste conditionnée à
la CI verte et à une revue humaine.

Ce lot ferme le P0 identifié dans
[`audit-page-composition-2026-09-15.md`](./audit-page-composition-2026-09-15.md)
: le fichier `page.component.spec.ts`, réalisé dans le périmètre de page, ne
doit plus être exécuté dans le vrai workspace avec tout `process.env`.

## Frontière mise en place

`verify:page-realization` conserve d'abord ses contrôles statiques : identité du
work order, hash du contrat, inventaire Git hors page, cinq fichiers autorisés,
absence d'appel HTTP direct et preuve des sélecteurs. Si, et seulement si, ces
contrôles passent, les quatre oracles `ngc`, build production, lint et test sont
exécutés par un runner externe appartenant à la plateforme.

Le runner reçoit une copie jetable des seuls fichiers visibles par Git. Les
fichiers ignorés, dont `.env` et les secrets locaux, n'entrent pas dans le
candidat. `node_modules` est exposé depuis le dépôt réel en lecture seule : par
permission macOS sur l'hôte et par bind mount `readonly` dans Docker.

Le processus confiné reçoit une allowlist d'environnement minimale : `PATH`
vide, `HOME` jetable, locale, indicateur CI, désactivation de Nx Cloud et
répertoires temporaires/caches Nx placés dans le candidat. Aucun token GitHub,
Nx, npm, cookie, secret ou variable arbitraire du processus parent n'est
propagé.

Le réseau externe est interdit. Le runner de test Angular utilise uniquement la
boucle locale, avec Vite lié à `127.0.0.1`; Docker conserve `--network none`.
Les commandes sont choisies dans une liste fermée, exécutées sans shell, avec un
`PATH` vide et un timeout de dix minutes. Les sous-processus héritent du même
confinement ; Docker ajoute `no-new-privileges`, aucune capability et une limite
de 128 processus.

Le work order publie désormais cette politique dans `oracle_policy`, et son
identifiant la couvre. Toute ancienne preuve est donc périmée plutôt que
silencieusement réutilisée.

## Preuves

- tests unitaires du work order, du candidat jetable et des montages macOS et
  Docker ;
- mutant de régression : le chemin nominal doit appeler exactement les quatre
  oracles externes et détruire le candidat ;
- épreuve hostile réelle sur macOS et Docker : secret absent, réseau externe
  inaccessible, dépôt réel non modifiable, dépendances non modifiables ;
- `bun run check:application-pipeline` vert avec une vraie page Angular : `ngc`,
  build production, lint et tests exécutés dans le confinement.

## Limites explicites

Ce lot sécurise l'exécution des oracles ; il ne rend pas `list-query`,
`action-request` ni la composition N×N production-ready. Le fichier de test de
page reste un artefact réalisable et ne devient pas pour autant un oracle
sémantique indépendant. Cette indépendance fonctionnelle, les vrais appels HTTP
sur mock hermétique et les pannes partielles restent dus dans C1 à C4.
