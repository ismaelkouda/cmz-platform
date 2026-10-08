# ADR-0094 — Cap produit interne, remplacement progressif et cibles web

- **Statut :** Accepted
- **Date :** 2026-10-08
- **Décideur produit :** auteur et mainteneur de `cmz-platform`
- **Supersède pour le cap produit :**
  [ADR-0029](./0029-perimetre-capacites-plateforme-generation.md)
- **Résout pour la phase courante :**
  [ADR-0038](./0038-nature-produit-public-multi-locataire.md)

## Contexte

Le dépôt a successivement servi à reconstruire le backoffice SEOS, éprouver des
compositions génériques, puis qualifier une chaîne de construction
d'applications Angular et React. La documentation a conservé ces trois étapes
comme si elles étaient simultanément le produit courant. Un nouvel agent pouvait
donc conclure, selon le fichier lu, que le produit était un compilateur de
recherche, une migration Angular, un SaaS public, ou une collection de preuves.

Le propriétaire du produit a clarifié le 2026-10-08 les décisions qui manquaient :

1. construire d'abord **nos propres applications en interne**, avec une
   expérience de travail meilleure que les précédents observés tels que
   Lovable, Bolt, v0 ou Replit ;
2. permettre ensuite une **publication en ligne contrôlée** lorsque le produit
   et l'exploitation sont prêts, sans confondre cette possibilité avec un SaaS
   public multi-locataire déjà livré ;
3. faire remplacer progressivement le legacy en production par les nouvelles
   applications, fonctionnalité par fonctionnalité ;
4. utiliser comme première application métier réelle le produit de
   **signalement de zone non couverte** ; son auteur possède les données et peut
   répondre aux inconnues au lieu que le générateur les invente ;
5. traiter React comme une **cible produit**, pas seulement comme un test
   contradictoire du core.

## Décision

### 1. Produit construit par ce dépôt

`cmz-platform` construit un **atelier interne, assisté par IA et gouverné par
des contrats**, qui transforme un besoin métier validé en application standard,
lisible, testée, modifiable et publiable.

L'humain reste l'autorité sur le besoin, les règles métier, les permissions, les
contrats d'intégration et l'acceptation visuelle. Le LLM propose et réalise dans
un périmètre borné. Les outils déterministes compilent, publient et vérifient.
La conversation n'est jamais la source de vérité : les artefacts versionnés le
sont.

Le premier client de l'atelier est l'équipe interne. Un produit public
multi-locataire pourra être décidé plus tard, avec sa propre architecture
d'exploitation, de sécurité, de modération et de facturation. Il n'est ni
promis ni nécessaire pour livrer les premières applications.

### 2. Relation au legacy et à SEOS

Le legacy est une **source temporaire d'observations et de tests de
non-régression**, pas la finalité du dépôt et pas une autorité universelle de
conception.

La nouvelle application remplace le legacy progressivement en production. Une
fonctionnalité n'est retirée du legacy qu'après transfert explicite de ses
contrats, comportements utiles, données, autorisations et preuves vers la
nouvelle application. Les défauts, dépendances et choix historiques ne sont pas
reproduits par défaut.

Le corpus SEOS et ses jobs CI peuvent être archivés après la clôture humaine de
l'issue #64 et un changement séparé prouvant que les preuves encore utiles ont
été transférées. Leur volume n'est pas une mesure de valeur produit.

### 3. Cibles Angular et React

Angular et React sont deux cibles web produit. Elles partagent les contrats, la
sémantique, les scénarios métier et les exigences de preuve ; elles ne partagent
pas artificiellement leur runtime de présentation.

- Angular privilégie les API Angular officielles, Angular Material/CDK/Aria et
  `@angular/localize` lorsqu'elles répondent au besoin.
- React privilégie React, React DOM, React Router, les hooks et primitives web
  natives. Toute bibliothèque additionnelle doit répondre à un problème réel,
  être qualifiée et rester propre au profil React.
- Une application générée est mono-stack. La plateforme peut produire les deux
  cibles, mais ne mélange pas leurs composants dans une même sortie.

### 4. Première application réelle

Le prochain produit réel est le **signalement de zone non couverte**. Le travail
commence par un brief et des contrats backend issus des données fournies par le
propriétaire. Une fixture SEOS, un exemple de preuve ou une analogie ne remplace
jamais ces données.

