# Vision produit — Workbench contractuel assisté par IA

- **Date :** 2026-09-23
- **Statut :** direction stratégique, non implémentée et non engagée
- **Objet :** conserver une vision produit commune sans la confondre avec les
  capacités déjà prouvées

## Résumé simple

Le socle construit dans ce dépôt peut devenir l'équivalent d'un atelier de
développement assisté : une personne décrit une application ou une évolution,
l'IA prépare une proposition structurée, le moteur la vérifie et génère des
artefacts standards, puis un humain examine le résultat avant publication.

La conversation facilite le travail, mais **elle n'est jamais la source de
vérité**. Les contrats versionnés, les décisions explicites, les plans, les
preuves et les artefacts produits restent la source de vérité. L'IA propose ;
les validateurs déterministes, les oracles et la revue humaine autorisent.

Cette direction ne signifie pas « générer n'importe quelle application depuis
une phrase ». Le positionnement crédible est d'abord un **factory contractuel
pour applications métier orientées données** : écrans de consultation,
formulaires, actions, workflows bornés et compositions de ces primitives.

## Valeur pour ses utilisateurs

### Pour un développeur

- démarrer une fonctionnalité depuis un contrat vérifié plutôt qu'une page
  blanche ;
- réutiliser les mêmes règles d'architecture, de sécurité et de test ;
- obtenir un diff lisible, du code standard et des diagnostics actionnables ;
- préparer une migration sans modifier silencieusement le code existant ;
- rejouer une génération et expliquer précisément d'où vient chaque décision.

### Pour une personne moins technique

- exprimer le résultat attendu avec des mots ordinaires ;
- répondre aux ambiguïtés importantes dans un formulaire ou une conversation ;
- voir un plan, un aperçu et les conséquences avant toute application ;
- demander une correction sans devoir connaître la structure du dépôt.

### Pour une équipe

- conserver une mémoire versionnée des demandes et décisions ;
- imposer la même barre de qualité quel que soit le modèle d'IA utilisé ;
- séparer les rôles de demande, proposition, approbation et publication ;
- auditer et reproduire une livraison après incident.

## Expérience produit cible

L'interface peut reprendre les qualités utiles des environnements ChatGPT,
Claude ou Lovable sans reprendre leur principal risque : laisser une
conversation piloter directement des écritures arbitraires.

Elle comporte quatre espaces reliés :

1. **Conception** — conversation, questions de clarification, hypothèses et plan
   proposé ;
2. **Artefacts** — définitions, contrats backend, mappings, décisions et
   versions ;
3. **Vérification** — aperçu isolé, tests, diagnostics, écarts et preuves ;
4. **Livraison** — diff, approbation, application transactionnelle, historique
   et publication.

Une référence visuelle ne transite pas comme une instruction libre. Figma, une
capture, un wireframe ou un futur outil est d'abord figé dans une preuve de
présentation générique, locale et adressée par contenu. La conversation peut
expliquer ou annoter cette preuve ; elle ne peut ni modifier son autorité
`presentation-only`, ni en déduire une permission ou un comportement métier.

Le parcours nominal est :

```text
demande en langage naturel
  → interprétations candidates et inconnues explicites
  → définition structurée proposée
  → validation déterministe
  → plan et diff relisibles
  → approbation humaine
  → génération existante
  → tests et aperçu isolé
  → publication contrôlée
```

## Objets et états à rendre visibles

L'interface ne doit pas inventer une deuxième architecture. Elle projette les
contrats du moteur sous des objets compréhensibles :

- `workspace` et `project` : périmètre de travail et dépôt ;
- `request` : demande originale, auteur et contexte ;
- `design` : définition structurée et inconnues ;
- `plan` : opérations prévues et surfaces touchées ;
- `run` : exécution reproductible d'un plan ;
- `artifact` : contrat, code, preuve ou diagnostic versionné ;
- `presentation evidence` : snapshots visuels, tokens, composants et
  annotations approuvés pour une page exacte ;
- `review` : décision humaine traçable ;
- `release` : révision effectivement publiée.

