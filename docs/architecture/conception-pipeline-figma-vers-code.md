# Conception — Pipeline Figma → Code, génération ex nihilo à action humaine minimisée

> ⚠️ **Portée révisée le 2026-08-13** : ce document a été rédigé la veille
> d'[ADR-0027](./../adr/0027-noyau-verbes-structurels-catalogue-ouvert-patterns.md)/[ADR-0028](./../adr/0028-execution-topology-compositions-memorisees.md)
> et parle encore, en plusieurs endroits (§1 tableau, §2.5, §3, §7), de « 4
> patterns » (`crud-entity`/`workflow-action`/`read-only-view`/`action-request`)
> comme si c'était une liste fermée à laquelle la couche 2 (détection de
> pattern) devrait faire correspondre une maquette. Ce n'est plus le modèle en
> vigueur : ces 4 noms sont désormais des **compositions mémorisées** d'un noyau
> ouvert de 5 verbes structurels (`Collection`/`Entity`/`Transition`/
> `Composite Read`/`Custom`, voir
> [`pattern-core.schema.json`](./patterns/pattern-core.schema.json)). La
> question posée par la couche 2 reste valide et le raisonnement ci-dessous
> (ambiguïté structurelle, échec de la détection automatique pure) n'est pas
> invalidé — mais la bonne cible d'une heuristique de détection devient « à
> quel(s) verbe(s) du noyau cette structure visuelle correspond-elle ? » plutôt
> que « lequel des 4 patterns nommés est-ce ? ». Une maquette qui ne ressemble à
> aucun des 4 patterns connus n'est plus un cas d'échec du pipeline — c'est une
> composition nouvelle et légitime du même noyau. Non retouché en profondeur ici
> (le fond de la conception ne change pas, seule la cible interne de la couche 2
> change) — à réviser au moment où ce pipeline entrera effectivement en
> implémentation (§7, critères non encore engagés).

- **Date :** 2026-08-12
- **Statut :** conception documentée, **non implémentée**. Ce document prépare
  une décision d'investissement futur ; il ne construit rien. L'implémentation
  ne sera engagée que lorsque chaque bloc ci-dessous aura été éprouvé isolément
  (cf. §7 — critères de passage).
- **Objectif reformulé par le porteur du projet (2026-08-12) :** ne pas se
  limiter à rendre le legacy conforme à un standard — concevoir **tout projet,
  quelle que soit la stack, quelle que soit la source** (legacy, maquette,
  description), en minimisant autant que possible l'action humaine, les
  données/règles métier restant fournies par un humain. Ce document répond à cet
  objectif pour le cas d'entrée **maquette Figma**, tout en restant flexible au
  changement.
- **Ce que ce document corrige par rapport à un malentendu antérieur dans cette
  conversation :** le POC React+TS n'a pas été correctement qualifié de «
  problème différent » de la conception ex nihilo — c'est faux. Sa vraie portée
  : l'Oracle et les patterns SEOS (isolation en couches vérifiée mécaniquement,
  contrats par rôle, contraintes H-3/H-4, boucle Generate-Verify-Repair) sont
  des **standards de conception indépendants de la source d'entrée**, pas des
  outils de traduction legacy. Le POC l'a prouvé en pratique : l'Oracle a
  détecté de vraies violations sur du code React généré sans qu'aucun legacy
  n'existe derrière. Ce document part de cette base acquise — il ne la reproduit
  pas, il change seulement ce qui alimente l'entrée du pipeline (Figma au lieu
  d'un fichier legacy).

---

## 1. Ce qui ne change pas (acquis, déjà validé, réutilisé tel quel)

| Composant déjà validé                                                                    | Preuve                                                                             | Rôle dans ce nouveau pipeline                                                                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Isolation en couches (`domain`/`data`/`application`/`ui`) vérifiée mécaniquement         | POC React+TS (`docs/architecture/...` — Oracle a bloqué un import React mal placé) | Cible de génération inchangée, quelle que soit la source                                                   |
| Patterns par rôle (`crud-entity`, `workflow-action`, `read-only-view`, `action-request`) | `docs/architecture/patterns/*.pattern.json`, 4/4 modules clôturés par famille      | Contrat de génération inchangé — la maquette ne remplace pas le pattern, elle aide à le sélectionner       |
| Oracle multi-niveaux (build → lint → test → intégration)                                 | `generation-from-patterns.md` §4, déjà opérationnel                                | Vérification finale inchangée, quelle que soit la source du code généré                                    |
| Contraintes machine (H-3 no-cross-module-duplication, H-4 no-family-regression)          | `patterns/README.md`                                                               | Garde-fou anti-duplication inchangé                                                                        |
| Registre de motifs à risque + punt check (arrêt sur absence de preuve)                   | `propositions-automatisation-seos.md`, testé dans `test-e2e-oracle-punt-check.md`  | Transposé ici à un nouveau type de motif : absence structurelle de logique métier dans l'input visuel (§3) |

