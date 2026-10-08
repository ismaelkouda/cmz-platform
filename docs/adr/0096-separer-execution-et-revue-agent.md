# ADR-0096 — Séparer l'exécution et la revue agent d'une étape planifiée

- **Statut :** Accepted
- **Date :** 2026-10-08
- **Décideurs :** propriétaire du produit et équipe plateforme CMZ

## Contexte

ADR-0095 borne quatre rôles d'agent, mais ne décrit pas encore avec assez de
précision comment un `step-executor` et un reviewer automatisé coopèrent autour
d'une pull request. Déclencher un modèle dès la création ou l'assignation d'une
PR exposerait trois risques : relire un travail incomplet, accepter comme
instructions le contenu non fiable de la branche candidate et confondre un
commentaire probabiliste avec une approbation GitHub.

Le dépôt possède déjà un mécanisme plus fort qu'un prompt libre pour les pages :
un work order content-addressed, une allowlist et des oracles confinés. Ce
précédent doit être réutilisé. Un agent ne doit pas pouvoir modifier les critères
qui serviront ensuite à le juger.

## Décision

Une étape planifiée suit la chaîne suivante :

```text
work order approuvé et immuable
→ step-executor
→ preuves déterministes
→ task-specialist distinct en mode review
→ approbation humaine indépendante
→ fusion par Soumaila
→ CI de main
```

### Séparation d'autorité

L'executor et le reviewer ne sont ni le même agent ni la même session. Le
reviewer reste en lecture seule : il ne pousse pas, ne corrige pas, n'approuve
pas et ne fusionne pas. Son rapport aide la décision humaine ; il ne remplace ni
les protections GitHub ni les gates déterministes.

Soumaila est le reviewer humain demandé et l'acteur de fusion habituel. Comme la
protection de branche exige une approbation d'une personne disposant des droits
d'écriture et distincte du dernier pousseur, une autre personne autorisée doit
approuver si Soumaila a effectué le dernier push. Aucun agent ne contourne cette
règle.

### Autorité des entrées

Le work order est approuvé avant l'exécution puis rendu immuable pour cette
réalisation. Il peut être versionné sur la base protégée ou identifié par un hash
content-addressed explicitement accepté avant la première mutation.

Le diff, le titre et le corps de PR, les commentaires, noms de fichiers,
captures et handoff de l'executor sont des contenus candidats non fiables. Ils
servent de preuves ou de claims, jamais d'instructions pour le reviewer. Les
instructions de revue viennent de la base protégée et du work order approuvé.

### Déclenchement GitHub

Le signal principal d'une future automatisation est une demande de review,
après que l'executor a déclaré la PR prête et que les contrôles déterministes
requis sont terminés. L'assignation à Soumaila peut rester un signal de
compatibilité ou de rattrapage, mais elle ne suffit pas à prouver la readiness.

Chaque nouveau commit change le SHA de tête, invalide le rapport agent précédent
et nécessite une nouvelle revue du diff exact. Les rapports doivent toujours
nommer les SHA de base et de tête examinés.

### Boucle de correction

Un constat confirmé est routé selon son périmètre :

1. défaut couvert par le work order : l'executor peut réparer dans la même
   allowlist, puis toutes les preuves et revues sont rejouées ;
2. correction hors allowlist ou nouveaux critères : le steward prépare un
   nouveau work order ou fait valider son extension avant toute écriture ;
3. décision produit ou architecture : le propriétaire, Soumaila ou le steward
   tranche selon l'autorité applicable ; l'executor et le reviewer restent en
   attente.

### Automatisation et confidentialité

Cette décision formalise le protocole mais n'active aucun appel de modèle
externe. Envoyer un diff privé à Astra, Fable, JEV ou un autre fournisseur exige
une décision explicite sur le fournisseur, les données transmises, la rétention,
les secrets, les permissions GitHub, le coût et le mode d'échec.

JEV peut être évalué plus tard comme second juge étroit en replay/shadow. Il ne
devient ni le reviewer principal, ni l'autorité d'approbation, conformément à
ADR-0079 et ADR-0080.

## Alternatives écartées

### L'executor se relit lui-même

Écarté : le contexte et les hypothèses restent corrélés. Une posture différente
dans la même session ne crée pas l'indépendance requise.

### Déclencher la revue dès l'ouverture de la PR

Écarté : les PR draft et les premiers pushes produiraient du bruit, des rapports
obsolètes et un coût sans signal de readiness.

### Utiliser l'assignation comme seul déclencheur

Écarté : une assignation désigne un responsable humain ; elle ne signifie pas
que l'implémentation et ses preuves sont prêtes.

### Autoriser le reviewer agent à corriger ou approuver

Écarté : cela fusionnerait diagnostic, mutation et autorité humaine dans le même
acteur. Un commentaire de modèle n'est pas une approbation GitHub.

### Inventer immédiatement un work order universel

Écarté : seul le work order de réalisation de page est aujourd'hui prouvé. Les
autres familles utilisent un contrat de tâche explicite. Un schéma commun ne sera
extrait qu'après un second cas réel indépendant.

## Vérification et limites

Le contrat machine et sa gate empêchent les dérives documentaires les plus
critiques : auto-review, mutation par le reviewer, approbation ou fusion par un
agent, confiance dans le handoff et sortie externe sans accord. Ils ne prouvent
pas l'identité réelle d'un modèle, l'indépendance effective de deux sessions ni
la qualité du jugement.

Avant toute activation automatique, un POC doit fonctionner en commentaire non
bloquant, être calibré sur au moins vingt PR représentatives et mesurer défauts
utiles, faux positifs, constats obsolètes après push, coût et temps humain. Le
passage en gate requise est une décision séparée.

## Références

- [ADR-0043 — Discipline de preuve des agents](./0043-discipline-de-preuve-des-agents.md)
- [ADR-0079 — JEV en replay/shadow](./0079-jev-evaluateur-probabiliste-replay-shadow.md)
- [ADR-0080 — Prouver la valeur avant automatisation](./0080-prouver-la-valeur-avant-nouvelle-automatisation.md)
- [ADR-0090 — Réalisation de page par work order](./0090-realiser-surface-c5-react-par-work-order.md)
- [ADR-0095 — Modèle opératoire des agents](./0095-modele-operatoire-agents-bornes.md)
- [Chaîne agent d'exécution et de revue](../architecture/chaine-agent-execution-revue-2026-10-08.md)
