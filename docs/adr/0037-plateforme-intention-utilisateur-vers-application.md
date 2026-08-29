# ADR-0037 — Génération assistée par langage naturel pour un utilisateur du dépôt

- **Statut :** Proposed
- **Date :** 2026-08-29 (révisé le 2026-08-29 après revue croisée)

## Contexte

ADR-0029 borne la plateforme à un **compilateur de spécifications** :
`sources déclarées → IR canonique → cibles supportées`, avec deux sources
initiales (spécification structurée versionnée, legacy TypeScript). Tout le
pipeline aval — `tools/generator-platform/`, la validation de schéma
(`validate-ir.mjs`), le Change Set transactionnel (ADR-0033, ADR-0035) — est
robuste et testé, mais son entrée reste un fichier `.definition.json` que
seul un développeur sait écrire.

Un besoin distinct est apparu : décrire une application **en langage
naturel** plutôt qu'en JSON, obtenir un `.definition.json` candidat, puis
désigner une page précise par un identifiant simple pour demander des
évolutions ciblées sans tout redécrire à la main.

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

### Portée délibérément resserrée après une première version rejetée en revue

Une première rédaction de ce document (2026-08-29, matin) visait une
« plateforme publique » : un inconnu non authentifié décrit son besoin sur
un site, obtient une application hébergée, la cite par un identifiant. Une
revue croisée, puis une contre-critique portée par l'auteur du besoin
lui-même, ont établi que cette formulation mélangeait deux décisions de
nature radicalement différente sous une seule étiquette d'ADR :

1. **Étendre le compilateur avec une source langage naturel** — un problème
   de génie logiciel, dans la continuité directe d'ADR-0030, réalisable
   avec les compétences déjà démontrées dans ce dépôt (IR, renderers,
   Oracles, validation de schéma).
2. **Opérer un produit public multi-locataire** — un problème
   d'exploitation (authentification utilisateur, hébergement isolé par
   locataire, modération de contenu, limitation de fréquence anti-abus,
   astreinte de sécurité, responsabilité sur du contenu publié) qui n'a
   *aucune* réponse dans ce dépôt aujourd'hui : zéro backend de service,
   zéro base de données, zéro service d'authentification utilisateur, zéro
   pipeline de modération. Le travail démontré ici est du génie
   compilateur, pas de l'exploitation SaaS. L'environnement de
   développement lui-même est documenté à plusieurs reprises dans ce
   dépôt comme sandboxé et à réseau limité (blocages déjà rencontrés sur
   PLAT-5F, le job SAST, le POC Kotlin/Swift interrompu) — un signal
   supplémentaire que « monter et opérer un hébergement public en continu »
   n'est pas seulement une quantité de code à écrire en plus, c'est hors de
   portée structurelle de ce contexte précis.

Le point 2 n'est pas retardé en « dette acceptée » à l'intérieur de ce
document, ce qui était l'erreur de la première version. Il est extrait dans
son intégralité vers [ADR-0038](./0038-nature-produit-public-multi-locataire.md),
qui pose la question de nature comme sa propre décision, non tranchée,
explicitement hors de portée de l'infrastructure actuelle. **Ce document ne
couvre que le point 1.**

### Portée retenue : un utilisateur déjà titulaire d'un accès au dépôt

L'« utilisateur » de ce document est une personne qui a déjà accès à ce
dépôt (vous-même, ou une petite équipe interne), au même titre qu'un
développeur qui écrirait aujourd'hui un `.definition.json` à la main. Le
langage naturel remplace l'écriture manuelle du JSON, pas la revue humaine
qui accompagne toute autre contribution à ce dépôt : un `.definition.json`
produit depuis du texte libre suit le même chemin qu'une pull request
ordinaire avant de déclencher la compilation.

Cette réduction de portée n'est pas une esquive du problème initial — elle
en résout la partie qui est réellement à ce document de résoudre, et laisse
la partie produit public à une décision séparée qui lui appartient. Voir la
section Recherche pour le raisonnement complet ; il n'est pas résumé ici
pour éviter de dupliquer la Justification.

## Recherche et précédents

### Taxonomie spec-driven development (Fowler / Bockeler, 2026)

La littérature distingue trois niveaux d'engagement envers la spécification
une fois le code généré :

