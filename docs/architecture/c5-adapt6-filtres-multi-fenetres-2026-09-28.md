# C5 ADAPT-6 — filtres adaptatifs multi-fenêtres

- **Statut :** décision produit approuvée ; candidats visuels ADAPT-6b soumis à
  revue ; réalisation non commencée
- **Date :** 2026-09-28
- **Périmètre :** présentation des filtres de la page C5 et capacité à monter à
  environ quinze critères
- **Dépendance :** terminer la revue, la fusion et la CI post-fusion de la
  réalisation ADAPT-5 avant de produire les nouveaux oracles

## 1. Résultat attendu

La liste reste le contenu principal. Les filtres secondaires utilisent un même
état et un même formulaire, mais changent de conteneur selon l'espace utile :

| Classe     | Conteneur                       | Modalité | Organisation                                |
| ---------- | -------------------------------- | -------- | ------------------------------------------- |
| `compact`  | bottom sheet, `max-height: 80dvh` | modale   | liste de critères puis contrôle d'un critère |
| `medium`   | side sheet droit, `420–480px`      | modale   | contrôles complets regroupés                |
| `expanded` | pane droit, `360–440px`             | non modale | contrôles complets regroupés et repliables  |

Ces dimensions sont des bornes C5 à prouver, pas des constantes universelles du
générateur. Le mode `expanded` n'est autorisé que si le pane principal conserve
sa largeur minimale ; sinon le side sheet `medium` reste la solution sûre.

## 2. Parcours `compact`

Le bouton `Filtres (n)` ouvre un bottom sheet de hauteur déterminée par son
contenu, plafonnée à `80dvh`. La recherche principale reste visible sur la page
et n'est pas dupliquée dans le panneau.

Le premier niveau affiche une ligne par filtre secondaire :

```text
Filtres
────────────────────────
Profil          Tous   >
Rôle            Admin  >
Statut          Actif  >
────────────────────────
Réinitialiser   Appliquer
```

Activer une ligne remplace le corps du **même** bottom sheet. Aucun second
dialogue n'est empilé :

```text
‹ Retour        Statut
────────────────────────
○ Tous
● Actif
○ Inactif
────────────────────────
Réinitialiser   Appliquer
```

Le titre est le libellé métier du champ. Le corps reçoit le contrôle défini par
le contrat de présentation : saisie, date, radio, cases à cocher, select,
listbox ou autocomplete. Une sélection ne provoque ni retour automatique ni
requête. `Retour` conserve le brouillon et revient au sommaire.

Le footer est fixe, respecte la safe area et contient :

- `Réinitialiser`, action secondaire à gauche ;
- `Appliquer`, action principale à droite.

À une largeur où les deux libellés complets ne tiennent plus sans troncature,
les actions peuvent s'empiler. Elles gardent une cible d'au moins `44 × 44 CSS
px`; la préférence C5 reste `48px` de hauteur.

## 3. Parcours `medium`

`Filtres (n)` ouvre un side sheet à droite. La liste reste visible pour donner
du contexte mais devient inerte sous un backdrop. Le panneau :

- mesure entre `420px` et `480px` sans dépasser l'espace disponible ;
- possède un header et un footer fixes ;
- laisse son corps défiler indépendamment ;
- reçoit le focus initial, borne la tabulation, accepte Échap et restitue le
  focus au déclencheur ;
- abandonne le brouillon lorsqu'il est fermé sans application.

Les contrôles sont affichés directement dans des sections métier. Le parcours
champ par champ du compact n'est pas reproduit lorsque la largeur permet une
lecture directe.

## 4. Parcours `expanded`

Le formulaire devient un supporting pane persistant adjacent à la liste :

- largeur `clamp(360px, 28vw, 440px)` pour C5 ;
- pas de backdrop, `inert`, `aria-modal` ou piège de focus ;
- liste, pagination et filtres restent opérables simultanément ;
- repli manuel possible pour rendre toute la largeur à la liste ;
- état conservé pendant le repli et les changements de classe ;
- corps défilable, header et actions fixes.

Le pane n'est pas choisi à partir du mot `desktop`. Une fenêtre large mais
basse, zoomée ou insuffisante pour la liste conserve le mode temporaire.

## 5. Densité pour quinze filtres

Les champs ne forment ni une rangée horizontale ni une grille de quinze
contrôles au-dessus de la donnée. Ils sont ordonnés par fréquence et regroupés
par sens métier :

