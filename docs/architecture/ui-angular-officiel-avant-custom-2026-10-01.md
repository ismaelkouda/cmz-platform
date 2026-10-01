# UI Angular — audit « officiel avant custom »

- **Date de vérification :** 2026-10-01
- **Statut :** audit de décision ; doctrine adoptée par ADR-0077
- **Cible vérifiée :** Angular `22.2.0`, Angular CDK/Material/Aria `22.2.1`
- **Périmètre :** composants et interactions des applications Angular du dépôt

## 1. Résultat exécutif

Le dépôt doit préférer une capacité native ou officiellement maintenue avant de
construire un comportement interactif. Cette préférence n'est toutefois pas une
hiérarchie de dépendances où chaque niveau remplace le précédent : elle commence
par le besoin sémantique et s'arrête dès qu'une solution suffisante est trouvée.

Ordre de décision :

1. HTML sémantique et CSS natifs ;
2. Angular core, forms et router ;
3. Angular Material **ou** Angular Aria selon le contrat visuel ;
4. Angular CDK pour une primitive technique absente du niveau précédent ;
5. Tailwind ou styles de composant pour la seule présentation ;
6. code applicatif spécifique pour le besoin métier restant ;
7. abstraction partagée seulement après deux usages indépendants concordants.

Ce choix réduit le code clavier, focus et ARIA écrit localement, mais il ne
transfère jamais à la bibliothèque l'état métier, les appels réseau, les
permissions, la validation serveur ou les décisions de présentation.

## 2. Pourquoi cette règle est nécessaire

Un composant visuellement simple peut porter un contrat invisible important :
ordre de tabulation, flèches, `Home`/`End`, `Escape`, typeahead, relations
`aria-controls`, restitution du focus, sens RTL et annonces lecteur d'écran.
WAI-ARIA rappelle qu'un rôle est une promesse de comportement ; ajouter le rôle
sans réaliser le clavier attendu détériore l'expérience au lieu de l'améliorer.

À l'inverse, ajouter une bibliothèque à un bouton, un champ texte, une radio ou
un tableau de lecture déjà couverts par HTML augmente le bundle et la surface de
maintenance sans bénéfice. La règle doit donc empêcher deux erreurs symétriques
:

- réécrire localement un motif composite déjà correctement pris en charge ;
- remplacer une primitive HTML suffisante par une abstraction plus complexe.

## 3. Autorité et frontière de chaque couche

| Couche                    | À utiliser pour                                                                                            | Ne doit pas porter                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| HTML/CSS                  | bouton, lien, label, champ, radio, select court, tableau de lecture, layout et reflow                      | motif clavier composite inventé, état métier  |
| Angular core/forms/router | rendu, signaux, formulaires, DI, navigation et cycle de vie                                                | design system ou protocole ARIA local         |
| Angular Material          | composant visuel M3 complet dans une app qui a adopté Material                                             | personnalisation qui cible son DOM interne    |
| Angular Aria              | motif WAI-ARIA headless avec visuel propre : accordion, menu, listbox, combobox, tabs, toolbar, tree, grid | CSS, layout produit, données, effets réseau   |
| Angular CDK               | overlay, focus, layout ou utilitaire a11y bas niveau lorsqu'aucun composant supérieur ne suffit            | composant produit complet par défaut          |
| Tailwind / SCSS scopé     | géométrie, tokens, états visuels et responsive                                                             | rôles, clavier, focus ou état métier          |
| code applicatif           | contrat métier et écart résiduel prouvé                                                                    | réimplémentation générale d'un motif officiel |

Material et Aria sont deux réponses alternatives à un même embranchement :

- le rendu M3 convient et l'application a adopté Material : Material ;
- le rendu doit rester propre au produit : Angular Aria ;
- le besoin est simple : HTML natif, sans l'un ni l'autre.

Ils ne doivent pas être superposés sur le même contrôle pour « sécuriser » le
comportement. Deux propriétaires du focus ou du clavier créent au contraire des
états concurrents et difficiles à diagnostiquer.

## 4. Audit des huit axes

### 4.1 Sémantique et accessibilité

