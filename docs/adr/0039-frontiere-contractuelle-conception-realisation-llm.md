# ADR-0039 — Frontière contractuelle entre conception et réalisation par LLM

- **Statut :** Accepted
- **Date :** 2026-09-03

## Contexte

La plateforme sait déjà compiler des preuves et des spécifications vers une IR
canonique puis vers des cibles déclarées. ADR-0029 borne ses capacités, ADR-0030
sépare l'IR des profils de rendu et ADR-0031 impose un graphe et des manifests
vérifiables.

Ces décisions ne définissent toutefois pas la frontière entre trois activités
nouvellement reliées :

1. décrire le backend réellement disponible ou planifié ;
2. concevoir une application multi-page indépendante de sa cible ;
3. confier la réalisation visuelle d'une page à un LLM sans lui donner la
   maîtrise de l'architecture ou du workspace.

Sans contrat intermédiaire, un LLM peut inventer un endpoint, un champ, une
permission ou une navigation. Sans registre gouverné, le générateur peut
sélectionner une composition dont la maturité n'est pas prouvée. Sans périmètre
d'écriture et oracle, la réalisation d'une page peut modifier des fichiers sans
rapport avec la demande ou produire une sortie qui ne compile pas.

ADR-0037 traite un autre problème : transformer ultérieurement du langage
naturel en source candidate avec désambiguïsation et revue. Il est encore
`Proposed`. La présente décision ne l'implémente pas et ne permet jamais au
texte libre de contourner les contrats structurés.

## Options envisagées

### Option A — Donner le projet et le prompt au LLM, puis relire le diff

- Avantages : peu d'outillage ; première sortie rapide.
- Inconvénients : périmètre implicite ; inventions détectées seulement en revue
  humaine ; résultat dépendant du modèle ; aucune preuve reproductible que deux
  pages suivent le même contrat.

### Option B — Chaîne contractuelle versionnée, registre de maturité et harnais borné

- Avantages : les décisions deviennent des données validées ; les références
  backend sont exactes ; le choix d'une composition est gouverné ; le LLM ne
  reçoit qu'une page et une liste fermée de fichiers ; les gates restent
  indépendantes du fournisseur de LLM.
- Inconvénients : davantage d'artefacts intermédiaires ; une conception doit
  être complétée avant la réalisation ; chaque évolution incompatible exige une
  migration explicite.

### Option C — Orchestrateur propriétaire d'un fournisseur de LLM

- Avantages : conversation, génération et vérification réunies dans un produit.
- Inconvénients : frontière de confiance non portable ; dépendance au
  fournisseur ; difficulté à reproduire une décision ou à vérifier hors ligne ;
  accès au workspace généralement plus large que nécessaire.

## Décision

**Option B.** Seuls des contrats canoniques, versionnés, fermés et validés
peuvent autoriser le rendu d'une application ou le travail d'un LLM. La chaîne
est :

```text
source backend figée
  → backend-contract
  → application-design
  → sélection d'une composition déclarée
  → shell applicatif
  → contrat de réalisation d'une page
  → fichiers bornés écrits par le LLM
  → oracle indépendant
```

### 1. Le contrat backend est l'autorité sur les données

`backend-contract` est la représentation canonique des opérations, paramètres,
corps, réponses, modèles, sécurité, statut de maturité et preuves de provenance.
Les adaptateurs structurés, OpenAPI et Postman ne peuvent produire que ce que la
source permet d'établir.

Une source analogue porte le statut `reference` et ne peut pas autoriser une
implémentation cible. Une capacité cible peut être conçue avec le statut
`planned`, mais elle reste explicitement distincte d'une capacité
`verified-live`. Aucun endpoint ou champ absent du contrat ne peut être utilisé
par la conception.

### 2. `application-design` est l'IR d'orchestration applicative

`application-design` décrit audiences, expériences, pages, états, actions,
navigations, accessibilité, politiques hors ligne et bindings exacts vers les
contrats backend. Il ne contient aucun nom de framework, chemin de fichier ou
choix de DI.

Il complète les quatre modèles d'ADR-0030 au niveau de l'application : il relie
l'intention de présentation et de navigation aux références sémantiques et
backend déjà déclarées. Il ne remplace ni le Semantic model ni le Behavior model
des compositions générées.

Une conception `approved` ne contient aucune inconnue. Toute référence backend,
page, état, action, audience ou permission doit se résoudre exactement. Les
incohérences échouent fermées avant toute création d'application.

### 3. Le registre de compositions gouverne le choix du générateur

Le choix d'une composition n'est pas une branche codée en dur et n'appartient
pas au LLM. Le registre versionné associe chaque `kind` à son générateur, ses
couches, sa cible, sa maturité et ses preuves relisibles.

Une composition `proven` exige plusieurs cas réels distincts. Une composition
moins mature porte obligatoirement une note expliquant sa limite. Sa présence
dans le registre autorise l'expérimentation ; elle ne vaut jamais promotion.

