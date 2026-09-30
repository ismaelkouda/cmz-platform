# ADR-0076 — Surface de création adaptative bornée par le contenu

- **Statut :** accepté
- **Date :** 2026-09-29
- **Décision :** conserver une tâche de création modale à toutes les classes de
  fenêtre, superposée au contexte et dimensionnée par le contenu dans des bornes
  explicites

## Contexte

Le formulaire C5 de création d'un utilisateur est aujourd'hui rendu par le même
tiroir étroit et à une colonne. En fenêtre `expanded`, ce tiroir devient un pane
persistant qui réduit la place de la liste et n'est plus modal. Cette géométrie
provient d'une première preuve adaptative ; elle n'exprime ni la densité réelle
du formulaire, ni la nature transactionnelle de la création.

La décision produit demande une surface inspirée de l'anatomie du panneau de
filtres — header, corps et footer stables — mais capable de croître en largeur
et en hauteur selon son contenu. La ressemblance ne doit pas conduire à partager
les sémantiques : les filtres `medium`/`expanded` restent non modaux et
réversibles, alors que la création porte un brouillon, des validations et un
POST.

## Options envisagées

### Option A — Conserver le tiroir actuel

- avantage : aucun changement de structure ;
- limites : une seule colonne sur grand écran, hauteur forcée, liste comprimée
  en `expanded` et modalité différente selon la largeur.

### Option B — Réutiliser exactement le panneau de filtres

- avantage apparent : moins de CSS et une silhouette connue ;
- limites : modalité, fermeture, validation, focus et dimensionnement sont
  différents. Le partage créerait une abstraction trompeuse.

### Option C — Partager le vocabulaire de surface, spécialiser la création

- avantages : anatomie cohérente, tâche clairement isolée, largeur utile sur
  grand écran et règles testables ;
- coût : nouvelles références visuelles et nouveaux oracles avant de modifier le
  runtime.

## Décision

**Option C.** La création est un dialogue modal dans les classes `compact`,
`medium` et `expanded`. Elle survole la page sans redimensionner la liste ni le
tableau. L'arrière-plan reste visible pour conserver le contexte, mais devient
inerte pendant toute la tâche.

La surface possède toujours trois régions :

1. header fixe avec titre, aide courte et bouton de fermeture nommé ;
2. corps seul défilable lorsque la hauteur utile est dépassée ;
3. footer fixe avec `Annuler` à gauche et `Créer` à droite.

La largeur et la hauteur sont **content-aware mais bornées**. Elles suivent un
contrat de présentation explicite, l'espace réellement disponible, le zoom et
les safe areas. Elles ne sont déduites ni du framework backend, ni d'un nom
d'appareil, ni d'une heuristique universelle fondée sur le nombre de champs.

## Contrat C5 par classe de fenêtre

| Classe     | Placement                                | Colonnes | Borne C5 à prouver                 |
| ---------- | ---------------------------------------- | -------- | ---------------------------------- |
| `compact`  | task sheet depuis le bas, pleine largeur | 1        | hauteur du contenu, max viewport   |
| `medium`   | dialogue latéral droit superposé         | 1        | largeur utile candidate 520–640 px |
| `expanded` | dialogue levité centré, toujours modal   | 2 max    | largeur utile candidate 640–760 px |

Ces fourchettes sont des contraintes de la preuve C5, pas des constantes à
placer dans le moteur de génération. À largeur utile insuffisante, le contenu
reflue en une colonne. Aucun scroll horizontal n'est admis pour remplir le
formulaire à 320 CSS px ou à 200 % de zoom.

L'ancrage à droite de `medium` conserve la continuité spatiale avec le
déclencheur et exploite une largeur intermédiaire comme une side sheet. En
`expanded`, ce bénéfice ne justifie plus un ancrage latéral : le fond est inerte
et la tâche est autonome. Le centrage exprime donc plus clairement la modalité,
réduit l'ambiguïté avec le panneau de filtres et répartit l'espace libre autour
du formulaire.

Pour les cinq champs C5, l'ordre DOM, visuel et clavier est stable : `Nom`,
`Prénom`, `Email`, `Téléphone`, `Profil`. En deux colonnes :

- ligne 1 : `Nom | Prénom` ;
- ligne 2 : `Email` sur toute la largeur ;
- ligne 3 : `Téléphone | Profil`.

Les spans appartiennent au contrat de présentation. Un renderer ne les invente
pas avec `auto-fit` ou à partir du type réseau.

## Modalité, focus et fermeture

- l'ouverture place le focus sur `Nom`, ou sur le premier message introductif
  pertinent si une future variante le justifie ;
- `Tab` et `Shift+Tab` restent dans le dialogue ;
- `Escape`, la croix et `Annuler` suivent la même politique de fermeture ;
- un formulaire vierge se ferme directement ;
- une modification métier significative demande confirmation avant abandon ;
- fermer restitue le focus au déclencheur de création ;
- changer de classe de fenêtre conserve la même instance de formulaire, ses
  valeurs, ses erreurs et le focus, sans appel réseau.