**Conséquence directe :** ce document ne redéfinit aucune de ces briques. Il
ajoute une **nouvelle étape d'entrée** (extraction depuis Figma) en amont d'un
pipeline dont l'aval (génération + Oracle) est déjà acquis.

---

## 2. État de l'art vérifié (2026) — ce que l'industrie a déjà résolu, et ce qu'elle n'a délibérément pas résolu

Cette section évite deux erreurs symétriques : sous-estimer ce qui existe déjà
(réinventer un mauvais outillage) et sur-estimer sa maturité (croire qu'une
limite documentée par les inventeurs eux-mêmes va disparaître avec plus
d'ingénierie).

### 2.1 Figma Dev Mode MCP Server — ce qui est officiellement résolu

Figma a publié en 2025-2026 un serveur MCP (Model Context Protocol) officiel qui
expose les fichiers Figma comme contexte structuré pour agents de codage (Claude
Code, Cursor, Windsurf, Copilot). Trois outils documentés sont pertinents ici :

- `get_code` — génère du code depuis la sélection ou un node id donné,
  configurable par framework cible (React+Tailwind entre autres).
- `get_variable_defs` — extrait les tokens de design utilisés dans une sélection
  (couleurs, espacement, typographie), en desktop uniquement (nécessite le
  serveur MCP local dans l'app Figma desktop, pas disponible via le serveur
  distant `mcp.figma.com`).
- Accès à l'arbre de composants complet, aux contraintes de layout, aux styles
  de police — remplaçant, selon la documentation officielle, le "screenshot
  guesswork" par un contexte "machine-readable".

**Conséquence pour la conception :** l'extraction structurelle (couche 1, §3)
n'est pas à réinventer — elle s'appuie directement sur ce protocole déjà
standardisé par l'éditeur de l'outil source, pas sur une extraction ad hoc
(parsing d'image, OCR de maquette) qui serait plus fragile et moins mature.

### 2.2 Figma Code Connect — le maillon qui empêche l'invention de composants

Sans Code Connect, le MCP donne au modèle la structure visuelle et les tokens,
**mais aucun lien vers le code réel** — le modèle peut alors halluciner un
composant plausible plutôt que de réutiliser un composant existant. Avec Code
Connect, chaque composant de la bibliothèque Figma est explicitement mappé à son
chemin d'import réel et son schéma de props dans le code — le modèle génère
alors contre les composants réellement construits, pas contre des composants
inventés. Support multi-framework documenté : React/React Native, HTML
(Angular/Vue/Web Components), SwiftUI, Jetpack Compose — couvrant directement
les 4 stacks déjà explorées dans cette conversation (Angular existant, React+TS
testé, Kotlin/Swift en pause).

Le mapping de props n'est **pas automatique** : la documentation officielle
précise que design et code n'ont presque jamais des noms de props identiques —
une configuration manuelle du mapping est requise à la mise en place de la
bibliothèque, une fois, pas à chaque génération.

**Conséquence pour la conception :** Code Connect (ou son équivalent) est un
**pré-requis bloquant**, pas une optimisation. Sans lui, la couche 1 (§3)
produit une extraction qui semble complète mais qui invente silencieusement des
composants — reproduisant exactement le risque de "fausse confiance" déjà
identifié dans nos tests e2e sur le legacy (une génération qui a l'air correcte
sans preuve réelle derrière).

### 2.3 Architecture des design tokens à trois niveaux — déjà un standard formel W3C

Le W3C Design Tokens Community Group (DTCG) formalise depuis 2019 (et plus
récemment, le format module 2025.10 avec `$value`/`$type`/
`$description`/`$deprecated` et la syntaxe d'alias `{ref}`) une architecture à
trois couches, aujourd'hui adoptée par la quasi-totalité des systèmes de design
matures :

1. **Primitives** — valeurs brutes, sans signification (`blue-400`, `space-16`),
   contexte-agnostiques.
2. **Sémantiques** — alias qui donnent une intention
   (`color- background-interactive` référence `blue-400`) ; permet par exemple
   au mode sombre de simplement repointer l'alias sans toucher aux
   consommateurs.
3. **Composants** — spécifiques à un élément (`button-bg-primary` référence
   toujours un token sémantique, jamais un primitif directement).

Règle stricte documentée : **chaque couche ne référence que la couche
immédiatement inférieure — jamais de saut de couche.**

Airbnb (tokens JSON canoniques transformables en code natif ou CSS, composants
versionnés pour une adoption prévisible par les consommateurs) et Uber (design
system "Base" unifié) appliquent tous deux ce principe à l'échelle de leurs
produits.

**Conséquence pour la conception :** c'est **exactement** la même discipline de
couches qu'on applique déjà côté code (`domain`→`data`→`application`→`ui`,
chaque couche ne dépendant que de celle en-dessous). La couche 1 du pipeline
(§3) doit produire des références à des tokens sémantiques, jamais des valeurs
brutes recopiées depuis Figma — sinon un changement de couleur dans la maquette
casserait silencieusement le code généré au lieu de se propager par un seul
point de vérité.

### 2.4 La limite structurelle documentée par l'industrie elle-même — pas une hypothèse de notre part

Point capital, vérifié indépendamment de notre propre échantillonnage legacy :
la documentation et les analyses de praticiens confirment que lorsqu'une
maquette Figma est convertie en code, le contexte structuré capture la mise en
page, les styles, les références de composants — **mais jamais la logique
métier, les gestionnaires d'événements, la gestion d'état, ni les appels API.**
Une analyse indépendante confirme que "la logique métier complexe fait trébucher
l'IA" systématiquement.

Google Stitch (outil concurrent de génération UI depuis prompt/image, 2026)
documente lui-même ses propres limites structurelles : pas d'API runtime, sortie
non déterministe (le même prompt produit des résultats différents à chaque
exécution), **aucune gouvernance de marque ni contrat de token exécutable**,
sortie générique nécessitant un raffinement manuel par projet.

**Conséquence directe et non négociable pour la conception :** cette limite
n'est **pas 25 % des cas comme sur notre corpus legacy** — c'est
structurellement 100 % d'une catégorie entière d'information (logique métier,
état, intégration API) qui n'existe jamais dans l'input visuel, quel que soit
l'outil ou le modèle utilisé. Ce n'est pas une limite actuelle de la technologie
appelée à disparaître avec un modèle plus puissant — c'est une limite de nature
de l'input lui-même (une image ne contient pas de sémantique métier), documentée
par l'éditeur de l'outil source en personne. Concevoir en supposant le contraire
serait répéter, à l'identique, l'erreur du premier POC few-shot legacy (croire
qu'un volume suffisant de données ferait émerger une information absente de
l'input).

### 2.5 Détection automatique de pattern archétype depuis une structure visuelle — état de la recherche

Question distincte et plus dure : peut-on déduire _automatiquement_ quel
archétype (`crud-entity` vs `workflow-action` vs `read-only-view`) correspond à
une maquette, sans qu'un humain ne le précise ?

La recherche académique en détection de composants UI par apprentissage profond
est mature pour la détection de **composants élémentaires** (bouton, champ de
saisie, liste — des détecteurs comme YOLOv9 atteignent jusqu'à 95,5 % de
précision moyenne en transfert cross-domaine desktop→web) mais ne traite **pas**
la question de la sémantique métier d'un archétype. Un tableau avec filtres et
un bouton par ligne est détectable comme "tableau + filtres + bouton" par ces
techniques — mais rien ne distingue visuellement "ceci modifie une donnée"
(`crud- entity`) de "ceci fait transiter un état dans un workflow"
(`workflow- action`) : cette distinction est sémantique et métier, invisible
dans le pixel, exactement le type d'information que §2.4 exclut par
construction.

**Conséquence pour la conception :** la sélection de pattern archétype (couche
2, §3) ne peut être **qu'une suggestion assistée**, jamais une déduction
autonome fiable — confirmé à la fois par l'état de la recherche en détection UI
et par la limite structurelle de §2.4.

### 2.6 Précédent industriel sur la structure de garde-fou (rappel, déjà établi)

Le mécanisme de catégorisation par confiance + validations ordonnées + arrêt
sans forçage + revue humaine systématique (Google, _Migrating Code At Scale With
LLMs At Google_, arXiv:2504.09691 — déjà analysé et transposé dans
`propositions-automatisation-seos.md`) reste la référence externe validée pour
la couche 4 (§3) de ce nouveau pipeline. Rien de neuf à ajouter ici — le
mécanisme est identique, seule la nature de l'input en amont change.

---

## 3. Conception du pipeline en 4 couches

### Vue d'ensemble

```
┌──────────────────────────────────────────────────────────────┐
│ COUCHE 1 — Extraction structurelle (Figma MCP + Code Connect)│
│   Automatisable ~100% SI Code Connect configuré au prealable │
│   Sortie : arbre de composants + tokens semantiques + mapping│
└───────────────────────────┬────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ COUCHE 2 — Suggestion + confirmation de pattern archetype     │
│   Automatisable en SUGGESTION, jamais en decision autonome   │
│   Sortie : pattern confirme (crud-entity / workflow-action /  │
│   read-only-view / action-request) + sous-graphe             │
└───────────────────────────┬────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ COUCHE 3 — Spec metier courte (fournie par l'humain)          │
│   NON automatisable par construction (cf. §2.4)               │
│   Sortie : regles de validation, cas limites, contrats wire   │
└───────────────────────────┬────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ COUCHE 4 — Generation-Verify-Repair (deja acquis, §1)         │
│   Automatisable avec garde-fou (registre motifs + punt check) │
│   Sortie : code + tests + corpus JSONL annote                │
└──────────────────────────────────────────────────────────────┘
```

### 3.1 Couche 1 — Extraction structurelle

**Entrée :** fichier Figma, bibliothèque de composants Code Connect déjà
configurée (pré-requis, §2.2).

**Mécanisme :** appel `get_code` (framework cible paramétré) et
`get_variable_defs` (tokens) via le serveur MCP Figma, en mode desktop pour
l'accès complet aux variables. Le mapping Code Connect résout chaque composant
détecté vers son import réel et son schéma de props — pas d'invention de
composant.

**Exemple concret transposé à notre corpus :** une maquette montrant une liste
paginée avec 5 colonnes, un champ de recherche, un sélecteur de statut, et un
bouton d'action par ligne. La couche 1 produit une structure du type :

```json
{
    "layout": "paginated-list-with-filters",
    "components_resolved": [
        {
            "figma_node": "SearchInput",
            "code_component": "@cmz/shared-ui/SearchField",
            "props_mapped": { "placeholder": "text" }
        },
        {
            "figma_node": "StatusSelect",
            "code_component": "@cmz/shared-ui/StatusFilter",
            "props_mapped": { "options": "statusOptions" }
        },
        {
            "figma_node": "ActionButton",
            "code_component": "@cmz/shared-ui/RowAction",
            "props_mapped": {
                "label": "text",
                "onClick": "handler (non résolu — logique)"
            }
        }
    ],
    "tokens_used": [
        "color-background-interactive",
        "spacing-md",
        "font-size-body"
    ],
    "unresolved": [
        "onClick handler semantics",
        "filter query logic",
        "pagination source"
    ]
}
```

Le champ `unresolved` est **volontairement explicite** — c'est l'équivalent
direct du champ `risk_flag` proposé dans `propositions-automatisation-seos.md`
(Proposition 4), appliqué ici à la frontière design→code plutôt qu'à la
frontière legacy→Nx.

**Garde-fou obligatoire :** si un composant détecté ne peut être résolu via Code
Connect (bibliothèque non mappée, composant ad hoc dessiné dans la maquette sans
équivalent code), la couche 1 s'arrête sur ce composant précis et le remonte —
elle ne génère jamais un composant inventé, conformément à la limite documentée
en §2.2.

### 3.2 Couche 2 — Suggestion et confirmation de pattern

**Entrée :** structure résolue de la couche 1.

**Mécanisme :** un classificateur par similarité structurelle (pas un modèle de
langage à ce stade — une heuristique explicite, auditable) compare la structure
extraite aux `subgraphs` déjà déclarés dans les patterns existants. Exemple réel
tiré de `workflow-action.pattern.json` : le sous-graphe `list_volet` (liste
paginée par volet, répété pour `queues`/`tasks`/`all`) a une signature
structurelle précise — liste + filtres + action groupée par ligne.

**Table de décision proposée (heuristique, pas un LLM) :**

| Signal structurel détecté en couche 1                                                                                              | Pattern suggéré   | Confiance     |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------- |
| Liste + filtres + 1 bouton d'action unique par ligne, pas de notion de statut/workflow visible                                     | `crud-entity`     | Moyenne       |
| Liste + filtres + statut visible + bouton d'action qui change explicitement ce statut (ex. libellé "Prendre en charge", "Rejeter") | `workflow-action` | Moyenne-haute |
| Pas de liste, embed unique (graphique/carte), pas d'action utilisateur                                                             | `read-only-view`  | Haute         |
| Formulaire unique, pas de liste, un seul bouton de soumission                                                                      | `action-request`  | Haute         |

**Décision de conception, alignée sur §2.5 :** la confiance affichée ici n'est
**jamais** "haute" pour distinguer `crud-entity` de `workflow- action` — les
deux ont une signature structurelle quasi identique (confirmé par lecture
directe de nos propres patterns : la différence entre `approve.list` et un
simple CRUD n'est pas dans la disposition visuelle mais dans la sémantique du
bouton). Sur ce point précis, le système **doit** demander confirmation humaine
— une seule décision courte (choisir dans une liste de 4 options), pas une
session de conception.

**Exemple concret d'interaction minimale proposée :**

```
Maquette "gestion-signalements.fig", écran "Liste principale" :
  Structure détectée : liste paginée, 5 colonnes, filtres (recherche +
  statut + plage de dates), 1 bouton d'action par ligne libellé
  "Traiter".

  Suggestion : workflow-action (confiance moyenne-haute — le libellé
  "Traiter" suggère une transition d'état plutôt qu'une édition CRUD)

  Confirmer ce pattern, ou choisir : [crud-entity] [workflow-action ✓]
  [read-only-view] [action-request]
```

### 3.3 Couche 3 — Spec métier courte (irréductiblement humaine)

**Ce que la couche 1 ne peut structurellement jamais fournir (§2.4), donc ce que
l'humain doit fournir, sous la forme la plus courte possible :**

- Règles de validation par champ (reprenant le format déjà validé dans cette
  conversation : `users-create.validator.ts`, 5 champs requis, une ligne
  chacun).
- Cas limites explicites — notre propre échantillonnage a montré que ces cas
  limites (plage de dates ouverte, mapping section→champ) sont précisément ceux
  qu'aucune source (ni legacy, ni maquette) ne fournit automatiquement.
- Contrats d'intégration (quel endpoint API, quelle forme de réponse) —
  totalement absents de toute maquette par construction.

**Exemple concret de spec minimale attendue, dans le même style que ce qu'on a
déjà pratiqué :**

```yaml
screen: gestion-signalements/liste-principale
pattern_confirmed: workflow-action
entity: SignalementEntity
fields:
    - name: reference
      required: true
    - name: dateSignalement
      required: true
    - name: statut
      required: true
      enum: [NOUVEAU, EN_COURS, TRAITE, REJETE]
filter_rules:
    - field: dateFin
      rule:
          "si dateDebut fourni sans dateFin, considerer periode ouverte jusqu'a
          aujourd'hui"
      # <- exactement le type de regle que ni le legacy ni la maquette
      #    n'auraient fourni automatiquement (cf. resolveOpenEndedEndDate)
actions:
    - label: 'Traiter'
      transition: NOUVEAU -> EN_COURS
      endpoint: 'PATCH /signalements/{id}/traiter'
```

**Volume attendu :** de l'ordre de 15 à 30 lignes par écran — comparable au
volume déjà nécessaire pour `users-create.validator.ts` (5 lignes de règles) une
fois qu'on ajoute les transitions de statut et les contrats d'API. C'est la
minimisation réelle visée : pas zéro ligne humaine, mais un ordre de grandeur
inférieur à écrire tout le code à la main.

### 3.4 Couche 4 — Generate-Verify-Repair (acquis, transposé sans changement)

Identique au pipeline Phase 08 déjà écrit (`generation-from-patterns.md` §3-4)
et aux propositions déjà documentées (`propositions-automatisation-seos.md`). Le
registre de motifs à risque (Proposition 1) est étendu avec un nouveau motif :

```json
{
    "id": "R-3-figma-unresolved-component",
    "trigger": "extraction couche 1 contient un champ 'unresolved' non vide",
    "action": "arret avant generation - remonter a l'humain le composant ou la logique manquante",
    "rationale": "meme principe que R-1/R-2, transpose a la frontiere design->code : ne jamais generer sur la base d'une supposition quand l'input structurel ne contient pas l'information"
}
```

Le "punt check" (citation obligatoire d'une preuve avant génération, déjà testé
et validé dans `test-e2e-oracle-punt-check.md`) s'applique ici de façon **plus
stricte** qu'en migration legacy : la preuve exigée doit venir de la couche 3
(spec humaine) puisque la couche 1 (maquette) ne peut structurellement jamais la
fournir (§2.4). Il n'y a pas d'équivalent ici au contre-exemple
`report-states.approve` (où la preuve se trouvait parfois cachée dans le legacy
lui-même) — avec Figma comme source, l'absence de logique métier dans l'input
est absolue, pas statistique.

---

## 4. Flexibilité au changement — pourquoi l'architecture en couches le permet

Exigence explicite du porteur du projet : rester flexible au changement. La
réponse tient directement à la discipline de couches appliquée au pipeline
lui-même, pas seulement au code généré :

- Un changement de couleur, d'espacement ou de disposition dans la maquette
  Figma **ne re-déclenche que la couche 1** (extraction), à condition que la
  couche 1 référence des tokens sémantiques et non des valeurs brutes (cf. §2.3
  — la même discipline "jamais de saut de couche" que W3C DTCG impose côté
  design).
- Un changement de pattern (l'équipe produit décide qu'un écran CRUD doit
  devenir un workflow) re-déclenche la couche 2 et 4, mais pas la couche 3 si
  les règles métier restent valides.
- Un changement de règle métier (nouvelle validation, nouveau cas limite) ne
  touche que la couche 3 et re-déclenche la couche 4 — aucun impact sur les
  couches 1/2.

C'est la transposition directe, au niveau du **pipeline de génération**, du même
principe d'isolation déjà appliqué au **code généré** (domain ignore data, qui
ignore application, qui ignore ui).

---

## 5. Ce que cette conception ne prétend pas résoudre (limites honnêtes, non négociables)

- **La couche 3 ne disparaîtra jamais** avec un meilleur modèle ou plus de
  données d'entraînement — la limite de §2.4 est structurelle (absence
  d'information dans l'input), pas une limite de capacité actuelle des modèles.
  C'est la même nature de conclusion que `poc-few-shot-legacy-nx.md` avait déjà
  établie pour le legacy, mais ici sans même le contre-exemple partiel qu'on
  avait trouvé (`report-states.approve`) — Figma ne contient jamais de logique
  métier, à aucun degré.
- **La couche 2 reste une suggestion, jamais une automatisation complète** —
  confirmé par l'état de la recherche en détection UI (mature sur les composants
  élémentaires, muette sur la sémantique métier des archétypes).
