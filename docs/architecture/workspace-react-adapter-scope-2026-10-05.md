# Workspace ReactJS — qualification de la primitive et contrat de l'hôte

- **Date :** 2026-10-05
- **Statut :** qualification `jsdom` de React Activity ; choix d'hôte
  conditionnel et parité navigateur non réalisés
- **Référence produit :**
  [workspace à vues vivantes](./workspace-vues-vivantes-accessibilite-2026-10-04.md)
- **Version vérifiée :** React `19.3.0`, ReactDOM `19.3.0`

## Candidat de construction

`<Activity>` est le candidat natif pour conserver chaque vue ouverte. Si la
preuve sur un hôte réel le confirme, chaque frontière sera stable et identifiée
par le chemin canonique. La vue active utilisera `visible` et les autres
`hidden`. Fermer une vue retirera sa frontière de l'arbre React : la fermeture
doit provoquer un vrai démontage, pas seulement masquer le DOM.

Cette primitive est native dans React 19.3. La preuve exécutée dans
`stack-tests/reactjs/workspace-activity.spec.tsx` établit quatre faits sur la
version verrouillée du dépôt :

1. une alternance `visible → hidden → visible` restitue le même élément DOM, le
   texte saisi et le state local ;
2. deux frontières distinctes conservent des états indépendants ;
3. le passage à `hidden` nettoie les Effects, puis le retour à `visible` les
   redémarre — un chargement déclenché au montage est donc répété ;
4. retirer la frontière détruit l'état : une nouvelle ouverture repart d'une
   nouvelle instance.

Le troisième fait est une contrainte de conception. Un Effect qui lance un GET à
chaque montage le relancera lors de l'activation. L'hôte ne peut donc pas
promettre « aucun GET au changement d'onglet » par le seul choix d'`Activity`.
Les pages devront séparer données mises en cache et Effects de présence, avec
une politique de fraîcheur ou une invalidation explicite pour tout rechargement.
Les requêtes en vol, timers, médias et ressources hors React devront être
annulés ou suspendus selon leur contrat de page. React signale notamment que les
effets intrinsèques d'un élément média ou iframe ne sont pas arrêtés par le
simple masquage du DOM.

## Frontière de l'adaptateur

Le contrat produit reste celui de l'ADR-0084. L'hôte React sera responsable des
éléments suivants, avec des tests sur une application exécutable :

| Sujet         | Comportement à prouver                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Identité      | Une frontière par chemin canonique ; dernière URL exacte conservée, y compris paramètres et fragment.                                          |
| Navigation    | L'activation et l'historique navigateur passent par le routeur réel de l'hôte ; aucun routeur React n'est actuellement qualifié dans ce dépôt. |
| Lifecycle     | Une seule vue `visible` ; les autres `hidden`, avec état local conservé et activités de fond suspendues.                                       |
| Fermeture     | Retrait de la frontière, démontage observé, confirmation préalable des vues `dirty`, repli vers une vue autorisée.                             |
| Sécurité      | Autorisation vérifiée avant de rendre une vue visible ; révocation et fin de session détruisent les frontières concernées, même `dirty`.       |
| Capacité      | Refus explicite à la limite ; budget React mesuré séparément du plafond Angular de huit vues.                                                  |
| Accessibilité | Même résultat observable pour Tabs, clavier LTR/RTL, focus, fermeture et reflow ; implémentation React propre.                                 |

Le modèle de vue, les événements attendus et les scénarios de conformité sont
partageables entre cibles. Aucun handle Angular, cache de composants ou service
de navigation n'est partagé avec React. Le routeur React, le shell, la
présentation des tabs et la politique de données seront choisis à partir d'une
application cible réelle, puis vérifiés avec le même protocole navigateur que le
shell Angular.

## Niveau de preuve atteint

Cette tranche vérifie des propriétés de React sur quatre scénarios `jsdom` et
fixe les critères de l'hôte. Elle ne prouve ni routeur, ni permissions, ni
absence de requête réseau, ni budget mémoire, ni accessibilité navigateur, ni
parité fonctionnelle avec le back-office Angular. Elle ne suffit donc pas à
figer `Activity` comme implémentation. La prochaine tranche doit fournir un hôte
React exécutable et ses oracles navigateur, y compris une preuve qu'un simple
switch n'émet aucun GET/POST. La présence actuelle des renderers React métier ne
tient pas lieu de shell.

Preuves locales du 2026-10-05 : `check:generator-platform:reactjs` compile les
sorties générées puis passe `57/57` scénarios React ; la gate complète passe
également `442` tests cœur et `69/69` scénarios Angular. Knip analyse désormais
explicitement les fichiers TSX sous `tools/`, afin que cette preuve ne soit pas
exécutée tout en restant invisible au contrôle de dead-code.

## Sources

- [React — Activity](https://react.dev/reference/react/Activity)
- [React 19.2 — introduction d'Activity](https://react.dev/blog/2025/10/01/react-19-2)
- [React — préserver et réinitialiser le state](https://react.dev/learn/preserving-and-resetting-state)
