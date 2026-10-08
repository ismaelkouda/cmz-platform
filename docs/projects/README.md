# Projets produit

Ce dossier contient les artefacts lisibles par un humain pour les applications
réelles construites avec la plateforme. Les fixtures de
`examples/` et les applications `*-proof` ne sont pas des projets produit.

Pour chaque projet :

```text
docs/projects/<projet>/
├── project-brief.md       problème, acteurs, résultat, périmètre et inconnues
├── page-map.md            navigation validée, créée après le brief
└── pages/                 contrats de lecture par page, créés progressivement
```

Les contrats machine vivent dans leurs emplacements dédiés (`contracts/`,
`design-sources/`, `designs/`). Les documents projet expliquent les décisions ;
ils ne dupliquent pas leur schéma.

Règles :

- aucune information métier n'est copiée d'un autre produit sans validation ;
- les faits confirmés, observations, propositions et inconnues sont séparés ;
- un brief validé n'autorise pas implicitement toutes les pages ;
- une page est conçue, validée, réalisée et vérifiée avant de passer à la
  suivante ;
- tout contrat backend cible cite une source fournie ou déclarée par son owner.

Voir [`LLM_APP_BUILDER.md`](../../LLM_APP_BUILDER.md).