- **Aucune mesure empirique n'existe encore sur ce pipeline** — contrairement au
  pipeline legacy→Nx où on dispose désormais d'un échantillonnage (37/37/25) et
  d'un test e2e réel (2 cas). Ce document est une conception, pas une preuve —
  voir §7 pour les critères qui transformeraient ceci en système éprouvé.
- **Le pré-requis Code Connect a un coût d'installation non nul** —
  configuration manuelle du mapping props à la mise en place de la bibliothèque
  de composants (§2.2). Ce n'est pas gratuit, seulement fait une fois plutôt
  qu'à chaque génération.

---

## 6. Rapprochement avec les décisions déjà actées dans cette conversation

| Décision déjà actée                                             | Application dans ce pipeline                                                                                               |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Option C (génération autonome sans pattern imposé) écartée      | Couche 2 = suggestion + confirmation obligatoire, jamais une décision autonome — cohérent avec l'élimination de l'option C |
| Option B (LLM + Oracle en boucle G-V-R) retenue, avec garde-fou | Couche 4 reprend exactement ce mécanisme, motif R-3 ajouté au registre                                                     |
| Revue humaine systématique (norme Google/Meta)                  | Couche 3 = irréductiblement humaine par construction, pas par choix de prudence                                            |
| Isolation en couches vérifiée mécaniquement                     | Appliquée ici au pipeline de génération lui-même (§4), pas seulement au code produit                                       |