Décision : HTML natif reste le premier choix. Angular Aria intervient seulement
pour un motif composite reconnu. Les rôles et attributs redondants ou
contradictoires sont refusés.

Preuves minimales :

- élément natif adapté (`button`, `a`, `input`, `select`, `table`) ;
- nom, description et erreur accessibles ;
- ordre DOM identique à l'ordre de lecture et de focus ;
- clavier complet du motif WAI-ARIA ;
- contraste, zoom `200%`, reflow `320 CSS px`, texte agrandi ;
- test manuel sur les combinaisons navigateur/technologie d'assistance utiles.

Un passage AXE est nécessaire mais insuffisant : il détecte des violations
structurelles, pas la cohérence du parcours ou la qualité des annonces.

### 4.2 API et adéquation du motif

La forme visuelle ne décide pas du composant. Le rôle utilisateur le décide :

| Besoin                              | Défaut retenu                                     | Refus principal                         |
| ----------------------------------- | ------------------------------------------------- | --------------------------------------- |
| exécuter une action                 | `<button>`                                        | `div` cliquable                         |
| naviguer                            | `<a>` / `RouterLink`                              | bouton qui simule un lien               |
| choix binaire ou 2–3 choix visibles | checkbox/radios natifs                            | menu ou combobox                        |
| petite liste stable                 | `<select>` natif                                  | select headless sans besoin mesuré      |
| grande liste recherchable           | autocomplete/combobox après preuve du volume      | charger une liste distante non bornée   |
| commandes dans un popup             | Angular Aria Menu ou Material Menu                | select de formulaire utilisé comme menu |
| divulgation unique                  | bouton + région/disclosure                        | accordion complet inutile               |
| plusieurs sections repliables       | Angular Aria Accordion ou Material Expansion      | ARIA/roving focus artisanal             |
| tableau en lecture                  | `<table>`                                         | rôle grid sans navigation cellulaire    |
| grille interactive 2D               | Angular Aria Grid ou data-grid évaluée séparément | tableau transformé implicitement        |
| tâche modale                        | Material Dialog ou CDK Dialog/Overlay prouvé      | simple panneau décoré `aria-modal`      |

### 4.3 État, focus et cycle de vie

La bibliothèque possède l'état d'interaction local qu'elle définit : ouverture,
élément actif, relations ARIA et navigation clavier. La page conserve :

- brouillon/appliqué ;
- valeurs et validations métier ;
- chargement, erreurs et effets réseau ;
- permissions ;
- continuité adaptative.

Le focus produit reste explicite quand il dépend d'un changement de données. Par
exemple, Angular Aria Menu referme le menu et restitue le focus au déclencheur
avant d'émettre `itemSelected`. Ajouter ensuite un bloc de filtre exige donc que
l'application attende son rendu puis focalise son premier contrôle. Ce transfert
doit être déterministe et testé ; un `setTimeout` arbitraire est refusé.

### 4.4 Layout adaptatif et overlays

CSS est prioritaire pour position, dimensions, grille, wrapping, sticky et
reflow. CDK Overlay est justifié lorsque le popup exige réellement ancrage,
collision, couche globale, repositionnement ou gestion document-root.

Pour un menu Angular Aria, l'exemple officiel associe `ngMenu` à
`cdkConnectedOverlay` et au popover natif inline. Pour un grand panneau de
filtres intégré à une surface tabulaire, un overlay global n'est pas automatique
: une superposition CSS locale est plus simple si elle satisfait clipping,
focus, stacking et resize.

### 4.5 Performance et bundle

Le paquet `@angular/aria@22.2.1` :

- est ESM et déclare `sideEffects: false` ;
- expose des sous-chemins par motif (`accordion`, `menu`, etc.) ;
- dépend de `tslib` et a pour peers Angular core/CDK ;
- est donc compatible avec le tree-shaking, sans garantir un coût nul.

La taille gzip d'un fichier distribué n'est pas un delta de bundle fiable. Le
lot consommateur doit comparer le build de production avant/après, mêmes
options, et examiner les chunks. Aucun budget ne sera rehaussé pour faire passer
l'adoption.

