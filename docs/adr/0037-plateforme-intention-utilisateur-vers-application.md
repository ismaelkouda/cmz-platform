# ADR-0037 — Plateforme d'intention utilisateur : langage naturel vers application identifiable et éditable

- **Statut :** Proposed
- **Date :** 2026-08-29

## Contexte

ADR-0029 borne la plateforme à un **compilateur de spécifications** :
`sources déclarées → IR canonique → cibles supportées`, avec deux sources
initiales (spécification structurée versionnée, legacy TypeScript). Tout le
pipeline aval — `tools/generator-platform/`, la validation de schéma
(`validate-ir.mjs`), le Change Set transactionnel (ADR-0033, ADR-0035) — est
robuste et testé, mais son entrée reste un fichier `.definition.json` que
seul un développeur sait écrire.

Un besoin distinct est apparu : une personne non-initiée doit pouvoir décrire
son application **en langage naturel** sur une interface publique, obtenir
une application fonctionnelle, puis désigner une page précise par un
identifiant simple (« modifie la page `X` ») pour demander des évolutions
ciblées sans tout redécrire.

Ce besoin n'est pas une nouvelle cible de rendu (déjà couvert par ADR-0029)
ni un nouveau modèle dans l'IR (déjà couvert par ADR-0030). C'est une
**nouvelle catégorie de source**, avec une propriété qu'aucune source
actuelle ne possède : elle est produite par une personne qui ne peut pas
elle-même vérifier si ce qu'elle a écrit est complet, cohérent ou ambigu.
Un fichier `.definition.json` mal formé échoue à la validation JSON Schema
de façon immédiate et lisible. Une phrase en langage naturel mal formée ne
peut pas échouer de la même manière : elle est syntaxiquement toujours
valide, seule sa sémantique peut être incomplète, et rien dans le pipeline
actuel ne sait mesurer ça.

Un deuxième problème, indépendant du premier, est révélé par comparaison
avec le marché (voir Références) : les générateurs d'applications assistés
par IA se répartissent en deux familles selon ce qu'ils font au *deuxième*
prompt, pas au premier. Une famille traite chaque prompt comme une
réécriture et perd la capacité de cibler une modification de façon fiable
au fil des itérations. L'autre garde une spécification versionnée comme
source de vérité et applique les modifications *sur* cette spécification.
Le besoin exprimé ici — un identifiant de page stable, citable dans une
conversation ultérieure — n'est possible que dans la seconde famille. Ce
n'est pas un détail d'implémentation : c'est la propriété qui distingue un
outil de démo d'une plateforme qu'on peut réellement faire évoluer.

## Recherche et précédents

Cette section documente les précédents identifiés, pour que la décision
ci-dessous soit traçable à des preuves externes plutôt qu'à une intuition.

### Taxonomie spec-driven development (Fowler / Bockeler, 2026)

La littérature distingue trois niveaux d'engagement envers la spécification
une fois le code généré :

- **spec-first** — la spec sert à cadrer la première génération puis est
  abandonnée ou laissée dériver ; le code redevient immédiatement la
  source de vérité.
- **spec-anchored** — la spec démarre le travail, mais le code reprend le
  rôle de source de vérité après génération (les éditions suivantes se
  font sur le code, pas sur la spec).
- **spec-as-source** — seule la spec est éditée par l'humain ; le code est
  toujours dérivé et marqué comme tel (Tessl, par exemple, tamponne les
  fichiers générés `// GENERATED FROM SPEC — DO NOT EDIT`).

`cmz-platform` a déjà choisi implicitement **spec-as-source** via ADR-0033
(propriété exclusive `generator-owned`/`human-owned`) : un fichier généré
n'est jamais la vérité, seule sa spec l'est. Cet ADR **hérite** ce choix
plutôt que de le redécider — il l'étend seulement à une source qui n'existe
pas encore : le langage naturel.

### Écart entre les product agents et les prototyping platforms (état du marché, Q3 2026)

