# ADR-0092 — Réaliser le chargement progressif Compact de C5 en React

- **Statut :** Accepted
- **Date :** 2026-10-08
- **Décideurs :** équipe plateforme CMZ

## Contexte

ADR-0091 a qualifié la surface C5 React dans Chromium tout en conservant trois
écarts Compact explicites. Le premier était l'usage de la pagination visible sur
petit écran, contrairement au chargement progressif silencieux décidé par
ADR-0075. La liste demeure paginée par le backend ; seul son mode de projection
doit varier selon l'espace disponible.

Cette tranche ne doit ni modifier le runtime généré `list-query`, ni introduire
une bibliothèque de données, ni transformer une préférence de présentation en
contrat métier. Medium et Expanded doivent conserver leur pagination explicite.

## Décision

La page React projette les pages backend sous deux formes :

- en Compact, une liste sémantique de cartes accumule les pages contiguës ;
- en Medium et Expanded, la table et sa pagination explicite restent intactes.

Le chargement Compact respecte les invariants suivants :

1. `IntersectionObserver` observe une sentinelle avec une marge basse de 150 % ;
2. une seule page suivante peut être en vol ;
3. les éléments restent ordonnés et sont dédupliqués par `uniqId` ;
4. la sentinelle disparaît dès la dernière page ;
5. le chemin nominal n'affiche ni spinner, ni skeleton, ni texte de chargement ;
6. `aria-busy` et une région `aria-live` masquée exposent l'état aux
   technologies d'assistance ;
7. une erreur de page suivante conserve les cartes déjà présentes, bloque toute
   boucle automatique et propose un réessai visible de cette page exacte ;
8. recherche, filtre, rafraîchissement et création réussie repartent de la page
   1 avec une nouvelle génération ; une réponse d'une génération précédente est
   ignorée ;
9. un redimensionnement seul ne déclenche aucun GET. Après passage en Compact,
   la première interaction de défilement arme le chargement progressif.

La projection, les règles d'accumulation et le rendu Compact sont isolés dans
`page-compact-users.tsx`. Le composant principal reste sous la limite de poids
du dépôt. Aucun fichier généré n'est modifié.

L'I/O initiale est programmée au tour d'événement suivant et annulée dans le
cleanup de l'Effect. Le premier montage de vérification de React Strict Mode ne
peut ainsi pas émettre un GET fantôme ; le montage conservé charge exactement
une fois. Ce mécanisme reste local à l'initialisation de la page et ne remplace
pas les règles d'annulation/latest-wins du runtime généré.

## Preuves

Cinq scénarios Chromium déterministes couvrent :

- accumulation de 15 utilisateurs sur deux pages, déduplication et arrêt ;
- absence de pagination et de loader visible en Compact ;
- verrou d'une requête en vol, erreur 503 et reprise manuelle exacte ;
- exclusion d'une réponse tardive puis reset page 1 après recherche et filtre ;
- reset après création, maintien de la pagination Medium/Expanded et absence de
  GET causé par le seul resize.

La suite métier Medium fixe désormais explicitement son viewport, au lieu de
dépendre du défaut du runner. Les preuves axe/reflow restent communes aux trois
géométries. Le harnais fixe aussi `NODE_ENV=production` via l'API
`webServer.env` de Playwright : sans cette borne, le processus de test
transmettait `NODE_ENV=test` au build Vite et mesurait par erreur le runtime
React de développement. Le build de preuve mesure 313 062 octets de script +
style, contre 307 145 avant la tranche ; le budget bloquant de 512 KiB reste
inchangé. Le profil CDP sur 130 cycles conserve
`1 document / 360 nœuds / 170 listeners` et reste sous les budgets mémoire
512/128 KiB.

## Conséquences

- Le premier des trois écarts Compact d'ADR-0091 est fermé.
- Le filtre modal à deux niveaux et le FAB de création restent explicitement
  ouverts ; aucune parité produit M4 n'est déclarée.
- Le comportement de pagination backend n'est ni caché dans le générateur, ni
  dupliqué dans une bibliothèque générique prématurée.
- Toute régression sur concurrence, réponse obsolète, reset ou accessibilité
  rend le smoke navigateur rouge.
- Les captures produites restent des candidats temporaires de revue et non des
  baselines automatiquement approuvées.

## Références

- [ADR-0075 — Chargement progressif mobile silencieux](./0075-chargement-progressif-mobile-silencieux.md)
- [ADR-0090 — Surface C5 React gouvernée](./0090-realiser-surface-c5-react-par-work-order.md)
- [ADR-0091 — Qualification Chromium C5 React](./0091-qualifier-c5-react-dans-chromium-sans-declarer-la-parite.md)
- [Profil plateforme React](../architecture/react-platform-profile.md)
