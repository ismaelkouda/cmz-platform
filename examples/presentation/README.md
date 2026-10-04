# Catalogue des exemples de mise en page

Ce dossier contient des exemples génériques approuvés qui peuvent guider la
composition d'une interface sans devenir une preuve de page ou une autorité
métier.

## Protocole obligatoire

Un humain ou un LLM doit toujours lire le `README.md` et le `example-set.json`
du même ensemble avant d'utiliser une image. Une image n'est applicable que si
le contrat de page déclare les capacités qu'elle montre. Une preuve runtime et
une validation humaine de la page réalisée restent obligatoires.

## Ensembles disponibles

| Ensemble | Espaces couverts | Statut | Ressources |
| --- | --- | --- | --- |
| Vue de données Medium/Expanded | `medium`, `expanded` | `approved-example` | [guide](./data-view-layout-examples/README.md) · [manifeste](./data-view-layout-examples/example-set.json) |
| Vue de données Compact | `compact` | `approved-example` | [guide](./compact-data-view-layout-examples/README.md) · [manifeste](./compact-data-view-layout-examples/example-set.json) |
| Shell à vues vivantes | `medium`, `expanded` | `approved-example` | [guide](./workspace-shell-layout-examples/README.md) · [manifeste](./workspace-shell-layout-examples/example-set.json) |

## Limites communes

- ces exemples n'autorisent aucun endpoint, payload, rôle ou permission ;
- une capacité visible mais absente du contrat reste absente du runtime ;
- les HTML et scripts de rendu servent à reproduire les PNG, pas à être copiés
  dans une application ;
- les primitives officielles de la stack cible restent prioritaires ;
- les couleurs, contenus et détails graphiques illustratifs ne constituent pas
  une exigence pixel-perfect.

La classification et les niveaux d'autorité sont définis par
[ADR-0083](../../docs/adr/0083-preuve-page-exemple-mise-en-page-et-archive.md).
