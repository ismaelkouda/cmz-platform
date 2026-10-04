# Exemple de shell — workspace à vues vivantes

- **Statut :** exemple de disposition approuvé par validation humaine le
  2026-10-04
- **Autorité :** placement et hiérarchie des onglets du workspace uniquement
- **Espaces :** Medium et Expanded ; Compact explicitement exclu
- **Manifeste :** [`example-set.json`](./example-set.json)
- **Décision :**
  [ADR-0084](../../../docs/adr/0084-workspace-a-vues-vivantes-et-fermables.md)

## Objectif

Ces deux images proposent la composition générique d'un workspace à vues
vivantes. La barre se situe entre l'en-tête global et le panneau de la route
active. Elle ne fait pas partie de la toolbar du tableau illustratif.

`Tableau de bord` représente une vue épinglée sans fermeture. Les autres
onglets montrent une fermeture individuelle. Les routes, données, capacités et
couleurs sont fictives et n'autorisent rien dans une application réelle.

## Autorité approuvée

- une seule ligne horizontale, sans wrap ;
- `Tableau de bord` épinglé, premier et non fermable ;
- fermeture visible pour chaque autre onglet ;
- onglet actif toujours visible et distingué sans dépendre seulement de la
  couleur ;
- aucun `Plus (n)` permanent ;
- tout l'espace disponible est utilisé avant débordement ;
- commandes de défilement seulement lorsqu'un débordement existe ;
- absence totale de la barre en Compact.

## Ce que l'image ne prouve pas

Une image ne peut pas prouver que les composants restent vivants. Le runtime
doit démontrer la même instance Angular après réactivation, la conservation des
formulaires et filtres, la suspension des tâches de fond, la destruction du
handle à la fermeture, les gardes dirty, les permissions, le clavier et le
budget mémoire.

Le tableau, sa recherche et ses actions constituent seulement un panneau de
contenu fictif. Ils n'appartiennent pas à l'autorité du shell.

Le runtime doit suivre le
[contrat complet](../../../docs/architecture/workspace-vues-vivantes-accessibilite-2026-10-04.md)
et produire ses propres preuves.

[`mockup.html`](./mockup.html) et [`render.mjs`](./render.mjs) reproduisent les
PNG. Ils ne constituent pas du code Angular à copier.

Les deux candidats antérieurs restent conservés dans
[`historical/recent-route-navigation`](./historical/recent-route-navigation/README.md)
avec `authority: none` : leur présence assure la traçabilité, jamais une
autorité concurrente.