- **spec-first** — la spec sert à cadrer la première génération puis est
  abandonnée ou laissée dériver ; le code redevient immédiatement la
  source de vérité.
- **spec-anchored** — la spec démarre le travail, mais le code reprend le
  rôle de source de vérité après génération.
- **spec-as-source** — seule la spec est éditée par l'humain ; le code est
  toujours dérivé et marqué comme tel (Tessl, par exemple, tamponne les
  fichiers générés `// GENERATED FROM SPEC — DO NOT EDIT`).

`cmz-platform` a déjà choisi implicitement **spec-as-source** via ADR-0033
(propriété exclusive `generator-owned`/`human-owned`) : un fichier généré
n'est jamais la vérité, seule sa spec l'est. Cet ADR **hérite** ce choix
plutôt que de le redécider — il l'étend seulement à une source qui n'existe
pas encore : le langage naturel.

### Identifiants stables versus identifiants de version (pratique CMS)

La pratique établie de gestion de contenu distingue un identifiant
**statique**, qui ne change jamais et n'est jamais réutilisé même après
suppression, d'un identifiant de **version**, qui change à chaque
publication et pointe vers un contenu exact. Un coût asymétrique bien
établi en conception de schémas motive cette distinction : renommer un
libellé affiché est gratuit, changer un identifiant est coûteux et se
propage à tous les appelants. Ce constat motive directement la séparation
`page_id` / `revision_id` décrite plus bas.

### Détection d'ambiguïté par désaccord, en filet secondaire derrière la revue humaine (ClarifyGPT, 2024–2026, nuancé)

Demander à un modèle de langage s'il est sûr de sa propre interprétation
est une mesure peu fiable — des évaluations systématiques montrent que
même les modèles récents peinent à distinguer une instruction bien
spécifiée d'une instruction sous-spécifiée quand on le leur demande
directement (arXiv:2604.21505). La méthode ClarifyGPT (arXiv:2310.10996)
contourne ce problème sans demander au modèle de s'auto-évaluer : elle
génère plusieurs solutions indépendantes à partir de la même exigence, puis
teste si elles se comportent de façon identique — un désaccord mesurable
est un signal d'ambiguïté vérifiable mécaniquement.

**Cette méthode a cependant un angle mort documenté, qu'une première
version de ce document présentait à tort comme « la seule méthode dont la
littérature montre qu'elle fonctionne ».** « Too Consistent to Detect: A
Study of Self-Consistent Errors in LLMs » (arXiv:2505.17656) établit que
lorsqu'un modèle produit la **même** interprétation erronée à chaque
échantillon — une erreur auto-cohérente plutôt qu'une variance de tirage —
les méthodes fondées sur le désaccord sont aveugles par construction, et ce
type d'erreur ne diminue pas avec l'échelle du modèle. C'est le scénario le
plus probable pour un texte utilisateur qui omet une règle métier de façon
invisible au modèle : celui-ci partage le même biais de complétion à
chaque tirage (ex : « newsletter » → présomption systématique
d'`access: public`, jamais échantillonnée comme `authenticated` en
alternative). Symétriquement, « Self-Consistency Falls Short! » (TACL/MIT
Press) documente qu'un désaccord entre échantillons peut lui-même être un
artefact de biais de position plutôt qu'une vraie ambiguïté sur une entrée
longue.

La conséquence retenue ici : le désaccord mesuré entre N interprétations
est une garantie **d'absence de variance de tirage**, jamais une garantie
**d'absence d'erreur**. Dans le périmètre resserré de ce document (un
utilisateur du dépôt, revue humaine avant compilation), ce n'est pas un
problème bloquant — c'est exactement pour cette classe d'erreur que la
revue humaine reste la porte finale, pas la désambiguïsation automatique.
Dans un scénario sans revue humaine (celui d'ADR-0038, non traité ici), cet
angle mort serait en revanche disqualifiant tel quel.

### Édition structurée plutôt que réécriture complète (littérature d'édition assistée par LLM)

Un format d'édition en opérations typées et localisées (comparable à JSON
Patch, RFC 6902) est plus fiable qu'une réécriture complète du document,
parce qu'une réécriture complète peut faire disparaître silencieusement un
champ ou une règle que personne n'a demandé de retirer. Le matching par
correspondance de motif exact est plus robuste que l'édition par numéro de
ligne pour les patches produits par un LLM. Directement applicable à
l'étape 7 (modification ciblée d'une page).

