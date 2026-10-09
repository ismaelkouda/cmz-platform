# ADR-0095 — Modèle opératoire à rôles bornés pour les agents

- **Statut :** Accepted
- **Date :** 2026-10-08

## Contexte

Le dépôt peut être repris par un agent principal qui ne connaît pas son
historique, un agent qui réalise une étape planifiée, un spécialiste chargé
d'une tâche précise, ou le propriétaire qui veut orchestrer ces interventions
sans maîtriser tous les détails techniques.

La qualité d'un modèle ne constitue pas une frontière de sécurité. ADR-0043 a
déjà montré qu'un même agent détecte des défauts en posture de review qu'il n'a
pas détectés en posture de construction. Une longue conversation ou un prompt
générique « sois rigoureux » ne garantit ni le périmètre, ni la preuve, ni le
handoff.

Le dépôt possède désormais une autorité produit claire. Il lui manque un
mécanisme natif pour obliger un nouvel agent à la découvrir, choisir une
autorité bornée et produire des sorties contrôlables par le propriétaire.

## Décision

### Instruction automatique courte

Un `AGENTS.md` racine est le point d'entrée opérationnel chargé par les agents
compatibles. Il reste court et route vers `PROJECT_AUTHORITY.md`, le modèle
opératoire détaillé et les skills. Les explications volumineuses ne sont pas
dupliquées dans le contexte automatique.

### Quatre rôles explicites

- `steward` : continuité, cap, priorité, Git/PR/CI et handoffs ;
- `step-executor` : réalisation d'un work order validé ;
- `task-specialist` : diagnostic, review, recherche ou correctif borné ;
- `orchestrator` : aide simple au propriétaire pour choisir et contrôler les
  trois autres rôles.

Un agent possède un seul rôle actif et ne s'auto-promeut pas. Une skill
technique ajoute une expertise, jamais une autorité.

### Contrat structuré

`conventions/agents/operating-model.json` fixe sous forme machine :

- les quatre rôles et leurs skills ;
- la racine canonique `.agents/skills/` et les adaptateurs de découverte bornés
  par client ;
- l'accès par défaut et la frontière de mutation ;
- l'absence de pouvoir de décision produit ;
- les modes du spécialiste ;
- les commandes slash documentées ;
- les champs obligatoires du handoff ;
- l'interdiction de relances identiques sans nouvelle hypothèse.

Son schéma documente les formes admises. Une gate et des mutations négatives
vérifient les invariants critiques et la concordance minimale avec les skills et
guides.

### Adaptateurs de découverte par client

Amendement du 2026-10-09 : l'observation d'une session Claude Code a montré que
`CLAUDE.md` était chargé sans `AGENTS.md` et que `.agents/skills/` n'était pas
exposé dans son catalogue de skills projet. La solution ne duplique pas les
instructions :

- `.agents/skills/` reste l'unique contenu canonique des rôles ;
- `CLAUDE.md` importe `AGENTS.md` et `PROJECT_AUTHORITY.md` avec le mécanisme
  natif Claude Code ;
- `.claude/skills/<rôle>/SKILL.md` porte seulement les métadonnées de découverte
  et importe la skill canonique correspondante ;
- la CI refuse une disparition d'import, un nom divergent ou le retour d'une
  autorité historique dans `CLAUDE.md`.

La syntaxe d'invocation peut différer selon le client (`$` dans Codex, skill
slash dans Claude Code) sans modifier le rôle, ses permissions ou sa source
d'autorité.

### Séparation entre conversation et Goal

Un rôle durable n'est pas un Goal illimité. `/goal` est réservé à un jalon avec
résultat, preuve, invariants et condition d'arrêt. Un nouveau steward commence
dans un chat propre et reconstruit l'état depuis les autorités versionnées ; il
n'hérite pas par défaut de toute la conversation historique via `/fork`.

### Contrôle humain

Le propriétaire dispose d'un guide en français simple et d'une skill
`$cmz-orchestrator`. L'orchestrator transforme une intention en rôle, commandes,
prompt, permissions, preuves, signaux d'arrêt et contrôle final. Il ne code pas
par défaut.

## Alternatives écartées

### Un prompt universel très long

Écarté : il charge du contexte non pertinent, mélange stratégie et exécution et
reste difficile à maintenir.

### Une seule skill « agent CMZ »

Écartée : elle permettrait à un agent de glisser silencieusement de la review à
l'écriture ou de l'exécution à la décision produit.

### Reprendre toutes les conversations historiques

Écarté : elles contiennent des directions supersédées et ne constituent pas une
source de vérité versionnée.

### Supposer un agent compétent

Écarté : la compétence réduit certaines erreurs, mais ne remplace pas une
frontière d'autorité, des preuves réfutables et une revue indépendante.

## Vérification et limites

La CI prouve seulement que les artefacts existent, que leurs métadonnées sont
valides et que les invariants structurés critiques restent cohérents. Elle ne
prouve pas qu'un modèle a lu, compris ou respecté les instructions pendant une
session réelle.

Cette limite est volontairement explicite pour respecter ADR-0043 : une
recherche de formulations dans la prose est un garde de dérive documentaire, pas
une preuve de comportement. Le respect réel reste observé par le contrat
d'entrée, les diffs, les tests, le handoff, la review indépendante et la CI.

## Conséquences

- un nouvel agent reçoit un chemin d'entrée stable sans la conversation passée ;
- le propriétaire peut orchestrer en langage simple ;
- un agent faible produit des omissions visibles plutôt que des permissions
  implicites ;
- quatre petites skills et deux guides doivent être maintenus ;
- quatre wrappers Claude Code minimaux doivent rester reliés aux skills
  canoniques, sans copie de leur corps ;
- toute évolution d'un rôle modifie d'abord le contrat structuré, puis les
  instructions et les tests correspondants ;
- une future skill React reste séparée du rôle `step-executor` et ne sera créée
  qu'après stabilisation de décisions React réellement observées.
