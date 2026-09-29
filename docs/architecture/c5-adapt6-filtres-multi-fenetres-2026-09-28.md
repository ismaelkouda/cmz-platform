# C5 ADAPT-6 — filtres adaptatifs multi-fenêtres

- **Statut :** clos techniquement ; décision, preuves, oracles, cohérence du
  harnais et réalisation approuvés, fusionnés et validés en CI post-fusion
- **Date :** 2026-09-28, clôture vérifiée le 2026-09-29
- **Périmètre :** présentation des filtres de la page C5 et capacité à monter à
  environ quinze critères
- **Dépendance :** ADAPT-5 à ADAPT-6e fusionnés avec CI post-fusion verte ; la
  réalisation finale est bornée par le work order content-addressed
  `7db39bbe0856b8fce04f9aff6ac38ca1509b933886c35bc0fbe422561dd1d014`

## 1. Résultat attendu

La liste reste le contenu principal. Les filtres secondaires utilisent un même
état et un même formulaire, mais changent de conteneur selon l'espace utile :

| Classe     | Conteneur                         | Modalité   | Organisation                                 |
| ---------- | --------------------------------- | ---------- | -------------------------------------------- |
| `compact`  | bottom sheet, `max-height: 80dvh` | modale     | liste de critères puis contrôle d'un critère |
| `medium`   | side sheet droit, `420–480px`     | modale     | contrôles complets regroupés                 |
| `expanded` | pane droit, `360–440px`           | non modale | contrôles complets regroupés et repliables   |

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
les actions peuvent s'empiler. Elles gardent une cible d'au moins
`44 × 44 CSS px`; la préférence C5 reste `48px` de hauteur.

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

| Donnée                                          | Contrôle candidat             |
| ----------------------------------------------- | ----------------------------- |
| booléen                                         | checkbox ou groupe segmenté   |
| choix unique court, environ deux à cinq valeurs | radios ou chips de sélection  |
| liste moyenne                                   | select/listbox                |
| liste importante, distante ou recherchable      | autocomplete                  |
| date ou période                                 | datepicker ou intervalle      |
| texte libre                                     | input                         |
| nombre ou plage numérique                       | input numérique ou intervalle |

Cette table guide une décision explicite. Elle n'autorise pas le réalisateur à
inventer options, valeurs, tri ou sémantique absents du contrat.

## 6. État et effets réseau

Le modèle distingue :

- `appliedFilters` : valeurs visibles dans la liste et dans les chips ;
- `draftFilters` : valeurs éditées dans le panneau avant validation.

Les transitions sont fermées :

| Événement                             | Effet local                          | Effet réseau   |
| ------------------------------------- | ------------------------------------ | -------------- |
| ouverture                             | copie `applied` vers `draft`         | aucun          |
| modification d'un champ               | change `draft`                       | aucun          |
| `Réinitialiser`                       | remet `draft` aux valeurs par défaut | aucun          |
| fermeture temporaire sans appliquer   | abandonne `draft`                    | aucun          |
| `Appliquer`                           | valide `draft` vers `applied`        | au plus un GET |
| suppression d'une chip déjà appliquée | modifie `applied` explicitement      | au plus un GET |
| resize ou changement de classe        | conserve les deux états              | aucun          |

Le comportement de soumission de la recherche principale déjà approuvé n'est pas
redéfini ici. Lorsqu'un GET est demandé, il compose recherche, pagination et
filtres appliqués selon le contrat `list-query` existant.

## 7. Résumé des filtres appliqués

La barre de liste présente `Filtres (n)` et un nombre borné de chips
supprimables. Les chips reflètent seulement les valeurs appliquées :

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

1. le compact empile deux modales au lieu de remplacer le contenu du même bottom
   sheet ;
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
`eff4d2d405e5cd884a8c5fac1557c99f2a87706e`, et la CI post-fusion `36462839705`
est verte.

La décision ADAPT-6a a ensuite été approuvée sur
`94823549a09a8f39df0979db273c64fcdf0e1951`, fusionnée dans
`0c6ff7b25eda3d407afffda27a7629174d015d87`, et validée par la CI post-fusion
`36465758895`.

ADAPT-6b fournit quatre références déterministes : deux états du même bottom
sheet compact, un side sheet `medium` et un pane `expanded`. Elles vivent dans
[`filter-candidates/proposal.md`](../../examples/users-management-proof/presentation/filter-candidates/proposal.md).
Soumaila a approuvé leur commit exact
`81dd77e3633eada14fc1940f4a0c1cb4338aec87`, puis la PR #130 a été fusionnée dans
`9b1792c9afbb31c906c69af9068a6d2e498ca043`. Ses 16 contrôles et la CI
post-fusion `36471376072` sont verts.

ADAPT-6c publie ces quatre PNG et leur brief visuel stable dans le manifeste
`presentation-evidence`. Il retire de l'autorité active les anciennes images qui
montrent encore les filtres secondaires en ligne, sans supprimer leur
historique. Le brief ADAPT-2 reste actif après avoir rendu explicite la
supersession ciblée de sa section 4.3 par ADAPT-6. Aucun fichier Angular ni work
order n'est modifié dans ce lot. Soumaila a approuvé le commit exact
`2063b971e05cc77aac99848f336f1bc34709d7e1`, puis la PR #131 a été fusionnée dans
`d7874331583bd9ac61f84fdf96a73d3aa617c225`. Ses 17 contrôles et la CI
post-fusion `36498236321` sont verts.

