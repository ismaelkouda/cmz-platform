# ADR-0044 — Bibliothèques UI ajoutées à la demande après `create-app`

- **Statut :** Accepted
- **Date :** 2026-09-08
- **Supersède :** uniquement le caractère « installé par défaut » de Material et
  Tailwind dans [ADR-0041](./0041-angular-material-tailwind-defaults.md)

## Contexte

ADR-0041 a correctement retenu Angular Material + Tailwind comme composition UI
supportée et en a imposé la coexistence vérifiable. Il imposait aussi leur
installation dans toute nouvelle app Angular. L’objectif produit précisé ensuite
est différent : `create-app` doit produire un shell utilisable sans code manuel,
puis chaque bibliothèque doit pouvoir être ajoutée **quand elle est nécessaire**
par une commande unique. Installer systématiquement deux dépendances UI dans une
app qui ne les utilise pas contredit ce besoin et augmente sans nécessité le
lockfile, le temps de génération et la surface de maintenance.

## Décision

- `create-app` produit le shell Angular/PWA minimal et son i18n Transloco, car
  les pages générées utilisent déjà ce contrat.
- Angular Material et Tailwind sont **opt-in**, chacune par la commande
  `bun run add-library --app <app> --library <library>`.
- Les installer toutes les deux reste la composition UI recommandée lorsqu’une
  app a besoin de primitives interactives Material et d’utilitaires Tailwind.
  Leurs invariants de coexistence s’activent automatiquement quel que soit
  l’ordre d’installation.
- Aucun renderer `create-app` ne recopie leur configuration. Toute installation
  passe par les mêmes recettes, matrices de compatibilité, transactions et
  oracles que l’ajout ultérieur. Un futur preset pourra orchestrer plusieurs
  appels dans une transaction parente, jamais créer un second mécanisme.

## Conséquences

- Le chemin nominal reste sans code manuel : création du shell, puis une
  commande par capacité souhaitée.
- Une app minimale ne paie pas le coût de Material ou Tailwind avant de les
  utiliser.
- La chaîne `create-app → commit du shell → add-library` doit être couverte par
  un test d’intégration réel. Tant que cette preuve n’est pas en CI,
  l’intégration entre les deux outils reste un chantier ouvert, même si chacun
  fonctionne séparément.

## Références

- [ADR-0041](./0041-angular-material-tailwind-defaults.md) — choix et frontière
  de coexistence Material/Tailwind.
- [ADR-0042](./0042-modele-transactionnel-mutations-workspace.md) — isolation,
  résolution, preuves et publication de `add-library`.