### Le précédent d'abus (Lovable, phishing) motive la portée resserrée plutôt qu'une conséquence à part

Proofpoint documente des campagnes réelles où Lovable — le précédent le
plus proche d'un pipeline « texte libre vers application publiée » — a été
utilisé pour produire des sites de phishing fonctionnels en un ou deux
prompts, sur un plan gratuit public. Ce fait n'est plus traité ici comme
une dette acceptée à l'intérieur du même document : il est l'une des
preuves qui a motivé l'extraction complète du scénario public vers
ADR-0038. Dans le périmètre retenu par ce document (accès déjà accordé au
dépôt, aucune exposition publique), ce risque ne s'applique pas — ce qui
est précisément la raison de fond du resserrement de portée, pas un simple
choix de prudence rédactionnelle.

## Options envisagées

### Option A — Le langage naturel produit directement du code (comme Lovable/Bolt/v0)

- Avantages : latence minimale perçue ; aucune couche intermédiaire à
  construire.
- Inconvénients : viole ADR-0010 (« l'IA ne remplit qu'un trou de forme
  fixée », jamais la structure elle-même) ; aucun point où la validation
  stricte de schéma déjà en place peut intervenir ; l'identifiant de page
  stable devient irréalisable, rien ne garantissant qu'une régénération
  ultérieure produise une structure comparable à la précédente.

### Option B — Le langage naturel devient une source de premier ordre dans l'IR existante, avec pipeline en quatre étapes, double identifiant, revue humaine avant compilation

- Avantages : réutilise le socle existant (`evidence.schema.json`,
  `validate-ir.mjs`, le Change Set transactionnel de ADR-0033/0035) sans
  le dupliquer, **dans son domaine de validité réel** — un seul arbre de
  confiance, des utilisateurs déjà titulaires d'un accès, exactement le
  modèle pour lequel ce socle a été conçu et testé ; s'aligne avec
  spec-as-source ; rend la désambiguïsation mesurable en complément de la
  revue humaine plutôt qu'à sa place ; sépare identité et version dès la
  conception.
- Inconvénients : plus d'étapes avant la première application produite ;
  un nouveau `kind` de source doit être ajouté à `evidence.schema.json` et
  un registre d'identifiants doit être conçu ; la désambiguïsation par
  échantillonnage multiple augmente le coût d'inférence ; ne répond à
  aucun besoin d'exposition publique — voir ADR-0038 si ce besoin se
  confirme séparément.

### Option C — Traduction sans validation intermédiaire, sans revue humaine systématique

- Avantages : plus simple à implémenter qu'Option B.
- Inconvénients : élimine précisément le filet qui compense l'angle mort
  documenté de la désambiguïsation par désaccord (erreur auto-cohérente) ;
  aucune garantie qu'une règle de gestion halluciné passe inaperçue avant
  compilation.

## Décision

**Option B, dans le périmètre resserré défini au Contexte.** Le langage
naturel devient une source de premier ordre de l'IR canonique (ADR-0030),
pour un utilisateur déjà titulaire d'un accès au dépôt, avec un pipeline
explicite à cinq étapes.

### 1. Le texte libre est une source, jamais un raccourci vers le code

Le texte de l'utilisateur est capturé comme un `source` de
`evidence.schema.json` avec un nouveau `kind` : `natural_language_prompt`
(à ajouter à l'énumération existante aux côtés de `source_code`, `test`,
`specification`, `human_decision`, `api_contract`). Il produit des `facts`
et des `unknowns` explicites pour tout ce que le texte ne précise pas —
jamais une valeur par défaut silencieuse.

### 2. La désambiguïsation automatique est un filtre, pas la garantie finale

