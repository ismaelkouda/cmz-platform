# ADR-0080 — Prouver la valeur avant toute nouvelle automatisation

- **Statut :** Accepted
- **Date :** 2026-10-03

## Contexte

Le dépôt sait construire des mécanismes très sûrs : contrats fermés, candidats
isolés, publication transactionnelle, replay, oracles et CI multi-environnement.
Cette capacité crée un risque symétrique : résoudre rigoureusement le « comment »
d'une nouvelle automatisation avant d'avoir démontré qu'elle résout un problème
réel mieux que les moyens déjà disponibles.

Le cas JEV l'a rendu explicite. L'intégration replay/shadow décrite par
ADR-0079 est techniquement prudente, mais cette prudence ne démontre ni son
utilité marginale, ni l'urgence d'un POC. Les schémas déterministes détectent
déjà les informations structurelles manquantes ; un LLM généraliste et la revue
humaine traitent déjà les ambiguïtés. Ajouter un fournisseur, un corpus, des
seuils et une surveillance sans écart mesuré contredirait KISS et YAGNI.

Le problème dépasse JEV. Une bibliothèque, un agent, un gate CI, un wrapper, une
abstraction, une automatisation ou un nouveau service peuvent tous être sûrs et
correctement conçus tout en restant inutiles, prématurés ou plus coûteux que le
problème traité.

## Options envisagées

### Option A — Construire d'abord un POC, décider ensuite

- avantage : apprentissage concret rapide lorsque le spike est réellement peu
  coûteux ;
- inconvénients : le POC crée son propre coût d'intégration et un biais de coût
  irrécupérable ; la démonstration technique remplace facilement la preuve de
  valeur ; le code expérimental tend à devenir infrastructure durable.

### Option B — Accepter toute solution sûre et approuvée

- avantage : cadence apparente élevée et faible friction de décision ;
- inconvénients : l'approbation et la sécurité sont confondues avec la valeur ;
  la maintenance, la CI et la charge cognitive croissent sans propriétaire de
  bénéfice mesuré.

### Option C — Gate de valeur avant le design et l'implémentation

- avantage : privilégie l'existant et les solutions déterministes, rend le coût
  total visible, fournit des critères de non-adoption et permet de supprimer une
  expérimentation non concluante ;
- coût : exige de ralentir ou refuser des idées techniquement intéressantes tant
  que le besoin n'est pas observable.

## Décision

**Option C.** Toute nouvelle automatisation ou dépendance structurante doit
franchir un gate de valeur avant son design détaillé, son POC ou son ajout à la
CI. Une proposition approuvée, faisable et sûre ne franchit pas ce gate par ces
seules qualités.

### Dossier minimal d'admission

Le proposant doit rendre explicites, avec les preuves disponibles :

1. **problème observé** — défaut, tâche humaine, latence, coût ou risque réel ;
2. **baseline** — fréquence, gravité et coût du chemin courant ;
3. **utilisateurs affectés** — qui bénéficie du changement et dans quel flux ;
4. **alternatives existantes** — règle déterministe, outil natif/officiel,
   simplification, documentation, revue humaine ou suppression du besoin ;
5. **gain marginal attendu** — résultat que les mécanismes existants ne
   fournissent pas ;
6. **coût total** — code, tests, CI, sécurité, données, dépendances, versions,
   exploitation, documentation et charge cognitive ;
7. **hypothèse falsifiable** — métrique, baseline comparative, seuil décidé
   avant mesure et résultat qui ferait abandonner l'idée ;
8. **sortie et réversibilité** — propriétaire, durée maximale du spike,
   artefacts temporaires et procédure de retrait.

Une information inconnue reste `unknown`; elle n'est pas remplacée par une
affirmation favorable. En l'absence de problème ou de baseline observable, la
décision par défaut est **différer**, pas construire un POC pour créer la preuve
manquante.

### Ordre de préférence

Pour une capacité équivalente, l'ordre par défaut est :