Un rapport de marché indépendant classe les outils en « product agents »
(compilent une spec en pile complète et gardent la spec comme source de
vérité au fil des évolutions du modèle) contre « prototyping platforms »
(génèrent une pile de plus en plus assemblée à partir de services tiers,
re-prompt après re-prompt, sans plan compilé unique). Le rapport observe
explicitement que la deuxième famille perd en fiabilité d'édition ciblée à
mesure que les itérations s'accumulent — exactement le risque que ce
document cherche à éviter par construction plutôt qu'à corriger après
coup.

### Identifiants stables versus identifiants de version (pratique CMS)

La pratique établie de gestion de contenu distingue un identifiant
**statique**, qui ne change jamais et n'est jamais réutilisé même après
suppression, d'un identifiant de **version**, qui change à chaque
publication et pointe vers un contenu exact. Un modèle « alias
d'environnement » (un identifiant fixe qui pointe vers la version courante,
avec bascule explicite) permet de changer ce qui est actif sans jamais
changer ce que l'utilisateur cite. Ce même rapport souligne un coût
asymétrique bien établi dans la conception de schémas et d'API : renommer
un libellé affiché est gratuit, changer un identifiant est coûteux et se
propage à tous les appelants. Ce constat motive directement la séparation
`page_id` / `revision_id` décrite plus bas — sans elle, chaque
régénération risquerait de casser la référence que l'utilisateur vient
d'apprendre à utiliser.

### Détection d'ambiguïté par désaccord, pas par confiance déclarée (ClarifyGPT, 2024–2026)

Un résultat de recherche reproductible et important pour ce document :
demander à un modèle de langage s'il est sûr de sa propre interprétation
est une mesure peu fiable — des évaluations systématiques montrent que
même les modèles récents peinent à distinguer une instruction bien
spécifiée d'une instruction sous-spécifiée quand on le leur demande
directement. La méthode ClarifyGPT contourne ce problème sans jamais
demander au modèle de s'auto-évaluer : elle génère plusieurs solutions
indépendantes à partir de la même exigence, puis teste si elles se
comportent de façon identique. Un désaccord mesurable entre les solutions
est le signal d'ambiguïté — un fait vérifiable mécaniquement, pas un
jugement du modèle sur lui-même. Appliquée au texte utilisateur, la même
idée devient : ne jamais accepter tel quel un `.definition.json` unique
produit par une seule interprétation ; en produire plusieurs
indépendamment et comparer leur structure avant de proposer quoi que ce
soit à l'utilisateur.

### Édition structurée plutôt que réécriture complète (littérature d'édition assistée par LLM)

Plusieurs travaux convergent sur un même principe pour l'édition de code ou
de documents structurés par un LLM : un format d'édition en opérations
typées et localisées (comparable à JSON Patch, RFC 6902) est plus fiable
qu'une réécriture complète du document, parce qu'une réécriture complète
peut faire disparaître silencieusement un champ ou une règle que personne
n'a demandé de retirer. Le même corpus documente que le matching par
correspondance de motif exact est plus robuste que l'édition par numéro de
ligne pour les patches produits par un LLM. Ce principe est directement
applicable à la pièce « modification ciblée d'une page » décrite plus bas.

### Abus documenté d'un précédent direct (Lovable, phishing, 2025–2026)

Ce risque n'est pas hypothétique : Proofpoint documente des campagnes
réelles où des attaquants ont utilisé Lovable — l'outil le plus proche de
la famille « texte libre vers application publiée » visée par ce document
— pour produire des sites de phishing fonctionnels, y compris leur
logique backend, en un ou deux prompts, sur un plan gratuit limité à cinq
prompts par jour. Lovable a réagi après coup par une détection en temps
réel des prompts malveillants et un scan quotidien des projets publiés.
Le fait que ce garde-fou ait été ajouté *après* l'abus documenté, et non
conçu dès le départ, est le signal le plus utile de cette recherche : un
pipeline « texte libre → application publiée » doit traiter l'abus comme
une exigence de conception initiale, pas comme un correctif ultérieur.
Ce document ne peut pas résoudre ce risque — la modération de contenu et
la détection d'abus sont hors du périmètre d'un ADR sur le flux de
génération — mais il doit le nommer explicitement pour qu'aucune
implémentation future ne le découvre après coup, comme cela a été le cas
pour ce précédent.