Avant de proposer un `.definition.json` au relecteur humain, le pipeline
produit **N interprétations indépendantes** (N ≥ 3) à partir du même
texte. Un désaccord sur un champ requis, un type, une règle d'accès ou
l'existence d'une opération est structurel et bloque le passage à l'étape
3 en demandant une clarification ciblée. Un désaccord seulement cosmétique
(libellé, description) ne bloque pas : la variante la plus fréquente est
retenue et l'écart journalisé. **Cette étape réduit le volume d'erreurs
présentées au relecteur humain, elle ne le remplace pas** — voir l'angle
mort documenté en section Recherche : un biais de complétion partagé par
tous les échantillons n'est, par construction, jamais détecté par cette
méthode.

### 3. Une checklist déterministe, indépendante du LLM, avant la revue humaine

Avant présentation au relecteur humain, le `.definition.json` issu de
l'étape 2 est vérifié contre une **checklist métier fixe** — une liste de
règles écrites une fois par un humain (dérivée des questions déjà posées
par `creer-une-action-request.md` §2 : résultat recherché, champs
saisis, règles obligatoires, accès, appel backend, réponse, effet local)
et appliquée mécaniquement, sans appel à un modèle de langage. Une règle
absente, un champ attendu manquant, ou une incohérence détectable par un
motif fixe (ex : une opération `public` qui référence une intégration
`authenticated`) fait échouer la checklist avant même que le fichier
atteigne un humain.

Cette checklist n'est pas une reformulation de l'étape 2 : elle attrape
une classe d'erreur différente. L'étape 2 compare plusieurs sorties du
*même* modèle entre elles — son angle mort documenté est qu'un biais de
complétion partagé par tous les échantillons lui est invisible par
construction. La checklist ne dépend d'aucun modèle : elle compare une
sortie à une règle écrite d'avance, donc elle attrape précisément le cas
que l'étape 2 rate — une erreur systématique que le LLM commet à chaque
tirage sans jamais varier.

### 4. Revue humaine avant compilation, comme toute autre contribution au dépôt

Le `.definition.json` qui a passé les étapes 2 et 3 (désambiguïsation puis
checklist) est présenté à un humain titulaire d'un accès au dépôt avant
toute compilation — pas
optionnellement, pas seulement pour les cas jugés incertains. La même
discipline de revue qui s'applique déjà à tout `.definition.json` écrit à
la main s'applique ici, sans exception nouvelle à créer.