ADAPT-6d ajoute dix scénarios Playwright dans
`apps/users-management-proof/e2e/adaptive-filter-oracles.spec.ts`. Ils couvrent
les dix familles de la section 10 et reconnaissent uniquement la signature
historique exacte : `#secondary-user-filters` reste un enfant direct de
`form.filters`, sans rôle ni modalité. Sur le `main` fusionné, les dix scénarios
échouent ensuite sur la première capacité adaptative absente et sont donc tous
classés comme échecs attendus, sans `skip` ni `todo` (`10 passed` en 30,2 s). Le
passage de non-régression complet du 2026-09-29 conserve les treize scénarios
existants comme succès réels et termine à `23 passed` en 39,3 s.

Le build Angular de production reste vert, mais signale que
`page.component.scss` pèse `6,47 kB` pour un seuil d'avertissement de `4 kB` et
un plafond bloquant de `8 kB`. La réalisation devra supprimer ou remplacer les
règles historiques de filtres, réutiliser les règles de panneau déjà présentes
et rester sous le plafond. Augmenter le budget ou déplacer artificiellement les
styles hors du composant n'est pas une correction acceptable.

La preuve de densité ne crée aucun filtre métier : elle clone seulement le vrai
groupe dans le DOM du navigateur, le rend `inert` et `aria-hidden`, puis mesure
le scroll et la visibilité du header/footer. Elle ne lie rien à Angular et
n'émet aucune requête. Ce lot ne modifie toujours aucun fichier de page, aucune
dépendance et aucun work order. Après revue et fusion, le prochain lot devra
calculer le nouveau work order depuis `main` avant toute réalisation.

Soumaila a approuvé ADAPT-6d sur le commit exact
`7daea25440b2b1abce246a280793da285d2278ff`, puis a fusionné la PR #132 dans
`6a630046195045fbe3eb841acd72bd5f895689ad`. Les 17 contrôles de PR et la CI
post-fusion `36504104906` sont verts.

ADAPT-6e corrige un dernier conflit de harnais découvert par une réalisation
jetable : `presentation-candidates.spec.ts` attendait globalement le `select`
Profil avant même l'ouverture des filtres. Conserver ce contrôle caché rendrait
mensongère la preuve ADAPT-6d qui exige zéro contrôle interactif dupliqué ou
caché. La vérification des options Profil est donc déplacée dans le vrai
formulaire de création ouvert, et le scénario compact attend désormais
`Réinitialiser` sans réseau puis `Appliquer` avec un GET unique. Sur l'interface
historique, seul le tuple exact `#secondary-user-filters` enfant direct de
`form.filters`, sans rôle ni modalité, autorise l'échec attendu.

Le passage complet reste vert à `23 passed` : les dix oracles ADAPT-6 et le
scénario de présentation échouent pour leur cause historique exacte, tandis que
les douze autres scénarios restent des succès réels. Ce lot ne modifie aucun
fichier Angular, aucune dépendance et aucun work order. Après revue et fusion,
le work order doit être recalculé depuis le nouveau `main` ; seulement ensuite
la réalisation peut reprendre dans les cinq fichiers de page autorisés.

Soumaila a approuvé ADAPT-6e sur le commit exact
`397d85d8ce28608da631e39aa1f5e7ba4e954997`, puis a fusionné la PR #133 dans
`4e65d8fb3fe8e14efdb1000c76f2577364198b18`. Ses 17 contrôles de PR et la CI
post-fusion `36530012640` sont verts.

## 14. ADAPT-6f — réalisation et clôture technique

Le work order recalculé depuis ce `main` lie le plan d'exécution et les preuves
de présentation exactes, conserve le hash protégé du workspace et limite la
réalisation aux cinq fichiers de page autorisés. Quatre de ces fichiers ont été
modifiés ; aucune dépendance, aucun runtime, transport, cache, bus global ou
contrat métier n'a été ajouté.

La page matérialise désormais les trois conteneurs approuvés avec un seul état
`draft`/`applied` et sans contrôle interactif caché ou dupliqué : bottom sheet
compact à navigation interne, side sheet `medium` modal et supporting pane
`expanded` non modal. `Réinitialiser` reste local, `Appliquer` et la suppression
d'une chip émettent chacun un seul GET, et les changements de classe conservent
le brouillon sans réseau.

Les preuves finales portent sur les octets poussés : 26 tests Angular, 23
scénarios Playwright, vérification du work order, compilation stricte, build
production, lint ciblé, Prettier et `git diff --check`. Le style du composant
atteint `7,74 kB`, sous le plafond bloquant de `8 kB` sans relèvement de budget.
Le correctif de disposition découvert par le passage E2E masque explicitement
la région des filtres quand le panneau de création `expanded` est ouvert ; il
évite qu'une colonne vide décale le panneau et restaure la marge sous le budget.