## Options envisagées

### Option A — Le langage naturel produit directement du code (comme Lovable/Bolt/v0)

- Avantages : latence minimale perçue par l'utilisateur ; aucune couche
  intermédiaire à construire ; correspond au réflexe le plus courant du
  marché actuel.
- Inconvénients : viole ADR-0010 (« l'IA ne remplit qu'un trou dont la
  forme est fixée », jamais la structure elle-même) ; aucun point où la
  validation stricte de schéma déjà en place peut intervenir ; l'exigence
  explicite d'un identifiant de page stable et éditable devient
  irréalisable, puisque rien ne garantit qu'une régénération ultérieure
  produise une structure comparable à la précédente — c'est précisément le
  défaut nommé par le rapport de marché cité ci-dessus.

### Option B — Le langage naturel devient une source de premier ordre dans l'IR existante, avec pipeline en quatre étages et double identifiant

- Avantages : réutilise entièrement le socle existant (`evidence.schema.json`,
  `validate-ir.mjs`, le Change Set transactionnel, ADR-0033) sans le
  dupliquer ; s'aligne avec spec-as-source (le texte n'est jamais la
  vérité finale, le `.definition.json` validé l'est) ; rend la
  désambiguïsation mesurable au lieu de reposer sur la confiance déclarée
  du modèle ; sépare identité et version dès la conception, évitant la
  classe de bug la plus citée par la littérature CMS.
- Inconvénients : plus d'étapes avant la première application visible par
  l'utilisateur ; un nouveau `kind` de source doit être ajouté à
  `evidence.schema.json` et un registre d'identifiants doit être conçu et
  maintenu ; la désambiguïsation par échantillonnage multiple augmente le
  coût d'inférence par génération (plusieurs appels LLM au lieu d'un).

### Option C — Traduction sans validation intermédiaire, avec relecture humaine systématique avant génération

- Avantages : plus simple à implémenter qu'Option B ; élimine le risque
  d'halluciner une règle de gestion en forçant un humain à valider chaque
  `.definition.json` avant compilation.
- Inconvénients : replace l'utilisateur non-initié — que cette plateforme
  cherche explicitement à servir — face à un artefact technique (le JSON)
  qu'il ne sait pas lire ; ne passe pas à l'échelle si le volume de
  demandes grandit ; ne règle pas le problème d'identifiant stable pour
  les éditions futures, seulement celui de la première génération.

## Décision

**Option B.** Le langage naturel devient une source de premier ordre de
l'IR canonique (ADR-0030), au même titre que la spécification structurée
et le legacy TypeScript, avec un pipeline explicite à quatre étages et un
schéma d'identifiants à deux clés.

### 1. Le texte libre est une source, jamais un raccourci vers le code

Le texte de l'utilisateur est capturé comme un `source` de
`evidence.schema.json` avec un nouveau `kind` : `natural_language_prompt`
(à ajouter à l'énumération existante aux côtés de `source_code`, `test`,
`specification`, `human_decision`, `api_contract`). Il produit des
`facts` (ce que le texte affirme clairement), et surtout des `unknowns`
explicites pour tout ce que le texte ne précise pas — jamais une valeur
par défaut silencieuse. Un `evidence model` de ce texte qui ne déclare
aucun `unknown` alors que le texte est court et sous-spécifié doit être
traité comme suspect, pas comme un succès.

### 2. La désambiguïsation est mesurée, pas déclarée