**Les trois mécanismes (désaccord entre échantillons, checklist
déterministe, revue humaine) se combinent, aucun ne remplace les deux
autres.** Chacun attrape une classe d'erreur que les autres ratent : la
désambiguïsation par désaccord attrape la variance de tirage, la
checklist attrape le biais systématique invisible à cette désambiguïsation,
la revue humaine attrape tout ce qu'aucun mécanisme automatique ne peut
formaliser (une règle de gestion correcte en apparence mais fausse dans
le contexte réel de l'utilisateur). Retirer l'un des trois en pensant que
les deux autres suffisent reviendrait à réintroduire l'angle mort qu'il
était seul à couvrir.

### 5. Le `.definition.json` validé reste l'unique porte d'entrée du compilateur

Aucune IA n'écrit jamais directement dans `apps/` ou `libs/`. Après revue
humaine, le `.definition.json` est validé par `validate-ir.mjs` exactement
comme un fichier écrit à la main — sans chemin de contournement.

### 6. Deux identifiants distincts, jamais fusionnés

Chaque page (feature) reçoit :

- un **`page_id`** — attribué une seule fois à la création, opaque, jamais
  réutilisé même si la page est supprimée. Ne change jamais, quel que soit
  le nombre de régénérations.
- un **`revision_id`** — recalculé à chaque publication réussie (réutilise
  le `change_set_id` déjà produit par le Change Set transactionnel
  existant). Permet un rollback vers une révision antérieure, dans
  l'esprit du manifest de composition d'ADR-0031.

Un registre associe `page_id → revision_id courant → historique des
revision_id`. Ce registre est lui-même un artefact versionné dans ce
dépôt, cohérent avec le principe « tout est versionné » déjà appliqué au
catalog (ADR-0005).

### 7. Une modification ciblée est une opération, jamais une réécriture

Quand l'utilisateur cite un `page_id` pour demander un changement, l'IA ne
régénère pas le `.definition.json` en entier. Elle produit une opération
d'édition minimale et typée, appliquée par du code déterministe — pas par
l'IA elle-même — sur le `.definition.json` existant récupéré via le
registre. Cette opération repasse par les étapes 2 à 4 (désambiguïsation,
checklist déterministe, revue humaine) avant application, exactement
comme la génération initiale.

## Justification

Le fil conducteur reprend celui d'ADR-0030 : séparer ce qui est stable de
ce qui change. Ce qui est stable est le contrat déjà prouvé —
`.definition.json` validé → compilateur → Change Set transactionnel → code
possédé exclusivement, dans un arbre de confiance unique. Ce qui change
est seulement la façon dont ce `.definition.json` est produit.

Le resserrement de portée n'affaiblit pas l'ambition initiale — il la rend
exécutable maintenant, avec les moyens réels de ce dépôt, plutôt que de la
faire dépendre d'une capacité d'exploitation (auth, hébergement,
modération) qui n'existe pas et dont la construction ne relève pas du
même métier. Isoler ce périmètre a permis de désamorcer chacune des
critiques soulevées en revue :

- **Séquencement face à OpenAPI** (gap déjà ouvert, mieux borné, avec
  mémo et adaptateur scaffoldé) — le périmètre resserré rend ce chantier
  strictement moins risqué qu'auparavant, mais ça ne justifie pas de le
  démarrer en même temps qu'OpenAPI. OpenAPI était déjà en cours, a déjà
  un mémo et un adaptateur scaffoldé : le terminer d'abord évite l'écueil
  classique de deux chantiers menés de front qui, en pratique,
  n'avancent plus vraiment ni l'un ni l'autre. Ce document reste donc
  proposé, pas engagé, tant qu'OpenAPI n'est pas conclu.
- **Nature de produit non actée** — n'a plus besoin d'être actée par ce
  document, puisqu'aucune décision de produit public n'y est prise ; elle
  est explicitement déléguée à ADR-0038.
- **Incompatibilité socle/multi-locataire** — disparaît : ADR-0033/0035
  sont utilisés exactement dans le modèle pour lequel ils ont été conçus
  et testés (un arbre de confiance, un ensemble d'utilisateurs déjà
  autorisés), pas étirés au-delà.
- **Angle mort de la désambiguïsation** — reste réel et documenté sans
  atténuation rhétorique, mais cesse d'être disqualifiant parce que la
  checklist déterministe (étape 3) et la revue humaine (étape 4) sont
  deux filets indépendants de cette méthode, chacun couvrant une part de
  son angle mort.

## Conséquences

### Positives

- Le texte libre entre dans le même régime de preuve que les autres
  sources (ADR-0029).
- Aucune duplication de la rigueur transactionnelle déjà construite : le
  nouveau pipeline se branche en amont du `.definition.json`, dans le
  domaine de validité réel de ce socle.
- La désambiguïsation automatique devient mesurable et testable (taux de
  convergence entre N interprétations), en complément déclaré de la revue
  humaine, jamais présentée comme son substitut.
- L'identifiant de page reste valide même si l'implémentation du
  compilateur change plus tard.
- Aucune décision d'infrastructure de service (auth, hébergement,
  modération) n'est nécessaire pour livrer ce document : il reste dans le
  développement mode outillage interne déjà pratiqué par ce dépôt.

### Négatives / dette acceptée

- Coût d'inférence multiplié par N à chaque génération (étape 2). Accepté
  en échange d'un filtrage pré-revue humaine plus fiable ; réductible plus
  tard.
- Le nouveau `kind: natural_language_prompt` et le registre d'identifiants
  n'existent pas encore ; ce document ne livre pas de code, seulement le
  contrat.
- Le format exact de l'opération d'édition typée (étape 7) reste à
  concevoir en détail.