`aria-modal="true"` n'est exposé que parce que la page est réellement inerte et
le focus réellement borné. La croix possède un nom accessible ; le texte
redondant `Fermer` n'est pas requis dans le header.

## Validation et cycle réseau

- `Créer` reste disponible tant qu'aucun POST n'est en vol ;
- une soumission invalide marque les contrôles concernés, affiche les messages
  textuels et focalise le premier champ invalide sans POST ;
- pendant le POST, les doubles soumissions sont empêchées ;
- le conflit d'email est rendu sous `Email` et annoncé globalement, sans perdre
  aucune autre valeur ;
- une autre erreur distante conserve également le brouillon ;
- un succès ferme la surface, déclenche exactement une actualisation de la
  liste, affiche la notification de succès puis restitue le focus ;
- aucune couleur seule ne porte une erreur ou un état.

Cette décision est compatible avec Angular Signal Forms. Elle ne demande ni
nouvelle bibliothèque UI, ni changement de `action-request`, ni connaissance de
Laravel, Spring Boot, .NET, Django ou d'un autre backend.

## Limite de complexité

Deux colonnes constituent le maximum de cette surface. Un formulaire long,
multi-étapes, riche en dépendances ou nécessitant un contexte durable devient
une page dédiée ou un parcours explicite ; il ne transforme pas ce dialogue en
tiroir sans fin.

Une primitive partagée `task-surface` n'est pas créée dans ce lot. Elle ne sera
candidate qu'après des implémentations filtre et création validées, si leur
intersection prouvée dépasse la simple ressemblance visuelle.

## Conséquences

### Positives

- la tâche reste isolée et compréhensible à toute largeur ;
- la liste ne change plus de géométrie quand la création s'ouvre ;
- le formulaire utilise l'espace disponible sans devenir une grille arbitraire ;
- les règles de focus, validation et réseau deviennent observables par des
  oracles stables.

### Coûts et risques assumés

- la modalité `expanded` remplace le pane persistant historique de C5 ;
- le dialogue de confirmation d'abandon ajoute un état à prouver ;
- clavier virtuel, hauteur courte, zoom et redimensionnement doivent être testés
  avant fusion ;
- les anciennes captures de création ne peuvent plus servir d'autorité active.

## Non-décisions

- aucune modification du panneau de filtres ADAPT-8 ;
- aucun changement du bouton déclencheur `+` ou de ses libellés adaptatifs ;
- aucune extraction générique dans la plateforme ;
- aucune migration globale vers Angular Material ;
- aucune règle universelle `nombre de champs → largeur` ;
- aucun changement du contrat canonique ou des payloads C5.

## Preuves exigées avant réalisation

1. références propres au dépôt pour `compact`, `medium` et `expanded` ;
2. états vierge, invalide, conflit email et soumission en vol ;
3. viewport compact avec clavier virtuel et safe area ;
4. zoom 200 %, 320 CSS px et hauteur courte sans perte d'action ;
5. fond inerte, focus borné, `Escape` et retour au déclencheur aux trois tailles
   ;
6. fermeture vierge directe et confirmation du brouillon modifié ;
7. resize sans recréation du formulaire, perte d'état ou réseau ;
8. zéro POST invalide, POST mono-vol, un seul refresh après succès ;
9. ordre DOM identique à l'ordre visuel ;
10. preuve que la liste et son `scrollLeft` ne sont pas redimensionnés ;
11. revue humaine des octets finaux avant modification du runtime ;
12. work order recalculé depuis le `main` portant les oracles.

## Références

- [ADR-0072 — doctrine adaptative M3 et API de la cible](./0072-ui-adaptative-guidee-par-m3-et-apis-officielles.md)
- [ADR-0074 — filtres progressifs](./0074-filtres-progressifs-par-blocs-actifs.md)
- [Material 3 — canonical layouts](https://m3.material.io/foundations/layout/canonical-examples/overview)
- [Material 3 — dialogs](https://m3.material.io/components/dialogs/guidelines)
- [Material 3 — text fields](https://m3.material.io/components/text-fields/guidelines)
- [Android — canonical layouts](https://developer.android.com/develop/adaptive-apps/guides/canonical-layouts)
- [Android — supporting pane layouts](https://developer.android.com/develop/adaptive-apps/guides/build-a-supporting-pane-layout)
- [Angular Material — dialog](https://material.angular.dev/components/dialog/overview)
- [Angular CDK — accessibility](https://material.angular.dev/cdk/a11y/overview)
- [WAI-ARIA APG — modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [WCAG 2.2 — error identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification)
- [WCAG — reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow)
- [WCAG failure F85 — focus after error](https://www.w3.org/WAI/WCAG22/Techniques/failures/F85)