Soumaila a approuvé la PR #134 sur le commit exact
`d836886009e14b368ed48b94941c0462818b42a1`, puis l'a fusionnée dans
`8a6227a7b8eacb25525e188637e91694f15fbdd2`. Les 17 contrôles de PR et la CI
post-fusion `36534048265` sont verts. ADAPT-6 est donc clos techniquement.

Cette clôture ne transforme pas les wireframes en snapshots pixel. La décision
séparée prévue par ADR-0071 reste nécessaire avant toute baseline Chromium
bloquante. Elle devra soit calibrer une tolérance absolue sur plusieurs rendus
du même commit, soit justifier explicitement que les oracles comportementaux et
géométriques sont l'autorité durable la plus maintenable.

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

## 15. ADAPT-7 — revue d’accessibilité du parcours compact

La revue humaine préalable à la baseline Chromium valide la géométrie et la
hiérarchie des trois dispositions ADAPT-6. Elle détecte toutefois deux défauts
fonctionnels dans la navigation interne du bottom sheet compact : le bouton de
critère retiré du DOM conserve le focus, qui retombe alors hors du contrôle
utile, et le dialogue garde le nom accessible constant `Filtres` alors que son
titre visible devient `Profil`, `Rôle` ou `Statut`.

Ces défauts ne justifient ni une refonte visuelle ni une primitive partagée. Le
contrat minimal attendu est le suivant :

- ouvrir un critère transfère le focus vers son premier contrôle ;
- le nom accessible du panneau suit son titre visible ;
- `Retour` restitue le focus au bouton du critère quitté ;
- un redimensionnement conserve le brouillon, le sous-écran et son nom sans GET.

ADAPT-7a modifie seulement le harnais Playwright. Deux scénarios reconnaissent
l’ancienne signature exacte — `aria-label="Filtres"` sans
`aria-labelledby` — comme échec attendu. Les huit autres scénarios restent des
succès réels ; le passage ciblé termine à `10 passed`, dont deux échecs attendus,
sans `skip` ni `todo`. Le passage Playwright complet termine à `23 passed`,
avec ces deux seuls échecs attendus et vingt-et-un succès réels. Après revue et
fusion de ce harnais, ADAPT-7b devra
recalculer un work order depuis `main`, modifier seulement les fichiers de page
autorisés et faire passer les dix scénarios réellement. La refonte
Desktop/Medium ADAPT-8, décidée ensuite, précède désormais la reprise de la
baseline Chromium.

Une première réalisation jetable d'ADAPT-7b fait passer les dix oracles
adaptatifs, mais révèle un locator contradictoire dans le harnais de
présentation : le scénario « Appliquer et Réinitialiser » retrouve le dialogue
par son ancien nom constant `Filtres`, puis continue à l'utiliser après être
entré dans le détail `Profil`. Le nom dynamique correct rend donc le locator
introuvable alors que l'interface se comporte comme demandé.

ADAPT-7a2 corrige d'abord ce harnais sans modifier le runtime : le panneau est
identifié par son id public stable, son rôle et son nom initial sont vérifiés,
puis le scénario attend `Profil` après l'ouverture du critère. Seule l'ancienne
signature exacte `aria-label="Filtres"` sans `aria-labelledby` autorise encore
un échec attendu sur `main`. Après revue et fusion d'ADAPT-7a2, le work order
devra être recalculé une nouvelle fois avant de reprendre les deux fichiers de
page déjà validés par la réalisation jetable.

Soumaila a approuvé ADAPT-7a2 sur le commit
`cedb60d4a2f640674419a51740796d4c7a572986`, puis la PR #139 a été fusionnée
dans `bdb69077664eb589815b29f20144e8eef6ae22eb`. Ses 17 contrôles et la CI
post-fusion `36584337755` sont verts.

### ADAPT-7b — réalisation confinée et fusionnée

Le work order
`a9abe5a184697de6a54b71943d7f140dcbe441c367a279e2d8b20082f249278d`, recalculé
depuis ce `main`, autorise uniquement les cinq fichiers de la page. La
réalisation n'en modifie que deux : le template et le contrôleur.
Elle remplace le nom constant du panneau par `aria-labelledby`, transfère le
focus vers le premier contrôle du critère ouvert et le restitue au bouton du
critère quitté après `Retour`. Les marqueurs ajoutés sont locaux au parcours de
focus ; ils ne changent ni le contrat métier, ni l'API, ni la disposition.

Les dix oracles adaptatifs et les vingt-trois scénarios Playwright complets
passent réellement, sans échec attendu résiduel. Les 26 tests Angular, le lint,
le build production et l'Oracle du work order passent également, sans
violation de confinement. Le bundle initial reste à `262,69 kB` et le style à
`7,74 kB`, sous le plafond bloquant de `8 kB`. Soumaila a approuvé le commit
exact `56a71baf4db9adbcd8ce6d0920ec1eec64f1ed30`, fusionné par la PR #140 dans
`eb8be265e5843d196cff7bf10c6372e5f212f7de`. Les 17 contrôles de PR et la CI
post-fusion `36591923635` sont verts. ADAPT-7 est clos.