- La checklist métier fixe (étape 3) n'existe pas encore ; ce document ne
  fournit que son principe (règles écrites d'avance, aucun appel LLM), pas
  la liste exacte des règles à vérifier — à dériver de
  `creer-une-action-request.md` §2 lors de l'implémentation.
- La question du support multi-page avec dépendances croisées entre
  `page_id` n'est pas traitée ici et devra faire l'objet d'un ADR dédié si
  le besoin se confirme.
- **Ce document ne couvre explicitement pas l'exposition publique, la
  modération, l'authentification utilisateur final ni l'hébergement
  multi-locataire.** Ce n'est pas une omission mais une exclusion de
  portée assumée — voir [ADR-0038](./0038-nature-produit-public-multi-locataire.md).
  Aucune implémentation issue de ce document ne doit être exposée à un
  public non authentifié sans qu'ADR-0038 ait été tranché favorablement et
  que ses conditions aient été construites.

### Points à réévaluer

- Réduire N si les données réelles montrent un taux de convergence très
  élevé dès N=2, ou l'augmenter si des ambiguïtés fréquentes passent
  inaperçues avec N=3.
- Remettre en cause l'ajout dans `evidence.schema.json` si les `facts`
  extraits d'un texte libre s'avèrent trop différents structurellement de
  ceux extraits d'un fichier source ou d'un contrat API.
- Réévaluer le mécanisme d'édition par opération typée si l'usage réel
  montre que la majorité des demandes de modification ne peuvent pas être
  exprimées comme des opérations localisées.
- Si ADR-0038 est un jour tranché favorablement, ce document devra être
  révisé (pas juste étendu) pour retirer la dépendance à la revue humaine
  systématique de l'étape 4, ce qui laisserait la checklist déterministe
  (étape 3) seule face à l'angle mort documenté en section Recherche — la
  checklist ne le couvre que partiellement, puisqu'elle ne détecte que ce
  qu'un humain a explicitement anticipé et écrit d'avance, pas une erreur
  de gestion nouvelle et imprévue. Ce n'est pas une extension mineure.

## Références

- [ADR-0009](./0009-reconstruction-pilotee-par-patterns.md) — reconstruction
  pilotée par patterns, principe hérité pour l'evidence model.
- [ADR-0010](./0010-flux-de-generation-assistee-par-ia.md) — l'IA ne
  remplit qu'un trou de forme fixe.
- [ADR-0026](./0026-reorientation-objectif-generation-generique.md) —
  précédent de reformulation d'une décision qui change la finalité
  déclarée du projet, principe qui a motivé l'extraction d'ADR-0038.
- [ADR-0029](./0029-perimetre-capacites-plateforme-generation.md) —
  périmètre de capacités et matrice de preuve ; ce document ajoute une
  source candidate à cette matrice, sans l'y déclarer supportée avant
  preuve.
- [ADR-0030](./0030-ir-canonique-et-profils-cibles.md) — IR canonique
  multi-axes ; ce document étend l'axe evidence avec un nouveau `kind`.
- [ADR-0031](./0031-graphe-execution-et-manifests-composition.md) —
  manifest de composition ; principe repris pour le `revision_id`.
- [ADR-0033](./0033-propriete-artefacts-regeneration-non-destructive.md)
  — propriété exclusive des artefacts, utilisée ici dans son domaine de
  validité d'origine.
- [ADR-0035](./0035-contrat-durabilite-publication-generation.md) —
  contrat de durabilité de publication, dont le document confirme
  explicitement qu'aucun lecteur externe concurrent n'est supporté — la
  raison pour laquelle ADR-0038 est extrait plutôt que fusionné ici.
- [ADR-0038](./0038-nature-produit-public-multi-locataire.md) — question
  de nature de produit, non tranchée, extraite de la première version de
  ce document.
- Martin Fowler / Birgitta Bockeler — « Understanding Spec-Driven
  Development: Kiro, spec-kit, and Tessl » (2026).
- ClarifyGPT — « Empowering LLM-based Code Generation with Intention
  Clarification » (arXiv:2310.10996).
- « Assessing the Impact of Requirement Ambiguity on LLM-based
  Function-Level Code Generation » (arXiv:2604.21505).
- « Too Consistent to Detect: A Study of Self-Consistent Errors in LLMs »
  (arXiv:2505.17656) — angle mort de la désambiguïsation par désaccord.
- « Self-Consistency Falls Short! The Adverse Effects of Positional Bias
  on Long-Context Problems » (TACL/MIT Press) — faux désaccord possible
  sur entrée longue.
- RFC 6902 (JSON Patch) — format de référence pour les opérations
  d'édition localisées, reprises pour l'étape 7.
- Proofpoint — « Cybercriminals Abuse AI Website Creation App For
  Phishing » — précédent d'abus ayant motivé l'extraction d'ADR-0038.