1. `Essentiels` contient trois à cinq critères fréquents et reste ouvert ;
2. les autres sections reflètent le domaine, par exemple identité, accès et
   état, période puis critères avancés ;
3. une section qui contient un filtre actif ou une erreur s'ouvre
   automatiquement ;
4. son en-tête peut résumer le nombre de filtres actifs mais ne contient aucun
   contrôle de formulaire ;
5. plusieurs sections peuvent rester ouvertes si l'espace et le parcours le
   justifient.

Le choix du contrôle suit la donnée, pas le framework backend :

| Donnée                                             | Contrôle candidat                   |
| -------------------------------------------------- | ------------------------------------ |
| booléen                                            | checkbox ou groupe segmenté         |
| choix unique court, environ deux à cinq valeurs    | radios ou chips de sélection        |
| liste moyenne                                      | select/listbox                       |
| liste importante, distante ou recherchable         | autocomplete                         |
| date ou période                                    | datepicker ou intervalle             |
| texte libre                                        | input                                |
| nombre ou plage numérique                          | input numérique ou intervalle        |

Cette table guide une décision explicite. Elle n'autorise pas le réalisateur à
inventer options, valeurs, tri ou sémantique absents du contrat.

## 6. État et effets réseau

Le modèle distingue :

- `appliedFilters` : valeurs visibles dans la liste et dans les chips ;
- `draftFilters` : valeurs éditées dans le panneau avant validation.

Les transitions sont fermées :

| Événement                              | Effet local                         | Effet réseau           |
| -------------------------------------- | ----------------------------------- | ---------------------- |
| ouverture                              | copie `applied` vers `draft`        | aucun                  |
| modification d'un champ                | change `draft`                      | aucun                  |
| `Réinitialiser`                        | remet `draft` aux valeurs par défaut | aucun                  |
| fermeture temporaire sans appliquer    | abandonne `draft`                   | aucun                  |
| `Appliquer`                            | valide `draft` vers `applied`       | au plus un GET         |
| suppression d'une chip déjà appliquée  | modifie `applied` explicitement     | au plus un GET         |
| resize ou changement de classe         | conserve les deux états             | aucun                  |

Le comportement de soumission de la recherche principale déjà approuvé n'est
pas redéfini ici. Lorsqu'un GET est demandé, il compose recherche, pagination et
filtres appliqués selon le contrat `list-query` existant.

## 7. Résumé des filtres appliqués

La barre de liste présente `Filtres (n)` et un nombre borné de chips supprimables.
Les chips reflètent seulement les valeurs appliquées :

- `medium` : jusqu'à deux chips, puis `+n` ;
- `expanded` : autant que la largeur utile l'autorise, avec une limite C5
  initiale de quatre puis `+n` ;
- un libellé accessible annonce le nom du filtre, sa valeur et l'action de
  suppression.

Cliquer `+n` ouvre le panneau. Aucun wrapping illimité ne doit déplacer la liste
sur plusieurs rangées de manière imprévisible.

## 8. Accessibilité et interaction

- titre et libellés stables entre sommaire et détail compact ;
- focus visible et ordre clavier logique ;
- bouton Retour réel, pas seulement un geste de glissement ;
- fermeture gestuelle éventuelle toujours doublée par un contrôle accessible ;
- annonces du nombre de résultats uniquement après une application terminée ;
- contrôles de sélection conformes aux patterns listbox/radio/checkbox ;
- réduction de mouvement respectée pour la transition interne et l'ouverture ;
- zoom texte à `200%`, reflow `320 CSS px`, clavier virtuel et safe areas sans
  action ou focus masqué ;
- expansion headers sans bouton, select ou checkbox imbriqué.

## 9. Points de refus pour la revue technique

Soumaila doit refuser la décision ou ses futurs candidats si :

1. le compact empile deux modales au lieu de remplacer le contenu du même
   bottom sheet ;
2. une sélection ou `Réinitialiser` déclenche une requête avant `Appliquer` ;
3. fermer sans appliquer modifie malgré tout les filtres actifs ;
4. les actions sortent du viewport, passent sous le clavier ou masquent un
   contrôle ;
