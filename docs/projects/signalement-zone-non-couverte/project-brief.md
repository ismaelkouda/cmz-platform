# Brief — Signalement de zone non couverte

- **Statut :** découverte produit, informations métier à collecter
- **Nature :** première application réelle de `cmz-platform`
- **Autorité métier :** propriétaire du produit, auteur des données disponibles
- **Décision source :**
  [ADR-0094](../../adr/0094-cap-produit-interne-remplacement-progressif-et-cibles-web.md)

## Faits confirmés

- Le produit porte sur le **signalement de zone non couverte**.
- Il constitue la première application métier réelle construite avec la chaîne,
  et non une fixture ou une preuve de plateforme.
- Le propriétaire dispose des données nécessaires et peut lever rapidement les
  inconnues.
- Le produit doit être construit progressivement et pourra être publié en ligne
  lorsque son exploitation sera prête.
- Angular et React sont des cibles produit possibles ; aucune cible n'est choisie
  par ce brief tant que les contraintes de la première expérience ne sont pas
  décrites.

## Interdictions

- ne pas copier la carte, les permissions ou les règles du backoffice SEOS ;
- ne pas inventer d'acteur, endpoint, champ, statut, rôle ou règle de couverture ;
- ne pas choisir une stack à la place du besoin ;
- ne pas créer toutes les pages avant validation du premier parcours ;
- ne pas appeler une API réelle ni versionner un secret pendant la découverte.

## Informations à obtenir du propriétaire

Poser une à trois questions courtes à la fois et enregistrer les réponses dans
les sections correspondantes :

1. **Problème :** quelle difficulté concrète le produit résout-il, pour qui et
   avec quel résultat mesurable ?
2. **Acteurs :** qui crée un signalement, qui le consulte, qui le traite et qui
   l'administre ? Quel accès est public, authentifié ou autorisé ?
3. **Premier parcours :** quelle est la plus petite tranche utilisable de bout
   en bout ?
4. **Données :** champs, types, valeurs, pièces jointes, géolocalisation,
   consentement, durée de conservation et données personnelles.
5. **Cycle de vie :** états et transitions d'un signalement, actions permises,
   erreurs et cas limites.
6. **Backend :** sources disponibles, URLs par environnement, authentification,
   opérations, exemples de succès/erreur et autorité du contrat.
7. **Présentation :** références visuelles, contenus, langues, classes d'espace
   et exigences d'accessibilité.
8. **Exploitation :** audience du premier déploiement, hébergement,
   observabilité, support, rollback et critères de succès.

## Décisions à remplir après entretien

### Objectif produit

Inconnu — à confirmer avec le propriétaire.

### Utilisateurs et accès

Inconnu — à confirmer avec le propriétaire.

### Résultat principal

Inconnu — à confirmer avec le propriétaire.

### Premier parcours vertical

Inconnu — à confirmer avec le propriétaire.

### Critères d'acceptation

Inconnus — à confirmer avec le propriétaire.

### Sources et contrats backend

Inconnus — collecter les sources avant de compiler un contrat.

### Cible de la première expérience

Non décidée — comparer le besoin aux profils `angular-pwa` et `react-spa` sans
introduire une bibliothèque supplémentaire par défaut.

## Condition de sortie de la découverte

Le brief passe à `validated` seulement lorsque le problème, l'acteur principal,
le résultat, le premier parcours, les critères d'acceptation, la nature d'accès
et l'autorité des données/backend sont explicites et relus par le propriétaire.
Ensuite seulement, créer `page-map.md` et les sources de contrats canoniques.