Les états restent explicites et monotones :
`draft → proposed → validated → approved → generated → tested → published`. Un
échec n'efface ni le dernier état valide ni les preuves qui expliquent l'arrêt.

## Rôle exact de l'IA

L'IA peut :

- transformer une demande en **proposition** de définition ;
- proposer des mappings accompagnés de leur source, confiance et inconnues ;
- expliquer un diagnostic déterministe selon le public visé ;
- préparer une opération de migration minimale et typée ;
- résumer un plan ou un diff avant revue.

L'IA ne peut pas :

- inventer un endpoint, une permission ou un champ absent des contrats ;
- écrire directement et librement dans `apps/` ou `libs/` ;
- approuver sa propre proposition ;
- contourner un schéma, un oracle, une politique ou une revue obligatoire ;
- publier sur `main` ou en production avec une autorisation implicite.

Les outils exposés aux modèles sont typés et bornés. Les niveaux d'autorité sont
séparés : **lire**, **proposer**, **préparer**, **appliquer**, **publier**. Le
mode par défaut est la lecture ou la proposition. Chaque élévation est
explicite, journalisée et attribuable.

### JEV et les jugements étroits

JEV peut compléter ce modèle comme évaluateur probabiliste optionnel, jamais
comme générateur, observateur d'images, oracle, autorité de permission ou
approbateur. Le besoin le plus crédible à étudier est le résidu visuel que les
oracles ne savent pas entièrement déterminer lorsqu'un LLM traduit Figma, une
capture ou un wireframe : hiérarchie, intention responsive et gravité d'un
écart.

JEV ne reçoit officiellement que du texte ou du JSON. Un observateur multimodal
ou humain doit donc d'abord comparer les images et produire des constats
localisés. JEV pourrait ensuite arbitrer quelques questions fermées sur ce
dossier, uniquement si son apport par rapport au juge multimodal direct est
mesuré.

Une seconde piste indépendante peut évaluer la réalisation elle-même : choix
des primitives natives/officielles, dépendances, outils employés et risques
contextuels KISS, DRY, YAGNI ou SOLID. Elle reçoit un diff borné, les règles
officielles applicables aux versions épinglées, les gates et un journal factuel
des outils ; elle ne reçoit ni chaîne de pensée ni documentation web mutable.
Chaque principe est d'abord déclaré applicable ou non et aucun score composite
ne mélange qualité visuelle et qualité du code.