### 4.6 Tests et observabilité

Trois niveaux complémentaires sont exigés :

1. tests de composant avec les harnesses officiels Aria/Material pour le contrat
   du motif sans dépendre de son DOM interne ;
2. Playwright sur le navigateur réel pour focus, clavier, resize, overlay,
   réseau et composition de page ;
3. AXE et parcours manuel clavier/lecteur d'écran sur une matrice explicitée.

Les harnesses Aria 22.2.1 existent notamment pour Accordion et Menu. Un test E2E
doit chercher un choix de menu par le rôle `menuitem`, pas par sa balise ou une
classe CSS. Les éléments rendus hors racine du composant sont interrogés depuis
le document root.

### 4.7 Maintenance, versioning et sécurité

Angular Aria a été introduit en developer preview dans Angular 21 puis déclaré
stable dans Angular 22. Le paquet reste jeune : l'historique récent comporte des
corrections sur accordion, menu et combobox. Conséquences :

- version catalogue exacte et alignée avec CDK ;
- groupe de mise à jour Angular existant dans Dependabot ;
- lockfile réellement régénéré ;
- audit, licences, Knip, build et tests après chaque mise à jour ;
- adoption motif par motif, sans migration globale préventive ;
- aucun import d'API privée.

L'absence de schématique est normale pour ce paquet headless sans configuration
d'application. Une recette `add-library` dédiée créerait une fausse empreinte et
une automatisation plus coûteuse que le besoin. La dépendance doit être déclarée
avec son premier usage réel et rester protégée par catalogue, lockfile,
Dependabot, Knip, audit, licences, build et tests. Une recette ne deviendra
utile que si une configuration répétable apparaît dans au moins deux
applications.

### 4.8 SSR, hydratation et portabilité

Aucune garantie Aria spécifique au SSR n'a été trouvée dans la documentation
officielle consultée. C5 est actuellement rendu côté client : ce point n'est pas
bloquant pour sa preuve. Une future app SSR/SSG ne devra pas extrapoler : elle
ajoutera une preuve `build:ssr`, prerender, hydratation sans mismatch et
première interaction après hydratation.

Cette décision est native à Angular. Le renderer React, Kotlin ou Swift choisit
les primitives officielles de sa propre plateforme ; aucune façade
cross-platform ne masque les modèles d'interaction.

## 5. Application exacte à C5 — filtres progressifs

| Élément C5                  | Choix                                                            | Justification                                                |
| --------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| liste d'utilisateurs        | `<table>` sémantique                                             | lecture tabulaire ; aucune interaction cellulaire 2D         |
| recherche globale           | `<input type="search">`                                          | contrôle simple                                              |
| raccourcis Profil/Rôle      | `<select>` natifs                                                | listes courtes et stables                                    |
| raccourci Statut            | radios ou select natif selon la place approuvée                  | trois valeurs connues                                        |
| blocs de filtres            | Angular Aria Accordion, `multiExpandable=true`                   | plusieurs sections repliables, simultanément consultables    |
| titre de bloc               | heading contenant uniquement un vrai bouton `ngAccordionTrigger` | contrat WAI-ARIA Accordion                                   |
| suppression du bloc         | bouton adjacent au heading                                       | action persistante, distincte de l'expansion                 |
| choix « Ajouter un filtre » | Angular Aria Menu                                                | liste d'actions qui créent un bloc, pas valeur de formulaire |
| popup du menu               | CDK ConnectedOverlay + popover inline                            | composition officielle, ancrage au déclencheur               |
| panneau complet             | CSS local d'abord                                                | superposition bornée à la surface du tableau                 |

Le groupe contient au maximum les trois filtres C5 actuels ; le `role=region`
appliqué par Angular Aria aux panels ne provoque donc pas la prolifération de
landmarks déconseillée par WAI-ARIA. Angular Aria ne permet pas de retirer ce
rôle au panel. Le scénario synthétique à quinze critères prouve donc le scroll
et la densité, pas l'autorisation de produire quinze landmarks simultanés en
production. Un vrai contrat dense doit limiter les panels simultanément
expansibles, regrouper les critères ou utiliser un disclosure sans landmark ; il
ne réutilise pas aveuglément l'Accordion C5.