---

## 7. Critères de passage à l'implémentation (prochaine étape, non engagée ici)

Avant de brancher quoi que ce soit en un pipeline exécutable, chaque bloc doit
être éprouvé isolément, dans cet ordre, avec un test réel (pas théorique) à
chaque étape — même méthode que celle qui a produit
`test-e2e-oracle-punt-check.md` :

1. **Couche 1 seule :** obtenir un accès réel au MCP Figma (nécessite une
   maquette réelle du porteur du projet + Figma desktop pour
   `get_variable_defs`) et vérifier, sur un seul écran connu, que l'extraction
   ne invente aucun composant absent de Code Connect.
2. **Couche 2 seule :** tester la table de décision heuristique (§3.2) sur les 4
   patterns déjà validés dans notre corpus (`crud-entity`, `workflow-action`,
   `read-only-view`, `action-request`), en redessinant leurs structures
   existantes plutôt qu'en générant du neuf — vérifier que la confiance
   rapportée reflète bien l'ambiguïté réelle (crud vs workflow) et pas une
   fausse certitude.
3. **Couche 3 :** valider le format de spec courte (§3.3) sur un cas réel avec
   le porteur du projet, mesurer le temps réellement passé à la rédiger comparé
   au temps d'écriture manuelle du code équivalent.