5. le side sheet `medium` laisse l'arrière-plan ou son focus opérable ;
6. le pane `expanded` conserve un backdrop, `aria-modal` ou un focus trap ;
7. les quinze champs sont affichés sans priorité ni groupes métier ;
8. un resize recrée le formulaire, perd le brouillon ou déclenche le réseau ;
9. une largeur C5 est présentée comme constante universelle du générateur ;
10. les captures tierces deviennent un actif graphique ou une autorité métier ;
11. un composant partagé est extrait avant un second cas indépendant ;
12. les tests observent des classes DOM privées au lieu du comportement public.

## 10. Oracles obligatoires avant réalisation

Le prochain lot ne modifie pas immédiatement la page. Il doit d'abord ajouter
des scénarios qui échouent pour la raison attendue sur la version fusionnée :

1. bottom sheet compact, navigation interne et footer visible ;
2. reset sans GET, fermeture sans commit et application avec un seul GET ;
3. side sheet `medium` modal, focus borné et restitution exacte ;
4. pane `expanded` repliable, non modal et liste encore opérable ;
5. quinze champs synthétiques groupés, corps scrollable et actions toujours
   visibles ;
6. chips limitées, compteur exact et suppression avec un seul GET ;
7. resize `compact → medium → expanded → compact` sans perte ni réseau ;
8. limites de largeur, hauteur courte, `320 CSS px` et zoom `200%` ;
9. zéro contrôle interactif dupliqué ou caché ;
10. absence de tri ou d'option non fournis par le contrat.

Les vérifications portent sur le comportement et la géométrie publique, jamais
sur les classes DOM privées d'une bibliothèque.

## 11. Séquence de livraison

1. faire approuver et fusionner la réalisation ADAPT-5 actuelle ;
2. publier cette décision et la faire relire ;
3. produire des wireframes C5 compact, medium et expanded conformes à ce texte ;
4. après approbation produit, publier les références dans le manifeste ;
5. écrire les oracles et prouver leur échec exact sur `main` ;
6. régénérer un work order content-addressed ;
7. réaliser seulement les fichiers autorisés ;
8. exécuter tests composant, navigateur, accessibilité et inspection humaine ;
9. faire approuver, fusionner et contrôler la CI post-fusion ;
10. seulement après un second cas réel, évaluer une primitive partagée.

## 12. Hors périmètre

- adoption implicite d'Angular Material dans une app qui ne le déclare pas ;
- composant générique de plateforme avant un second cas réel ;
- ajout d'un tri, de valeurs ou de requêtes non décrits par le contrat ;
- synchronisation URL, vues enregistrées ou recherche interne des filtres sans
  besoin produit ;
- copie graphique ou conservation des captures de l'application tierce.

## 13. État de livraison au 2026-09-28

La dépendance ADAPT-5 est close : Soumaila a approuvé la PR #128 sur
`7fbe158e21bcb5a0067c51b2770cd8739294806a`, l'a fusionnée dans
`eff4d2d405e5cd884a8c5fac1557c99f2a87706e`, et la CI post-fusion
`36462839705` est verte.

La décision ADAPT-6a a ensuite été approuvée sur
`94823549a09a8f39df0979db273c64fcdf0e1951`, fusionnée dans
`0c6ff7b25eda3d407afffda27a7629174d015d87`, et validée par la CI
post-fusion `36465758895`.

ADAPT-6b propose maintenant quatre références déterministes : deux états du
même bottom sheet compact, un side sheet `medium` et un pane `expanded`. Elles
vivent dans
[`filter-candidates/proposal.md`](../../examples/users-management-proof/presentation/filter-candidates/proposal.md).
Elles n'ont aucune autorité avant approbation humaine et publication séparée.

## Références

- [ADR-0073](../adr/0073-filtrage-adaptatif-par-panneau-unique.md)
- [ADR-0072](../adr/0072-ui-adaptative-guidee-par-m3-et-apis-officielles.md)
- [Doctrine UI adaptative](./ui-adaptative-references-officielles.md)
- [Material 3 — side sheets](https://m3.material.io/components/side-sheets/overview)
- [Android — canonical layouts](https://developer.android.com/develop/adaptive-apps/guides/canonical-layouts)
- [Android — supporting pane](https://developer.android.com/develop/adaptive-apps/guides/build-a-supporting-pane-layout)
- [Angular Material — sidenav](https://material.angular.dev/components/sidenav/overview)
- [Angular Material — expansion](https://material.angular.dev/components/expansion/overview)
- [Angular Material — chips](https://material.angular.dev/components/chips/overview)
- [WAI-ARIA — dialog modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [WCAG 2.2 — Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum)
