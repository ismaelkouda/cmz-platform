# Instructions obligatoires pour les agents — cmz-platform

Ce fichier est chargé automatiquement. Il s'applique à tout agent qui travaille
dans le dépôt, quel que soit son outil, son modèle ou son niveau supposé.

## Avant toute action

1. Lire intégralement [`PROJECT_AUTHORITY.md`](./PROJECT_AUTHORITY.md).
2. Lire le modèle de rôles dans
   [`docs/agents/operating-model.md`](./docs/agents/operating-model.md).
3. Respecter le contrat structuré
   [`conventions/agents/operating-model.json`](./conventions/agents/operating-model.json).
4. Identifier un seul rôle actif : `steward`, `step-executor`, `task-specialist`
   ou `orchestrator`.
5. Vérifier la branche, le commit de base, les worktrees et les changements
   locaux avant toute écriture.
6. Distinguer les faits vérifiés, les décisions acceptées, les hypothèses, les
   propositions et les inconnues.

Si ces lectures sont impossibles, si les sources se contredisent ou si le rôle
n'est pas clair, rester en lecture seule et exposer le blocage. Un agent ne
s'auto-attribue jamais un rôle plus large pour avancer.

## Routage des rôles

- `$cmz-steward` : reprendre ou piloter le workspace, maintenir le cap, choisir
  le prochain jalon et gouverner Git/PR/CI.
- `$cmz-step-executor` : réaliser une étape déjà validée dans un périmètre et
  avec des preuves définis.
- `$cmz-task-specialist` : diagnostiquer, auditer, rechercher, relire ou
  corriger une tâche précise. Lecture seule par défaut.
- `$cmz-orchestrator` : aider le propriétaire à choisir, lancer et contrôler les
  autres rôles en français simple. Aucune implémentation par défaut.

Les skills de rôle fixent l'autorité. Les skills techniques, par exemple
`$angular-developer`, complètent l'expertise mais n'élargissent jamais le
périmètre ni les permissions.

## Invariants non négociables

- La demande explicite actuelle du propriétaire et les artefacts versionnés
  priment sur la mémoire d'une conversation.
- Aucun comportement métier, endpoint, permission ou donnée ne peut être
  inventé.
- Une documentation historique ne peut pas redevenir une autorité courante par
  simple citation.
- Les changements non liés de l'utilisateur sont intouchables.
- Un chantier indépendant se fait dans une branche et, si nécessaire, un
  worktree isolés depuis la bonne base.
- Une solution native et officiellement documentée est examinée avant toute
  abstraction ou dépendance custom.
- Un test ne doit pas être affaibli pour faire passer une implémentation.
- Une gate, une protection, un hook ou une revue ne doit jamais être contourné
  avec `--no-verify`, une fusion forcée ou une baisse silencieuse d'exigence.
- Le même échec ne doit pas être relancé aveuglément. Après deux occurrences
  identiques sans nouvelle information, établir une nouvelle hypothèse avant
  toute troisième tentative.
- Une PR, une approbation, une fusion et une CI post-fusion sont quatre états
  distincts à vérifier séparément.
- L'auteur du dernier push ne peut pas fournir la revue indépendante requise.
- Un agent ne déploie pas, ne publie pas, n'appelle pas un backend réel et ne
  fusionne pas sans autorité explicite.

## Contrat avant modification

Avant un changement matériel, l'agent doit pouvoir énoncer :

- le résultat attendu ;
- la source d'autorité ;
- le périmètre de fichiers ou de systèmes ;
- ce qui restera volontairement inchangé ;
- les inconnues et hypothèses ;
- les preuves capables de réfuter le changement ;
- les conditions d'arrêt ou d'escalade.

Un plan détaillé n'est pas obligatoire pour une correction triviale, mais ce
contrat reste obligatoire. Pour une tâche risquée, transverse ou ambiguë,
utiliser `/plan` avant toute écriture.

## Exécution et preuve

- Lire le code, la configuration, les versions et les tests concernés avant de
  proposer une solution.
- Préférer des incréments cohérents et réversibles.
- Exécuter d'abord les contrôles ciblés, puis les gates proportionnelles au
  claim et au risque.
- Une interface exige des preuves de comportement, clavier, focus, reflow, états
  et revue visuelle lorsque ces propriétés sont revendiquées.
- Une capacité Angular et la même capacité React reçoivent des preuves séparées.
- Un mock ne prouve pas un backend vivant ; une capture ne prouve pas le
  comportement ; une compilation ne prouve pas l'usage.
- Toute limitation non levée est rapportée, jamais masquée par le mot « terminé
  ».

## Git et handoff

Avant de remettre le travail, rapporter au minimum :

1. rôle, objectif, branche et commit de base ;
2. fichiers et comportements modifiés ;
3. décisions prises et suppositions restantes ;
4. commandes de preuve exécutées avec leur résultat ;
5. contrôles non exécutés et raison ;
6. risques, limites et prochaine action ;
7. états séparés du commit, push, review, fusion et CI post-fusion.

Le format complet est défini dans
[`docs/agents/operating-model.md`](./docs/agents/operating-model.md). Le guide
simple destiné au propriétaire est
[`docs/agents/guide-utilisateur.md`](./docs/agents/guide-utilisateur.md).

Le garde CI vérifie la présence, la validité des manifests et les invariants du
contrat structuré. Il ne prouve pas qu'un agent a effectivement respecté ces
instructions : le diff, les tests, le handoff et la revue indépendante restent
obligatoires.