Avant de proposer un `.definition.json` à l'utilisateur, le pipeline en
produit **N interprétations indépendantes** (N ≥ 3) à partir du même
texte, selon le principe ClarifyGPT documenté ci-dessus. Les N résultats
sont comparés structurellement, mais la comparaison n'est pas binaire :
un désaccord sur un champ **requis**, un **type**, une **règle d'accès**
(`public`/`authenticated`/`authorized`) ou l'**existence même d'une
opération** est un désaccord structurel et bloque le passage à l'étape 3
— c'est le type d'écart que la littérature associe à une ambiguïté
sémantique réelle. Un désaccord seulement sur un **libellé**, une
**description** ou le **nom exact d'un identifiant technique interne**
(tant que sa forme reste valide) est un désaccord cosmétique : il ne
bloque pas, mais le pipeline retient la variante la plus fréquente parmi
les N et journalise l'écart dans le manifest, comme un `unknown` résolu
par défaut plutôt que par confirmation explicite. Cette distinction évite
l'écueil symétrique inverse d'une désambiguïsation trop stricte : bloquer
l'utilisateur sur des variations qui ne changent rien au comportement de
l'application produirait le même effet que ne jamais clarifier — une
plateforme perçue comme peu fiable, pour une raison différente. Un
désaccord structurel déclenche une question de clarification ciblée sur
le point de désaccord précis — jamais une question générique du type
« votre demande est-elle complète ? ».

### 3. Le `.definition.json` reste l'unique porte d'entrée du compilateur

Aucune IA n'écrit jamais directement dans `apps/` ou `libs/`. Le résultat
de l'étape 2, une fois convergent, est validé par `validate-ir.mjs`
exactement comme un `.definition.json` écrit à la main — sans chemin de
contournement, sans drapeau `--skip-validation`. C'est le même principe
que celui qui a motivé la correction de l'`allOf` fail-open de cet outil :
un validateur qui peut être court-circuité par construction n'est pas un
validateur.

### 4. Deux identifiants distincts, jamais fusionnés

Chaque page (feature) reçoit :

- un **`page_id`** — attribué une seule fois à la création, opaque,
  jamais réutilisé même si la page est supprimée. C'est l'identifiant que
  l'utilisateur non-initié voit, cite et retient pour demander une
  modification. Il ne change jamais, quel que soit le nombre de
  régénérations.
- un **`revision_id`** — recalculé à chaque publication réussie (réutilise
  le `change_set_id` déjà produit par le Change Set transactionnel
  existant), pointant vers l'exact `.definition.json` et le code généré
  correspondants à cet instant. Permet un rollback vers une révision
  antérieure sans perdre l'historique, dans l'esprit du manifest de
  composition d'ADR-0031.

Un registre associe `page_id → revision_id courant → historique des
revision_id`. Ce registre est lui-même un artefact versionné, pas une
base de données ad hoc parallèle au reste du système — cohérent avec le
principe « tout est versionné » déjà appliqué au catalog (ADR-0005) et
aux conventions (ADR-0010).

### 5. Une modification ciblée est une opération, jamais une réécriture

Quand l'utilisateur cite un `page_id` pour demander un changement, l'IA ne
régénère pas le `.definition.json` en entier depuis le nouveau texte. Elle
produit une opération d'édition minimale et typée (« ajouter le champ
`phone`, type string, requis, à l'`input` de l'opération
`subscribe-newsletter` ») appliquée par du code déterministe — pas par
l'IA elle-même — sur le `.definition.json` existant récupéré via le
registre. Cette opération est elle-même validée par le même schéma avant
application. Ce principe reprend directement la conclusion de la
littérature d'édition assistée par LLM citée ci-dessus : une opération
localisée ne peut pas faire disparaître silencieusement une règle que
personne n'a demandé de retirer, alors qu'une réécriture complète le peut.

## Justification

