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
- [ADR-0033](../adr/0033-propriete-artefacts-regeneration-non-destructive.md) et
  [ADR-0035](../adr/0035-contrat-durabilite-publication-generation.md)
  gouvernent la propriété et la publication des artefacts.
- [Audit de maintenabilité](./audit-maintenable-automatisation-2026-09-16.md)
  impose que l'automatisation reste compréhensible, standard et réparable.
- [Tâches restantes](./taches-restantes.md) demeure l'autorité sur l'ordre de
  réalisation et le niveau de preuve effectivement atteint.