La phase éventuelle reste provider-neutral, replay/shadow et sans effet sur la
fusion. Le chemin déterministe et humain demeure fonctionnel quand le modèle
est absent, invalide ou incertain. Détails et conditions d'abandon :
[analyse de qualité d'une interface générée](./evaluation-qualite-interface-generee-jev-ci-2026-10-03.md),
[ADR-0079](../adr/0079-jev-evaluateur-probabiliste-replay-shadow.md) et
[ADR-0080](../adr/0080-prouver-la-valeur-avant-nouvelle-automatisation.md).

## Architecture cible sans dépendance à un fournisseur

Le moteur actuel reste sous `tools/generator-platform/` et demeure déterministe.
Une future interface, par exemple `apps/workbench-angular`, ne fait que piloter
ses ports publics. Le fournisseur de modèle se trouve derrière un adaptateur
remplaçable ; aucun contrat métier ne dépend de son format natif.

Quatre plans sont séparés :

- **control plane** : projets, demandes, autorisations, runs et approbations ;
- **artifact plane** : contrats et preuves immuables, adressés par contenu ;
- **execution plane** : génération et aperçu dans des candidats isolés ;
- **model plane** : appels IA, prompts versionnés, sorties structurées et coûts.

Une exécution conserve au minimum le modèle et sa version, le prompt versionné,
les entrées hashées, les outils autorisés, les sorties structurées, les
validations, la latence et le coût. Les données sensibles sont masquées avant
journalisation.

## Barre de qualité nécessaire

Avant de permettre l'application automatique d'une proposition, il faut :

- une suite d'évaluations versionnée sur ambiguïtés, mappings, migrations et
  refus attendus ;
- des sorties structurées validées, jamais du code libre comme protocole ;
- un mode replay sans nouvel appel au modèle ;
- des budgets mesurés de coût, latence et taille de contexte ;
- une isolation réelle de l'aperçu et des commandes ;
- des diagnostics corrélés du besoin initial jusqu'au fichier produit ;
- des permissions minimales, une approbation distincte et un audit durable.

Avant même d'ajouter un modèle, un service ou un gate à cette chaîne, son gain
marginal doit être démontré face aux capacités existantes. Sécurité technique,
faisabilité et approbation ne remplacent pas le problème observé, la baseline,
le coût total et la condition d'abandon exigés par
[ADR-0080](../adr/0080-prouver-la-valeur-avant-nouvelle-automatisation.md).

La qualité d'une suggestion IA se mesure par son taux d'acceptation sans
correction, ses faux positifs/faux négatifs et les défauts trouvés après revue,
pas par son apparence convaincante.

## Séquencement recommandé

Cette vision ne doit pas interrompre PLAT-9. Le moteur doit prouver sa première
composition N×N avant que l'interface prétende piloter une capacité générale.

1. terminer `action-request` v2 : compilateur neutre, hosts/oracles Angular et
   React, publication durable ;
2. compiler et publier `page-execution-plan`, puis prouver un vertical slice N
   `list-query` + N `action-request` ;
3. construire un cockpit **en lecture seule** qui affiche contrats, plans,
   preuves et diagnostics réels ;
4. ajouter la proposition assistée de définition, toujours sans écriture ;
5. ajouter aperçu isolé, diff et approbation ;
6. seulement après évaluations et audit de sécurité, autoriser l'application
   transactionnelle puis une publication contrôlée.

Chaque étape doit résoudre un usage réel, posséder des critères de sortie et
rester utilisable sans IA quand le modèle est indisponible.

## Non-objectifs à court terme

- un produit public multi-locataire ;
- un générateur universel couvrant tout type de logiciel ;
- un système multi-agents autonome ;
- un magasin de plugins non gouverné ;
- une base vectorielle ajoutée sans besoin mesuré ;
- des modifications directes de `main` ou une publication sans revue ;
- une nouvelle DSL qui duplique les contrats existants.

## Relations avec les décisions existantes

- [ADR-0037](../adr/0037-plateforme-intention-utilisateur-vers-application.md)
  gouverne la transformation future du langage naturel en définition candidate.
- [ADR-0039](../adr/0039-frontiere-contractuelle-conception-realisation-llm.md)
  fixe la frontière de confiance entre conception, LLM et réalisation.
- [ADR-0066](../adr/0066-preuve-presentation-bornee-pour-realisation-llm.md)
  borne la preuve visuelle et son autorité de présentation.
- [ADR-0079](../adr/0079-jev-evaluateur-probabiliste-replay-shadow.md)
  borne l'évaluation JEV à un POC provider-neutral en replay/shadow avant toute
  décision d'adoption.
- [ADR-0080](../adr/0080-prouver-la-valeur-avant-nouvelle-automatisation.md)
  exige une preuve de valeur avant tout POC, service, dépendance ou gate
  supplémentaire, y compris ceux déjà conçus de manière sûre.
- [ADR-0033](../adr/0033-propriete-artefacts-regeneration-non-destructive.md) et
  [ADR-0035](../adr/0035-contrat-durabilite-publication-generation.md)
  gouvernent la propriété et la publication des artefacts.
- [Audit de maintenabilité](./audit-maintenable-automatisation-2026-09-16.md)
  impose que l'automatisation reste compréhensible, standard et réparable.
- [ADR-0094](../adr/0094-cap-produit-interne-remplacement-progressif-et-cibles-web.md)
  fixe le cap produit courant ; la [feuille de route](./feuille-de-route.md)
  gouverne l'ordre de réalisation. `taches-restantes.md` reste un registre
  historique de traçabilité, pas une autorité de priorité.