Le fil conducteur reprend celui d'ADR-0030 : séparer ce qui est stable de
ce qui change. Ici, ce qui est stable est le contrat déjà prouvé —
`.definition.json` validé → compilateur → Change Set transactionnel → code
possédé exclusivement. Ce qui change est seulement la façon dont ce
`.definition.json` est produit : à la main aujourd'hui, potentiellement
depuis du texte libre demain. Traiter le texte libre comme une source de
plus dans l'IR existante, plutôt que comme un chemin parallèle qui
produirait du code directement, évite de dupliquer toute la rigueur déjà
construite (validation, transactions, ownership) pour un deuxième chemin
moins sûr.

La désambiguïsation par désaccord mesurable plutôt que par confiance
déclarée n'est pas un raffinement optionnel : c'est la seule méthode dont
la littérature montre qu'elle fonctionne, l'alternative (demander au
modèle s'il est sûr) étant documentée comme peu fiable. Ignorer ce
résultat reviendrait à construire un système dont le point de défaillance
le plus probable — une IA confiante à tort — n'est protégé par aucun
garde-fou mécanique.

La séparation `page_id`/`revision_id` n'est pas une anticipation
prématurée : c'est une condition nécessaire du besoin explicitement
exprimé (« pouvoir citer une page pour la modifier plus tard »). Sans
cette séparation, ce besoin est structurellement irréalisable au-delà de
la première génération, quelle que soit la qualité de l'IA utilisée —
c'est un problème d'architecture des identifiants, pas un problème de
capacité du modèle.

## Conséquences

### Positives

- Le texte libre entre dans le même régime de preuve que les autres
  sources (ADR-0029) : aucune source n'est « supportée » sans satisfaire
  des gates vérifiables, le langage naturel n'y échappe pas.
- Aucune duplication de la rigueur transactionnelle déjà construite
  (ADR-0033, ADR-0035) : le nouveau pipeline se branche en amont du
  `.definition.json`, jamais en aval.
- La désambiguïsation devient mesurable et testable (taux de convergence
  entre N interprétations), donc pilotable dans le temps — même principe
  que le Web Codegen Scorer cité par ADR-0010 pour la qualité du code
  généré.
- L'identifiant de page reste valide même si l'implémentation du
  compilateur change radicalement plus tard, parce qu'il ne pointe jamais
  directement vers du code, seulement vers une chaîne de revisions.

### Négatives / dette acceptée

- Coût d'inférence multiplié par N à chaque génération initiale (étape 2).
  Ce coût est délibérément accepté en échange de la fiabilité mesurée ;
  il pourra être réduit plus tard (mise en cache des interprétations
  convergentes, réduction de N après collecte de données réelles).
- Le nouveau `kind: natural_language_prompt` et le registre d'identifiants
  n'existent pas encore ; ce document ne livre pas de code, seulement le
  contrat.
- Le format exact de l'opération d'édition typée (étape 5) reste à
  concevoir en détail — ce document fixe le principe (opération localisée,
  jamais réécriture complète, appliquée par du code déterministe), pas le
  schéma JSON précis.
- La question du support multi-page avec dépendances croisées entre
  `page_id` (ex: une page qui référence les données d'une autre) n'est
  pas traitée par ce document et devra faire l'objet d'un ADR dédié si le
  besoin se confirme.
- **Ce document ne couvre pas la modération de contenu ni la détection
  d'abus.** Le précédent Lovable documenté ci-dessus montre qu'un
  pipeline texte-libre-vers-application-publiée est une cible d'abus
  concrète (phishing, malware) dès qu'il est accessible publiquement,
  indépendamment de la qualité de la désambiguïsation décrite aux étapes
  1–2. Le contrôle d'accès (qui peut générer), les limites de fréquence
  et la détection de contenu malveillant avant publication doivent faire
  l'objet d'un ADR dédié **avant** toute exposition publique de ce
  pipeline — les considérer comme un ajout ultérieur reproduirait
  l'erreur de séquencement documentée chez ce précédent.

### Points à réévaluer

- Réduire N (nombre d'interprétations indépendantes échantillonnées) si
  les données réelles montrent un taux de convergence très élevé dès
  N=2, ou l'augmenter si des ambiguïtés fréquentes passent inaperçues
  avec N=3.
- Remettre en cause l'ajout dans `evidence.schema.json` (plutôt qu'un
  schéma séparé dédié au langage naturel) si les `facts` extraits d'un
  texte libre s'avèrent avoir une structure trop différente des `facts`
  extraits d'un fichier source ou d'un contrat API.
- Réévaluer le mécanisme d'édition par opération typée si l'usage réel
  montre que la majorité des demandes de modification ne peuvent pas être
  exprimées comme des opérations localisées (auquel cas une partie non
  négligeable des évolutions retomberait quand même sur une régénération
  complète, ce qui affaiblirait la justification de ce choix).
- Ce document ne tranche pas où vit l'interface utilisateur ni le
  registre (dans `cmz-platform` ou à part), ni le mode de persistance du
  registre (fichiers versionnés ou base de données) — ces décisions
  d'implémentation appartiennent à un ADR de suivi, une fois le contrat
  ci-dessus validé.

## Références

- [ADR-0009](./0009-reconstruction-pilotee-par-patterns.md) — reconstruction
  pilotée par patterns, principe hérité pour l'evidence model.
- [ADR-0010](./0010-flux-de-generation-assistee-par-ia.md) — l'IA ne
  remplit qu'un trou de forme fixe ; principe directement hérité pour
  l'étape 5 (opération d'édition typée, jamais réécriture par l'IA).
- [ADR-0029](./0029-perimetre-capacites-plateforme-generation.md) —
  périmètre de capacités et matrice de preuve ; ce document ajoute une
  source candidate à cette matrice, sans l'y déclarer supportée avant
  preuve.
- [ADR-0030](./0030-ir-canonique-et-profils-cibles.md) — IR canonique
  multi-axes (evidence/semantic/behavior/presentation) ; ce document
  étend l'axe evidence avec un nouveau `kind` de source.
- [ADR-0031](./0031-graphe-execution-et-manifests-composition.md) —
  manifest de composition ; principe repris pour le `revision_id`.
- [ADR-0033](./0033-propriete-artefacts-regeneration-non-destructive.md)
  — propriété exclusive des artefacts et régénération non destructive ;
  socle transactionnel réutilisé tel quel par ce document.
- [ADR-0035](./0035-contrat-durabilite-publication-generation.md) —
  contrat de durabilité de publication, réutilisé pour la publication de
  chaque `revision_id`.
- Martin Fowler / Birgitta Bockeler — « Understanding Spec-Driven
  Development: Kiro, spec-kit, and Tessl » (2026) — taxonomie
  spec-first / spec-anchored / spec-as-source citée en section Recherche.
- MindStudio — « The AI App Builder Category in Q3 2026: Where It
  Actually Stands » — distinction product agents / prototyping platforms
  citée en section Recherche.
- ClarifyGPT — « Empowering LLM-based Code Generation with Intention
  Clarification » (arXiv:2310.10996) et son évaluation ACM (2024) —
  méthode de détection d'ambiguïté par désaccord entre solutions
  indépendantes, citée en section Recherche.
- « Assessing the Impact of Requirement Ambiguity on LLM-based
  Function-Level Code Generation » (arXiv:2604.21505) — limite empirique
  de l'auto-évaluation de confiance par un LLM, citée en section
  Recherche.
- RFC 6902 (JSON Patch) — format de référence pour les opérations
  d'édition localisées citées en section Recherche et reprises pour
  l'étape 5.
- Proofpoint — « Cybercriminals Abuse AI Website Creation App For
  Phishing » (2025–2026) — précédent documenté d'abus d'un outil texte-
  libre-vers-application-publiée, cité en section Recherche et repris en
  Conséquences négatives.
