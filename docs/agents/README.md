# Agents dans cmz-platform

Ce dossier définit comment des agents de niveaux très différents peuvent
intervenir sans dépendre de leur mémoire, de leur bonne volonté ou de leur
connaissance préalable du dépôt.

## Lectures

- [`operating-model.md`](./operating-model.md) : autorité, rôles, transitions,
  preuves et handoffs ; document normatif pour les agents.
- [`guide-utilisateur.md`](./guide-utilisateur.md) : commandes et contrôles en
  français simple pour le propriétaire du produit.

Les règles universelles sont dans [`AGENTS.md`](../../AGENTS.md). Le cap produit
reste défini par [`PROJECT_AUTHORITY.md`](../../PROJECT_AUTHORITY.md). Les skills
de `.agents/skills/` appliquent ces règles à chaque rôle ; elles ne les
remplacent pas.

Le contrat machine
[`conventions/agents/operating-model.json`](../../conventions/agents/operating-model.json)
borne les permissions et le handoff.
[ADR-0095](../adr/0095-modele-operatoire-agents-bornes.md) explique la décision
et les limites de la preuve automatisée.
[ADR-0096](../adr/0096-separer-execution-et-revue-agent.md) et la
[`chaîne agent d'exécution et de revue`](../architecture/chaine-agent-execution-revue-2026-10-08.md)
séparent le code, les preuves, la revue agent, l'approbation et la fusion.

## Principe

La fiabilité vient d'un système vérifiable : autorité bornée, sources nommées,
périmètre explicite, preuves réfutables, revue indépendante et état Git
observable. Elle ne doit jamais dépendre de l'affirmation « cet agent est bon ».
