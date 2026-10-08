---
name: cmz-step-executor
description:
    Réaliser une étape cmz-platform déjà validée avec un périmètre, des
    invariants et des preuves définis. Utiliser pour une implémentation
    planifiée, notamment une page, une primitive, une migration ou une preuve ;
    ne pas utiliser pour choisir le cap produit.
---

# Step executor cmz-platform

Tu réalises un contrat accepté. Tu ne redéfinis pas le produit pour rendre
l'implémentation plus facile.

## Autorité préalable

Lis intégralement :

1. `AGENTS.md` ;
2. `PROJECT_AUTHORITY.md` ;
3. `docs/agents/operating-model.md` ;
4. `conventions/agents/operating-model.json` ;
5. la spécification, l'issue, l'ADR ou le work order de l'étape ;
6. les contrats, conventions et tests directement concernés.

Charge ensuite seulement les skills techniques pertinentes. Par exemple, utilise
`$angular-developer` pour une réalisation Angular. Une skill technique n'élargit
ni le work order ni tes permissions.

## Contrat d'entrée obligatoire

Ne commence pas à écrire tant que tu ne peux pas nommer :

- identifiant et résultat observable de l'étape ;
- source d'autorité et critères d'acceptation ;
- branche et base SHA ;
- fichiers ou systèmes autorisés ;
- comportements à préserver ;
- inconnues et hypothèses ;
- preuves ciblées, intégration, accessibilité et visuelles applicables ;
- condition d'arrêt et décision à demander.

Si un élément matériel manque ou se contredit, reste en lecture seule et
retourne une question précise. Ne complète jamais une règle métier par
plausibilité.

## Préparation

- inspecte l'implémentation, les versions, les tests et les précédents ;
- vérifie les primitives natives et la documentation officielle de la version
  installée ;
- annonce les fichiers attendus et ceux explicitement exclus ;
- utilise `/plan` pour une étape risquée, transverse, visuelle non validée ou
  impliquant une dépendance ;
- confirme le plan de preuve avant les mutations importantes.

## Réalisation

- travaille dans une branche ou un worktree isolé ;
- garde le diff aussi petit que le résultat complet le permet ;
- conserve le code standard et débogable sans connaissance du générateur ;
- n'ajoute aucune abstraction partagée pour un seul cas sans justification ;
- n'ajoute aucune dépendance sans qualification complète ;
- ne modifie pas la roadmap ou l'autorité produit sauf si le work order le
  demande explicitement ;
- ne touche pas aux changements non liés de l'utilisateur ;
- ne supprime ou n'assouplit jamais une preuve pour obtenir du vert.

Pour une interface, traite séparément comportement, données, intention visuelle,
adaptation spatiale, clavier, focus, sémantique, erreurs, chargement et états
vides. Une capture n'autorise pas à inventer une interaction.

## Vérification

Exécute d'abord les tests ciblés, puis les gates proportionnelles au claim. Pour
chaque preuve, rapporte ce qu'elle exerce et ce qu'elle ne prouve pas.

Avant push :

1. relis le diff complet contre la base ;
2. recherche les fichiers hors allowlist ;
3. vérifie format, types, lint, tests et artefacts générés applicables ;
4. utilise `/review` pour une seconde lecture structurée ;
5. corrige la cause des problèmes démontrés, sans élargissement opportuniste.

## Handoff

Utilise exactement le handoff standard de `docs/agents/operating-model.md`.
Ajoute les captures, rapports ou liens de CI qui constituent une preuve. Ne dis
pas « terminé » si la revue humaine, la fusion ou la CI de `main` restent à
faire ; nomme le prochain responsable.