Les choix « Profil », « Rôle », « Statut » du menu doivent exposer
`role=menuitem`. Après sélection : fermeture du menu, création du bloc, rendu,
focus du premier contrôle, zéro GET. Les triggers d'accordion supportent
Entrée/Espace et navigation par flèches/Home/End ; la suppression conserve son
propre nom accessible et son propre ordre de tabulation.

## 6. Ce qui reste volontairement custom

- contrat visuel validé et styles C5 ;
- géométrie Medium/Expanded et protection des colonnes recouvertes ;
- `draftFilters` / `appliedFilters` ;
- ordre et disponibilité des critères ;
- mapping vers les paramètres backend ;
- validation, budget réseau et retour page 1 ;
- focus après création ou suppression dynamique d'un bloc ;
- continuité lors du resize.

Ce code n'est pas une duplication d'Angular Aria : il exprime le produit. La
frontière est testée pour empêcher les directives de devenir un store métier.

## 7. Critères de rejet en revue

Refuser un lot si :

1. un élément natif suffisant est remplacé sans bénéfice mesuré ;
2. un motif officiel applicable est réécrit localement sans analyse d'écart ;
3. Material et Aria possèdent simultanément le même clavier ou focus ;
4. Tailwind/SCSS simule une sémantique ou un état non exposé dans le DOM ;
5. la bibliothèque reçoit des appels réseau ou des permissions métier ;
6. le test cible une classe ou la structure DOM interne d'une dépendance ;
7. AXE est présenté comme preuve complète ;
8. le bundle est justifié par la taille brute d'un fichier npm ;
9. la dépendance est masquée dans Knip avant son premier usage ;
10. une recette d'installation est créée sans configuration répétable ;
11. une abstraction partagée est extraite à partir du seul cas C5 ;
12. SSR/hydratation est déclaré compatible sans exécution sur une cible SSR.

## 8. Séquence de mise en œuvre

1. faire accepter ADR-0077 et le profil Angular mis à jour ;
2. fusionner les oracles C5 cohérents, y compris le rôle `menuitem` ;
3. recalculer le work order depuis le nouveau `main` ;
4. déclarer `@angular/aria` dans le même commit que son premier usage ;
5. intégrer Accordion et Menu seulement, avec CDK ConnectedOverlay pour le menu
   ;
6. ajouter les harnesses de composant et faire passer les oracles Playwright ;
7. mesurer le build de production avant/après, audit, licences et dead-code ;
8. inspecter Medium/Expanded, clavier, zoom, hauteur courte et lecteur d'écran ;
9. faire approuver le commit exact puis vérifier la CI post-fusion.

## 9. Références primaires

- [Angular Aria — overview](https://angular.dev/guide/aria/overview)
- [Angular Aria — accordion](https://angular.dev/guide/aria/accordion)
- [Angular Aria — menu](https://angular.dev/guide/aria/menu)
- [Angular Aria — select](https://angular.dev/guide/aria/select)
- [Angular Aria — autocomplete](https://angular.dev/guide/aria/autocomplete)
- [Angular Aria — grid](https://angular.dev/guide/aria/grid)
- [Angular roadmap — statut stable en v22](https://angular.dev/roadmap)
- [Angular — versioning and releases](https://angular.dev/reference/releases)
- [Angular Components — dépôt officiel](https://github.com/angular/components)
- [Angular Components — releases](https://github.com/angular/components/releases)
- [Angular Material — select](https://material.angular.dev/components/select/overview)
- [Angular CDK — overlay](https://material.angular.dev/cdk/overlay/overview)
- [Angular — component harnesses](https://angular.dev/guide/testing/component-harnesses-overview)
- [WAI-ARIA APG — Read Me First](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/)
- [WAI-ARIA APG — accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/)
- [WAI-ARIA APG — menu button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)
- [ARIA in HTML](https://www.w3.org/TR/html-aria/)
- [Tailwind — states and ARIA variants](https://tailwindcss.com/docs/hover-focus-and-other-states)