Le produit est livré par tranches verticales utilisables, page par page. Chaque
tranche possède un résultat utilisateur, des critères d'acceptation, une preuve
navigateur, des contrats d'intégration et une stratégie de déploiement ou de
retour arrière proportionnée au risque.

### 5. Place de `workflow-action`

`workflow-action` reste un **modèle d'orchestration spécialisé**, séparé du plan
de page courant. Il ne devient pas un troisième type de nœud ajouté par défaut à
chaque page.

Le plan de page compose aujourd'hui des lectures `list-query` et des mutations
`action-request` indépendantes. Un workflow ne sera relié à une page qu'après un
cas produit réel exigeant des transitions ordonnées, durables ou asynchrones,
avec un contrat de liaison explicite et des oracles propres. Cette décision évite
de généraliser une topologie historique avant d'en avoir le besoin.

### 6. Clôture de l'issue #64

Le code C5 fournit déjà l'essentiel de la preuve demandée. Ce qui manque est une
**promotion gouvernée**, pas une nouvelle réécriture :

1. relier chaque critère de #64 à une preuve versionnée et exécutée ;
2. faire relire humainement l'équivalence observable et les limites de C5 ;
3. enregistrer les compositions v2 sans requalifier silencieusement les entrées
   v1 gelées ; la maturité doit être portée par cible ;
4. mettre à jour l'issue, la matrice de capacités et la feuille de route dans la
   même PR ;
5. obtenir une CI complète verte depuis un clone propre et une approbation
   indépendante ;
6. fermer #64 seulement après cette revue.

La parité React est un objectif produit et possède ses propres preuves. Elle ne
doit pas être présentée rétroactivement comme critère de #64 si l'issue ne
l'exige pas ; inversement, une promotion « Angular + React » exige les preuves
des deux cibles.

Le retrait du corpus SEOS est une opération ultérieure, distincte et
réversible, avec inventaire des derniers consommateurs.

## Principes de décision permanents

- **Valeur produit avant plateforme supplémentaire.** Une abstraction, une
  dépendance ou un agent n'est ajouté que pour un problème observé.
- **Natif et officiel avant custom.** Le custom reste possible lorsqu'une API
  officielle ne couvre pas le besoin, après comparaison documentée.
- **Échec fermé.** Une donnée, capacité ou permission inconnue est refusée ou
  rendue visible ; elle n'est jamais inventée.
- **Code ordinaire après génération.** Une sortie reste compréhensible,
  débogable et modifiable sans connaître l'implémentation du générateur.
- **Preuve proportionnée au claim.** Compiler ne prouve pas le comportement ;
  une capture ne prouve pas l'accessibilité ; une fixture ne prouve pas une
  intégration réelle.
- **Pas de dénominateur commun artificiel.** Les contrats peuvent être partagés,
  les implémentations Angular et React restent idiomatiques.
- **Réparation de cause racine.** Un échec récurrent est diagnostiqué et rendu
  impossible ou observable ; on ne force ni la CI, ni Git, ni une gate.

## Conséquences

- L'ADR-0029 reste une trace historique utile de la réorientation vers une
  plateforme bornée, mais n'est plus l'autorité sur la finalité produit.
- L'ADR-0038 ne bloque plus le travail : la phase actuelle est interne ; la
  publication contrôlée d'une application ne vaut pas ouverture d'un SaaS
  multi-locataire.
- Le backoffice reconstruit est un produit de remplacement progressif et un
  terrain de migration, pas le « golden reference » universel.
- La première application réelle devient le chemin critique après la clôture de
  la preuve de composition.
- Les documents d'entrée doivent pointer vers cet ADR et distinguer état vivant,
  décisions, preuves et archives.

## Références

- [Contexte maître pour agents](../../LLM_CONTEXT.md)
- [Guide de construction d'application](../../LLM_APP_BUILDER.md)
- [Feuille de route courante](../architecture/feuille-de-route.md)
- [Matrice de capacités](../architecture/generation-platform-capability-matrix.md)
- [ADR-0039 — frontière conception/réalisation LLM](./0039-frontiere-contractuelle-conception-realisation-llm.md)
- [ADR-0058 — plan de page et primitives v2](./0058-page-execution-plan-reference-les-primitives-v2.md)
- [ADR-0080 — prouver la valeur avant automatisation](./0080-prouver-la-valeur-avant-nouvelle-automatisation.md)
- [Issue #64 — preuve des compositions sur un périmètre réel](https://github.com/ismaelkouda/cmz-platform/issues/64)