1. retirer ou simplifier le besoin ;
2. réutiliser une capacité existante ;
3. utiliser une règle déterministe ;
4. utiliser la primitive native ou officielle de la version réellement
   épinglée ;
5. ajouter une adaptation locale et bornée ;
6. seulement alors évaluer une nouvelle dépendance, un modèle ou un service.

Un spike reste possible lorsque son coût borné est inférieur au coût de
l'incertitude. Il doit vivre hors chemin critique, ne créer aucune dépendance
runtime ou CI obligatoire, posséder une date de décision et pouvoir être retiré
entièrement.

### Conséquence pour les contrôles probabilistes

Un score produit par un modèle n'est jamais une preuve objective par nature.
Avant de devenir bloquant, un contrôle probabiliste doit démontrer sur un corpus
aveugle et représentatif :

- un signal additionnel par rapport aux gates déterministes et à la revue
  existante ;
- une calibration et une stabilité compatibles avec la conséquence du score ;
- des faux positifs et faux négatifs sous des seuils préenregistrés ;
- une disponibilité et un coût acceptables ;
- un diagnostic exploitable et une voie de recours humaine.

Jusque-là, il reste en replay/shadow ou dans un laboratoire d'évaluation. Une
indisponibilité externe ne bloque jamais une PR. La qualité exigée du code reste
identique quel que soit son auteur humain ou LLM ; la provenance peut servir à
mesurer un générateur, pas à affaiblir ou renforcer arbitrairement les règles de
fusion.

### Documentation officielle et versions

« Dernières bonnes pratiques » signifie ici **recommandations officielles
applicables à la version épinglée**, pas lecture live de la dernière page web à
chaque PR. Les règles consommées par la génération ou la CI sont versionnées,
liées au catalog et relues par un humain lors de leur mise à jour. Une veille
amont peut proposer une PR ; elle ne modifie pas silencieusement l'autorité du
dépôt.

## Justification

Le gate déplace la rigueur au bon endroit : avant l'accumulation de code et non
seulement dans sa réalisation. Il rend explicite une responsabilité Staff
essentielle : challenger « pourquoi maintenant ? » avant d'optimiser « comment
le construire ? ».

La règle ne condamne ni l'innovation ni les POC. Elle exige qu'une expérience
réduise une incertitude de décision identifiée et qu'elle ne transforme pas une
intuition en coût permanent. Elle généralise la séparation déjà adoptée entre
qualification rare et application courante des bibliothèques.

## Conséquences

### Positives

- complexité, dépendances et temps CI ajoutés seulement contre un gain nommé ;
- alternatives simples et primitives officielles examinées en premier ;
- décisions de non-adoption documentées et réversibles ;
- expérimentations bornées par une hypothèse et une condition d'arrêt ;
- prévention du biais de coût irrécupérable après un POC réussi techniquement.

### Négatives / dette acceptée

- travail préalable de mesure et possibilité de différer une bonne idée ;
- certaines baselines seront d'abord qualitatives faute de télémétrie ;
- le gate peut devenir bureaucratique s'il est appliqué à une modification
  locale évidente : il vise les capacités durables, dépendances, services et
  contrôles récurrents, pas chaque ligne de code.

### Points à réévaluer

- gate trop lourd par rapport au coût des changements qu'il gouverne ;
- absence répétée de données empêchant toute expérimentation utile ;
- automatisation devenue native ou officiellement supportée ;
- bénéfice mesuré qui justifie de promouvoir un spike auparavant différé.

## Références

- [Audit de maintenabilité de l'automatisation](../architecture/audit-maintenable-automatisation-2026-09-16.md)
- [ADR-0046 — corpus SEOS hors du chemin critique CI](./0046-corpus-seos-hors-chemin-critique-ci.md)
- [ADR-0077 — UI Angular officielle avant custom](./0077-ui-angular-officielle-avant-custom.md)
- [ADR-0079 — JEV en replay/shadow](./0079-jev-evaluateur-probabiliste-replay-shadow.md)
- [Évaluation d'une interface générée et JEV en CI](../architecture/evaluation-qualite-interface-generee-jev-ci-2026-10-03.md)