Le registre appartient au profil de génération, pas à l'IR canonique. Son
snapshot et son hash sont journalisés avant génération afin qu'une reprise ne
puisse pas changer silencieusement de recette.

### 4. Le LLM réalise une page, il ne conçoit pas l'architecture

Le harnais produit un work order immuable pour une seule page. Il contient le
contrat de page, ses références, l'inventaire protégé du workspace et la liste
exacte des fichiers autorisés.

Le fournisseur de LLM reste interchangeable. Le LLM peut écrire l'interface dans
ce périmètre, mais il ne peut ni modifier la conception, ni ajouter un endpoint,
ni étendre son périmètre d'écriture. L'oracle vérifie ensuite dérive du
workspace, identifiants de preuve, compilation stricte, build production, lint
et tests.

### 5. Les versions de schéma sont des contrats, pas des étiquettes

La version initiale est `1.0.0`. Un ajout rétrocompatible peut préparer une
version mineure. Toute modification incompatible exige avant acceptation :

- une nouvelle version majeure du schéma ;
- un migrateur déterministe depuis chaque version encore supportée ;
- des fixtures avant/après et un test d'idempotence ;
- une période explicite de lecture de l'ancienne version ou son rejet documenté.

Aucun chemin de migration n'est exigé tant qu'aucune version incompatible
n'existe. L'absence actuelle de migrateur n'autorise donc pas un changement
silencieux de `1.0.0`.

## Justification

La sécurité de cette chaîne ne vient pas de la qualité supposée du LLM. Elle
vient de la réduction de son autorité : le modèle remplit une forme déjà décidée
et l'oracle reste déterministe. Cette séparation permet d'utiliser Claude, Codex
ou un autre modèle sans changer le contrat de confiance.

La décision prolonge ADR-0029 en rendant la capacité falsifiable, ADR-0030 en
maintenant les artefacts canoniques indépendants des cibles, et ADR-0031 en
journalisant les choix et les hashes nécessaires à la reproduction.

## Conséquences

### Positives

- Une page ne peut référencer que des opérations et champs prouvés ou planifiés
  dans un contrat cible explicite.
- La conception reste réutilisable pour Web, Kotlin et iOS ; seuls les renderers
  et archétypes changent.
- Le LLM ne reçoit pas d'autorité implicite sur le dépôt.
- Les créations, reprises, échecs et retraits possèdent des preuves
  déterministes et auditables.
- La maturité des compositions devient une donnée contrôlée par gate.

### Négatives / dette acceptée

- Le renderer applicatif livré est actuellement Angular/PWA uniquement.
- Le harnais prépare et vérifie le travail d'un LLM, mais n'appelle pas lui-même
  une API propriétaire de modèle.
- `list-query` reste `experimental` : sa seule preuve provient d'un POC retiré.
- Le modèle rôle → archétype est livré sur une première tranche verticale réelle
  : `page-realization-contract` produit le rôle `screen`, le work order LLM
  consomme sa sélection Angular et son contrat hashé. Les rôles de code
  (`mapping`, `remote-query`, etc.) restent interdits tant qu'un producteur IR
  typé et un consommateur réel ne sont pas livrés.
- ADR-0037 reste nécessaire pour automatiser la traduction fiable d'une
  conversation libre vers ces contrats.

### Points à réévaluer

- Refuser la promotion d'une nouvelle cible tant qu'un exemple bout-en-bout
  versionné n'exerce pas source, contrats, shell et page sur cette cible.
- Réévaluer la séparation `backend-contract` / `application-design` si deux
  backends réels exigent des concepts de transport dans la conception.
- Superséder cette décision si le LLM doit obtenir une autorité d'écriture plus
  large ; un simple assouplissement du harnais est interdit.
- Déclencher le chantier de migration avant le premier changement incompatible
  d'un schéma `1.x`.

## Références

- [ADR-0010](./0010-flux-de-generation-assistee-par-ia.md) — l'IA remplit une
  forme fixée et reste soumise aux garde-fous.
- [ADR-0029](./0029-perimetre-capacites-plateforme-generation.md) — enveloppe de
  capacités et promotion par la preuve.
- [ADR-0030](./0030-ir-canonique-et-profils-cibles.md) — IR canonique et
  séparation des profils cibles.
- [ADR-0031](./0031-graphe-execution-et-manifests-composition.md) — graphe,
  manifests et reproductibilité.
- [ADR-0033](./0033-propriete-artefacts-regeneration-non-destructive.md) —
  propriété des fichiers générés et humains.
- [ADR-0035](./0035-contrat-durabilite-publication-generation.md) — publication
  transactionnelle et reprise.
- [ADR-0037](./0037-plateforme-intention-utilisateur-vers-application.md) —
  future source en langage naturel, volontairement distincte.
- [`archetype-role-model.md`](../architecture/archetype-role-model.md) — modèle
  rôle/archétype, dont la première tranche `screen → component` est implémentée.