4. **Couche 4 :** déjà partiellement éprouvée (`test-e2e-oracle-punt- check.md`)
   — étendre le motif R-3 et re-tester.

**Ce document s'arrête ici, comme demandé** : la conception est posée,
détaillée, sourcée. Le branchement effectif du pipeline Figma→code n'est engagé
qu'une fois ces 4 étapes individuellement éprouvées et validées par le porteur
du projet — pas avant.

---

## Références

### Internes (déjà commitées dans ce dépôt)

- [`strategie-cross-stack-revue.md`](./strategie-cross-stack-revue.md) —
  antérieur à ce document (2026-08-02), non consulté avant sa première version :
  instruit la même discipline (« partager la spécification, jamais
  l'implémentation », IDL-first, layering test) au niveau du **code kernel
  existant** plutôt que du **pipeline de génération** traité ici. Le Chantier Q
  (découplage DI) qu'il propose est le préalable naturel à toute génération
  multi-stack réelle depuis ce dépôt — cf. `taches-restantes.md` ROAD-3a.
- [`propositions-automatisation-seos.md`](./propositions-automatisation-seos.md)
  — mécanisme de garde-fou repris ici (§3.4, motif R-3 ajouté)
- [`test-e2e-oracle-punt-check.md`](./test-e2e-oracle-punt-check.md) —
  validation empirique du punt check, méthode reprise pour §7
- [`echantillonnage-regles-non-deductibles.md`](./echantillonnage-regles-non-deductibles.md)
  — origine du chiffre 37/37/25, contrasté avec le 100% structurel de §2.4
- [`poc-few-shot-legacy-nx.md`](./poc-few-shot-legacy-nx.md) — première preuve
  du risque de mémorisation, réutilisée en §5
- [`generation-from-patterns.md`](./generation-from-patterns.md) — pipeline
  Phase 08, couche 4 reprise sans changement
- [`patterns/workflow-action.pattern.json`](./patterns/workflow-action.pattern.json)
  — source réelle de la table de décision §3.2

### Externes (vérifiées par recherche web, 2026-08-12)

- Figma, _Introducing our Dev Mode MCP server_ (Figma Blog) — annonce officielle
  du serveur MCP.
- Figma Developer Docs, _Tools and prompts_
  (`developers.figma.com/docs/figma-mcp-server/tools-and-prompts`) —
  spécification des outils `get_code`/`get_variable_defs`.
- Figma Help Center, _Code Connect_
  (`help.figma.com/hc/en-us/articles/23920389749655`) — mécanisme de mapping
  composant↔code, multi-framework.
- W3C Design Tokens Community Group — spécification DTCG Format Module 2025.10,
  architecture à trois niveaux (primitive/sémantique/composant).
- Google, _Migrating Code At Scale With LLMs At Google_, arXiv:2504.09691 (2025)
  — mécanisme de garde-fou déjà transposé (§2.6).
- Recherche académique en détection UI par apprentissage profond
  (YOLOv9/YOLOv8/Faster R-CNN sur jeux de données GENGUI/UICVD/VINS) — état de
  l'art en détection de composants élémentaires, absence de traitement de la
  sémantique d'archétype métier (§2.5).
- Google Stitch — limites documentées par l'éditeur lui-même (non-déterminisme,
  absence de gouvernance de tokens exécutable) confirmant la nature structurelle
  de la limite §2.4, pas une limite propre à notre analyse.
